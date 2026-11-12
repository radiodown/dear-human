import * as T from '../vendor/three-0.187.0/build/three.module.js';
import {RELOAD,ease,boltPull} from './reload.js';
import {SOCKETS,gunPoint,bodyPoint} from './weapon-pose.js';

const v=(x,y,z)=>new T.Vector3(x,y,z);
const q=(x,y,z)=>new T.Quaternion().setFromEuler(new T.Euler(x,y,z));
const MAG_POSITION=v(0,-.105,.023),MAG_ROTATION=q(-.18,0,0);
const MAG_GRIP=v(-.035,-.015,.01),GRIP_ROTATION=q(0,0,Math.PI/2);
const GRIP_TO_MAG=GRIP_ROTATION.clone().invert();
const HANDLE_POSITION=v(0,.064,-.12),HANDLE_TRAVEL=.045;
export function poseReload(reload,{gun,hips,torso,mag,heldMag,handle}){
  const pull=boltPull(reload);
  handle.position.copy(HANDLE_POSITION);handle.position.z-=pull*HANDLE_TRAVEL;
  mag.visible=!reload||reload.elapsed<RELOAD.out||reload.elapsed>=RELOAD.insert;
  heldMag.visible=false;
  if(!reload)return null;
  const t=reload.elapsed;
  const support={p:gunPoint(gun,SOCKETS.support),q:gun.quaternion.clone().multiply(q(0,0,Math.PI)).multiply(q(.20,0,0))};
  const mountedQ=gun.quaternion.clone().multiply(MAG_ROTATION);
  const grip={p:gunPoint(gun,MAG_POSITION).add(MAG_GRIP.clone().applyQuaternion(mountedQ)),q:mountedQ.clone().multiply(GRIP_ROTATION)};
  const offset=(pose,delta,rotation=pose.q)=>({p:pose.p.clone().add(delta.clone().applyQuaternion(gun.quaternion)),q:rotation});
  const withdrawn=offset(grip,v(0,-.15,0));
  const pouch={p:bodyPoint(hips,torso,v(-.19,-.03,.18)),q:torso.quaternion.clone().multiply(q(-.05,0,-.20)).multiply(GRIP_ROTATION)};
  const approach=offset(grip,v(0,-.10,0));
  const tap=offset(grip,v(0,-.025,0));
  const clear=offset(grip,v(-.045,-.035,.015));
  const bolt={p:gunPoint(gun,v(-.045,.064,-.12)),q:gun.quaternion.clone().multiply(q(-.25,0,Math.PI/2))};
  const boltBack=offset(bolt,v(0,0,-HANDLE_TRAVEL));
  const frames=[[0,support],[.12,support],[RELOAD.grab,grip],[RELOAD.out,grip],[.70,withdrawn],[RELOAD.stow,pouch],[RELOAD.fresh,pouch],[1.24,approach],[RELOAD.insert,grip],[1.52,tap],[RELOAD.tap,grip],[1.72,clear]];
  if(reload.empty)frames.push([1.98,bolt],[RELOAD.boltStart,bolt],[RELOAD.boltPull,boltBack],[RELOAD.boltRelease,boltBack],[RELOAD.boltEnd,bolt],[2.40,bolt],[2.72,support],[RELOAD.empty,support]);
  else frames.push([2.08,support],[RELOAD.normal,support]);
  let i=0;while(i<frames.length-2&&t>frames[i+1][0])i++;
  const [start,a]=frames[i],[end,b]=frames[i+1],blend=ease((t-start)/(end-start));
  const hand={p:a.p.clone().lerp(b.p,blend),q:a.q.clone().slerp(b.q,blend)};
  heldMag.visible=t>=RELOAD.out&&t<RELOAD.insert&&(t<RELOAD.stow||t>=RELOAD.fresh);
  // A single hand-to-magazine transform: the prop follows the hand, never vice versa.
  heldMag.quaternion.copy(hand.q).multiply(GRIP_TO_MAG);
  heldMag.position.copy(hand.p).sub(MAG_GRIP.clone().applyQuaternion(heldMag.quaternion));
  return hand;
}
