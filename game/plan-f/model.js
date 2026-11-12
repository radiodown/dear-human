import * as T from '../vendor/three-0.187.0/build/three.module.js';
import {buildLian} from './model-build.js';
import {SOCKETS,twoBone,bodyPoint,gunPoint} from './weapon-pose.js';
export function createLian(){
  const {root,hips,torso,head,hair,capes,legs,arms,gun,muzzle,flash,lamp,poseSegment}=buildLian();
  const v=(x,y,z)=>new T.Vector3(x,y,z);
  function pose(state) {
    const stride=state.speed/1.3,phase=state.phase,aim=state.aim;
    const kick=state.kick.x,body=state.body.x,lag=state.headLag.x;
    const bob=Math.abs(Math.sin(phase))*.017*stride;
    hips.position.set(0,.885+bob-.015*aim,.012*aim-body*.012);
    torso.rotation.set(.07+aim*.10+stride*.025-body*.07,.30+.06*aim,body*.012);
    torso.position.set(0,.08-body*.008,-body*.026);
    head.position.set(.038+.01*aim,.53-.01*aim,.025);
    head.rotation.set(-torso.rotation.x*.45+lag*.045,-torso.rotation.y-.04+.025*aim,-.025*aim);
    root.position.x=state.x;root.rotation.y=state.facing*.80;
    hips.updateMatrix();torso.updateMatrix();
    // Stock follows the shoulder pocket; rotation happens around its contact, not the receiver.
    const pocket=bodyPoint(hips,torso,v(.115,.348,.050));
    pocket.z-=kick*.004;
    gun.rotation.set(-.008-kick*.072,-body*.012, -.025-kick*.018);
    gun.position.copy(pocket).sub(SOCKETS.stock.clone().applyQuaternion(gun.quaternion));
    for(const l of legs) {
      const p=phase+(l.sign<0?Math.PI:0),s=Math.sin(p);
      const stagger=-l.sign*.125*(1-stride);
      const ankle=v(l.sign*.115,.085+Math.max(0,Math.cos(p))*.085*stride,stagger+s*.23*stride);
      const hip=v(l.sign*.09,hips.position.y-.05,hips.position.z);
      const mid=twoBone(hip,ankle,l.thigh.length,l.shin.length,v(0,0,1));
      poseSegment(l.thigh,hip,mid);poseSegment(l.shin,mid,ankle);
      l.boot.position.copy(ankle).add(v(0,-.08,0));l.boot.rotation.x=Math.max(0,-Math.cos(p))*.18*stride;
    }
    for(const a of arms) {
      const shoulder=bodyPoint(hips,torso,v(a.sign*.195,.355,0));
      const wrist=gunPoint(gun,a.sign>0?SOCKETS.trigger:SOCKETS.support);
      const elbow=twoBone(shoulder,wrist,a.upper.length,a.lower.length,v(a.sign>0?.6:-.25,-1,a.sign>0?-.2:.12));
      poseSegment(a.upper,shoulder,elbow);poseSegment(a.lower,elbow,wrist);a.hand.position.copy(wrist);
      a.hand.quaternion.copy(gun.quaternion);
      if(a.sign<0){a.hand.rotateZ(Math.PI);a.hand.rotateX(.20);}else a.hand.rotateX(-.16);
    }
    hair.forEach((h,i)=>{h.rotation.x=-stride*.10+Math.sin(state.time*3+i*.4)*.018+(body-lag)*.16;});
    for(const c of capes){const pos=c.geometry.attributes.position;
      for(let i=0;i<pos.count;i++){const x=c.rest[i*3],y=c.rest[i*3+1],z=c.rest[i*3+2],f=Math.max(0,-y);pos.setXYZ(i,x,y,z-stride*f*.17+Math.sin(state.time*3+x*8+f*4)*f*.025+(body-lag)*f*.08);}
      pos.needsUpdate=true;c.geometry.computeVertexNormals();}
    flash.visible=state.flash>0;flash.scale.setScalar(.8+state.flash*5);lamp.intensity=state.flash>0?3:0;
    root.updateMatrixWorld(true);
  }
  return {root,muzzle,pose};
}
