// Focused moving head/body coherence, pose purity and preserved contacts.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const {CharacterRig}=await import(pathToFileURL(resolve('game/animation/rig-core.js')).href);
const root='art/characters/clone_01/motion/rig_005/records/runtime_snapshot_before_head_body_sync_001';
const cache=new Map();
function savedModule(name){
  if(cache.has(name))return cache.get(name);
  const path=`${root}/game/animation/${name}`;
  if(!existsSync(path))return pathToFileURL(resolve('game/animation',name)).href;
  const source=readFileSync(path,'utf8').replaceAll(/from '\.\/([^']+)'/g,(_,file)=>`from '${savedModule(file)}'`);
  const url='data:text/javascript;base64,'+Buffer.from(source).toString('base64');cache.set(name,url);return url;
}
const {CharacterRig:PreviousRig}=await import(savedModule('rig-core.js'));
const span=v=>(Math.max(...v)-Math.min(...v))*180/Math.PI;
function configure(Type,mode){
  const rig=new Type();rig.setMotionControls(mode,{},true);rig.setWalking(['walk','run','run_fire'].includes(mode));
  rig.setRunning(mode.startsWith('run'));rig.setRelaxed(mode==='relaxed');rig.setKneeling(mode==='kneel_fire');rig.trigger=mode.endsWith('fire');
  for(let i=0;i<144;i++)rig.step();return rig;
}
const report={scope:'Short head/body motion coherence and contact check; no full suite or art acceptance.',modes:{}};
for(const mode of ['relaxed','walk','run','run_fire','kneel_fire']){
  const rig=configure(CharacterRig,mode),old=configure(PreviousRig,mode),relative=[],oldRelative=[],body=[],head=[];
  let maxGrip=0,maxLeg=0,maxStock=0,maxHeadLocalError=0;
  const frames=mode.endsWith('fire')?180:240;
  for(let i=0;i<frames;i++){
    rig.step();old.step();const p=rig.pose(),previous=old.pose();
    assert([p.headFrame.x,p.headFrame.y,p.headFrame.a,p.eye.x,p.eye.y].every(Number.isFinite));
    relative.push(p.headAngle-p.torso.a);oldRelative.push(previous.headAngle-previous.torso.a);body.push(p.torso.a);head.push(p.headAngle);
    maxGrip=Math.max(maxGrip,p.gripError);maxLeg=Math.max(maxLeg,...p.legs.map(l=>l.error));
    maxStock=Math.max(maxStock,Math.hypot(p.sockets.stock.x-p.stockTarget.x,p.sockets.stock.y-p.stockTarget.y));
    // Actual attachment distance is independent of the world-space body bob.
    const dx=p.headFrame.x-p.torso.x,dy=p.headFrame.y-p.torso.y,c=Math.cos(p.torso.a),s=Math.sin(p.torso.a);
    maxHeadLocalError=Math.max(maxHeadLocalError,Math.hypot(c*dx+s*dy-p.headAim.x,-s*dx+c*dy-(-9+p.headAim.y)));
  }
  const metrics={headBodyRelativeRangeDegrees:span(relative),previousRelativeRangeDegrees:span(oldRelative),bodyRangeDegrees:span(body),headRangeDegrees:span(head),maxGripError:maxGrip,maxLegError:maxLeg,maxStockError:maxStock,maxHeadLocalError};
  assert(maxGrip<1e-4&&maxLeg<1e-4&&maxStock<1e-4&&maxHeadLocalError<1e-9,JSON.stringify({mode,...metrics}));
  if(mode!=='kneel_fire')assert(metrics.headBodyRelativeRangeDegrees<.05);
  const before=JSON.stringify(rig);rig.pose();rig.pose();assert.equal(JSON.stringify(rig),before);
  report.modes[mode]=metrics;
}
const bent=configure(CharacterRig,'run');bent.setMotionControls('run',{waist:35,bend:10},true);
const gaze=[];for(let i=0;i<240;i++){bent.step();gaze.push(bent.pose().headAngle);}
report.meanBentRunHeadDegrees=gaze.reduce((a,b)=>a+b,0)/gaze.length*180/Math.PI;
assert(Math.abs(report.meanBentRunHeadDegrees- .055*180/Math.PI)<1);
report.status='passed';report.runtime_sources=['gait.js','secondary-motion.js','rig-core.js','webgl-character.js','side-camera.js'].map(name=>{
  const path=`game/animation/${name}`;return {path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')};
});
const output='art/characters/clone_01/motion/rig_005/tests/head_body_sync_001';mkdirSync(output,{recursive:true});writeFileSync(output+'/sync-smoke.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,modes:report.modes,meanBentRunHeadDegrees:report.meanBentRunHeadDegrees}));
