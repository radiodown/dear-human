// Focused motion constraints. Run from the project root; no full test suite.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const {CharacterRig}=await import(pathToFileURL(resolve('game/animation/rig-core.js')).href);

const snapshot='art/characters/clone_01/motion/rig_005/records/runtime_snapshot_before_dynamic_motion_001';
const cache=new Map();
function previousModule(name){
  if(cache.has(name))return cache.get(name);
  const saved=`${snapshot}/game/animation/${name}`;
  if(!existsSync(saved))return pathToFileURL(resolve('game/animation',name)).href;
  const source=readFileSync(saved,'utf8').replaceAll(/from '\.\/([^']+)'/g,(_,file)=>`from '${previousModule(file)}'`);
  const url='data:text/javascript;base64,'+Buffer.from(source).toString('base64');cache.set(name,url);return url;
}
const {CharacterRig:PreviousRig}=await import(previousModule('rig-core.js'));
const modes={idle:{},walk:{walk:true},run:{walk:true,run:true},fire:{fire:true},walk_fire:{walk:true,fire:true},run_fire:{walk:true,run:true,fire:true},kneel:{kneel:true},kneel_fire:{kneel:true,fire:true}};
const report={scope:'Short motion constraints and snapshot comparison; no full suite or art acceptance.',energies:[0,1,1.5],modes:{},baselineMaxDifference:0};
const coordinates=p=>[p.pelvis.x,p.pelvis.y,p.pelvis.a,p.torso.x,p.torso.y,p.torso.a,p.weapon.x,p.weapon.y,p.weapon.a,p.outfit.waist,p.outfit.hem,p.headAngle,...p.capePoints.flatMap(q=>[q.x,q.y]),...p.hairPoints.flatMap(q=>[q.x,q.y]),...p.legs.flatMap(l=>[l.foot.x,l.foot.y,l.foot.a,l.elbow.x,l.elbow.y])];
for(const energy of report.energies)for(const [mode,flags]of Object.entries(modes)){
  const rig=new CharacterRig();rig.setMotionEnergy(energy);rig.setWalking(!!flags.walk);rig.setRunning(!!flags.run);rig.setKneeling(!!flags.kneel);rig.trigger=!!flags.fire;
  const metrics={maxLegError:0,maxGripError:0,maxStockError:0,minFloor:0,hipMin:Infinity,hipMax:-Infinity,maxClearance:0};
  for(let frame=0;frame<360;frame++){
    rig.step();const p=rig.pose();assert(coordinates(p).every(Number.isFinite));
    metrics.maxLegError=Math.max(metrics.maxLegError,...p.legs.map(l=>l.error));metrics.maxGripError=Math.max(metrics.maxGripError,p.gripError);
    metrics.maxStockError=Math.max(metrics.maxStockError,Math.hypot(p.sockets.stock.x-p.stockTarget.x,p.sockets.stock.y-p.stockTarget.y));
    metrics.minFloor=Math.min(metrics.minFloor,...p.legs.flatMap(l=>[-l.foot.heel.y,-l.foot.toe.y]));
    if(frame>120){metrics.hipMin=Math.min(metrics.hipMin,p.pelvis.y);metrics.hipMax=Math.max(metrics.hipMax,p.pelvis.y);metrics.maxClearance=Math.max(metrics.maxClearance,...p.legs.map(l=>l.foot.clearance));}
  }
  report.modes[`${mode}:${energy}`]=metrics;
}
// Starts, stops, running fire and entry into kneeling at zero strength must
// reproduce the saved sources, including hair/cape/cloth state history.
const baseline=new PreviousRig(),zero=new CharacterRig();zero.setMotionEnergy(0);
for(let frame=0;frame<720;frame++){
  if(frame===0||frame===270)for(const rig of [baseline,zero]){rig.setWalking(true);rig.setRunning(true);}
  if(frame===170){baseline.setWalking(false);zero.setWalking(false);}
  if(frame===410){baseline.trigger=zero.trigger=true;}
  if(frame===550)for(const rig of [baseline,zero]){rig.trigger=false;rig.setKneeling(true);}
  baseline.step();zero.step();const x=coordinates(baseline.pose()),y=coordinates(zero.pose());
  report.baselineMaxDifference=Math.max(report.baselineMaxDifference,...x.map((v,i)=>Math.abs(v-y[i])));
}
// Comparing strength while paused must not advance contact, spring or time.
const paused=new CharacterRig();paused.setRunning(true);for(let i=0;i<160;i++)paused.step();
const before=JSON.stringify(paused);paused.pose();paused.pose();assert.equal(JSON.stringify(paused),before);
const contact=JSON.stringify(paused.runFootContacts),time=paused.time;
paused.setMotionEnergy(0);const original=coordinates(paused.pose());paused.setMotionEnergy(1);const dynamic=coordinates(paused.pose());
assert.equal(paused.time,time);assert.equal(JSON.stringify(paused.runFootContacts),contact);assert.notDeepEqual(original,dynamic);
report.pausedPoseReadOnly=true;
assert(report.baselineMaxDifference<1e-9);
assert(Object.values(report.modes).every(m=>m.maxLegError<1e-4&&m.maxGripError<1e-4&&m.maxStockError<1e-4&&m.minFloor>-1e-6));
report.status='passed';
report.runtime_sources=['gait.js','secondary-motion.js','cape.js','rig-core.js'].map(name=>{
  const path=`game/animation/${name}`;return {path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')};
});
const output='art/characters/clone_01/motion/rig_005/tests/dynamic_motion_001';mkdirSync(output,{recursive:true});
writeFileSync(`${output}/motion-smoke.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,modes:Object.keys(report.modes).length,baselineMaxDifference:report.baselineMaxDifference,maxLegError:Math.max(...Object.values(report.modes).map(m=>m.maxLegError)),pausedPoseReadOnly:true}));
