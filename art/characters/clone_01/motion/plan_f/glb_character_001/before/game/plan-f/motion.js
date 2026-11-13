import {ease} from './reload.js';

export const TAU=Math.PI*2;
export const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export const stepLength=crouch=>.78-.26*crouch;

// Exact underdamped oscillator. The small overshoot gives impact a visible recovery.
export function dampedSpring(channel,target,omega,damping,dt){
  const y=channel.x-target,decay=omega*damping,frequency=omega*Math.sqrt(1-damping*damping);
  const a=y,b=(channel.v+decay*y)/frequency,c=Math.cos(frequency*dt),s=Math.sin(frequency*dt),e=Math.exp(-decay*dt);
  const position=a*c+b*s;
  channel.x=target+e*position;
  channel.v=e*(-decay*position+frequency*(-a*s+b*c));
}

export function sampleStep(state,sign){
  const move=clamp(state.speed/.55,0,1),crouch=state.crouch;
  const u=((state.phase+(sign<0?Math.PI:0))/TAU)%1,stance=.62;
  const span=stepLength(crouch)*stance*.5;
  let forward,lift=0,pitch;
  if(u<stance){
    const t=u/stance;
    forward=span*(1-2*t);
    pitch=-.16*(1-ease(t/.18))+.23*ease((t-.78)/.22);
  }else{
    const t=(u-stance)/(1-stance),s=ease(t);
    forward=span*(2*s-1);
    lift=Math.pow(Math.sin(Math.PI*t),1.25)*.12*(1-.5*crouch);
    pitch=.23*(1-s)-.16*s-.14*Math.sin(Math.PI*t);
  }
  pitch*=move;
  // Raise the ankle as the heel/toe rolls, keeping the boot sole above the floor.
  const rollLift=Math.max(0,Math.sin(pitch))*.16+Math.max(0,-Math.sin(pitch))*.08;
  return {forward:forward*move-sign*.125*(1-move)*(1-.65*crouch),lift:lift*move+rollLift,pitch};
}
