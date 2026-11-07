// Bounded knee UV, collar seam and sit/stand continuity checks.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {CharacterRig,transform}=await import(pathToFileURL(resolve('game/animation/rig-core.js')).href);
const {KNEEL_ART,KNEE_FRONTIER,kneeFrontier,kneelingKneeAngle,kneelingShinPoint}=await import(pathToFileURL(resolve('game/animation/kneeling-pose.js')).href);
const base='art/characters/clone_01/motion/rig_005',snapshot=base+'/records/runtime_snapshot_before_knee_parts_001';
const definition=JSON.parse(readFileSync(base+'/rig/parts.json')),oldDefinition=JSON.parse(readFileSync(snapshot+'/'+base+'/rig/parts.json'));
const oldCode=readFileSync(snapshot+'/game/animation/kneeling-pose.js','utf8').replace("'./proportions.js'",JSON.stringify(pathToFileURL(resolve('game/animation/proportions.js')).href));
const {kneelingKneeAngle:oldAngle,KNEEL_ART:oldArt}=await import('data:text/javascript;base64,'+Buffer.from(oldCode).toString('base64'));
const attachments=JSON.parse(readFileSync(base+'/records/knee_parts_001/attachments.json'));
assert.deepEqual(KNEE_FRONTIER,attachments.frontier);assert.equal(KNEEL_ART.kneePivot,attachments.pad_pivot);
assert(Math.abs(KNEEL_ART.rearKnee.y-oldArt.rearKnee.y)<1e-10);
const report={scope:'Knee attachment UV/edge constraints and one short sit/stand cycle; no full QA or art acceptance.',
  maxUVAreaDifference:0,maxSeamGap:0,maxRigidShaftDifference:0,maxPadAngleStep:0,previousMaxPadAngleStep:0,maxBoneError:0,maxGroundPadY:-Infinity,
  unchangedParts:0,transitionFrames:0};
function area(mesh){let sum=0;for(let i=0;i<mesh.indices.length;i+=3){const[a,b,c]=mesh.indices.slice(i,i+3).map(k=>mesh.vertices[k]);sum+=Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2;}return sum;}
for(const side of ['near','far']){
  const pad=definition.parts[side+'_knee_cap'],shaft=definition.parts[side+'_shin_shaft'],fold=definition.parts[side+'_knee_fold'];
  assert.deepEqual(pad.rect,oldDefinition.parts[side+'_shin'].rect);assert.deepEqual(shaft.rect,pad.rect);
  report.maxUVAreaDifference=Math.max(report.maxUVAreaDifference,Math.abs(area(pad.uv_mesh)+area(shaft.uv_mesh)-1));
  assert(area(fold.uv_mesh)<.8&&fold.rect[3]<oldDefinition.parts[side+'_knee_fold'].rect[3]*.51);
  for(const[u,v]of pad.uv_mesh.vertices)assert(v<=kneeFrontier(u)+1e-9);
  for(const[u,v]of shaft.uv_mesh.vertices)assert(v>=kneeFrontier(u)-1e-9);
}
for(const[key,value]of Object.entries(oldDefinition.parts)){
  if(/_(knee_cap|shin_shaft|knee_fold)$/.test(key))continue;
  assert.deepEqual(definition.parts[key],value);report.unchangedParts++;
}
const rig=new CharacterRig();let last=null;
for(const kneel of [true,false]){
  rig.setKneeling(kneel);
  for(let tick=0;tick<144;tick++){
    rig.step();const p=rig.pose(),amount=p.kneeSupport.amount;
    for(const[i,leg]of p.legs.entries()){
      const shin=definition.parts[(i===0?'far':'near')+'_shin'],height=76/(shin.joints[1]-shin.joints[0]),width=height*shin.rect[2]/shin.rect[3];
      const angle=kneelingKneeAngle(leg,amount),previous=oldAngle(leg,amount);
      if(last){report.maxPadAngleStep=Math.max(report.maxPadAngleStep,Math.abs(angle-last.angles[i]));report.previousMaxPadAngleStep=Math.max(report.previousMaxPadAngleStep,Math.abs(previous-last.previous[i]));}
      report.maxBoneError=Math.max(report.maxBoneError,Math.abs(Math.hypot(leg.elbow.x-leg.root.x,leg.elbow.y-leg.root.y)-76),Math.abs(Math.hypot(leg.hand.x-leg.elbow.x,leg.hand.y-leg.elbow.y)-76));
      for(const[u,v]of KNEE_FRONTIER){
        const expected=transform({x:(u-.5)*width,y:(v-(shin.joints[0]+(KNEEL_ART.kneePivot-shin.joints[0])*amount))*height},{...leg.elbow,a:angle});
        const actual=kneelingShinPoint(leg,amount,width,height,shin.joints[0],u,v);
        report.maxSeamGap=Math.max(report.maxSeamGap,Math.hypot(actual.x-expected.x,actual.y-expected.y));
      }
      for(const v of [.44,.7,1]){
        const a=Math.atan2(leg.hand.y-leg.elbow.y,leg.hand.x-leg.elbow.x)-Math.PI/2;
        const expected=transform({x:0,y:(v-shin.joints[0])*height},{...leg.elbow,a});
        const actual=kneelingShinPoint(leg,amount,width,height,shin.joints[0],.5,v);
        report.maxRigidShaftDifference=Math.max(report.maxRigidShaftDifference,Math.hypot(actual.x-expected.x,actual.y-expected.y));
      }
      if(i===1&&amount===1)for(const[u,v]of definition.parts.near_knee_cap.uv_mesh.vertices){
        const point=transform({x:(u-.5)*width,y:(v-KNEEL_ART.kneePivot)*height},{...leg.elbow,a:angle});report.maxGroundPadY=Math.max(report.maxGroundPadY,point.y);
      }
    }
    last={angles:p.legs.map(l=>kneelingKneeAngle(l,amount)),previous:p.legs.map(l=>oldAngle(l,amount))};
    report.transitionFrames++;
  }
}
assert(report.maxUVAreaDifference<1e-9&&report.maxSeamGap<1e-9&&report.maxRigidShaftDifference<1e-9&&report.maxBoneError<1e-9);
assert(report.maxGroundPadY<1e-8&&report.maxGroundPadY>-.01);
assert(report.maxPadAngleStep<.15&&report.maxPadAngleStep<report.previousMaxPadAngleStep);
const state=JSON.stringify(rig);rig.pose();rig.pose();assert.equal(JSON.stringify(rig),state);
report.status='passed';report.runtime_sources=['game/animation/kneeling-pose.js','game/animation/webgl-character.js',base+'/rig/parts.json'].map(path=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}));
const output=base+'/tests/knee_parts_001';mkdirSync(output,{recursive:true});writeFileSync(output+'/knee-attachments.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
