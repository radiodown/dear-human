// Focused shared-control invariants; run from project root.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const {CharacterRig}=await import(pathToFileURL(resolve('game/animation/rig-core.js')).href);
const {MOTION_CONTROL_DEFAULTS}=await import(pathToFileURL(resolve('game/animation/motion-controls.js')).href);
const source=readFileSync('art/characters/clone_01/motion/rig_005/records/runtime_snapshot_before_motion_controls_001/game/animation/rig-core.js','utf8')
  .replaceAll(/from '\.\/([^']+)'/g,(_,file)=>`from '${pathToFileURL(resolve('game/animation',file)).href}'`);
const {CharacterRig:PreviousRig}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const modes={idle:{},walk:{walk:true},fire:{fire:true},walk_fire:{walk:true,fire:true},run:{run:true},run_fire:{run:true,fire:true},kneel:{kneel:true},kneel_fire:{kneel:true,fire:true}};
const setup=(rig,flags)=>{rig.setWalking(!!flags.walk);rig.setRunning(!!flags.run);rig.setKneeling(!!flags.kneel);rig.trigger=!!flags.fire;};
const positions=p=>[p.pelvis.x,p.pelvis.y,p.waist.a,p.chest.x,p.chest.y,p.chest.a,p.bust.a,p.weapon.x,p.weapon.y,p.weapon.a,p.headAngle,...p.legs.flatMap(l=>[l.hand.x,l.hand.y,l.elbow.x,l.elbow.y])];
const report={scope:'Short shared-control constraints and authored-default comparison; no full test suite or art acceptance.',modes:{},baselineMaxDifference:0};
for(const [mode,flags]of Object.entries(modes)){
  const rig=new CharacterRig(),old=new PreviousRig(),defaults=MOTION_CONTROL_DEFAULTS[mode];
  setup(rig,flags);setup(old,flags);rig.setMotionControls(mode,defaults,true);
  for(let frame=0;frame<240;frame++){
    rig.step();old.step();const a=positions(rig.pose()),b=positions(old.pose());
    report.baselineMaxDifference=Math.max(report.baselineMaxDifference,...a.map((x,i)=>Math.abs(x-b[i])));
  }
  const time=rig.time,contacts=JSON.stringify(rig.runFootContacts),before=rig.pose();
  rig.setMotionControls(mode,{...defaults,weaponDrop:defaults.weaponDrop+3},true);
  const lower=rig.pose();assert(Math.abs(lower.weapon.y-before.weapon.y-3)<1e-9);assert.equal(lower.weapon.a,before.weapon.a);
  rig.setMotionControls(mode,{...defaults,waist:defaults.waist+5},true);
  assert(Math.abs(rig.pose().waist.a-before.waist.a-5*Math.PI/180)<1e-9);
  assert.equal(rig.time,time);assert.equal(JSON.stringify(rig.runFootContacts),contacts);
  rig.setMotionControls(mode,{...defaults,waist:defaults.waist+5,bend:2,bust:1,weaponDrop:defaults.weaponDrop+3,energy:120},true);
  const metrics={maxGripError:0,maxStockError:0,maxLegError:0,pausedWaistAndHeight:true};
  for(let frame=0;frame<120;frame++){
    rig.step();const p=rig.pose();assert(positions(p).every(Number.isFinite));
    metrics.maxGripError=Math.max(metrics.maxGripError,p.gripError);
    metrics.maxStockError=Math.max(metrics.maxStockError,Math.hypot(p.sockets.stock.x-p.stockTarget.x,p.sockets.stock.y-p.stockTarget.y));
    metrics.maxLegError=Math.max(metrics.maxLegError,...p.legs.map(l=>l.error));
  }
  report.modes[mode]=metrics;
}
assert(report.baselineMaxDifference<1e-9);
assert(Object.values(report.modes).every(m=>m.maxGripError<1e-4&&m.maxStockError<1e-4&&m.maxLegError<1e-4));
report.status='passed';
report.runtime_sources=['game/animation/motion-controls.js','game/animation/rig-core.js'].map(path=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}));
const output='art/characters/clone_01/motion/rig_005/tests/motion_controls_001';mkdirSync(output,{recursive:true});writeFileSync(output+'/controls-smoke.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,modes:Object.keys(report.modes).length,baselineMaxDifference:report.baselineMaxDifference,maxGripError:Math.max(...Object.values(report.modes).map(m=>m.maxGripError))}));
