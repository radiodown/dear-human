// Right-facing sagittal gait. World Y points down; the floor is Y=0.
import { HUMAN } from './proportions.js';
export const GAIT = Object.freeze({ period:1.08, speed:104, stance:.62, lift:16,
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
    angle=curve([[0,-.16],[.16,0],[.72,0],[1,.30]],u);
  }else{
    const u=(p-GAIT.stance)/(1-GAIT.stance),m=-stride*(1-GAIT.stance);
    x=hermite(back,front,m,m,u);
    lift=GAIT.lift*Math.sin(Math.PI*u)**1.4;
    angle=curve([[0,.30],[.25,.17],[.55,-.09],[.84,-.18],[1,-.16]],u);
  }
  const foot=footPose(lerp(layer===0?16:-8,x,amount),lift*amount,angle*amount);
  return {...foot,phase:p,stance:p<GAIT.stance||amount<.001};
}
export function gaitBody(phase,amount,time){
  const p=cycle(phase/Math.PI),bob=curve([[0,0],[.18,3.1],[.5,-1.1],[.79,-2.4],[1,0]],p);
  return {x:Math.sin(phase)*.55*amount,y:HUMAN.hipY+amount*bob+Math.sin(time*Math.PI*.5)*.12*(1-amount),
    a:Math.sin(phase)*.006*amount,lean:(.018+Math.sin(phase*2)*.003)*amount};
}
