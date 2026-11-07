// Narrow gait checks: reach, contact, transition continuity and static targets.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const {CharacterRig}=await import(pathToFileURL(resolve('game/animation/rig-core.js')).href);
const {GAIT,RUN,runPelvisOffset}=await import(pathToFileURL(resolve('game/animation/gait.js')).href);
const root='art/characters/clone_01/motion/rig_005/records/runtime_snapshot_before_leg_gait_001',cache=new Map();
function oldModule(name){
  if(cache.has(name))return cache.get(name);
  const path=`${root}/game/animation/${name}`;
  if(!existsSync(path))return pathToFileURL(resolve('game/animation',name)).href;
  const source=readFileSync(path,'utf8').replaceAll(/from '\.\/([^']+)'/g,(_,file)=>`from '${oldModule(file)}'`);
  const url='data:text/javascript;base64,'+Buffer.from(source).toString('base64');cache.set(name,url);return url;
}
const {CharacterRig:PreviousRig}=await import(oldModule('rig-core.js'));
function configure(Type,mode,energy=100){
  const r=new Type();r.setMotionControls(mode,{energy},true);r.setWalking(['walk','run','walk_fire','run_fire'].includes(mode));
  r.setRunning(mode.startsWith('run'));r.setRelaxed(mode==='relaxed');r.setKneeling(mode.startsWith('kneel'));r.trigger=mode.endsWith('fire');
  for(let i=0;i<144;i++)r.step();return r;
}
function sample(r,frames=160){
  const result={maxLegError:0,maxBoneLengthError:0,maxGripError:0,minFloor:0,maxStanceDrift:0,minHip:Infinity,maxHip:-Infinity,maxLift:0,
    thighMin:[Infinity,Infinity],thighMax:[-Infinity,-Infinity],kneeMin:[Infinity,Infinity],kneeMax:[-Infinity,-Infinity]};
  let previous=null;
  for(let i=0;i<frames;i++){
    r.step();const p=r.pose();assert([p.headAngle,p.pelvis.x,p.pelvis.y,p.weapon.x,p.weapon.y].every(Number.isFinite));
    result.maxGripError=Math.max(result.maxGripError,p.gripError);result.minHip=Math.min(result.minHip,p.pelvis.y);result.maxHip=Math.max(result.maxHip,p.pelvis.y);
    p.legs.forEach((leg,j)=>{
      const upper=Math.atan2(leg.elbow.y-leg.root.y,leg.elbow.x-leg.root.x),lower=Math.atan2(leg.hand.y-leg.elbow.y,leg.hand.x-leg.elbow.x);
      const flex=(Math.PI/2-upper+p.pelvis.a)*180/Math.PI,bend=Math.abs(Math.atan2(Math.sin(lower-upper),Math.cos(lower-upper)))*180/Math.PI;
      result.thighMin[j]=Math.min(result.thighMin[j],flex);result.thighMax[j]=Math.max(result.thighMax[j],flex);
      result.kneeMin[j]=Math.min(result.kneeMin[j],bend);result.kneeMax[j]=Math.max(result.kneeMax[j],bend);
      result.maxLegError=Math.max(result.maxLegError,leg.error);result.maxBoneLengthError=Math.max(result.maxBoneLengthError,
        Math.abs(Math.hypot(leg.elbow.x-leg.root.x,leg.elbow.y-leg.root.y)-76),Math.abs(Math.hypot(leg.hand.x-leg.elbow.x,leg.hand.y-leg.elbow.y)-76));
      result.maxLift=Math.max(result.maxLift,leg.foot.clearance);result.minFloor=Math.min(result.minFloor,-leg.foot.heel.y,-leg.foot.toe.y);
      if(previous&&previous.legs[j].foot.stance&&leg.foot.stance&&leg.foot.phase>=previous.legs[j].foot.phase)
        result.maxStanceDrift=Math.max(result.maxStanceDrift,Math.abs(leg.foot.trackX+r.distance-previous.legs[j].foot.trackX-previous.distance));
    });
    previous={legs:p.legs,distance:r.distance};
  }
  return result;
}
const report={scope:'Short gait reach/contact and before/after form metrics; no full suite or art acceptance.',current:{},previous:{},staticMaxDifference:0};
for(const mode of ['walk','run','walk_fire','run_fire'])for(const energy of [0,100,150]){
  const result=sample(configure(CharacterRig,mode,energy));report.current[`${mode}:${energy}`]=result;
  assert(result.maxLegError<1e-4&&result.maxBoneLengthError<1e-4&&result.maxGripError<1e-4&&result.minFloor>-1e-6&&result.maxStanceDrift<1e-4,JSON.stringify({mode,energy,...result}));
}
for(const mode of ['walk','run'])report.previous[mode]=sample(configure(PreviousRig,mode));
assert(report.current['walk:100'].kneeMin.every((v,j)=>v<report.previous.walk.kneeMin[j]));
assert(report.current['run:100'].thighMin.every(v=>v<0));
assert(report.current['run:100'].maxLift<report.previous.run.maxLift);
const transition=new CharacterRig();transition.setWalking(true);sample(transition,144);transition.setRunning(true);sample(transition,144);transition.setWalking(false);
const stopped=sample(transition,100);assert(stopped.maxLegError<1e-4&&stopped.maxBoneLengthError<1e-4);report.walkRunStop='passed';
const positions=p=>[p.pelvis.x,p.pelvis.y,p.pelvis.a,p.waist.a,p.weapon.x,p.weapon.y,p.weapon.a,p.headAngle,...p.legs.flatMap(l=>[l.root.x,l.root.y,l.elbow.x,l.elbow.y,l.hand.x,l.hand.y])];
for(const mode of ['idle','relaxed','kneel_fire']){
  const r=configure(CharacterRig,mode),old=configure(PreviousRig,mode),a=positions(r.pose()),b=positions(old.pose());
  report.staticMaxDifference=Math.max(report.staticMaxDifference,...a.map((v,i)=>Math.abs(v-b[i])));
  const saved=JSON.stringify(r);r.pose();r.pose();assert.equal(JSON.stringify(r),saved);
}
assert(report.staticMaxDifference<1e-9);
report.pelvisVelocityJoins=[];
for(const at of [2*RUN.stance*Math.PI,Math.PI]){
  const e=1e-6,center=runPelvisOffset(at),left=(center-runPelvisOffset(at-e))/e,right=(runPelvisOffset(at+e)-center)/e;
  const difference=Math.abs(left-right);assert(difference<.001);report.pelvisVelocityJoins.push(difference);
}
report.parameters={walk:GAIT,run:RUN};report.status='passed';
report.runtime_sources=['proportions.js','gait.js','rig-core.js','webgl-character.js','secondary-motion.js'].map(name=>{
  const path=`game/animation/${name}`;return {path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')};
});
const output='art/characters/clone_01/motion/rig_005/tests/leg_gait_001';mkdirSync(output,{recursive:true});writeFileSync(output+'/gait-smoke.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,states:Object.keys(report.current).length,staticMaxDifference:report.staticMaxDifference,
  walkKnees:report.current['walk:100'].kneeMin,runThighExtension:report.current['run:100'].thighMin,joins:report.pelvisVelocityJoins}));
