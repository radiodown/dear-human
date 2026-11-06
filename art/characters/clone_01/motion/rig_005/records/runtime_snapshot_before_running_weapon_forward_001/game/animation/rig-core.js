// Shared simulation for the library and the future game scene. Units are logical pixels.
import { WEAPONS } from './weapon-profiles.js';
import { GAIT, KNEEL, kneelWeight, gaitProfile, gaitBody, footPose, RearBrace, RunFootContacts } from './gait.js';
import { HUMAN, handOffset } from './proportions.js';
import { CapeMotion } from './cape.js';
import { HairMotion, OutfitMotion, BODY_MOTION, bodyMotion } from './secondary-motion.js';
import { reloadPose } from './reload-pose.js';
import { WAIST, waistFrame, bustFrame } from './waist.js';
import { MUZZLE_LIGHT } from './muzzle-light.js';
import { FIRING_FORM, chestFrame, shoulderFrame, weaponSeat, formArm } from './firing-form.js';
export { WEAPONS } from './weapon-profiles.js';
export const STEP = 1 / 120;
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
    this.enabled = { recoil:true, head:true, hair:true, cloth:true, cape:true };
    this.weapon = WEAPONS.m16_basic; this.ammo=30; this.time=0; this.shots=0; this.recoilEvents=0;
    this.cooldown=0; this.flash=0; this.phase=Math.PI*2*.36; this.facing=1; this.walk=false; this.trigger=false;
    this.reload=null; this.reloadCompletions=0; this.accumulator=0; this.rootX=0; this.distance=0;this.walkAmount=0;
    this.aimAmount=0;this.cheekAmount=0;this.aimHold=0;this.capeMotion=new CapeMotion();
    this.hairMotion=new HairMotion();this.outfitMotion=new OutfitMotion();
    this.rearBrace=new RearBrace();
    this.pendingShot=false;this.preFire=0;
    this.bendTarget=0;this.bendAngle=0;this.bustTarget=0;this.bustAngle=0;
    this.run=false;this.runAmount=0;this.kneel=false;this.kneelAmount=0;
    this.runCarryAmount=0;
    this.carryDropTarget=HUMAN.runCarry.drop;this.carryDrop=HUMAN.runCarry.drop;
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
  setBend(degrees,immediate=false){
    if(!Number.isFinite(degrees))return false;
    this.bendTarget=clamp(degrees,0,45)*Math.PI/180;
    if(immediate)this.bendAngle=this.bendTarget;
    return true;
  }
  setBustPitch(degrees,immediate=false){
    if(!Number.isFinite(degrees))return false;
    this.bustTarget=clamp(degrees,-5,5)*Math.PI/180;
    if(immediate)this.bustAngle=this.bustTarget;
    return true;
  }
  setRunCarryDrop(value,immediate=false){
    if(!Number.isFinite(value))return false;
    this.carryDropTarget=clamp(value,0,HUMAN.runCarry.maxDrop);
    if(immediate)this.carryDrop=this.carryDropTarget;
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
    const articulationEase=1-Math.exp(-STEP/.10);
    this.bendAngle+=(this.bendTarget-this.bendAngle)*articulationEase;
    this.bustAngle+=(this.bustTarget-this.bustAngle)*articulationEase;
    this.carryDrop+=(this.carryDropTarget-this.carryDrop)*articulationEase;
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
    this.distance+=delta;this.phase+=delta/(profile.speed*profile.period)*Math.PI*2;
    this.runFootContacts.step({phase:this.phase,amount:this.walkAmount,running:this.runAmount,kneeling:this.kneelAmount,distance:this.distance});
    for (const k of ['head','hair','cloth','cape','recoil']) { if (this.enabled[k]) this[k].step(STEP); else this[k].reset(); }
    if(this.enabled.recoil)this.bodyRecoil.step(STEP);else this.bodyRecoil.reset();
    this.capeMotion.step(STEP,{speed:delta/STEP,phase:this.phase,impulse:this.cape.x,enabled:this.enabled.cape});
    this.hairMotion.step(STEP,{speed:delta/STEP,phase:this.phase,impulse:this.hair.x,enabled:this.enabled.hair});
    const motion=this.bodyMotion();
    // Keep the fabric state advancing while hidden. Mask it only in pose(),
    // so toggling either way also compares the same instant while paused.
    this.outfitMotion.step(STEP,{amount:this.walkAmount,phase:this.phase,running:this.runAmount,
      breath:motion.breath,waist:motion.waist,impulse:this.cloth.x+motion.recoil*4});
  }
  bodyMotion(){return bodyMotion({time:this.time,phase:this.phase,amount:this.walkAmount,running:this.runAmount,
    eyeAim:this.aimAmount*(1-this.runCarryAmount),kneeling:kneelWeight(this.kneelAmount),recoil:this.enabled.recoil?this.bodyRecoil.x:0});}
  pose() {
    const eyeAim=this.aimAmount*(1-this.runCarryAmount);
    const kneeling=kneelWeight(this.kneelAmount),brace=lerp(1,.55,kneeling);
    const runPosture=this.runAmount*this.walkAmount*(1-kneeling);
    const pelvis=gaitBody(this.phase,this.walkAmount,this.time,this.aimAmount,this.runAmount,this.kneelAmount,eyeAim,this.recoil.x*.22*brace),bob=pelvis.y-HUMAN.hipY;
    const motion=this.bodyMotion();
    const lean=pelvis.lean+this.recoil.x*.003*brace+this.bendAngle+motion.waist;
    const waist=waistFrame(pelvis,lean);
    const chestBase=chestFrame(waist,eyeAim,this.runAmount);
    const chest={...transform({x:0,y:-motion.chestRise},chestBase),a:chestBase.a+motion.chestPitch};
    const torso={...transform({x:0,y:-(HUMAN.torsoAboveHip-WAIST.aboveHip-FIRING_FORM.chestAboveWaist)},chest),a:chest.a};
    const girdle=shoulderFrame(torso,eyeAim,this.runAmount);
    const bust=bustFrame({waist,chest},HUMAN.heights.body_core*HUMAN.bodyAspect,HUMAN.heights.body_core,this.bustAngle);
    const bodyPoint=(x,y)=>transform({x,y},girdle),neckPoint=(x,y)=>transform({x,y},torso);
    const r=this.reload, q=r?clamp(r.t/.25,0,1)*clamp((r.duration-r.t)/.25,0,1):0;
    const w=this.weapon;
    const carry=this.runCarryAmount;
    const seat=weaponSeat(eyeAim,carry,this.carryDrop);
    const stockPocket=bodyPoint(seat.x,seat.y);
    const stockTarget=bodyPoint(seat.x,seat.y+q*7);
    // Shoulder placement follows the leaning body; aim follows the target.
    // Running waist bend does not pitch the muzzle down. Keep the baseline
    // barrel horizontal, retaining a smaller shot kick and the reload release.
    const posturePitch=lerp(torso.a*.08+this.bendAngle*.72,0,runPosture);
    const angle=posturePitch+clamp(this.recoil.x*.012*lerp(1,.7,kneeling),-lerp(.0349,.012,runPosture),0)+q*.13;
    const stockOffset=transform({x:(w.stock.x-w.pivot.x)*w.width,y:(w.stock.y-w.pivot.y)*w.height},{x:0,y:0,a:angle});
    // Rotate about the selected body seat: shoulder when aiming, lower chest
    // while running. Arms, hands and muzzle sockets all follow this one frame.
    const weapon={x:stockTarget.x-stockOffset.x,y:stockTarget.y-stockOffset.y,a:angle};
    const socket=(p)=>transform({x:(p.x-w.pivot.x)*w.width,y:(p.y-w.pivot.y)*w.height},weapon);
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
    const armA=r?ik2(shoulderA,wristA,HUMAN.upperArm,HUMAN.forearm,1):formArm(ik2,shoulderA,wristA,girdle,'primary',eyeAim,carry);
    const armB=r?ik2(shoulderB,wristB,HUMAN.upperArm,HUMAN.forearm-6*viewAmount,1):formArm(ik2,shoulderB,wristB,girdle,'support',eyeAim,carry);
    const palmA={x:armA.hand.x+offsetA.x,y:armA.hand.y+offsetA.y},palmB={x:armB.hand.x+offsetB.x,y:armB.hand.y+offsetB.y};
    const rearBrace=this.rearBrace.pose(this.walkAmount);
    const legs=[0,1].map(layer=>{
      let foot=this.runFootContacts.feet[layer];
      if(layer===1&&(rearBrace.x||rearBrace.lift))foot={...foot,...footPose(foot.trackX+rearBrace.x,foot.clearance+rearBrace.lift,foot.a+rearBrace.angle),stance:foot.stance&&rearBrace.lift<.01};
      const root=transform({x:layer===0?8:KNEEL.rearRootX,y:layer===0?2:0},pelvis);
      // Both human knees flex toward the direction of travel. Layer/depth is
      // represented by draw order, not by giving the rear knee a reverse hinge.
      return {...ik2(root,foot,GAIT.thigh,GAIT.shin,-1),foot};
    });
    const kneeSupport={amount:kneeling,target:KNEEL.rearKnee,actual:legs[1].elbow,
      error:Math.hypot(legs[1].elbow.x-KNEEL.rearKnee.x,legs[1].elbow.y-KNEEL.rearKnee.y)};
    const cheek=(.25+.75*this.cheekAmount)*(1-carry);
    const h=HUMAN.headRegistration;
    const usualHeadPitch=cheek*HUMAN.headAim.a+carry*HUMAN.runCarry.headCounterPitch;
    // Counter the actual current torso pitch, including manual bend. Preserve
    // the source's forward-facing registration and only 15% of the shot nod.
    const forwardHeadPitch=-torso.a*h.rotationMix-this.head.x*.015*.85;
    const headAim={x:cheek*HUMAN.headAim.x,y:cheek*HUMAN.headAim.y,a:lerp(usualHeadPitch,forwardHeadPitch,runPosture)};
    const headAngle=torso.a*h.rotationMix+h.restAngle+this.head.x*.015+headAim.a;
    const eye=transform({x:(h.eye[0]-h.pivot[0])*HUMAN.headHeight*h.aspect,y:(h.eye[1]-h.pivot[1])*HUMAN.headHeight},
      {...neckPoint(h.anchor.x+headAim.x,h.anchor.y+headAim.y),a:headAngle});
    const sightLine=w.rearSight?{rear:socket(w.rearSight),front:socket(w.frontSight)}:null;
    const eyeSightError=sightLine?(eye.y-sightLine.rear.y)*Math.cos(weapon.a)-(eye.x-sightLine.rear.x)*Math.sin(weapon.a):null;
    return { torso,pelvis,waist,chest,girdle,bust,bustPitch:this.bustAngle,bendAngle:this.bendAngle,bob,walkAmount:this.walkAmount, weapon, stockPocket,stockTarget, sockets:{stock:socket(w.stock),primary,support,mag,muzzle:socket(w.muzzle)}, armA,armB,palmA,palmB,handAngleA,handAngleB,supportTarget,legs,magazine,magazineVisible,reloadContact,supportArmBehind:!!r,rearBrace,
      supportHandKey:r?'support_hand':'support_hand_closed_grip',supportForearmKey:viewAmount>.15?'far_forearm_reload':'far_forearm',
      head:this.head.x,hair:this.hair.x,cloth:this.cloth.x,cape:this.cape.x,capePoints:this.capeMotion.points(),aimAmount:this.aimAmount,
      bodyMotion:motion,hairPoints:this.hairMotion.points(),outfit:{...(this.enabled.cloth?this.outfitMotion.pose():{waist:0,hem:0}),enabled:this.enabled.cloth,pelvisRelativeAngle:pelvis.a-torso.a},
      headAim,headAngle,eye,sightLine,eyeSightError,eyeAim,runPosture,runCarryAmount:carry,carryDrop:this.carryDrop,runAmount:this.runAmount,kneelAmount:this.kneelAmount,kneeSupport,
      gripError:Math.max(Math.hypot(palmA.x-primary.x,palmA.y-primary.y),Math.hypot(palmB.x-supportTarget.x,palmB.y-supportTarget.y)) };
  }
  snapshot() {
    const p=this.pose();return {seconds:this.time,shots:this.shots,recoilEvents:this.recoilEvents,ammo:this.ammo,reload:this.reload,reloadCompletions:this.reloadCompletions,weapon:this.weapon.id,gripError:p.gripError,facing:this.facing,pendingShot:this.pendingShot,preFire:this.preFire,
      articulation:{bend:this.bendAngle,bendTarget:this.bendTarget,bustPitch:this.bustAngle,bustTarget:this.bustTarget,carryDrop:this.carryDrop,carryDropTarget:this.carryDropTarget},
      stance:{running:this.runAmount,kneeling:this.kneelAmount,runCarry:this.runCarryAmount,eyeAim:p.eyeAim},
      secondary:{body:p.bodyMotion,outfit:p.outfit},
      springs:Object.fromEntries(['head','hair','cloth','cape','recoil'].map(k=>[k,this[k].x]))};
  }
}
