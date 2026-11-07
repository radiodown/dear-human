// Focused carry/rest angles, grip contacts and raise-before-fire transitions.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const {CharacterRig}=await import(pathToFileURL(resolve('game/animation/rig-core.js')).href);
const report={scope:'Short carry/idle and firing-transition constraints only; no full suite or art acceptance.',states:{},transitions:{}};
function configured(mode){
  const rig=new CharacterRig();rig.setMotionControls(mode,{},true);rig.setRelaxed(mode==='relaxed');rig.setRunning(mode.startsWith('run'));rig.trigger=mode==='run_fire';return rig;
}
for(const mode of ['idle','relaxed','run','run_fire']){
  const rig=configured(mode),metrics={maxGripError:0,maxLegError:0,maxStockError:0};
  for(let i=0;i<240;i++){
    rig.step();const p=rig.pose();
    metrics.maxGripError=Math.max(metrics.maxGripError,p.gripError);
    metrics.maxLegError=Math.max(metrics.maxLegError,...p.legs.map(l=>l.error));
    metrics.maxStockError=Math.max(metrics.maxStockError,Math.hypot(p.sockets.stock.x-p.stockTarget.x,p.sockets.stock.y-p.stockTarget.y));
    assert([p.weapon.x,p.weapon.y,p.weapon.a,p.torso.a,p.gripError].every(Number.isFinite));
  }
  metrics.pitchDegrees=rig.pose().weapon.a*180/Math.PI;metrics.shots=rig.shots;report.states[mode]=metrics;
}
assert.equal(report.states.idle.pitchDegrees,0);
assert(Math.abs(report.states.relaxed.pitchDegrees-58)<1e-6);
assert(Math.abs(report.states.run.pitchDegrees-35)<1e-6);
assert(Math.abs(report.states.run_fire.pitchDegrees)<1&&report.states.run_fire.shots>0);
for(const mode of ['relaxed','run']){
  const rig=configured(mode);for(let i=0;i<180;i++)rig.step();
  const start=rig.time,shots=rig.shots,contacts=JSON.stringify(rig.runFootContacts);
  const pose=JSON.stringify(rig.pose());assert.equal(JSON.stringify(rig.pose()),pose);assert.equal(JSON.stringify(rig.runFootContacts),contacts);
  assert(rig.requestFire());let first=null,maxGrip=0;
  for(let i=0;i<90;i++){
    const previousShots=rig.shots;rig.step();const p=rig.pose();maxGrip=Math.max(maxGrip,p.gripError);
    if(rig.shots>previousShots&&!first)first={afterSeconds:rig.time-start,pitchDegrees:p.weapon.a*180/Math.PI,lowered:p.carryState.lowered};
  }
  assert(first&&first.afterSeconds>=.12-1e-6&&first.lowered===0&&Math.abs(first.pitchDegrees)<2.1);
  assert.equal(rig.shots,shots+1);
  for(let i=0;i<180;i++)rig.step();
  const returned=rig.pose().weapon.a*180/Math.PI;
  assert(Math.abs(returned-(mode==='run'?35:58))<.1);assert(maxGrip<1e-4);
  report.transitions[mode]={firstShot:first,maxGripError:maxGrip,returnedPitchDegrees:returned};
}
assert(Object.values(report.states).every(v=>v.maxGripError<1e-4&&v.maxStockError<1e-4&&v.maxLegError<1e-4));
report.status='passed';report.runtime_sources=['game/animation/rig-core.js','game/animation/firing-form.js','game/animation/motion-controls.js'].map(path=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}));
const output='art/characters/clone_01/motion/rig_005/tests/carry_idle_001';mkdirSync(output,{recursive:true});writeFileSync(output+'/carry-smoke.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,pitches:Object.fromEntries(Object.entries(report.states).map(([k,v])=>[k,v.pitchDegrees])),transitions:report.transitions}));
