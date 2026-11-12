import * as T from '../vendor/three-0.187.0/build/three.module.js';
import {buildLian} from './model-build.js';
import {SOCKETS,twoBone,bodyPoint,gunPoint} from './weapon-pose.js';
import {reloadWeight} from './reload.js';
import {poseReload} from './reload-pose.js';
export function createLian(){
  const {root,hips,torso,head,hair,capes,legs,arms,gun,mag,heldMag,handle,muzzle,flash,lamp,poseSegment}=buildLian();
  const v=(x,y,z)=>new T.Vector3(x,y,z);
  const capePoint=new T.Vector3(),capeBack=new T.Vector3(),capeInverse=new T.Matrix4();
  function pose(state) {
    const stride=state.speed/1.3,phase=state.phase,aim=state.aim,crouch=state.crouch||0;
    const kick=state.kick.x,body=state.body.x,lag=state.headLag.x,reload=reloadWeight(state.reload);
    const bob=Math.abs(Math.sin(phase))*.017*stride;
    hips.position.set(0,.885+bob*(1-.5*crouch)-.025*stride-.015*aim-.34*crouch,.012*aim-body*.012-.14*crouch);
    torso.rotation.set(.07+aim*.10+stride*.025-body*.07+.24*crouch,.30+.06*aim,body*.012);
    torso.position.set(0,.08-body*.008,-body*.026);
    head.position.set(.038+.01*aim,.53-.01*aim,.025);
    // Cancel torso lean/twist so the face looks forward in the movement direction.
    head.quaternion.copy(torso.quaternion).invert();head.rotateX(lag*.045);
    root.position.x=state.x;root.rotation.y=state.facing*Math.PI/2;
    capeBack.set(0,0,-1).applyQuaternion(root.quaternion);
    hips.updateMatrix();torso.updateMatrix();
    // Stock follows the shoulder pocket; rotation happens around its contact, not the receiver.
    const pocket=bodyPoint(hips,torso,v(.115,.348,.050));
    pocket.z-=kick*.004;
    pocket.add(v(-.025,-.08,-.08).multiplyScalar(reload));
    gun.rotation.set(-.008-kick*.072+reload*.22,-body*.012-reload*.08, -.025-kick*.018+reload*.30);
    gun.position.copy(pocket).sub(SOCKETS.stock.clone().applyQuaternion(gun.quaternion));
    const reloadHand=poseReload(state.reload,{gun,hips,torso,mag,heldMag,handle});
    for(const l of legs) {
      const p=phase+(l.sign<0?Math.PI:0),s=Math.sin(p);
      const stagger=-l.sign*.125*(1-stride)*(1-.65*crouch);
      const ankle=v(l.sign*(.15+.04*crouch),.085+Math.max(0,Math.cos(p))*.065*stride*(1-.5*crouch),stagger+s*.22*stride);
      const hip=v(l.sign*.09,hips.position.y-.05,hips.position.z);
      const mid=twoBone(hip,ankle,l.thigh.length,l.shin.length,v(l.sign*.15*crouch,0,1));
      poseSegment(l.thigh,hip,mid);poseSegment(l.shin,mid,ankle);
      l.boot.position.copy(ankle).add(v(0,-.08,0));l.boot.rotation.x=Math.max(0,-Math.cos(p))*.10*stride*(1-.5*crouch);
    }
    for(const a of arms) {
      const shoulder=bodyPoint(hips,torso,v(a.sign*.195,.355,0));
      const wrist=a.sign<0&&reloadHand?reloadHand.p:gunPoint(gun,a.sign>0?SOCKETS.trigger:SOCKETS.support);
      const elbow=twoBone(shoulder,wrist,a.upper.length,a.lower.length,v(a.sign>0?.6:-.25,-1,a.sign>0?-.2:.12));
      poseSegment(a.upper,shoulder,elbow);poseSegment(a.lower,elbow,wrist);a.hand.position.copy(wrist);
      if(a.sign<0&&reloadHand)a.hand.quaternion.copy(reloadHand.q);
      else{a.hand.quaternion.copy(gun.quaternion);if(a.sign<0){a.hand.rotateZ(Math.PI);a.hand.rotateX(.20);}else a.hand.rotateX(-.16);}
    }
    hair.forEach((h,i)=>{h.rotation.x=-stride*.10+Math.sin(state.time*3+i*.4)*.018+(body-lag)*.16;});
    for(const c of capes){const pos=c.geometry.attributes.position;
      if(crouch>0){c.mesh.updateWorldMatrix(true,false);capeInverse.copy(c.mesh.matrixWorld).invert();}
      for(let i=0;i<pos.count;i++){const x=c.rest[i*3],y=c.rest[i*3+1],z=c.rest[i*3+2],f=Math.max(0,-y);
        capePoint.set(x,y,z-stride*f*.17+Math.sin(state.time*3+x*8+f*4)*f*.025+(body-lag)*f*.08);
        if(crouch>0){capePoint.applyMatrix4(c.mesh.matrixWorld);if(capePoint.y<.025){capePoint.addScaledVector(capeBack,(.025-capePoint.y)*.5);capePoint.y=.025;}capePoint.applyMatrix4(capeInverse);}
        pos.setXYZ(i,capePoint.x,capePoint.y,capePoint.z);}
      pos.needsUpdate=true;c.geometry.computeVertexNormals();}
    flash.visible=state.flash>0;flash.scale.setScalar(.8+state.flash*5);lamp.intensity=state.flash>0?3:0;
    root.updateMatrixWorld(true);
  }
  return {root,muzzle,pose};
}
