import * as T from '../vendor/three-0.187.0/build/three.module.js';
export const SOCKETS={
  stock:new T.Vector3(0,-.024,-.312),
  trigger:new T.Vector3(.022,-.06,-.067),
  support:new T.Vector3(-.012,-.025,.125),
};
export function twoBone(start,end,upper,lower,pole){
  const delta=end.clone().sub(start),length=delta.length();
  if(length<1e-7)return start.clone().add(new T.Vector3(0,-upper,0));
  const direction=delta.multiplyScalar(1/length),d=Math.min(upper+lower-1e-6,Math.max(Math.abs(upper-lower)+1e-6,length));
  const along=(upper*upper-lower*lower+d*d)/(2*d),height=Math.sqrt(Math.max(0,upper*upper-along*along));
  const bend=pole.clone().addScaledVector(direction,-pole.dot(direction));
  if(bend.lengthSq()<1e-10)bend.set(1,0,0).addScaledVector(direction,-direction.x);
  return start.clone().addScaledVector(direction,along).addScaledVector(bend.normalize(),height);
}
// Attachment transforms evaluated in character-root space after the upper body is posed.
export function bodyPoint(hips,torso,point){return point.clone().applyMatrix4(torso.matrix).applyMatrix4(hips.matrix);}
export function gunPoint(gun,point){return point.clone().applyQuaternion(gun.quaternion).add(gun.position);}
