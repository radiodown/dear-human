import * as T from '../vendor/three-0.187.0/build/three.module.js';
import {GLTFLoader} from '../vendor/three-0.187.0/examples/jsm/loaders/GLTFLoader.js';
import {createLian} from './model.js';
import {buildRifle} from './weapon-build.js';
import {SOCKETS,gunPoint,twoBone} from './weapon-pose.js';
import {RIGHT_SIDE,isRightSide} from './anatomy.js';
import {RELOAD,ease} from './reload.js';

// Only the character is imported. F still owns the weapon, poses and simulation clock.
export const CHARACTER_URL='/art/characters/clone_01/motion/glb_model_001/source/version04.glb';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const Q=()=>new T.Quaternion();
const DOWN=V(0,-1,0),HEIGHT=1.70;

export async function createGlbLian(){
  const gltf=await new GLTFLoader().loadAsync(CHARACTER_URL);
  const root=new T.Group();root.name='lian_glb_character_002';
  const visual=new T.Group();visual.name='lian_glb_appearance';root.add(visual);visual.add(gltf.scene);
  const bones=new Map(),skeletons=new Set();
  gltf.scene.traverse(node=>{
    // GLTFLoader sanitizes ':' out of node names. Accept both the source GLB
    // namespace (mixamorig:Hips) and the loaded name (mixamorigHips).
    if(node.isBone)bones.set(node.name.split(':').pop().replace(/^mixamorig\d*/i,''),node);
    if(node.isSkinnedMesh)skeletons.add(node.skeleton);
    if(node.isMesh){node.castShadow=true;node.receiveShadow=true;node.frustumCulled=false;}
  });
  const bone=name=>{const b=bones.get(name);if(!b)throw new Error(`리안 GLB에 ${name} 뼈대가 없습니다.`);return b;};
  // Exported node transforms can be a saved animation frame. Bind matrices are the rest pose.
  for(const skeleton of skeletons)skeleton.pose();
  root.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(gltf.scene,true),height=bounds.max.y-bounds.min.y;
  if(!Number.isFinite(height)||height<=0)throw new Error('리안 GLB의 크기를 읽을 수 없습니다.');
  const scale=HEIGHT/height,hip=bone('Hips').getWorldPosition(V());
  visual.scale.setScalar(scale);visual.position.set(-hip.x*scale,-bounds.min.y*scale,-hip.z*scale);
  root.updateMatrixWorld(true);

  const rest=new Map();
  for(const b of bones.values())rest.set(b,{
    position:b.position.clone(),quaternion:b.quaternion.clone(),scale:b.scale.clone(),
    p:b.getWorldPosition(V()),q:b.getWorldQuaternion(Q()),
  });
  const R=name=>rest.get(bone(name));
  const group=parent=>{const g=new T.Group();parent.add(g);return g;};
  const hips=group(root),torso=group(hips),head=group(torso);
  hips.name='hips';torso.name='torso';head.name='head_driver';
  const segment=length=>({group:group(root),length});
  const poseSegment=(s,a,b)=>{s.group.position.copy(a);s.group.quaternion.setFromUnitVectors(DOWN,b.clone().sub(a).normalize());};
  const sideName=sign=>isRightSide(sign)?'Right':'Left';
  const rig={root,hips,torso,head,hair:[],capes:[],poseSegment,hipHeight:R('Hips').p.y-.015};
  const worldQ=Q(),parentQ=Q(),actorInverse=new T.Matrix4();
  function localPosition(b){return b.getWorldPosition(V()).applyMatrix4(actorInverse);}
  function rotation(b,q){
    root.getWorldQuaternion(worldQ);b.parent.getWorldQuaternion(parentQ);
    b.quaternion.copy(parentQ.invert()).multiply(worldQ).multiply(q).normalize();
    b.updateWorldMatrix(false,true);
  }
  function position(b,p){
    const world=root.localToWorld(p.clone());b.position.copy(b.parent.worldToLocal(world));
    b.updateWorldMatrix(false,true);
  }
  function resetBones(){
    for(const [b,r] of rest){b.position.copy(r.position);b.quaternion.copy(r.quaternion);b.scale.copy(r.scale);}
    root.updateMatrixWorld(true);actorInverse.copy(root.matrixWorld).invert();
  }
  function aimBone(name,child,start,end){
    const from=R(child).p.clone().sub(R(name).p).normalize(),to=end.clone().sub(start).normalize();
    rotation(bone(name),Q().setFromUnitVectors(from,to).multiply(R(name).q));
  }
  rig.prepareBody=()=>{
    resetBones();position(bone('Hips'),hips.position);
    // Spread torso bending over the existing spine without translating or stretching joints.
    for(const [name,weight] of [['Spine',.30],['Spine1',.65],['Spine2',1]]){
      rotation(bone(name),Q().slerp(torso.quaternion,weight).multiply(R(name).q));
    }
    const look=torso.quaternion.clone().multiply(head.quaternion);
    rotation(bone('Neck'),torso.quaternion.clone().slerp(look,.5).multiply(R('Neck').q));
    rotation(bone('Head'),look.multiply(R('Head').q));
  };
  rig.shoulder=sign=>localPosition(bone(sideName(sign)+'Arm'));
  rig.stockPocket=()=>rig.shoulder(RIGHT_SIDE).add(V(-RIGHT_SIDE*.025,-.012,.045).applyQuaternion(torso.quaternion));

  rig.legs=[-1,1].map(sign=>{
    const side=sideName(sign),top=R(side+'UpLeg').p,knee=R(side+'Leg').p,ankle=R(side+'Foot').p;
    return {sign,side,thigh:segment(top.distanceTo(knee)),shin:segment(knee.distanceTo(ankle)),boot:group(root),
      hipOffset:top.clone().sub(R('Hips').p),ankleHeight:ankle.y,ankleZ:ankle.z};
  });
  rig.arms=[-1,1].map(sign=>{
    const side=sideName(sign),top=R(side+'Arm').p,elbow=R(side+'ForeArm').p,wrist=R(side+'Hand').p;
    const middle=R(side+'HandMiddle1').p,index=R(side+'HandIndex1').p,pinky=R(side+'HandPinky1').p;
    // Palm +Z points towards the fingers, +Y is the back of the glove. The F sockets use this frame.
    const z=middle.clone().sub(wrist).normalize(),x=index.clone().sub(pinky).multiplyScalar(sign).normalize();
    const y=z.clone().cross(x).normalize();x.crossVectors(y,z).normalize();
    const palmQ=Q().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z));
    const palmOffset=middle.clone().sub(wrist).multiplyScalar(.5).applyQuaternion(palmQ.clone().invert());
    const hand=group(root),digits=[];
    for(const digit of ['Index','Middle','Ring','Pinky','Thumb'])for(let joint=1;joint<=3;joint++){
      const name=side+'Hand'+digit+joint,b=bone(name),r=rest.get(b);
      digits.push({b,digit,joint,axis:x.clone().applyQuaternion(r.q.clone().invert()).normalize()});
    }
    const arm={sign,side,upper:segment(top.distanceTo(elbow)),lower:segment(elbow.distanceTo(wrist)),hand,
      palmOffset,handOffset:palmQ.clone().invert().multiply(R(side+'Hand').q),indexFinger:null};
    arm.poseHand=(state,{open=false}={})=>{
      const presets={grip:[.78,1.25,1.03],support:[.58,1.08,.92],magazine:[.42,.92,.78],bolt:[.30,.72,.70],open:[.12,.23,.18]};
      let a=isRightSide(sign)?'grip':'support',b=a,t=0;
      if(!isRightSide(sign)&&state.reload){
        const time=state.reload.elapsed;
        if(time<RELOAD.grab){b='magazine';t=ease((time-.12)/(RELOAD.grab-.12));}
        else if(time<1.72)a=b='magazine';
        else if(state.reload.empty&&time<2.40){a='magazine';b='bolt';t=ease((time-1.72)/.25);}
        else{a=state.reload.empty?'bolt':'magazine';b='support';t=ease((time-(state.reload.empty?2.40:1.72))/.32);}
        if(time>=RELOAD.stow&&time<RELOAD.fresh){a='magazine';b='open';t=Math.sin(Math.PI*(time-RELOAD.stow)/(RELOAD.fresh-RELOAD.stow));}
      }
      if(open){a=b='open';t=0;}
      const age=state.time-state.lastShot,trigger=state.firing||age<.075?1:1-ease((age-.075)/.11);
      for(const d of digits){
        const j=d.joint-1;let angle=T.MathUtils.lerp(presets[a][j],presets[b][j],t);
        if(d.digit==='Thumb')angle*=.63;
        else if(!open&&isRightSide(sign)&&d.digit==='Index')angle=[.12+trigger*.25,.20+trigger*.62,.20+trigger*.35][j];
        d.b.quaternion.copy(rest.get(d.b).quaternion).multiply(Q().setFromAxisAngle(d.axis,angle));
      }
    };
    return arm;
  });
  Object.assign(rig,buildRifle(root));
  rig.wristTarget=(arm,contact)=>contact.clone().sub(arm.palmOffset.clone().applyQuaternion(arm.hand.quaternion));
  rig.fitWeapon=state=>{
    // The imported arms are shorter than the old generated arms. Move the whole weapon
    // inside their reach before solving IK; never stretch skin to a distant socket.
    for(let iteration=0;iteration<6;iteration++)for(const arm of rig.arms){
      const right=isRightSide(arm.sign);if(!right&&state.reload)continue;
      arm.hand.quaternion.copy(rig.gun.quaternion);
      if(right)arm.hand.rotateX(-.16);else{arm.hand.rotateZ(Math.PI);arm.hand.rotateX(.20);}
      const wrist=rig.wristTarget(arm,gunPoint(rig.gun,right?SOCKETS.trigger:SOCKETS.support));
      const delta=wrist.sub(rig.shoulder(arm.sign)),distance=delta.length(),reach=arm.upper.length+arm.lower.length-.006;
      if(distance>reach)rig.gun.position.addScaledVector(delta,(reach-distance)/distance);
    }
  };
  rig.clothingDetail={pose(){}};
  rig.bodySkin={pose(){
    for(const leg of rig.legs){
      const {side,thigh,shin,boot}=leg,ankle=boot.position.clone().add(V(0,.08,0));
      aimBone(side+'UpLeg',side+'Leg',thigh.group.position,shin.group.position);
      aimBone(side+'Leg',side+'Foot',shin.group.position,ankle);
      rotation(bone(side+'Foot'),boot.quaternion.clone().multiply(R(side+'Foot').q));
    }
    for(const arm of rig.arms){
      const {side,upper,lower,hand}=arm;
      aimBone(side+'Arm',side+'ForeArm',upper.group.position,lower.group.position);
      aimBone(side+'ForeArm',side+'Hand',lower.group.position,hand.position);
      rotation(bone(side+'Hand'),hand.quaternion.clone().multiply(arm.handOffset));
    }
    root.updateMatrixWorld(true);
  }};
  rig.poseNeutral=state=>{
    root.position.set(state.x,0,0);root.rotation.set(0,state.facing*Math.PI/2,0);
    hips.position.copy(R('Hips').p);torso.position.set(0,.08,0);torso.quaternion.identity();head.quaternion.identity();
    rig.prepareBody();rig.gun.visible=false;rig.heldMag.visible=false;
    for(const leg of rig.legs){
      const {side}=leg;poseSegment(leg.thigh,R(side+'UpLeg').p,R(side+'Leg').p);poseSegment(leg.shin,R(side+'Leg').p,R(side+'Foot').p);
      leg.boot.position.copy(R(side+'Foot').p).sub(V(0,.08,0));leg.boot.quaternion.identity();
    }
    for(const arm of rig.arms){
      const shoulder=rig.shoulder(arm.sign),direction=V(arm.sign*.18,-.984,0).normalize();
      const wrist=shoulder.clone().addScaledVector(direction,arm.upper.length+arm.lower.length-.003);
      const elbow=twoBone(shoulder,wrist,arm.upper.length,arm.lower.length,V(0,0,1));
      poseSegment(arm.upper,shoulder,elbow);poseSegment(arm.lower,elbow,wrist);
      arm.hand.position.copy(wrist);arm.hand.quaternion.setFromUnitVectors(V(0,0,1),direction);arm.poseHand(state,{open:true});
    }
    rig.bodySkin.pose();
  };
  const actor=createLian(rig);
  actor.source=CHARACTER_URL;
  return actor;
}
