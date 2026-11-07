// Local controls for existing art. Rigid armor stays outside the soft regions.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
function follow(node,target,hz,dt){
  const w=2*Math.PI*hz,x=node.angle-target,c=node.velocity+w*x,e=Math.exp(-w*dt);
  node.angle=target+(x+c*dt)*e;node.velocity=(node.velocity-w*c*dt)*e;
}
// Additive joint motion, shared by the game rig and its preview. Keep the
// pelvis/foot solution intact and move the rigid chest through its own frame.
export const BODY_MOTION=Object.freeze({breathPeriod:3.8,breathWaist:.014,breathChest:.005,breathRise:.70,
  walkWaist:.008,runWaist:.010,recoilHz:3.8,recoilDamping:.72,recoilLimit:.030,recoilImpulse:-.65});
export function bodyMotion({time,phase,amount=0,running=0,eyeAim=0,kneeling=0,recoil=0,energy=0,drive=0}){
  const breath=Math.sin(time*Math.PI*2/BODY_MOTION.breathPeriod);
  const breathing=(1-.48*amount)*(1-.45*eyeAim);
  const stride=amount*(1-.42*eyeAim)*(1-.85*kneeling)*(
    (BODY_MOTION.walkWaist+(BODY_MOTION.runWaist-BODY_MOTION.walkWaist)*running)*Math.sin(phase-.28)
    +(.004+.002*running)*Math.sin(phase*2-.55));
  const mobile=amount*(1-.55*eyeAim)*(1-kneeling)*energy;
  const followThrough=mobile*((.010+.008*running)*Math.sin(phase-.50)+.004*Math.sin(phase*2-.85));
  const weightShift=drive*energy*(1-kneeling)*(1-.4*eyeAim);
  const kick=recoil*(1-.45*kneeling)*(1+.45*energy*(1-kneeling));
  return {breath,waist:breath*BODY_MOTION.breathWaist*breathing+stride+followThrough+weightShift+kick,
    chestPitch:breath*BODY_MOTION.breathChest*breathing-stride*.20-followThrough*.40-weightShift*.25+kick*.22,
    // Grounded pelvis motion already supplies the step's vertical movement.
    // Keep slow breathing, without a second out-of-phase chest bounce.
    chestRise:breath*BODY_MOTION.breathRise*breathing,recoil:kick};
}
export class HairMotion {
  constructor(length=88,segments=8){
    this.length=length;this.segments=segments;this.speed=0;this.pinnedSegments=5;
    this.nodes=Array.from({length:segments},()=>({angle:0,velocity:0}));
  }
  reset(){this.speed=0;for(const n of this.nodes)n.angle=n.velocity=0;}
  step(dt,{speed,phase,impulse=0,enabled=true}){
    if(!enabled){this.reset();return;}
    this.speed+=(Math.min(Math.abs(speed)/128,1.2)-this.speed)*(1-Math.exp(-dt/.18));
    this.nodes.forEach((node,i)=>{
      if(i<this.pinnedSegments){node.angle=node.velocity=0;return;}
      const free=(i-this.pinnedSegments+1)/(this.segments-this.pinnedSegments);
      // Keep the scalp-to-shoulder silhouette still. Only the lower ends move,
      // always behind the shoulder, with no forward whip across the pauldron.
      const target=clamp(-.115*this.speed*free+.035*this.speed*free*Math.sin(phase*2-free*2.5)+impulse*.018*free,-.18,0);
      follow(node,target,4.5-free,dt);
      node.angle=clamp(node.angle,-.18,0);
    });
  }
  points(energy=0){
    const points=[{x:0,y:0}],length=this.length/this.segments;
    for(const n of this.nodes){const p=points.at(-1),angle=clamp(n.angle*(1+.5*energy),-.30,0);points.push({x:p.x+Math.sin(angle)*length,y:p.y+Math.cos(angle)*length});}
    return points;
  }
}
export class OutfitMotion {
  constructor(){this.waist={angle:0,velocity:0};this.hem={angle:0,velocity:0};}
  reset(){for(const n of [this.waist,this.hem])n.angle=n.velocity=0;}
  step(dt,{amount,phase,running=0,breath=0,waist=0,impulse=0,enabled=true}){
    if(!enabled){this.reset();return;}
    // Cloth lags the breathing/waist and step rhythm. The rigid cuirass and
    // upper skirt belt are outside these local fabric controls.
    follow(this.waist,amount*(.014+.008*running)*Math.sin(phase-.45)+breath*.004-waist*.20+impulse*.030,3.6,dt);
    follow(this.hem,amount*(.065+.035*running)*Math.sin(phase-.85)+breath*.022-waist*.60+impulse*.075,3.0,dt);
  }
  pose(energy=0){return {waist:this.waist.angle*(1+.35*energy),hem:this.hem.angle*(1+.55*energy)};}
}
function rotateOffset(x,y,angle){const c=Math.cos(angle),s=Math.sin(angle);return {x:c*x-s*y-x,y:s*x+c*y-y};}
export function outfitOffset(state,width,height,u,v){
  if(v<=.45)return {x:0,y:0}; // collar, chest, rigid breastplate
  // The lower outfit and the thigh roots share ONE pelvis transform. Blend
  // through the waist; don't swing an unrelated skirt control over the hips.
  const angle=(state.pelvisRelativeAngle??0)*smooth(.45,.72,v);
  const d=rotateOffset((u-.46)*width,(v-.88)*height,angle);
  const waist=state.waist*smooth(.45,.58,v)*(1-smooth(.58,.72,v));
  const w=rotateOffset((u-.46)*width,(v-.62)*height,waist);
  const h=rotateOffset((u-.46)*width,(v-.92)*height,state.hem*smooth(.92,1,v));
  return {x:d.x+w.x+h.x,y:d.y+w.y+h.y};
}
export function sleeveOffset(width,height,joints,bend,upper,u,v){
  const joint=upper?joints[1]:joints[0];
  const weight=upper?smooth(joint-.23,joint,v):1-smooth(joint,joint+.20,v);
  // Both sprite ends approach the same bisector around the actual elbow.
  // The upper shoulder plate and the long forearm bracer retain their shape.
  return rotateOffset((u-.5)*width,(v-joint)*height,clamp(bend,-1.35,1.35)*.5*weight);
}
