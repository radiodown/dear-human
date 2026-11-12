import * as T from '../vendor/three-0.187.0/build/three.module.js';

const clamp=x=>Math.max(0,Math.min(1,x));
const mix=(a,b,t)=>a+(b-a)*t;
function hash(x,y,seed){let n=Math.imul(x,374761393)^Math.imul(y,668265263)^seed;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
function noise(x,y,seed){const ix=Math.floor(x),iy=Math.floor(y);let u=x-ix,v=y-iy;u=u*u*(3-2*u);v=v*v*(3-2*v);return mix(mix(hash(ix,iy,seed),hash(ix+1,iy,seed),u),mix(hash(ix,iy+1,seed),hash(ix+1,iy+1,seed),u),v);}

// One-time JS texture synthesis. All maps share the same damage mask; no image assets.
export function weatheredPaint(renderer,{color,seed,wet}){
 const w=1024,h=512,count=w*h,albedo=new Uint8Array(count*4),orm=new Uint8Array(count*4),normal=new Uint8Array(count*4),height=new Float32Array(count);
 const rgb=new T.Color(color).getRGB(new T.Color(),T.SRGBColorSpace);
 const paint=[rgb.r,rgb.g,rgb.b],rust=[.32,.13,.055];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const i=y*w+x,k=i*4,u=x/w,v=y/h,fine=hash(x,y,seed);
   const broad=noise(u*13,v*7,seed),grain=noise(u*150,v*80,seed+13);
   const edge=Math.pow(Math.abs(v-.5)*2,14);
   const run=noise(u*92,0,seed+31),runLength=noise(u*34,0,seed+53);
   const streak=clamp((run-.57)*7)*clamp((v-(.22+runLength*.45))*3);
   const chip=clamp((broad*.56+grain*.44+edge*.19-.66)*12);
   const oxidized=chip*clamp((noise(u*49,v*26,seed+2)-.27)*3);
   const exposed=chip-oxidized;
   const dirt=clamp((.24-v)*3)*(.35+broad*.65)+streak*.36;
   const scuff=(fine>.993&&grain>.48)? .38:0;
   for(let c=0;c<3;c++){
     let value=paint[c]*(.87+broad*.19+(fine-.5)*.055);
     value=mix(value,.43+fine*.12,exposed);
     value=mix(value,rust[c]*(.7+grain*.65),oxidized);
     value=mix(value,rust[c]*.72,streak*.24);
     albedo[k+c]=255*clamp(value*(1-dirt*.5)+scuff*.12);
   }
   albedo[k+3]=255;
   // RGB = ambient occlusion, roughness, metalness. Paint/rust are dielectrics.
   orm[k]=255*(1-chip*.14-dirt*.16);
   orm[k+1]=255*clamp(.53+grain*.13+oxidized*.28+dirt*.12-exposed*.24);
   orm[k+2]=255*exposed*.92;orm[k+3]=255;
   height[i]=grain*.045+fine*.008-chip*.10+oxidized*grain*.06-scuff*.02;
 }
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const i=y*w+x,k=i*4;
   const dx=(height[y*w+Math.min(w-1,x+1)]-height[y*w+Math.max(0,x-1)])*3;
   const dy=(height[Math.min(h-1,y+1)*w+x]-height[Math.max(0,y-1)*w+x])*3;
   const inv=1/Math.hypot(dx,dy,1);
   normal.set([(-dx*inv*.5+.5)*255,(-dy*inv*.5+.5)*255,(inv*.5+.5)*255,255],k);
 }
 const texture=(bytes,srgb=false)=>{
   const t=new T.DataTexture(bytes,w,h);t.colorSpace=srgb?T.SRGBColorSpace:T.NoColorSpace;
   t.wrapS=t.wrapT=T.ClampToEdgeWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;
   t.generateMipmaps=true;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());t.needsUpdate=true;return t;
 };
 const packed=texture(orm);
 const material=new T.MeshStandardMaterial({map:texture(albedo,true),normalMap:texture(normal),normalScale:new T.Vector2(.65,.65),roughnessMap:packed,metalnessMap:packed,aoMap:packed,roughness:1,metalness:1,vertexColors:true});
 material.onBeforeCompile=s=>{
   s.uniforms.fContainerWet=wet;
   s.vertexShader='varying vec3 fContainerPosition;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfContainerPosition=position;');
   s.fragmentShader='varying vec3 fContainerPosition;uniform float fContainerWet;\n'+s.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
     float rainFilm=fContainerWet*(.65+.2*sin(fContainerPosition.x*6.+sin(fContainerPosition.y*3.)));
     roughnessFactor=mix(roughnessFactor,max(.18,roughnessFactor*.5),rainFilm);
     diffuseColor.rgb*=1.-rainFilm*.19;`);
 };
 material.customProgramCacheKey=()=> 'plan-f-container-wet-007';
 return material;
}
