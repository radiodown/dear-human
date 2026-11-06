import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseBVH, bakePositions, facingYaw, smoothAngles, parseFrameCuts } from '../../game/animation/bvh.js';
import { buildRetargetTrack, lowerBodyPose, MocapRig, FOOT_LOCK, estimateProgress, lensAt } from '../../game/animation/mocap-retarget.js';
import { CharacterRig } from '../../game/animation/rig-core.js';
import { GAIT } from '../../game/animation/gait.js';

const root = path.resolve(import.meta.dirname, '../..');
const dir = path.join(root, 'art/characters/clone_01/motion/mocap_100style_001/source');
const cuts = parseFrameCuts(fs.readFileSync(path.join(dir, 'Frame_Cuts.csv'), 'utf8'), 'Neutral');
const cache = new Map();
function load(key) {
  if (cache.has(key)) return cache.get(key);
  const clip = parseBVH(fs.readFileSync(path.join(dir, `Neutral_${key}.bvh`), 'utf8'));
  const P = bakePositions(clip), stride = clip.joints.length * 3, I = clip.index, n = clip.frameCount;
  const raw = new Float32Array(n);
  for (let f = 0; f < n; f++) raw[f] = facingYaw(P, f * stride, I.LeftHip, I.RightHip);
  const yaw = smoothAngles(raw, 30), progress = new Float32Array(n);
  for (let f = 1; f < n; f++) progress[f] = progress[f - 1] + (P[f * stride] - P[(f - 1) * stride]) * Math.sin(yaw[f]) + (P[f * stride + 2] - P[(f - 1) * stride + 2]) * Math.cos(yaw[f]);
  const result = { clip, track: buildRetargetTrack(clip, P, yaw, progress), cut: cuts[key] };
  cache.set(key, result); return result;
}
const pct = (values, q) => { const s = [...values].sort((a, b) => a - b); return s[Math.floor(s.length * q)]; };

for (const key of ['ID', 'FW', 'TR1']) {
  test(`${key}: legs reach, feet stay above the floor, pelvis stays in a human range`, () => {
    const { track, cut } = load(key);
    assert.ok(Math.abs(track.scale - (GAIT.thigh + GAIT.shin) / track.bvhLeg) < 1e-9);
    for (let f = cut[0]; f <= cut[1]; f++) {
      const p = lowerBodyPose(track, f);
      for (const leg of p.legs) {
        assert.ok(leg.error < 1.2, `frame ${f} IK error ${leg.error} (soft IK ≤ ~1.1px)`);
        assert.ok(leg.foot.heel.y <= 0.01 && leg.foot.toe.y <= 0.01, `frame ${f} foot below floor`);
        assert.ok(leg.elbow.x >= Math.min(leg.root.x, leg.hand.x) - 40, 'knee does not flip far backward');
      }
      assert.ok(p.pelvis.y < -140 && p.pelvis.y > -200, `frame ${f} pelvis ${p.pelvis.y}`);
      assert.ok(Math.abs(p.lean) <= 0.31);
    }
  });
}

test('foot lock removes most planted-foot sliding on the forward walk', () => {
  const { track, cut } = load('FW');
  const slide = (footLock) => {
    const values = []; let prev = null;
    for (let f = cut[0]; f <= cut[1]; f++) {
      const p = lowerBodyPose(track, f, { footLock });
      if (prev) p.legs.forEach((leg, k) => {
        const before = prev.legs[k].foot;
        if (leg.foot.stance && before.stance && leg.foot.contact === before.contact) values.push(Math.abs(leg.foot.pivot.x + p.distance - before.pivot.x - prev.distance) / track.frameTime);
      });
      prev = p;
    }
    return values;
  };
  const free = slide(false), locked = slide(true);
  assert.ok(locked.length > 1000);
  assert.ok(pct(locked, 0.5) < 1, `median ${pct(locked, 0.5)} px/s`);
  assert.ok(pct(locked, 0.9) < pct(free, 0.9) * 0.4, `p90 ${pct(locked, 0.9)} vs ${pct(free, 0.9)} px/s`);
  for (const leg of track.legs) for (const v of leg.lock) assert.ok(Math.abs(v) <= FOOT_LOCK.maxOffset + 1e-6);
});

test('MocapRig keeps the weapon grip and renderer pose contract', () => {
  const { track, cut } = load('FW');
  const rig = new MocapRig(track), plain = new CharacterRig();
  const keys = Object.keys(plain.pose()).sort();
  rig.trigger = true;
  for (let f = cut[0]; f < cut[0] + 240; f++) {
    rig.setFrame(f); rig.advance(track.frameTime);
    const p = rig.pose();
    for (const k of keys) assert.ok(k in p, `missing ${k}`);
    assert.ok(p.gripError < 0.01, `grip ${p.gripError}`);
    // 무기·어깨가 몸통과 함께 움직인다(몸통 좌표의 장착점 거리 보존).
    const d = Math.hypot(p.weapon.x - p.torso.x, p.weapon.y - p.torso.y), base = plain.pose();
    assert.ok(Math.abs(d - Math.hypot(base.weapon.x - base.torso.x, base.weapon.y - base.torso.y)) < 12);
    assert.equal(rig.distance, track.distance[f] * track.scale);
  }
  assert.ok(rig.shots > 0, 'firing still works while retargeted');
});

test('retarget is deterministic for random frame access', () => {
  const { track } = load('TR1');
  const a = lowerBodyPose(track, 3000), b = (lowerBodyPose(track, 10), lowerBodyPose(track, 3000));
  assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
});

test('in-place clips: travel is recovered from the planted foot and feet stay locked', () => {
  const { clip, cut } = load('FW');
  const P = bakePositions(clip).slice(), stride = clip.joints.length * 3, I = clip.index;
  // 루트 수평 이동을 지워 제자리 보행을 만든다(게임용 in-place 애니메이션과 같은 형태).
  for (let f = 0; f < clip.frameCount; f++) { const x = P[f * stride], z = P[f * stride + 2]; for (let j = 0; j < clip.joints.length; j++) { P[f * stride + j * 3] -= x; P[f * stride + j * 3 + 2] -= z; } }
  const raw = Float32Array.from({ length: clip.frameCount }, (_, f) => facingYaw(P, f * stride, I.LeftHip, I.RightHip));
  const yaw = smoothAngles(raw, 30), { progress, inPlace } = estimateProgress(clip, P, yaw);
  assert.equal(inPlace, true);
  const seconds = (cut[1] - cut[0]) * clip.frameTime, speed = (progress[cut[1]] - progress[cut[0]]) / seconds;
  assert.ok(speed > 70 && speed < 120, `recovered ${speed.toFixed(1)} cm/s (original ≈ 94)`);
  const track = buildRetargetTrack(clip, P, yaw, progress), slides = []; let prev = null;
  for (let f = cut[0]; f <= cut[1]; f++) {
    const p = lowerBodyPose(track, f);
    if (prev) p.legs.forEach((leg, k) => { if (leg.foot.stance && prev.legs[k].foot.stance && leg.foot.contact === prev.legs[k].foot.contact) slides.push(Math.abs(leg.foot.pivot.x + p.distance - prev.legs[k].foot.pivot.x - prev.distance) / track.frameTime); });
    prev = p;
  }
  assert.ok(pct(slides, 0.5) < 1 && pct(slides, 0.9) < 20, `slide p50 ${pct(slides, 0.5)} p90 ${pct(slides, 0.9)} px/s`);
  // 루트가 실제로 움직이는 원본은 제자리로 판정하지 않는다.
  assert.equal(estimateProgress(clip, bakePositions(clip), yaw).inPlace, false);
});

test('view angle: 0° matches the side view, other angles keep feet planted and scale travel by cos', () => {
  const { clip, track: side, cut } = load('FW');
  const P = bakePositions(clip), stride = clip.joints.length * 3, I = clip.index;
  const yaw = smoothAngles(Float32Array.from({ length: clip.frameCount }, (_, f) => facingYaw(P, f * stride, I.LeftHip, I.RightHip)), 30);
  const { progress } = estimateProgress(clip, P, yaw);
  const zero = buildRetargetTrack(clip, P, yaw, progress, { viewAngle: 0 });
  assert.deepEqual(Array.from(zero.legs[0].thigh.slice(1000, 1010)), Array.from(side.legs[0].thigh.slice(1000, 1010)));
  const range = (track, k) => { let lo = Infinity, hi = -Infinity; for (let f = cut[0]; f <= cut[1]; f++) { lo = Math.min(lo, track.legs[k].thigh[f]); hi = Math.max(hi, track.legs[k].thigh[f]); } return hi - lo; };
  for (const angle of [30, 45, 90]) {
    const t = buildRetargetTrack(clip, P, yaw, progress, { viewAngle: angle });
    assert.ok(Math.abs(t.distance[cut[1]] - progress[cut[1]] * Math.cos(angle * Math.PI / 180)) < 1e-3);
    for (let f = cut[0]; f <= cut[0] + 600; f++) for (const leg of lowerBodyPose(t, f).legs) { assert.ok(leg.error < 1.2); assert.ok(leg.foot.heel.y <= 0.01 && leg.foot.toe.y <= 0.01); }
    // 정면에 가까울수록 다리 앞뒤 흔들림이 화면에서 작아진다.
    assert.ok(range(t, 0) < range(zero, 0), `${angle}° thigh swing ${range(t, 0)} < side ${range(zero, 0)}`);
  }
});

test('no frame-to-frame jitter: rig knees and ankles stay smooth on the forward walk', () => {
  const { clip, cut } = load('FW');
  const P = bakePositions(clip), stride = clip.joints.length * 3, I = clip.index;
  const yaw = smoothAngles(Float32Array.from({ length: clip.frameCount }, (_, f) => facingYaw(P, f * stride, I.LeftHip, I.RightHip)), 30);
  const { progress } = estimateProgress(clip, P, yaw);
  for (const angle of [0, 30, 90]) {
    const t = buildRetargetTrack(clip, P, yaw, progress, { viewAngle: angle });
    const poses = []; for (let f = cut[0]; f < cut[0] + 900; f++) poses.push(lowerBodyPose(t, f));
    let worst = 0, what = '';
    for (let i = 1; i < poses.length - 1; i++) for (const k of [0, 1]) for (const part of ['elbow', 'hand']) for (const axis of ['x', 'y']) {
      const v = (j) => poses[j].legs[k][part][axis], acc = Math.abs(v(i + 1) - 2 * v(i) + v(i - 1));
      if (acc > worst) { worst = acc; what = `${angle}° leg${k} ${part}.${axis} frame ${cut[0] + i}`; }
    }
    // 2차 차분(프레임당 가속). 떨림 수정 전 최대 13~30px, 원본 BVH 무릎은 ≈0.7px.
    console.log(`jitter ${angle}°: ${worst.toFixed(2)}px at ${what}`);
    assert.ok(worst < { 0: 4, 30: 5, 90: 8 }[angle], `jitter ${worst.toFixed(2)}px at ${what}`);
  }
});

test('skeleton-match mode copies mocap leg and arm angles exactly at any view angle', () => {
  const { clip, cut } = load('FW');
  const P = bakePositions(clip), stride = clip.joints.length * 3, I = clip.index;
  const yaw = smoothAngles(Float32Array.from({ length: clip.frameCount }, (_, f) => facingYaw(P, f * stride, I.LeftHip, I.RightHip)), 30);
  const { progress } = estimateProgress(clip, P, yaw);
  const dir = (a, b) => Math.atan2(b.x - a.x, b.y - a.y), near = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < 1e-6;
  for (const angle of [0, 30, 90]) {
    const t = buildRetargetTrack(clip, P, yaw, progress, { viewAngle: angle }), rig = new MocapRig(t);
    rig.match = true;
    assert.ok(t.arms, 'arm joints found');
    for (let f = cut[0]; f < cut[0] + 300; f += 7) {
      rig.setFrame(f); const p = rig.pose();
      p.legs.forEach((leg, k) => {
        assert.ok(near(dir(leg.root, leg.elbow), t.legs[k].thigh[f]) && near(dir(leg.elbow, leg.hand), t.legs[k].shin[f]), `${angle}° leg${k} frame ${f}`);
        assert.ok(leg.foot.heel.y <= 1e-6 && leg.foot.toe.y <= 1e-6);
      });
      assert.ok(Math.abs(Math.max(...p.legs.flatMap((l) => [l.foot.heel.y, l.foot.toe.y]))) < 1e-6, 'lowest boot point on the floor');
      [[p.armA, 0], [p.armB, 1]].forEach(([arm, k]) => assert.ok(near(dir(arm.root, arm.elbow), t.arms[k].upper[f]) && near(dir(arm.elbow, arm.hand), t.arms[k].fore[f]), `${angle}° arm${k}`));
      assert.ok(Math.hypot(p.sockets.primary.x - p.palmA.x, p.sockets.primary.y - p.palmA.y) < 0.01, 'rifle stays in the front hand');
    }
  }
});

test('view pitch: 0° matches the level view; looking down/up changes screen angles and keeps constraints', () => {
  const { clip, cut } = load('FW');
  const P = bakePositions(clip), stride = clip.joints.length * 3, I = clip.index;
  const yaw = smoothAngles(Float32Array.from({ length: clip.frameCount }, (_, f) => facingYaw(P, f * stride, I.LeftHip, I.RightHip)), 30);
  const { progress } = estimateProgress(clip, P, yaw);
  const level = buildRetargetTrack(clip, P, yaw, progress, { viewAngle: 30 });
  const zero = buildRetargetTrack(clip, P, yaw, progress, { viewAngle: 30, viewPitch: 0 });
  assert.deepEqual(Array.from(zero.legs[1].shin.slice(cut[0], cut[0] + 20)), Array.from(level.legs[1].shin.slice(cut[0], cut[0] + 20)));
  for (const pitch of [-45, 30, 60]) {
    const t = buildRetargetTrack(clip, P, yaw, progress, { viewAngle: 30, viewPitch: pitch });
    let diff = 0;
    for (let f = cut[0]; f < cut[0] + 300; f++) diff = Math.max(diff, Math.abs(t.legs[0].thigh[f] - level.legs[0].thigh[f]));
    assert.ok(diff > 0.01, `${pitch}° pitch changes screen leg angles`);
    for (let f = cut[0]; f < cut[0] + 300; f += 3) for (const leg of lowerBodyPose(t, f).legs) { assert.ok(leg.error < 1.2); assert.ok(leg.foot.heel.y <= 0.01 && leg.foot.toe.y <= 0.01); }
    const rig = new MocapRig(t); rig.match = true;
    for (let f = cut[0]; f < cut[0] + 300; f += 11) {
      rig.setFrame(f); const p = rig.pose();
      p.legs.forEach((leg, k) => assert.ok(Math.abs(Math.atan2(leg.elbow.x - leg.root.x, leg.elbow.y - leg.root.y) - t.legs[k].thigh[f]) < 1e-6));
    }
  }
});

test('skeleton proportions: rig segments take the mocap thigh:shin and arm ratios in both modes', () => {
  const { clip, cut, track } = load('FW');
  const I = clip.index, scale = track.scale, len = (name) => Math.hypot(...clip.joints[I[name]].offset);
  const L = track.lens.mocap;
  assert.ok(Math.abs(L.thigh - (len('LeftKnee') + len('RightKnee')) / 2 * scale) < 1e-9);
  assert.ok(Math.abs(L.upperArm - (len('LeftElbow') + len('RightElbow')) / 2 * scale) < 1e-9);
  assert.ok(Math.abs(L.thigh + L.shin - (GAIT.thigh + GAIT.shin)) < 0.5, 'whole leg length stays the rig length');
  assert.ok(Math.abs(L.thigh / L.shin - len('LeftKnee') / len('LeftAnkle')) < 0.02, 'thigh:shin follows the skeleton (≈1:1, rig is 66:90)');
  const seg = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
  for (const match of [false, true]) {
    const rig = new MocapRig(track); rig.proportions = true; rig.match = match; rig.trigger = true;
    for (let f = cut[0]; f < cut[0] + 300; f += 9) {
      rig.setFrame(f); rig.advance(track.frameTime); const p = rig.pose();
      for (const leg of p.legs) {
        assert.ok(Math.abs(seg(leg.root, leg.elbow) - L.thigh) < 1e-6 && Math.abs(seg(leg.elbow, leg.hand) - L.shin) < 1e-6, `match=${match} leg lengths`);
        assert.ok(leg.foot.heel.y <= 0.01 && leg.foot.toe.y <= 0.01);
        if (!match) assert.ok(leg.error < 1.2);
      }
      for (const arm of [p.armA, p.armB]) assert.ok(Math.abs(seg(arm.root, arm.elbow) - L.upperArm) < 1e-6 && Math.abs(seg(arm.elbow, arm.hand) - L.forearm) < 1e-6, `match=${match} arm lengths`);
      if (!match) assert.ok(p.gripError < 0.01, `grip kept with skeleton arm lengths (${p.gripError})`);
    }
  }
});

test('skeleton proportions stretch torso, head and boots to the skeleton lengths', () => {
  const { clip, cut, track } = load('FW');
  const I = clip.index, s = track.scale, len = (v) => Math.hypot(...v), off = (n) => clip.joints[I[n]].offset;
  let spine = [0, 0, 0]; for (let j = I.Neck; j > I.Hips; j = clip.joints[j].parent) spine = spine.map((v, a) => v + clip.joints[j].offset[a]);
  const L = track.lens.mocap;
  assert.ok(Math.abs(L.torso * 77 - len(spine) * s) < 1e-6 && L.torso > 1.2, `torso ×${L.torso}`);
  assert.ok(Math.abs(L.head * 47 - (len(off('Head')) + len(off('Head_End'))) * s) < 1e-6, `head ×${L.head}`);
  assert.ok(L.foot > 2, `boot ×${L.foot}`);
  const rig = new MocapRig(track); rig.proportions = true;
  for (let f = cut[0]; f < cut[0] + 240; f += 8) {
    rig.setFrame(f); const p = rig.pose();
    assert.deepEqual(p.partScale, { torso: L.torso, head: L.head, foot: [L.foot, L.foot], fit: { torso: L.torso, head: L.head } });
    assert.ok(Math.abs(Math.hypot(p.torso.x - p.hip.x, p.torso.y - p.hip.y) - Math.hypot(1, 77 * L.torso)) < 1e-6, 'neck point sits at the skeleton torso length');
    for (const leg of p.legs) {
      const bootLen = Math.hypot(leg.foot.toe.x - leg.hand.x, leg.foot.toe.y - leg.hand.y);
      assert.ok(bootLen > 30, `stretched boot reaches ${bootLen.toFixed(1)}px forward`);
      assert.ok(leg.foot.heel.y <= 0.01 && leg.foot.toe.y <= 0.01, 'stretched boots stay above the floor');
    }
  }
});

test('live lengths: rig segments follow the projected skeleton lengths frame by frame', () => {
  const { clip, cut } = load('FW');
  const P = bakePositions(clip), stride = clip.joints.length * 3, I = clip.index;
  const yaw = smoothAngles(Float32Array.from({ length: clip.frameCount }, (_, f) => facingYaw(P, f * stride, I.LeftHip, I.RightHip)), 30);
  const { progress } = estimateProgress(clip, P, yaw);
  const seg = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
  for (const angle of [0, 60]) {
    const t = buildRetargetTrack(clip, P, yaw, progress, { viewAngle: angle, viewPitch: angle ? 30 : 0 });
    let lo = Infinity, hi = -Infinity;
    for (const match of [false, true]) {
      const rig = new MocapRig(t); rig.proportions = true; rig.live = true; rig.match = match;
      for (let f = cut[0]; f < cut[0] + 240; f += 6) {
        rig.setFrame(f); const p = rig.pose();
        p.legs.forEach((leg, k) => {
          const L = lensAt(t, 'live', f, k);
          assert.ok(Math.abs(seg(leg.root, leg.elbow) - L.thigh) < 1e-6 && Math.abs(seg(leg.elbow, leg.hand) - L.shin) < 1e-6, `${angle}° match=${match} leg${k} frame ${f}`);
          assert.ok(leg.foot.heel.y <= 0.01 && leg.foot.toe.y <= 0.01);
          lo = Math.min(lo, L.thigh); hi = Math.max(hi, L.thigh);
        });
        [[p.armA, 0], [p.armB, 1]].forEach(([arm, k]) => { const L = lensAt(t, 'live', f, k); assert.ok(Math.abs(seg(arm.root, arm.elbow) - L.upperArm) < 1e-6); });
        // 뼈대 일치 모드는 발끝 맞춤으로 부츠 길이를 정하므로 기본 모드에서만 실시간 부츠 배율을 비교한다.
        if (!match) assert.deepEqual(p.partScale.foot, [lensAt(t, 'live', f, 0).foot, lensAt(t, 'live', f, 1).foot]);
        assert.equal(p.partScale.fit.torso, t.lens.mocap.torso, 'screen fit stays fixed');
      }
    }
    if (angle) assert.ok(hi - lo > 5, `thigh length changes with the view (${lo.toFixed(1)}–${hi.toFixed(1)}px)`);
  }
});

test('skeleton-match mode puts the boot toe on the projected skeleton toe', () => {
  const { clip, cut } = load('FW');
  const P = bakePositions(clip), stride = clip.joints.length * 3, I = clip.index;
  const yaw = smoothAngles(Float32Array.from({ length: clip.frameCount }, (_, f) => facingYaw(P, f * stride, I.LeftHip, I.RightHip)), 30);
  const { progress } = estimateProgress(clip, P, yaw);
  for (const angle of [0, 45]) {
    const t = buildRetargetTrack(clip, P, yaw, progress, { viewAngle: angle });
    const rig = new MocapRig(t); rig.match = true;
    for (let f = cut[0]; f < cut[0] + 300; f += 5) {
      rig.setFrame(f); const p = rig.pose();
      p.legs.forEach((leg, k) => {
        const T = { x: t.legs[k].toeX[f], y: t.legs[k].toeY[f] }, toe = { x: leg.foot.toe.x - leg.hand.x, y: leg.foot.toe.y - leg.hand.y };
        assert.ok(Math.abs(Math.atan2(toe.y, toe.x) - Math.atan2(T.y, T.x)) < 1e-6, `${angle}° toe direction frame ${f}`);
        if (leg.foot.toeExact) assert.ok(Math.hypot(toe.x - T.x, toe.y - T.y) < 1e-6, `${angle}° toe position frame ${f}`);
        assert.ok(leg.foot.heel.y <= 1e-6 && leg.foot.toe.y <= 1e-6);
      });
      assert.deepEqual(p.partScale.foot, p.legs.map((l) => l.foot.scale), 'renderer draws the fitted boot length');
    }
  }
});

test('head follows the mocap neck→head tilt relative to the torso, zeroed at the standing posture', () => {
  for (const key of ['ID', 'FW']) {
    const { track, cut } = load(key);
    const tilt = Array.from(track.headTilt.slice(cut[0], cut[1]));
    const sorted = [...tilt].sort((a, b) => a - b), median = sorted[sorted.length >> 1];
    assert.ok(Math.abs(median) < 0.05, `${key} standing head median ${median.toFixed(3)} rad ≈ 0`);
    assert.ok(Math.abs(track.headNeutral - 0.37) < 0.05, `${key} actor's natural forward neck ≈ 21° (${(track.headNeutral * 57.3).toFixed(1)}°)`);
    assert.ok(tilt.every((v) => Math.abs(v) <= 0.7 + 1e-6));
    const rig = new MocapRig(track); rig.setFrame(cut[0] + 100);
    assert.equal(rig.pose().headTilt, track.headTilt[cut[0] + 100]);
    rig.headFollow = false; assert.equal(rig.pose().headTilt, null);
    assert.ok(rig.pose().partScale, 'mocap rig always uses the mocap renderer path');
  }
});

test('skeleton-match mode bends the torso along the spine and places shoulders from the mocap', () => {
  const { clip, cut, track } = load('FW');
  const P = bakePositions(clip), stride = clip.joints.length * 3, I = clip.index, n = 5;
  const rig = new MocapRig(track); rig.match = true;
  const yaw = smoothAngles(Float32Array.from({ length: clip.frameCount }, (_, f) => facingYaw(P, f * stride, I.LeftHip, I.RightHip)), 30);
  let maxBend = 0;
  for (let f = cut[0]; f < cut[0] + 300; f += 7) {
    rig.setFrame(f); const p = rig.pose();
    assert.equal(p.spineBend.length, n);
    assert.ok(Math.abs(p.spineBend[0]) < 1e-9 && Math.abs(p.spineBend[n - 1]) < 1e-9, 'bend is anchored at neck and hips');
    maxBend = Math.max(maxBend, ...p.spineBend.map(Math.abs));
    // 어깨: 목점 + (모캡 어깨 − 목) × 몸통 길이 비율
    const ratio = 77 / track.torsoLen[f];
    [[p.armA, 0], [p.armB, 1]].forEach(([arm, k]) => {
      const A = track.arms[k];
      assert.ok(Math.hypot(arm.root.x - (p.torso.x + A.shX[f] * ratio), arm.root.y - (p.torso.y + A.shY[f] * ratio)) < 1e-6, `shoulder ${k} frame ${f}`);
    });
    // 측면에서는 두 어깨가 목 아래로 거의 겹친다(실제 투영과 같음).
    assert.ok(Math.abs(p.armA.root.x - p.armB.root.x) < 15 && p.armA.root.y > p.torso.y, `shoulders ${(p.armA.root.x - p.armB.root.x).toFixed(1)}px apart, armA below neck ${(p.armA.root.y - p.torso.y).toFixed(1)}px`);
    void yaw;
  }
  assert.ok(maxBend > 1 && maxBend < 15, `walking spine bend ${maxBend.toFixed(2)}px`);
  rig.match = false; rig.setFrame(cut[0]); assert.equal(rig.pose().spineBend, null, 'default mode keeps the rigid torso');
});
