import { CharacterRig } from './animation/rig-core.js';
import { WebGLCharacter } from './animation/webgl-character.js';
import { SIDE_CAMERA, clampCameraPitch } from './animation/side-camera.js';
import { MOTION_REACTIONS, normalizeMotionControls, defaultMotionProfiles } from './animation/motion-controls.js';

const $=id=>document.getElementById(id);
const definitionUrl='/art/characters/clone_01/motion/rig_005/rig/parts.json';
const imageCache=new Map();
const motionStorageKey='dear-human:motion-controls:v1';
const controlIds={waist:'rig-pose-waist',bend:'rig-waist-bend',bust:'rig-bust-pitch',weaponDrop:'rig-weapon-drop',energy:'rig-motion-energy',lightStrength:'rig-light-strength'};
function savedValue(key){try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}}
function savedMotionProfiles(){
  const profiles=defaultMotionProfiles(),saved=savedValue(motionStorageKey);
  if(saved&&typeof saved==='object'&&!Array.isArray(saved)){
    for(const mode of Object.keys(profiles))profiles[mode]=normalizeMotionControls(mode,saved[mode]);
    return profiles;
  }
  // Migrate existing saved preferences without changing the historical keys.
  const fire=savedValue('dear-human:fire-waist:v1'),drop=savedValue('dear-human:kneel-drop:v1'),energy=savedValue('dear-human:motion-energy:v1');
  if(fire&&typeof fire==='object'){
    profiles.fire=normalizeMotionControls('fire',{...profiles.fire,waist:fire.standing});
    profiles.run_fire=normalizeMotionControls('run_fire',{...profiles.run_fire,waist:fire.running});
  }
  for(const mode of ['kneel','kneel_fire'])if(Number.isFinite(drop))profiles[mode].weaponDrop=drop;
  for(const mode of Object.keys(profiles))profiles[mode]=normalizeMotionControls(mode,{...profiles[mode],...(Number.isFinite(energy)?{energy}:{})});
  return profiles;
}
export const MOTIONS=Object.freeze({
  idle:{label:'견착 대기'},relaxed:{label:'완전 대기',relaxed:true},walk:{label:'이동',walk:true},fire:{label:'서서쏴',fire:true},
  walk_fire:{label:'이동 사격',walk:true,fire:true},run:{label:'달리기',walk:true,run:true},
  run_fire:{label:'뛰며쏴 · 총 낮춤',walk:true,run:true,fire:true},kneel:{label:'앉기',kneel:true},
  kneel_fire:{label:'앉아쏴',kneel:true,fire:true}
});
function loadImage(path){if(!imageCache.has(path))imageCache.set(path,new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error(`이미지 로드 실패: ${path}`));im.src='/'+path;}));return imageCache.get(path);}
export class RigLab {
  constructor(){
    this.rig=new CharacterRig();this.active=false;this.paused=false;this.speed=1;this.zoom=1;this.mode='idle';
    this.options={debug:false,mesh:false,explode:false,showCape:true,size:300,muzzleLight:true,lightStrength:1,cameraPitch:SIDE_CAMERA.defaultPitch};this.status='loading';this.raf=0;
    this.motionProfiles=savedMotionProfiles();
    this.bind();
    this.setMotionControls({}, {immediate:true,updateUrl:false,persist:false});
  }
  async init(){
    try{
      const response=await fetch(definitionUrl);if(!response.ok)throw new Error('리그 정의를 읽지 못했습니다.');
      this.definition=await response.json();const loaded=await Promise.all(Object.entries(this.definition.atlases).map(async([key,x])=>[key,await loadImage(x.path)]));
      this.renderer=new WebGLCharacter($('rig-canvas'),Object.fromEntries(loaded),this.definition);this.status='ready';$('rig-loading').hidden=true;
      $('rig-atlas-link').href='/'+this.definition.atlases.base.path;
      $('rig-master-link').href='/'+this.definition.master_image;
      $('rig-limbs-link').href='/'+this.definition.atlases.limbs.path;
      $('rig-body-link').href='/'+this.definition.atlases.body.path;
      $('rig-hand-link').href='/'+this.definition.atlases.closedgrip_014.path;
      $('rig-shoulder-link').href='/'+this.definition.atlases.near_arm_010.path;
      $('rig-reload-arm-link').href='/'+this.definition.atlases.reload_forearm_010.path;
      this.syncToggles();
      this.render();this.schedule();
    }catch(error){this.status='failed';$('rig-loading').hidden=false;$('rig-loading').textContent=error.message;}
  }
  bind(){
    document.querySelectorAll('[data-motion]').forEach(b=>b.addEventListener('click',()=>this.setMode(b.dataset.motion)));
    $('rig-shot').addEventListener('click',()=>{this.rig.requestFire();this.render();});
    $('rig-turn').addEventListener('click',()=>{this.rig.turn();this.render();});
    $('rig-hit').addEventListener('click',()=>{this.rig.hit();this.render();});
    $('rig-reload').addEventListener('click',()=>{this.rig.startReload();this.render();});
    $('rig-empty-reload').addEventListener('click',()=>{this.rig.ammo=0;this.rig.startReload();this.render();});
    $('rig-pause').addEventListener('click',()=>{this.paused=!this.paused;this.rig.trigger=false;$('rig-pause').textContent=this.paused?'재생':'일시정지';this.last=0;this.render();});
    $('rig-step').addEventListener('click',()=>{this.paused=true;$('rig-pause').textContent='재생';this.rig.advance(1/60);this.render();});
    $('rig-reset').addEventListener('click',()=>this.resetAllControls());
    $('rig-motion-reset').addEventListener('click',()=>{this.motionProfiles[this.mode]=normalizeMotionControls(this.mode);this.setMotionControls({});});
    $('rig-speed').addEventListener('change',e=>{this.speed=Number(e.target.value);});
    $('rig-size').addEventListener('change',e=>{this.options.size=Number(e.target.value);this.render();});
    for(const [key,id]of Object.entries(controlIds)){
      $(id).addEventListener('input',e=>this.setMotionControls({[key]:Number(e.target.value)},{updateUrl:false}));
      $(id).addEventListener('change',()=>this.writeMotionUrl());
    }
    document.querySelectorAll('[data-motion-energy]').forEach(b=>b.addEventListener('click',()=>this.setMotionEnergy(Number(b.dataset.motionEnergy))));
    $('rig-camera-pitch').addEventListener('input',e=>this.setCameraPitch(Number(e.target.value)));
    document.querySelectorAll('[data-camera-pitch]').forEach(b=>b.addEventListener('click',()=>this.setCameraPitch(Number(b.dataset.cameraPitch))));
    $('rig-weapon').addEventListener('change',e=>{if(!this.rig.equip(e.target.value))e.target.value=this.rig.weapon.id;this.render();});
    $('rig-bend-reset').addEventListener('click',()=>this.setArticulation(0,0,{immediate:this.paused}));
    for(const key of ['debug','mesh','explode','showCape'])$('rig-'+key).addEventListener('change',e=>{this.options[key]=e.target.checked;if(key==='explode')this.syncCameraControls();this.render();});
    for(const key of MOTION_REACTIONS)$('rig-fx-'+key).addEventListener('change',e=>this.setMotionControls({[key]:e.target.checked}));
    const lighting=()=>this.setLighting($('rig-fx-light').checked,Number($('rig-light-strength').value)/100);
    $('rig-fx-light').addEventListener('change',lighting);
    $('rig-hold').addEventListener('pointerdown',e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);this.rig.trigger=true;});
    const release=()=>{this.rig.trigger=false;};for(const event of ['pointerup','pointercancel','lostpointercapture'])$('rig-hold').addEventListener(event,release);
    document.addEventListener('visibilitychange',()=>{this.rig.trigger=false;this.last=0;this.rig.accumulator=0;});
    window.addEventListener('blur',release);
    window.addEventListener('keydown',e=>{
      if(!this.active||/INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target.tagName)||e.repeat)return;
      if(e.code==='Space'){e.preventDefault();if(!this.paused)this.rig.trigger=true;}
      if(e.code==='KeyR')this.rig.startReload();
      if(e.code==='KeyA'||e.code==='ArrowLeft'){if(this.rig.facing!==-1)this.rig.turn();this.rig.setWalking(true);this.rig.setRunning(e.shiftKey||!!MOTIONS[this.mode]?.run);}
      if(e.code==='KeyD'||e.code==='ArrowRight'){if(this.rig.facing!==1)this.rig.turn();this.rig.setWalking(true);this.rig.setRunning(e.shiftKey||!!MOTIONS[this.mode]?.run);}
      if(e.code.startsWith('Shift')&&this.rig.walk)this.rig.setRunning(true);
    });
    window.addEventListener('keyup',e=>{
      if(!this.active)return;if(e.code==='Space')release();const motion=MOTIONS[this.mode];
      if(['KeyA','KeyD','ArrowLeft','ArrowRight'].includes(e.code)){this.rig.setWalking(!!motion.walk);this.rig.setRunning(!!motion.run);this.rig.setKneeling(!!motion.kneel);}
      if(e.code.startsWith('Shift'))this.rig.setRunning(!!motion.run);
    });
    new ResizeObserver(()=>{if(this.renderer&&this.active)this.render();}).observe($('rig-stage'));
  }
  syncToggles(){for(const key of MOTION_REACTIONS)this.rig.setReaction(key,this.motionProfiles[this.mode][key]);}
  saveMotionProfiles(){try{localStorage.setItem(motionStorageKey,JSON.stringify(this.motionProfiles));}catch{}}
  setMotionControls(patch={}, {immediate=this.paused,updateUrl=true,persist=true}={}){
    const values=normalizeMotionControls(this.mode,{...this.motionProfiles[this.mode],...patch});
    this.motionProfiles[this.mode]=values;this.rig.setMotionControls(this.mode,values,immediate);
    this.options.muzzleLight=values.light;this.options.lightStrength=values.lightStrength/100;
    $('rig-controls-motion').textContent=MOTIONS[this.mode].label;
    for(const [key,id]of Object.entries(controlIds)){
      $(id).value=String(values[key]);
      const label=key==='energy'||key==='lightStrength'?`${values[key]}%`:key==='weaponDrop'?String(values[key]):`${values[key].toFixed(1)}°`;
      const output=key==='energy'?'rig-motion-energy-value':key==='lightStrength'?'rig-light-value':id+'-value';
      $(output).textContent=label;
    }
    for(const key of MOTION_REACTIONS)$('rig-fx-'+key).checked=values[key];
    $('rig-fx-light').checked=values.light;
    document.querySelectorAll('[data-motion-energy]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.motionEnergy)===values.energy)));
    if(persist)this.saveMotionProfiles();
    if(updateUrl)this.writeMotionUrl();
    this.render();
  }
  writeMotionUrl(){
    const [route,query]=location.hash.split('?'),params=new URLSearchParams(query||''),values=this.motionProfiles[this.mode];
    params.set('motion',this.mode);
    for(const key of ['waist','bend','bust','weaponDrop','energy'])params.set(key,String(values[key]));
    for(const key of [...MOTION_REACTIONS,'light']){if(values[key])params.delete(key);else params.set(key,'0');}
    params.set('lightStrength',String(values.lightStrength/100));
    for(const key of ['fireBend','runFireBend','carryDrop','kneelDrop'])params.delete(key);
    history.replaceState(null,'',`${location.pathname}${location.search}${route}?${params}`);
  }
  restoreMotionParams(params){
    const patch={};
    for(const key of ['waist','bend','bust','weaponDrop','energy'])if(params.has(key)&&params.get(key).trim()!=='')patch[key]=Number(params.get(key));
    for(const key of [...MOTION_REACTIONS,'light'])if(['0','1'].includes(params.get(key)))patch[key]=params.get(key)==='1';
    if(params.has('lightStrength'))patch.lightStrength=Number(params.get('lightStrength'))*100;
    // Old shared links still configure the matching action's common fields.
    if(!params.has('waist')){
      const old=this.mode==='fire'?'fireBend':this.mode==='run_fire'?'runFireBend':null;
      if(old&&params.has(old))patch.waist=Number(params.get(old));
    }
    if(!params.has('weaponDrop')){
      const old=MOTIONS[this.mode].run?'carryDrop':MOTIONS[this.mode].kneel?'kneelDrop':null;
      if(old&&params.has(old))patch.weaponDrop=Number(params.get(old));
    }
    for(const [key,value]of Object.entries(patch))if(typeof value==='number'&&!Number.isFinite(value))delete patch[key];
    this.setMotionControls(patch,{immediate:true,updateUrl:false,persist:false});
  }
  setMotionEnergy(percent,options={}){this.setMotionControls(Number.isFinite(percent)?{energy:percent}:{},options);}
  resetAllControls(){
    this.motionProfiles=defaultMotionProfiles();this.saveMotionProfiles();this.rig=new CharacterRig();
    this.paused=false;$('rig-pause').textContent='일시정지';$('rig-weapon').value='m16_basic';
    this.setMode('idle',{immediate:true});this.setCameraPitch();this.render();
  }
  syncCameraControls(){
    const pitch=this.options.cameraPitch,explode=this.options.explode;
    $('rig-camera-pitch').value=String(pitch);$('rig-camera-pitch').disabled=explode;
    $('rig-camera-value').textContent=explode?'분리 보기':`${Math.round(pitch)}°`;
    document.querySelectorAll('[data-camera-pitch]').forEach(b=>{
      b.disabled=explode;b.setAttribute('aria-pressed',String(Number(b.dataset.cameraPitch)===pitch&&!explode));
    });
  }
  setCameraPitch(pitch=SIDE_CAMERA.defaultPitch,{updateUrl=true}={}){
    this.options.cameraPitch=clampCameraPitch(pitch);this.syncCameraControls();
    if(updateUrl){
      const [route,query]=location.hash.split('?'),params=new URLSearchParams(query||'');
      if(this.options.cameraPitch===SIDE_CAMERA.defaultPitch)params.delete('viewPitch');
      else params.set('viewPitch',String(this.options.cameraPitch));
      history.replaceState(null,'',`${location.pathname}${location.search}${route}${params.size?'?'+params:''}`);
    }
    this.render();
  }
  setLighting(enabled,strength,{updateUrl=true}={}){
    this.setMotionControls({light:!!enabled,...(Number.isFinite(strength)?{lightStrength:strength*100}:{})},{updateUrl});
  }
  setArticulation(bend,bust,{immediate=false,updateUrl=true}={}){
    this.setMotionControls({bend,bust},{immediate,updateUrl});
  }
  setMode(mode,{immediate=this.paused,updateUrl=true}={}){
    if(!Object.hasOwn(MOTIONS,mode))return;
    this.mode=mode;this.rig.trigger=false;this.rig.pendingShot=false;this.rig.preFire=0;
    const motion=MOTIONS[mode];this.rig.setWalking(!!motion.walk);this.rig.setRunning(!!motion.run);this.rig.setKneeling(!!motion.kneel);this.rig.setRelaxed(!!motion.relaxed);
    document.querySelectorAll('[data-motion]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.motion===mode)));
    this.setMotionControls({}, {immediate,updateUrl:false,persist:false});
    if(this.active&&updateUrl){
      const [route,query]=location.hash.split('?'),params=new URLSearchParams(query||'');params.delete('time');params.delete('paused');
      history.replaceState(null,'',`${location.pathname}${location.search}${route}?${params}`);this.writeMotionUrl();
    }
    this.render();
  }
  show(active){
    this.active=active;this.last=0;this.rig.trigger=false;this.rig.accumulator=0;
    if(active){this.render();this.schedule();}else{cancelAnimationFrame(this.raf);this.raf=0;}
  }
  schedule(){if(this.raf||!this.active||this.status!=='ready')return;this.raf=requestAnimationFrame(now=>{this.raf=0;this.tick(now);});}
  tick(now){
    const dt=this.last?Math.min((now-this.last)/1000,.1):0;this.last=now;
    if(!document.hidden&&!this.paused){
      this.rig.trigger=this.rig.trigger||!!MOTIONS[this.mode].fire;
      this.rig.advance(dt*this.speed);
    }
    this.render();this.schedule();
  }
  render(){
    if(!this.renderer||!this.active)return;
    this.renderer.render(this.rig,{...this.options,zoom:this.zoom});
    const s=this.rig.snapshot(),reload=s.reload,p=this.rig.pose();
    const stockError=Math.hypot(p.sockets.stock.x-p.stockTarget.x,p.sockets.stock.y-p.stockTarget.y);
    $('rig-ammo').textContent=`${String(s.ammo).padStart(2,'0')} / 30`;
    const phases={release:'놓기',extract:'탄창 빼기',fetch:'새 탄창',insert:'삽입',seat:'고정',bolt:'조작부',return:'파지 복귀'};
    $('rig-state').textContent=reload?`장전 ${reload.empty?'빈 탄창':'일반'} · ${phases[p.reloadContact.phase]} · ${reload.t.toFixed(1)} / ${reload.duration.toFixed(1)}초`:this.paused?'일시정지':MOTIONS[this.mode].label;
    const eyeMetric=p.eyeAim>.5&&p.eyeSightError!==null?` · 눈·조준선 ${Math.abs(p.eyeSightError).toFixed(1)}px`:'';
    const seatLabel=p.runCarryAmount>.5||p.carryState.lowered>.01||Math.abs(p.weaponHeightOffset)>.01?'총 지지':'견착';
    const kneeMetric=this.options.debug&&p.kneeSupport.amount>.9?` · 뒷무릎 목표 오차 ${p.kneeSupport.error.toFixed(3)}px`:'';
    $('rig-metrics').textContent=`발사 ${s.shots} · 손잡이 오차 ${s.gripError.toFixed(3)}px · ${seatLabel} 오차 ${stockError.toFixed(3)}px${eyeMetric}${kneeMetric} · ${this.renderer.drawCalls} draws · ${this.renderer.triangles} triangles`;
    const cloth=this.renderer.waistStrain;
    $('rig-springs').textContent=`허리축 ${((p.waist.a-p.pelvis.a)*180/Math.PI).toFixed(1)}° · 호흡·허리 ${(p.bodyMotion.waist*180/Math.PI).toFixed(1)}° · 허리·옷자락 ${p.outfit.enabled?'켜짐':'꺼짐'} · 옷자락 ${(p.outfit.hem*180/Math.PI).toFixed(1)}° · 연결 천 길이 뒤 ${Math.round((cloth?.back??1)*100)}% / 앞 ${Math.round((cloth?.front??1)*100)}% · 흉갑 상대각 ${(p.bustPitch*180/Math.PI).toFixed(1)}°`;
  }
  snapshot(){return {status:this.status,active:this.active,paused:this.paused,mode:this.mode,settings:{...this.motionProfiles[this.mode]},...this.rig.snapshot(),drawCalls:this.renderer?.drawCalls,triangles:this.renderer?.triangles,
    camera:{pitch:this.options.cameraPitch,effectivePitch:this.renderer?.camera?.pitch??null},
    muzzleLight:{enabled:this.options.muzzleLight,strength:this.options.lightStrength,power:this.renderer?.flashLight?.power??0}};}
}
