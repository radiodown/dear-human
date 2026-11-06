import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseBVH, evaluateFrame, bakePositions, facingYaw, smoothAngles, parseFrameCuts } from '../../game/animation/bvh.js';

const root = path.resolve(import.meta.dirname, '../..');
const sourceDir = path.join(root, 'art/characters/clone_01/motion/mocap_100style_001/source');

const SAMPLE = `HIERARCHY
ROOT Hips
{
 OFFSET 0 0 0
 CHANNELS 6 Xposition Yposition Zposition Yrotation Xrotation Zrotation
 JOINT Arm
 {
  OFFSET 10 0 0
  CHANNELS 3 Yrotation Xrotation Zrotation
  End Site
  {
   OFFSET 10 0 0
  }
 }
}
MOTION
Frames: 3
Frame Time: 0.5
0 100 0 0 0 0 0 0 0
5 100 0 90 0 0 0 0 0
0 100 0 0 0 0 0 0 90
`;
const near = (actual, expected, eps = 1e-4) => expected.forEach((v, i) => assert.ok(Math.abs(actual[i] - v) < eps, `${i}: ${actual[i]} ≠ ${v}`));

test('parses hierarchy, end sites, channels and motion', () => {
  const clip = parseBVH(SAMPLE);
  assert.deepEqual(clip.joints.map((j) => j.name), ['Hips', 'Arm', 'Arm_End']);
  assert.equal(clip.channelCount, 9); assert.equal(clip.frameCount, 3); assert.equal(clip.frameTime, 0.5);
  assert.equal(clip.joints[2].end, true); assert.equal(clip.joints[2].parent, 1);
});

test('forward kinematics applies root translation and channel rotation order', () => {
  const clip = parseBVH(SAMPLE);
  near(evaluateFrame(clip, 0), [0, 100, 0, 10, 100, 0, 20, 100, 0]);
  // 루트 Y 90°: +X 오프셋이 −Z로 간다.
  near(evaluateFrame(clip, 1), [5, 100, 0, 5, 100, -10, 5, 100, -20]);
  // 자식 Z 90°: 자식 아래 끝점이 +Y로 간다.
  near(evaluateFrame(clip, 2), [0, 100, 0, 10, 100, 0, 10, 110, 0]);
  assert.equal(bakePositions(clip).length, 3 * 3 * 3);
});

test('rejects malformed files', () => {
  assert.throws(() => parseBVH('MOTION\nFrames: 0\nFrame Time: 1'));
  assert.throws(() => parseBVH(SAMPLE.replace('0 100 0 0 0 0 0 0 90', '0 100 0')));
  assert.throws(() => parseBVH(SAMPLE.replace('Frames: 3', 'Frames: 4')));
});

test('facing yaw and circular smoothing', () => {
  // left − right = +X → 정면 +Z → yaw 0
  assert.ok(Math.abs(facingYaw(new Float32Array([1, 0, 0, -1, 0, 0]), 0, 0, 1)) < 1e-9);
  const s = smoothAngles(new Float32Array([Math.PI - 0.05, -Math.PI + 0.05, Math.PI - 0.05]), 1);
  assert.ok(Math.abs(Math.abs(s[1]) - Math.PI) < 0.06, '±π 경계를 평균할 때 0으로 무너지지 않는다');
});

test('stored 100STYLE Neutral clips match records and parse', () => {
  const record = JSON.parse(fs.readFileSync(path.join(root, 'art/characters/clone_01/motion/mocap_100style_001/records/source.json'), 'utf8'));
  const cuts = parseFrameCuts(fs.readFileSync(path.join(sourceDir, 'Frame_Cuts.csv'), 'utf8'), 'Neutral');
  for (const item of record.clips) {
    const file = path.join(sourceDir, item.file), text = fs.readFileSync(file, 'utf8');
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'), item.sha256);
    const clip = parseBVH(text);
    assert.equal(clip.frameCount, item.frames); assert.equal(clip.channelCount, 72); assert.equal(clip.joints.length, 28);
    assert.ok(Math.abs(1 / clip.frameTime - 60) < 0.01);
    assert.deepEqual(cuts[item.key], item.frame_cut);
    for (const name of ['Hips', 'Head', 'LeftHip', 'RightHip', 'LeftAnkle', 'RightAnkle', 'LeftToe_End', 'RightToe_End', 'LeftWrist', 'RightWrist']) assert.ok(name in clip.index, name);
    const p = evaluateFrame(clip, item.frame_cut[0]);
    const headY = p[clip.index.Head * 3 + 1];
    assert.ok(headY > 140 && headY < 180, `머리 높이 ${headY}cm`);
  }
});
