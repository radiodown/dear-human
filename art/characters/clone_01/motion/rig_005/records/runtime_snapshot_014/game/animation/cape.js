// Ten length-preserving strips with a fixed shoulder section. This is a small
// procedural cloth rig, not a collision-aware fabric or 3D cloth simulation.
export class CapeMotion {
  constructor(length=235,segments=10){
    this.length=length;this.segments=segments;this.speed=0;
    this.nodes=Array.from({length:segments},()=>({angle:0,velocity:0}));
  }
  reset(){this.speed=0;for(const node of this.nodes)node.angle=node.velocity=0;}
  step(dt,{speed,phase,impulse=0,enabled=true}){
    if(!enabled){this.reset();return;}
    // Filter wind so release and direction changes do not snap the hem upright.
    this.speed+=(Math.min(Math.abs(speed)/128,1.2)-this.speed)*(1-Math.exp(-dt/.24));
    this.nodes.forEach((node,i)=>{
      const v=(i+1)/this.segments;
      if(i<2){node.angle=node.velocity=0;return;}
      const free=(v-.2)/.8;
      const target=-.38*this.speed*free**.7
        +.15*this.speed*free*Math.sin(phase*2-free*4.3)
        +impulse*.035*free;
      const w=2*Math.PI*(3.1-1.5*free),x=node.angle-target;
      const c=node.velocity+w*x,e=Math.exp(-w*dt);
      node.angle=target+(x+c*dt)*e;
      node.velocity=(node.velocity-w*c*dt)*e;
    });
  }
  points(){
    const points=[{x:0,y:0}],length=this.length/this.segments;
    for(const node of this.nodes){const p=points.at(-1);points.push({x:p.x+Math.sin(node.angle)*length,y:p.y+Math.cos(node.angle)*length});}
    return points;
  }
}
export function capeOffset(points,height,u,v){
  const row=v*(points.length-1),i=Math.min(points.length-2,Math.floor(row)),a=points[i],b=points[i+1],f=row-i;
  return {x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f-v*height};
}
