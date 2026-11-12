import * as T from '../vendor/three-0.187.0/build/three.module.js';
import {buildLian} from './model-build.js';
import {SOCKETS,twoBone,bodyPoint,gunPoint} from './weapon-pose.js';
import {reloadWeight} from './reload.js';
import {poseWeaponMechanics} from './weapon-motion.js';
import {poseReload} from './reload-pose.js';
import {sampleStep,clamp} from './motion.js';
export function createLian(){
  const rig=buildLian();
  const {root,hips,torso,head,hair,capes,legs,arms,gun,mag,heldMag,handle,muzzle,ejection,poseSegment}=rig;
  const v=(x,y,z)=>new T.Vector3(x,y,z);
  const capePoint=new T.Vector3(),capeBack=new T.Vector3(),capeInverse=new T.Matrix4();
  function pose(state) {
    const stride=state.speed/1.3,phase=state.phase,aim=state.aim,crouch=state.crouch||0;
    const kick=clamp(state.kick.x,-.12,1.6),body=clamp(state.body.x,-.12,.65),lag=state.headLag.x,reload=reloadWeight(state.reload);
    const impact=clamp(state.impact.x,-.05,.18),drive=clamp(state.drive.x,-1,1),twist=clamp(state.twist.x,-.20,.20),jolt=clamp(state.reloadJolt.x,-.12,.12);
    const stanceVelocity=clamp(state.stance.v,-3,3),cloth=state.cloth.x;
    const reloadWork=state.reload?reload*Math.sin(Math.PI*state.reload.elapsed/state.reload.duration):0;
    const bob=(1-Math.cos(phase*2))*.017*stride*(1-.4*crouch);
    const breath=Math.sin(state.time*2.2)*.0035*(1-.65*aim)*(1-.45*stride);
    const feet=legs.map(leg=>{const step=sampleStep(state,leg.sign);return {leg,step,ankle:v(leg.sign*(.15+.04*crouch),.085+step.lift,step.forward)};});
    hips.position.set(Math.sin(phase)*.012*stride*(1-.5*crouch),.885+bob-.055*stride-.015*aim-.34*crouch-Math.abs(body)*.018-Math.max(0,impact)*.09+breath,.012*aim-.14*crouch-body*.025+drive*.025);
    // Bound pelvis height by both actual leg lengths before posing the upper body.
    for(const {leg,ankle} of feet){
      const dx=ankle.x-(hips.position.x+leg.sign*.09),dz=ankle.z-hips.position.z,reach=leg.thigh.length+leg.shin.length-.008;
      hips.position.y=Math.min(hips.position.y,ankle.y+.05+Math.sqrt(Math.max(0,reach*reach-dx*dx-dz*dz)));
    }
    torso.rotation.set(.07+aim*.12+stride*.09+drive*.13-body*.18+.24*crouch+stanceVelocity*.018+reloadWork*.04,.30+.06*aim+twist*.14+Math.sin(phase)*.025*stride+reloadWork*.075,body*.018+twist*.24-Math.sin(phase)*.035*stride-reloadWork*.03);
    torso.position.set(-hips.position.x*.35,.08-Math.max(0,body)*.016-Math.abs(jolt)*.012,-body*.055-drive*.018+jolt*.035);
    head.position.set(.038+.01*aim,.53-.01*aim,.025);
    // Cancel torso lean/twist so the face looks forward in the movement direction.
    head.quaternion.copy(torso.quaternion).invert();head.rotateX((lag-body)*.07+impact*.06);head.rotateZ(-twist*.06);
    root.position.x=state.x;root.rotation.y=state.facing*Math.PI/2;
    capeBack.set(0,0,-1).applyQuaternion(root.quaternion);
    hips.updateMatrix();torso.updateMatrix();
    // Stock follows the shoulder pocket; rotation happens around its contact, not the receiver.
    const pocket=bodyPoint(hips,torso,v(.115,.348,.050));
    pocket.z-=kick*.012;pocket.y+=jolt*.06;
    pocket.add(v(-.025,-.08,-.08).multiplyScalar(reload));
    gun.rotation.set(-.008-kick*.115-jolt*.45+reload*.22,-body*.012+twist*.035-reload*.08, -.025-kick*.025+twist*.22+reload*.30);
    gun.position.copy(pocket).sub(SOCKETS.stock.clone().applyQuaternion(gun.quaternion));
    const reloadHand=poseReload(state.reload,{gun,hips,torso,mag,heldMag,handle});
    for(const {leg:l,step,ankle} of feet) {
      const hip=v(hips.position.x+l.sign*.09,hips.position.y-.05,hips.position.z);
      const mid=twoBone(hip,ankle,l.thigh.length,l.shin.length,v(l.sign*.15*crouch,0,1));
      poseSegment(l.thigh,hip,mid);poseSegment(l.shin,mid,ankle);
      l.boot.position.copy(ankle).add(v(0,-.08,0));l.boot.rotation.x=step.pitch;
    }
    for(const a of arms) {
      const shoulder=bodyPoint(hips,torso,v(a.sign*.195,.355,0));
      const wrist=a.sign<0&&reloadHand?reloadHand.p:gunPoint(gun,a.sign>0?SOCKETS.trigger:SOCKETS.support);
      const elbow=twoBone(shoulder,wrist,a.upper.length,a.lower.length,v(a.sign>0 ? .6+Math.max(0,kick)*.20 : -.25,-1,a.sign>0 ? -.2 : .12));
      poseSegment(a.upper,shoulder,elbow);poseSegment(a.lower,elbow,wrist);a.hand.position.copy(wrist);
      if(a.sign<0&&reloadHand)a.hand.quaternion.copy(reloadHand.q);
      else{a.hand.quaternion.copy(gun.quaternion);if(a.sign<0){a.hand.rotateZ(Math.PI);a.hand.rotateX(.20);}else a.hand.rotateX(-.16);}
    }
    hair.forEach((h,i)=>{h.rotation.x=-stride*.16+Math.sin(state.time*2.7+i*.4)*.015+(body-cloth)*.22+drive*.07+impact*.12+jolt*.10;h.rotation.z=-twist*.10+Math.sin(phase+i*.2)*.025*stride;});
    for(const c of capes){const pos=c.geometry.attributes.position;
      c.mesh.updateWorldMatrix(true,false);capeInverse.copy(c.mesh.matrixWorld).invert();
      for(let i=0;i<pos.count;i++){const x=c.rest[i*3],y=c.rest[i*3+1],z=c.rest[i*3+2],f=Math.max(0,-y);
        capePoint.set(x+Math.sin(phase+x*3)*stride*f*.018-twist*f*.10,y,z-stride*f*.23+Math.sin(state.time*4+x*8+f*4)*f*(.014+.025*stride)+(body-cloth)*f*.15+drive*f*.045+jolt*f*.08);
        capePoint.applyMatrix4(c.mesh.matrixWorld);if(capePoint.y<.025){capePoint.addScaledVector(capeBack,(.025-capePoint.y)*.5);capePoint.y=.025;}capePoint.applyMatrix4(capeInverse);
        pos.setXYZ(i,capePoint.x,capePoint.y,capePoint.z);}
      pos.needsUpdate=true;c.geometry.computeVertexNormals();}
    for(const arm of arms)arm.poseHand(state);
    rig.clothingDetail.pose(state);
    rig.bodySkin.pose();
    poseWeaponMechanics(state,rig);
    root.updateMatrixWorld(true);
  }
  return {root,muzzle,ejection,pose};
}
