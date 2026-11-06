import { CharacterRig, STEP } from './animation/rig-core.js';
import { WebGLCharacter } from './animation/webgl-character.js';

const $=id=>document.getElementById(id);
const definitionUrl='/art/characters/clone_01/motion/rig_002/rig/parts.json';
const imageCache=new Map();
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
      this.definition=await response.json();const images=await Promise.all(Object.values(this.definition.atlases).map(x=>loadImage(x.path)));
      this.renderer=new WebGLCharacter($('rig-canvas'),images[0],images[1],this.definition);this.status='ready';$('rig-loading').hidden=true;
      $('rig-atlas-link').href='/'+this.definition.atlases.character.path;
      this.render();this.schedule();
    }catch(error){this.status='failed';$('rig-loading').hidden=false;$('rig-loading').textContent=error.message;}
  }
  bind(){
    document.querySelectorAll('[data-motion]').forEach(b=>b.addEventListener('click',()=>this.setMode(b.dataset.motion)));
    $('rig-shot').addEventListener('click',()=>{this.rig.fire();this.render();});
    $('rig-turn').addEventListener('click',()=>{this.rig.turn();this.render();});
    $('rig-hit').addEventListener('click',()=>{this.rig.hit();this.render();});
    $('rig-reload').addEventListener('click',()=>{this.rig.startReload();this.render();});
    $('rig-empty-reload').addEventListener('click',()=>{this.rig.ammo=0;this.rig.startReload();this.render();});
    $('rig-pause').addEventListener('click',()=>{this.paused=!this.paused;this.rig.trigger=false;$('rig-pause').textContent=this.paused?'재생':'일시정지';this.last=0;this.render();});
    $('rig-step').addEventListener('click',()=>{this.paused=true;$('rig-pause').textContent='재생';this.rig.advance(1/60);this.render();});
    $('rig-reset').addEventListener('click',()=>{this.rig=new CharacterRig();this.paused=false;$('rig-pause').textContent='일시정지';$('rig-weapon').value='m16_basic';this.setMode('idle');this.syncToggles();this.render();});
    $('rig-speed').addEventListener('change',e=>{this.speed=Number(e.target.value);});
    $('rig-size').addEventListener('change',e=>{this.options.size=Number(e.target.value);this.render();});
    $('rig-weapon').addEventListener('change',e=>{if(!this.rig.equip(e.target.value))e.target.value=this.rig.weapon.id;this.render();});
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
      if(e.code==='KeyA'||e.code==='ArrowLeft'){if(this.rig.facing!==-1)this.rig.turn();this.rig.setWalking(true);}
      if(e.code==='KeyD'||e.code==='ArrowRight'){if(this.rig.facing!==1)this.rig.turn();this.rig.setWalking(true);}
    });
    window.addEventListener('keyup',e=>{if(!this.active)return;if(e.code==='Space')release();if(['KeyA','KeyD','ArrowLeft','ArrowRight'].includes(e.code))this.rig.setWalking(this.mode==='walk'||this.mode==='walk_fire');});
    new ResizeObserver(()=>{if(this.renderer&&this.active)this.render();}).observe($('rig-stage'));
  }
  syncToggles(){for(const key of ['recoil','head','hair','cloth','cape'])this.rig.enabled[key]=$('rig-fx-'+key).checked;}
  setMode(mode){
    this.mode=mode;this.rig.trigger=false;this.rig.setWalking(mode==='walk'||mode==='walk_fire');
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
      this.rig.trigger=this.rig.trigger||this.mode==='fire'||this.mode==='walk_fire';
      this.rig.advance(dt*this.speed);
    }
    this.render();this.schedule();
  }
  render(){
    if(!this.renderer||!this.active)return;
    this.renderer.render(this.rig,{...this.options,zoom:this.zoom});
    const s=this.rig.snapshot(),reload=s.reload;
    $('rig-ammo').textContent=`${String(s.ammo).padStart(2,'0')} / 30`;
    $('rig-state').textContent=reload?`장전 ${reload.empty?'빈 탄창':'일반'} · ${reload.t.toFixed(1)} / ${reload.duration.toFixed(1)}초`:this.paused?'일시정지':this.mode==='idle'?'대기':this.mode==='walk'?'이동':this.mode==='fire'?'사격':'이동 사격';
    $('rig-metrics').textContent=`발사 ${s.shots} · 손잡이 오차 ${s.gripError.toFixed(3)}px · ${this.renderer.drawCalls} draws · ${this.renderer.triangles} triangles`;
    $('rig-springs').textContent=`고개 ${s.springs.head.toFixed(2)} · 머리카락 ${s.springs.hair.toFixed(2)} · 망토 ${s.springs.cape.toFixed(2)} · 흉갑 rigid`;
  }
  snapshot(){return {status:this.status,active:this.active,paused:this.paused,mode:this.mode,...this.rig.snapshot(),drawCalls:this.renderer?.drawCalls,triangles:this.renderer?.triangles};}
}
