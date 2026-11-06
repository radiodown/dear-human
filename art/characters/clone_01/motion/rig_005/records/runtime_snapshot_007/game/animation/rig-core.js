// Shared simulation for the library and the future game scene. Units are logical pixels.
import { WEAPONS } from './weapon-profiles.js';
import { GAIT, gaitBody, gaitFoot } from './gait.js';
import { HUMAN, handOffset } from './proportions.js';
import { CapeMotion } from './cape.js';
import { HairMotion, OutfitMotion } from './secondary-motion.js';
import { reloadPose } from './reload-pose.js';
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
    this.enabled = { recoil:true, head:true, hair:true, cloth:true, cape:true };
    this.weapon = WEAPONS.m16_basic; this.ammo=30; this.time=0; this.shots=0; this.recoilEvents=0;
    this.cooldown=0; this.flash=0; this.phase=Math.PI*2*.36; this.facing=1; this.walk=false; this.trigger=false;
    this.reload=null; this.reloadCompletions=0; this.accumulator=0; this.rootX=0; this.distance=0;this.walkAmount=0;
    this.aimAmount=0;this.cheekAmount=0;this.aimHold=0;this.capeMotion=new CapeMotion();
    this.hairMotion=new HairMotion();this.outfitMotion=new OutfitMotion();
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
  }
  fire() {
    if (this.reload || this.cooldown > 1e-7) return false;
    if (!this.ammo) { this.startReload(); return false; }
    this.ammo--; this.shots++; this.cooldown=this.weapon.fireInterval; this.flash=.055;this.aimHold=.24;
    if (this.enabled.recoil) { this.recoil.impulse(-300); this.recoilEvents++; }
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
    this.flash=0; return true;
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
    if (this.trigger) this.fire();
    const target=this.walk?1:0;
    this.walkAmount+=(target-this.walkAmount)*(1-Math.exp(-STEP/.12));
    if(Math.abs(this.walkAmount-target)<1e-4)this.walkAmount=target;
    const aim=!this.reload&&(this.trigger||this.aimHold>0)?1:0;
    this.aimAmount+=(aim-this.aimAmount)*(1-Math.exp(-STEP/(aim?.18:.30)));
    this.cheekAmount+=(this.aimAmount-this.cheekAmount)*(1-Math.exp(-STEP/.09));
    const delta=STEP*GAIT.speed*this.walkAmount*(this.reload ? .75 : 1);
    this.distance+=delta;this.phase+=delta/(GAIT.speed*GAIT.period)*Math.PI*2;
    for (const k of ['head','hair','cloth','cape','recoil']) { if (this.enabled[k]) this[k].step(STEP); else this[k].reset(); }
    this.capeMotion.step(STEP,{speed:delta/STEP,phase:this.phase,impulse:this.cape.x,enabled:this.enabled.cape});
    this.hairMotion.step(STEP,{speed:delta/STEP,phase:this.phase,impulse:this.hair.x,enabled:this.enabled.hair});
    const body=gaitBody(this.phase,this.walkAmount,this.time,this.aimAmount);
    this.outfitMotion.step(STEP,{amount:this.walkAmount,phase:this.phase,lean:body.lean,impulse:this.cloth.x,enabled:this.enabled.cloth});
  }
  pose() {
    const pelvis=gaitBody(this.phase,this.walkAmount,this.time,this.aimAmount),bob=pelvis.y-HUMAN.hipY;
    const lean=pelvis.lean+this.recoil.x*.003;
    const torso={...transform({x:0,y:-HUMAN.torsoAboveHip},{x:pelvis.x+this.recoil.x*.22,y:pelvis.y,a:lean}),a:lean};
    const bodyPoint=(x,y)=>transform({x,y},torso);
    const r=this.reload, q=r?clamp(r.t/.25,0,1)*clamp((r.duration-r.t)/.25,0,1):0;
    const w=this.weapon;
    const stockPocket=bodyPoint(HUMAN.stockPocket.x,HUMAN.stockPocket.y);
    const stockTarget=bodyPoint(HUMAN.stockPocket.x,HUMAN.stockPocket.y+q*7);
    // Shoulder placement follows the leaning body; aim follows the target.
    const angle=torso.a*.08+clamp(this.recoil.x*.012,-.0349,0)+q*.13;
    const stockOffset=transform({x:(w.stock.x-w.pivot.x)*w.width,y:(w.stock.y-w.pivot.y)*w.height},{x:0,y:0,a:angle});
    // Rotate around the seated buttstock. Recoil moves the shoulder and torso
    // together, rather than sliding an independently translated rifle through it.
    const weapon={x:stockTarget.x-stockOffset.x,y:stockTarget.y-stockOffset.y,a:angle};
    const socket=(p)=>transform({x:(p.x-w.pivot.x)*w.width,y:(p.y-w.pivot.y)*w.height},weapon);
    const primary=socket(w.primary), support=socket(w.support), mag=socket(w.mag);
    const reloadContact=r?reloadPose(r,{support,mag,bolt:socket({x:.37,y:.22}),pouch:bodyPoint(12,52),angle:weapon.a}):null;
    const supportTarget=reloadContact?.hand??support;
    const magazine=reloadContact?.magazine??mag,magazineVisible=reloadContact?.magazineVisible??true;
    const shoulderA=bodyPoint(HUMAN.primaryShoulder.x,HUMAN.primaryShoulder.y), shoulderB=bodyPoint(HUMAN.supportShoulder.x,HUMAN.supportShoulder.y);
    const handAngleA=weapon.a+HUMAN.primaryWristAngle,handAngleB=reloadContact?.hand.angle??weapon.a+HUMAN.supportWristAngle;
    const offsetA=transform(handOffset(),{x:0,y:0,a:handAngleA}),offsetB=transform(handOffset(true),{x:0,y:0,a:handAngleB});
    const wrist=(grip,offset)=>({x:grip.x-offset.x,y:grip.y-offset.y});
    const armA=ik2(shoulderA,wrist(primary,offsetA),HUMAN.upperArm,HUMAN.forearm,1), armB=ik2(shoulderB,wrist(supportTarget,offsetB),HUMAN.upperArm,HUMAN.forearm,1);
    const palmA={x:armA.hand.x+offsetA.x,y:armA.hand.y+offsetA.y},palmB={x:armB.hand.x+offsetB.x,y:armB.hand.y+offsetB.y};
    const legs=[0,1].map(layer=>{
      const foot=gaitFoot(this.phase,layer,this.walkAmount);
      const root={x:pelvis.x+(layer===0?8:-4),y:pelvis.y+(layer===0?2:0)};
      // Both human knees flex toward the direction of travel. Layer/depth is
      // represented by draw order, not by giving the rear knee a reverse hinge.
      return {...ik2(root,foot,GAIT.thigh,GAIT.shin,-1),foot};
    });
    return { torso,pelvis,bob,walkAmount:this.walkAmount, weapon, stockPocket,stockTarget, sockets:{stock:socket(w.stock),primary,support,mag,muzzle:socket(w.muzzle)}, armA,armB,palmA,palmB,handAngleA,handAngleB,supportTarget,legs,magazine,magazineVisible,reloadContact,
      head:this.head.x,hair:this.hair.x,cloth:this.cloth.x,cape:this.cape.x,capePoints:this.capeMotion.points(),aimAmount:this.aimAmount,
      hairPoints:this.hairMotion.points(),outfit:this.outfitMotion.pose(),
      headAim:{x:this.cheekAmount*2,y:this.cheekAmount*2.5,a:this.cheekAmount*.04},
      gripError:Math.max(Math.hypot(palmA.x-primary.x,palmA.y-primary.y),Math.hypot(palmB.x-supportTarget.x,palmB.y-supportTarget.y)) };
  }
  snapshot() {
    const p=this.pose();return {seconds:this.time,shots:this.shots,recoilEvents:this.recoilEvents,ammo:this.ammo,reload:this.reload,reloadCompletions:this.reloadCompletions,weapon:this.weapon.id,gripError:p.gripError,facing:this.facing,springs:Object.fromEntries(['head','hair','cloth','cape','recoil'].map(k=>[k,this[k].x]))};
  }
}
