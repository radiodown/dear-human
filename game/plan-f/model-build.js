import * as T from '../vendor/three-0.187.0/build/three.module.js';
import {V,mesh,group,box,oval,tube,loft,panel} from './geometry.js';
import {materials} from './materials.js';
import {buildRifle} from './weapon-build.js';
import {buildHumanBody,HUMAN} from './human-body.js';
import {buildHumanHead} from './human-head.js';
import {buildHumanHand} from './human-hands.js';
import {buildClothingDetail} from './human-clothing.js';

export function buildLian(){
 const root=new T.Group(),m=materials(),hips=group(root,0,.91,0),torso=group(hips,0,.08,0);
 root.name='lian';hips.name='hips';torso.name='torso';
 const bolt=(p,x,y,z,size=.006)=>{const o=mesh(p,new T.CylinderGeometry(size,size,.004,8),m.gold,x,y,z);o.rotation.x=Math.PI/2;return o;};
 // Continuous tailored torso, shaped chest plate and segmented abdominal plates.
 // The continuous skinned suit below supplies torso, hips and limb surfaces.
 mesh(torso,loft([[.15,.131,.09],[.22,.145,.115],[.29,.164,.124],[.35,.166,.099],[.39,.142,.075]],40,28,(x,y,z,a)=>[x,y,z+(Math.max(0,Math.cos(a))*.009*Math.cos(x*17))]),m.armor);
 for(const sign of [-1,1]){
  const inset=panel(torso,[[-.027,-.087],[.026,-.06],[.035,.047],[.013,.081],[-.027,.065]],.012,m.edge,sign*.127,.273,.077);inset.rotation.y=sign*.62;
  tube(torso,[[sign*.10,.40,.055],[sign*.104,.31,.104],[sign*.10,.19,.085],[sign*.10,.08,.066]],.012,m.leather);
  for(let j=0;j<3;j++){box(torso,.028,.022,.006,m.gold,sign*.102,.12+j*.091,[.066,.087,.104][j]);box(torso,.016,.012,.009,m.black,sign*.102,.12+j*.091,[.071,.092,.109][j]);}
  tube(torso,[[sign*.073,.15,.092],[sign*.092,.23,.128],[sign*.089,.33,.126]],.0025,m.gold);
  for(let i=0;i<4;i++){const wing=box(torso,.039-i*.006,.006,.005,m.gold,sign*(.014+i*.01),.345+i*.007,.112);wing.rotation.z=sign*.5;}
 }
 for(let j=0;j<3;j++){const q=panel(torso,[[-.09,-.019],[.09,-.019],[.098,.018],[-.098,.018]],.014,m.armor,0,.04+j*.044,.09);for(const sign of [-1,1])bolt(q,sign*.078,.003,.009,.003);}
 box(hips,.315,.045,.235,m.leather,0,.065,0);box(hips,.046,.032,.017,m.gold,0,.065,.129);box(hips,.032,.018,.019,m.armor,0,.065,.14);
 for(const sign of [-1,1]){
  for(let i=0;i<3;i++){const g=group(hips,sign*(.043+i*.059),-.045,.11-i*.016);g.rotation.z=sign*-.14;const q=panel(g,[[-.03,-.10],[.027,-.093],[.032,.06],[-.03,.065]],.018,m.armor);for(const y of [-.06,.035]){box(q,.048,.009,.005,m.edge,0,y,.015);bolt(q,0,y,.02,.003);}}
  const pouch=box(hips,.058,.09,.06,m.leather,sign*.178,.005,.025);box(pouch,.06,.024,.008,m.armor,0,.035,.034);bolt(pouch,0,.015,.039,.004);
 }
 mesh(torso,loft([[.40,.069,.057],[.47,.073,.061],[.478,.069,.058]],32,10),m.armor);
 for(const sign of [-1,1])tube(torso,[[sign*.027,.408,.055],[sign*.032,.445,.06],[sign*.035,.471,.056]],.0025,m.gold);
 const {head,hair}=buildHumanHead(torso,m);
 // Mantle has shoulder drape, radial pleats, embroidered edging and a scalloped hem.
 const capes=[];const cp=group(torso,0,.36,-.07);const ps=[],uv=[],ix=[],cols=[];const nx=32,ny=36;
 for(let j=0;j<=ny;j++){const t=j/ny;for(let i=0;i<=nx;i++){const u=i/nx,q=u*2-1,x=q*(.20+.24*Math.pow(t,.85)),y=-t*1.27+.035*Math.sin(u*Math.PI*5)*Math.pow(t,8),z=-.05-t*.16+.17*q*q+Math.sin(u*22)*(.006+t*.028);ps.push(x,y,z);uv.push(u,t);const c=new T.Color((u<.035||u>.965||t>.965)?'#c2a56e':'#68717d');cols.push(c.r,c.g,c.b);if(j<ny&&i<nx){const k=j*(nx+1)+i;ix.push(k,k+nx+1,k+1,k+1,k+nx+1,k+nx+2);}}}
 const cg=new T.BufferGeometry();cg.setAttribute('position',new T.Float32BufferAttribute(ps,3));cg.setAttribute('uv',new T.Float32BufferAttribute(uv,2));cg.setAttribute('color',new T.Float32BufferAttribute(cols,3));cg.setIndex(ix);cg.computeVertexNormals();const cm=m.cloth.clone();cm.color.set('#abb6c6');cm.side=T.DoubleSide;cm.vertexColors=true;
 const embroidery=document.createElement('canvas');embroidery.width=512;embroidery.height=768;const ec=embroidery.getContext('2d');ec.fillStyle='#586373';ec.fillRect(0,0,512,768);ec.strokeStyle='#c7ab77';ec.lineWidth=3;ec.strokeRect(26,20,460,728);ec.lineWidth=1;ec.strokeRect(33,27,446,714);
 for(const sign of [-1,1])for(let i=0;i<8;i++){ec.beginPath();ec.moveTo(256+sign*12,535+i*7);ec.quadraticCurveTo(256+sign*(55+i*8),525+i*3,256+sign*(95+i*5),485+i*13);ec.lineTo(256+sign*(70+i*8),538+i*6);ec.closePath();ec.fillStyle='#b8a073';ec.fill();}
 ec.beginPath();ec.moveTo(256,518);ec.lineTo(275,552);ec.lineTo(256,594);ec.lineTo(237,552);ec.closePath();ec.fill();const et=new T.CanvasTexture(embroidery);et.colorSpace=T.SRGBColorSpace;cm.map=et;
 const cape=mesh(cp,cg,cm);capes.push({mesh:cape,geometry:cg,rest:cg.attributes.position.array.slice()});
 for(const sign of [-1,1]){
  const shoulder=group(torso,sign*HUMAN.shoulderX,.355,0);shoulder.scale.set(.84,.82,.88);oval(shoulder,.071,.052,.074,m.armor);
  for(let i=0;i<3;i++){const plate=panel(shoulder,[[-.064,-.017],[.062,-.017],[.05,.024],[-.047,.03]],.012,i===0?m.edge:m.armor,sign*i*.014,-i*.035,.058);plate.rotation.z=sign*-.18;for(const x of [-.04,.04])bolt(plate,x,.006,.009,.003);}
 }
 function segment(r1,r2,len,material){return{group:group(root),length:len};}
 function poseSegment(s,a,b){s.group.position.copy(a);s.group.quaternion.setFromUnitVectors(V(0,-1,0),b.clone().sub(a).normalize());}
 const legs=[-1,1].map(sign=>{
  const thigh=segment(.079,.052,HUMAN.thigh,m.stocking),shin=segment(.061,.038,HUMAN.shin,m.leather);
  for(const y of [-.08,-.17]){mesh(thigh.group,new T.CylinderGeometry(.081,.079,.025,24),m.leather,0,y,0);box(thigh.group,.022,.027,.009,m.gold,sign*.048,y,.061);}
  panel(shin.group,[[-.049,.025],[0,.065],[.048,.025],[.043,-.045],[0,-.065],[-.043,-.045]],.025,m.armor,0,0,.053);
  panel(shin.group,[[-.043,.12],[.043,.12],[.028,-.13],[-.029,-.13]],.018,m.armor,0,-.20,.050);
  tube(shin.group,[[0,-.08,.067],[0,-.21,.066],[0,-.33,.061]],.0025,m.gold);
  const boot=group(root);oval(boot,.059,.049,.104,m.leather,0,.052,.045);box(boot,.12,.026,.23,m.black,0,.018,.037,.009);
  box(boot,.107,.041,.091,m.armor,0,.057,.10,.011);
  for(let i=0;i<5;i++)box(boot,.12,.013,.012,m.black,0,.009,-.052+i*.041);
  for(let i=0;i<4;i++)tube(boot,[[-.026,.084+i*.005,.025-i*.012],[.026,.084+i*.005,.017-i*.012]],.002,m.gold,4);
  thigh.group.name=`thigh_${sign}`;shin.group.name=`shin_${sign}`;boot.name=`boot_${sign}`;
  return{sign,thigh,shin,boot};
 });
 const arms=[-1,1].map(sign=>{const upper=segment(.049,.035,HUMAN.upperArm,m.cloth),lower=segment(.043,.029,HUMAN.forearm,m.leather);
  for(let j=0;j<3;j++){const plate=box(lower.group,.065,.065,.014,m.armor,0,-.07-j*.065,.033,.005);bolt(plate,.022,0,.01,.003);}
  const glove=buildHumanHand(root,sign,m),{hand,indexFinger}=glove;
  upper.group.name=`upper_arm_${sign}`;lower.group.name=`forearm_${sign}`;hand.name=`hand_${sign}`;
  return{sign,upper,lower,hand,indexFinger,poseHand:glove.pose};});
 const weapon=buildRifle(root);
 const rig={root,hips,torso,head,hair,capes,legs,arms,...weapon,poseSegment};
 rig.bodySkin=buildHumanBody(rig,m);rig.clothingDetail=buildClothingDetail(rig,m);
 return rig;
}
