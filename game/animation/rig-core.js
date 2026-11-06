// Shared simulation for the library and the future game scene. Units are logical pixels.
import { WEAPONS } from './weapon-profiles.js';
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
    this.v += (-w*w*this.x - 2*this.damping*w*this.v)*dt;
    this.x = clamp(this.x+this.v*dt, -this.limit, this.limit);
    if (Math.abs(this.x) >= this.limit && this.x*this.v > 0) this.v = 0;
  }
  reset() { this.x = this.v = 0; }
}
export class CharacterRig {
  constructor() {
    this.head = new Spring(6,.8,1.3); this.hair = new Spring(4.5,.65,3);
    this.cloth = new Spring(5.5,.65,1.2); this.cape = new Spring(3,.75,5);
    this.recoil = new Spring(16,.85,4);
    this.enabled = { recoil:true, head:true, hair:true, cloth:true, cape:true };
    this.weapon = WEAPONS.m16_basic; this.ammo=30; this.time=0; this.shots=0; this.recoilEvents=0;
    this.cooldown=0; this.flash=0; this.phase=0; this.facing=1; this.walk=false; this.trigger=false;
    this.reload=null; this.reloadCompletions=0; this.accumulator=0; this.rootX=0; this.distance=0;
  }
  equip(id) {
    if (!WEAPONS[id]) throw new Error(`Unknown weapon: ${id}`);
    if (this.reload) return false;
    this.weapon = WEAPONS[id]; return true; // no character texture or rig replacement
  }
  turn() { this.facing *= -1; for (const k of ['head','hair','cloth','cape']) this[k].reset(); }
  setWalking(value) {
    if (this.walk !== value) { this.hair.impulse(value ? 36 : -36); this.cape.impulse(value ? 55 : -55); }
    this.walk = value;
  }
  fire() {
    if (this.reload || this.cooldown > 1e-7) return false;
    if (!this.ammo) { this.startReload(); return false; }
    this.ammo--; this.shots++; this.cooldown=this.weapon.fireInterval; this.flash=.055;
    if (this.enabled.recoil) { this.recoil.impulse(-500); this.recoilEvents++; }
    if (this.enabled.head) this.head.impulse(-45);
    if (this.enabled.hair) this.hair.impulse(70);
    if (this.enabled.cloth) this.cloth.impulse(25);
    if (this.enabled.cape) this.cape.impulse(40);
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
    this.time+=STEP; this.cooldown=Math.max(0,this.cooldown-STEP); this.flash=Math.max(0,this.flash-STEP);
    if (this.reload) {
      this.reload.t+=STEP;
      if (this.reload.t+1e-8 >= this.reload.duration) { this.ammo=this.weapon.capacity; this.reload=null; this.reloadCompletions++; }
    }
    if (this.trigger) this.fire();
    if (this.walk) { this.phase+=STEP*7.5; this.distance+=STEP*48*(this.reload ? .75 : 1); }
    for (const k of ['head','hair','cloth','cape','recoil']) { if (this.enabled[k]) this[k].step(STEP); else this[k].reset(); }
  }
  pose() {
    const bob=this.walk?Math.cos(this.phase*2)*1.1:Math.sin(this.time*Math.PI*.5)*.35;
    const torso={x:-1+this.recoil.x*.20,y:-224+bob};
    const r=this.reload, q=r?clamp(r.t/.25,0,1)*clamp((r.duration-r.t)/.25,0,1):0;
    const weapon={x:torso.x-8+this.recoil.x,y:torso.y+22+q*9,a:clamp(-this.recoil.x*.009,0,.0349)+q*.16};
    const w=this.weapon;
    const socket=(p)=>transform({x:(p.x-w.pivot.x)*w.width,y:(p.y-w.pivot.y)*w.height},weapon);
    const primary=socket(w.primary), support=socket(w.support), mag=socket(w.mag);
    let supportTarget=support, magOffset=0, magazineVisible=true;
    if (r) {
      const t=r.t;
      if(t<.25) {const v=t/.25;supportTarget={x:lerp(support.x,mag.x,v),y:lerp(support.y,mag.y+8,v)};}
      else if(t<1.25) {magOffset= Math.sin((t-.25)*Math.PI)*8;supportTarget={x:mag.x-8*Math.sin((t-.25)*Math.PI),y:mag.y+8+magOffset};magazineVisible=t<.60||t>.90;}
      else if(r.empty&&t<2.2) {supportTarget=socket({x:.37,y:.22});}
      else {const start=r.empty?2.2:1.25;const v=clamp((t-start)/.3,0,1);supportTarget={x:lerp(mag.x,support.x,v),y:lerp(mag.y+8,support.y,v)};}
    }
    const shoulderA={x:torso.x+1,y:torso.y-5}, shoulderB={x:torso.x-10,y:torso.y-3};
    const armA=ik2(shoulderA,primary,38,38,1), armB=ik2(shoulderB,supportTarget,40,40,1);
    const legs=[-1,1].map(side=>{
      const stride=this.walk?Math.sin(this.phase+(side===1?0:Math.PI)):0;
      const foot={x:side*9+stride*21,y:-8-Math.max(0,-stride)*9};
      return ik2({x:side*9,y:-126+bob},foot,58,62,-side);
    });
    return { torso, bob, weapon, sockets:{primary,support,mag,muzzle:socket(w.muzzle)}, armA,armB,legs,magOffset,magazineVisible,
      head:this.head.x,hair:this.hair.x,cloth:this.cloth.x,cape:this.cape.x,gripError:Math.max(armA.error,armB.error) };
  }
  snapshot() {
    const p=this.pose();return {seconds:this.time,shots:this.shots,recoilEvents:this.recoilEvents,ammo:this.ammo,reload:this.reload,reloadCompletions:this.reloadCompletions,weapon:this.weapon.id,gripError:p.gripError,facing:this.facing,springs:Object.fromEntries(['head','hair','cloth','cape','recoil'].map(k=>[k,this[k].x]))};
  }
}
