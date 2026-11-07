import {WebGLCharacter} from './animation/webgl-character.js';
import {PartsFramePlayer,PARTS_FRAME_MOTIONS} from './animation/parts-frame-player.js';
const $=id=>document.getElementById(id);
const root='/art/characters/clone_01/motion/parts_v2/frame_clips_001/clips/';
const fpsChoices=[6,12,18,24];
async function json(path){const response=await fetch(path);if(!response.ok)throw new Error('프레임 동작을 불러오지 못했습니다.');return response.json();}
async function image(path){const im=new Image();im.src='/'+path;await im.decode();return im;}

export class PartsV2Lab {
  constructor(){
    this.player=new PartsFramePlayer();this.mode='walk';this.active=false;this.status='idle';this.facing=1;
    this.options={cameraPitch:12,showCape:true};this.cache=new Map();this.request=0;this.raf=0;this.last=null;
    this.tick=this.tick.bind(this);
    document.querySelectorAll('[data-v2-motion]').forEach(button=>button.addEventListener('click',()=>this.setMode(button.dataset.v2Motion)));
    $('v2-pause').addEventListener('click',()=>this.pause(!this.player.paused));
    $('v2-prev').addEventListener('click',()=>this.step(-1));$('v2-next').addEventListener('click',()=>this.step(1));
    $('v2-restart').addEventListener('click',()=>this.seek(0));
    $('v2-frame').addEventListener('input',event=>this.seek(Number(event.target.value)));
    $('v2-fps').addEventListener('change',event=>{this.player.fpsOverride=Number(event.target.value)||null;this.resetClock();this.sync();this.writeUrl();this.schedule();});
    $('v2-loop').addEventListener('change',event=>{this.player.loop=event.target.checked;this.writeUrl();});
    $('v2-turn').addEventListener('click',()=>{this.facing*=-1;this.render();this.writeUrl();});
    $('v2-camera').addEventListener('change',event=>{this.options.cameraPitch=Number(event.target.value);this.render();this.writeUrl();});
    $('v2-cape').addEventListener('change',event=>{this.options.showCape=event.target.checked;this.render();});
    $('rig-v2-view').addEventListener('keydown',event=>{
      if(!this.active||/INPUT|SELECT|TEXTAREA|BUTTON/.test(event.target.tagName))return;
      if(event.code==='Space'){event.preventDefault();this.pause(!this.player.paused);}
      if(['ArrowLeft','ArrowRight'].includes(event.code)){event.preventDefault();this.step(event.code==='ArrowLeft'?-1:1);}
    });
    document.addEventListener('visibilitychange',()=>{this.resetClock();this.schedule();});
    new ResizeObserver(()=>this.render()).observe($('v2-stage'));
    this.sync();
  }
  async init(){
    if(this.initializing)return this.initializing;
    this.status='loading';this.message('프레임 동작을 불러오는 중…');
    this.initializing=(async()=>{
      const manifest=await json(root+'manifest.json'),definition=await json(root+manifest.definition);
      const images=await Promise.all(Object.entries(definition.atlases).map(async([key,atlas])=>[key,await image(atlas.path)]));
      this.manifest=manifest;this.renderer=new WebGLCharacter($('v2-canvas'),Object.fromEntries(images),definition);
      await this.loadClip(this.mode,this.pendingFrame??0);
    })().catch(error=>{this.status='failed';this.message(error.message);this.initializing=null;});
    return this.initializing;
  }
  message(value){$('v2-loading').textContent=value;$('v2-loading').hidden=false;$('v2-canvas').style.visibility='hidden';}
  async loadClip(mode,index=0){
    const request=++this.request;this.cancel();this.status='loading';this.player.clip=null;this.message('프레임 동작을 불러오는 중…');this.sync();
    try{
      const source=this.manifest.clips.find(clip=>clip.id===mode);if(!source)throw new Error('준비되지 않은 동작입니다.');
      if(!this.cache.has(mode)){
        const pending=json(root+source.path);this.cache.set(mode,pending);
        pending.catch(()=>{if(this.cache.get(mode)===pending)this.cache.delete(mode);});
      }
      const clip=await this.cache.get(mode);
      if(request!==this.request||mode!==this.mode)return;
      this.player.load(clip,index);this.pendingFrame=null;this.status='ready';this.resetClock();
      $('v2-loading').hidden=true;$('v2-canvas').style.visibility='';
      $('v2-frames').replaceChildren(...clip.frames.map((frame,i)=>{
        const button=document.createElement('button');button.type='button';button.textContent=String(i+1).padStart(2,'0');
        button.setAttribute('aria-label',`${i+1}프레임${frame.label==='발사'?' · 발사':''}`);button.dataset.shot=String(frame.label==='발사');
        button.addEventListener('click',()=>this.seek(i));return button;
      }));
      this.render();this.sync();this.schedule();
    }catch(error){if(request===this.request){this.status='failed';this.message(error.message);this.sync();}}
  }
  setMode(mode){
    if(!Object.hasOwn(PARTS_FRAME_MOTIONS,mode))return;
    this.mode=mode;this.pendingFrame=0;this.player.seek(0);
    if(this.renderer&&this.manifest)this.loadClip(mode);
    this.sync();this.writeUrl();
  }
  restoreParams(params){
    const mode=params.get('motion');this.mode=Object.hasOwn(PARTS_FRAME_MOTIONS,mode)?mode:'walk';
    const frame=Number(params.get('frame'));this.pendingFrame=Number.isFinite(frame)?Math.max(0,Math.trunc(frame)):0;
    this.player.paused=params.get('paused')==='1';this.player.loop=params.get('loop')!=='0';
    const fps=Number(params.get('fps'));this.player.fpsOverride=fpsChoices.includes(fps)?fps:null;
    this.facing=params.get('face')==='left'?-1:1;
    const pitch=Number(params.get('viewPitch'));this.options.cameraPitch=params.has('viewPitch')&&[0,12,20].includes(pitch)?pitch:12;
    if(this.renderer&&this.manifest)this.loadClip(this.mode,this.pendingFrame);
    this.sync();
  }
  writeParams(params){
    for(const key of ['study','pixelView','time','weapon','debug','mesh','waist','bend','bust','weaponDrop','energy','fireBend','runFireBend','carryDrop','kneelDrop','recoil','head','hair','cloth','cape','light','lightStrength'])params.delete(key);
    params.set('plan','parts-v2');params.set('motion',this.mode);
    const frame=this.pendingFrame??this.player.index;
    if(frame)params.set('frame',String(frame));else params.delete('frame');
    if(this.player.paused)params.set('paused','1');else params.delete('paused');
    if(this.player.fpsOverride)params.set('fps',String(this.player.fpsOverride));else params.delete('fps');
    if(!this.player.loop)params.set('loop','0');else params.delete('loop');
    if(this.facing===-1)params.set('face','left');else params.delete('face');
    if(this.options.cameraPitch!==12)params.set('viewPitch',String(this.options.cameraPitch));else params.delete('viewPitch');
  }
  writeUrl(){
    if(!this.active)return;
    const[route,query]=location.hash.split('?'),params=new URLSearchParams(query||'');this.writeParams(params);
    history.replaceState(null,'',`${location.pathname}${location.search}${route}?${params}`);
  }
  pause(paused){
    if(!paused&&this.player.finished)this.player.seek(0);
    this.player.paused=paused;this.resetClock();this.sync();this.writeUrl();this.schedule();
  }
  seek(index){this.player.paused=true;this.player.seek(index);this.resetClock();this.render();this.sync();this.writeUrl();this.schedule();}
  step(direction){this.player.step(direction);this.resetClock();this.render();this.sync();this.writeUrl();this.schedule();}
  show(active){
    this.active=active;this.resetClock();this.cancel();
    if(!active)return;
    if(!this.renderer)this.init();else{this.render();this.schedule();}
  }
  cancel(){cancelAnimationFrame(this.raf);this.raf=0;}
  resetClock(){this.last=null;this.player.elapsed=0;}
  schedule(){
    this.cancel();
    if(this.active&&this.status==='ready'&&!this.player.paused&&!document.hidden)this.raf=requestAnimationFrame(this.tick);
  }
  tick(now){
    this.raf=0;const delta=this.last===null?0:Math.min(now-this.last,250);this.last=now;
    if(this.player.advance(delta)){this.render();this.sync();if(this.player.finished)this.writeUrl();}
    if(this.active&&this.status==='ready'&&!this.player.paused&&!document.hidden)this.raf=requestAnimationFrame(this.tick);
  }
  render(){
    if(!this.active||this.status!=='ready'||!this.renderer||!this.player.frame)return;
    const frame=this.player.frame;
    const held={...frame.render,facing:this.facing,distance:0,pose:()=>frame.pose};
    this.renderer.render(held,this.options);
  }
  sync(){
    const ready=this.status==='ready',count=this.player.clip?.frames.length??0;
    document.querySelectorAll('[data-v2-motion]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.v2Motion===this.mode)));
    for(const id of ['v2-prev','v2-next','v2-pause','v2-restart','v2-frame'])$(id).disabled=!ready;
    $('v2-pause').textContent=this.player.paused?'재생':'일시정지';$('v2-loop').checked=this.player.loop;
    $('v2-fps').value=this.player.fpsOverride??'default';$('v2-camera').value=this.options.cameraPitch;
    $('v2-frame').max=Math.max(0,count-1);$('v2-frame').value=this.player.index;
    $('v2-frame-value').textContent=count?`${this.player.index+1} / ${count}`:'—';
    $('v2-frame-count').textContent=count?`${String(this.player.index+1).padStart(2,'0')} / ${count}`:'—';
    $('v2-state').textContent=PARTS_FRAME_MOTIONS[this.mode];
    $('v2-caption').textContent=ready?`${PARTS_FRAME_MOTIONS[this.mode]} · ${count}프레임 · ${Number(this.player.fps.toFixed(1))}fps${this.player.paused?' · 정지':''}`:'동작별 프레임을 준비하는 중입니다.';
    [...$('v2-frames').children].forEach((button,i)=>button.setAttribute('aria-pressed',String(ready&&i===this.player.index)));
  }
}
