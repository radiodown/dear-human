import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseBVH, bakePositions, facingYaw, smoothAngles, parseFrameCuts } from '../../game/animation/bvh.js';
import { buildRetargetTrack, lowerBodyPose, MocapRig, FOOT_LOCK, estimateProgress } from '../../game/animation/mocap-retarget.js';
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
        assert.ok(leg.error < 0.05, `frame ${f} IK error ${leg.error}`);
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
  assert.ok(pct(locked, 0.5) < 0.5, `median ${pct(locked, 0.5)} px/s`);
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
    for (let f = cut[0]; f <= cut[0] + 600; f++) for (const leg of lowerBodyPose(t, f).legs) { assert.ok(leg.error < 0.05); assert.ok(leg.foot.heel.y <= 0.01 && leg.foot.toe.y <= 0.01); }
    // 정면에 가까울수록 다리 앞뒤 흔들림이 화면에서 작아진다.
    assert.ok(range(t, 0) < range(zero, 0), `${angle}° thigh swing ${range(t, 0)} < side ${range(zero, 0)}`);
  }
});
