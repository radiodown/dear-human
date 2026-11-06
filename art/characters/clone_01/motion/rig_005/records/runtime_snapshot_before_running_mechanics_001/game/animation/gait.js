// Right-facing sagittal gait. World Y points down; the floor is Y=0.
import { HUMAN } from './proportions.js';
export const GAIT = Object.freeze({ period:1.40, speed:108, stance:.68, lift:6.5,
  thigh:76, shin:76, bootWidth:32*247/228, bootHeight:32, ankleU:.35, ankleV:.28 });
export const RUN = Object.freeze({period:.78,speed:195,stance:.46,lift:18});
// Reference kneel: rear knee pad + tucked rear toes + flat forward sole.
// The knee center sits one pad radius above the floor; bones retain their length.
export const KNEEL = Object.freeze({hipX:-6,frontTrack:61,rearRootX:-4,
  rearKnee:Object.freeze({x:-28,y:-16}),rearFootAngle:1.06,lean:.11,aimLean:.12,fireReady:.985});
const TAU=Math.PI*2;
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=t=>t*t*(3-2*t);
const clamp=t=>Math.max(0,Math.min(1,t));
export const kneelWeight=amount=>smooth(clamp(amount/KNEEL.fireReady));
export function kneelHipY(x){
  const dx=KNEEL.rearKnee.x-(x+KNEEL.rearRootX);
  return KNEEL.rearKnee.y-Math.sqrt(Math.max(0,GAIT.thigh**2-dx**2));
}
export const gaitProfile=running=>Object.fromEntries(['period','speed','stance','lift'].map(key=>[key,lerp(GAIT[key],RUN[key],clamp(running))]));
export const cycle=p=>((p%1)+1)%1;
export function curve(keys,t){
  t=clamp(t);
  for(let i=1;i<keys.length;i++)if(t<=keys[i][0]){const [a,x]=keys[i-1],[b,y]=keys[i];return lerp(x,y,smooth((t-a)/(b-a)));}
  return keys.at(-1)[1];
}
function hermite(a,b,ma,mb,t){const t2=t*t,t3=t2*t;return(2*t3-3*t2+1)*a+(t3-2*t2+t)*ma+(-2*t3+3*t2)*b+(t3-t2)*mb;}
export const BOOT = Object.freeze({
  heel:{x:(.08-GAIT.ankleU)*GAIT.bootWidth,y:(1-GAIT.ankleV)*GAIT.bootHeight},
  toe:{x:(.90-GAIT.ankleU)*GAIT.bootWidth,y:(1-GAIT.ankleV)*GAIT.bootHeight}
});
export function footPose(trackX,clearance,angle){
  // Rotate around the planted heel/toe, rather than rotating a boot into the floor.
  const q=angle>0?BOOT.toe:BOOT.heel,c=Math.cos(angle),s=Math.sin(angle);
  const ankle={x:trackX+q.x-(c*q.x-s*q.y),y:-clearance-(s*q.x+c*q.y)};
  const point=p=>({x:ankle.x+c*p.x-s*p.y,y:ankle.y+s*p.x+c*p.y});
  return {...ankle,a:angle,heel:point(BOOT.heel),toe:point(BOOT.toe),trackX,clearance,
    contact:angle>0?'toe':'heel',pivot:point(q)};
}
export function kneelRearFoot(){
  // Solve the ankle from the knee and toe contact, rather than hoping that
  // two independently authored foot/hip positions happen to ground the knee.
  const probe=footPose(0,0,KNEEL.rearFootAngle),dy=probe.y-KNEEL.rearKnee.y;
  const ankleX=KNEEL.rearKnee.x-Math.sqrt(Math.max(0,GAIT.shin**2-dy**2));
  return footPose(ankleX-probe.x,0,KNEEL.rearFootAngle);
}
export function gaitFoot(phase,layer,amount,running=0,kneeling=0){
  const profile=gaitProfile(running),p=cycle(phase/TAU+(layer===0?.5:0)),stride=profile.speed*profile.period;
  const front=stride*profile.stance*.5,back=-front;
  let x,angle,lift=0;
  if(p<profile.stance){
    const u=p/profile.stance;
    x=lerp(front,back,u); // Linear retreat exactly cancels the actor's world speed.
    angle=curve([[0,-.12],[.16,0],[.72,0],[1,.25]],u);
  }else{
    const u=(p-profile.stance)/(1-profile.stance),m=-stride*(1-profile.stance);
    x=hermite(back,front,m,m,u);
    lift=profile.lift*Math.sin(Math.PI*u)**1.4;
    angle=curve([[0,.25],[.25,.13],[.55,-.07],[.84,-.14],[1,-.12]],u);
  }
  // The resting stance keeps a small stagger and soft knees while shouldered.
  const standingTrack=layer===0?20:-20,targetTrack=layer===0?KNEEL.frontTrack:kneelRearFoot().trackX;
  const k=kneelWeight(kneeling),transitionLift=(layer===0?3:7)*Math.sin(Math.PI*k)**2;
  const foot=footPose(lerp(lerp(standingTrack,x,amount),targetTrack,k),lift*amount*(1-k)+transitionLift,
    lerp(angle*amount,layer===0?0:KNEEL.rearFootAngle,k));
  return {...foot,phase:p,stance:k>.999||((p<profile.stance||amount<.001)&&transitionLift<.01)};
}
export function gaitBody(phase,amount,time,aim=0,running=0,kneeling=0,eyeAim=aim,recoilShift=0){
  const p=cycle(phase/Math.PI),bob=curve([[0,.5],[.12,3],[.34,2],[.60,-.8],[.87,-.2],[1,.5]],p);
  // Stationary fire needs its own brace. Fade it out as the lower combat gait
  // takes over, keeping planted feet and the existing moving-fire posture.
  const standingBrace=aim*(1-amount);
  const rest=(1-aim)*(1-amount),breath=Math.sin(time*TAU/3.8);
  const run=running*amount,runBob=curve([[0,4.5],[.20,1],[.48,-2],[.73,-1],[1,4.5]],p);
  // A low, longer combat step: absorb the landing instead of bobbing upwards.
  // Pelvis shift is modest; the torso leans ahead of it while the gun stays level.
  const x=Math.sin(phase*2-.8)*3.2*amount+standingBrace*2+rest*.8;
  const y=HUMAN.hipY+amount*(7+bob)+run*(4+runBob-bob)+aim*(1.8+.8*amount)+standingBrace*5+rest*2.6+breath*.22*(1-amount);
  const sightRest=(1-eyeAim)*(1-amount),sightBrace=eyeAim*(1-amount);
  const lean=sightRest*(.070+breath*.002)+eyeAim*.024+sightBrace*.236+amount*(.105+eyeAim*.131+Math.sin(phase*2)*.008)+run*.045;
  const k=kneelWeight(kneeling),hipX=lerp(x,KNEEL.hipX+eyeAim*1.2,k)+recoilShift;
  // Pelvis height follows the grounded thigh arc, including the small recoil
  // shift. Breathing stays in the upper body instead of lifting the knee pad.
  return {x:hipX,y:lerp(y,kneelHipY(hipX),k),
    a:Math.sin(phase)*.020*amount*(1-k),lean:lerp(lean,KNEEL.lean+eyeAim*KNEEL.aimLean+breath*.001,k)};
}

// One small support step per standing burst, followed by a quiet recovery step.
// It is an authored reaction, not a full-body force simulation.
export class RearBrace {
  constructor(){this.reset();}
  reset(){this.mode='idle';this.t=0;this.x=0;this.lift=0;this.angle=0;}
  shot(walking){if(walking<.08&&this.mode==='idle'){this.mode='back';this.t=0;}}
  step(dt,{aim,walking,enabled=true}){
    if(!enabled||walking>.98){this.reset();return;}
    if(this.mode==='planted'&&aim<.12){this.mode='recover';this.t=0;}
    this.t+=dt;this.lift=0;this.angle=0;
    if(this.mode==='back'||this.mode==='recover'){
      const u=clamp(this.t/.34),s=smooth(u);
      this.x=this.mode==='back'?-4*s:-4*(1-s);
      this.lift=1.8*Math.sin(Math.PI*u)**2;
      this.angle=.055*Math.sin(Math.PI*u);
      if(u===1){this.mode=this.mode==='back'?'planted':'idle';this.lift=this.angle=0;}
    }
  }
  pose(amount=0){const weight=1-amount;return {x:this.x*weight,lift:this.lift*weight,angle:this.angle*weight,mode:this.mode};}
}
