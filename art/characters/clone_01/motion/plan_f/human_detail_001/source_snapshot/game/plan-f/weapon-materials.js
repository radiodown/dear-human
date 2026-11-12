import * as T from '../vendor/three-0.187.0/build/three.module.js';

// Object-space detail stays at a physical scale across boxes, extrusions and lathe parts.
function finish(name,color,metalness,roughness,grain){
  const material=new T.MeshStandardMaterial({name,color,metalness,roughness});
  material.onBeforeCompile=shader=>{
    shader.uniforms.weaponGrain={value:grain};
    shader.vertexShader=shader.vertexShader.replace('#include <common>',
      '#include <common>\nvarying vec3 vWeaponP;').replace('#include <begin_vertex>',
      '#include <begin_vertex>\nvWeaponP=position;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      varying vec3 vWeaponP; uniform float weaponGrain;
      float weaponNoise(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}
    `).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
      float grain=weaponNoise(floor(vWeaponP*2400.));
      float brushed=sin(vWeaponP.z*3100.+sin(vWeaponP.y*690.));
      float scratch=step(.985,weaponNoise(floor(vWeaponP*vec3(170.,1500.,28.))));
      roughnessFactor=clamp(roughnessFactor+(grain-.5)*weaponGrain+brushed*.025-scratch*.10,.16,1.);
      diffuseColor.rgb*=.93+grain*.10+scratch*.15;
    `);
  };
  material.customProgramCacheKey=()=>`plan-f-weapon-finish-v1-${grain}`;
  return material;
}
export function weaponMaterials(){return {
  anodized:finish('rifle / anodized receiver','#29343d',.72,.39,.10),
  steel:finish('rifle / phosphate steel','#424c53',.88,.44,.13),
  edge:finish('rifle / exposed fasteners','#869099',.87,.29,.07),
  polymer:finish('rifle / textured polymer','#20272d',.03,.79,.22),
  magazine:finish('rifle / magazine polymer','#414039',.05,.72,.20),
  rubber:finish('rifle / rubber buttpad','#111519',0,.94,.20),
  brass:finish('rifle / brass','#b39a56',.78,.3,.06),
  dark:new T.MeshStandardMaterial({color:'#080c10',roughness:.96}),
  glass:new T.MeshPhysicalMaterial({color:'#82bcc2',transparent:true,opacity:.23,roughness:.09,metalness:.15,clearcoat:1,depthWrite:false,side:T.DoubleSide}),
};}

export function weaponMarkings(parent){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;
  const c=canvas.getContext('2d');c.fillStyle='#b5b9b5';c.font='500 40px monospace';
  c.fillText('DEAR HUMAN',35,68);c.font='26px monospace';c.fillText('047 / TRAINING',35,118);
  c.font='22px monospace';c.fillText('SAFE   •   SEMI   •   AUTO',35,201);
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
  const material=new T.MeshStandardMaterial({map,transparent:true,roughness:.8,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  for(const side of [-1,1]){
    const label=new T.Mesh(new T.PlaneGeometry(.13,.0325),material);
    label.rotation.y=side*Math.PI/2;label.position.set(side*.0336,-.013,-.026);parent.add(label);
  }
}
