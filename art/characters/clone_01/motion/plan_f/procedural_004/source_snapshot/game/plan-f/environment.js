import * as T from '../vendor/three-0.187.0/build/three.module.js';
import {V,mesh,group,box,tube} from './geometry.js';
import {materials,createEnvironment} from './materials.js';
export function createStage(scene,renderer){
 const m=materials();scene.background=new T.Color('#263d52');scene.fog=new T.FogExp2('#334958',.035);const env=createEnvironment(renderer,scene);
 scene.add(new T.HemisphereLight('#c4d9ef','#35404b',1.25));
 const key=new T.DirectionalLight('#ffe5c1',3.4);key.position.set(-3,6,5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-8,right:8,top:5,bottom:-4,near:.1,far:22});key.shadow.normalBias=.012;key.shadow.bias=-.00015;key.shadow.radius=3;scene.add(key);
 const rim=new T.DirectionalLight('#8bd3ff',2.6);rim.position.set(1,4,-4);scene.add(rim);
 const fill=new T.DirectionalLight('#b8d2e9',.7);fill.position.set(4,2,5);scene.add(fill);
 const wet={value:1};const ground=m.concrete.clone();ground.map=ground.map.clone();ground.map.repeat.set(26,14);ground.normalMap=ground.normalMap.clone();ground.normalMap.repeat.set(26,14);ground.roughnessMap=null;ground.roughness=.75;ground.metalness=.22;ground.envMapIntensity=1.25;
 ground.onBeforeCompile=s=>{s.uniforms.fWet=wet;s.vertexShader='varying vec3 fWorld;\n'+s.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nfWorld=(modelMatrix*vec4(transformed,1.)).xyz;');s.fragmentShader='varying vec3 fWorld;uniform float fWet;\n'+s.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
 float wetPatch=sin(fWorld.x*1.9+sin(fWorld.z*2.7))*sin(fWorld.z*2.1+sin(fWorld.x*.8));
 float film=smoothstep(.05,.55,wetPatch)*fWet;roughnessFactor=mix(.8,.12,film);diffuseColor.rgb*=mix(1.,.64,film);`);};ground.customProgramCacheKey=()=> 'plan-f-wet-002';
 const floor=mesh(scene,new T.PlaneGeometry(36,22),ground,0,-.008,-1);floor.rotation.x=-Math.PI/2;
 // Ground expansion seams, drains and painted safety zones.
 const line=new T.MeshStandardMaterial({color:'#b3a274',roughness:.75});
 for(let x=-12;x<=12;x+=2){box(scene,.018,.006,8,m.black,x,0,0,.001);for(const z of [-.8,1.15])box(scene,1.55,.008,.045,line,x,.003,z,.001);}
 for(let x=-10;x<=10;x+=.16)box(scene,.065,.009,.30,m.black,x,.002,-1.4,.002);
 box(scene,24,.13,.3,m.concrete,0,.065,-1.9,.015);
 // Layered hangar facade, recessed structural panels and bolted beams.
 box(scene,25,5,.65,m.concrete,0,2.5,-4.6,.035);
 for(let x=-10;x<=10;x+=2.5){
   box(scene,2.3,2.8,.10,m.black,x,1.7,-4.21,.025);
   box(scene,2.17,2.64,.08,m.armor,x,1.7,-4.14,.02);
   for(let j=0;j<7;j++)box(scene,1.95,.018,.06,m.edge,x,.52+j*.35,-4.07,.002);
   box(scene,.16,4.4,.24,m.edge,x-1.2,2.2,-3.98,.015);
   box(scene,2.2,.12,.27,m.black,x,3.25,-4,.009);
   box(scene,1.6,.035,.08,m.emissive,x,1.58,-3.84,.005);
   for(const dx of [-1.15,1.15])for(const y of [.3,1.4,2.8]){const bolt=mesh(scene,new T.CylinderGeometry(.026,.026,.018,6),m.gold,x+dx,y,-3.83);bolt.rotation.x=Math.PI/2;}
 }
 // Large pipes provide scale and depth behind the foreground lane.
 for(const y of [3.6,3.95]){tube(scene,[[-13,y,-3.8],[-6,y,-3.8],[5,y,-3.8],[13,y,-3.8]],.055,m.edge,48);for(let x=-11;x<=11;x+=2)box(scene,.09,.16,.17,m.black,x,y,-3.8,.008);}
 function label(text,w,h){const c=document.createElement('canvas');c.width=1024;c.height=256;const g=c.getContext('2d');g.fillStyle='#141f2b';g.fillRect(0,0,1024,256);g.fillStyle='#a1b6c2';g.font='bold 128px sans-serif';g.fillText(text,42,164);g.fillStyle='#bca776';g.fillRect(40,207,935,5);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return new T.MeshBasicMaterial({map:tex});}
 mesh(scene,new T.PlaneGeometry(1.65,.41),label('VESPER  /  07'),-1.1,1.25,-3.9);
 mesh(scene,new T.PlaneGeometry(1.4,.35),label('SECTOR 04'),2.2,1.25,-3.9);
 for(const x of [-2.6,2.5]){
   const crate=group(scene,x,.4,-2.8);box(crate,1.25,.8,.85,m.armor,0,0,0,.025);
   for(const dx of [-.46,.46])box(crate,.065,.85,.9,m.black,dx,0,0,.006);
   box(crate,1.12,.12,.04,m.gold,0,.21,.44,.007);box(crate,.27,.07,.05,m.black,0,.23,.47,.005);
   for(let j=0;j<6;j++)box(crate,.1,.04,.035,m.edge,-.43+j*.17,-.24,.44,.004);
 }
 // Railings and slim amber fixtures, avoiding clutter behind the head.
 for(const x of [-7,-3.8,3.8,7]){box(scene,.09,.85,.09,m.black,x,.425,-2.1,.009);box(scene,.12,.035,.12,m.gold,x,.87,-2.1,.006);box(scene,.04,.2,.045,m.amber,x,.65,-2.04,.004);}
 const practical=new T.PointLight('#ffbd72',5,6,2);practical.position.set(-3.8,1.2,-1.7);scene.add(practical);
 // Sparse deterministic floating motes catch light without masking the model.
 const positions=[];for(let i=0;i<80;i++)positions.push(Math.sin(i*12.34)*10,.2+(i%23)/23*3.4,-1-(i%13)/13*3);
 const dg=new T.BufferGeometry();dg.setAttribute('position',new T.Float32BufferAttribute(positions,3));const dust=new T.Points(dg,new T.PointsMaterial({color:'#b9d7dd',size:.012,transparent:true,opacity:.22,depthWrite:false}));scene.add(dust);
 return{environment:env,setWet(value){wet.value=value?1:0;},update(time){dust.rotation.y=Math.sin(time*.03)*.012;}};
}
