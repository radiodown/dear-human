export const STEP=1/60;
export function newState(){return {x:0,facing:1,speed:0,phase:0,time:0,cooldown:0,shots:0,recoil:0,flash:0,aim:0,crouched:false,crouch:0,firing:false,lastShot:-100,kick:{x:0,v:0},body:{x:0,v:0},headLag:{x:0,v:0}};}
// Exact critically damped response: stable at fixed ticks and independent of render calls.
export function spring(channel,target,omega,dt){const y=channel.x-target,j=(channel.v+omega*y)*dt,e=Math.exp(-omega*dt);channel.x=target+(y+j)*e;channel.v=(channel.v-omega*j)*e;}
export function advance(s,input,dt=STEP){
  s.time+=dt;
  const crouchTarget=Number(s.crouched);
  s.crouch+=(crouchTarget-s.crouch)*(1-Math.exp(-dt*12));
  if(Math.abs(crouchTarget-s.crouch)<.001)s.crouch=crouchTarget;
  const direction=Number(input.right)-Number(input.left);
  const desired=Math.abs(direction)*1.3*(1-.5*s.crouch);
  s.speed+=(desired-s.speed)*(1-Math.exp(-dt*14));
  if(direction)s.facing=direction;
  s.x=Math.max(-5,Math.min(5,s.x+direction*s.speed*dt));
  if(s.speed>.01)s.phase+=dt*s.speed*8;
  s.cooldown=Math.max(0,s.cooldown-dt);s.flash=Math.max(0,s.flash-dt);
  const shot=input.fire&&s.cooldown<=1e-8;
  if(shot){s.cooldown=.1;s.flash=.045;s.shots++;s.lastShot=s.time;s.kick.v+=80;s.body.v+=9;}
  s.firing=Boolean(input.fire);
  const braced=input.fire||s.time-s.lastShot<.24;
  s.aim+=(Number(braced)-s.aim)*(1-Math.exp(-dt*(braced?18:6)));
  spring(s.kick,0,52,dt);spring(s.body,0,17,dt);spring(s.headLag,s.body.x,12,dt);
  s.recoil=s.kick.x;
  return shot;
}
