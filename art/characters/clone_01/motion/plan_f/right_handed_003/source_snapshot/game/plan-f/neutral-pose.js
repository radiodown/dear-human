import * as T from '../vendor/three-0.187.0/build/three.module.js';
import {HUMAN} from './human-body.js';

// A display pose only: combat time, ammunition and reload state remain intact.
export function poseNeutral(rig,state){
  const {root,hips,torso,head,arms,legs,hair,capes,gun,heldMag,poseSegment}=rig;
  const v=(x,y,z)=>new T.Vector3(x,y,z);
  root.position.set(state.x,0,0);root.rotation.set(0,state.facing*Math.PI/2,0);
  hips.position.set(0,.92,0);hips.rotation.set(0,0,0);
  torso.position.set(0,.08,0);torso.rotation.set(0,0,0);
  head.position.set(0,.563,.004);head.rotation.set(0,0,0);
  gun.visible=false;heldMag.visible=false;
  for(const leg of legs){
    const ankle=v(leg.sign*HUMAN.hipX,.08,0),knee=ankle.clone().add(v(0,HUMAN.shin,0)),hip=knee.clone().add(v(0,HUMAN.thigh,0));
    poseSegment(leg.thigh,hip,knee);poseSegment(leg.shin,knee,ankle);
    leg.boot.position.copy(ankle).add(v(0,-.08,0));leg.boot.rotation.set(0,0,0);
  }
  for(const arm of arms){
    const shoulder=v(arm.sign*HUMAN.shoulderX,1.355,0),direction=v(arm.sign*.18,-.984,0).normalize();
    const elbow=shoulder.clone().addScaledVector(direction,HUMAN.upperArm),wrist=elbow.clone().addScaledVector(direction,HUMAN.forearm);
    poseSegment(arm.upper,shoulder,elbow);poseSegment(arm.lower,elbow,wrist);
    arm.hand.position.copy(wrist);arm.hand.quaternion.setFromUnitVectors(v(0,0,1),direction);
    arm.poseHand(state,{open:true});
  }
  for(const h of hair)h.rotation.set(0,0,0);
  for(const cape of capes){cape.geometry.attributes.position.array.set(cape.rest);cape.geometry.attributes.position.needsUpdate=true;cape.geometry.computeVertexNormals();}
  rig.clothingDetail.pose({speed:0,phase:0,crouch:0});rig.bodySkin.pose();root.updateMatrixWorld(true);
}
