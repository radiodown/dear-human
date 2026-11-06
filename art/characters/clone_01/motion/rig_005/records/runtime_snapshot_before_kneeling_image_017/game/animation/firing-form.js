// Authored game pose from the firing-form study. Logical-pixel animation
// values, not anatomical measurements from the user's oblique photograph.
import { HUMAN } from './proportions.js';

export const FIRING_FORM=Object.freeze({
  standingFeet:[26,-24],pelvisBack:-3,pelvisDrop:10.2,pelvisTilt:-.025,
  standingLean:.185,walkingAimLean:.090,
  chestAboveWaist:20,chestForward:1.6,chestDown:.2,chestPitch:.025,
  shoulderForward:1.6,shoulderDown:.6,
  upperRigidEnd:.405,lowerTorsoStart:.485,aimedSeat:{x:-11.5,y:-5},
  runningForward:{base:2,bendGain:8,crouchGain:1.5,crouchDrop:16,max:10,reachMargin:.5},
  arms:{primary:{upper:36,forearm:37.5,elbow:{x:4,y:34}},support:{upper:34,forearm:40,elbow:{x:30,y:16}}}
});
const mix=(a,b,t)=>a+(b-a)*t;
const transform=(p,t)=>({x:t.x+Math.cos(t.a)*p.x-Math.sin(t.a)*p.y,y:t.y+Math.sin(t.a)*p.x+Math.cos(t.a)*p.y});
export function chestFrame(waist,eyeAim,running=0){
  const load=eyeAim+(1-eyeAim)*running*.35;
  return {...transform({x:FIRING_FORM.chestForward*load,y:-FIRING_FORM.chestAboveWaist+FIRING_FORM.chestDown*load},waist),a:waist.a+FIRING_FORM.chestPitch*eyeAim};
}
export function shoulderFrame(torso,eyeAim,running=0){
  const load=eyeAim+(1-eyeAim)*running*.35;
  return {...transform({x:FIRING_FORM.shoulderForward*load,y:FIRING_FORM.shoulderDown*load},torso),a:torso.a};
}
export function weaponSeat(eyeAim,carry,drop){
  return {x:mix(HUMAN.stockPocket.x,FIRING_FORM.aimedSeat.x,eyeAim)+carry*HUMAN.runCarry.offsetX,
    y:mix(HUMAN.stockPocket.y,FIRING_FORM.aimedSeat.y,eyeAim)+carry*drop};
}
export function formArmLengths(side,eyeAim,carry){
  const profile=FIRING_FORM.arms[side],weight=(.35+.65*eyeAim)*(1-carry*.3);
  return {upper:mix(HUMAN.upperArm,profile.upper,weight),forearm:mix(HUMAN.forearm,profile.forearm,weight)};
}
export function runningWeaponAdvance(weight,bend,crouch,arms){
  const p=FIRING_FORM.runningForward;
  const low=Math.max(0,Math.min(1,crouch/p.crouchDrop));
  let advance=Math.min(p.max,p.base+Math.max(0,bend)*p.bendGain+low*p.crouchGain)*Math.max(0,Math.min(1,weight));
  for(const {root,wrist,upper,forearm}of arms){
    // Translate along world forward, retaining the real arm lengths and a
    // small extension reserve. Do not scale a limb to reach the moved rifle.
    const dx=wrist.x-root.x,dy=wrist.y-root.y,reach=upper+forearm-p.reachMargin;
    const available=Math.max(0,Math.sqrt(Math.max(0,reach*reach-dy*dy))-dx);
    advance=Math.min(advance,available);
  }
  return advance;
}
export function formArm(solve,root,wrist,frame,side,eyeAim,carry){
  const profile=FIRING_FORM.arms[side];
  // Authored projection stays within the original bone lengths. No automatic
  // reach-dependent stretching to hide an unreachable wrist.
  const {upper,forearm}=formArmLengths(side,eyeAim,carry);
  const referenceElbow=transform(profile.elbow,{...root,a:frame.a});
  const candidates=[solve(root,wrist,upper,forearm,1),solve(root,wrist,upper,forearm,-1)];
  const distance=arm=>Math.hypot(arm.elbow.x-referenceElbow.x,arm.elbow.y-referenceElbow.y);
  const arm=distance(candidates[0])<=distance(candidates[1])?candidates[0]:candidates[1];
  return {...arm,referenceElbow,projectedLengths:{upper,forearm}};
}
