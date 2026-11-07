// A small orthographic elevation for the existing side artwork. These depths
// separate the flat attachments; they do not create unseen top surfaces.
export const SIDE_CAMERA=Object.freeze({defaultPitch:12,maxPitch:20,
  body:0,hair:-3,cape:-7,near:8,far:-8,weapon:8});

export function clampCameraPitch(value=SIDE_CAMERA.defaultPitch){
  return Number.isFinite(value)?Math.max(0,Math.min(SIDE_CAMERA.maxPitch,value)):SIDE_CAMERA.defaultPitch;
}

export function sideCamera(pitch=SIDE_CAMERA.defaultPitch){
  const degrees=clampCameraPitch(pitch),radians=degrees*Math.PI/180;
  const cosine=Math.cos(radians),sine=Math.sin(radians);
  return {pitch:degrees,cosine,sine,
    project:p=>({x:p.x,y:p.y*cosine+(p.z??0)*sine})};
}

// Add display depth to a copy of the solved pose. Simulation, bone lengths,
// source proportions and stock/hand socket positions keep their authored values.
export function sideDepthPose(p){
  const d=SIDE_CAMERA,point=(p,z)=>({...p,z});
  const headDepth=d.weapon*(p.kneeSupport?.amount??0)*p.eyeAim;
  const arm=(a,rootDepth)=>({...a,root:point(a.root,rootDepth),
    elbow:point(a.elbow,(rootDepth+d.weapon)/2),hand:point(a.hand,d.weapon),target:point(a.target,d.weapon)});
  const legs=p.legs.map((leg,i)=>{
    const z=i===0?d.far:d.near;
    return {...leg,root:point(leg.root,z),elbow:point(leg.elbow,z),hand:point(leg.hand,z),target:point(leg.target,z),
      foot:{...leg.foot,z,heel:point(leg.foot.heel,z),toe:point(leg.foot.toe,z)}};
  });
  return {...p,armA:arm(p.armA,d.near),armB:arm(p.armB,d.far),legs,
    weapon:point(p.weapon,d.weapon),magazine:point(p.magazine,d.weapon),
    stockPocket:point(p.stockPocket,d.weapon),stockTarget:point(p.stockTarget,d.weapon),
    supportTarget:point(p.supportTarget,d.weapon),palmA:point(p.palmA,d.weapon),palmB:point(p.palmB,d.weapon),
    sockets:Object.fromEntries(Object.entries(p.sockets).map(([key,p])=>[key,point(p,d.weapon)])),
    headDepth,headFrame:point(p.headFrame,headDepth),eye:point(p.eye,headDepth),
    sightLine:p.sightLine?{rear:point(p.sightLine.rear,d.weapon),front:point(p.sightLine.front,d.weapon)}:null,
    kneeSupport:{...p.kneeSupport,target:point(p.kneeSupport.target,d.near),actual:legs[1].elbow}};
}
