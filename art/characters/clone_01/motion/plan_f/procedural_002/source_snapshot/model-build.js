import * as T from '../vendor/three-0.187.0/build/three.module.js';
import {V,mesh,group,box,oval,tube,loft,panel} from './geometry.js';
import {materials} from './materials.js';

export function buildLian(){
 const root=new T.Group(),m=materials(),hips=group(root,0,.91,0),torso=group(hips,0,.08,0);
 const bolt=(p,x,y,z,size=.006)=>{const o=mesh(p,new T.CylinderGeometry(size,size,.004,8),m.gold,x,y,z);o.rotation.x=Math.PI/2;return o;};
 // Continuous tailored torso, shaped chest plate and segmented abdominal plates.
 mesh(torso,loft([[0,.151,.105],[.08,.126,.078],[.18,.133,.087],[.27,.169,.116],[.34,.183,.093],[.40,.15,.072],[.44,.068,.052]],40,40),m.cloth);
 mesh(torso,loft([[.15,.131,.09],[.22,.155,.122],[.29,.176,.132],[.35,.181,.103],[.39,.15,.075]],40,28,(x,y,z,a)=>[x,y,z+(Math.max(0,Math.cos(a))*.009*Math.cos(x*17))]),m.armor);
 for(const sign of [-1,1]){
  const inset=panel(torso,[[-.027,-.087],[.026,-.06],[.035,.047],[.013,.081],[-.027,.065]],.012,m.edge,sign*.143,.273,.10);inset.rotation.y=sign*.32;
  tube(torso,[[sign*.12,.40,.055],[sign*.132,.31,.137],[sign*.11,.19,.108],[sign*.112,.08,.092]],.012,m.leather);
  for(let j=0;j<3;j++){box(torso,.028,.022,.006,m.gold,sign*.119,.12+j*.091,.129);box(torso,.016,.012,.009,m.black,sign*.119,.12+j*.091,.134);}
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
 const head=group(torso,0,.563,.004);
 // Cross-section face with integrated nose bridge, cheeks, eye sockets and chin.
 const gauss=(x,c,s)=>Math.exp(-(((x-c)/s)**2));
 const face=loft([[-.132,.023,.034],[-.118,.046,.052],[-.09,.068,.066],[-.05,.085,.078],[.008,.096,.079],[.06,.093,.077],[.11,.078,.066],[.141,.046,.038],[.151,.002,.002]],64,64,(x,y,z,a)=>{
   const front=Math.pow(Math.max(0,Math.cos(a)),5);
   const nose=.027*gauss(x,0,.014)*gauss(y,-.027,.043);
   const sockets=-.01*(gauss(x,.037,.024)+gauss(x,-.037,.024))*gauss(y,.004,.017);
   const cheek=.009*(gauss(x,.049,.031)+gauss(x,-.049,.031))*gauss(y,-.035,.026);
   return[x,y,z+front*(nose+sockets+cheek)];
 });mesh(head,face,m.skin);
 for(const sign of [-1,1]){
  const ear=oval(head,.016,.029,.013,m.skin,sign*.094,-.026,-.009);oval(ear,.45,.62,.5,m.lip,0,0,.6);
  const eye=oval(head,.026,.009,.010,m.eye,sign*.036,.006,.075);eye.rotation.z=sign*.09;
  oval(head,.009,.009,.003,m.iris,sign*.035,.006,.084);oval(head,.004,.006,.002,m.pupil,sign*.035,.006,.087);
  oval(head,.002,.002,.001,new T.MeshBasicMaterial({color:'#ffffff'}),sign*.035-.002,.009,.089);
  tube(head,[[sign*.012,.006,.081],[sign*.032,.015,.084],[sign*.059,.010,.072]],.0025,m.hair,16);
  tube(head,[[sign*.015,-.001,.079],[sign*.036,-.004,.081],[sign*.058,.004,.072]],.0016,m.skin,16);
  tube(head,[[sign*.016,.031,.08],[sign*.035,.035,.079],[sign*.061,.028,.069]],.003,m.hair,16);
  oval(head,.004,.009,.004,m.gold,sign*.096,-.053,.001);
 }
 tube(head,[[-.02,-.067,.075],[-.008,-.065,.081],[0,-.066,.082],[.009,-.065,.081],[.02,-.067,.075]],.0027,m.lip,24);
 oval(head,.016,.003,.004,m.lip,0,-.071,.078);
 // Crown and shaped locks with fine longitudinal grooves in their normal map.
 mesh(head,loft([[.04,.098,.079],[.10,.089,.075],[.143,.060,.052],[.158,.003,.003]],48,24,(x,y,z)=>[x,y,z-.013]),m.hair);
 const hair=[];
 function lock(parent,pts,width,lengthScale=1){const curve=new T.CatmullRomCurve3(pts.map(p=>V(...p))),g=new T.BufferGeometry(),ps=[],uv=[],ix=[];
  for(let j=0;j<=24;j++){const t=j/24,p=curve.getPoint(t),w=width*Math.pow(Math.sin(Math.PI*(.05+t*.95)),.4);for(let i=0;i<=8;i++){const q=i/8*2-1;ps.push(p.x+q*w,p.y,p.z+.009*(1-q*q));uv.push(i/8,t*lengthScale);if(j<24&&i<8){const k=j*9+i;ix.push(k,k+9,k+1,k+1,k+9,k+10);}}}
  g.setAttribute('position',new T.Float32BufferAttribute(ps,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return mesh(parent,g,m.hair);}
 m.hair.side=T.DoubleSide;
 for(let i=0;i<15;i++){const a=(i/14-.5)*3.4,x=Math.sin(a)*.09,z=-.014-Math.cos(a)*.075;const g=group(head,x,.065,z);lock(g,[[0,.045,0],[x*.12,-.05,-.008],[x*.15,-.24,-.03],[x*.45,-.41-i%3*.012,-.02]],.019);hair.push(g);}
 for(let i=0;i<9;i++){const x=(i-4)*.021;lock(head,[[x*.65,.147,.035],[x*.92,.096,.077],[x,.044,.085],[x+(i%2?.007:-.006),.022+Math.abs(x)*.18,.087]],.014);}
 for(const sign of [-1,1]){lock(head,[[sign*.083,.1,.025],[sign*.096,.015,.034],[sign*.092,-.14,.027],[sign*.11,-.26,-.01]],.021);}
 // Mantle has shoulder drape, radial pleats, embroidered edging and a scalloped hem.
 const capes=[];const cp=group(torso,0,.36,-.07);const ps=[],uv=[],ix=[],cols=[];const nx=32,ny=36;
 for(let j=0;j<=ny;j++){const t=j/ny;for(let i=0;i<=nx;i++){const u=i/nx,q=u*2-1,x=q*(.19+t*.15),y=-t*1.15,z=-.05-t*.12+.07*q*q+Math.sin(u*35)*(.006+t*.017);ps.push(x,y,z);uv.push(u,t);const c=new T.Color((u<.035||u>.965||t>.965)?'#c2a56e':'#68717d');cols.push(c.r,c.g,c.b);if(j<ny&&i<nx){const k=j*(nx+1)+i;ix.push(k,k+nx+1,k+1,k+1,k+nx+1,k+nx+2);}}}
 const cg=new T.BufferGeometry();cg.setAttribute('position',new T.Float32BufferAttribute(ps,3));cg.setAttribute('uv',new T.Float32BufferAttribute(uv,2));cg.setAttribute('color',new T.Float32BufferAttribute(cols,3));cg.setIndex(ix);cg.computeVertexNormals();const cm=m.cloth.clone();cm.color.set('#abb6c6');cm.side=T.DoubleSide;cm.vertexColors=true;
 const embroidery=document.createElement('canvas');embroidery.width=512;embroidery.height=768;const ec=embroidery.getContext('2d');ec.fillStyle='#586373';ec.fillRect(0,0,512,768);ec.strokeStyle='#c7ab77';ec.lineWidth=3;ec.strokeRect(26,20,460,728);ec.lineWidth=1;ec.strokeRect(33,27,446,714);
 for(const sign of [-1,1])for(let i=0;i<8;i++){ec.beginPath();ec.moveTo(256+sign*12,535+i*7);ec.quadraticCurveTo(256+sign*(55+i*8),525+i*3,256+sign*(95+i*5),485+i*13);ec.lineTo(256+sign*(70+i*8),538+i*6);ec.closePath();ec.fillStyle='#b8a073';ec.fill();}
 ec.beginPath();ec.moveTo(256,518);ec.lineTo(275,552);ec.lineTo(256,594);ec.lineTo(237,552);ec.closePath();ec.fill();const et=new T.CanvasTexture(embroidery);et.colorSpace=T.SRGBColorSpace;cm.map=et;
 mesh(cp,cg,cm);capes.push({geometry:cg,rest:cg.attributes.position.array.slice()});
 for(const sign of [-1,1]){
  const shoulder=group(torso,sign*.195,.355,0);oval(shoulder,.085,.058,.084,m.armor);
  for(let i=0;i<3;i++){const plate=panel(shoulder,[[-.064,-.017],[.062,-.017],[.05,.024],[-.047,.03]],.012,i===0?m.edge:m.armor,sign*i*.014,-i*.035,.058);plate.rotation.z=sign*-.18;for(const x of [-.04,.04])bolt(plate,x,.006,.009,.003);}
 }
 function segment(r1,r2,len,material){const g=group(root);mesh(g,loft([[-len,.001,.001],[-len+.015,r2,r2*.82],[-len*.6,r1*.94,r1*.82],[-len*.2,r1,r1*.83],[0,r1*.88,r1*.75]],24,20),material);return{group:g,length:len};}
 function poseSegment(s,a,b){s.group.position.copy(a);s.group.quaternion.setFromUnitVectors(V(0,-1,0),b.clone().sub(a).normalize());}
 const legs=[-1,1].map(sign=>{
  const thigh=segment(.079,.052,.40,m.stocking),shin=segment(.061,.038,.39,m.leather);
  for(const y of [-.08,-.17]){mesh(thigh.group,new T.CylinderGeometry(.081,.079,.025,24),m.leather,0,y,0);box(thigh.group,.022,.027,.009,m.gold,sign*.048,y,.061);}
  panel(shin.group,[[-.049,.025],[0,.065],[.048,.025],[.043,-.045],[0,-.065],[-.043,-.045]],.025,m.armor,0,0,.043);
  panel(shin.group,[[-.043,.12],[.043,.12],[.028,-.13],[-.029,-.13]],.018,m.armor,0,-.20,.039);
  tube(shin.group,[[0,-.08,.052],[0,-.21,.061],[0,-.33,.05]],.0025,m.gold);
  const boot=group(root);oval(boot,.059,.049,.104,m.leather,0,.052,.045);box(boot,.12,.026,.23,m.black,0,.018,.037,.009);
  box(boot,.107,.041,.091,m.armor,0,.057,.10,.011);
  for(let i=0;i<5;i++)box(boot,.12,.013,.012,m.black,0,.009,-.052+i*.041);
  for(let i=0;i<4;i++)tube(boot,[[-.026,.084+i*.005,.025-i*.012],[.026,.084+i*.005,.017-i*.012]],.002,m.gold,4);
  return{sign,thigh,shin,boot};
 });
 const arms=[-1,1].map(sign=>{const upper=segment(.049,.035,.28,m.cloth),lower=segment(.043,.029,.28,m.leather);
  for(let j=0;j<3;j++){const plate=box(lower.group,.065,.065,.014,m.armor,0,-.07-j*.065,.033,.005);bolt(plate,.022,0,.01,.003);}
  const hand=group(root);oval(hand,.029,.025,.040,m.leather);for(let i=0;i<4;i++){const finger=group(hand,(i-1.5)*.014,-.008,.024);box(finger,.011,.032,.018,m.leather,0,-.01,0,.004);box(finger,.011,.014,.024,m.armor,0,-.026,-.005,.003);}oval(hand,.012,.025,.015,m.leather,.031,-.002,.008);
  return{sign,upper,lower,hand};});
 const gun=group(root,.09,1.27,.37);
 box(gun,.067,.079,.25,m.black,0,0,0,.009);box(gun,.053,.048,.19,m.armor,0,.043,.01,.005);
 const stock=panel(gun,[[-.035,-.06],[.035,-.06],[.029,.06],[-.025,.047]],.19,m.black,0,-.009,-.20);box(gun,.069,.119,.022,m.leather,0,-.024,-.301,.005);
 box(gun,.051,.066,.29,m.armor,0,.015,.26,.008);
 for(let i=0;i<11;i++){box(gun,.059,.008,.011,m.black,0,.057,.13+i*.023,.001);for(const sign of [-1,1])box(gun,.003,.017,.018,m.black,sign*.027,.015,.14+i*.022,.001);}
 const cylinder=(r,len,mat,y,z)=>{const o=mesh(gun,new T.CylinderGeometry(r,r,len,16),mat,0,y,z);o.rotation.x=Math.PI/2;return o;};
 cylinder(.013,.24,m.edge,.015,.51);cylinder(.024,.058,m.black,.015,.64);for(let i=0;i<4;i++)box(gun,.049,.005,.013,m.edge,0,.033,.62+i*.013,.001);
 const mag=box(gun,.046,.145,.069,m.armor,0,-.105,.023,.008);mag.rotation.x=-.18;for(let i=0;i<3;i++)box(mag,.049,.008,.07,m.black,0,-.04+i*.029,0,.001);
 const grip=box(gun,.041,.09,.04,m.leather,0,-.065,-.067,.008);grip.rotation.x=-.2;
 tube(gun,[[.025,-.05,-.045],[.025,-.085,-.02],[.025,-.08,.005],[.025,-.04,.015]],.003,m.black,16);
 box(gun,.032,.04,.082,m.black,0,.08,-.025,.004);box(gun,.034,.027,.01,m.edge,0,.092,.018,.003);
 for(const sign of [-1,1])box(gun,.009,.06,.05,m.armor,sign*.025,.105,-.03,.003);
 box(gun,.058,.009,.05,m.armor,0,.135,-.03,.003);
 const sightGlass=new T.MeshPhysicalMaterial({color:'#769fa8',transparent:true,opacity:.42,roughness:.12,metalness:.4,clearcoat:1});box(gun,.04,.044,.003,sightGlass,0,.105,-.016,.001);
 box(gun,.022,.05,.02,m.black,0,.077,.43,.003);
 for(const z of [-.08,.06])bolt(gun,.035,.0,z,.004);
 box(gun,.003,.018,.045,m.edge,.035,.027,.015,.001);
 const muzzle=group(gun,0,.015,.675);
 const flash=mesh(muzzle,new T.ConeGeometry(.052,.22,9),new T.MeshBasicMaterial({color:new T.Color(7,3.2,.7),transparent:true,opacity:.85,depthWrite:false}),0,0,.09);flash.rotation.x=Math.PI/2;flash.visible=false;
 const lamp=new T.PointLight('#ffb355',0,2.8,2);muzzle.add(lamp);
 return{root,hips,torso,head,hair,capes,legs,arms,gun,muzzle,flash,lamp,poseSegment};
}
