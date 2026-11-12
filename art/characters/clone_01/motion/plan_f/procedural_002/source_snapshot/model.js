import * as T from '../vendor/three-0.187.0/build/three.module.js';
import {buildLian} from './model-build.js';
export function createLian(){
  const {root,hips,torso,head,hair,capes,legs,arms,gun,muzzle,flash,lamp,poseSegment}=buildLian();
  const v=(x,y,z)=>new T.Vector3(x,y,z);
  function pose(state) {
    const stride=state.speed/1.3,phase=state.phase;
    const bob=Math.abs(Math.sin(phase))* .025*stride;
    hips.position.y=.91+bob;
    torso.rotation.x=.035+stride*.045;
    head.rotation.y=-state.facing*.08;
    root.position.x=state.x;root.rotation.y=state.facing*.80;
    gun.position.set(.09,1.27+bob,-state.recoil*.035+.37);
    gun.rotation.x=-state.recoil*.035;
    for(const l of legs) {
      const p=phase+(l.sign<0?Math.PI:0),s=Math.sin(p);
      const ankle=v(l.sign*.09,.085+Math.max(0,Math.cos(p))*.105*stride,s*.23*stride);
      const hip=v(l.sign*.09,.88+bob,0);
      const delta=ankle.clone().sub(hip),d=Math.min(.789,delta.length()),mid=hip.clone().add(ankle).multiplyScalar(.5);
      const bend=Math.sqrt(Math.max(0,.40*.40-d*d/4));mid.z+=bend;
      poseSegment(l.thigh,hip,mid);poseSegment(l.shin,mid,ankle);
      l.boot.position.copy(ankle).add(v(0,-.08,0));l.boot.rotation.x=Math.max(0,-Math.cos(p))*.18*stride;
    }
    for(const a of arms) {
      const shoulder=v(a.sign*.205,1.34+bob,0);
      const wrist=a.sign>0?v(.09,1.225+bob,.30-state.recoil*.035):v(.055,1.265+bob,.50-state.recoil*.035);
      // Two-bone reach: pole points down and out, elbows flex while hands remain on the gun.
      const axis=wrist.clone().sub(shoulder),d=Math.min(.559,axis.length());axis.normalize();
      const pole=v(a.sign*.4,-1,0).addScaledVector(axis,-v(a.sign*.4,-1,0).dot(axis)).normalize();
      const elbow=shoulder.clone().addScaledVector(axis,d/2).addScaledVector(pole,Math.sqrt(Math.max(0,.28*.28-d*d/4)));
      poseSegment(a.upper,shoulder,elbow);poseSegment(a.lower,elbow,wrist);a.hand.position.copy(wrist);
    }
    hair.forEach((h,i)=>{h.rotation.x=-stride*.10+Math.sin(state.time*3+i*.4)*.018;});
    for(const c of capes){const pos=c.geometry.attributes.position;
      for(let i=0;i<pos.count;i++){const x=c.rest[i*3],y=c.rest[i*3+1],z=c.rest[i*3+2],f=Math.max(0,-y);pos.setXYZ(i,x,y,z-stride*f*.17+Math.sin(state.time*3+x*8+f*4)*f*.025);}
      pos.needsUpdate=true;c.geometry.computeVertexNormals();}
    flash.visible=state.flash>0;flash.scale.setScalar(.8+state.flash*5);lamp.intensity=state.flash>0?3:0;
    root.updateMatrixWorld(true);
  }
  return {root,muzzle,pose};
}
