// Manual landmark calibration against the APPROVED 1024x1536 portrait.
// These are visual measurements (not medical/anatomical measurements).
// Character crown/sole ~22/1507, chin ~211, collar ~227, belt ~520,
// hip ~660, knee ~970, ankle ~1410. Side-view depth is foreshortened.
export const REFERENCE = Object.freeze({width:1024,height:1536,crown:22,sole:1507,chin:211,
  collar:227,shoulder:310,belt:520,hip:660,knee:970,ankle:1410});
export const HUMAN = Object.freeze({
  nominalHeight:300, headHeight:47, headCrownToChin:38,
  hipY:-170, torsoAboveHip:77, pelvisAboveHip:35,
  primaryShoulder:{x:-12,y:5},supportShoulder:{x:8,y:6},
  upperArm:43,forearm:38,mount:{x:8,y:9},
  handHeight:11,handAspect:187/134,handPivot:[.18,.52],handGrip:[.62,.56],
  primaryWristAngle:-.45,supportWristAngle:-.65,
  heights:{head:47,hair_back:72,hair_side:62,inner_torso:64,chest:64,pelvis:58,
    cape:239,cape_front:235,shoulder:22,hand:11,helmet:40},
  // Bone pivot locations inside each intact sprite, including joint overlap.
  joints:{upper_arm:[.12,.90],forearm:[.06,.93],thigh:[.05,.94],shin:[.13,.96]}
});
export function partDimensions(rect,height){return {width:height*rect[2]/rect[3],height};}
export function handOffset(){return {x:(HUMAN.handGrip[0]-HUMAN.handPivot[0])*HUMAN.handHeight*HUMAN.handAspect,
  y:(HUMAN.handGrip[1]-HUMAN.handPivot[1])*HUMAN.handHeight};}
