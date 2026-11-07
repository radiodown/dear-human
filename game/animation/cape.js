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
  points(energy=0){
    const points=[{x:0,y:0}],length=this.length/this.segments;
    for(const node of this.nodes){const p=points.at(-1),angle=node.angle*(1+.32*energy);points.push({x:p.x+Math.sin(angle)*length,y:p.y+Math.cos(angle)*length});}
    return points;
  }
}
export function capeOffset(points,height,u,v){
  const row=v*(points.length-1),i=Math.min(points.length-2,Math.floor(row)),a=points[i],b=points[i+1],f=row-i;
  return {x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f-v*height};
}

// Reuse the original cape UVs on a length-preserving hanging/floor ribbon.
// No simulation state is changed by rendering this surface. The floor portion
// turns its width into display depth and retains small visible creases at 0°.
export function groundedCapeSurface(p,binding,width){
  const torso=p.torso,a=torso.a*(binding.rotationMix??1),c=Math.cos(a),s=Math.sin(a);
  const anchor={x:torso.x+Math.cos(torso.a)*binding.x-Math.sin(torso.a)*binding.y,
    y:torso.y+Math.sin(torso.a)*binding.x+Math.cos(torso.a)*binding.y};
  const source=p.capePoints,local=(q)=>({x:anchor.x+c*q.x-s*(q.y-binding.pivot[1]*binding.height),
    y:anchor.y+s*q.x+c*(q.y-binding.pivot[1]*binding.height)});
  const nodes=[{...local(source[0]),ground:0}],floor=-.8;
  for(let i=1;i<source.length;i++){
    const before=local(source[i-1]),after=local(source[i]);
    const dx=after.x-before.x,dy=after.y-before.y,length=Math.hypot(dx,dy);
    const previous=nodes.at(-1),next={x:previous.x+dx,y:previous.y+dy,ground:0};
    if(next.y>floor){
      const rise=Math.max(0,Math.min(length,floor-previous.y));
      const travel=Math.sqrt(Math.max(0,length*length-rise*rise));
      next.x=previous.x-travel;next.y=previous.y+rise;
      next.ground=length?travel/length:1;
    }
    nodes.push(next);
  }
  return (u,v)=>{
    const row=v*(nodes.length-1),i=Math.min(nodes.length-2,Math.floor(row)),f=row-i;
    const left=nodes[i],right=nodes[i+1],ground=left.ground+(right.ground-left.ground)*f;
    const cross=(u-binding.pivot[0])*width,spread=Math.cos(ground*Math.PI/2);
    const free=Math.max(0,Math.min(1,(v-.2)/.8)),depth=-7*free*free*(3-2*free);
    const crease=ground*(.5+1.4*Math.sin(u*Math.PI*3+v*21)**2);
    return {x:left.x+(right.x-left.x)*f+c*cross*spread,
      y:left.y+(right.y-left.y)*f+s*cross*spread-crease,
      z:depth+Math.sin(ground*Math.PI/2)*cross};
  };
}
