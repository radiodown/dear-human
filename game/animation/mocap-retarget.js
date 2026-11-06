// BVH(Y-up, cm) → rig_002 측면 2D 리그(Y-down, 논리 px) 리타겟.
// 하체(골반 높이·몸통 기울기·다리·발)는 모캡이 구동하고, 상체(무기 장착·양팔 IK·스프링)는
// 기존 CharacterRig 결과를 몸통 변환에 강체로 따라오게 한다. rig_002 해시 파일은 수정하지 않는다.
import { CharacterRig, ik2, transform, clamp } from './rig-core.js';
import { GAIT, BOOT, footPose } from './gait.js';
import { HUMAN } from './proportions.js';

const LEG = GAIT.thigh + GAIT.shin;
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
export function buildRetargetTrack(clip, P, yaw, progress, { viewAngle = 0 } = {}) {
  const I = clip.index, J = clip.joints.length, stride = J * 3, n = clip.frameCount;
  for (const name of REQUIRED) if (!(name in I)) throw new Error(`리타겟에 필요한 관절이 없습니다: ${name}`);
  const off = (name) => clip.joints[I[name]].offset;
  const bvhLeg = len(off('LeftKnee')) + len(off('LeftAnkle'));
  const scale = LEG / bvhLeg; // 다리 길이 기준 px/cm
  const toe = off('LeftToe'), footRestLen = Math.hypot(toe[0], toe[2]), footRestPitch = Math.atan2(toe[1], Math.hypot(toe[0], toe[2]));
  let spine = [0, 0, 0];
  for (let j = I.Neck; j > I.Hips; j = clip.joints[j].parent) { const o = clip.joints[j].offset; spine = [spine[0] + o[0], spine[1] + o[1], spine[2] + o[2]]; }
  const spineRest = Math.atan2(spine[2], spine[1]);

  const at = (f, j, k) => P[f * stride + j * 3 + k];
  const ankleHeights = [], ballHeights = [];
  for (let f = 0; f < n; f++) for (const s of SIDES) { ankleHeights.push(at(f, I[`${s}Ankle`], 1)); ballHeights.push(at(f, I[`${s}Toe`], 1)); }
  const ankleGround = percentile(ankleHeights, 0.05), ballGround = percentile(ballHeights, 0.05);

  const track = {
    frames: n, frameTime: clip.frameTime, scale, bvhLeg, ankleGround, ballGround, viewAngle, viewCos: Math.cos(viewAngle * Math.PI / 180),
    hip: new Float32Array(n), lean: new Float32Array(n), speed: new Float32Array(n), distance: new Float32Array(n),
    // 다리별 [발목 전방 cm, 볼 전방 cm, 발 길이 투영 cm, 발 각도 rad, 최저점 높이 cm]
    legs: SIDES.map(() => ({ ankle: new Float32Array(n), ball: new Float32Array(n), foot: new Float32Array(n), angle: new Float32Array(n), clearance: new Float32Array(n),
      // 측면 투영한 허벅지·정강이 방향(rad, 아래 0 · 앞 +). 리그 비례가 달라도 다리 모양을 그대로 옮기는 FK 입력이다.
      thigh: new Float32Array(n), shin: new Float32Array(n),
      // 엉덩이 관절의 화면 가로 위치(cm, 골반 기준). 시점을 돌리면 좌우 다리 시작점이 벌어진다.
      hipX: new Float32Array(n) }))
  };
  // 시점 각도: 0°=인물 오른쪽에서 본 측면, 90°=정면. 화면 가로축 R = F·cosθ + L·sinθ.
  const vc = Math.cos(viewAngle * Math.PI / 180), vs = Math.sin(viewAngle * Math.PI / 180);
  for (let f = 0; f < n; f++) {
    const F = [Math.sin(yaw[f]) * vc + Math.cos(yaw[f]) * vs, Math.cos(yaw[f]) * vc - Math.sin(yaw[f]) * vs];
    const hx = at(f, I.Hips, 0), hz = at(f, I.Hips, 2);
    const fwd = (j) => (at(f, j, 0) - hx) * F[0] + (at(f, j, 2) - hz) * F[1];
    track.hip[f] = at(f, I.Hips, 1) - ankleGround;
    const sx = at(f, I.Neck, 0) - hx, sy = at(f, I.Neck, 1) - at(f, I.Hips, 1), sz = at(f, I.Neck, 2) - hz;
    track.lean[f] = Math.atan2(sx * F[0] + sz * F[1], sy) - spineRest;
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
      leg.foot[f] = footRestLen * clamp(yawCos, 0.2, 1);
      leg.angle[f] = footRestPitch - Math.atan2(dy, horizontal); // + = 발끝 내림(뒤꿈치 들림)
      leg.clearance[f] = Math.max(0, Math.min(at(f, ankle, 1) - ankleGround, at(f, ball, 1) - ballGround));
      const hip = I[`${s}Hip`], knee = I[`${s}Knee`];
      leg.hipX[f] = fwd(hip);
      leg.thigh[f] = Math.atan2(fwd(knee) - fwd(hip), at(f, hip, 1) - at(f, knee, 1));
      leg.shin[f] = Math.atan2(fwd(ankle) - fwd(knee), at(f, knee, 1) - at(f, ankle, 1));
    });
  }
  lockFeet(track);
  contactWeights(track);
  return track;
}

/**
 * 접지 가중치(0=모캡 각도 FK, 1=바닥 IK).
 * - 바닥에 닿은 프레임(clearance < full)에서 떨어진 프레임 수로 0.1초 정도만 FK↔IK를 섞는다.
 * - 발끝 차기처럼 발 각도가 크면 FK를 따른다(리그 부츠가 짧아 IK로 붙이면 무릎이 덜 굽는다).
 * - flat: 발바닥이 평평한 정도. 골반 높이를 그 발에 맞출 때 쓴다.
 * 접지(발 고정) 프레임은 항상 1이다.
 */
export const BLEND = Object.freeze({ full: 1.5, frames: 6, rollStart: 0.25, rollEnd: 0.75, flatEnd: 0.4 });
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
      leg.flat[f] = leg.weight[f] * (1 - smooth(clamp(a / BLEND.flatEnd, 0, 1)));
    }
  }
}

/** 피벗 기준 발 위치(cm, 골반 기준 전방). 각도 부호로 뒤꿈치/발끝 피벗을 고른다. */
function pivotTrack(leg, f) { return clampAngle(leg.angle[f]) > 0 ? leg.ball[f] - leg.foot[f] : leg.ankle[f]; }
const clampAngle = (a) => clamp(a, -0.6, 1.1);

/**
 * 발 고정: 접지 구간에서 피벗의 월드 위치를 고정하고, 떼는 순간 보정량을 짧게 풀어 준다.
 * 프레임별 보정량을 미리 저장하므로 임의 프레임으로 이동해도 결과가 같다.
 */
export const FOOT_LOCK = Object.freeze({ clearance: 1.5, angle: 0.35, release: 0.7, maxOffset: 6 });
function lockFeet(track) {
  for (const leg of track.legs) {
    leg.lock = new Float32Array(track.frames); leg.contact = new Uint8Array(track.frames);
    let locked = null, pivot = 0, offset = 0;
    for (let f = 0; f < track.frames; f++) {
      const raw = pivotTrack(leg, f) + track.distance[f], side = clampAngle(leg.angle[f]) > 0 ? 1 : -1;
      const contact = leg.clearance[f] < FOOT_LOCK.clearance && Math.abs(leg.angle[f]) < FOOT_LOCK.angle;
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
export function lowerBodyPose(track, frame, { recoil = 0, footLock = true } = {}) {
  const f = clamp(frame | 0, 0, track.frames - 1), s = track.scale;
  const feet = track.legs.map((leg) => {
    // 뒤꿈치 피벗은 발목, 발끝 피벗은 볼을 기준으로 둔다. 발이 평평할 때 두 값이 같아 피벗 전환이 연속이다.
    const trackX = (pivotTrack(leg, f) + (footLock ? leg.lock[f] : 0)) * s;
    return { ...footPose(trackX, leg.clearance[f] * s, clampAngle(leg.angle[f])), locked: footLock && leg.contact[f] === 1 };
  });
  // 골반 높이: 평평하게 디딘 발이 있으면, 모캡 각도로 펼친 리그 다리의 발목이 그 발 위치에 오도록 맞춘다.
  // (리그 마디 비율이 사람과 달라도 디딤 다리의 무릎 각도가 모캡과 같아진다.) 디딘 발이 없으면 모캡 골반 높이.
  // 다리 시작점: rig_002 기본 간격(측면용 ±3px)을 cos로 줄이고, 투영한 엉덩이 관절 위치를 더한다. 0°에서는 거의 이전과 같다.
  const vc = track.viewCos ?? 1;
  const rootX = track.legs.map((leg, k) => ROOTS[k].x * vc + leg.hipX[f] * s);
  const fromMocap = -(track.hip[f] * s + ANKLE_HEIGHT);
  let sum = 0, weight = 0;
  feet.forEach((foot, k) => {
    const leg = track.legs[k], w = leg.flat[f];
    if (w <= 1e-3) return;
    const chain = fk({ x: 0, y: 0 }, leg.thigh[f], leg.shin[f]);
    sum += w * (foot.y - ROOTS[k].y - chain.ankle.y); weight += w;
  });
  const rest = Math.max(0, 1 - weight);
  let pelvisY = (sum + rest * fromMocap) / (weight + rest);
  // 바닥 IK를 쓰는 발이 닿도록 골반을 낮춘다(다리를 늘리지 않음).
  feet.forEach((foot, k) => {
    if (track.legs[k].weight[f] <= 0.01) return;
    const dx = foot.x - rootX[k], reach = LEG - 0.05;
    if (Math.abs(dx) < reach) pelvisY = Math.max(pelvisY, foot.y - Math.sqrt(reach * reach - dx * dx) - ROOTS[k].y);
  });
  const lean = clamp(track.lean[f], -0.3, 0.3) + recoil * 0.003;
  const pelvis = { x: 0, y: pelvisY, a: 0 };
  const legs = feet.map((target, k) => {
    const leg = track.legs[k], w = leg.weight[f];
    const root = { x: pelvis.x + rootX[k], y: pelvis.y + ROOTS[k].y };
    // 바닥 IK 해의 각도와 모캡 각도(FK)를 섞는다. 각도를 섞으므로 마디 길이는 항상 리그 값이다.
    const ik = ik2(root, target, GAIT.thigh, GAIT.shin, -1);
    const ikThigh = Math.atan2(ik.elbow.x - root.x, ik.elbow.y - root.y), ikShin = Math.atan2(ik.hand.x - ik.elbow.x, ik.hand.y - ik.elbow.y);
    let chain = fk(root, mixAngle(leg.thigh[f], ikThigh, w), mixAngle(leg.shin[f], ikShin, w));
    let foot = bootAt(chain.ankle, target.a, target);
    // 공중 FK가 부츠를 바닥 아래로 넣으면 같은 x에서 바닥 위로 올린 목표로 IK를 다시 푼다.
    const sink = Math.max(foot.heel.y, foot.toe.y);
    if (sink > 0) { const lifted = ik2(root, { x: chain.ankle.x, y: chain.ankle.y - sink }, GAIT.thigh, GAIT.shin, -1); chain = { knee: lifted.elbow, ankle: lifted.hand }; foot = bootAt(chain.ankle, target.a, target); }
    const error = Math.hypot(chain.ankle.x - target.x, chain.ankle.y - target.y);
    return { root, elbow: chain.knee, hand: chain.ankle, target: w > 0.5 ? target : chain.ankle, error: w >= 0.999 ? error : 0, weight: w,
      foot: { ...foot, stance: leg.contact[f] === 1, locked: target.locked } };
  });
  const walkAmount = clamp(Math.abs(track.speed[f]) * s / GAIT.speed, 0, 1);
  return { pelvis, lean, legs, walkAmount, distance: track.distance[f] * s, bob: pelvisY - HUMAN.hipY };
}

const mixAngle = (a, b, t) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;
function fk(root, thigh, shin) {
  const knee = { x: root.x + Math.sin(thigh) * GAIT.thigh, y: root.y + Math.cos(thigh) * GAIT.thigh };
  return { knee, ankle: { x: knee.x + Math.sin(shin) * GAIT.shin, y: knee.y + Math.cos(shin) * GAIT.shin } };
}
/** 발목 위치와 발 각도로 부츠(뒤꿈치·발끝·피벗)를 만든다. footPose와 같은 형식이다. */
function bootAt(ankle, angle, ref) {
  const c = Math.cos(angle), sn = Math.sin(angle), point = (p) => ({ x: ankle.x + c * p.x - sn * p.y, y: ankle.y + sn * p.x + c * p.y });
  const heel = point(BOOT.heel), toe = point(BOOT.toe);
  return { x: ankle.x, y: ankle.y, a: angle, heel, toe, pivot: angle > 0 ? toe : heel, contact: angle > 0 ? 'toe' : 'heel', trackX: ref.trackX, clearance: Math.max(0, -Math.max(heel.y, toe.y)) };
}

function rebase(from, to) {
  const c = Math.cos(-from.a), sn = Math.sin(-from.a);
  return (p) => { const dx = p.x - from.x, dy = p.y - from.y; return transform({ x: c * dx - sn * dy, y: sn * dx + c * dy }, to); };
}

/** rig_002 렌더러가 그대로 그릴 수 있는 리그. setFrame으로 BVH 프레임을 지정한다. */
export class MocapRig extends CharacterRig {
  constructor(track = null) { super(); this.track = track; this.frame = 0; this.footLock = true; }
  setTrack(track) { this.track = track; this.frame = 0; }
  setFrame(frame) { this.frame = frame; if (this.track) this.distance = this.track.distance[clamp(frame | 0, 0, this.track.frames - 1)] * this.track.scale; }
  pose() {
    const base = super.pose();
    if (!this.track) return base;
    const low = lowerBodyPose(this.track, this.frame, { recoil: this.recoil.x, footLock: this.footLock });
    const torso = { ...transform({ x: -1, y: -HUMAN.torsoAboveHip }, { x: low.pelvis.x + this.recoil.x * 0.22, y: low.pelvis.y, a: low.lean }), a: low.lean };
    // IK는 강체 변환에 불변이므로, 기존 상체 결과를 새 몸통 좌표로 옮기면 손잡이 접점이 유지된다.
    const move = rebase(base.torso, torso), da = torso.a - base.torso.a;
    const arm = (a) => ({ ...a, root: move(a.root), elbow: move(a.elbow), hand: move(a.hand), target: move(a.target) });
    const sockets = Object.fromEntries(Object.entries(base.sockets).map(([k, v]) => [k, move(v)]));
    return {
      ...base, torso, pelvis: low.pelvis, bob: low.bob, walkAmount: low.walkAmount, legs: low.legs,
      weapon: { ...move(base.weapon), a: base.weapon.a + da }, sockets,
      armA: arm(base.armA), armB: arm(base.armB), palmA: move(base.palmA), palmB: move(base.palmB), supportTarget: move(base.supportTarget),
      handAngleA: base.handAngleA + da, handAngleB: base.handAngleB + da,
      mocapFrame: this.frame
    };
  }
}
