import {MAG_SIZE,advanceReload} from './reload.js';
import {dampedSpring,clamp,stepLength,TAU} from './motion.js';
export const STEP=1/60;
export function newState(){return {x:0,facing:1,speed:0,phase:0,time:0,cooldown:0,shots:0,ammo:MAG_SIZE,reload:null,reloadRequested:false,reloadEvents:[],recoil:0,flash:0,aim:0,crouched:false,crouch:0,firing:false,lastShot:-100,kick:{x:0,v:0},body:{x:0,v:0},headLag:{x:0,v:0},stance:{x:0,v:0},drive:{x:0,v:0},twist:{x:0,v:0},impact:{x:0,v:0},reloadJolt:{x:0,v:0},cloth:{x:0,v:0}};}
// Exact critically damped response: stable at fixed ticks and independent of render calls.
export function spring(channel,target,omega,dt){const y=channel.x-target,j=(channel.v+omega*y)*dt,e=Math.exp(-omega*dt);channel.x=target+(y+j)*e;channel.v=(channel.v-omega*j)*e;}
export function advance(s,input,dt=STEP){
  s.time+=dt;
  const reloading=advanceReload(s,input.fire,dt);
  const crouchTarget=Number(s.crouched),previousCrouch=s.crouch,previousSpeed=s.speed,previousPhase=s.phase;
  spring(s.stance,crouchTarget,s.crouched?18:16,dt);
  s.crouch=clamp(s.stance.x,0,1);
  if(Math.abs(crouchTarget-s.crouch)<.001&&Math.abs(s.stance.v)<.01){s.crouch=s.stance.x=crouchTarget;s.stance.v=0;}
  if(s.crouched&&previousCrouch<.94&&s.crouch>=.94)s.impact.v+=2.4;
  const direction=Number(input.right)-Number(input.left);
  const desired=Math.abs(direction)*1.3*(1-.5*s.crouch)*(reloading ? .75 : 1);
  s.speed+=(desired-s.speed)*(1-Math.exp(-dt*14));
  if(direction){if(direction!==s.facing&&s.speed>.15){s.twist.v+=direction*3;s.impact.v+=.8;}s.facing=direction;}
  s.x=Math.max(-5,Math.min(5,s.x+direction*s.speed*dt));
  if(s.speed>.01)s.phase+=dt*s.speed*TAU/stepLength(s.crouch);
  for(const offset of [0,Math.PI])if(Math.floor((previousPhase+offset)/TAU)!==Math.floor((s.phase+offset)/TAU)&&s.speed>.2)s.impact.v+=2.6*(s.speed/1.3)*(1-.4*s.crouch);
  spring(s.drive,clamp((s.speed-previousSpeed)/dt/12,-1,1),18,dt);
  for(const cue of s.reloadEvents){
    if(cue==='magout')s.reloadJolt.v-=1.0;
    if(cue==='magin'){s.reloadJolt.v+=3.2;s.impact.v+=.7;}
    if(cue==='tap')s.reloadJolt.v+=1.8;
    if(cue==='bolt')s.reloadJolt.v-=2.5;
  }
  s.cooldown=Math.max(0,s.cooldown-dt);s.flash=Math.max(0,s.flash-dt);
  const shot=input.fire&&!reloading&&s.ammo>0&&s.cooldown<=1e-8;
  if(shot){
    const first=s.time-s.lastShot>.22,variation=1+Math.sin((s.shots+1)*2.4)*.07,brace=1-.22*s.crouch;
    s.cooldown=.1;s.flash=.045;s.shots++;s.ammo--;s.lastShot=s.time;
    s.kick.v+=(first?130:112)*variation*brace;s.body.v+=(first?16:12)*brace;
    s.twist.v+=(s.shots%2?1:-1)*3.4*brace;
  }
  s.firing=Boolean(input.fire)&&!reloading&&s.ammo>0;
  const braced=!reloading&&(input.fire||s.time-s.lastShot<.24);
  s.aim+=(Number(braced)-s.aim)*(1-Math.exp(-dt*(braced?18:6)));
  dampedSpring(s.kick,0,55,.65,dt);dampedSpring(s.body,0,20,.78,dt);
  dampedSpring(s.twist,0,32,.72,dt);dampedSpring(s.impact,0,24,.70,dt);dampedSpring(s.reloadJolt,0,34,.58,dt);
  spring(s.headLag,s.body.x,13,dt);spring(s.cloth,s.body.x+s.drive.x*.25+s.impact.x*.7,9,dt);
  s.recoil=s.kick.x;
  return shot;
}
