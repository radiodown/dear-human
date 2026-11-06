import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseBVH } from '../../game/animation/bvh.js';
import { parseGLB, sampleChannel, listAnimations } from '../../game/animation/gltf-motion.js';
import { canonicalName, normalizeSkeleton } from '../../game/animation/skeleton.js';
import { motionFromBVH, motionFromFiles } from '../../game/animation/motion-import.js';
import { buildRetargetTrack, lowerBodyPose, estimateProgress } from '../../game/animation/mocap-retarget.js';
import { facingYaw, smoothAngles } from '../../game/animation/bvh.js';

const root = path.resolve(import.meta.dirname, '../..');
const bvhText = fs.readFileSync(path.join(root, 'art/characters/clone_01/motion/mocap_100style_001/source/Neutral_FW.bvh'), 'utf8');
const MIXAMO = { Hips: 'Hips', Chest: 'Spine', Chest2: 'Spine1', Chest3: 'Spine2', Chest4: 'Spine3', Neck: 'Neck', Head: 'Head', Head_End: 'HeadTop_End',
  RightCollar: 'RightShoulder', RightShoulder: 'RightArm', RightElbow: 'RightForeArm', RightWrist: 'RightHand', RightWrist_End: 'RightHandIndex1',
  LeftCollar: 'LeftShoulder', LeftShoulder: 'LeftArm', LeftElbow: 'LeftForeArm', LeftWrist: 'LeftHand', LeftWrist_End: 'LeftHandIndex1',
  RightHip: 'RightUpLeg', RightKnee: 'RightLeg', RightAnkle: 'RightFoot', RightToe: 'RightToeBase', RightToe_End: 'RightToe_End',
  LeftHip: 'LeftUpLeg', LeftKnee: 'LeftLeg', LeftAnkle: 'LeftFoot', LeftToe: 'LeftToeBase', LeftToe_End: 'LeftToe_End' };

const qmul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
const axisQ = (axis, deg) => { const h = deg * Math.PI / 360, q = [0, 0, 0, Math.cos(h)]; q[axis] = Math.sin(h); return q; };

/** BVH 앞부분을 Mixamo식 이름·Armature(scale 0.01, 단위 m) 아래 GLB로 만든다. */
function bvhToGlb(text, frames, { dropToeEnd = false } = {}) {
  const clip = parseBVH(text), J = clip.joints.length;
  const keep = clip.joints.map((j) => !(dropToeEnd && /Toe_End$/.test(j.name)));
  const nodeOf = new Map(); const nodes = [{ name: 'Armature', scale: [0.01, 0.01, 0.01], children: [] }];
  clip.joints.forEach((j, k) => { if (!keep[k]) return; nodeOf.set(k, nodes.length); nodes.push({ name: `mixamorig:${MIXAMO[j.name] || j.name}`, translation: j.offset.slice(), children: [] }); });
  clip.joints.forEach((j, k) => { if (!keep[k]) return; (j.parent >= 0 ? nodes[nodeOf.get(j.parent)] : nodes[0]).children.push(nodeOf.get(k)); });
  nodes.forEach((n) => { if (!n.children.length) delete n.children; });
  const chunks = [], accessors = [], bufferViews = []; let byteLength = 0;
  const add = (array, type, minmax = false) => {
    const bytes = new Uint8Array(array.buffer.slice(0)); bufferViews.push({ buffer: 0, byteOffset: byteLength, byteLength: bytes.length });
    const acc = { bufferView: bufferViews.length - 1, componentType: 5126, count: array.length / { SCALAR: 1, VEC3: 3, VEC4: 4 }[type], type };
    if (minmax) { acc.min = [array[0]]; acc.max = [array[array.length - 1]]; }
    accessors.push(acc); chunks.push(bytes); byteLength += bytes.length; return accessors.length - 1;
  };
  const times = Float32Array.from({ length: frames }, (_, f) => f * clip.frameTime), input = add(times, 'SCALAR', true);
  const channels = [], samplers = [];
  clip.joints.forEach((j, k) => {
    if (!keep[k] || !j.channels.length) return;
    const rot = new Float32Array(frames * 4), tr = new Float32Array(frames * 3);
    for (let f = 0; f < frames; f++) {
      let q = [0, 0, 0, 1]; const t = j.offset.slice();
      j.channels.forEach((ch, c) => { const v = clip.data[f * clip.channelCount + j.channelStart + c]; if (ch.kind === 'position') t[ch.axis] += v; else q = qmul(q, axisQ(ch.axis, v)); });
      rot.set(q, f * 4); tr.set(t, f * 3);
    }
    samplers.push({ input, output: add(rot, 'VEC4'), interpolation: 'LINEAR' }); channels.push({ sampler: samplers.length - 1, target: { node: nodeOf.get(k), path: 'rotation' } });
    if (j.channels.some((ch) => ch.kind === 'position')) { samplers.push({ input, output: add(tr, 'VEC3'), interpolation: 'LINEAR' }); channels.push({ sampler: samplers.length - 1, target: { node: nodeOf.get(k), path: 'translation' } }); }
  });
  const json = { asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes, skins: [{ joints: [...nodeOf.values()] }], animations: [{ name: 'Walk', channels, samplers }], buffers: [{ byteLength }], bufferViews, accessors };
  const bin = new Uint8Array(byteLength); let o = 0; for (const c of chunks) { bin.set(c, o); o += c.length; }
  return { json, bin, clip };
}
function packGlb(json, bin) {
  let jsonBytes = new TextEncoder().encode(JSON.stringify(json)); const pad = (4 - jsonBytes.length % 4) % 4;
  jsonBytes = Uint8Array.from([...jsonBytes, ...Array(pad).fill(0x20)]);
  const binPad = (4 - bin.length % 4) % 4, total = 12 + 8 + jsonBytes.length + 8 + bin.length + binPad;
  const out = new ArrayBuffer(total), v = new DataView(out), u = new Uint8Array(out);
  v.setUint32(0, 0x46546c67, true); v.setUint32(4, 2, true); v.setUint32(8, total, true);
  v.setUint32(12, jsonBytes.length, true); v.setUint32(16, 0x4e4f534a, true); u.set(jsonBytes, 20);
  const b = 20 + jsonBytes.length; v.setUint32(b, bin.length + binPad, true); v.setUint32(b + 4, 0x004e4942, true); u.set(bin, b + 8);
  return out;
}

test('canonical joint names cover Mixamo, Blender and VRM styles', () => {
  const cases = { 'mixamorig:LeftUpLeg': 'LeftHip', 'mixamorig:RightLeg': 'RightKnee', 'mixamorig1:LeftFoot': 'LeftAnkle', 'LeftToeBase': 'LeftToe', 'mixamorig:LeftToe_End': 'LeftToe_End',
    'thigh.L': 'LeftHip', 'shin.R': 'RightKnee', 'foot_l': 'LeftAnkle', 'J_Bip_L_UpperLeg': 'LeftHip', 'J_Bip_R_LowerLeg': 'RightKnee', 'Armature|mixamorig:Hips': 'Hips',
    'pelvis': 'Hips', 'HeadTop_End': 'Head_End', 'mixamorig:LeftArm': 'LeftShoulder', 'mixamorig:LeftForeArm': 'LeftElbow', 'mixamorig:LeftShoulder': 'LeftCollar', 'Spine1': null,
    // Unreal 마네킹식(Quaternius Universal Animation Library)
    'neck_01': 'Neck', 'calf_l': 'LeftKnee', 'ball_r': 'RightToe', 'ball_leaf_l': 'LeftToe_End', 'upperarm_r': 'RightShoulder', 'lowerarm_l': 'LeftElbow', 'clavicle_l': 'LeftCollar', 'root': null };
  for (const [name, expected] of Object.entries(cases)) assert.equal(canonicalName(name), expected, name);
});

test('GLB (Mixamo names, Armature scale 0.01, meters) bakes to the same joint positions as the BVH', async () => {
  const frames = 90, { json, bin } = bvhToGlb(bvhText, frames);
  const glb = packGlb(json, bin);
  const parsed = parseGLB(glb);
  assert.equal(parsed.json.animations[0].name, 'Walk');
  const fromGlb = (await motionFromFiles([{ name: 'walk.glb', data: glb }])).clip;
  const fromBvh = motionFromBVH(bvhText);
  assert.equal(fromGlb.unit, 'm'); assert.equal(fromGlb.renamed, true); assert.equal(fromGlb.frameCount, frames);
  assert.ok(!fromGlb.joints.some((j) => /Index/.test(j.source || '')), 'finger joints dropped');
  let worst = 0;
  for (const name of ['Hips', 'Neck', 'Head', 'LeftHip', 'LeftKnee', 'LeftAnkle', 'LeftToe', 'LeftToe_End', 'RightKnee', 'RightAnkle', 'RightToe', 'LeftWrist', 'RightElbow']) {
    const a = fromGlb.index[name], b = fromBvh.index[name];
    assert.ok(a !== undefined && b !== undefined, name);
    for (let f = 0; f < frames; f++) for (let k = 0; k < 3; k++) {
      worst = Math.max(worst, Math.abs(fromGlb.positions[(f * fromGlb.joints.length + a) * 3 + k] - fromBvh.positions[(f * fromBvh.joints.length + b) * 3 + k]));
    }
    const oa = fromGlb.joints[a].offset, ob = fromBvh.joints[b].offset;
    oa.forEach((v, k) => assert.ok(Math.abs(v - ob[k]) < 1e-3, `${name} offset`));
  }
  assert.ok(worst < 0.05, `max position difference ${worst} cm`);
});

test('glTF JSON with external .bin and a GLB missing toe ends both retarget', async () => {
  const frames = 60, { json, bin } = bvhToGlb(bvhText, frames, { dropToeEnd: true });
  json.buffers[0].uri = 'walk.bin';
  await assert.rejects(motionFromFiles([{ name: 'walk.gltf', data: new TextEncoder().encode(JSON.stringify(json)).buffer }]), /walk\.bin/);
  const result = await motionFromFiles([{ name: 'walk.gltf', data: new TextEncoder().encode(JSON.stringify(json)).buffer }, { name: 'walk.bin', data: bin.buffer }]);
  const clip = result.clip, I = clip.index, stride = clip.joints.length * 3;
  assert.equal(listAnimations(json)[0].name, 'Walk');
  assert.ok(clip.joints[I.LeftToe_End].synthetic && clip.joints[I.RightToe_End].synthetic);
  const raw = Float32Array.from({ length: clip.frameCount }, (_, f) => facingYaw(clip.positions, f * stride, I.LeftHip, I.RightHip));
  const yaw = smoothAngles(raw, 30), progress = new Float32Array(clip.frameCount);
  const track = buildRetargetTrack(clip, clip.positions, yaw, progress);
  for (let f = 0; f < clip.frameCount; f++) for (const leg of lowerBodyPose(track, f).legs) assert.ok(leg.error < 0.01);
});

test('sampler interpolation: STEP, LINEAR slerp, CUBICSPLINE', () => {
  const input = Float32Array.from([0, 1]);
  assert.deepEqual(sampleChannel({ input, output: Float32Array.from([0, 0, 0, 10, 0, 0]), interpolation: 'STEP', size: 3 }, 0.7), [0, 0, 0]);
  assert.deepEqual(sampleChannel({ input, output: Float32Array.from([0, 0, 0, 10, 0, 0]), interpolation: 'LINEAR', size: 3 }, 0.25).map((v) => +v.toFixed(5)), [2.5, 0, 0]);
  const half = sampleChannel({ input, output: Float32Array.from([0, 0, 0, 1, 0, Math.SQRT1_2, 0, Math.SQRT1_2]), interpolation: 'LINEAR', size: 4, rotation: true }, 0.5);
  assert.ok(Math.abs(half[1] - Math.sin(Math.PI / 8)) < 1e-6, 'slerp halfway to 90° about Y');
  // [in, value, out] × 2, 접선 0 → 매끄러운 hermite 중간값 = 평균
  const cubic = sampleChannel({ input, output: Float32Array.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0]), interpolation: 'CUBICSPLINE', size: 3 }, 0.5);
  assert.ok(Math.abs(cubic[0] - 2) < 1e-9);
});

test('clear errors for unsupported or incomplete files', async () => {
  assert.throws(() => parseGLB(new ArrayBuffer(24)), /GLB/);
  await assert.rejects(motionFromFiles([{ name: 'a.gltf', data: new TextEncoder().encode(JSON.stringify({ asset: { version: '2.0' }, nodes: [] })).buffer }]), /애니메이션/);
  await assert.rejects(motionFromFiles([{ name: 'a.txt', data: new ArrayBuffer(1) }]), /BVH·GLB·glTF/);
  const tiny = { joints: [{ name: 'Root', parent: -1, offset: [0, 0, 0] }], frameCount: 1, frameTime: 1 / 60, positions: new Float32Array(3) };
  assert.throws(() => normalizeSkeleton(tiny), /필수 관절/);
});

test('joints above Hips (root/Armature bones) are dropped and Hips becomes the root', () => {
  const names = ['root', 'pelvis', 'spine_01', 'neck_01', 'thigh_l', 'calf_l', 'foot_l', 'ball_l', 'thigh_r', 'calf_r', 'foot_r', 'ball_r'];
  const parents = [-1, 0, 1, 2, 1, 4, 5, 6, 1, 8, 9, 10];
  const joints = names.map((name, k) => ({ name, parent: parents[k], offset: k === 1 ? [0, 90, 0] : k === 0 ? [0, 0, 0] : [0, -10, 5] }));
  const clip = normalizeSkeleton({ joints, frameCount: 2, frameTime: 1 / 60, positions: Float32Array.from({ length: 2 * names.length * 3 }, (_, i) => i) });
  assert.equal(clip.joints[clip.index.Hips].parent, -1);
  assert.ok(!clip.joints.some((j) => j.name === 'root'));
  assert.deepEqual(clip.joints[clip.index.Hips].offset, [0, 90, 0]);
  assert.ok(clip.joints[clip.index.LeftToe_End].synthetic);
});

test('stored Quaternius UAL root-motion GLB matches its record, imports and retargets', async () => {
  const dir = path.join(root, 'art/characters/clone_01/motion/mocap_ual_001');
  const record = JSON.parse(fs.readFileSync(path.join(dir, 'records/source.json'), 'utf8'));
  const { createHash } = await import('node:crypto');
  for (const item of record.files) assert.equal(createHash('sha256').update(fs.readFileSync(path.join(dir, 'source', item.file))).digest('hex'), item.sha256, item.file);
  const bytes = fs.readFileSync(path.join(dir, 'source/UAL1_Standard_RM.glb'));
  const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const anims = listAnimations(parseGLB(data).json);
  assert.deepEqual(anims.map((a) => a.name), record.animations.map((a) => a.name));
  const walk = anims.find((a) => a.name === 'Walk_Loop');
  const { clip } = await motionFromFiles([{ name: 'UAL1_Standard_RM.glb', data }], { animation: walk.index });
  assert.equal(clip.unit, 'm'); assert.equal(clip.joints.length, 24); assert.equal(clip.joints[clip.index.Hips].parent, -1);
  assert.equal(clip.joints[clip.index.LeftToe_End].source, 'ball_leaf_l');
  const I = clip.index, stride = clip.joints.length * 3;
  const raw = Float32Array.from({ length: clip.frameCount }, (_, f) => facingYaw(clip.positions, f * stride, I.LeftHip, I.RightHip));
  const yaw = smoothAngles(raw, 30);
  const { progress, inPlace } = estimateProgress(clip, clip.positions, yaw);
  assert.equal(inPlace, false, 'root motion variant travels by itself');
  const speed = (progress.at(-1) - progress[0]) / ((clip.frameCount - 1) * clip.frameTime);
  assert.ok(speed > 80 && speed < 115, `walk ${speed.toFixed(1)} cm/s`);
  const track = buildRetargetTrack(clip, clip.positions, yaw, progress);
  for (let f = 0; f < clip.frameCount; f++) for (const leg of lowerBodyPose(track, f).legs) { assert.ok(leg.error < 0.01); assert.ok(leg.foot.heel.y <= 0.01 && leg.foot.toe.y <= 0.01); }
});
