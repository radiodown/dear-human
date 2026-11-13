import {newState,advance,STEP} from './simulation.js';
import {MAG_SIZE,requestReload,reloadLabel} from './reload.js';
const $=id=>document.getElementById(id);
const DEFAULT_VIEW={yaw:0,pitch:8.3};
const VIEW_STORAGE='dear-human:plan-f:camera:v1';
export class PlanFLab {
  constructor(){
    this.active=false;this.paused=false;this.neutral=false;this.state=newState();this.keys=new Set();this.pointers=new Map();this.last=0;this.acc=0;this.playback=1;this.singleShot=0;
    this.stage=$('plan-f-stage');this.frame=this.frame.bind(this);
    this.view={...DEFAULT_VIEW};
    let savedView;try{savedView=JSON.parse(localStorage.getItem(VIEW_STORAGE));}catch{}
    this.setView(savedView||{},{save:false,updateUrl:false});
    const clear=()=>{this.keys.clear();this.pointers.clear();this.singleShot=0;this.state.reloadRequested=false;this.last=0;this.acc=0;};this.clear=clear;
    this.stage.addEventListener('keydown',e=>{if(!this.active||this.neutral||/INPUT|SELECT|BUTTON/.test(e.target.tagName))return;if(['KeyA','KeyD','ArrowLeft','ArrowRight','Space','KeyJ','KeyC','KeyR','Escape'].includes(e.code)){e.preventDefault();if(e.code==='Escape'){if(!e.repeat)this.pause();return;}if(e.code==='KeyC'){if(!e.repeat)this.toggleCrouch();return;}if(e.code==='KeyR'){if(!e.repeat)this.reload();return;}this.keys.add(e.code);this.audio?.unlock();}});
    this.stage.addEventListener('keyup',e=>{this.keys.delete(e.code);});
    window.addEventListener('blur',clear);this.stage.addEventListener('blur',clear);
    document.addEventListener('visibilitychange',()=>{clear();if(document.hidden&&this.active)this.pause(true);});
    for(const button of document.querySelectorAll('[data-f-input]')){
      button.addEventListener('pointerdown',e=>{if(!this.active||this.neutral)return;e.preventDefault();button.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,button.dataset.fInput);this.audio?.unlock();});
      for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,e=>this.pointers.delete(e.pointerId));
    }
    $('plan-f-shot').addEventListener('click',()=>{if(this.neutral||this.state.reload||this.state.reloadRequested)return;this.paused=false;this.singleShot=1;this.audio?.unlock();});
    $('plan-f-reload').addEventListener('click',()=>{this.stage.focus();this.reload();});
    $('plan-f-crouch').addEventListener('click',()=>{this.toggleCrouch();this.stage.focus();});
    $('plan-f-speed').addEventListener('change',e=>{this.playback=Number(e.target.value);this.acc=0;});
    for(const key of ['yaw','pitch'])$('plan-f-camera-'+key).addEventListener('input',e=>this.setView({[key]:e.target.value}));
    $('plan-f-camera-reset').addEventListener('click',()=>this.setView(DEFAULT_VIEW));
    $('plan-f-neutral').addEventListener('click',()=>this.setNeutral(!this.neutral));
    for(const button of document.querySelectorAll('[data-f-view]'))button.addEventListener('click',()=>{
      const side=button.dataset.fView;this.setView({yaw:side==='front'?90*this.state.facing:side==='back'?-90*this.state.facing:0,pitch:0});
    });
    $('plan-f-pause').addEventListener('click',()=>this.pause());
    $('plan-f-retry').addEventListener('click',()=>{if(this.active)this.show(true);});
    $('plan-f-reset').addEventListener('click',()=>{clear();this.state=newState();this.effects?.clear();this.paused=false;this.sync();});
    $('plan-f-post').addEventListener('change',e=>{if(this.film)this.film.enabled=e.target.checked;});
    $('plan-f-wet').addEventListener('change',e=>this.world?.setWet(e.target.checked));
    $('plan-f-sound').addEventListener('change',e=>{if(this.audio){this.audio.enabled=e.target.checked;this.audio.unlock();}});
    $('plan-f-canvas').addEventListener('pointerdown',e=>{if(this.neutral||e.button!==0)return;this.stage.focus();this.keys.add('Mouse');e.target.setPointerCapture(e.pointerId);this.audio?.unlock();});
    for(const t of ['pointerup','pointercancel','lostpointercapture'])$('plan-f-canvas').addEventListener(t,()=>this.keys.delete('Mouse'));
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(this.stage);
  }
  setView(values,{save=true,updateUrl=true}={}){
    for(const [key,min,max] of [['yaw',-90,90],['pitch',0,60]]){
      if(values[key]!==undefined){const n=Number(values[key]);this.view[key]=Number.isFinite(n)?Math.round(Math.max(min,Math.min(max,n))*10)/10:DEFAULT_VIEW[key];}
      $('plan-f-camera-'+key).value=this.view[key];
      $('plan-f-camera-'+key+'-value').textContent=`${this.view[key]}°`;
    }
    if(save)try{localStorage.setItem(VIEW_STORAGE,JSON.stringify(this.view));}catch{}
    if(updateUrl&&this.active){const [route]=location.hash.split('?'),p=new URLSearchParams();this.writeParams(p);history.replaceState(null,'',`${location.pathname}${location.search}${route}?${p}`);}
  }
  setNeutral(value,{updateUrl=true}={}){
    this.neutral=value;this.clear();this.effects?.clear();this.inspection?.set(value);this.resize();this.sync();
    if(updateUrl)this.setView({});
  }
  restoreParams(p){this.setNeutral(p.get('fPose')==='neutral',{updateUrl:false});const values={};if(p.has('fYaw'))values.yaw=p.get('fYaw');if(p.has('fPitch'))values.pitch=p.get('fPitch');this.setView(values,{save:false,updateUrl:false});}
  writeParams(p){for(const key of [...p.keys()])p.delete(key);p.set('plan','f');p.set('fYaw',this.view.yaw);p.set('fPitch',this.view.pitch);if(this.neutral)p.set('fPose','neutral');}
  async init(){
    if(this.ready)return;
    if(this.pending){try{await this.pending;}catch{}return;}
    $('plan-f-loading').hidden=false;$('plan-f-loading').textContent='리안을 불러오는 중…';$('plan-f-retry').hidden=true;
    this.pending=(async()=>{
      const [T,{createGlbLian},{createStage},{createEffects,GunAudio},{FilmRenderer},{createInspectionStage}]=await Promise.all([import('../vendor/three-0.187.0/build/three.module.js'),import('./glb-character.js'),import('./environment.js'),import('./effects.js'),import('./render.js'),import('./inspection-stage.js')]);
      this.actor=await createGlbLian();this.actor.pose(this.state,{neutral:this.neutral});
      this.T=T;this.renderer=new T.WebGLRenderer({canvas:$('plan-f-canvas'),antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.0;
      this.scene=new T.Scene();this.camera=new T.OrthographicCamera(-2,2,1.4,-1.4,.1,35);this.world=createStage(this.scene,this.renderer);this.inspection=createInspectionStage(this.scene);this.inspection.set(this.neutral);this.film=new FilmRenderer(this.renderer);this.scene.add(this.actor.root);this.effects=createEffects(this.scene);this.audio=new GunAudio();this.audio.enabled=$('plan-f-sound').checked;
      this.world.setWet($('plan-f-wet').checked);this.film.enabled=$('plan-f-post').checked;
      this.ejectionOrigin=new T.Vector3();this.origin=new T.Vector3();this.direction=new T.Vector3();this.quaternion=new T.Quaternion();this.ready=true;$('plan-f-loading').hidden=true;this.resize();
    })();
    try{await this.pending;}catch(e){$('plan-f-loading').hidden=false;$('plan-f-loading').textContent='리안 또는 훈련장을 불러오지 못했습니다. 다시 시도해 주세요.';$('plan-f-retry').hidden=false;console.error('Plan F',e);this.pending=null;}
  }
  show(active){this.active=active;this.clear();cancelAnimationFrame(this.raf);const generation=this.generation=(this.generation||0)+1;if(!active){this.effects?.clear();return;}this.init().then(()=>{if(this.active&&this.ready&&this.generation===generation){this.resize();this.raf=requestAnimationFrame(this.frame);}});}
  pause(value=!this.paused){this.paused=value;this.clear();this.sync();}
  toggleCrouch(){if(!this.active||this.neutral)return;this.state.crouched=!this.state.crouched;if(this.paused){this.state.crouch=this.state.stance.x=Number(this.state.crouched);this.state.stance.v=0;}this.sync();}
  reload(){if(this.neutral||!this.active||!requestReload(this.state))return;this.singleShot=0;this.paused=false;this.audio?.unlock();this.sync();}
  resize(){if(!this.ready||!this.active)return;const w=this.stage.clientWidth,h=this.stage.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h,false);this.film?.resize(Math.floor(w*this.renderer.getPixelRatio()),Math.floor(h*this.renderer.getPixelRatio()));const span=this.neutral?Math.max(.96,.85*h/w):Math.max(1.23,1.8*h/w);this.camera.left=-span*w/h;this.camera.right=span*w/h;this.camera.top=span;this.camera.bottom=-span;this.camera.updateProjectionMatrix();}
  sync(){
    const s=this.state,low=s.crouch>.5,moving=s.speed>.1;
    $('plan-f-pause').textContent=this.paused?'재개':'일시정지';
    $('plan-f-crouch').textContent=s.crouched?'일어서기 C':'앉기 C';$('plan-f-crouch').setAttribute('aria-pressed',String(s.crouched));
    $('plan-f-status').textContent=this.paused?'일시정지':s.firing?(low?(moving?'앉아 이동 사격':'앉아 사격'):(moving?'이동 사격':'사격')):Math.abs(Number(s.crouched)-s.crouch)>.02?(s.crouched?'앉는 중':'일어서는 중'):s.time-s.lastShot<.35?'반동 복귀':moving?(low?'앉아 이동':'이동'):low?'앉아 대기':'견착 대기';
    $('plan-f-shots').textContent=`${s.shots} 발`;$('plan-f-position').textContent=`${s.x.toFixed(2)} m`;
    $('plan-f-ammo').textContent=`${s.ammo} / ${MAG_SIZE}`;
    const reloading=Boolean(s.reload||s.reloadRequested);
    $('plan-f-reload').disabled=reloading||this.neutral;$('plan-f-shot').disabled=reloading||this.neutral;
    $('plan-f-reload-hud').hidden=!reloading||this.neutral;
    $('plan-f-reload-progress').value=s.reload?s.reload.elapsed/s.reload.duration:0;
    $('plan-f-reload-phase').textContent=s.reload?`${reloadLabel(s.reload)} · ${Math.floor(s.reload.elapsed/s.reload.duration*100)}%`:'장전 준비';
    if(s.reload&&!this.paused&&!this.neutral)$('plan-f-status').textContent=low?'앉아 장전':'장전';
    $('plan-f-neutral').setAttribute('aria-pressed',String(this.neutral));
    $('plan-f-neutral').textContent=this.neutral?'전투 자세로':'중립 자세 비교';
    for(const button of document.querySelectorAll('[data-f-input],#plan-f-crouch,#plan-f-pause,#plan-f-speed'))button.disabled=this.neutral;
    if(this.neutral)$('plan-f-status').textContent='중립 자세 · 외형 비교';
  }
  frame(now){
    if(!this.active)return;
    const dt=this.last?Math.min((now-this.last)/1000,.1):0;this.last=now;
    if(!this.paused&&!this.neutral&&!document.hidden){
      this.acc+=dt*this.playback;const p=[...this.pointers.values()];const input={left:this.keys.has('KeyA')||this.keys.has('ArrowLeft')||p.includes('left'),right:this.keys.has('KeyD')||this.keys.has('ArrowRight')||p.includes('right'),fire:this.keys.has('Space')||this.keys.has('KeyJ')||this.keys.has('Mouse')||p.includes('fire')};
      while(this.acc>=STEP){
        const shot=advance(this.state,{...input,fire:input.fire||this.singleShot>0});
        if(shot||this.state.reloadEvents.includes('start'))this.singleShot=0;
        this.actor.pose(this.state);this.effects.update(STEP,this.actor.muzzle);
        for(const cue of this.state.reloadEvents)this.audio.reload(cue);
        if(shot){this.actor.muzzle.getWorldPosition(this.origin);this.actor.muzzle.getWorldQuaternion(this.quaternion);this.direction.set(0,0,1).applyQuaternion(this.quaternion).normalize();this.actor.ejection.getWorldPosition(this.ejectionOrigin);this.effects.shot(this.origin,this.direction,this.ejectionOrigin,this.quaternion);this.audio.shot();}
        this.acc-=STEP;
      }
    }
    this.actor.pose(this.state,{neutral:this.neutral});
    const x=this.state.x*(this.neutral?1:.85),targetY=this.neutral?.85:.93,yaw=this.view.yaw*Math.PI/180,pitch=this.view.pitch*Math.PI/180,distance=Math.hypot(7,1.02),radius=distance*Math.cos(pitch);
    this.camera.position.set(x+Math.sin(yaw)*radius,targetY+Math.sin(pitch)*distance,Math.cos(yaw)*radius);this.camera.lookAt(x,targetY,0);
    this.world.update(this.state.time);if(this.neutral)this.renderer.render(this.scene,this.camera);else this.film.render(this.scene,this.camera);this.sync();this.raf=requestAnimationFrame(this.frame);
  }
}
