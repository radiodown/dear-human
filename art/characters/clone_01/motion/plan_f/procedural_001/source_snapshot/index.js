import {newState,advance,STEP} from './simulation.js';
const $=id=>document.getElementById(id);
export class PlanFLab {
  constructor(){
    this.active=false;this.paused=false;this.state=newState();this.keys=new Set();this.pointers=new Map();this.last=0;this.acc=0;
    this.stage=$('plan-f-stage');this.frame=this.frame.bind(this);
    const clear=()=>{this.keys.clear();this.pointers.clear();this.last=0;this.acc=0;};this.clear=clear;
    this.stage.addEventListener('keydown',e=>{if(!this.active||/INPUT|SELECT|BUTTON/.test(e.target.tagName))return;if(['KeyA','KeyD','ArrowLeft','ArrowRight','Space','KeyJ','Escape'].includes(e.code)){e.preventDefault();if(e.code==='Escape'){if(!e.repeat)this.pause();return;}this.keys.add(e.code);this.audio?.unlock();}});
    this.stage.addEventListener('keyup',e=>{this.keys.delete(e.code);});
    window.addEventListener('blur',clear);this.stage.addEventListener('blur',clear);
    document.addEventListener('visibilitychange',()=>{clear();if(document.hidden&&this.active)this.pause(true);});
    for(const button of document.querySelectorAll('[data-f-input]')){
      button.addEventListener('pointerdown',e=>{if(!this.active)return;e.preventDefault();button.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,button.dataset.fInput);this.audio?.unlock();});
      for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,e=>this.pointers.delete(e.pointerId));
    }
    $('plan-f-pause').addEventListener('click',()=>this.pause());
    $('plan-f-reset').addEventListener('click',()=>{clear();this.state=newState();this.effects?.clear();this.paused=false;this.sync();});
    $('plan-f-sound').addEventListener('change',e=>{if(this.audio){this.audio.enabled=e.target.checked;this.audio.unlock();}});
    $('plan-f-canvas').addEventListener('pointerdown',e=>{if(e.button!==0)return;this.stage.focus();this.keys.add('Mouse');e.target.setPointerCapture(e.pointerId);this.audio?.unlock();});
    for(const t of ['pointerup','pointercancel','lostpointercapture'])$('plan-f-canvas').addEventListener(t,()=>this.keys.delete('Mouse'));
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(this.stage);
  }
  writeParams(p){for(const key of [...p.keys()])p.delete(key);p.set('plan','f');}
  async init(){
    if(this.ready)return;if(this.pending)return this.pending;
    this.pending=(async()=>{
      const [T,{createLian},{createStage,createEffects,GunAudio}]=await Promise.all([import('../vendor/three-0.187.0/build/three.module.js'),import('./model.js'),import('./stage.js')]);
      this.T=T;this.renderer=new T.WebGLRenderer({canvas:$('plan-f-canvas'),antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;
      this.scene=new T.Scene();this.camera=new T.OrthographicCamera(-2,2,1.4,-1.4,.1,35);createStage(this.scene);this.actor=createLian();this.scene.add(this.actor.root);this.effects=createEffects(this.scene);this.audio=new GunAudio();this.audio.enabled=$('plan-f-sound').checked;
      this.origin=new T.Vector3();this.direction=new T.Vector3();this.quaternion=new T.Quaternion();this.ready=true;$('plan-f-loading').hidden=true;this.resize();
    })();
    try{await this.pending;}catch(e){$('plan-f-loading').hidden=false;$('plan-f-loading').textContent='3D 화면을 시작하지 못했습니다. WebGL2 지원을 확인해 주세요.';console.error('Plan F',e);this.pending=null;}
  }
  show(active){this.active=active;this.clear();cancelAnimationFrame(this.raf);const generation=this.generation=(this.generation||0)+1;if(!active){this.effects?.clear();return;}this.init().then(()=>{if(this.active&&this.ready&&this.generation===generation){this.resize();this.raf=requestAnimationFrame(this.frame);}});}
  pause(value=!this.paused){this.paused=value;this.clear();this.sync();}
  resize(){if(!this.ready||!this.active)return;const w=this.stage.clientWidth,h=this.stage.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h,false);const span=Math.max(1.23,1.8*h/w);this.camera.left=-span*w/h;this.camera.right=span*w/h;this.camera.top=span;this.camera.bottom=-span;this.camera.updateProjectionMatrix();}
  sync(){const s=this.state;$('plan-f-pause').textContent=this.paused?'재개':'일시정지';$('plan-f-status').textContent=this.paused?'일시정지':s.flash>0?(s.speed>.1?'이동 사격':'사격'):s.speed>.1?'이동':'대기';$('plan-f-shots').textContent=`${s.shots} 발`;$('plan-f-position').textContent=`${s.x.toFixed(2)} m`;}
  frame(now){
    if(!this.active)return;
    const dt=this.last?Math.min((now-this.last)/1000,.1):0;this.last=now;
    if(!this.paused&&!document.hidden){
      this.acc+=dt;const p=[...this.pointers.values()];const input={left:this.keys.has('KeyA')||this.keys.has('ArrowLeft')||p.includes('left'),right:this.keys.has('KeyD')||this.keys.has('ArrowRight')||p.includes('right'),fire:this.keys.has('Space')||this.keys.has('KeyJ')||this.keys.has('Mouse')||p.includes('fire')};
      while(this.acc>=STEP){const shot=advance(this.state,input);this.actor.pose(this.state);this.effects.update(STEP);if(shot){this.actor.muzzle.getWorldPosition(this.origin);this.actor.muzzle.getWorldQuaternion(this.quaternion);this.direction.set(0,0,1).applyQuaternion(this.quaternion).normalize();this.effects.shot(this.origin,this.direction);this.audio.shot();}this.acc-=STEP;}
    }
    this.actor.pose(this.state);const x=this.state.x*.85;this.camera.position.set(x,2.25,7);this.camera.lookAt(x, .93,0);this.renderer.render(this.scene,this.camera);this.sync();this.raf=requestAnimationFrame(this.frame);
  }
}
