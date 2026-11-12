import * as T from '../vendor/three-0.187.0/build/three.module.js';
import {group,mesh,box} from './geometry.js';
import {weatheredPaint} from './weathered-metal.js';

// Folded sheet: broad flat faces and sloping shoulders, not a row of separate bars.
function fold(x){const t=((x/.278)%1+1)%1;return t<.25?0:t<.4?(t-.25)/.15*.036:t<.75?.036:t<.9?(.9-t)/.15*.036:0;}
function sheet(width,height,seed,roof=false){
 const nx=Math.ceil(width/.278)*12,ny=Math.ceil(height/.14),p=[],uv=[],colors=[],indices=[];
 const dents=[[-width*.24,height*.44,.31,.032],[width*.28,height*.67,.23,.047]];
 for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
   const x=(i/nx-.5)*width,y=j/ny*height;let dent=0;
   for(const [cx,cy,r,d] of dents){const q=Math.hypot(x-cx-Math.sin(seed)*.12,(y-cy)*.9)/r;if(q<1)dent+=d*(1-q*q)**2;}
   const depth=fold(x+width/2)-dent;
   p.push(x,y,depth);uv.push(i/nx,j/ny);
   const groove=1-(.036-fold(x+width/2))/.036*.14;
   const dirt=(1-Math.min(1,y/.48))*.19;
   const variation=1+Math.sin(x*2.7+seed)*Math.sin(y*3.1)*.045;
   const shade=groove*(1-dirt)*variation*(roof?.92:1);
   colors.push(shade,shade*(1-dent*2),shade*(1-dent*3));
   if(i<nx&&j<ny){const a=j*(nx+1)+i;indices.push(a,a+1,a+nx+1,a+1,a+nx+2,a+nx+1);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function serialPlate(parent,text,x,y,z){
 const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');
 ctx.fillStyle='#263338';ctx.fillRect(0,0,512,128);ctx.fillStyle='#c7c6af';ctx.font='bold 38px monospace';ctx.fillText('VESPER / LOGISTICS',18,48);ctx.font='25px monospace';ctx.fillText(text,18,94);
 // Chipped stencil ink, deterministic and generated locally.
 ctx.fillStyle='rgba(30,39,42,.45)';for(let i=0;i<160;i++)ctx.fillRect((i*137)%512,(i*67)%128,2+(i%3),1);
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;
 const m=new T.MeshStandardMaterial({map:t,roughness:.72,metalness:0});
 const plate=mesh(parent,new T.PlaneGeometry(1.04,.26),m,x,y,z);plate.castShadow=false;
}
export function createContainers(scene,renderer,wet,metal){
 const root=group(scene);root.name='procedural-weathered-containers';
 const variants=[{x:-6.5,color:'#735044',seed:17},{x:0,color:'#42616b',seed:43},{x:6.5,color:'#62694b',seed:71}];
 for(const [index,variant] of variants.entries()){
   const body=group(root,variant.x,.04,-3.75),w=6.06,h=2.59,d=2.44;
   const paint=weatheredPaint(renderer,{...variant,wet});
   // Frame shares the damage maps but does not require panel vertex colors.
   const frame=paint.clone();frame.vertexColors=false;frame.onBeforeCompile=paint.onBeforeCompile;frame.customProgramCacheKey=paint.customProgramCacheKey;
   for(const side of [-1,1]){
     const panel=mesh(body,sheet(w-.18,h-.24,variant.seed+side),paint,0,.12,side*(d/2-.055));panel.rotation.y=side>0?0:Math.PI;
     for(const y of [.08,h-.07])box(body,w,.14,.13,frame,0,y,side*(d/2-.055),.012);
     for(const x of [-w/2+.06,w/2-.06])box(body,.12,h,.14,frame,x,h/2,side*(d/2-.055),.012);
   }
   const top=mesh(body,sheet(w-.15,d-.15,variant.seed,true),paint,0,h-.025,-d/2+.075);top.rotation.x=Math.PI/2;
   // The roof panel's outward normal must face up.
   top.rotation.x=-Math.PI/2;top.position.z=d/2-.075;
   const end=mesh(body,sheet(d-.18,h-.24,variant.seed+8),paint,-w/2+.035,.12,0);end.rotation.y=-Math.PI/2;
   for(const z of [-d/4,d/4]){
     const door=mesh(body,sheet(d/2-.10,h-.24,variant.seed+9),paint,w/2-.03,.12,z);door.rotation.y=Math.PI/2;
     for(const dz of [-.34,.34]){
       const rod=mesh(body,new T.CylinderGeometry(.017,.017,h-.3,8),metal,w/2+.045,h/2,z+dz);
       for(const y of [.26,1.25,h-.22])box(body,.09,.065,.07,frame,w/2+.045,y,z+dz,.006);
       box(body,.10,.038,.23,metal,w/2+.075,.95,z+dz+.08,.005);
     }
   }
   for(const x of [-w/2+.07,w/2-.07])for(const z of [-d/2+.07,d/2-.07])for(const y of [.09,h-.09]){
     box(body,.18,.18,.18,metal,x,y,z,.018);
     const hole=mesh(body,new T.CircleGeometry(.034,8),new T.MeshStandardMaterial({color:'#111719',roughness:.93}),x,y,z+Math.sign(z)*.092);hole.rotation.y=z>0?0:Math.PI;
   }
   box(body,.08,h-.14,d,frame,w/2-.03,h/2,0,.008);
   serialPlate(body,`VS ${String(470+index*17).padStart(4,'0')} / 22G1`,1.98,2.22,d/2+.008);
 }
 return root;
}
