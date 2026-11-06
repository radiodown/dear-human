// Local controls for existing art. Rigid armor stays outside the soft regions.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
function follow(node,target,hz,dt){
  const w=2*Math.PI*hz,x=node.angle-target,c=node.velocity+w*x,e=Math.exp(-w*dt);
  node.angle=target+(x+c*dt)*e;node.velocity=(node.velocity-w*c*dt)*e;
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
  points(){
    const points=[{x:0,y:0}],length=this.length/this.segments;
    for(const n of this.nodes){const p=points.at(-1);points.push({x:p.x+Math.sin(n.angle)*length,y:p.y+Math.cos(n.angle)*length});}
    return points;
  }
}
export class OutfitMotion {
  constructor(){this.waist={angle:0,velocity:0};this.hem={angle:0,velocity:0};}
  reset(){for(const n of [this.waist,this.hem])n.angle=n.velocity=0;}
  step(dt,{amount,phase,lean=0,impulse=0,enabled=true}){
    if(!enabled){this.reset();return;}
    // Lower garment follows the pelvis with a delay; the cuirass is untouched.
    follow(this.waist,amount*.010*Math.sin(phase)+impulse*.008,4.2,dt);
    follow(this.hem,amount*.035*Math.sin(phase-.6)+impulse*.012,3.8,dt);
  }
  pose(){return {waist:this.waist.angle,hem:this.hem.angle};}
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
