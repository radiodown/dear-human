import * as T from '../vendor/three-0.187.0/build/three.module.js';

// Shared tetrahedral edges produce one connected surface at shoulder/hip branches.
// The source is an analytic field, never an encoded model or a stored vertex dump.
export function implicitSurface(field, bounds, cells) {
  const [lo,hi]=bounds,[nx,ny,nz]=cells,sx=nx+1,sy=ny+1;
  const step=hi.map((v,i)=>(v-lo[i])/cells[i]),count=sx*sy*(nz+1);
  const values=new Float32Array(count),grid=new Float32Array(count*3);
  const id=(x,y,z)=>x+sx*(y+sy*z);
  for(let z=0;z<=nz;z++)for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++){
    const k=id(x,y,z),p=[lo[0]+x*step[0],lo[1]+y*step[1],lo[2]+z*step[2]];
    grid.set(p,k*3);values[k]=field(...p);
  }
  const ps=[],indices=[],edges=new Map();
  const edge=(a,b)=>{
    const key=Math.min(a,b)*count+Math.max(a,b);if(edges.has(key))return edges.get(key);
    const f=values[a]/(values[a]-values[b]),k=ps.length/3;
    for(let c=0;c<3;c++)ps.push(grid[a*3+c]+(grid[b*3+c]-grid[a*3+c])*f);
    edges.set(key,k);return k;
  };
  const tri=(a,b,c,inside,outside)=>{
    const ax=ps[b*3]-ps[a*3],ay=ps[b*3+1]-ps[a*3+1],az=ps[b*3+2]-ps[a*3+2];
    const bx=ps[c*3]-ps[a*3],by=ps[c*3+1]-ps[a*3+1],bz=ps[c*3+2]-ps[a*3+2];
    const dx=grid[outside*3]-grid[inside*3],dy=grid[outside*3+1]-grid[inside*3+1],dz=grid[outside*3+2]-grid[inside*3+2];
    if((ay*bz-az*by)*dx+(az*bx-ax*bz)*dy+(ax*by-ay*bx)*dz<0)indices.push(a,c,b);else indices.push(a,b,c);
  };
  const tets=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
  for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
    const cube=[id(x,y,z),id(x+1,y,z),id(x+1,y+1,z),id(x,y+1,z),id(x,y,z+1),id(x+1,y,z+1),id(x+1,y+1,z+1),id(x,y+1,z+1)];
    let negative=0;for(const k of cube)negative+=values[k]<0;if(!negative||negative===8)continue;
    for(const tet of tets){
      const ins=[],outs=[];for(const j of tet)(values[cube[j]]<0?ins:outs).push(cube[j]);
      if(!ins.length||!outs.length)continue;
      if(ins.length===1){const a=ins[0];tri(edge(a,outs[0]),edge(a,outs[1]),edge(a,outs[2]),a,outs[0]);}
      else if(outs.length===1){const b=outs[0];tri(edge(ins[0],b),edge(ins[1],b),edge(ins[2],b),ins[0],b);}
      else{const [a,b]=ins,[c,d]=outs,p=edge(a,c),q=edge(a,d),r=edge(b,c),s=edge(b,d);tri(p,q,r,a,c);tri(q,s,r,a,c);}
    }
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(ps,3));g.setIndex(indices);g.computeVertexNormals();return g;
}

// Ring sweeps for gloves, lips and hair; radii are metres and may be asymmetric.
export function sweep(points,radii,segments=12,steps=28,flatten=1){
  const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),frames=curve.computeFrenetFrames(steps,false);
  const ps=[],uv=[],ix=[];
  for(let j=0;j<=steps;j++){
    const t=j/steps,p=curve.getPointAt(t),u=t*(radii.length-1),k=Math.min(radii.length-2,Math.floor(u)),r=T.MathUtils.lerp(radii[k],radii[k+1],u-k);
    for(let i=0;i<=segments;i++){
      const a=i/segments*Math.PI*2,v=p.clone().addScaledVector(frames.normals[j],Math.cos(a)*r).addScaledVector(frames.binormals[j],Math.sin(a)*r*flatten);
      ps.push(v.x,v.y,v.z);uv.push(i/segments,t);
      if(j<steps&&i<segments){const n=j*(segments+1)+i;ix.push(n,n+1,n+segments+1,n+1,n+segments+2,n+segments+1);}
    }
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(ps,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();
  // Weld shading across the UV seam without welding texture coordinates.
  const n=g.attributes.normal;
  for(let j=0;j<=steps;j++){const a=j*(segments+1),b=a+segments,v=new T.Vector3().fromBufferAttribute(n,a).add(new T.Vector3().fromBufferAttribute(n,b)).normalize();n.setXYZ(a,v.x,v.y,v.z);n.setXYZ(b,v.x,v.y,v.z);}
  return g;
}
