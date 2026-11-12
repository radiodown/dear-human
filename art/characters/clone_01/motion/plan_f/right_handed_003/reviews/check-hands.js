async () => {
  const T=await import('/vendor/three-0.187.0/build/three.module.js');
  const {createLian}=await import('/plan-f/model.js');
  const {newState}=await import('/plan-f/simulation.js');
  const {SOCKETS}=await import('/plan-f/weapon-pose.js');
  const actor=createLian(),right=actor.root.getObjectByName('hand_-1'),left=actor.root.getObjectByName('hand_1');
  const torso=actor.root.getObjectByName('torso'),upper=actor.root.getObjectByName('upper_arm_-1');
  let gun;actor.root.traverse(o=>{if(o.name==='rifle')gun=o;});
  if(!gun)throw Error('Rifle object missing');
  const result={poses:[],rightSide:right.userData.anatomicalSide,leftSide:left.userData.anatomicalSide};
  for(const facing of [-1,1])for(const crouch of [0,1])for(const reloadTime of [null,.9,2.16,2.75]){
    const s=newState();s.facing=facing;s.crouch=crouch;s.crouched=Boolean(crouch);s.aim=1;
    if(reloadTime!==null)s.reload={elapsed:reloadTime,duration:2.8,empty:true};
    actor.pose(s);actor.root.updateMatrixWorld(true);
    const trigger=gun.localToWorld(SOCKETS.trigger.clone()),support=gun.localToWorld(SOCKETS.support.clone());
    const rightError=right.getWorldPosition(new T.Vector3()).distanceTo(trigger);
    const leftSupportError=left.getWorldPosition(new T.Vector3()).distanceTo(support);
    const q=torso.getWorldQuaternion(new T.Quaternion()),forward=new T.Vector3(0,0,1).applyQuaternion(q),up=new T.Vector3(0,1,0).applyQuaternion(q);
    const anatomicalRight=forward.cross(up).normalize();
    const shoulderSide=upper.getWorldPosition(new T.Vector3()).sub(torso.getWorldPosition(new T.Vector3())).dot(anatomicalRight);
    result.poses.push({facing,crouch,reloadTime,rightError,leftSupportError,rightShoulderProjection:shoulderSide});
    if(rightError>1e-6||shoulderSide<.17||(reloadTime===null&&leftSupportError>1e-6))throw Error('Hand assignment failed');
  }
  const s=newState();actor.pose(s);
  const rightFinger=right.getObjectByName('finger_0_0'),leftFinger=left.getObjectByName('finger_0_0');
  const r0=rightFinger.rotation.x,l0=leftFinger.rotation.x;s.firing=true;s.lastShot=0;actor.pose(s);
  result.triggerFinger={rightChanges:Math.abs(rightFinger.rotation.x-r0)>.1,leftUnchanged:Math.abs(leftFinger.rotation.x-l0)<1e-8};
  if(!result.triggerFinger.rightChanges||!result.triggerFinger.leftUnchanged)throw Error('Trigger finger assignment failed');
  return result;
}
