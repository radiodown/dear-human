import { CharacterRig, STEP, FIRE_WAIST, KNEEL_CARRY } from './animation/rig-core.js';
import { WebGLCharacter } from './animation/webgl-character.js';
import { HUMAN } from './animation/proportions.js';
import { SIDE_CAMERA, clampCameraPitch } from './animation/side-camera.js';

const $=id=>document.getElementById(id);
const definitionUrl='/art/characters/clone_01/motion/rig_005/rig/parts.json';
const imageCache=new Map();
const fireWaistStorageKey='dear-human:fire-waist:v1';
const kneelDropStorageKey='dear-human:kneel-drop:v1';
function savedKneelDrop(){
  try{const value=JSON.parse(localStorage.getItem(kneelDropStorageKey)||'null');return Number.isFinite(value)?value:KNEEL_CARRY.defaultDrop;}
  catch{return KNEEL_CARRY.defaultDrop;}
}
function savedFireWaist(){
  try{const value=JSON.parse(localStorage.getItem(fireWaistStorageKey)||'null');return value&&typeof value==='object'?value:{};}
  catch{return {};}
}
export const MOTIONS=Object.freeze({
  idle:{label:'견착 대기'},walk:{label:'이동',walk:true},fire:{label:'서서쏴',fire:true},
  walk_fire:{label:'이동 사격',walk:true,fire:true},run:{label:'달리기',walk:true,run:true},
  run_fire:{label:'뛰며쏴 · 총 낮춤',walk:true,run:true,fire:true},kneel:{label:'앉기',kneel:true},
  kneel_fire:{label:'앉아쏴',kneel:true,fire:true}
});
function loadImage(path){if(!imageCache.has(path))imageCache.set(path,new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error(`이미지 로드 실패: ${path}`));im.src='/'+path;}));return imageCache.get(path);}
export class RigLab {
  constructor(){
    this.rig=new CharacterRig();this.active=false;this.paused=false;this.speed=1;this.zoom=1;this.mode='idle';
    this.options={debug:false,mesh:false,explode:false,showCape:true,size:300,muzzleLight:true,lightStrength:1,cameraPitch:SIDE_CAMERA.defaultPitch};this.status='loading';this.raf=0;
    this.fireWaistSettings={...FIRE_WAIST.defaults};
    this.kneelDropSetting=KNEEL_CARRY.defaultDrop;
    this.bind();
    const saved=savedFireWaist();this.setFireWaist(saved.standing,saved.running,{immediate:true,updateUrl:false,persist:false});
    this.setKneelCarryDrop(savedKneelDrop(),{immediate:true,updateUrl:false,persist:false});
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
    $('rig-reset').addEventListener('click',()=>{this.rig=new CharacterRig();this.paused=false;$('rig-pause').textContent='일시정지';$('rig-weapon').value='m16_basic';this.setArticulation(0,0,{immediate:true});this.setFireWaist(FIRE_WAIST.defaults.standing,FIRE_WAIST.defaults.running,{immediate:true});this.setRunCarryDrop(undefined,{immediate:true});this.setKneelCarryDrop(KNEEL_CARRY.defaultDrop,{immediate:true});this.setCameraPitch();this.setMode('idle');this.syncToggles();this.render();});
    $('rig-speed').addEventListener('change',e=>{this.speed=Number(e.target.value);});
    $('rig-size').addEventListener('change',e=>{this.options.size=Number(e.target.value);this.render();});
    $('rig-camera-pitch').addEventListener('input',e=>this.setCameraPitch(Number(e.target.value)));
    document.querySelectorAll('[data-camera-pitch]').forEach(b=>b.addEventListener('click',()=>this.setCameraPitch(Number(b.dataset.cameraPitch))));
    $('rig-weapon').addEventListener('change',e=>{if(!this.rig.equip(e.target.value))e.target.value=this.rig.weapon.id;this.render();});
    const articulation=()=>this.setArticulation(Number($('rig-waist-bend').value),Number($('rig-bust-pitch').value),{immediate:this.paused});
    $('rig-waist-bend').addEventListener('input',articulation);
    $('rig-bust-pitch').addEventListener('input',articulation);
    $('rig-bend-reset').addEventListener('click',()=>this.setArticulation(0,0,{immediate:this.paused}));
    $('rig-standing-fire-bend').addEventListener('input',e=>this.setFireWaist(Number(e.target.value),undefined,{immediate:this.paused,updateUrl:false}));
    $('rig-running-fire-bend').addEventListener('input',e=>this.setFireWaist(undefined,Number(e.target.value),{immediate:this.paused,updateUrl:false}));
    for(const id of ['rig-standing-fire-bend','rig-running-fire-bend'])$(id).addEventListener('change',()=>this.setFireWaist(undefined,undefined,{immediate:this.paused}));
    $('rig-fire-waist-reset').addEventListener('click',()=>this.setFireWaist(FIRE_WAIST.defaults.standing,FIRE_WAIST.defaults.running,{immediate:this.paused}));
    $('rig-carry-drop').addEventListener('input',e=>this.setRunCarryDrop(Number(e.target.value),{immediate:this.paused}));
    $('rig-kneel-drop').addEventListener('input',e=>this.setKneelCarryDrop(Number(e.target.value),{immediate:this.paused,updateUrl:false}));
    $('rig-kneel-drop').addEventListener('change',()=>this.setKneelCarryDrop(undefined,{immediate:this.paused}));
    for(const key of ['debug','mesh','explode','showCape'])$('rig-'+key).addEventListener('change',e=>{this.options[key]=e.target.checked;if(key==='explode')this.syncCameraControls();this.render();});
    for(const key of ['recoil','head','hair','cloth','cape'])$('rig-fx-'+key).addEventListener('change',e=>{this.rig.setReaction(key,e.target.checked);this.render();});
    const lighting=()=>this.setLighting($('rig-fx-light').checked,Number($('rig-light-strength').value)/100);
    $('rig-fx-light').addEventListener('change',lighting);
    $('rig-light-strength').addEventListener('input',lighting);
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
  syncToggles(){for(const key of ['recoil','head','hair','cloth','cape'])this.rig.setReaction(key,$('rig-fx-'+key).checked);}
  setFireWaist(standing,running,{immediate=false,updateUrl=true,persist=true}={}){
    for(const [kind,value,id]of [['standing',standing,'rig-standing-fire-bend'],['running',running,'rig-running-fire-bend']]){
      const requested=Number.isFinite(value)?Math.round(value*2)/2:this.fireWaistSettings[kind];
      this.rig.setFireWaist(kind,requested,immediate);
      const degrees=Math.round(this.rig.fireWaistTarget[kind]*180/Math.PI*2)/2;
      this.fireWaistSettings[kind]=degrees;
      $(id).value=String(degrees);$(id+'-value').textContent=`${degrees.toFixed(1)}°`;
    }
    if(persist){try{localStorage.setItem(fireWaistStorageKey,JSON.stringify(this.fireWaistSettings));}catch{}}
    if(updateUrl){
      const [route,query]=location.hash.split('?'),params=new URLSearchParams(query||'');
      params.set('fireBend',String(this.fireWaistSettings.standing));params.set('runFireBend',String(this.fireWaistSettings.running));
      history.replaceState(null,'',`${location.pathname}${location.search}${route}?${params}`);
    }
    this.render();
  }
  setRunCarryDrop(value=HUMAN.runCarry.drop,{immediate=false,updateUrl=true}={}){
    this.rig.setRunCarryDrop(value,immediate);
    const drop=this.rig.carryDropTarget;
    $('rig-carry-drop').value=String(drop);$('rig-carry-drop-value').textContent=drop.toFixed(0);
    if(updateUrl){
      const [route,query]=location.hash.split('?'),params=new URLSearchParams(query||'');
      if(Math.abs(drop-HUMAN.runCarry.drop)<.001)params.delete('carryDrop');else params.set('carryDrop',String(drop));
      history.replaceState(null,'',`${location.pathname}${location.search}${route}${params.size?'?'+params:''}`);
    }
    this.render();
  }
  setKneelCarryDrop(value=this.kneelDropSetting,{immediate=false,updateUrl=true,persist=true}={}){
    const requested=Number.isFinite(value)?Math.round(value):this.kneelDropSetting;
    this.rig.setKneelCarryDrop(requested,immediate);
    const drop=this.rig.kneelDropTarget;this.kneelDropSetting=drop;
    $('rig-kneel-drop').value=String(drop);$('rig-kneel-drop-value').textContent=drop.toFixed(0);
    if(persist){try{localStorage.setItem(kneelDropStorageKey,JSON.stringify(drop));}catch{}}
    if(updateUrl){
      const [route,query]=location.hash.split('?'),params=new URLSearchParams(query||'');
      params.set('kneelDrop',String(drop));
      history.replaceState(null,'',`${location.pathname}${location.search}${route}?${params}`);
    }
    this.render();
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
    this.options.muzzleLight=!!enabled;
    if(Number.isFinite(strength))this.options.lightStrength=Math.max(0,Math.min(2,strength));
    const percent=Math.round(this.options.lightStrength*100);
    $('rig-fx-light').checked=this.options.muzzleLight;$('rig-light-strength').value=String(percent);
    $('rig-light-value').textContent=`${percent}%`;
    if(updateUrl){
      const [route,query]=location.hash.split('?'),params=new URLSearchParams(query||'');
      if(this.options.muzzleLight)params.delete('light');else params.set('light','0');
      if(percent===100)params.delete('lightStrength');else params.set('lightStrength',String(this.options.lightStrength));
      history.replaceState(null,'',`${location.pathname}${location.search}${route}${params.size?'?'+params:''}`);
    }
    this.render();
  }
  setArticulation(bend,bust,{immediate=false,updateUrl=true}={}){
    this.rig.setBend(bend,immediate);this.rig.setBustPitch(bust,immediate);
    const degrees=this.rig.bendTarget*180/Math.PI,pitch=this.rig.bustTarget*180/Math.PI;
    $('rig-waist-bend').value=String(degrees);$('rig-waist-bend-value').textContent=`${Math.round(degrees)}°`;
    $('rig-bust-pitch').value=String(pitch);$('rig-bust-pitch-value').textContent=`${pitch.toFixed(1)}°`;
    if(updateUrl){
      const [route,query]=location.hash.split('?'),params=new URLSearchParams(query||'');
      for(const [key,value]of [['bend',degrees],['bust',pitch]]){
        if(Math.abs(value)>.001)params.set(key,String(Number(value.toFixed(1))));else params.delete(key);
      }
      history.replaceState(null,'',`${location.pathname}${location.search}${route}${params.size?'?'+params:''}`);
    }
    this.render();
  }
  setMode(mode){
    if(!Object.hasOwn(MOTIONS,mode))return;
    this.mode=mode;this.rig.trigger=false;this.rig.pendingShot=false;this.rig.preFire=0;
    const motion=MOTIONS[mode];this.rig.setWalking(!!motion.walk);this.rig.setRunning(!!motion.run);this.rig.setKneeling(!!motion.kneel);
    document.querySelectorAll('[data-motion]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.motion===mode)));
    if(this.active){const [route,query]=location.hash.split('?');const params=new URLSearchParams(query||'');params.set('motion',mode);params.delete('time');params.delete('paused');history.replaceState(null,'',`${location.pathname}${location.search}${route}?${params}`);}
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
    const seatLabel=p.runCarryAmount>.5||p.kneelWeaponDrop>.01?'총 지지':'견착';
    const kneeMetric=this.options.debug&&p.kneeSupport.amount>.9?` · 뒷무릎 목표 오차 ${p.kneeSupport.error.toFixed(3)}px`:'';
    $('rig-metrics').textContent=`발사 ${s.shots} · 손잡이 오차 ${s.gripError.toFixed(3)}px · ${seatLabel} 오차 ${stockError.toFixed(3)}px${eyeMetric}${kneeMetric} · ${this.renderer.drawCalls} draws · ${this.renderer.triangles} triangles`;
    const cloth=this.renderer.waistStrain;
    $('rig-springs').textContent=`허리축 ${((p.waist.a-p.pelvis.a)*180/Math.PI).toFixed(1)}° · 호흡·허리 ${(p.bodyMotion.waist*180/Math.PI).toFixed(1)}° · 허리·옷자락 ${p.outfit.enabled?'켜짐':'꺼짐'} · 옷자락 ${(p.outfit.hem*180/Math.PI).toFixed(1)}° · 연결 천 길이 뒤 ${Math.round((cloth?.back??1)*100)}% / 앞 ${Math.round((cloth?.front??1)*100)}% · 흉갑 상대각 ${(p.bustPitch*180/Math.PI).toFixed(1)}°`;
  }
  snapshot(){return {status:this.status,active:this.active,paused:this.paused,mode:this.mode,...this.rig.snapshot(),drawCalls:this.renderer?.drawCalls,triangles:this.renderer?.triangles,
    camera:{pitch:this.options.cameraPitch,effectivePitch:this.renderer?.camera?.pitch??null},
    muzzleLight:{enabled:this.options.muzzleLight,strength:this.options.lightStrength,power:this.renderer?.flashLight?.power??0}};}
}
