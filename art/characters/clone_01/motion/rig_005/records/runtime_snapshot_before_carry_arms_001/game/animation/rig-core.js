// Shared simulation for the library and the future game scene. Units are logical pixels.
import { WEAPONS } from './weapon-profiles.js';
import { GAIT, RUN, KNEEL, MOTION_ENERGY, kneelWeight, gaitProfile, gaitBody, footPose, energeticFoot, RearBrace, RunFootContacts } from './gait.js';
import { HUMAN, LEG_SHAPE, handOffset } from './proportions.js';
import { CapeMotion } from './cape.js';
import { HairMotion, OutfitMotion, BODY_MOTION, bodyMotion } from './secondary-motion.js';
import { reloadPose } from './reload-pose.js';
import { WAIST, waistFrame, bustFrame } from './waist.js';
import { kneelingHead } from './kneeling-pose.js';
import { MUZZLE_LIGHT } from './muzzle-light.js';
import { MOTION_CONTROL_DEFAULTS, MOTION_REACTIONS, normalizeMotionControls } from './motion-controls.js';
import { FIRING_FORM, WEAPON_CARRY, weaponCarry, chestFrame, shoulderFrame, weaponSeat, formArm, formArmLengths, runningWeaponAdvance } from './firing-form.js';
export { WEAPONS } from './weapon-profiles.js';
export const STEP = 1 / 120;
export const FIRE_WAIST=Object.freeze({min:0,max:45,defaults:Object.freeze({standing:12,running:15})});
export const KNEEL_CARRY=Object.freeze({minDrop:0,maxDrop:18,defaultDrop:0});
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export function transform(p, t) {
  const c = Math.cos(t.a || 0), s = Math.sin(t.a || 0);
  return { x: t.x + c * p.x - s * p.y, y: t.y + s * p.x + c * p.y };
}
export function ik2(root, goal, l1, l2, bend = 1) {
  const dx = goal.x - root.x, dy = goal.y - root.y;
  const original = Math.hypot(dx, dy), d = clamp(original, Math.abs(l1 - l2) + 1e-5, l1 + l2 - 1e-5);
  const angle = Math.atan2(dy, dx), a = angle + bend * Math.acos(clamp((l1*l1 + d*d - l2*l2) / (2*l1*d), -1, 1));
  const elbow = { x: root.x + Math.cos(a)*l1, y: root.y + Math.sin(a)*l1 };
  const hand = { x: root.x + Math.cos(angle)*d, y: root.y + Math.sin(angle)*d };
  return { root, elbow, hand, target: goal, error: Math.hypot(hand.x-goal.x, hand.y-goal.y), reachable: original <= l1+l2 && original >= Math.abs(l1-l2) };
}
export class Spring {
  constructor(hz, damping, limit) { Object.assign(this, { hz, damping, limit, x: 0, v: 0 }); }
  impulse(v) { this.v = clamp(this.v+v, -this.limit*100, this.limit*100); }
  step(dt) {
    const w = 2*Math.PI*this.hz;
    const x=this.x,v=this.v,z=this.damping;
    // Exact free damped-oscillator update. Euler used to reverse a high-frequency
    // negative impulse on its very first tick (a visible forward gun kick).
    if(Math.abs(z-1)<1e-6){
      const c=v+w*x,e=Math.exp(-w*dt);this.x=(x+c*dt)*e;this.v=(v-w*c*dt)*e;
    }else if(z<1){
      const d=w*Math.sqrt(1-z*z),c=Math.cos(d*dt),s=Math.sin(d*dt),e=Math.exp(-z*w*dt);
      this.x=e*(x*c+(v+z*w*x)/d*s);this.v=e*(v*c-(z*w*v+w*w*x)/d*s);
    }else{
      const q=Math.sqrt(z*z-1),r1=-w*(z-q),r2=-w*(z+q),a=(v-r2*x)/(r1-r2),b=x-a;
      this.x=a*Math.exp(r1*dt)+b*Math.exp(r2*dt);this.v=r1*a*Math.exp(r1*dt)+r2*b*Math.exp(r2*dt);
    }
    this.x=clamp(this.x,-this.limit,this.limit);
    if (Math.abs(this.x) >= this.limit && this.x*this.v > 0) this.v = 0;
  }
  reset() { this.x = this.v = 0; }
}
export class CharacterRig {
  constructor() {
    this.head = new Spring(5.5,.9,.6); this.hair = new Spring(3.8,.85,2);
    this.cloth = new Spring(6,.9,.5); this.cape = new Spring(3,.9,3);
    this.recoil = new Spring(12,1,3);
    this.bodyRecoil = new Spring(BODY_MOTION.recoilHz,BODY_MOTION.recoilDamping,BODY_MOTION.recoilLimit);
    this.moveDrive=new Spring(2.6,.78,.060);this.motionSpeed=0;this.motionEnergy=MOTION_ENERGY.default;
    this.enabled = { recoil:true, head:true, hair:true, cloth:true, cape:true };
    this.weapon = WEAPONS.m16_basic; this.ammo=30; this.time=0; this.shots=0; this.recoilEvents=0;
    this.cooldown=0; this.flash=0; this.phase=Math.PI*2*.36; this.facing=1; this.walk=false; this.trigger=false;
    this.reload=null; this.reloadCompletions=0; this.accumulator=0; this.rootX=0; this.distance=0;this.walkAmount=0;
    this.aimAmount=0;this.cheekAmount=0;this.aimHold=0;this.capeMotion=new CapeMotion();
    this.hairMotion=new HairMotion();this.outfitMotion=new OutfitMotion();
    this.rearBrace=new RearBrace();
    this.pendingShot=false;this.preFire=0;
    this.bendTarget=0;this.bendAngle=0;this.bustTarget=0;this.bustAngle=0;
    this.controlMotion=null;this.motionControls=null;
    this.poseWaistTarget=0;this.poseWaistOffset=0;this.weaponDropTarget=0;this.weaponDropOffset=0;
    this.fireWaistTarget=Object.fromEntries(Object.entries(FIRE_WAIST.defaults).map(([kind,degrees])=>[kind,degrees*Math.PI/180]));
    this.fireWaistAngle={...this.fireWaistTarget};
    this.run=false;this.runAmount=0;this.kneel=false;this.kneelAmount=0;
    this.relaxed=false;this.relaxAmount=0;
    this.runCarryAmount=0;
    this.carryDropTarget=HUMAN.runCarry.drop;this.carryDrop=HUMAN.runCarry.drop;
    this.kneelDropTarget=KNEEL_CARRY.defaultDrop;this.kneelDrop=KNEEL_CARRY.defaultDrop;
    this.runFootContacts=new RunFootContacts({phase:this.phase,amount:0,running:0,kneeling:0,distance:0});
  }
  equip(id) {
    if (!WEAPONS[id]) throw new Error(`Unknown weapon: ${id}`);
    if (this.reload) return false;
    this.weapon = WEAPONS[id]; return true; // no character texture or rig replacement
  }
  turn() { this.facing *= -1; for (const k of ['head','hair','cloth','cape']) this[k].reset();this.hairMotion.reset();this.outfitMotion.reset(); }
  setWalking(value) {
    if (this.walk !== value) { this.hair.impulse(value ? 4 : -4); this.cape.impulse(value ? 10 : -10); }
    this.walk = value;
    if(value)this.kneel=false;else this.run=false;
  }
  setRunning(value){
    this.run=value;
    if(value)this.setWalking(true);
  }
  setKneeling(value){
    this.kneel=value;
    if(value)this.setWalking(false);
  }
  setRelaxed(value){this.relaxed=!!value;}
  setBend(degrees,immediate=false){
    if(!Number.isFinite(degrees))return false;
    this.bendTarget=clamp(degrees,0,45)*Math.PI/180;
    if(immediate)this.bendAngle=this.bendTarget;
    return true;
  }
  setMotionEnergy(value){
    if(!Number.isFinite(value))return false;
    this.motionEnergy=clamp(value,MOTION_ENERGY.min,MOTION_ENERGY.max);return true;
  }
  setMotionControls(mode,settings,immediate=false){
    if(!MOTION_CONTROL_DEFAULTS[mode])return false;
    const value=normalizeMotionControls(mode,settings),defaults=MOTION_CONTROL_DEFAULTS[mode];
    this.controlMotion=mode;this.motionControls=value;
    // Zero differences reproduce each authored default. Apply the same
    // offsets to every action, including walking fire and kneeling.
    this.poseWaistTarget=(value.waist-defaults.waist)*Math.PI/180;
    this.weaponDropTarget=value.weaponDrop-defaults.weaponDrop;
    if(immediate){this.poseWaistOffset=this.poseWaistTarget;this.weaponDropOffset=this.weaponDropTarget;}
    this.setBend(value.bend,immediate);this.setBustPitch(value.bust,immediate);this.setMotionEnergy(value.energy/100);
    for(const key of MOTION_REACTIONS)this.setReaction(key,value[key]);
    return true;
  }
  setBustPitch(degrees,immediate=false){
    if(!Number.isFinite(degrees))return false;
    this.bustTarget=clamp(degrees,-5,5)*Math.PI/180;
    if(immediate)this.bustAngle=this.bustTarget;
    return true;
  }
  setFireWaist(kind,degrees,immediate=false){
    if(!Object.hasOwn(FIRE_WAIST.defaults,kind)||!Number.isFinite(degrees))return false;
    this.fireWaistTarget[kind]=clamp(degrees,FIRE_WAIST.min,FIRE_WAIST.max)*Math.PI/180;
    if(immediate)this.fireWaistAngle[kind]=this.fireWaistTarget[kind];
    return true;
  }
  setRunCarryDrop(value,immediate=false){
    if(!Number.isFinite(value))return false;
    this.carryDropTarget=clamp(value,0,HUMAN.runCarry.maxDrop);
    if(immediate)this.carryDrop=this.carryDropTarget;
    return true;
  }
  setKneelCarryDrop(value,immediate=false){
    if(!Number.isFinite(value))return false;
    this.kneelDropTarget=clamp(value,KNEEL_CARRY.minDrop,KNEEL_CARRY.maxDrop);
    if(immediate)this.kneelDrop=this.kneelDropTarget;
    return true;
  }
  setReaction(key,value){
    if(!Object.hasOwn(this.enabled,key))return false;
    this.enabled[key]=!!value;
    if(!value){
      this[key].reset();
      if(key==='recoil')this.bodyRecoil.reset();
    }
    return true;
  }
  isFireReady(){
    return this.aimAmount>.9&&(!this.kneel||this.kneelAmount>KNEEL.fireReady)&&(!this.run||this.runCarryAmount>HUMAN.runCarry.fireReady);
  }
  requestFire(){
    if(this.reload||this.pendingShot||this.cooldown>1e-7)return false;
    if(!this.ammo){this.startReload();return false;}
    if(this.isFireReady())return this.fire();
    this.pendingShot=true;this.preFire=0;return true;
  }
  // Commit a prepared shot. Input and the future game scene use requestFire;
  // fire remains a direct event for the recoil/weapon simulation tests.
  fire() {
    if (this.reload || this.cooldown > 1e-7) return false;
    if (!this.ammo) { this.startReload(); return false; }
    this.ammo--; this.shots++; this.cooldown=this.weapon.fireInterval; this.flash=MUZZLE_LIGHT.duration;this.aimHold=.24;
    if (this.enabled.recoil) { this.recoil.impulse(-300);this.bodyRecoil.impulse(BODY_MOTION.recoilImpulse); this.recoilEvents++;if(this.kneelAmount<.05)this.rearBrace.shot(this.walkAmount); }
    if (this.enabled.head) this.head.impulse(-6);
    if (this.enabled.hair) this.hair.impulse(11);
    if (this.enabled.cloth) this.cloth.impulse(4);
    if (this.enabled.cape) this.cape.impulse(5);
    return true;
  }
  hit() { this.head.impulse(45); this.hair.impulse(-65); this.cape.impulse(-65); }
  startReload() {
    if (this.reload || this.ammo === this.weapon.capacity) return false;
    this.reload = { t:0, empty:this.ammo===0, duration:this.ammo===0?this.weapon.reloadEmpty:this.weapon.reloadTactical };
    this.flash=0;this.pendingShot=false;this.preFire=0; return true;
  }
  advance(seconds) {
    this.accumulator += clamp(seconds,0,.1);
    while (this.accumulator+1e-9 >= STEP) { this.step(); this.accumulator-=STEP; }
  }
  step() {
    this.time+=STEP; this.cooldown=Math.max(0,this.cooldown-STEP); this.flash=Math.max(0,this.flash-STEP);this.aimHold=Math.max(0,this.aimHold-STEP);
    if (this.reload) {
      this.reload.t+=STEP;
      if (this.reload.t+1e-8 >= this.reload.duration) { this.ammo=this.weapon.capacity; this.reload=null; this.reloadCompletions++; }
    }
    if (this.trigger) this.requestFire();
    const target=this.walk?1:0;
    this.walkAmount+=(target-this.walkAmount)*(1-Math.exp(-STEP/.12));
    if(Math.abs(this.walkAmount-target)<1e-4)this.walkAmount=target;
    this.runAmount+=((this.run?1:0)-this.runAmount)*(1-Math.exp(-STEP/.18));
    const carryTarget=this.run?1:0,carryTime=this.run?HUMAN.runCarry.enterTime:HUMAN.runCarry.exitTime;
    this.runCarryAmount+=(carryTarget-this.runCarryAmount)*(1-Math.exp(-STEP/carryTime));
    if(Math.abs(this.runCarryAmount-carryTarget)<1e-4)this.runCarryAmount=carryTarget;
    const kneelTarget=this.kneel?1:0;
    this.kneelAmount+=(kneelTarget-this.kneelAmount)*(1-Math.exp(-STEP/.16));
    if(Math.abs(this.kneelAmount-kneelTarget)<1e-4)this.kneelAmount=kneelTarget;
    const relaxTarget=this.relaxed&&!this.walk&&!this.kneel?1:0;
    this.relaxAmount+=(relaxTarget-this.relaxAmount)*(1-Math.exp(-STEP/WEAPON_CARRY.relaxTime));
    if(Math.abs(this.relaxAmount-relaxTarget)<1e-4)this.relaxAmount=relaxTarget;
    const articulationEase=1-Math.exp(-STEP/.10);
    this.bendAngle+=(this.bendTarget-this.bendAngle)*articulationEase;
    this.bustAngle+=(this.bustTarget-this.bustAngle)*articulationEase;
    this.poseWaistOffset+=(this.poseWaistTarget-this.poseWaistOffset)*articulationEase;
    this.weaponDropOffset+=(this.weaponDropTarget-this.weaponDropOffset)*articulationEase;
    this.carryDrop+=(this.carryDropTarget-this.carryDrop)*articulationEase;
    this.kneelDrop+=(this.kneelDropTarget-this.kneelDrop)*articulationEase;
    for(const kind of ['standing','running'])this.fireWaistAngle[kind]+=(this.fireWaistTarget[kind]-this.fireWaistAngle[kind])*articulationEase;
    const aim=!this.reload&&(this.trigger||this.pendingShot||this.aimHold>0)?1:0;
    this.aimAmount+=(aim-this.aimAmount)*(1-Math.exp(-STEP/(aim?.035:.30)));
    const eyeAim=this.aimAmount*(1-this.runCarryAmount);
    this.cheekAmount+=(eyeAim-this.cheekAmount)*(1-Math.exp(-STEP/.025));
    if(this.pendingShot){
      this.preFire+=STEP;
      if(this.preFire+1e-8>=.12&&this.isFireReady()){this.pendingShot=false;this.fire();}
    }
    this.rearBrace.step(STEP,{aim:this.aimAmount,walking:this.walkAmount,enabled:this.enabled.recoil&&this.kneelAmount<.05});
    const profile=gaitProfile(this.runAmount),delta=STEP*profile.speed*this.walkAmount*(1-this.kneelAmount)*(this.reload ? .75 : 1);
    const speed=delta/STEP;
    // Acceleration leans into a start, deceleration settles back. Only the
    // fixed simulation step changes this spring; pose() stays read-only.
    this.moveDrive.impulse((speed-this.motionSpeed)*.008);this.moveDrive.step(STEP);this.motionSpeed=speed;
    this.distance+=delta;this.phase+=delta/(profile.speed*profile.period)*Math.PI*2;
    this.runFootContacts.step({phase:this.phase,amount:this.walkAmount,running:this.runAmount,kneeling:this.kneelAmount,distance:this.distance});
    for (const k of ['head','hair','cloth','cape','recoil']) { if (this.enabled[k]) this[k].step(STEP); else this[k].reset(); }
    if(this.enabled.recoil)this.bodyRecoil.step(STEP);else this.bodyRecoil.reset();
    this.capeMotion.step(STEP,{speed:delta/STEP,phase:this.phase,impulse:this.cape.x,enabled:this.enabled.cape});
    this.hairMotion.step(STEP,{speed:delta/STEP,phase:this.phase,impulse:this.hair.x,enabled:this.enabled.hair});
    const motion=this.bodyMotion(0);
    // Keep the fabric state advancing while hidden. Mask it only in pose(),
    // so toggling either way also compares the same instant while paused.
    this.outfitMotion.step(STEP,{amount:this.walkAmount,phase:this.phase,running:this.runAmount,
      breath:motion.breath,waist:motion.waist,impulse:this.cloth.x+motion.recoil*4});
  }
  bodyMotion(energy=this.motionEnergy){return bodyMotion({time:this.time,phase:this.phase,amount:this.walkAmount,running:this.runAmount,
    eyeAim:this.aimAmount*(1-this.runCarryAmount),kneeling:kneelWeight(this.kneelAmount),recoil:this.enabled.recoil?this.bodyRecoil.x:0,
    energy,drive:this.moveDrive.x});}
  pose() {
    const eyeAim=this.aimAmount*(1-this.runCarryAmount);
    const kneeling=kneelWeight(this.kneelAmount),brace=lerp(1,.55,kneeling);
    const r=this.reload,q=r?clamp(r.t/.25,0,1)*clamp((r.duration-r.t)/.25,0,1):0;
    const carryState=weaponCarry({running:this.runCarryAmount,relaxed:this.relaxAmount*(1-this.walkAmount)*(1-kneeling),aim:this.aimAmount,reload:q});
    const runPosture=this.runAmount*this.walkAmount*(1-kneeling);
    const pelvis=gaitBody(this.phase,this.walkAmount,this.time,this.aimAmount,this.runAmount,this.kneelAmount,eyeAim,this.recoil.x*.22*brace,this.motionEnergy);
    const rearBrace=this.rearBrace.pose(this.walkAmount),movingHips=this.walkAmount*(1-kneeling);
    const legRoots=[{x:lerp(8,LEG_SHAPE.movingHipX[0],movingHips),y:2*(1-movingHips)},
      {x:lerp(KNEEL.rearRootX,LEG_SHAPE.movingHipX[1],movingHips),y:0}];
    const feet=this.runFootContacts.feet.map((contact,layer)=>{
      let foot=energeticFoot(contact,this.walkAmount,this.runAmount,this.kneelAmount,this.motionEnergy);
      if(layer===1&&(rearBrace.x||rearBrace.lift))foot={...foot,...footPose(foot.trackX+rearBrace.x,foot.clearance+rearBrace.lift,foot.a+rearBrace.angle),stance:foot.stance&&rearBrace.lift<.01};
      return foot;
    });
    if((this.motionEnergy>0||movingHips>.001)&&kneeling<.999){
      // Bound the upward accent by BOTH rigid legs before building the torso
      // and weapon frames. Lower the pelvis just enough to retain foot reach;
      // never pull a planted boot off the floor or scale a limb to hide it.
      const reach=GAIT.thigh+GAIT.shin-GAIT.extensionReserve;
      for(let i=0;i<feet.length;i++){
        const root=transform(legRoots[i],{x:pelvis.x,y:0,a:pelvis.a}),dx=feet[i].x-root.x;
        pelvis.y=Math.max(pelvis.y,feet[i].y-Math.sqrt(Math.max(0,reach*reach-dx*dx))-root.y);
      }
    }
    const bob=pelvis.y-HUMAN.hipY;
    const motion=this.bodyMotion();
    // Per-action values replace the nominal firing waist angle. Existing load,
    // breathing, recoil and the common manual bend remain additive. Fade the
    // adjustment with actual preparation, not only the selected preview tab.
    const standingFire=this.aimAmount*(1-this.walkAmount)*(1-kneeling),runningFire=this.aimAmount*runPosture;
    const fireWaistOffset=standingFire*(this.fireWaistAngle.standing-(FIRING_FORM.standingLean-FIRING_FORM.pelvisTilt))
      +runningFire*(this.fireWaistAngle.running-RUN.lean);
    const lean=lerp(pelvis.lean,pelvis.a,carryState.rest)+fireWaistOffset+this.poseWaistOffset+this.recoil.x*.003*brace+this.bendAngle+motion.waist;
    const waist=waistFrame(pelvis,lean);
    const chestBase=chestFrame(waist,eyeAim,this.runAmount,kneeling);
    const chest={...transform({x:0,y:-motion.chestRise},chestBase),a:chestBase.a+motion.chestPitch};
    const torso={...transform({x:0,y:-(HUMAN.torsoAboveHip-WAIST.aboveHip-FIRING_FORM.chestAboveWaist)},chest),a:chest.a};
    const girdle=shoulderFrame(torso,eyeAim,this.runAmount,kneeling);
    const bust=bustFrame({waist,chest},HUMAN.heights.body_core*HUMAN.bodyAspect,HUMAN.heights.body_core,this.bustAngle);
    const bodyPoint=(x,y)=>transform({x,y},girdle),neckPoint=(x,y)=>transform({x,y},torso);
    const w=this.weapon;
    const carry=this.runCarryAmount;
    const seat=weaponSeat(eyeAim,carry,this.carryDrop,kneeling);
    seat.x=lerp(seat.x+carryState.run*WEAPON_CARRY.runSeatOffset.x,WEAPON_CARRY.restSeat.x,carryState.rest);
    seat.y=lerp(seat.y+carryState.run*WEAPON_CARRY.runSeatOffset.y,WEAPON_CARRY.restSeat.y,carryState.rest);
    const stockPocket=bodyPoint(seat.x,seat.y);
    const stockTarget=bodyPoint(seat.x,seat.y+q*7);
    // Kneeling rifle height is a world-vertical translation of the whole
    // weapon frame, independent of waist bend and horizontal muzzle pitch.
    const kneelWeaponDrop=this.kneelDrop*kneeling;
    const weaponHeightOffset=kneelWeaponDrop+this.weaponDropOffset;
    stockPocket.y+=weaponHeightOffset;stockTarget.y+=weaponHeightOffset;
    // Non-firing run and relaxed idle carry the muzzle down. Preparation
    // raises it fully before isFireReady() permits the first shot; firing,
    // shouldered idle and the other existing actions keep their level base.
    const angle=carryState.pitch+clamp(this.recoil.x*.012*lerp(1,.7,kneeling),-lerp(.0349,.012,runPosture),0)+q*.13;
    const stockOffset=transform({x:(w.stock.x-w.pivot.x)*w.width,y:(w.stock.y-w.pivot.y)*w.height},{x:0,y:0,a:angle});
    // Rotate about the selected body seat: shoulder when aiming, lower chest
    // while running. Arms, hands and muzzle sockets all follow this one frame.
    const weapon={x:stockTarget.x-stockOffset.x,y:stockTarget.y-stockOffset.y,a:angle};
    const socket=(p)=>transform({x:(p.x-w.pivot.x)*w.width,y:(p.y-w.pivot.y)*w.height},weapon);
    let weaponAdvance=0;
    const forwardWeight=runPosture*carry*(1-q)*(1-carryState.lowered);
    if(forwardWeight>.001){
      const armGoals=[['primary',HUMAN.primaryShoulder,w.primary,false],['support',HUMAN.supportShoulder,w.support,true]].map(([side,shoulder,grip,supportHand])=>{
        const root=bodyPoint(shoulder.x,shoulder.y),palm=socket(grip);
        const offset=transform(handOffset(supportHand,!!r),{x:0,y:0,a:angle+(supportHand?HUMAN.supportWristAngle:HUMAN.primaryWristAngle)});
        const lengths=r?{upper:HUMAN.upperArm,forearm:HUMAN.forearm}:formArmLengths(side,eyeAim,carry);
        return {root,wrist:{x:palm.x-offset.x,y:palm.y-offset.y},...lengths};
      });
      weaponAdvance=runningWeaponAdvance(forwardWeight,torso.a-pelvis.a,pelvis.y-HUMAN.hipY,armGoals);
      // Move the complete weapon frame along the direction of travel, before
      // computing grips, magazine, muzzle, hand IK or reload contacts. Height
      // and muzzle pitch remain independent of this horizontal correction.
      stockPocket.x+=weaponAdvance;stockTarget.x+=weaponAdvance;weapon.x+=weaponAdvance;
    }
    const primary=socket(w.primary), support=socket(w.support), mag=socket(w.mag);
    const magazineAngle=weapon.a+(w.magazineAngle??0);
    const reloadContact=r?reloadPose(r,{support,mag,bolt:socket({x:.37,y:.22}),pouch:transform({x:5,y:-16},pelvis),angle:weapon.a,magazineAngle}):null;
    const supportTarget=reloadContact?.hand??support;
    const magazine=reloadContact?.magazine??{...mag,a:magazineAngle},magazineVisible=reloadContact?.magazineVisible??true;
    const shoulderA=bodyPoint(HUMAN.primaryShoulder.x,HUMAN.primaryShoulder.y), shoulderB=bodyPoint(HUMAN.supportShoulder.x,HUMAN.supportShoulder.y);
    const handAngleA=weapon.a+HUMAN.primaryWristAngle,handAngleB=reloadContact?.hand.angle??weapon.a+HUMAN.supportWristAngle;
    const offsetA=transform(handOffset(),{x:0,y:0,a:handAngleA}),offsetB=transform(handOffset(true,!!r),{x:0,y:0,a:handAngleB});
    const wrist=(grip,offset)=>({x:grip.x-offset.x,y:grip.y-offset.y});
    const viewAmount=reloadContact?.viewAmount??0;
    const wristA=wrist(primary,offsetA),wristB=wrist(supportTarget,offsetB);
    const armA=r?ik2(shoulderA,wristA,HUMAN.upperArm,HUMAN.forearm,1):formArm(ik2,shoulderA,wristA,girdle,'primary',eyeAim,carry,kneeling);
    const armB=r?ik2(shoulderB,wristB,HUMAN.upperArm,HUMAN.forearm-6*viewAmount,1):formArm(ik2,shoulderB,wristB,girdle,'support',eyeAim,carry,kneeling);
    const palmA={x:armA.hand.x+offsetA.x,y:armA.hand.y+offsetA.y},palmB={x:armB.hand.x+offsetB.x,y:armB.hand.y+offsetB.y};
    const legs=[0,1].map(layer=>{
      const foot=feet[layer],root=transform(legRoots[layer],pelvis);
      // Both human knees flex toward the direction of travel. Layer/depth is
      // represented by draw order, not by giving the rear knee a reverse hinge.
      return {...ik2(root,foot,GAIT.thigh,GAIT.shin,-1),foot};
    });
    const kneeSupport={amount:kneeling,target:KNEEL.rearKnee,actual:legs[1].elbow,
      error:Math.hypot(legs[1].elbow.x-KNEEL.rearKnee.x,legs[1].elbow.y-KNEEL.rearKnee.y)};
    const cheek=(.25+.75*this.cheekAmount)*(1-carry)*(1-carryState.rest);
    const h=HUMAN.headRegistration;
    const usualHeadPitch=cheek*HUMAN.headAim.a+carry*HUMAN.runCarry.headCounterPitch;
    const headBodyMotion=lerp(pelvis.leanMotion,pelvis.angleMotion,carryState.rest)
      +this.recoil.x*.003*brace+motion.waist+motion.chestPitch;
    const steadyTorsoPitch=torso.a-headBodyMotion;
    // Counter only sustained running/manual lean. Current-step body pitch
    // reaches the head in full, with no lag or opposite bounce compensation.
    const forwardHeadPitch=-steadyTorsoPitch*h.rotationMix-this.head.x*.015*.85;
    let headAim={x:cheek*HUMAN.headAim.x,y:cheek*HUMAN.headAim.y,
      a:lerp(usualHeadPitch,forwardHeadPitch,runPosture)+(1-h.rotationMix)*headBodyMotion};
    let headAngle=torso.a*h.rotationMix+h.restAngle+this.head.x*.015+headAim.a;
    const sightLine=w.rearSight?{rear:socket(w.rearSight),front:socket(w.frontSight)}:null;
    ({headAim,headAngle}=kneelingHead(torso,headAim,headAngle,sightLine,kneeling*eyeAim*(1-q)));
    const headFrame={...neckPoint(h.anchor.x+headAim.x,h.anchor.y+headAim.y),a:headAngle};
    const eye=transform({x:(h.eye[0]-h.pivot[0])*HUMAN.headHeight*h.aspect,y:(h.eye[1]-h.pivot[1])*HUMAN.headHeight},headFrame);
    const eyeSightError=sightLine?(eye.y-sightLine.rear.y)*Math.cos(weapon.a)-(eye.x-sightLine.rear.x)*Math.sin(weapon.a):null;
    return { torso,pelvis,waist,chest,girdle,bust,bustPitch:this.bustAngle,bendAngle:this.bendAngle,bob,walkAmount:this.walkAmount, weapon, stockPocket,stockTarget, sockets:{stock:socket(w.stock),primary,support,mag,muzzle:socket(w.muzzle)}, armA,armB,palmA,palmB,handAngleA,handAngleB,supportTarget,legs,magazine,magazineVisible,reloadContact,supportArmBehind:!!r,rearBrace,
      supportHandKey:r?'support_hand':'support_hand_closed_grip',supportForearmKey:viewAmount>.15?'far_forearm_reload':'far_forearm',
      head:this.head.x,hair:this.hair.x,cloth:this.cloth.x,cape:this.cape.x,capePoints:this.capeMotion.points(this.motionEnergy*(1-kneeling)),aimAmount:this.aimAmount,
      bodyMotion:motion,hairPoints:this.hairMotion.points(this.motionEnergy*(1-kneeling)),outfit:{...(this.enabled.cloth?this.outfitMotion.pose(this.motionEnergy*(1-kneeling)):{waist:0,hem:0}),enabled:this.enabled.cloth,pelvisRelativeAngle:pelvis.a-torso.a},
      headAim,headAngle,headFrame,headBodyMotion,steadyTorsoPitch,eye,sightLine,eyeSightError,eyeAim,fireWaistOffset,runPosture,weaponAdvance,kneelWeaponDrop,weaponHeightOffset,carryState,runCarryAmount:carry,carryDrop:this.carryDrop,runAmount:this.runAmount,kneelAmount:this.kneelAmount,kneeSupport,
      gripError:Math.max(Math.hypot(palmA.x-primary.x,palmA.y-primary.y),Math.hypot(palmB.x-supportTarget.x,palmB.y-supportTarget.y)) };
  }
  snapshot() {
    const p=this.pose();return {seconds:this.time,shots:this.shots,recoilEvents:this.recoilEvents,ammo:this.ammo,reload:this.reload,reloadCompletions:this.reloadCompletions,weapon:this.weapon.id,gripError:p.gripError,facing:this.facing,pendingShot:this.pendingShot,preFire:this.preFire,
      articulation:{bend:this.bendAngle,bendTarget:this.bendTarget,bustPitch:this.bustAngle,bustTarget:this.bustTarget,carryDrop:this.carryDrop,carryDropTarget:this.carryDropTarget,kneelDrop:this.kneelDrop,kneelDropTarget:this.kneelDropTarget,fireWaist:{...this.fireWaistAngle},fireWaistTarget:{...this.fireWaistTarget}},
      stance:{running:this.runAmount,kneeling:this.kneelAmount,runCarry:this.runCarryAmount,relaxed:this.relaxAmount,eyeAim:p.eyeAim,weaponCarry:p.carryState},
      motionControls:{mode:this.controlMotion,settings:this.motionControls?{...this.motionControls}:null,waistOffset:this.poseWaistOffset,weaponDropOffset:this.weaponDropOffset},
      secondary:{body:p.bodyMotion,outfit:p.outfit,motionEnergy:this.motionEnergy,moveDrive:this.moveDrive.x},
      springs:Object.fromEntries(['head','hair','cloth','cape','recoil'].map(k=>[k,this[k].x]))};
  }
}
