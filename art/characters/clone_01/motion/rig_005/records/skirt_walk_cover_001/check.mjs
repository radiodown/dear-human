// Targeted garment attachment invariants; no full rig test suite.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const current=await import(pathToFileURL(resolve('game/animation/waist.js')).href);
const {CharacterRig}=await import(pathToFileURL(resolve('game/animation/rig-core.js')).href);
const source=readFileSync('art/characters/clone_01/motion/rig_005/records/runtime_snapshot_before_skirt_walk_cover_001/game/animation/waist.js','utf8')
  .replaceAll(/from '\.\/([^']+)'/g,(_,name)=>`from '${pathToFileURL(resolve('game/animation',name)).href}'`);
const previous=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const width=100*637/1315,height=100,distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const report={scope:'Short skirt seam/waist pin, unchanged standing/kneeling, leg-order envelope and thigh joint check; not art/collision acceptance.',maxPinnedError:0,maxSeamError:0,maxStandingDifference:0,maxKneelingDifference:0,maxLegOrderDifference:0,maxJointOffset:0,maxForwardCoverGain:0};
for(const mode of ['idle','walk','run','kneel_fire']){
  const rig=new CharacterRig();rig.setMotionControls(mode,{},true);rig.setWalking(mode==='walk');rig.setRunning(mode==='run');rig.setKneeling(mode==='kneel_fire');
  for(let i=0;i<144;i++)rig.step();
  const before=JSON.stringify(rig);
  for(let i=0;i<120;i++){
    const p=rig.pose(),moving=mode==='walk'||mode==='run';
    for(const front of [false,true])for(let row=0;row<=8;row++)for(let col=0;col<=6;col++){
      const u=(front?.52:0)+(front?.48:.52)*col/6,v=.75+.25*row/8;
      const point=current.skirtPanelPoint(p,width,height,u,v,front),old=previous.skirtPanelPoint(p,width,height,u,v,front);
      assert(Number.isFinite(point.x)&&Number.isFinite(point.y));
      if(row===0)report.maxPinnedError=Math.max(report.maxPinnedError,distance(point,old));
      if(mode==='idle')report.maxStandingDifference=Math.max(report.maxStandingDifference,distance(point,old));
      if(mode==='kneel_fire')report.maxKneelingDifference=Math.max(report.maxKneelingDifference,distance(point,old));
      if(moving){
        const swapped=current.skirtPanelPoint({...p,legs:[...p.legs].reverse()},width,height,u,v,front);
        report.maxLegOrderDifference=Math.max(report.maxLegOrderDifference,distance(point,swapped));
      }
    }
    if(moving){
      for(let row=0;row<=8;row++)report.maxSeamError=Math.max(report.maxSeamError,distance(
        current.skirtPanelPoint(p,width,height,.52,.75+row/32,true),current.skirtPanelPoint(p,width,height,.52,.75+row/32,false)));
      const tip=current.skirtPanelPoint(p,width,height,.96,1,true),old=previous.skirtPanelPoint(p,width,height,.96,1,true);
      report.maxForwardCoverGain=Math.max(report.maxForwardCoverGain,tip.x-old.x);
      for(const leg of p.legs){
        const angle=Math.atan2(leg.elbow.y-leg.root.y,leg.elbow.x-leg.root.x)-Math.PI/2;
        for(const v of [.06,.95])report.maxJointOffset=Math.max(report.maxJointOffset,Math.hypot(...Object.values(current.thighRootOffset(p,40,76/.89,[.5,.06],angle,.5,v))));
      }
    }
    rig.step();
  }
  const settled=JSON.stringify(rig);rig.pose();assert.equal(JSON.stringify(rig),settled);
}
assert(report.maxPinnedError<1e-9&&report.maxSeamError<1e-9&&report.maxStandingDifference<1e-9&&report.maxKneelingDifference<1e-9&&report.maxLegOrderDifference<1e-9&&report.maxJointOffset<1e-9);
assert(report.maxForwardCoverGain>5);
report.status='passed';report.runtime_sources=['game/animation/waist.js','game/animation/webgl-character.js'].map(path=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}));
const output='art/characters/clone_01/motion/rig_005/tests/skirt_walk_cover_001';mkdirSync(output,{recursive:true});writeFileSync(output+'/garment-smoke.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
