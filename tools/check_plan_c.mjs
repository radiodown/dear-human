// Checks preparation contracts without changing existing rig test records or assets.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { THREE, createAtlasGeometry, createPixelCamera } from '../game/plan-c/part-mesh.js';
import { CharacterRig } from '../game/animation/rig-core.js';

const root = path.resolve(import.meta.dirname, '..');
const read = p => fs.readFileSync(path.join(root, p));
const hash = p => crypto.createHash('sha256').update(read(p)).digest('hex');
const definitionPath = 'art/characters/clone_01/motion/rig_005/rig/parts.json';
const definition = JSON.parse(read(definitionPath));
const pinned = JSON.parse(read('game/plan-c/package.json')).dependencies.three;
assert.equal(pinned, '0.187.0');
assert.equal(THREE.REVISION, '187');
assert.equal(JSON.parse(read('game/plan-c/node_modules/three/package.json')).version, pinned);

for (const atlas of Object.values(definition.atlases)) {
  const png = read(atlas.path);
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16), atlas.width);
  assert.equal(png.readUInt32BE(20), atlas.height);
}
let geometries = 0;
for (const [key, part] of Object.entries(definition.parts)) {
  const height = definition.bindings[key]?.height || 100;
  const geometry = createAtlasGeometry(definition, key, { height });
  const size = geometry.boundingBox.getSize(new THREE.Vector3());
  assert.ok(Math.abs(size.x / size.y - part.rect[2] / part.rect[3]) < 1e-6, `Aspect ratio: ${key}`);
  for (const value of geometry.getAttribute('uv').array) assert.ok(value >= 0 && value <= 1, `Atlas UV: ${key}`);
  geometry.dispose(); geometries++;
}
assert.throws(() => createAtlasGeometry(definition, 'missing', { height: 100 }), /Unknown atlas part/);
assert.throws(() => createAtlasGeometry(definition, 'body_core', { height: 0 }), /Invalid atlas/);
const camera = createPixelCamera(640, 480);
let maxProjectionError = 0, sockets = 0;
const samples = [];
for (const facing of [1, -1]) for (const motion of ['idle', 'walk', 'fire', 'walk_fire', 'reload', 'reload_empty']) {
  const rig = new CharacterRig();
  if (facing === -1) rig.turn();
  rig.setWalking(motion === 'walk' || motion === 'walk_fire');
  rig.trigger = motion === 'fire' || motion === 'walk_fire';
  if (motion.startsWith('reload')) { rig.ammo = motion === 'reload_empty' ? 0 : 15; rig.startReload(); }
  for (let frame = 0; frame <= 180; frame++) {
    if (frame) rig.advance(1 / 60);
    const pose = rig.pose();
    for (const point of Object.values(pose.sockets)) {
      const expected = { x: 320 + facing * point.x, y: 440 + point.y };
      const projected = new THREE.Vector3(expected.x, expected.y, 0).project(camera);
      const error = Math.hypot((projected.x + 1) * 320 - expected.x, (1 - projected.y) * 240 - expected.y);
      assert.ok(Number.isFinite(error));
      maxProjectionError = Math.max(maxProjectionError, error); sockets++;
    }
  }
  samples.push({ facing, motion, shots: rig.shots, ammo: rig.ammo, seconds: rig.time });
}
assert.ok(maxProjectionError < 1e-8);
const sources = [definitionPath, 'game/plan-c/package.json', 'game/plan-c/package-lock.json',
  'game/plan-c/part-mesh.js', 'game/plan-c/browser-probe.js', 'tools/check_plan_c.mjs',
  ...fs.readdirSync(path.join(root, 'game/animation')).filter(n => n.endsWith('.js')).map(n => 'game/animation/' + n),
  ...Object.values(definition.atlases).map(a => a.path)];
const report = {
  status: 'passed', scope: 'Node import, existing PNG dimensions, atlas geometry and socket projection only',
  created_at: new Date().toISOString(), three: pinned, node: process.version,
  atlases: Object.keys(definition.atlases).length, geometries, projected_sockets: sockets,
  max_projection_error_px: maxProjectionError, samples,
  source_hashes: sources.map(p => ({ path: p, sha256: hash(p) })),
  full_character_renderer: 'not_implemented', art_acceptance: 'not_requested',
};
const outputIndex = process.argv.indexOf('--output');
if (outputIndex !== -1) {
  assert.ok(process.argv[outputIndex + 1], 'Missing --output path');
  const output = path.resolve(process.argv[outputIndex + 1]);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({ status: report.status, three: pinned, atlases: report.atlases, geometries, projected_sockets: sockets, max_projection_error_px: maxProjectionError }));
