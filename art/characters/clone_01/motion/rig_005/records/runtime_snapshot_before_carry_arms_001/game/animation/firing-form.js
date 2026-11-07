// Authored game pose from the firing-form study. Logical-pixel animation
// values, not anatomical measurements from the user's oblique photograph.
import { HUMAN } from './proportions.js';
import { KNEEL_ART } from './kneeling-pose.js';

export const FIRING_FORM=Object.freeze({
  standingFeet:[26,-24],pelvisBack:-3,pelvisDrop:10.2,pelvisTilt:-.025,
  standingLean:.185,walkingAimLean:.090,
  chestAboveWaist:20,chestForward:1.6,chestDown:.2,chestPitch:.025,
  shoulderForward:1.6,shoulderDown:.6,
  upperRigidEnd:.405,lowerTorsoStart:.485,aimedSeat:{x:-11.5,y:-5},
  runningForward:{base:2,bendGain:8,crouchGain:1.5,crouchDrop:16,max:10,reachMargin:.5},
  arms:{primary:{upper:36,forearm:37.5,elbow:{x:4,y:34}},support:{upper:34,forearm:40,elbow:{x:30,y:16}}}
});
// Right-facing world Y points down, so positive rifle pitch lowers the muzzle.
export const WEAPON_CARRY=Object.freeze({runPitch:35*Math.PI/180,restPitch:58*Math.PI/180,
  runSeatOffset:{x:-4,y:0},restSeat:{x:-24,y:8},relaxTime:.18,raiseStart:.05,raiseEnd:.85});
const mix=(a,b,t)=>a+(b-a)*t;
const transform=(p,t)=>({x:t.x+Math.cos(t.a)*p.x-Math.sin(t.a)*p.y,y:t.y+Math.sin(t.a)*p.x+Math.cos(t.a)*p.y});
export function weaponCarry({running=0,relaxed=0,aim=0,reload=0}){
  const u=Math.max(0,Math.min(1,(aim-WEAPON_CARRY.raiseStart)/(WEAPON_CARRY.raiseEnd-WEAPON_CARRY.raiseStart)));
  const raised=u*u*(3-2*u),available=(1-raised)*(1-reload);
  const run=running*available,rest=relaxed*(1-running)*available;
  return {run,rest,lowered:run+rest,raised,pitch:run*WEAPON_CARRY.runPitch+rest*WEAPON_CARRY.restPitch};
}
export function chestFrame(waist,eyeAim,running=0,kneeling=0){
  const load=eyeAim+(1-eyeAim)*running*.35;
  return {...transform({x:mix(FIRING_FORM.chestForward,KNEEL_ART.chestForward,kneeling)*load,y:-FIRING_FORM.chestAboveWaist+FIRING_FORM.chestDown*load},waist),a:waist.a+mix(FIRING_FORM.chestPitch,KNEEL_ART.chestPitch,kneeling)*eyeAim};
}
export function shoulderFrame(torso,eyeAim,running=0,kneeling=0){
  const load=eyeAim+(1-eyeAim)*running*.35;
  return {...transform({x:mix(FIRING_FORM.shoulderForward,KNEEL_ART.shoulderForward,kneeling)*load,y:mix(FIRING_FORM.shoulderDown,KNEEL_ART.shoulderDown,kneeling)*load},torso),a:torso.a};
}
export function weaponSeat(eyeAim,carry,drop,kneeling=0){
  return {x:mix(HUMAN.stockPocket.x,mix(FIRING_FORM.aimedSeat.x,KNEEL_ART.aimedSeat.x,kneeling),eyeAim)+carry*HUMAN.runCarry.offsetX,
    y:mix(HUMAN.stockPocket.y,mix(FIRING_FORM.aimedSeat.y,KNEEL_ART.aimedSeat.y,kneeling),eyeAim)+carry*drop};
}
export function formArmLengths(side,eyeAim,carry,kneeling=0){
  const profile=FIRING_FORM.arms[side],seated=KNEEL_ART.arms[side],weight=(.35+.65*eyeAim)*(1-carry*.3);
  return {upper:mix(HUMAN.upperArm,mix(profile.upper,seated.upper,kneeling),weight),forearm:mix(HUMAN.forearm,mix(profile.forearm,seated.forearm,kneeling),weight)};
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
export function formArm(solve,root,wrist,frame,side,eyeAim,carry,kneeling=0){
  const profile=FIRING_FORM.arms[side],seated=KNEEL_ART.arms[side];
  // Authored projection stays within the original bone lengths. No automatic
  // reach-dependent stretching to hide an unreachable wrist.
  const {upper,forearm}=formArmLengths(side,eyeAim,carry,kneeling);
  const referenceElbow=transform({x:mix(profile.elbow.x,seated.elbow.x,kneeling),y:mix(profile.elbow.y,seated.elbow.y,kneeling)},{...root,a:frame.a});
  const candidates=[solve(root,wrist,upper,forearm,1),solve(root,wrist,upper,forearm,-1)];
  const distance=arm=>Math.hypot(arm.elbow.x-referenceElbow.x,arm.elbow.y-referenceElbow.y);
  const arm=distance(candidates[0])<=distance(candidates[1])?candidates[0]:candidates[1];
  return {...arm,referenceElbow,projectedLengths:{upper,forearm}};
}
