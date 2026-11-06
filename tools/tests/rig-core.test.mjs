import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { CharacterRig, Spring, ik2, STEP } from '../../game/animation/rig-core.js';
const root=path.resolve(import.meta.dirname,'../..');
const metrics={};
test('IK reaches reachable targets without stretching unreachable goals',()=>{
 for(const goal of [{x:40,y:10},{x:-20,y:60},{x:0,y:0}]) { const r=ik2({x:0,y:0},goal,40,40);assert.ok(r.error<1e-4);assert.ok(Math.abs(Math.hypot(r.elbow.x,r.elbow.y)-40)<1e-7); }
 const r=ik2({x:0,y:0},{x:200,y:0},40,40);assert.ok(r.error>100);assert.equal(r.reachable,false);
});
test('30/60/120 Hz rendering produces equivalent fixed-step shots and springs',()=>{
 const run=fps=>{const r=new CharacterRig();r.trigger=true;r.setWalking(true);for(let i=0;i<fps*2;i++)r.advance(1/fps);return r.snapshot();};
 const states=[30,60,120].map(run);metrics.render_rates=states;
 for(const s of states){assert.equal(s.shots,20);assert.equal(s.ammo,10);assert.ok(s.gripError<2);assert.ok(Math.abs(s.seconds-2)<1e-8);}
 assert.deepEqual(states[0],states[1]);assert.deepEqual(states[1],states[2]);
});
test('shot impulse occurs once, springs settle after input, and continuous fire stays bounded',()=>{
 const r=new CharacterRig();assert.equal(r.fire(),true);assert.equal(r.fire(),false);assert.equal(r.shots,1);assert.equal(r.recoilEvents,1);
 for(let i=0;i<48;i++)r.step();
 metrics.settle_after_04_sec=r.snapshot().springs;
 for(const key of ['head','hair','cloth','cape','recoil'])assert.ok(Math.abs(r[key].x)<.1,`${key}: ${r[key].x}`);
 r.trigger=true;for(let i=0;i<120*20;i++){r.step();for(const key of ['head','hair','cloth','cape','recoil'])assert.ok(Math.abs(r[key].x)<=r[key].limit);}
});
test('hands remain reachable throughout moving shots, reloads, turn and diagnostic swaps',()=>{
 const r=new CharacterRig();let max=0;const check=()=>{const p=r.pose();max=Math.max(max,p.gripError);assert.ok(p.gripError<1e-4,`unreachable grip ${p.gripError}`);};
 for(let swap=0;swap<100;swap++){r.ammo=30;assert.ok(r.equip(swap%2?'m16_basic':'diagnostic'));r.turn();r.setWalking(true);r.fire();for(let i=0;i<60;i++){r.step();check();}}
 for(const weapon of ['m16_basic','diagnostic'])for(const empty of [false,true]){r.equip(weapon);r.ammo=empty?0:15;assert.equal(r.startReload(),true);while(r.reload){r.step();check();}}
 metrics.max_grip_error_logical_px=max;
});
test('reload blocks firing, refills once, respects tactical/empty durations and cannot overlap',()=>{
 for(const [ammo,duration] of [[15,2.2],[0,2.8]]){
  const r=new CharacterRig();r.ammo=ammo;assert.ok(r.startReload());assert.equal(r.startReload(),false);assert.equal(r.equip('diagnostic'),false);
  for(let i=0;i<Math.round(duration/STEP)-1;i++){assert.equal(r.fire(),false);r.step();assert.ok(r.reload);}
  r.step();assert.equal(r.reload,null);assert.equal(r.ammo,30);assert.equal(r.reloadCompletions,1);assert.equal(r.recoilEvents,0);r.step();assert.equal(r.reloadCompletions,1);
 }
});
test('large frame gap does not catch up, disabled responses stay off, unknown weapons fail',()=>{
 const r=new CharacterRig();r.advance(30);assert.ok(r.time<=.101);r.enabled.hair=false;r.fire();r.step();assert.equal(r.hair.x,0);assert.throws(()=>r.equip('missing'));
});
test('100 weapon swaps do not alter character images or shared animation files',()=>{
 const files=['art/characters/clone_01/concepts/reference_003_3d/source/appearance.png','art/characters/clone_01/motion/rig_002/source/parts_atlas.png','art/characters/clone_01/motion/rig_002/rig/parts.json','game/animation/rig-core.js','game/animation/webgl-character.js'];
 const hashes=()=>Object.fromEntries(files.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')]));
 const before=hashes(),r=new CharacterRig();for(let i=0;i<100;i++)r.equip(i%2?'m16_basic':'diagnostic');assert.deepEqual(hashes(),before);metrics.reuse_hashes=before;
 fs.mkdirSync(path.join(root,'art/characters/clone_01/motion/rig_002/tests'),{recursive:true});fs.writeFileSync(path.join(root,'art/characters/clone_01/motion/rig_002/tests/simulation-metrics.json'),JSON.stringify({scope:'Simulation tests, not visual or gameplay acceptance',...metrics},null,2)+'\n');
});
