import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { CharacterRig, Spring, ik2, transform, STEP, WEAPONS } from '../../game/animation/rig-core.js';
import { WebGLCharacter } from '../../game/animation/webgl-character.js';
import { GAIT } from '../../game/animation/gait.js';
import { CapeMotion } from '../../game/animation/cape.js';
import { outfitOffset, sleeveOffset } from '../../game/animation/secondary-motion.js';
import { HUMAN, REFERENCE, partDimensions, handOffset } from '../../game/animation/proportions.js';
const root=path.resolve(import.meta.dirname,'../..');
const metrics={};
const definition=JSON.parse(fs.readFileSync(path.join(root,'art/characters/clone_01/motion/rig_005/rig/parts.json'),'utf8'));
test('IK reaches reachable targets without stretching unreachable goals',()=>{
 for(const goal of [{x:40,y:10},{x:-20,y:60},{x:0,y:0}]) { const r=ik2({x:0,y:0},goal,40,40);assert.ok(r.error<1e-4);assert.ok(Math.abs(Math.hypot(r.elbow.x,r.elbow.y)-40)<1e-7); }
 const r=ik2({x:0,y:0},{x:200,y:0},40,40);assert.ok(r.error>100);assert.equal(r.reachable,false);
});
test('30/60/120 Hz rendering produces equivalent fixed-step shots and springs',()=>{
 const run=fps=>{const r=new CharacterRig();r.trigger=true;r.setWalking(true);for(let i=0;i<fps*2;i++)r.advance(1/fps);return r.snapshot();};
 const states=[30,60,120].map(run);metrics.render_rates=states;
 for(const s of states){assert.equal(s.shots,19);assert.equal(s.ammo,11);assert.ok(s.gripError<2);assert.ok(Math.abs(s.seconds-2)<1e-8);}
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
 const r=new CharacterRig();r.requestFire();for(let i=0;i<14;i++)r.step();const before=r.pose();r.step();const after=r.pose();
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
test('calibrated head count and hip/knee/ankle landmarks match the side combat master',()=>{
 const r=new CharacterRig(),p=r.pose(),headCount=HUMAN.nominalHeight/HUMAN.headCrownToChin;
 const expectedHeads=(REFERENCE.sole-REFERENCE.crown)/(REFERENCE.chin-REFERENCE.crown);
 assert.ok(Math.abs(headCount-expectedHeads)<.12);
 const y=value=>(value-REFERENCE.sole)/(REFERENCE.sole-REFERENCE.crown)*HUMAN.nominalHeight;
 assert.ok(Math.abs(p.pelvis.y-y(REFERENCE.hip))<2);
 for(const leg of p.legs){assert.ok(Math.abs(leg.elbow.y-y(REFERENCE.knee))<4);assert.ok(Math.abs(leg.foot.y-y(REFERENCE.ankle))<2);}
 const crown=p.torso.y+definition.bindings.head.y-HUMAN.headHeight;
 assert.ok(Math.abs(crown+HUMAN.nominalHeight)<4);
 metrics.proportions={head_count:headCount,reference_head_count:expectedHeads,hip:p.pelvis.y,knees:p.legs.map(x=>x.elbow.y),ankles:p.legs.map(x=>x.foot.y)};
});
test('all character parts retain source aspect ratios, and the hand/boot model agrees with their images',()=>{
 const d=definition;
 for(const [key,h]of Object.entries(HUMAN.heights)){const rect=d.parts[key].rect,size=partDimensions(rect,h);assert.ok(Math.abs(size.width/size.height-rect[2]/rect[3])<1e-10);}
 for(const [key,h,aspect]of [['primary_hand',HUMAN.handHeight,HUMAN.handAspect],['support_hand',HUMAN.supportHandHeight,HUMAN.supportHandAspect]]){
  const hand=partDimensions(d.parts[key].rect,h);assert.ok(Math.abs(hand.width-h*aspect)<1e-8);
 }
 for(const key of ['near_boot','far_boot']){
  const binding=d.bindings[key],boot=partDimensions(d.parts[key].rect,binding.height);
  assert.ok(Math.abs(boot.width-GAIT.bootWidth)<1e-8);
  assert.ok(Math.abs(boot.height*(1-binding.pivot[1])-GAIT.bootHeight*(1-GAIT.ankleV))<1e-8);
 }
 const rifle=d.parts.rifle.rect;assert.ok(Math.abs(WEAPONS.m16_basic.width/WEAPONS.m16_basic.height-rifle[2]/rifle[3])<1e-8);
 metrics.aspect_ratio_preserved=true;
});
test('wrist-to-palm offset preserves both weapon grips during recoil and reload',()=>{
 const r=new CharacterRig();r.setWalking(true);r.trigger=true;let reloadObserved=false;
 for(let i=0;i<720;i++){r.step();reloadObserved||=!!r.reload;const p=r.pose();assert.ok(Math.hypot(p.palmA.x-p.sockets.primary.x,p.palmA.y-p.sockets.primary.y)<1e-5);assert.ok(Math.hypot(p.palmB.x-p.supportTarget.x,p.palmB.y-p.supportTarget.y)<1e-5);}
 assert.ok(reloadObserved);assert.equal(r.reloadCompletions,1);
 assert.ok(handOffset().x>5,'Palm anchor should be distinct from the wrist');
});
// A grip-only solver can pass while the rifle floats in front of the shoulder.
test('buttstock remains seated during walking and recoil; reload releases it deliberately',()=>{
 const r=new CharacterRig();r.setWalking(true);r.trigger=true;let max=0,released=false;
 for(let i=0;i<120*8;i++){
  r.step();const p=r.pose(),contact=Math.hypot(p.sockets.stock.x-p.stockTarget.x,p.sockets.stock.y-p.stockTarget.y);
  assert.ok(contact<1e-8);max=Math.max(max,contact);
  const gap=Math.hypot(p.sockets.stock.x-p.stockPocket.x,p.sockets.stock.y-p.stockPocket.y);
  if(r.reload)released ||=gap>3;else assert.ok(gap<1e-8,'Seated stock drifted from shoulder');
 }
 assert.ok(released,'Reload should lower the stock intentionally');metrics.max_stock_contact_error=max;
});

test('combat movement lowers the pelvis, leans the torso and keeps a seated level rifle',()=>{
 const r=new CharacterRig(),idle=r.pose();r.setWalking(true);r.trigger=true;
 const range={hip_drop:[Infinity,-Infinity],lean_degrees:[Infinity,-Infinity],muzzle_degrees:[Infinity,-Infinity]};
 for(let i=0;i<240;i++){
  r.step();if(i<120)continue;const p=r.pose(),drop=p.pelvis.y-idle.pelvis.y,lean=p.torso.a*180/Math.PI,muzzle=p.weapon.a*180/Math.PI;
  assert.ok(drop>5,'Combat gait must carry weight lower than upright idle');
  assert.ok(lean>12&&lean<17,'Torso should lean into aim rather than leaving the neck to do the work');
  assert.ok(Math.abs(muzzle)<2,'Leaning torso must not aim the gun down');
  assert.ok(p.legs.some(x=>x.foot.stance),'Walking must keep a support foot on the ground');
  for(const [key,value]of [['hip_drop',drop],['lean_degrees',lean],['muzzle_degrees',muzzle]]){range[key][0]=Math.min(range[key][0],value);range[key][1]=Math.max(range[key][1],value);}
 }
 metrics.combat_gait={...range,steps_per_minute:120/GAIT.period,step_distance:GAIT.speed*GAIT.period/2,toe_lift:GAIT.lift};
});

test('standing shots keep the front foot planted and set the rear foot once per burst, then recover',()=>{
 const r=new CharacterRig(),idle=r.pose(),feet=idle.legs.map(l=>l.foot);
 const range={hip_drop:[Infinity,-Infinity],lean_degrees:[Infinity,-Infinity]};let largestHipStep=0,previous=idle;
 const check=()=>{
  const p=r.pose();largestHipStep=Math.max(largestHipStep,Math.abs(p.pelvis.y-previous.pelvis.y));previous=p;
  assert.deepEqual(p.legs[0].foot,feet[0]);
  p.legs.forEach(leg=>{assert.ok(leg.error<1e-5);assert.ok(leg.foot.heel.y<=1e-6&&leg.foot.toe.y<=1e-6);});
  assert.ok(p.gripError<1e-5);assert.ok(Math.hypot(p.sockets.stock.x-p.stockPocket.x,p.sockets.stock.y-p.stockPocket.y)<1e-8);
  assert.ok(Math.abs(p.weapon.a*180/Math.PI)<2,'Standing brace must keep the rifle level');
  return p;
 };
 r.trigger=true;
 for(let i=0;i<180;i++){
  r.step();const p=check();if(i<90)continue;
  for(const [key,value]of [['hip_drop',p.pelvis.y-idle.pelvis.y],['lean_degrees',p.torso.a*180/Math.PI]]){range[key][0]=Math.min(range[key][0],value);range[key][1]=Math.max(range[key][1],value);}
  assert.ok(p.pelvis.y-idle.pelvis.y>6&&p.pelvis.y-idle.pelvis.y<8);
  assert.ok(p.torso.a*180/Math.PI>13&&p.torso.a*180/Math.PI<16);
  assert.equal(p.rearBrace.mode,'planted');assert.ok(p.legs[1].foot.x<feet[1].x-3);assert.ok(p.legs[1].foot.stance);
 }
 r.trigger=false;const held=r.aimAmount;for(let i=0;i<12;i++){r.step();check();}assert.ok(r.aimAmount>=held,'Do not stand up between shots or immediately on trigger release');
 for(let i=0;i<360;i++){r.step();check();}
 assert.ok(r.aimAmount<.001);assert.ok(Math.abs(r.pose().pelvis.y-idle.pelvis.y)<.13);assert.ok(Math.abs(r.pose().torso.a)<.001);
 assert.equal(r.pose().rearBrace.mode,'idle');assert.deepEqual(r.pose().legs[1].foot,feet[1]);
 const single=new CharacterRig();single.fire();for(let i=0;i<24;i++)single.step();
 assert.ok(single.pose().pelvis.y-HUMAN.hipY>4,'Single-shot input must also brace');
 single.ammo=15;single.startReload();single.trigger=true;for(let i=0;i<120;i++)single.step();
 assert.ok(single.aimAmount<.05,'Holding fire during reload must allow the brace to relax');
 assert.ok(largestHipStep<1.6,'Quick pre-fire brace must still blend without a one-frame crouch');
 metrics.standing_fire={...range,largest_hip_step_at_120hz:largestHipStep,front_foot_planted:true,rear_foot_support_step:4,seated_stock:true,single_shot_braces:true,recovers_after_release:true};
});

test('cape pins the shoulder, preserves strip lengths, flutters in movement and settles after stop',()=>{
 const cape=new CapeMotion();let min=Infinity,max=-Infinity;
 for(let i=0;i<120*5;i++){
  cape.step(STEP,{speed:128,phase:i*STEP/GAIT.period*Math.PI*2});const points=cape.points();
  assert.deepEqual(points[0],{x:0,y:0});assert.equal(points[2].x,0);
  for(let j=1;j<points.length;j++)assert.ok(Math.abs(Math.hypot(points[j].x-points[j-1].x,points[j].y-points[j-1].y)-23.5)<1e-8);
  if(i>240){min=Math.min(min,points.at(-1).x);max=Math.max(max,points.at(-1).x);}
 }
 assert.ok(max<-20,'Hem should trail behind during movement');assert.ok(max-min>3,'Hem must move after the initial impulse settles');
 const paused=cape.points();assert.deepEqual(cape.points(),paused);
 for(let i=0;i<120*3;i++)cape.step(STEP,{speed:0,phase:0});
 assert.ok(Math.abs(cape.points().at(-1).x)<.1,'Hem should settle after stopping');
 cape.step(STEP,{speed:128,phase:1,enabled:false});assert.equal(cape.points().at(-1).x,0);
 const runs=[30,60,120].map(fps=>{const r=new CharacterRig();r.setWalking(true);for(let i=0;i<fps*2;i++)r.advance(1/fps);return r.pose().capePoints;});
 assert.deepEqual(runs[0],runs[1]);assert.deepEqual(runs[1],runs[2]);
 metrics.cape={hem_x_range:[min,max],pinned_shoulder:true,preserved_strip_lengths:true,fixed_step_equivalent:true};
});

test('hair keeps its root and lengths, moves during steady walking, and settles with the outfit',()=>{
 const r=new CharacterRig();r.setWalking(true);let min=Infinity,max=-Infinity,minHem=Infinity,maxHem=-Infinity;
 for(let i=0;i<600;i++){
  r.step();const p=r.pose(),hair=p.hairPoints;
  assert.deepEqual(hair[0],{x:0,y:0});for(let j=1;j<=5;j++)assert.equal(hair[j].x,0,'Hair above the shoulder must stay pinned');
  for(const point of hair)assert.ok(point.x<=0&&point.x>=-5,'Hair must stay behind the shoulder envelope');
  for(let j=1;j<hair.length;j++)assert.ok(Math.abs(Math.hypot(hair[j].x-hair[j-1].x,hair[j].y-hair[j-1].y)-11)<1e-8);
  if(i>240){min=Math.min(min,hair.at(-1).x);max=Math.max(max,hair.at(-1).x);minHem=Math.min(minHem,p.outfit.hem);maxHem=Math.max(maxHem,p.outfit.hem);}
 }
 assert.ok(max-min>.3&&max-min<2,'Only the lower hair ends should sway gently');assert.ok(maxHem-minHem>.04,'Garment needs a small walking response');
 r.setWalking(false);for(let i=0;i<360;i++)r.step();
 assert.ok(Math.abs(r.pose().hairPoints.at(-1).x)<.1);assert.ok(Math.abs(r.pose().outfit.hem)<.001);
 r.enabled.hair=r.enabled.cloth=false;r.setWalking(true);for(let i=0;i<240;i++)r.step();
 assert.equal(r.pose().hairPoints.at(-1).x,0);assert.equal(r.pose().outfit.waist,0);assert.equal(r.pose().outfit.hem,0);
 const runs=[30,60,120].map(fps=>{const rig=new CharacterRig();rig.setWalking(true);for(let i=0;i<fps*2;i++)rig.advance(1/fps);const p=rig.pose();return {hair:p.hairPoints,outfit:p.outfit};});
 assert.deepEqual(runs[0],runs[1]);assert.deepEqual(runs[1],runs[2]);
 metrics.secondary={hair_tip_x_range:[min,max],hem_radians:[minHem,maxHem],fixed_root_and_lengths:true,settles:true,fixed_step_equivalent:true};
});
test('soft garment and elbow controls protect the cuirass, shoulder plate and forearm bracer',()=>{
 for(const u of [0,.5,1])for(const v of [0,.2,.4,.45])assert.deepEqual(outfitOffset({waist:.1,hem:.2},48,100,u,v),{x:0,y:0});
 for(const u of [0,.5,1]){
  const top=sleeveOffset(20,50,[.16,.92],-1.2,true,u,.4);
  const bracer=sleeveOffset(16,46,[.08,.94],1.2,false,u,.5);
  assert.ok(Math.hypot(top.x,top.y)<1e-10);assert.ok(Math.hypot(bracer.x,bracer.y)<1e-10);
 }
 metrics.protected_armor_regions=true;
});
test('firing brings the head down to the rifle and releases it smoothly',()=>{
 const r=new CharacterRig();r.trigger=true;
 for(let i=0;i<96;i++)r.step();
 const braced=r.pose();
 assert.ok(braced.headAim.y>4&&braced.headAim.x>1.8&&braced.headAim.a>.005&&braced.headAim.a<.03,'A small neck adjustment should follow the leaning torso');
 assert.ok(Math.abs(braced.eyeSightError)<2,'Eye should settle near the rear/front sight line');
 assert.ok(Math.abs(braced.weapon.a)<.035,'Head/body bracing must preserve the aim direction');
 assert.ok(braced.gripError<1e-5);
 r.trigger=false;
 let previous=braced.headAim.y,maxStep=0;
 for(let i=0;i<360;i++){r.step();const y=r.pose().headAim.y;maxStep=Math.max(maxStep,Math.abs(y-previous));previous=y;}
 assert.ok(previous<.002);assert.ok(maxStep<.2,'Head must not snap upright after firing');
 metrics.head_aim={offset:braced.headAim,max_head_return_step:maxStep};
});
test('reload has continuous wrist motion and carries a visible magazine at the palm contact',()=>{
 let maxWristStep=0,maxMagazineContact=0;
 for(const empty of [false,true])for(const walking of [false,true]){
  const r=new CharacterRig();r.setWalking(walking);r.ammo=empty?0:15;r.startReload();let previous=r.pose();const phases=new Set();
  while(r.reload){
   r.step();const p=r.pose();maxWristStep=Math.max(maxWristStep,Math.hypot(p.armB.hand.x-previous.armB.hand.x,p.armB.hand.y-previous.armB.hand.y));
   if(p.reloadContact){
    phases.add(p.reloadContact.phase);
    if(p.reloadContact.carrying){
     assert.ok(p.magazineVisible);const contact=transformMagazineContact(p);
     const error=Math.hypot(p.palmB.x-contact.x,p.palmB.y-contact.y);maxMagazineContact=Math.max(maxMagazineContact,error);assert.ok(error<1e-5);
    }
    if(['release','extract','insert','bolt'].includes(p.reloadContact.phase))assert.equal(p.reloadContact.handArtwork,'missing','Do not claim missing hand art exists');
   }
   previous=p;
  }
  for(const phase of ['release','extract','fetch','insert','return'])assert.ok(phases.has(phase));assert.equal(phases.has('bolt'),empty);
  assert.ok(Math.hypot(previous.palmB.x-previous.sockets.support.x,previous.palmB.y-previous.sockets.support.y)<1e-5);
 }
 assert.ok(maxWristStep<3,`Reload wrist teleported ${maxWristStep} pixels`);
 metrics.reload_contacts={max_wrist_step_at_120hz:maxWristStep,max_magazine_palm_error:maxMagazineContact,new_hand_art:'missing'};
});
function transformMagazineContact(p){return {x:p.magazine.x-Math.sin(p.magazine.a)*15,y:p.magazine.y+Math.cos(p.magazine.a)*15};}

test('input braces the torso before the first shot; reload cancels a queued shot',()=>{
 const r=new CharacterRig();assert.ok(r.requestFire());assert.equal(r.requestFire(),false);
 for(let i=0;i<14;i++){r.step();assert.equal(r.shots,0);assert.equal(r.ammo,30);assert.equal(r.flash,0);}
 const ready=r.pose();assert.ok(ready.torso.a>.20,'The body must already be leaning before discharge');
 assert.ok(ready.headAim.a<.03,'Preparation should not be a deep isolated neck nod');
 r.step();assert.equal(r.shots,1);assert.equal(r.ammo,29);assert.ok(r.flash>0);
 const c=new CharacterRig();c.ammo=15;c.requestFire();assert.ok(c.startReload());for(let i=0;i<30;i++)c.step();assert.equal(c.shots,0);assert.equal(c.pendingShot,false);
 metrics.pre_fire={first_shot_seconds:r.time,body_degrees_before_shot:ready.torso.a*180/Math.PI,neck_radians_before_shot:ready.headAim.a,queued_shot_cancelled_by_reload:true};
});

test('lower outfit hip anchors and both thigh roots share the pelvis through walk, recoil and reload',()=>{
 const r=new CharacterRig();r.setWalking(true);r.trigger=true;let max=0;
 const binding=definition.bindings.body_core,dimensions=partDimensions(definition.parts.body_core.rect,binding.height);
 for(let i=0;i<120*5;i++){
  r.step();const p=r.pose(),anchor=transform({x:binding.x,y:binding.y},p.torso);
  for(const [k,q]of [{x:8,y:2},{x:-4,y:0}].entries()){
   const u=binding.pivot[0]+q.x/dimensions.width,v=binding.pivot[1]+q.y/dimensions.height;
   const d=outfitOffset(p.outfit,dimensions.width,dimensions.height,u,v);
   const point=transform({x:q.x+d.x,y:q.y+d.y},{...anchor,a:p.torso.a});
   const error=Math.hypot(point.x-p.legs[k].root.x,point.y-p.legs[k].root.y);max=Math.max(max,error);assert.ok(error<1e-7,'Clothing hip and thigh joint separated');
  }
 }
 metrics.shared_hip_anchor_error=max;
});
test('reload support forearm and hand render behind the torso; the firing forearm crosses in front',()=>{
 const r=new CharacterRig();const renderOrder=()=>{
  const calls=[],fake={definition,armSegment:(prefix,arm,upper)=>calls.push(prefix+(upper?'_upper':'_fore')),limb:()=>{},sprite:key=>calls.push(key),mesh:key=>calls.push(key)};
  WebGLCharacter.prototype.renderSideLayers.call(fake,r,r.pose(),{debug:false,mesh:false,explode:false,showCape:false});return calls;
 };
 let calls=renderOrder();assert.ok(calls.indexOf('far_fore')>calls.indexOf('body_core'));
 r.ammo=15;r.startReload();
 for(const t of [.2,.6,.9,1.2,1.8]){r.reload.t=t;calls=renderOrder();assert.ok(calls.indexOf('far_fore')<calls.indexOf('body_core'));assert.ok(calls.indexOf('support_hand')<calls.indexOf('body_core'));}
 metrics.reload_arm_behind_torso=true;
});

test('100 weapon swaps do not alter character images or shared animation files',()=>{
 const files=['art/characters/clone_01/concepts/reference_003_3d/source/appearance.png','art/characters/clone_01/motion/rig_004/source/base_atlas.png','art/characters/clone_01/motion/rig_004/source/limbs_atlas.png','art/characters/clone_01/motion/rig_004/source/body_core.png','art/characters/clone_01/motion/rig_005/rig/parts.json','game/animation/gait.js','game/animation/proportions.js','game/animation/rig-core.js','game/animation/webgl-character.js','game/animation/cape.js'];
 const hashes=()=>Object.fromEntries(files.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')]));
 const before=hashes(),r=new CharacterRig();for(let i=0;i<100;i++)r.equip(i%2?'m16_basic':'diagnostic');assert.deepEqual(hashes(),before);metrics.reuse_hashes=before;
 fs.mkdirSync(path.join(root,'art/characters/clone_01/motion/rig_005/tests/body_mechanics_009'),{recursive:true});fs.writeFileSync(path.join(root,'art/characters/clone_01/motion/rig_005/tests/body_mechanics_009/simulation-metrics.json'),JSON.stringify({scope:'Simulation tests for body-mechanics correction 009; not visual or gameplay acceptance',...metrics},null,2)+'\n');
});

