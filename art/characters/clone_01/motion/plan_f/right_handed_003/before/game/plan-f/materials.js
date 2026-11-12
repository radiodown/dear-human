import * as T from '../vendor/three-0.187.0/build/three.module.js';
let cache;
function rng(seed){return()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};}
function surface(kind,n=256){
  const r=rng(42+kind.length),height=new Float32Array(n*n),color=new Uint8Array(n*n*4),rough=new Uint8Array(n*n*4),normal=new Uint8Array(n*n*4);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const i=y*n+x,k=i*4,noise=r(),weave=(Math.sin(x*Math.PI)*0+((x%4<2)===(y%4<2)?1:0));
    let v=.88+(noise-.5)*.12,h=noise*.12,rr=.65;
    if(kind==='cloth'){h=weave*.28+noise*.1;v=.84+weave*.12+noise*.05;rr=.92;}
    if(kind==='hair'){h=.5+.12*Math.sin(x*.78)+noise*.03;v=.86+.06*Math.sin(x*.78)+noise*.025;rr=.52;}
    if(kind==='metal'){const scratch=noise>.998||((y%47===0)&&noise>.96);h=scratch?.1:noise*.012;v=scratch?1:.91+noise*.05;rr=scratch?.4:.55+noise*.07;}
    if(kind==='concrete'){h=noise*.2;v=.79+noise*.15;rr=.85+noise*.1;}
    if(kind==='skin'){h=noise*.04;v=.94+noise*.05;rr=.55+noise*.1;}
    height[i]=h;for(let c=0;c<3;c++){color[k+c]=v*255;rough[k+c]=rr*255;}color[k+3]=rough[k+3]=255;
  }
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const k=(y*n+x)*4,dx=height[y*n+(x+1)%n]-height[y*n+(x+n-1)%n],dy=height[((y+1)%n)*n+x]-height[((y+n-1)%n)*n+x];const v=new T.Vector3(-dx,-dy,1).normalize();normal.set([(v.x*.5+.5)*255,(v.y*.5+.5)*255,(v.z*.5+.5)*255,255],k);}
  const tex=(bytes,srgb=false)=>{const t=new T.DataTexture(bytes,n,n);t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.colorSpace=srgb?T.SRGBColorSpace:T.NoColorSpace;t.needsUpdate=true;return t;};
  return{map:tex(color,true),roughnessMap:tex(rough),normalMap:tex(normal)};
}
export function materials(){
  if(cache)return cache;const sets={};for(const k of ['metal','cloth','hair','concrete','skin'])sets[k]=surface(k);
  const make=(color,kind,metalness=0,extra={})=>new T.MeshStandardMaterial({color,...sets[kind],metalness,roughness:1,normalScale:new T.Vector2(.22,.22),...extra});
  cache={armor:make('#3c4856','metal',.72),edge:make('#8998a6','metal',.8),gold:make('#b6a075','metal',.75),cloth:make('#222a36','cloth'),leather:make('#24252a','cloth',.1),stocking:make('#49414b','cloth'),skin:make('#e2baa5','skin',0,{roughness:.88}),hair:make('#161b24','hair',.08,{normalScale:new T.Vector2(.35,.15)}),black:make('#141b21','metal',.5),concrete:make('#596575','concrete'),white:make('#d4d5cd','metal',.4),eye:new T.MeshPhysicalMaterial({color:'#d8c8b8',roughness:.2,clearcoat:1}),iris:new T.MeshPhysicalMaterial({color:'#544b36',roughness:.22,clearcoat:1}),pupil:new T.MeshStandardMaterial({color:'#070a0c',roughness:.25}),lip:make('#a46b68','skin'),emissive:new T.MeshStandardMaterial({color:'#c5f2ff',emissive:'#86dcff',emissiveIntensity:5,roughness:.2}),amber:new T.MeshStandardMaterial({color:'#ffd69a',emissive:'#ff9d37',emissiveIntensity:4})};return cache;
}
export function createEnvironment(renderer,scene){
  // Procedural studio / sky capture; rough metals reflect light shapes, no HDR image needed.
  const env=new T.Scene();env.background=new T.Color('#5a6c85');
  const globe=new T.Mesh(new T.SphereGeometry(18,24,16),new T.ShaderMaterial({side:T.BackSide,vertexShader:'varying vec3 vP; void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 vP;void main(){float h=normalize(vP).y;vec3 c=mix(vec3(.10,.13,.18),vec3(.7,.85,1.1),smoothstep(-.1,.9,h));gl_FragColor=vec4(c,1.);}'}));env.add(globe);
  for(const [x,y,z,w,h,c] of [[-4,5,4,5,4,'#fff1d5'],[4,3,-3,3,6,'#9bcaff'],[0,6,0,8,2,'#ddeaff']]){const p=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:new T.Color(c).multiplyScalar(3),side:T.DoubleSide}));p.position.set(x,y,z);p.lookAt(0,1,0);env.add(p);}
  const pmrem=new T.PMREMGenerator(renderer);const rt=pmrem.fromScene(env,.05,.1,40);scene.environment=rt.texture;scene.environmentIntensity=.65;pmrem.dispose();env.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});return rt;
}
