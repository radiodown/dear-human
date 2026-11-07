// Landmarks are measured on the coherent RIGHT-FACING rig_004 side master.
// Never transfer front-portrait perspective ratios onto unrelated side parts.
export const REFERENCE = Object.freeze({width:1024,height:1536,crown:42,sole:1505,chin:237,
  collar:235,shoulder:315,belt:550,hip:665,knee:1030,ankle:1390});
export const HUMAN = Object.freeze({
  nominalHeight:300, headHeight:45.5, headCrownToChin:40,
  hipY:-171.5, torsoAboveHip:71.5, pelvisAboveHip:35,bodyAspect:637/1315,
  primaryShoulder:{x:-10,y:3},supportShoulder:{x:5,y:6},
  // Buttplate seats against the front of the shoulder, below the neck line.
  upperArm:36,forearm:40,stockPocket:{x:-13.5,y:4},
  // Gaze and the amount of rifle lowering are separate authoring controls.
  runCarry:{offsetX:3,drop:6,maxDrop:18,headCounterPitch:-.03,enterTime:.07,exitTime:.12,fireReady:.75},
  handHeight:12,handAspect:240/143,handPivot:[.15,.72],handGrip:[.63,.65],
  // Closed near-side fingers wrap the horizontal handguard; thumb is hidden.
  supportHandHeight:18,supportHandAspect:1120/720,supportHandPivot:[350/1120,400/720],supportHandGrip:[790/1120,245/720],
  reloadHandHeight:12,reloadHandAspect:242/152,reloadHandPivot:[.10,.77],reloadHandGrip:[.72,.35],
  primaryWristAngle:0,supportWristAngle:0,
  headAim:{x:1.2,y:1.8,a:.002},
  // Eye/neck registration on rig_004's side head, in source UV coordinates.
  headRegistration:{anchor:{x:0,y:-9},pivot:[.45,1],eye:[.82,.52],aspect:360/408,restAngle:.055,rotationMix:.28},
  heights:{head:45.5,hair_back:88,body_core:100,cape:235,primary_hand:12,support_hand:12,support_hand_foregrip:14,support_hand_underbarrel:11.5,support_hand_closed_grip:18},
  // Bone pivot locations inside each intact sprite, including joint overlap.
  joints:{upper_arm:[.12,.90],forearm:[.06,.93],thigh:[.05,.94],shin:[.13,.96]}
});
export function partDimensions(rect,height){return {width:height*rect[2]/rect[3],height};}
export function handOffset(support=false,reload=false){
  const height=support?(reload?HUMAN.reloadHandHeight:HUMAN.supportHandHeight):HUMAN.handHeight,aspect=support?(reload?HUMAN.reloadHandAspect:HUMAN.supportHandAspect):HUMAN.handAspect;
  const pivot=support?(reload?HUMAN.reloadHandPivot:HUMAN.supportHandPivot):HUMAN.handPivot,grip=support?(reload?HUMAN.reloadHandGrip:HUMAN.supportHandGrip):HUMAN.handGrip;
  return {x:(grip[0]-pivot[0])*height*aspect,y:(grip[1]-pivot[1])*height};
}
