// Right-facing sagittal gait. World Y points down; the floor is Y=0.
import { HUMAN } from './proportions.js';
export const GAIT = Object.freeze({ period:1.40, speed:108, stance:.68, lift:6.5,
  thigh:76, shin:76, bootWidth:32*247/228, bootHeight:32, ankleU:.35, ankleV:.28 });
const TAU=Math.PI*2;
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=t=>t*t*(3-2*t);
const clamp=t=>Math.max(0,Math.min(1,t));
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
export function gaitFoot(phase,layer,amount){
  const p=cycle(phase/TAU+(layer===0?.5:0)),stride=GAIT.speed*GAIT.period;
  const front=stride*GAIT.stance*.5,back=-front;
  let x,angle,lift=0;
  if(p<GAIT.stance){
    const u=p/GAIT.stance;
    x=lerp(front,back,u); // Linear retreat exactly cancels the actor's world speed.
    angle=curve([[0,-.12],[.16,0],[.72,0],[1,.25]],u);
  }else{
    const u=(p-GAIT.stance)/(1-GAIT.stance),m=-stride*(1-GAIT.stance);
    x=hermite(back,front,m,m,u);
    lift=GAIT.lift*Math.sin(Math.PI*u)**1.4;
    angle=curve([[0,.25],[.25,.13],[.55,-.07],[.84,-.14],[1,-.12]],u);
  }
  const foot=footPose(lerp(layer===0?16:-8,x,amount),lift*amount,angle*amount);
  return {...foot,phase:p,stance:p<GAIT.stance||amount<.001};
}
export function gaitBody(phase,amount,time,aim=0){
  const p=cycle(phase/Math.PI),bob=curve([[0,.5],[.12,3],[.34,2],[.60,-.8],[.87,-.2],[1,.5]],p);
  // Stationary fire needs its own brace. Fade it out as the lower combat gait
  // takes over, keeping planted feet and the existing moving-fire posture.
  const standingBrace=aim*(1-amount);
  // A low, longer combat step: absorb the landing instead of bobbing upwards.
  // Pelvis shift is modest; the torso leans ahead of it while the gun stays level.
  return {x:Math.sin(phase*2-.8)*3.2*amount+standingBrace*2,
    y:HUMAN.hipY+amount*(7+bob)+aim*(1.8+.8*amount)+standingBrace*5+Math.sin(time*Math.PI*.5)*.12*(1-amount),
    a:Math.sin(phase)*.020*amount,lean:aim*.024+standingBrace*.236+amount*(.105+aim*.131+Math.sin(phase*2)*.008)};
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
