export const STEP=1/60;
export function newState(){return {x:0,facing:1,speed:0,phase:0,time:0,cooldown:0,shots:0,recoil:0,flash:0};}
export function advance(s,input,dt=STEP){
  s.time+=dt;
  const direction=Number(input.right)-Number(input.left);
  const desired=Math.abs(direction)*1.3;
  s.speed+=(desired-s.speed)*(1-Math.exp(-dt*14));
  if(direction)s.facing=direction;
  s.x=Math.max(-5,Math.min(5,s.x+direction*s.speed*dt));
  if(s.speed>.01)s.phase+=dt*s.speed*8;
  s.cooldown=Math.max(0,s.cooldown-dt);s.flash=Math.max(0,s.flash-dt);s.recoil*=Math.exp(-dt*22);
  const shot=input.fire&&s.cooldown<=1e-8;
  if(shot){s.cooldown=.1;s.recoil=1;s.flash=.045;s.shots++;}
  return shot;
}
