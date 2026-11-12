import * as T from '../vendor/three-0.187.0/build/three.module.js';
export const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
export function mesh(parent,g,m,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
export function group(p,x=0,y=0,z=0){const o=new T.Group();o.position.set(x,y,z);p.add(o);return o;}
const boxes=new Map();
export function bevelGeometry(w,h,d,r=Math.min(w,h,d)*.15){
  const key=[w,h,d,r].join(',');if(boxes.has(key))return boxes.get(key);
  r=Math.max(.0001,Math.min(r,Math.min(w,h,d)*.45));
  const a=w/2-r,b=h/2-r,s=new T.Shape();s.moveTo(-a,-b);s.lineTo(a,-b);s.lineTo(a,b);s.lineTo(-a,b);s.closePath();
  const g=new T.ExtrudeGeometry(s,{depth:d-2*r,bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:2,steps:1});g.translate(0,0,-d/2+r);boxes.set(key,g);return g;
}
export function box(p,w,h,d,m,x=0,y=0,z=0,r){return mesh(p,bevelGeometry(w,h,d,r),m,x,y,z);}
export function oval(p,w,h,d,m,x=0,y=0,z=0){const o=mesh(p,new T.SphereGeometry(1,28,20),m,x,y,z);o.scale.set(w,h,d);return o;}
export function tube(p,points,r,m,segments=32){return mesh(p,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v=>V(...v))),segments,r,6,false),m);}
// Smooth elliptical cross sections; dimensions authored as shape parameters, not model dumps.
export function loft(rings,segments=32,steps=36,deform){
  const curve=new T.CatmullRomCurve3(rings.map(([y,x,z])=>V(x,y,z))),ps=[],uv=[],ids=[];
  for(let j=0;j<=steps;j++){const t=j/steps,q=curve.getPoint(t);for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2;let x=q.x*Math.sin(a),y=q.y,z=q.z*Math.cos(a);if(deform)[x,y,z]=deform(x,y,z,a,t);ps.push(x,y,z);uv.push(i/segments,t);if(j<steps&&i<segments){const k=j*(segments+1)+i;ids.push(k,k+1,k+segments+1,k+1,k+segments+2,k+segments+1);}}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(ps,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ids);g.computeVertexNormals();return g;
}
export function panel(p,points,depth,m,x=0,y=0,z=0){const s=new T.Shape(points.map(v=>new T.Vector2(...v)));const g=new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:.003,bevelThickness:.003,bevelSegments:2,steps:1});g.translate(0,0,-depth/2);return mesh(p,g,m,x,y,z);}
