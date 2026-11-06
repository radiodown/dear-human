// Landmarks are measured on the coherent RIGHT-FACING rig_004 side master.
// Never transfer front-portrait perspective ratios onto unrelated side parts.
export const REFERENCE = Object.freeze({width:1024,height:1536,crown:42,sole:1505,chin:237,
  collar:235,shoulder:315,belt:550,hip:665,knee:1030,ankle:1390});
export const HUMAN = Object.freeze({
  nominalHeight:300, headHeight:45.5, headCrownToChin:40,
  hipY:-171.5, torsoAboveHip:71.5, pelvisAboveHip:35,
  primaryShoulder:{x:-10,y:3},supportShoulder:{x:5,y:6},
  // Buttplate seats against the front of the shoulder, below the neck line.
  upperArm:36,forearm:40,stockPocket:{x:-13.5,y:4},
  handHeight:12,handAspect:240/143,handPivot:[.15,.72],handGrip:[.63,.65],
  supportHandHeight:12,supportHandAspect:242/152,supportHandPivot:[.10,.77],supportHandGrip:[.72,.35],
  primaryWristAngle:0,supportWristAngle:-.30,
  headAim:{x:2.5,y:6.4,a:.015},
  // Eye/neck registration on rig_004's side head, in source UV coordinates.
  headRegistration:{anchor:{x:0,y:-9},pivot:[.45,1],eye:[.82,.52],aspect:360/408,restAngle:.055,rotationMix:.65},
  heights:{head:45.5,hair_back:88,body_core:100,cape:235,primary_hand:12,support_hand:12},
  // Bone pivot locations inside each intact sprite, including joint overlap.
  joints:{upper_arm:[.12,.90],forearm:[.06,.93],thigh:[.05,.94],shin:[.13,.96]}
});
export function partDimensions(rect,height){return {width:height*rect[2]/rect[3],height};}
export function handOffset(support=false){
  const height=support?HUMAN.supportHandHeight:HUMAN.handHeight,aspect=support?HUMAN.supportHandAspect:HUMAN.handAspect;
  const pivot=support?HUMAN.supportHandPivot:HUMAN.handPivot,grip=support?HUMAN.supportHandGrip:HUMAN.handGrip;
  return {x:(grip[0]-pivot[0])*height*aspect,y:(grip[1]-pivot[1])*height};
}
