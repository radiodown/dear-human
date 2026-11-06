// Authored side-rig interpretation of the user-approved kneeling_fire_001.
// Keep source sprite ratios and bone lengths; these are game pose values.
import { HUMAN } from './proportions.js';

export const KNEEL_ART=Object.freeze({
  revision:'kneeling_image_017',
  hipX:-12,frontTrack:76,rearRootX:-4,aimForward:.6,
  // The pad occupies source rows 0..28%, about its original 13% joint.
  // Its lower edge, rather than an arbitrary knee-center radius, sets ground.
  rearKnee:Object.freeze({x:14,y:-76*(.28-.13)/(.96-.13)}),
  rearFootAngle:1.16,lean:.115,aimLean:.045,fireReady:.985,
  chestForward:2.4,chestPitch:.012,shoulderForward:.8,shoulderDown:.2,
  aimedSeat:Object.freeze({x:-11,y:-4}),
  arms:Object.freeze({
    primary:Object.freeze({upper:35,forearm:36.5,elbow:{x:16,y:29}}),
    support:Object.freeze({upper:35,forearm:39,elbow:{x:32,y:15}})
  }),
  eyeBehindSight:17.5,headPitch:.045,maxHeadShift:9,
  kneeBand:.28,kneePivot:.13,skirtHinge:.75,skirtSplit:.52
});
const mix=(a,b,t)=>a+(b-a)*t;
const rotate=(p,a)=>({x:Math.cos(a)*p.x-Math.sin(a)*p.y,y:Math.sin(a)*p.x+Math.cos(a)*p.y});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

// Seat the existing head on the authored rifle sight/cheek relationship.
// This runs after shoulder/stock/arms have been placed, without moving the gun.
export function kneelingHead(torso,headAim,headAngle,sightLine,weight){
  if(!sightLine||weight<=0)return {headAim,headAngle};
  const h=HUMAN.headRegistration;
  const line={x:sightLine.front.x-sightLine.rear.x,y:sightLine.front.y-sightLine.rear.y};
  const length=Math.hypot(line.x,line.y)||1,angle=mix(headAngle,Math.atan2(line.y,line.x)+KNEEL_ART.headPitch,weight);
  const offset=rotate({x:(h.eye[0]-h.pivot[0])*HUMAN.headHeight*h.aspect,y:(h.eye[1]-h.pivot[1])*HUMAN.headHeight},angle);
  const local=rotate({x:h.anchor.x+headAim.x,y:h.anchor.y+headAim.y},torso.a);
  const origin={x:torso.x+local.x,y:torso.y+local.y};
  const target={x:sightLine.rear.x-line.x/length*KNEEL_ART.eyeBehindSight-offset.x,
    y:sightLine.rear.y-line.y/length*KNEEL_ART.eyeBehindSight-offset.y};
  const delta=rotate({x:target.x-origin.x,y:target.y-origin.y},-torso.a);
  return {headAngle:angle,headAim:{
    x:headAim.x+clamp(delta.x,-KNEEL_ART.maxHeadShift,KNEEL_ART.maxHeadShift)*weight,
    y:headAim.y+clamp(delta.y,-KNEEL_ART.maxHeadShift,KNEEL_ART.maxHeadShift)*weight,
    a:headAim.a+angle-headAngle
  }};
}

export function kneelingKneeAngle(leg,amount){
  const source=Math.atan2(leg.hand.y-leg.elbow.y,leg.hand.x-leg.elbow.x)-Math.PI/2;
  // Unwrap to the nearest upright pad orientation, including the folded shin.
  const delta=Math.atan2(Math.sin(-source),Math.cos(-source));
  return source+delta*amount;
}
