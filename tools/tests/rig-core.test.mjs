import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { CharacterRig, Spring, ik2, STEP, WEAPONS } from '../../game/animation/rig-core.js';
import { GAIT } from '../../game/animation/gait.js';
import { HUMAN, REFERENCE, partDimensions, handOffset } from '../../game/animation/proportions.js';
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
test('a backward shot impulse never starts by pushing the rifle forward or dipping the muzzle',()=>{
 const r=new CharacterRig(),before=r.pose();r.fire();r.step();const after=r.pose();
 assert.ok(r.recoil.x<0,'Recoil must travel backward on the first tick');
 assert.ok(after.weapon.x<before.weapon.x,'Gun must move back in the assembled pose');
 assert.ok(after.weapon.a<before.weapon.a,'Muzzle must rise, not drop');
 let maximumReturn=0,minimumKick=0;
 for(let i=0;i<120;i++){r.step();maximumReturn=Math.max(maximumReturn,r.recoil.x);minimumKick=Math.min(minimumKick,r.recoil.x);}
 assert.ok(maximumReturn<1e-8,'Critical damping must not bounce past neutral');
 metrics.recoil={first_tick_offset:after.weapon.x-before.weapon.x,muzzle_angle:after.weapon.a,maximum_forward_overshoot:maximumReturn,peak_backward_offset:minimumKick};
 const spring=new Spring(16,.85,4);spring.impulse(-200);spring.step(STEP);assert.ok(spring.x<0,'Legacy high-frequency spring also must preserve impulse direction');
});
test('both knees flex forward, soles clear the ground, and leg lengths remain reachable for complete cycles',()=>{
 const r=new CharacterRig();r.setWalking(true);let maxError=0,maxPenetration=0,minKnee=Infinity,swingFrames=0,stanceFrames=0;
 for(let i=0;i<120*8;i++){
  r.step();for(const leg of r.pose().legs){
   maxError=Math.max(maxError,leg.error);maxPenetration=Math.max(maxPenetration,leg.foot.heel.y,leg.foot.toe.y);
   const knee=(leg.elbow.x-leg.root.x)*(leg.hand.y-leg.root.y)-(leg.elbow.y-leg.root.y)*(leg.hand.x-leg.root.x);
   minKnee=Math.min(minKnee,knee);assert.ok(knee>=-1e-7,'A knee bent backward');
   assert.ok(leg.error<1e-5,`Leg exceeds reach by ${leg.error}`);
   assert.ok(leg.foot.heel.y<=1e-6&&leg.foot.toe.y<=1e-6,'Boot sole penetrated floor');
   if(leg.foot.stance)stanceFrames++;else swingFrames++;
  }
 }
 assert.ok(stanceFrames>0&&swingFrames>0);metrics.gait_geometry={max_leg_error:maxError,max_sole_penetration:maxPenetration,min_forward_knee_cross:minKnee};
});
test('planted foot tracks stay fixed in world space at normal and reload movement speeds',()=>{
 let maxSlide=0;
 for(const reload of [false,true]){
  const r=new CharacterRig();r.setWalking(true);for(let i=0;i<240;i++)r.step();
  if(reload){r.ammo=15;r.startReload();}
  let previous=null;
  for(let i=0;i<240;i++){
   r.step();const current=r.pose().legs.map(l=>({phase:l.foot.phase,stance:l.foot.stance,world:l.foot.trackX+r.distance}));
   if(previous)current.forEach((foot,k)=>{if(foot.stance&&previous[k].stance&&foot.phase>previous[k].phase){const slide=Math.abs(foot.world-previous[k].world);maxSlide=Math.max(maxSlide,slide);assert.ok(slide<1e-6,`Foot slid ${slide} world pixels`);}});
   previous=current;
  }
 }
 metrics.max_planted_track_slide=maxSlide;
});
test('stopping blends to planted idle feet without a single-frame foot teleport',()=>{
 const r=new CharacterRig();r.setWalking(true);for(let i=0;i<257;i++)r.step();r.setWalking(false);
 let previous=r.pose(),largest=0;
 for(let i=0;i<240;i++){r.step();const p=r.pose();p.legs.forEach((leg,k)=>{largest=Math.max(largest,Math.hypot(leg.foot.x-previous.legs[k].foot.x,leg.foot.y-previous.legs[k].foot.y));});previous=p;}
 assert.ok(largest<5,`Foot jumped ${largest} logical pixels in 1/120 second`);assert.equal(r.walkAmount,0);
 for(const leg of previous.legs)assert.ok(leg.foot.stance&&Math.abs(leg.foot.heel.y)<1e-6&&Math.abs(leg.foot.toe.y)<1e-6);
 metrics.largest_stop_foot_step=largest;
});
test('calibrated head count and hip/knee/ankle landmarks match the approved portrait',()=>{
 const r=new CharacterRig(),p=r.pose(),headCount=HUMAN.nominalHeight/HUMAN.headCrownToChin;
 const expectedHeads=(REFERENCE.sole-REFERENCE.crown)/(REFERENCE.chin-REFERENCE.crown);
 assert.ok(Math.abs(headCount-expectedHeads)<.12);
 const y=value=>(value-REFERENCE.sole)/(REFERENCE.sole-REFERENCE.crown)*HUMAN.nominalHeight;
 assert.ok(Math.abs(p.pelvis.y-y(REFERENCE.hip))<2);
 for(const leg of p.legs){assert.ok(Math.abs(leg.elbow.y-y(REFERENCE.knee))<4);assert.ok(Math.abs(leg.foot.y-y(REFERENCE.ankle))<2);}
 const crown=p.torso.y-6-HUMAN.headHeight;
 assert.ok(Math.abs(crown+HUMAN.nominalHeight)<1);
 metrics.proportions={head_count:headCount,reference_head_count:expectedHeads,hip:p.pelvis.y,knees:p.legs.map(x=>x.elbow.y),ankles:p.legs.map(x=>x.foot.y)};
});
test('all character parts retain source aspect ratios, and the hand/boot model agrees with their images',()=>{
 const d=JSON.parse(fs.readFileSync(path.join(root,'art/characters/clone_01/motion/rig_002/rig/parts.json'),'utf8'));
 for(const [key,h]of Object.entries(HUMAN.heights)){const rect=d.parts[key].rect,size=partDimensions(rect,h);assert.ok(Math.abs(size.width/size.height-rect[2]/rect[3])<1e-10);}
 const hand=partDimensions(d.parts.hand.rect,HUMAN.handHeight),boot=partDimensions(d.parts.boot.rect,GAIT.bootHeight);
 assert.ok(Math.abs(hand.width-HUMAN.handHeight*HUMAN.handAspect)<1e-8);assert.ok(Math.abs(boot.width-GAIT.bootWidth)<1e-8);
 const rifle=d.parts.rifle.rect;assert.ok(Math.abs(WEAPONS.m16_basic.width/WEAPONS.m16_basic.height-rifle[2]/rifle[3])<1e-8);
 metrics.aspect_ratio_preserved=true;
});
test('wrist-to-palm offset preserves both weapon grips during recoil and reload',()=>{
 const r=new CharacterRig();r.setWalking(true);r.trigger=true;let reloadObserved=false;
 for(let i=0;i<720;i++){r.step();reloadObserved||=!!r.reload;const p=r.pose();assert.ok(Math.hypot(p.palmA.x-p.sockets.primary.x,p.palmA.y-p.sockets.primary.y)<1e-5);assert.ok(Math.hypot(p.palmB.x-p.supportTarget.x,p.palmB.y-p.supportTarget.y)<1e-5);}
 assert.ok(reloadObserved);assert.equal(r.reloadCompletions,1);
 assert.ok(handOffset().x>5,'Palm anchor should be distinct from the wrist');
});
test('100 weapon swaps do not alter character images or shared animation files',()=>{
 const files=['art/characters/clone_01/concepts/reference_003_3d/source/appearance.png','art/characters/clone_01/motion/rig_002/source/parts_atlas.png','art/characters/clone_01/motion/rig_002/rig/parts.json','game/animation/gait.js','game/animation/proportions.js','game/animation/rig-core.js','game/animation/webgl-character.js'];
 const hashes=()=>Object.fromEntries(files.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')]));
 const before=hashes(),r=new CharacterRig();for(let i=0;i<100;i++)r.equip(i%2?'m16_basic':'diagnostic');assert.deepEqual(hashes(),before);metrics.reuse_hashes=before;
 fs.mkdirSync(path.join(root,'art/characters/clone_01/motion/rig_002/tests'),{recursive:true});fs.writeFileSync(path.join(root,'art/characters/clone_01/motion/rig_002/tests/simulation-metrics.json'),JSON.stringify({scope:'Simulation tests, not visual or gameplay acceptance',...metrics},null,2)+'\n');
});
