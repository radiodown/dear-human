// Local controls for existing art. Rigid armor stays outside the soft regions.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
function follow(node,target,hz,dt){
  const w=2*Math.PI*hz,x=node.angle-target,c=node.velocity+w*x,e=Math.exp(-w*dt);
  node.angle=target+(x+c*dt)*e;node.velocity=(node.velocity-w*c*dt)*e;
}
export class HairMotion {
  constructor(length=88,segments=8){
    this.length=length;this.segments=segments;this.speed=0;
    this.nodes=Array.from({length:segments},()=>({angle:0,velocity:0}));
  }
  reset(){this.speed=0;for(const n of this.nodes)n.angle=n.velocity=0;}
  step(dt,{speed,phase,impulse=0,enabled=true}){
    if(!enabled){this.reset();return;}
    this.speed+=(Math.min(Math.abs(speed)/128,1.2)-this.speed)*(1-Math.exp(-dt/.18));
    this.nodes.forEach((node,i)=>{
      if(i===0){node.angle=node.velocity=0;return;}
      const free=i/(this.segments-1);
      const target=-.22*this.speed*free+.25*this.speed*free*Math.sin(phase*2-free*3.8)+impulse*.065*free;
      follow(node,target,4.2-2*free,dt);
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
    follow(this.waist,amount*(.035*Math.sin(phase)-lean*.28)+impulse*.012,3.8,dt);
    follow(this.hem,amount*.10*Math.sin(phase-1.1)+impulse*.02,2.6,dt);
  }
  pose(){return {waist:this.waist.angle,hem:this.hem.angle};}
}
function rotateOffset(x,y,angle){const c=Math.cos(angle),s=Math.sin(angle);return {x:c*x-s*y-x,y:s*x+c*y-y};}
export function outfitOffset(state,width,height,u,v){
  if(v<=.45)return {x:0,y:0}; // collar, chest, rigid breastplate
  const waist=state.waist*smooth(.45,.66,v);
  const d=rotateOffset((u-.46)*width,(v-.62)*height,waist);
  // Only the fabric below the hanging armor/pouches gets an extra soft bend.
  const h=rotateOffset((u-.46)*width,(v-.86)*height,state.hem*smooth(.86,1,v));
  return {x:d.x+h.x,y:d.y+h.y};
}
export function sleeveOffset(width,height,joints,bend,upper,u,v){
  const joint=upper?joints[1]:joints[0];
  const weight=upper?smooth(joint-.23,joint,v):1-smooth(joint,joint+.20,v);
  // Both sprite ends approach the same bisector around the actual elbow.
  // The upper shoulder plate and the long forearm bracer retain their shape.
  return rotateOffset((u-.5)*width,(v-joint)*height,clamp(bend,-1.35,1.35)*.5*weight);
}
