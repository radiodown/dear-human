// BVH(Y-up, cm) → rig_002 측면 2D 리그(Y-down, 논리 px) 리타겟.
// 하체(골반 높이·몸통 기울기·다리·발)는 모캡이 구동하고, 상체(무기 장착·양팔 IK·스프링)는
// 기존 CharacterRig 결과를 몸통 변환에 강체로 따라오게 한다. rig_002 해시 파일은 수정하지 않는다.
import { CharacterRig, ik2, transform, clamp } from './rig-core.js';
import { GAIT, BOOT, footPose } from './gait.js';
import { HUMAN, handOffset } from './proportions.js';

const LEG = GAIT.thigh + GAIT.shin;
export const SPINE_SAMPLES = Object.freeze([0, 0.25, 0.5, 0.75, 1]);
// 마디 길이(px). rig = 채택 원화 비례(rig_002), mocap = 뼈대 비례(다리 전체 길이를 rig와 같게 맞춘 배율).
// torso/head/foot은 그림 배율(1 = 원화 크기). 뼈대 비율 모드에서 몸통 세로·머리·부츠 길이를 뼈대에 맞춘다.
export const RIG_LENS = Object.freeze({ thigh: GAIT.thigh, shin: GAIT.shin, upperArm: HUMAN.upperArm, forearm: HUMAN.forearm, torso: 1, head: 1, foot: 1 });
const ANKLE_HEIGHT = BOOT.heel.y; // 평평한 발에서 발목 피벗의 바닥 위 높이(px)
const ROOTS = [{ x: -3, y: 1 }, { x: 3, y: 0 }]; // rig-core legs[0]=먼 쪽, legs[1]=가까운 쪽
// 측면 시점은 인물의 오른쪽에서 본다 → 가까운 다리 = Right, 먼 다리 = Left.
const SIDES = ['Left', 'Right'];
const REQUIRED = ['Hips', 'Neck', ...SIDES.flatMap((s) => [`${s}Hip`, `${s}Knee`, `${s}Ankle`, `${s}Toe`])];

const len = (v) => Math.hypot(v[0], v[1], v[2]);

/**
 * 정면 방향 누적 진행량(cm)을 구한다. 루트가 실제로 이동하면 골반 이동을, 제자리(in-place) 클립이면
 * 바닥에 닿은 발이 골반 기준으로 뒤로 밀리는 속도를 진행량으로 역산한다. 반환: { progress, inPlace }
 */
export function estimateProgress(clip, P, yaw) {
  const I = clip.index, stride = clip.joints.length * 3, n = clip.frameCount;
  const progress = new Float32Array(n);
  for (let f = 1; f < n; f++) {
    const dx = P[f * stride] - P[(f - 1) * stride], dz = P[f * stride + 2] - P[(f - 1) * stride + 2];
    progress[f] = progress[f - 1] + dx * Math.sin(yaw[f]) + dz * Math.cos(yaw[f]);
  }
  const duration = Math.max(clip.frameTime, (n - 1) * clip.frameTime);
  const fwd = (f, j) => (P[f * stride + j * 3] - P[f * stride]) * Math.sin(yaw[f]) + (P[f * stride + j * 3 + 2] - P[f * stride + 2]) * Math.cos(yaw[f]);
  const feet = SIDES.map((s) => ({ ankle: I[`${s}Ankle`], ball: I[`${s}Toe`] }));
  let footRange = 0;
  for (const { ball } of feet) { let lo = Infinity, hi = -Infinity; for (let f = 0; f < n; f++) { const v = fwd(f, ball); lo = Math.min(lo, v); hi = Math.max(hi, v); } footRange = Math.max(footRange, hi - lo); }
  const rootSpeed = Math.abs(progress[n - 1] - progress[0]) / duration;
  if (n < 3 || rootSpeed > 5 || footRange < 20) return { progress, inPlace: false };
  const heights = [];
  for (const { ankle, ball } of feet) for (let f = 0; f < n; f++) heights.push(Math.min(P[f * stride + ankle * 3 + 1], P[f * stride + ball * 3 + 1]));
  const ground = percentile(heights, 0.05);
  let v = 0;
  progress.fill(0);
  for (let f = 1; f < n; f++) {
    let best = null, low = Infinity;
    for (const { ankle, ball } of feet) {
      const h = Math.min(P[f * stride + ankle * 3 + 1], P[f * stride + ball * 3 + 1]) - ground;
      if (h < low) { low = h; best = ball; }
    }
    if (low < 3) v = -(fwd(f, best) - fwd(f - 1, best)); // 디딤발이 뒤로 간 만큼 몸이 앞으로 간다.
    progress[f] = progress[f - 1] + v;
  }
  return { progress, inPlace: true };
}
function percentile(values, q) { const s = Float64Array.from(values).sort(); return s[Math.min(s.length - 1, Math.floor(s.length * q))]; }

/**
 * 프레임별 리타겟 트랙을 미리 계산한다.
 * clip: parseBVH 결과, P: bakePositions 결과, yaw: 부드럽게 한 정면 yaw, progress: 정면 방향 누적 이동(cm)
 */
export function buildRetargetTrack(clip, P, yaw, progress, { viewAngle = 0, viewPitch = 0 } = {}) {
  const I = clip.index, J = clip.joints.length, stride = J * 3, n = clip.frameCount;
  for (const name of REQUIRED) if (!(name in I)) throw new Error(`리타겟에 필요한 관절이 없습니다: ${name}`);
  const off = (name) => clip.joints[I[name]].offset;
  const bvhLeg = len(off('LeftKnee')) + len(off('LeftAnkle'));
  const scale = LEG / bvhLeg; // 다리 길이 기준 px/cm
  const toe = off('LeftToe'), footRestLen = Math.hypot(toe[0], toe[2]), footRestPitch = Math.atan2(toe[1], Math.hypot(toe[0], toe[2]));
  let spine = [0, 0, 0];
  for (let j = I.Neck; j > I.Hips; j = clip.joints[j].parent) { const o = clip.joints[j].offset; spine = [spine[0] + o[0], spine[1] + o[1], spine[2] + o[2]]; }
  const spineRest = Math.atan2(spine[2], spine[1]);
  // 엉덩이와 목 사이의 척추 마디(Chest…, spine_01…)
  const spineJoints = []; for (let j = clip.joints[I.Neck].parent; j > I.Hips && j >= 0; j = clip.joints[j].parent) spineJoints.push(j);
  // 머리 끝 관절이 있으면 목→머리 끝, 없으면 목→머리. 정지 자세의 (머리 방향 − 몸통 방향)을 기준으로 뺀다.
  const headTop = I.Head_End !== undefined && !clip.joints[I.Head_End].synthetic ? I.Head_End : I.Head;
  let headVec = [0, 0, 0];
  if (headTop !== undefined) for (let j = headTop; j > I.Neck && j >= 0; j = clip.joints[j].parent) { const o = clip.joints[j].offset; headVec = [headVec[0] + o[0], headVec[1] + o[1], headVec[2] + o[2]]; }
  const headRest = headTop === undefined ? 0 : Math.atan2(headVec[2], headVec[1]) - spineRest;

  const at = (f, j, k) => P[f * stride + j * 3 + k];
  const ankleHeights = [], ballHeights = [];
  for (let f = 0; f < n; f++) for (const s of SIDES) { ankleHeights.push(at(f, I[`${s}Ankle`], 1)); ballHeights.push(at(f, I[`${s}Toe`], 1)); }
  const ankleGround = percentile(ankleHeights, 0.05), ballGround = percentile(ballHeights, 0.05);

  const track = {
    frames: n, frameTime: clip.frameTime, scale, bvhLeg, ankleGround, ballGround, viewAngle, viewCos: Math.cos(viewAngle * Math.PI / 180), viewSin: Math.sin(viewAngle * Math.PI / 180), viewPitch,
    hip: new Float32Array(n), lean: new Float32Array(n),
    // 뼈대 일치 모드의 몸통 각도(rad): 화면에 투영한 엉덩이→목 방향 그대로(기준 자세 빼기·제한 없음, 회전은 이어 붙임)
    torsoAbs: new Float32Array(n), speed: new Float32Array(n), distance: new Float32Array(n),
    // 다리별 [발목 전방 cm, 볼 전방 cm, 발 길이 투영 cm, 발 각도 rad, 최저점 높이 cm]
    legs: SIDES.map(() => ({ ankle: new Float32Array(n), ball: new Float32Array(n), foot: new Float32Array(n), angle: new Float32Array(n), clearance: new Float32Array(n),
      // 측면 투영한 허벅지·정강이 방향(rad, 아래 0 · 앞 +). 리그 비례가 달라도 다리 모양을 그대로 옮기는 FK 입력이다.
      thigh: new Float32Array(n), shin: new Float32Array(n),
      // 엉덩이 관절의 좌우 성분(cm, 골반 기준, 인물 왼쪽 +). 시점을 돌리면 sinθ만큼 화면에서 벌어진다.
      hipLat: new Float32Array(n),
      // 뼈대 일치 모드: 엉덩이 관절의 화면 가로 위치(cm, 골반 기준)
      hipX: new Float32Array(n),
      // 실시간 길이: 이 프레임·시점에서 화면에 보이는(투영된) 허벅지·정강이·발(발목→발끝 끝점) 길이(px)
      thighLen: new Float32Array(n), shinLen: new Float32Array(n), footLen: new Float32Array(n),
      // 뼈대 일치 모드의 발끝 맞춤: 화면에 투영된 발목→발끝 끝점 벡터(px, 화면 y 아래 +)
      toeX: new Float32Array(n), toeY: new Float32Array(n) })),
    torsoLen: new Float32Array(n), headLen: new Float32Array(n),
    // 고개 기울기(rad): 화면에 투영한 목→머리(끝) 방향이 몸통(엉덩이→목) 방향보다 얼마나 앞(+)/뒤(−)로 기울었는지. 정지 자세 기준을 뺀다.
    headTilt: new Float32Array(n),
    // 척추 휘어짐: 목(q=0)→엉덩이(q=1) 직선에서 척추 마디가 앞(+)/뒤(−)로 벗어난 거리(px, 뼈대 배율), q = 0, .25, .5, .75, 1 샘플
    spineBend: new Float32Array(n * SPINE_SAMPLES.length),
    // 뼈대 일치 모드의 팔 각도(rad, 아래 0 · 화면 오른쪽 +). [0]=Right(앞쪽, armA), [1]=Left(뒤쪽, armB). 관절이 없으면 null.
    arms: ['Right', 'Left'].every((s) => [`${s}Shoulder`, `${s}Elbow`, `${s}Wrist`].every((j) => j in I)) ? [0, 1].map(() => ({ upper: new Float32Array(n), fore: new Float32Array(n), upperLen: new Float32Array(n), foreLen: new Float32Array(n),
      // 어깨 위치: 목 기준 화면 오프셋(px, 뼈대 배율, y 아래 +)
      shX: new Float32Array(n), shY: new Float32Array(n) })) : null
  };
  // 시점 각도: 0°=인물 오른쪽에서 본 측면, 90°=정면. 화면 가로축 R = F·cosθ + L·sinθ.
  const vc = Math.cos(viewAngle * Math.PI / 180), vs = Math.sin(viewAngle * Math.PI / 180);
  // 상하 각도 φ: +는 위에서 내려다봄. 화면 세로 = 높이·cosφ − (카메라 쪽 깊이)·sinφ. 카메라 쪽 C = F·sinθ − L·cosθ.
  const pc = Math.cos(viewPitch * Math.PI / 180), ps = Math.sin(viewPitch * Math.PI / 180);
  const camera = (f) => [Math.sin(yaw[f]) * vs - Math.cos(yaw[f]) * vc, Math.cos(yaw[f]) * vs + Math.sin(yaw[f]) * vc];
  const screenUp = (f, j) => { const C = camera(f); return at(f, j, 1) * pc - (at(f, j, 0) * C[0] + at(f, j, 2) * C[1]) * ps; };
  for (let f = 0; f < n; f++) {
    const F = [Math.sin(yaw[f]) * vc + Math.cos(yaw[f]) * vs, Math.cos(yaw[f]) * vc - Math.sin(yaw[f]) * vs];
    const hx = at(f, I.Hips, 0), hz = at(f, I.Hips, 2);
    const fwd = (j) => (at(f, j, 0) - hx) * F[0] + (at(f, j, 2) - hz) * F[1];
    track.hip[f] = at(f, I.Hips, 1) - ankleGround;
    const sx = at(f, I.Neck, 0) - hx, sy = screenUp(f, I.Neck) - screenUp(f, I.Hips), sz = at(f, I.Neck, 2) - hz;
    track.lean[f] = Math.atan2(sx * F[0] + sz * F[1], sy) - spineRest;
    {
      const raw = Math.atan2(sx * F[0] + sz * F[1], sy);
      track.torsoAbs[f] = f === 0 ? raw : track.torsoAbs[f - 1] + Math.atan2(Math.sin(raw - track.torsoAbs[f - 1]), Math.cos(raw - track.torsoAbs[f - 1]));
    }
    track.torsoLen[f] = Math.hypot(sx * F[0] + sz * F[1], sy) * scale;
    {
      // 화면 좌표(가로 h, 세로 y 아래 +)에서 목 N → 엉덩이 H 직선. 몸통 앞쪽 수직 방향 = (dir.y, −dir.x).
      const pt = (j) => ({ x: ((at(f, j, 0) - hx) * F[0] + (at(f, j, 2) - hz) * F[1]) * scale, y: -screenUp(f, j) * scale });
      const N = pt(I.Neck), Hp = pt(I.Hips), L = Math.hypot(Hp.x - N.x, Hp.y - N.y) || 1, dir = { x: (Hp.x - N.x) / L, y: (Hp.y - N.y) / L };
      const knots = [{ q: 0, d: 0 }, ...spineJoints.map((j) => { const p = pt(j), v = { x: p.x - N.x, y: p.y - N.y }; return { q: (v.x * dir.x + v.y * dir.y) / L, d: v.x * dir.y - v.y * dir.x }; }), { q: 1, d: 0 }].sort((a, b) => a.q - b.q);
      SPINE_SAMPLES.forEach((q, i) => {
        let d = 0;
        for (let k = 1; k < knots.length; k++) if (q <= knots[k].q || k === knots.length - 1) { const a = knots[k - 1], b = knots[k], u = b.q > a.q ? clamp((q - a.q) / (b.q - a.q), 0, 1) : 0; d = a.d + (b.d - a.d) * u; break; }
        track.spineBend[f * SPINE_SAMPLES.length + i] = d;
      });
    }
    {
      const top = headTop, hx2 = (j) => (at(f, j, 0) - hx) * F[0] + (at(f, j, 2) - hz) * F[1];
      const torsoDir = Math.atan2(sx * F[0] + sz * F[1], sy), headDir = Math.atan2(hx2(top) - hx2(I.Neck), screenUp(f, top) - screenUp(f, I.Neck));
      track.headTilt[f] = Math.atan2(Math.sin(headDir - torsoDir), Math.cos(headDir - torsoDir)) - headRest;
    }
    if (I.Head_End !== undefined && !clip.joints[I.Head_End].synthetic) {
      const up = (j) => screenUp(f, j), h = (j) => (at(f, j, 0) - hx) * F[0] + (at(f, j, 2) - hz) * F[1];
      track.headLen[f] = (Math.hypot(h(I.Head) - h(I.Neck), up(I.Head) - up(I.Neck)) + Math.hypot(h(I.Head_End) - h(I.Head), up(I.Head_End) - up(I.Head))) * scale;
    }
    track.distance[f] = progress[f] * vc; // 앞으로 간 거리 중 화면 가로로 보이는 만큼
    const a = Math.max(0, f - 3), b = Math.min(n - 1, f + 3);
    track.speed[f] = b > a ? (progress[b] - progress[a]) / ((b - a) * clip.frameTime) : 0;
    SIDES.forEach((s, k) => {
      const ankle = I[`${s}Ankle`], ball = I[`${s}Toe`], leg = track.legs[k];
      const dx = at(f, ball, 0) - at(f, ankle, 0), dy = at(f, ball, 1) - at(f, ankle, 1), dz = at(f, ball, 2) - at(f, ankle, 2);
      const horizontal = Math.hypot(dx, dz);
      // 수평면에서 발이 정면과 이루는 각(토아웃)만큼 측면 발 길이가 짧아진다.
      const yawCos = horizontal > 1e-6 ? (dx * F[0] + dz * F[1]) / horizontal : 1;
      leg.ankle[f] = fwd(ankle); leg.ball[f] = fwd(ball);
      // 화면에 보이는 발 길이(부호 포함). 시점을 돌리면 짧아지거나 뒤집힌다. 평평할 때 볼−발목 투영과 같아 피벗 전환이 이어진다.
      leg.foot[f] = footRestLen * clamp(yawCos, -1, 1);
      leg.angle[f] = footRestPitch - Math.atan2(dy, horizontal); // + = 발끝 내림(뒤꿈치 들림)
      leg.clearance[f] = Math.max(0, Math.min(at(f, ankle, 1) - ankleGround, at(f, ball, 1) - ballGround));
      const hip = I[`${s}Hip`], knee = I[`${s}Knee`];
      leg.hipLat[f] = (at(f, hip, 0) - hx) * Math.cos(yaw[f]) - (at(f, hip, 2) - hz) * Math.sin(yaw[f]);
      leg.hipX[f] = fwd(hip);
      const seg = (a, b) => Math.hypot(fwd(b) - fwd(a), screenUp(f, a) - screenUp(f, b)) * scale;
      leg.thighLen[f] = seg(hip, knee); leg.shinLen[f] = seg(knee, ankle); leg.footLen[f] = seg(ankle, I[`${s}Toe_End`]);
      const toeEnd = I[`${s}Toe_End`];
      leg.toeX[f] = (fwd(toeEnd) - fwd(ankle)) * scale; leg.toeY[f] = (screenUp(f, ankle) - screenUp(f, toeEnd)) * scale;
      leg.thigh[f] = Math.atan2(fwd(knee) - fwd(hip), screenUp(f, hip) - screenUp(f, knee));
      leg.shin[f] = Math.atan2(fwd(ankle) - fwd(knee), screenUp(f, knee) - screenUp(f, ankle));
    });
  }
  // 원본 키프레임의 작은 흔들림이 발·몸통(→총)에 그대로 보이지 않게 앞뒤 2프레임으로 다듬는다.
  if (track.arms) for (let f = 0; f < n; f++) {
    const F = [Math.sin(yaw[f]) * vc + Math.cos(yaw[f]) * vs, Math.cos(yaw[f]) * vc - Math.sin(yaw[f]) * vs];
    const h = (j) => at(f, j, 0) * F[0] + at(f, j, 2) * F[1], dir = (a, b) => Math.atan2(h(b) - h(a), screenUp(f, a) - screenUp(f, b));
    ['Right', 'Left'].forEach((side, k) => {
      const sh = I[`${side}Shoulder`], el = I[`${side}Elbow`], wr = I[`${side}Wrist`];
      track.arms[k].upper[f] = dir(sh, el); track.arms[k].fore[f] = dir(el, wr);
      const seg = (a, b) => Math.hypot(h(b) - h(a), screenUp(f, a) - screenUp(f, b)) * scale;
      track.arms[k].upperLen[f] = seg(sh, el); track.arms[k].foreLen[f] = seg(el, wr);
      track.arms[k].shX[f] = (h(sh) - h(I.Neck)) * scale; track.arms[k].shY[f] = (screenUp(f, I.Neck) - screenUp(f, sh)) * scale;
    });
  }
  track.lean = smoothSeries(track.lean, [1, 2, 3, 2, 1]);
  track.torsoAbs = smoothSeries(track.torsoAbs, [1, 2, 3, 2, 1]);
  // 고개 기준: 정지 자세(BVH는 머리가 정확히 위)가 아니라 이 클립에서 서 있을 때 가장 흔한 고개 각도(중앙값)를 0으로 둔다.
  // 사람은 앞을 볼 때 목이 앞으로 약 20° 나와 있어 정지 자세 기준이면 대기 중에도 숙인 것처럼 보였다. 원화 머리는 앞을 보는 상태다.
  // 쓰러짐·웅크림처럼 서 있지 않은 프레임이 기준을 끌고 가지 않도록, 골반이 높고(최고의 90% 이상) 상체가 거의 수직(±8.6°)인 프레임만 쓴다.
  const hipTop = Math.max(...track.hip), standing = Array.from(track.headTilt).filter((_, f) => track.hip[f] >= hipTop * 0.9 && Math.abs(track.lean[f]) < 0.15);
  const headNeutral = percentile(standing.length >= 10 ? standing : track.headTilt, 0.5);
  track.headNeutral = headNeutral;
  track.headTilt = smoothSeries(track.headTilt.map((v) => clamp(v - headNeutral, -0.7, 0.7)), [1, 2, 3, 2, 1]);
  for (const leg of track.legs) leg.angle = smoothSeries(leg.angle, [1, 2, 3, 2, 1]);
  const both = (name) => (len(off(`Left${name}`)) + len(off(`Right${name}`))) / 2 * scale;
  const hasArms = ['Left', 'Right'].every((side) => `${side}Elbow` in I && `${side}Wrist` in I);
  // 몸통: 엉덩이→목 길이 / rig torsoAboveHip. 머리: 목→머리 끝 / rig 머리 높이(머리 끝 관절이 실제로 있을 때만).
  // 부츠: 발목→발끝(수평, 볼+발끝 끝점) / rig 부츠의 발목→발끝.
  const headEnd = I.Head_End !== undefined && !clip.joints[I.Head_End].synthetic;
  const toeEnd = off('LeftToe_End'), footLen = (Math.hypot(toe[0], toe[2]) + Math.hypot(toeEnd[0], toeEnd[2])) * scale;
  track.lens = { rig: RIG_LENS, mocap: Object.freeze({ thigh: both('Knee'), shin: both('Ankle'),
    upperArm: hasArms ? both('Elbow') : RIG_LENS.upperArm, forearm: hasArms ? both('Wrist') : RIG_LENS.forearm,
    torso: len(spine) * scale / HUMAN.torsoAboveHip,
    head: headEnd ? (len(off('Head')) + len(off('Head_End'))) * scale / HUMAN.heights.head : 1,
    foot: footLen / BOOT.toe.x }) };
  lockFeet(track);
  contactWeights(track);
  fitPelvis(track);
  return track;
}

/**
 * 마디 길이·그림 배율 조회. key: 'rig'(원화), 'mocap'(뼈대 비율, 클립 고정), 'live'(프레임별 투영 길이).
 * k는 다리 번호(0=Left,1=Right)이자 팔 번호(0=Right=armA,1=Left=armB)다.
 */
export function lensAt(track, key, f, k = 0) {
  if (key === 'rig' || !track.lens) return RIG_LENS;
  const M = track.lens.mocap;
  if (key !== 'live') return M;
  const leg = track.legs[k], arm = track.arms?.[k], head = track.headLen[f];
  return { thigh: Math.max(1, leg.thighLen[f]), shin: Math.max(1, leg.shinLen[f]),
    upperArm: arm ? Math.max(1, arm.upperLen[f]) : M.upperArm, forearm: arm ? Math.max(1, arm.foreLen[f]) : M.forearm,
    torso: Math.max(0.2, track.torsoLen[f] / HUMAN.torsoAboveHip), head: head > 0 ? Math.max(0.2, head / HUMAN.heights.head) : M.head,
    foot: Math.max(0.15, leg.footLen[f] / BOOT.toe.x) };
}

/** 가중 이동 평균(가장자리는 있는 값만 평균). */
export function smoothSeries(values, kernel) {
  const n = values.length, r = kernel.length >> 1, out = new Float32Array(n);
  for (let f = 0; f < n; f++) {
    let sum = 0, weight = 0;
    for (let k = -r; k <= r; k++) { const g = f + k; if (g < 0 || g >= n) continue; sum += values[g] * kernel[k + r]; weight += kernel[k + r]; }
    out[f] = sum / weight;
  }
  return out;
}

/**
 * 골반 높이를 프레임마다 미리 계산하고 앞뒤 3프레임으로 다듬는다. 평평하게 디딘 발이 있으면 모캡 각도로 펼친
 * 리그 다리가 그 발에 닿는 높이, 없으면 모캡 골반 높이. 매 프레임 따로 구하면 거의 펴진 디딤 다리의 IK가
 * 0.1px 차이에도 무릎을 크게 움직여 떨림이 생겼다.
 */
function fitPelvis(track) {
  track.pelvisFit = {};
  for (const key of ['rig', 'mocap', 'live']) track.pelvisFit[key] = fitPelvisWith(track, (f, k) => lensAt(track, key, f, k));
}
function fitPelvisWith(track, lensOf) {
  const n = track.frames, s = track.scale, raw = new Float32Array(n);
  for (let f = 0; f < n; f++) {
    const fromMocap = -(track.hip[f] * s + ANKLE_HEIGHT);
    let sum = 0, weight = 0;
    track.legs.forEach((leg, k) => {
      const w = leg.flat[f];
      if (w <= 1e-3) return;
      const lens = lensOf(f, k), footY = footAt(0, leg.clearance[f] * s, clampAngle(leg.angle[f]), lens.foot).y, chain = fk({ x: 0, y: 0 }, leg.thigh[f], leg.shin[f], lens);
      sum += w * (footY - ROOTS[k].y - chain.ankle.y); weight += w;
    });
    const rest = Math.max(0, 1 - weight);
    raw[f] = (sum + rest * fromMocap) / (weight + rest);
  }
  // 양발 지지 중 다리별 요구 높이가 달라 가중 평균이 갑자기 옮겨 가므로 앞뒤 6프레임(0.1초) 삼각 평균으로 다듬는다.
  return smoothSeries(raw, [1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1]);
}

/**
 * 부드러운 IK 목표: 다리가 거의 펴질 때(남은 길이 < SOFT_IK px) 목표 거리를 지수적으로 줄여, 0.1px 차이로
 * 무릎이 크게 튀는 것을 막는다. 대신 발이 최대 약 1px 덜 닿을 수 있다.
 */
export const SOFT_IK = 3;
function softTarget(root, target, total = LEG) {
  const dx = target.x - root.x, dy = target.y - root.y, d = Math.hypot(dx, dy), start = Math.max(0, total - SOFT_IK);
  if (d <= start || d < 1e-9) return target;
  const soft = start + SOFT_IK * (1 - Math.exp(-(d - start) / SOFT_IK));
  return { ...target, x: root.x + dx * soft / d, y: root.y + dy * soft / d };
}
const legIK = (root, target, lens = RIG_LENS) => ik2(root, softTarget(root, target, lens.thigh + lens.shin), lens.thigh, lens.shin, -1);

/**
 * 접지 가중치(0=모캡 각도 FK, 1=바닥 IK).
 * - 바닥에 닿은 프레임(clearance < full)에서 떨어진 프레임 수로 약 0.17초(10프레임) 동안 FK↔IK를 섞는다.
 * - 발끝 차기처럼 발 각도가 크면 FK를 따른다(리그 부츠가 짧아 IK로 붙이면 무릎이 덜 굽는다).
 * - flat: 발바닥이 평평한 정도. 골반 높이를 그 발에 맞출 때 쓴다.
 * 접지(발 고정) 프레임은 항상 1이다.
 */
// rollStart는 발 고정 각도(FOOT_LOCK.angle)와 같아야 발을 떼는 순간 가중치가 1에서 끊기지 않는다.
export const BLEND = Object.freeze({ full: 1.5, frames: 10, rollStart: 0.35, rollEnd: 0.85, flatEnd: 0.4 });
const smooth = (t) => t * t * (3 - 2 * t);
function contactWeights(track) {
  const n = track.frames;
  for (const leg of track.legs) {
    const near = new Float32Array(n).fill(Infinity);
    let last = -Infinity;
    for (let f = 0; f < n; f++) { if (leg.clearance[f] < BLEND.full) last = f; near[f] = f - last; }
    last = Infinity;
    for (let f = n - 1; f >= 0; f--) { if (leg.clearance[f] < BLEND.full) last = f; near[f] = Math.min(near[f], last - f); }
    leg.weight = new Float32Array(n); leg.flat = new Float32Array(n);
    for (let f = 0; f < n; f++) {
      const a = Math.abs(leg.angle[f]);
      const roll = 1 - smooth(clamp((a - BLEND.rollStart) / (BLEND.rollEnd - BLEND.rollStart), 0, 1));
      const ramp = 1 - smooth(clamp(near[f] / BLEND.frames, 0, 1));
      leg.weight[f] = leg.contact[f] ? 1 : ramp * roll;
    }
    const soft = smoothSeries(leg.weight, [1, 2, 3, 2, 1]);
    for (let f = 0; f < n; f++) {
      leg.weight[f] = leg.contact[f] ? 1 : soft[f];
      leg.flat[f] = leg.weight[f] * (1 - smooth(clamp(Math.abs(leg.angle[f]) / BLEND.flatEnd, 0, 1)));
    }
  }
}

/** 피벗 기준 발 위치(cm, 골반 기준 화면 가로). 뒤꿈치(발목)와 발끝(볼−발 길이) 기준을 발 각도 ±0.1rad 사이에서 섞는다. */
function pivotTrack(leg, f) {
  const toe = smooth(clamp((leg.angle[f] + 0.1) / 0.2, 0, 1));
  return leg.ankle[f] + (leg.ball[f] - leg.foot[f] - leg.ankle[f]) * toe;
}
const clampAngle = (a) => clamp(a, -0.6, 1.1);

/**
 * 발 고정: 접지 구간에서 피벗의 월드 위치를 고정하고, 떼는 순간 보정량을 짧게 풀어 준다.
 * 프레임별 보정량을 미리 저장하므로 임의 프레임으로 이동해도 결과가 같다.
 */
// speed: 디딤으로 볼 피벗의 최대 이동 속도(cm/s). 착지 직전 아직 쓸려 가는 발을 붙잡지 않는다.
export const FOOT_LOCK = Object.freeze({ clearance: 1.5, angle: 0.35, speed: 35, release: 0.85, maxOffset: 6 });
function lockFeet(track) {
  const n = track.frames;
  for (const leg of track.legs) {
    leg.lock = new Float32Array(n); leg.contact = new Uint8Array(n);
    const world = Float32Array.from({ length: n }, (_, f) => pivotTrack(leg, f) + track.distance[f]);
    let locked = null, pivot = 0, offset = 0;
    for (let f = 0; f < n; f++) {
      const raw = world[f], side = clampAngle(leg.angle[f]) > 0 ? 1 : -1;
      const speed = Math.abs(world[Math.min(n - 1, f + 1)] - world[Math.max(0, f - 1)]) / (2 * track.frameTime);
      const contact = leg.clearance[f] < FOOT_LOCK.clearance && Math.abs(leg.angle[f]) < FOOT_LOCK.angle && speed < FOOT_LOCK.speed;
      if (contact) {
        if (locked === null || side !== pivot) { locked = raw + offset; pivot = side; }
        offset = clamp(locked - raw, -FOOT_LOCK.maxOffset, FOOT_LOCK.maxOffset);
        locked = raw + offset;
      } else { locked = null; offset *= FOOT_LOCK.release; }
      leg.lock[f] = offset; leg.contact[f] = contact ? 1 : 0;
    }
  }
}

/** 한 프레임의 하체 자세(rig px)를 계산한다. 순수 함수라 테스트에서 직접 쓴다. */
export function lowerBodyPose(track, frame, { recoil = 0, footLock = true, match = false, proportions = false, live = false } = {}) {
  const f = clamp(frame | 0, 0, track.frames - 1), s = track.scale;
  const key = !track.lens ? 'rig' : live ? 'live' : proportions ? 'mocap' : 'rig', lensOf = (k) => lensAt(track, key, f, k);
  if (match) return matchLowerBody(track, f, recoil, lensOf);
  const feet = track.legs.map((leg, k) => {
    const lens = lensOf(k);
    // 뒤꿈치 피벗은 발목, 발끝 피벗은 볼을 기준으로 둔다. 발이 평평할 때 두 값이 같아 피벗 전환이 연속이다.
    const trackX = (pivotTrack(leg, f) + (footLock ? leg.lock[f] : 0)) * s;
    return { ...footAt(trackX, leg.clearance[f] * s, clampAngle(leg.angle[f]), lens.foot), locked: footLock && leg.contact[f] === 1 };
  });
  // 골반 높이: 평평하게 디딘 발이 있으면, 모캡 각도로 펼친 리그 다리의 발목이 그 발 위치에 오도록 맞춘다.
  // (리그 마디 비율이 사람과 달라도 디딤 다리의 무릎 각도가 모캡과 같아진다.) 디딘 발이 없으면 모캡 골반 높이.
  // 다리 뿌리는 원화 골반에 붙은 rig_002 위치(ROOTS)에 고정한다. 시점에 따른 좌우 벌어짐은 투영한 엉덩이 관절 위치에서
  // 모캡 각도로 펼친 발목(spread)으로 나타내고, 고정 뿌리에서 그 발목으로 다리를 뻗는다(골반에서 떨어지지 않음).
  const spreadX = track.legs.map((leg, k) => ROOTS[k].x + leg.hipLat[f] * (track.viewSin ?? 0) * s);
  let pelvisY = track.pelvisFit[key][f];
  // 바닥 IK를 쓰는 발이 닿도록 골반을 낮춘다(다리를 늘리지 않음). 필요한 만큼을 그 다리의 IK 가중치에 비례해
  // 적용해야, 발을 떼며 가중치가 0이 되는 순간 골반이 한 번에 튀어 오르지 않는다.
  const base = pelvisY;
  feet.forEach((foot, k) => {
    const lens = lensOf(k), w = track.legs[k].weight[f], dx = foot.x - ROOTS[k].x, reach = lens.thigh + lens.shin - 0.05;
    if (w <= 0 || Math.abs(dx) >= reach) return;
    const need = foot.y - Math.sqrt(reach * reach - dx * dx) - ROOTS[k].y - base;
    if (need > 0) pelvisY = Math.max(pelvisY, base + need * w);
  });
  const lean = clamp(track.lean[f], -0.3, 0.3) + recoil * 0.003;
  const pelvis = { x: 0, y: pelvisY, a: 0 };
  const legs = feet.map((target, k) => {
    const leg = track.legs[k], w = leg.weight[f], lens = lensOf(k);
    const root = { x: pelvis.x + ROOTS[k].x, y: pelvis.y + ROOTS[k].y };
    const angles = (sol) => [Math.atan2(sol.elbow.x - root.x, sol.elbow.y - root.y), Math.atan2(sol.hand.x - sol.elbow.x, sol.hand.y - sol.elbow.y)];
    // 모캡 각도(FK): 투영한 엉덩이 위치에서 펼친 발목을 고정 뿌리에서 다시 뻗는다. 측면(0°)에서는 엉덩이 투영이 0에 가까워 FK 그대로다.
    let fkThigh = leg.thigh[f], fkShin = leg.shin[f];
    if (Math.abs(spreadX[k] - ROOTS[k].x) > 1e-6) {
      const spread = fk({ x: pelvis.x + spreadX[k], y: root.y }, fkThigh, fkShin, lens);
      [fkThigh, fkShin] = angles(legIK(root, spread.ankle, lens));
    }
    // 바닥 IK 해의 각도와 섞는다. 각도를 섞으므로 마디 길이는 항상 리그 값이다.
    const [ikThigh, ikShin] = angles(legIK(root, target, lens));
    let chain = fk(root, mixAngle(fkThigh, ikThigh, w), mixAngle(fkShin, ikShin, w), lens);
    let foot = bootAt(chain.ankle, target.a, target, lens.foot);
    // 공중 FK가 부츠를 바닥 아래로 넣으면 같은 x에서 바닥 위로 올린 목표로 IK를 다시 푼다.
    const sink = Math.max(foot.heel.y, foot.toe.y);
    if (sink > 0) { const lifted = legIK(root, { x: chain.ankle.x, y: chain.ankle.y - sink }, lens); chain = { knee: lifted.elbow, ankle: lifted.hand }; foot = bootAt(chain.ankle, target.a, target, lens.foot); }
    const error = Math.hypot(chain.ankle.x - target.x, chain.ankle.y - target.y);
    return { root, elbow: chain.knee, hand: chain.ankle, target: w > 0.5 ? target : chain.ankle, error: w >= 0.999 ? error : 0, weight: w,
      foot: { ...foot, stance: leg.contact[f] === 1, locked: target.locked } };
  });
  const walkAmount = clamp(Math.abs(track.speed[f]) * s / GAIT.speed, 0, 1);
  // 골반(치마) 파츠는 몸통과 같은 각도로, 같은 회전 중심(엉덩이 관절 hip)에서 기운다. 렌더러는 파츠 상단 중앙
  // (pelvis.x-1, pelvis.y-pelvisAboveHip)을 기준으로 그리므로, 그 기준점이 hip 기준으로 회전한 위치가 되게 pelvis를 정한다.
  const c = Math.cos(lean), sn = Math.sin(lean), top = { x: pelvis.x - c + sn * HUMAN.pelvisAboveHip, y: pelvis.y - sn - c * HUMAN.pelvisAboveHip };
  const sprite = { x: top.x + 1, y: top.y + HUMAN.pelvisAboveHip, a: lean };
  return { pelvis: sprite, hip: pelvis, lean, legs, walkAmount, distance: track.distance[f] * s, bob: pelvisY - HUMAN.hipY };
}

/**
 * 뼈대 일치 모드: 실제 비례·접지보다 뼈대 각도 일치를 우선한다. 다리 뿌리는 투영한 엉덩이 위치, 허벅지·정강이는
 * 모캡 각도 그대로(FK). 바닥 IK·발 고정은 쓰지 않고, 가장 낮은 부츠 끝이 바닥(y=0)에 닿도록 몸 전체만 위아래로 옮긴다.
 */
function matchLowerBody(track, f, recoil, lensOf = () => RIG_LENS) {
  // 뼈대 일치: 몸통 각도는 뼈대 그대로(기본 모드의 ±0.3rad 제한·기준 자세 빼기를 쓰지 않는다).
  const s = track.scale, lean = track.torsoAbs[f] + recoil * 0.003;
  const chains = track.legs.map((leg, k) => {
    const root = { x: leg.hipX[f] * s, y: ROOTS[k].y }, lens = lensOf(k);
    const chain = fk(root, leg.thigh[f], leg.shin[f], lens);
    // 부츠: 화면에 투영된 뼈대 발끝 위치에 리그 부츠 발끝이 오도록 회전·가로 길이를 함께 푼다.
    const fit = fitBootToToe({ x: leg.toeX[f], y: leg.toeY[f] });
    return { root, chain, fit, foot: bootAt(chain.ankle, fit.a, { trackX: chain.ankle.x }, fit.kf) };
  });
  // 바닥 기준: 부츠만이 아니라 무릎·엉덩이·목·머리 끝 중 가장 낮은 점(구르기·눕기에서는 몸통·머리가 가장 낮다).
  const L0 = lensOf(0), neck = transform({ x: -1, y: -HUMAN.torsoAboveHip * (L0.torso ?? 1) }, { x: 0, y: 0, a: lean });
  const crown = { x: neck.x + Math.sin(lean) * HUMAN.heights.head * (L0.head ?? 1), y: neck.y - Math.cos(lean) * HUMAN.heights.head * (L0.head ?? 1) };
  const lowest = Math.max(...chains.flatMap((c) => [c.foot.heel.y, c.foot.toe.y, c.chain.knee.y]), 0, neck.y, crown.y);
  const pelvisY = -lowest;
  const shift = (p) => ({ ...p, y: p.y + pelvisY });
  const legs = chains.map(({ root, chain, foot, fit }, k) => {
    const moved = bootAt(shift(chain.ankle), foot.a, { trackX: chain.ankle.x }, fit.kf);
    return { root: shift(root), elbow: shift(chain.knee), hand: shift(chain.ankle), target: shift(chain.ankle), error: 0, weight: 0,
      foot: { ...moved, stance: track.legs[k].contact[f] === 1, locked: false, scale: fit.kf, toeExact: fit.exact } };
  });
  const pelvis = { x: 0, y: pelvisY, a: 0 };
  const c = Math.cos(lean), sn = Math.sin(lean), top = { x: -c + sn * HUMAN.pelvisAboveHip, y: pelvisY - sn - c * HUMAN.pelvisAboveHip };
  const walkAmount = clamp(Math.abs(track.speed[f]) * s / GAIT.speed, 0, 1);
  return { pelvis: { x: top.x + 1, y: top.y + HUMAN.pelvisAboveHip, a: lean }, hip: pelvis, lean, legs, walkAmount, distance: track.distance[f] * s, bob: pelvisY - HUMAN.hipY, match: true };
}

/**
 * 부츠 발끝이 화면 벡터 T(발목→발끝)에 정확히 오도록 부츠 회전 a와 가로 배율 kf를 푼다.
 * 원화 부츠의 발끝은 발목 기준 (BOOT.toe.x·kf, BOOT.toe.y)이다. 세로(발목 높이)는 그대로 두고 가로 길이와 회전으로 맞추므로,
 * |T|가 발목 높이보다 짧으면(발이 카메라 쪽) 정확히 맞출 수 없어 최소 길이로 방향만 맞춘다.
 */
export function fitBootToToe(T) {
  const ty = BOOT.toe.y, L = Math.hypot(T.x, T.y), minX = BOOT.toe.x * 0.15;
  const wx = L * L > ty * ty + minX * minX ? Math.sqrt(L * L - ty * ty) : minX;
  return { a: Math.atan2(T.y, T.x) - Math.atan2(ty, wx), kf: wx / BOOT.toe.x, exact: wx > minX };
}

const mixAngle = (a, b, t) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;
function fk(root, thigh, shin, lens = RIG_LENS) {
  const knee = { x: root.x + Math.sin(thigh) * lens.thigh, y: root.y + Math.cos(thigh) * lens.thigh };
  return { knee, ankle: { x: knee.x + Math.sin(shin) * lens.shin, y: knee.y + Math.cos(shin) * lens.shin } };
}
/** 발목 위치와 발 각도로 부츠(뒤꿈치·발끝·피벗)를 만든다. footPose와 같은 형식이다. */
const bootOf = (kf = 1) => (kf === 1 ? BOOT : { heel: { x: BOOT.heel.x * kf, y: BOOT.heel.y }, toe: { x: BOOT.toe.x * kf, y: BOOT.toe.y } });
/** gait.footPose와 같은 계산을 부츠 길이 배율 kf로 한다(뼈대 비율 모드에서 늘어난 부츠로 접지). */
function footAt(trackX, clearance, angle, kf = 1) {
  if (kf === 1) return footPose(trackX, clearance, angle);
  const B = bootOf(kf), q = angle > 0 ? B.toe : B.heel, c = Math.cos(angle), sn = Math.sin(angle);
  const ankle = { x: trackX + q.x - (c * q.x - sn * q.y), y: -clearance - (sn * q.x + c * q.y) };
  const point = (p) => ({ x: ankle.x + c * p.x - sn * p.y, y: ankle.y + sn * p.x + c * p.y });
  return { ...ankle, a: angle, heel: point(B.heel), toe: point(B.toe), trackX, clearance, contact: angle > 0 ? 'toe' : 'heel', pivot: point(q) };
}
function bootAt(ankle, angle, ref, kf = 1) {
  const B = bootOf(kf), c = Math.cos(angle), sn = Math.sin(angle), point = (p) => ({ x: ankle.x + c * p.x - sn * p.y, y: ankle.y + sn * p.x + c * p.y });
  const heel = point(B.heel), toe = point(B.toe);
  return { x: ankle.x, y: ankle.y, a: angle, heel, toe, pivot: angle > 0 ? toe : heel, contact: angle > 0 ? 'toe' : 'heel', trackX: ref.trackX, clearance: Math.max(0, -Math.max(heel.y, toe.y)) };
}

function rebase(from, to, stretchY = 1) {
  const c = Math.cos(-from.a), sn = Math.sin(-from.a);
  return (p) => { const dx = p.x - from.x, dy = p.y - from.y; return transform({ x: c * dx - sn * dy, y: (sn * dx + c * dy) * stretchY }, to); };
}

/** rig_002 렌더러가 그대로 그릴 수 있는 리그. setFrame으로 BVH 프레임을 지정한다. */
export class MocapRig extends CharacterRig {
  constructor(track = null) { super(); this.track = track; this.frame = 0; this.footLock = true; this.match = false; this.proportions = false; this.live = false; this.headFollow = true; }
  setTrack(track) { this.track = track; this.frame = 0; }
  setFrame(frame) { this.frame = frame; if (this.track) this.distance = this.track.distance[clamp(frame | 0, 0, this.track.frames - 1)] * this.track.scale; }
  pose() {
    const base = super.pose();
    if (!this.track) return base;
    const low = lowerBodyPose(this.track, this.frame, { recoil: this.recoil.x, footLock: this.footLock, match: this.match, proportions: this.proportions, live: this.live && this.proportions });
    const L = this.lens(), kt = this.proportions ? L.torso : 1;
    const torso = { ...transform({ x: -1, y: -HUMAN.torsoAboveHip * kt }, { x: low.hip.x + this.recoil.x * 0.22, y: low.hip.y, a: low.lean }), a: low.lean };
    // IK는 강체 변환에 불변이므로, 기존 상체 결과를 새 몸통 좌표로 옮기면 손잡이 접점이 유지된다.
    // 뼈대 비율 모드는 몸통 그림을 세로로 kt배 늘이므로 어깨·총 장착점도 몸통 좌표의 세로 성분을 kt배 한다.
    const move = rebase(base.torso, torso, kt), da = torso.a - base.torso.a;
    this.lastTorso = torso;
    const arm = (a) => ({ ...a, root: move(a.root), elbow: move(a.elbow), hand: move(a.hand), target: move(a.target) });
    const sockets = Object.fromEntries(Object.entries(base.sockets).map(([k, v]) => [k, move(v)]));
    return {
      ...base, torso, pelvis: low.pelvis, bob: low.bob, walkAmount: low.walkAmount, legs: low.legs,
      weapon: { ...move(base.weapon), a: base.weapon.a + da }, sockets,
      armA: arm(base.armA), armB: arm(base.armB), palmA: move(base.palmA), palmB: move(base.palmB), supportTarget: move(base.supportTarget),
      handAngleA: base.handAngleA + da, handAngleB: base.handAngleB + da,
      mocapFrame: this.frame, hip: low.hip, lean: low.lean,
      // 몸통 대비 고개 각도(rad). null이면 rig_002처럼 몸통 기울기의 절반만큼 반대로 돌려 머리를 수평에 가깝게 둔다.
      spineBend: this.match ? this.spineBendAt(kt) : null,
      headTilt: this.headFollow && this.track.headTilt ? this.track.headTilt[clamp(this.frame | 0, 0, this.track.frames - 1)] : null,
      partScale: this.proportions ? { torso: L.torso, head: L.head, foot: low.match ? low.legs.map((l) => l.foot.scale) : [this.lens(0).foot, this.lens(1).foot],
        // 화면 맞춤은 클립 고정값으로 해, 실시간 길이에서 화면 배율이 프레임마다 흔들리지 않게 한다.
        fit: { torso: this.track.lens.mocap.torso, head: this.track.lens.mocap.head } }
        : { torso: 1, head: 1, foot: low.match ? low.legs.map((l) => l.foot.scale) : [1, 1], fit: { torso: 1, head: 1 } },
      ...(this.proportions && !this.match ? this.proportionArms(base, move) : {}),
      ...(this.match && this.track.arms ? this.matchArms(base, move, da) : {})
    };
  }
  lensKey() { return !this.track?.lens || !this.proportions ? 'rig' : this.live ? 'live' : 'mocap'; }
  /** 마디 길이(k: 팔 번호 0=armA·Right, 1=armB·Left / 다리 번호 0=Left, 1=Right). */
  lens(k = 0) { return this.track ? lensAt(this.track, this.lensKey(), clamp(this.frame | 0, 0, this.track.frames - 1), k) : RIG_LENS; }
  /** 뼈대 비율의 팔: 총 손잡이 목표는 그대로 두고 모캡 비율의 위팔·아래팔 길이로 IK를 다시 푼다. */
  proportionArms(base, move) {
    const solve = (a, k) => { const L = this.lens(k); return ik2(move(a.root), move(a.target), L.upperArm, L.forearm, 1); };
    return { armA: solve(base.armA, 0), armB: solve(base.armB, 1) };
  }
  /** 뼈대 일치 모드의 팔: 모캡 위팔·아래팔 각도 그대로. 총은 앞손(armA)에 붙어 따라가고 뒷손은 떨어질 수 있다. */
  /** 리그 몸통 길이(77·kt px)에 맞춰 줄이거나 늘인 척추 휘어짐 샘플(px). */
  spineBendAt(kt) {
    const f = clamp(this.frame | 0, 0, this.track.frames - 1), m = SPINE_SAMPLES.length, ratio = HUMAN.torsoAboveHip * kt / Math.max(1, this.track.torsoLen[f]);
    return Array.from(this.track.spineBend.subarray(f * m, f * m + m), (d) => d * ratio);
  }
  matchArms(base, move, da) {
    const f = clamp(this.frame | 0, 0, this.track.frames - 1), dirAngle = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
    const solve = (arm, k, baseHand, baseFore) => {
      // 어깨: 모캡 어깨 관절의 목 기준 화면 위치를 리그 몸통 길이 비율로 맞춰 리그 목점(몸통 원점)에 붙인다.
      const kt = this.proportions ? this.lens().torso : 1, ratio = HUMAN.torsoAboveHip * kt / Math.max(1, this.track.torsoLen[f]);
      const neck = this.lastTorso, A = this.track.arms[k];
      const root = neck ? { x: neck.x + A.shX[f] * ratio, y: neck.y + A.shY[f] * ratio } : move(arm.root), u = A.upper[f], v = A.fore[f];
      const L = this.lens(k);
      const elbow = { x: root.x + Math.sin(u) * L.upperArm, y: root.y + Math.cos(u) * L.upperArm };
      const hand = { x: elbow.x + Math.sin(v) * L.forearm, y: elbow.y + Math.cos(v) * L.forearm };
      const handAngle = dirAngle(elbow, hand) + (baseHand - baseFore); // 손목 꺾임은 기존 자세의 아래팔 대비 각도 유지
      const o = transform(handOffset(), { x: 0, y: 0, a: handAngle });
      return { arm: { ...arm, root, elbow, hand, target: hand }, palm: { x: hand.x + o.x, y: hand.y + o.y }, handAngle };
    };
    const A = solve(base.armA, 0, base.handAngleA, dirAngle(base.armA.elbow, base.armA.hand));
    const B = solve(base.armB, 1, base.handAngleB, dirAngle(base.armB.elbow, base.armB.hand));
    // 총: 기존 자세에서 앞손 손바닥 기준의 위치·각도를 그대로 유지해 앞손에 붙인다.
    const turn = A.handAngle - (base.handAngleA + da), basePalm = move(base.palmA);
    const carry = (p) => { const q = move(p), c = Math.cos(turn), sn = Math.sin(turn), dx = q.x - basePalm.x, dy = q.y - basePalm.y; return { x: A.palm.x + c * dx - sn * dy, y: A.palm.y + sn * dx + c * dy }; };
    const weapon = { ...carry(base.weapon), a: base.weapon.a + da + turn };
    const sockets = Object.fromEntries(Object.entries(base.sockets).map(([k, v]) => [k, carry(v)]));
    return { armA: A.arm, armB: B.arm, palmA: A.palm, palmB: B.palm, handAngleA: A.handAngle, handAngleB: B.handAngle, weapon, sockets, supportTarget: B.palm, gripError: 0 };
  }
}
