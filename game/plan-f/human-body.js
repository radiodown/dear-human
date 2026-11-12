import * as T from '../vendor/three-0.187.0/build/three.module.js';
import {implicitSurface} from './human-surface.js';

export const HUMAN={upperArm:.28,forearm:.28,thigh:.40,shin:.39,shoulderX:.175,hipX:.09};
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),Q=()=>new T.Quaternion();
const smooth=(a,b,x)=>{const t=T.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};

export function buildHumanBody(rig,m){
  const {root,hips,torso,head,arms,legs}=rig,defs=[],byName={};
  function bone(name,parent,p,q=Q(),driver=null){
    const d={name,parent,p:p.clone(),q:q.clone(),driver,index:defs.length,bone:new T.Bone(),matrix:new T.Matrix4()};
    d.bone.name='human_'+name;defs.push(d);byName[name]=d;return d;
  }
  const pelvis=bone('pelvis',null,V(0,.91,0),Q(),hips);
  const chest=bone('chest',pelvis,V(0,.99,0),Q(),torso);
  const skull=bone('neck',chest,V(0,1.553,.004),Q(),head);
  const shapes=[];
  const ellipsoid=(center,radius)=>shapes.push({p:V(...center),r:radius,q:Q()});
  const limb=(a,b,r1,r2,bulge=0)=>{
    const dir=b.clone().sub(a),length=dir.length();dir.divideScalar(length);
    shapes.push({a:a.clone(),dir,length,r1,r2,bulge});
  };
  ellipsoid([0,1.225,0],[.155,.175,.094]);ellipsoid([0,1.345,-.008],[.152,.065,.076]);
  ellipsoid([0,1.08,0],[.105,.145,.074]);ellipsoid([0,.92,-.005],[.160,.115,.105]);
  ellipsoid([0,1.435,0],[.047,.095,.043]);
  const armRest={},legRest={};
  for(const a of arms){
    const s=a.sign,top=V(s*HUMAN.shoulderX,1.345,0),dir=V(s*.48,-.877,0).normalize();
    ellipsoid([s*.152,1.320,-.002],[.060,.073,.060]);
    const elbow=top.clone().addScaledVector(dir,HUMAN.upperArm),wrist=elbow.clone().addScaledVector(dir,HUMAN.forearm),q=Q().setFromUnitVectors(V(0,-1,0),dir);
    const upper=bone('upper'+s,chest,top,q,a.upper.group),lower=bone('lower'+s,upper,elbow,q,a.lower.group);
    const hand=bone('hand'+s,lower,wrist,Q().setFromUnitVectors(V(0,0,1),dir),a.hand);armRest[s]={top,elbow,wrist,dir,upper,lower,hand};
    limb(top,elbow,.052,.034);limb(elbow,wrist,.037,.025);
  }
  for(const l of legs){
    const s=l.sign,top=V(s*HUMAN.hipX,.86,0),knee=V(s*HUMAN.hipX,.46,0),ankle=V(s*HUMAN.hipX,.07,0);
    const thigh=bone('thigh'+s,pelvis,top,Q(),l.thigh.group),shin=bone('shin'+s,thigh,knee,Q(),l.shin.group);
    legRest[s]={top,knee,ankle,thigh,shin};limb(top,knee,.080,.049);limb(knee,ankle,.049,.036,.010);
  }
  const p=V();
  function field(x,y,z){
    let result=10;
    for(const s of shapes){
      let d;
      if(s.a){
        p.set(x,y,z).sub(s.a);const u=T.MathUtils.clamp(p.dot(s.dir)/s.length,0,1);
        p.addScaledVector(s.dir,-u*s.length);
        const radius=T.MathUtils.lerp(s.r1,s.r2,u)*(1+.075*Math.sin(Math.PI*u))+s.bulge*Math.exp(-(((u-.34)/.22)**2));
        d=Math.hypot(p.x,p.y,p.z/.84)-radius;
      }else{
        p.set(x,y,z).sub(s.p).applyQuaternion(s.q);
        d=(Math.hypot(p.x/s.r[0],p.y/s.r[1],p.z/s.r[2])-1)*Math.min(...s.r);
      }
      const k=.018;
      const h=Math.max(k-Math.abs(result-d),0)/k;result=Math.min(result,d)-h*h*k*.25;
    }
    return result;
  }
  const geo=implicitSurface(field,[[-.54,.015,-.155],[.54,1.54,.155]],[72,100,24]);
  const skinIndex=[],skinWeight=[],uv=[],colors=[],position=geo.attributes.position;
  const suit=new T.Color('#252d39'),stocking=new T.Color('#514853'),boot=new T.Color('#202630');
  for(let i=0;i<position.count;i++){
    const x=position.getX(i),y=position.getY(i),z=position.getZ(i),side=x<0?-1:1;
    let weights;
    const ar=armRest[side],vertex=V(x,y,z),along=vertex.clone().sub(ar.top).dot(ar.dir);
    // Classify by distance to the actual rest arm, never by world height:
    // distal forearms sit as low as the pelvis in the bind pose.
    const center=ar.top.clone().addScaledVector(ar.dir,T.MathUtils.clamp(along,0,HUMAN.upperArm+HUMAN.forearm));
    const armRegion=smooth(.130,.185,Math.abs(x))*(1-smooth(.075,.115,vertex.distanceTo(center)));
    if(armRegion>.001){
      const bend=smooth(HUMAN.upperArm-.055,HUMAN.upperArm+.055,along),w=smooth(-.025,.065,along)*armRegion;
      const hand=smooth(HUMAN.upperArm+HUMAN.forearm-.045,HUMAN.upperArm+HUMAN.forearm+.01,along);
      weights=[[chest.index,1-w],[ar.upper.index,w*(1-bend)*(1-hand)],[ar.lower.index,w*bend*(1-hand)],[ar.hand.index,w*hand]];
    }else if(y<.95){
      const lr=legRest[side],leg=Math.max(smooth(.82,.73,y),smooth(.94,.80,y)*smooth(.015,.07,Math.abs(x))),knee=smooth(.51,.41,y);
      weights=[[pelvis.index,1-leg],[lr.thigh.index,leg*(1-knee)],[lr.shin.index,leg*knee]];
    }else{
      const w=smooth(.96,1.18,y),neck=smooth(1.40,1.51,y);
      weights=[[pelvis.index,(1-w)*(1-neck)],[chest.index,w*(1-neck)],[skull.index,neck]];
    }
    weights.sort((a,b)=>b[1]-a[1]);while(weights.length<4)weights.push([0,0]);
    const total=weights.reduce((s,w)=>s+w[1],0)||1;for(const [b,w]of weights){skinIndex.push(b);skinWeight.push(w/total);}
    uv.push(x*6,y*6+z*2);
    const c=suit.clone();if(y<.85)c.lerp(stocking,smooth(.85,.70,y));if(y<.47)c.lerp(boot,smooth(.47,.39,y));
    const seam=1-.12*Math.exp(-Math.pow((Math.abs(x)-.112)/.008,2))*smooth(.96,1.1,y);
    c.multiplyScalar(seam);colors.push(c.r,c.g,c.b);
  }
  geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(skinIndex,4));geo.setAttribute('skinWeight',new T.Float32BufferAttribute(skinWeight,4));
  geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  // Small radial correctives counter joint volume loss under linear skinning.
  // These are generated deltas, not imported sculpt/motion data.
  const correctives=[];geo.morphAttributes.position=[];geo.morphTargetsRelative=true;
  for(const s of [-1,1])for(const kind of ['arm','leg']){
    const ref=kind==='arm'?armRest[s]:legRest[s],joint=kind==='arm'?ref.elbow:ref.knee;
    const axis=(kind==='arm'?ref.wrist:ref.ankle).clone().sub(joint).normalize(),radius=kind==='arm'?.065:.085,deltas=[];
    for(let i=0;i<position.count;i++){
      const d=V().fromBufferAttribute(position,i).sub(joint),distance=d.length(),along=d.dot(axis);
      d.addScaledVector(axis,-along);if(d.lengthSq()>1e-10)d.normalize();
      const gain=Math.exp(-Math.pow(along/.032,2))*Math.max(0,1-distance/radius)*(kind==='arm'?.008:.012);
      deltas.push(d.x*gain,d.y*gain,d.z*gain);
    }
    geo.morphAttributes.position.push(new T.Float32BufferAttribute(deltas,3));
    const segment=kind==='arm'?arms.find(a=>a.sign===s):legs.find(a=>a.sign===s);
    correctives.push(kind==='arm'?[segment.upper.group,segment.lower.group]:[segment.thigh.group,segment.shin.group]);
  }
  const material=m.cloth.clone();material.color.set('#ffffff');material.vertexColors=true;material.normalScale.set(.12,.12);
  const mesh=new T.SkinnedMesh(geo,material);mesh.name='continuous_human_suit';mesh.castShadow=true;mesh.receiveShadow=true;
  mesh.frustumCulled=false;root.add(mesh);
  const inverse=new T.Matrix4(),unit=V(1,1,1),local=new T.Matrix4();
  for(const d of defs){
    d.matrix.compose(d.p,d.q,unit);local.copy(d.matrix);if(d.parent)local.premultiply(inverse.copy(d.parent.matrix).invert());
    local.decompose(d.bone.position,d.bone.quaternion,d.bone.scale);(d.parent?d.parent.bone:mesh).add(d.bone);
  }
  root.updateMatrixWorld(true);const skeleton=new T.Skeleton(defs.map(d=>d.bone));mesh.bind(skeleton);
  const rootInverse=new T.Matrix4();
  const upperDirection=V(),lowerDirection=V(),driverPosition=V(),driverRotation=Q(),driverScale=V();
  function pose(){
    // Drivers live in the existing character hierarchy, independent of this skeleton.
    root.updateMatrixWorld(true);rootInverse.copy(root.matrixWorld).invert();
    for(const d of defs){
      d.matrix.multiplyMatrices(rootInverse,d.driver.matrixWorld);
      // Face proportions must not scale the neck/suit skeleton.
      d.matrix.decompose(driverPosition,driverRotation,driverScale);d.matrix.compose(driverPosition,driverRotation,unit);
      local.copy(d.matrix);
      if(d.parent)local.premultiply(inverse.copy(d.parent.matrix).invert());
      local.decompose(d.bone.position,d.bone.quaternion,d.bone.scale);
    }
    correctives.forEach(([upper,lower],i)=>{
      upperDirection.set(0,-1,0).applyQuaternion(upper.quaternion);lowerDirection.set(0,-1,0).applyQuaternion(lower.quaternion);
      mesh.morphTargetInfluences[i]=Math.min(1,(1-upperDirection.dot(lowerDirection))*.8);
    });
    mesh.updateMatrixWorld(true);
  }
  return {mesh,skeleton,pose};
}
