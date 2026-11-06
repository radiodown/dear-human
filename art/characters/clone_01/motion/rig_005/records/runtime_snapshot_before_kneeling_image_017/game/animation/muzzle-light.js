// Shared 2D flash/relighting recipe. Source artwork is not changed. Surface
// normals below are shape proxies, not normal maps or a 3D character model.
export const MUZZLE_LIGHT=Object.freeze({
  duration:.055,radius:175,depth:38,power:2.2,decay:1.6,
  color:[1,.53,.19],haloRadius:16,jetLength:27,jetHalfHeight:7
});
export const LIGHT_MATERIALS=Object.freeze({
  skin:[.72,.07,12,.025],hair:[.20,.13,32,.008],cloth:[.42,.05,10,.016],
  torso:[.48,.13,18,.020],armor:[.58,.48,30,.025],
  glove:[.50,.17,22,.018],weapon:[.55,.40,36,.022]
});
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
export function muzzleLightState(rig,pose,{enabled=true,strength=1}={}){
  const active=rig.weapon.id!=='diagnostic'&&rig.flash>0;
  const envelope=active?Math.pow(clamp(rig.flash/MUZZLE_LIGHT.duration,0,1),MUZZLE_LIGHT.decay):0;
  // A deterministic small shot-to-shot change; drawing does not advance time.
  const variation=.94+.06*Math.sin(rig.shots*2.39996323);
  return {position:pose.sockets.muzzle,envelope,variation,
    power:enabled?envelope*variation*MUZZLE_LIGHT.power*clamp(strength,0,2):0};
}
export function lightSurface(key,item){
  if(key==='head')return {material:LIGHT_MATERIALS.skin,normal:[.54,.52,2,1.6]};
  if(key==='hair_back')return {material:LIGHT_MATERIALS.hair,normal:[.5,.5,1.8,.15]};
  if(key==='bust_armor'){
    const [u0,v0,u1,v1]=item.preview_bounds;
    return {material:LIGHT_MATERIALS.armor,normal:[(u0+u1)/2,(v0+v1)/2,2/(u1-u0),1.6/(v1-v0)]};
  }
  if(key==='torso_shell')return {material:LIGHT_MATERIALS.torso,normal:[.55,.25,2.1,.8]};
  if(key==='waist_cloth')return {material:LIGHT_MATERIALS.cloth,normal:[.55,.525,2,0]};
  if(key==='skirt_core'||key==='cape')return {material:LIGHT_MATERIALS.cloth,normal:[.5,.65,1.8,0]};
  if(key.includes('hand'))return {material:LIGHT_MATERIALS.glove,normal:[.52,.5,1.6,1]};
  if(key==='rifle')return {material:LIGHT_MATERIALS.weapon,normal:[.5,.35,.18,3]};
  if(key==='magazine')return {material:LIGHT_MATERIALS.weapon,normal:[.5,.5,1.8,.2]};
  return {material:LIGHT_MATERIALS.armor,normal:[.5,.5,1.8,.15]};
}

export const CHARACTER_VERTEX_SHADER=`
attribute vec2 a_position;
attribute vec2 a_uv;
uniform vec2 u_resolution;
varying vec2 v_uv;
varying vec2 v_screen;
void main(){
  vec2 p=a_position/u_resolution*2.0-1.0;
  gl_Position=vec4(p.x,-p.y,0.0,1.0);
  v_uv=a_uv;
  v_screen=a_position;
}`;

export const CHARACTER_FRAGMENT_SHADER=`
precision mediump float;
uniform sampler2D u_texture;
uniform vec4 u_tint;
uniform vec2 u_lightPosition;
uniform vec3 u_lightColor;
// radius, simulated depth, pulse power, inverse display scale
uniform vec4 u_light;
// diffuse response, specular response, gloss exponent, dark-surface lift
uniform vec4 u_material;
// source-UV normal center and shape scales
uniform vec4 u_normal;
// cosine, sine, facing
uniform vec3 u_normalRotation;
// Orthographic camera elevation: cosine, sine. Normal shapes remain 2D proxies.
uniform vec2 u_cameraPitch;
uniform float u_effect;
varying vec2 v_uv;
varying vec2 v_screen;
void main(){
  if(u_effect>0.5){
    vec2 q=v_uv*2.0-1.0;
    if(u_effect>1.5){
      float radius=length(q);
      float glow=exp(-4.5*radius*radius)*(1.0-smoothstep(0.65,1.0,radius));
      gl_FragColor=vec4(u_tint.rgb,u_tint.a*glow);
    }else{
      float t=v_uv.x;
      float width=mix(0.65,0.045,t);
      float jet=exp(-q.y*q.y/max(width*width,0.003)*3.0)*exp(-t*2.8);
      float core=exp(-q.y*q.y/0.035)*exp(-t*8.0);
      float edge=smoothstep(0.0,0.07,t)*(1.0-smoothstep(0.84,1.0,t));
      vec3 color=mix(u_tint.rgb,vec3(1.0,0.97,0.79),clamp(core*1.8,0.0,1.0));
      gl_FragColor=vec4(color,u_tint.a*clamp(jet+core,0.0,1.0)*edge);
    }
    return;
  }
  vec4 texel=texture2D(u_texture,v_uv);
  vec3 color=texel.rgb;
  if(u_light.z>0.0&&u_material.x>0.0&&texel.a>0.0){
    vec2 delta=(u_lightPosition-v_screen)*u_light.w/u_light.x;
    float range=dot(delta,delta);
    float cutoff=max(1.0-range,0.0);
    float energy=u_light.z*cutoff*cutoff/(1.0+4.0*range);
    vec2 q=clamp((v_uv-u_normal.xy)*u_normal.zw,vec2(-0.95),vec2(0.95));
    vec2 rotated=vec2(u_normalRotation.x*q.x-u_normalRotation.y*q.y,
                      u_normalRotation.y*q.x+u_normalRotation.x*q.y);
    rotated.x*=u_normalRotation.z;
    vec3 n=normalize(vec3(rotated,sqrt(max(1.0-dot(q,q),0.08))));
    n=vec3(n.x,n.y*u_cameraPitch.x+n.z*u_cameraPitch.y,
                 n.z*u_cameraPitch.x-n.y*u_cameraPitch.y);
    vec3 l=normalize(vec3(delta,u_light.y/u_light.x));
    vec3 h=normalize(l+vec3(0.0,0.0,1.0));
    float diffuse=max(dot(n,l),0.0);
    float specular=pow(max(dot(n,h),0.0),u_material.z);
    vec3 linear=pow(max(color,vec3(0.0)),vec3(2.2));
    float detail=0.20+0.80*sqrt(max(dot(linear,vec3(0.2126,0.7152,0.0722)),0.0));
    vec3 response=(linear+vec3(u_material.w))*u_material.x*diffuse;
    response+=vec3(u_material.y*specular*detail)*diffuse;
    linear+=u_lightColor*response*energy;
    color=pow(clamp(linear,0.0,1.0),vec3(1.0/2.2));
  }
  // The source alpha and the existing layer order mask all reflected light.
  gl_FragColor=vec4(color*u_tint.rgb,texel.a*u_tint.a);
}`;
