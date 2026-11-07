// Short lowered-carry reach, elbow-branch and firing transition checks.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {CharacterRig}=await import(pathToFileURL(resolve('game/animation/rig-core.js')).href);
const snapshot='art/characters/clone_01/motion/rig_005/records/runtime_snapshot_before_carry_arms_001',cache=new Map();
function oldModule(name){
  if(cache.has(name))return cache.get(name);
  const path=`${snapshot}/game/animation/${name}`;
  if(!existsSync(path))return pathToFileURL(resolve('game/animation',name)).href;
  const source=readFileSync(path,'utf8').replaceAll(/from '\.\/([^']+)'/g,(_,file)=>`from '${oldModule(file)}'`);
  const url='data:text/javascript;base64,'+Buffer.from(source).toString('base64');cache.set(name,url);return url;
}
const {CharacterRig:PreviousRig}=await import(oldModule('rig-core.js'));
function configure(Type,mode,controls={}){
  const r=new Type();r.setMotionControls(mode,controls,true);r.setRelaxed(mode==='relaxed');r.setRunning(mode.startsWith('run'));
  r.setKneeling(mode.startsWith('kneel'));r.trigger=mode.endsWith('fire');return r;
}
function sample(r,frames){
  const result={maxGripError:0,maxBoneError:0,maxStockError:0,maxElbowStep:0,maxFit:0,bendChanges:0};let previous=null;
  for(let i=0;i<frames;i++){
    r.step();const p=r.pose();
    assert([p.weapon.x,p.weapon.y,p.weapon.a,p.armA.elbow.x,p.armB.elbow.y].every(Number.isFinite));
    result.maxGripError=Math.max(result.maxGripError,p.gripError);
    result.maxStockError=Math.max(result.maxStockError,Math.hypot(p.sockets.stock.x-p.stockTarget.x,p.sockets.stock.y-p.stockTarget.y));
    result.maxFit=Math.max(result.maxFit,Math.hypot(p.carryStockFit?.dx??0,p.carryStockFit?.dy??0));
    for(const [j,a]of [p.armA,p.armB].entries()){
      if(a.projectedLengths)result.maxBoneError=Math.max(result.maxBoneError,
        Math.abs(Math.hypot(a.elbow.x-a.root.x,a.elbow.y-a.root.y)-a.projectedLengths.upper),
        Math.abs(Math.hypot(a.hand.x-a.elbow.x,a.hand.y-a.elbow.y)-a.projectedLengths.forearm));
      if(previous){const last=[previous.armA,previous.armB][j];
        result.maxElbowStep=Math.max(result.maxElbowStep,Math.hypot(a.elbow.x-last.elbow.x,a.elbow.y-last.elbow.y));
        result.bendChanges+=Number(a.bendSign!==last.bendSign);
      }
    }
    previous=p;
  }
  const p=r.pose();result.pitchDegrees=p.weapon.a*180/Math.PI;
  const local=q=>{const dx=q.x-p.girdle.x,dy=q.y-p.girdle.y,a=p.girdle.a;return{x:Math.cos(a)*dx+Math.sin(a)*dy,y:-Math.sin(a)*dx+Math.cos(a)*dy};};
  result.arms=[p.armA,p.armB].map(a=>({root:local(a.root),elbow:local(a.elbow),wrist:local(a.hand),bend:a.bendSign}));
  return result;
}
const report={scope:'Lowered run/relaxed carry and short raise/return only; no broad QA or user art acceptance.',states:{},previous:{},transitions:{},unchangedMaximumDifference:0};
for(const mode of ['run','relaxed']){
  for(const controls of [{},{weaponDrop:18},{waist:20,bend:15,weaponDrop:18,energy:150}]){
    const key=mode+':'+JSON.stringify(controls),r=configure(CharacterRig,mode,controls),m=sample(r,300);
    report.states[key]=m;assert(m.maxGripError<1e-4&&m.maxBoneError<1e-4&&m.maxStockError<1e-4,JSON.stringify({key,...m}));
    assert(m.maxElbowStep<8&&m.bendChanges===0,JSON.stringify({key,...m}));
    assert(Math.abs(m.pitchDegrees-(mode==='run'?35:58))<1e-6);
  }
  report.previous[mode]=sample(configure(PreviousRig,mode),300);
  const r=configure(CharacterRig,mode);sample(r,180);const start=r.time,shots=r.shots;
  assert(r.requestFire());let first=null,maxGrip=0,maxStep=0,changes=0,previous=r.pose();
  for(let i=0;i<360;i++){
    const n=r.shots;r.step();const p=r.pose();maxGrip=Math.max(maxGrip,p.gripError);
    for(const [j,a]of [p.armA,p.armB].entries()){const last=[previous.armA,previous.armB][j];maxStep=Math.max(maxStep,Math.hypot(a.elbow.x-last.elbow.x,a.elbow.y-last.elbow.y));changes+=Number(a.bendSign!==last.bendSign);}
    if(r.shots>n&&!first)first={afterSeconds:r.time-start,pitchDegrees:p.weapon.a*180/Math.PI,lowered:p.carryState.lowered};
    previous=p;
  }
  assert(first&&first.afterSeconds>=.12-1e-6&&first.lowered===0&&Math.abs(first.pitchDegrees)<2.1);
  // The 0.12s raise can move the elbow quickly; reject a branch jump of a
  // third of the upper-arm length within a single 1/120s step.
  assert.equal(r.shots,shots+1);assert(maxGrip<1e-4&&changes===0&&maxStep<12,JSON.stringify({mode,maxGrip,changes,maxStep}));
  assert(Math.abs(r.pose().weapon.a*180/Math.PI-(mode==='run'?35:58))<.1);
  report.transitions[mode]={firstShot:first,maxGripError:maxGrip,maxElbowStep:maxStep,bendChanges:changes};
  const saved=JSON.stringify(r);r.pose();r.pose();assert.equal(JSON.stringify(r),saved);
}
// Shared helper must preserve authored shouldered/firing/kneeling joint targets.
const positions=p=>[p.weapon.x,p.weapon.y,p.weapon.a,p.headAngle,p.pelvis.x,p.pelvis.y,...[p.armA,p.armB,...p.legs].flatMap(a=>[a.root.x,a.root.y,a.elbow.x,a.elbow.y,a.hand.x,a.hand.y])];
for(const mode of ['idle','fire','kneel_fire']){
  const r=configure(CharacterRig,mode),old=configure(PreviousRig,mode);
  for(let i=0;i<200;i++){r.step();old.step();const a=positions(r.pose()),b=positions(old.pose());report.unchangedMaximumDifference=Math.max(report.unchangedMaximumDifference,...a.map((v,j)=>Math.abs(v-b[j])));}
}
assert(report.unchangedMaximumDifference<1e-9);
report.status='passed';report.runtime_sources=['rig-core.js','firing-form.js'].map(name=>{const path=`game/animation/${name}`;return{path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')};});
const output='art/characters/clone_01/motion/rig_005/tests/carry_arms_001';mkdirSync(output,{recursive:true});writeFileSync(output+'/carry-arms.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,states:Object.keys(report.states).length,transitions:report.transitions,unchangedMaximumDifference:report.unchangedMaximumDifference}));
