import { CharacterRig, STEP } from './animation/rig-core.js';
import { WebGLCharacter } from './animation/webgl-character.js';

const $=id=>document.getElementById(id);
const definitionUrl='/art/characters/clone_01/motion/rig_005/rig/parts.json';
const imageCache=new Map();
export const MOTIONS=Object.freeze({
  idle:{label:'견착 대기'},walk:{label:'이동',walk:true},fire:{label:'서서쏴',fire:true},
  walk_fire:{label:'이동 사격',walk:true,fire:true},run:{label:'달리기',walk:true,run:true},
  run_fire:{label:'뛰며쏴',walk:true,run:true,fire:true},kneel:{label:'앉기',kneel:true},
  kneel_fire:{label:'앉아쏴',kneel:true,fire:true}
});
function loadImage(path){if(!imageCache.has(path))imageCache.set(path,new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error(`이미지 로드 실패: ${path}`));im.src='/'+path;}));return imageCache.get(path);}
export class RigLab {
  constructor(){
    this.rig=new CharacterRig();this.active=false;this.paused=false;this.speed=1;this.zoom=1;this.mode='idle';
    this.options={debug:false,mesh:false,explode:false,showCape:true,size:300};this.status='loading';this.raf=0;
    this.bind();
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
      $('rig-hand-link').href='/'+this.definition.atlases.underhand_011.path;
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
    $('rig-reset').addEventListener('click',()=>{this.rig=new CharacterRig();this.paused=false;$('rig-pause').textContent='일시정지';$('rig-weapon').value='m16_basic';this.setArticulation(0,0,{immediate:true});this.setMode('idle');this.syncToggles();this.render();});
    $('rig-speed').addEventListener('change',e=>{this.speed=Number(e.target.value);});
    $('rig-size').addEventListener('change',e=>{this.options.size=Number(e.target.value);this.render();});
    $('rig-weapon').addEventListener('change',e=>{if(!this.rig.equip(e.target.value))e.target.value=this.rig.weapon.id;this.render();});
    const articulation=()=>this.setArticulation(Number($('rig-waist-bend').value),Number($('rig-bust-pitch').value),{immediate:this.paused});
    $('rig-waist-bend').addEventListener('input',articulation);
    $('rig-bust-pitch').addEventListener('input',articulation);
    $('rig-bend-reset').addEventListener('click',()=>this.setArticulation(0,0,{immediate:this.paused}));
    for(const key of ['debug','mesh','explode','showCape'])$('rig-'+key).addEventListener('change',e=>{this.options[key]=e.target.checked;this.render();});
    for(const key of ['recoil','head','hair','cloth','cape'])$('rig-fx-'+key).addEventListener('change',e=>{this.rig.enabled[key]=e.target.checked;this.render();});
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
  syncToggles(){for(const key of ['recoil','head','hair','cloth','cape'])this.rig.enabled[key]=$('rig-fx-'+key).checked;}
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
    const eyeMetric=p.aimAmount>.5&&p.eyeSightError!==null?` · 눈·조준선 ${Math.abs(p.eyeSightError).toFixed(1)}px`:'';
    $('rig-metrics').textContent=`발사 ${s.shots} · 손잡이 오차 ${s.gripError.toFixed(3)}px · 견착 오차 ${stockError.toFixed(3)}px${eyeMetric} · ${this.renderer.drawCalls} draws · ${this.renderer.triangles} triangles`;
    const cloth=this.renderer.waistStrain;
    $('rig-springs').textContent=`허리축 ${((p.waist.a-p.pelvis.a)*180/Math.PI).toFixed(1)}° · 연결 천 길이 뒤 ${Math.round((cloth?.back??1)*100)}% / 앞 ${Math.round((cloth?.front??1)*100)}% · 흉갑 상대각 ${(p.bustPitch*180/Math.PI).toFixed(1)}° · 몸통/바스트/허리/스커트 분리`;
  }
  snapshot(){return {status:this.status,active:this.active,paused:this.paused,mode:this.mode,...this.rig.snapshot(),drawCalls:this.renderer?.drawCalls,triangles:this.renderer?.triangles};}
}
