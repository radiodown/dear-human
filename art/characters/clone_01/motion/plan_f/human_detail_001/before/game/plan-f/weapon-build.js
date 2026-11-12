import * as T from '../vendor/three-0.187.0/build/three.module.js';
import {mergeGeometries} from '../vendor/three-0.187.0/examples/jsm/utils/BufferGeometryUtils.js';
import {box,group,mesh,tube} from './geometry.js';
import {weaponMaterials,weaponMarkings} from './weapon-materials.js';
import {RIFLE} from './weapon-definition.js';

// Side outlines are [forward Z, height Y], extruded across X, with true open holes.
function profile(parent,outline,width,material,x=0,holes=[],bevel=.001){
  const points=outline.map(([z,y])=>new T.Vector2(-z,y));
  const shape=new T.Shape(points);shape.closePath();
  for(const hole of holes){const path=new T.Path(hole.map(([z,y])=>new T.Vector2(-z,y)));path.closePath();shape.holes.push(path);}
  const g=new T.ExtrudeGeometry(shape,{depth:width,steps:1,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2});
  g.translate(0,0,-width/2);g.rotateY(Math.PI/2);return mesh(parent,g,material,x);
}
function turned(parent,points,material,x=0,y=0){
  const g=new T.LatheGeometry(points.map(([radius,z])=>new T.Vector2(radius,z)),24);
  g.rotateX(Math.PI/2);return mesh(parent,g,material,x,y);
}
const rect=(z,y,w,h)=>[[z-w/2,y-h/2],[z+w/2,y-h/2],[z+w/2,y+h/2],[z-w/2,y+h/2]];
// Merge only rigid parts. The bolt, trigger and magazines keep their own transforms.
function batchRigid(parent){
  const buckets=new Map();parent.updateMatrixWorld(true);
  for(const child of [...parent.children]){
    if(!child.isMesh)continue;
    child.updateMatrix();const g=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();
    g.applyMatrix4(child.matrix);g.clearGroups();
    if(!buckets.has(child.material))buckets.set(child.material,[]);
    buckets.get(child.material).push(g);parent.remove(child);
  }
  for(const [material,parts] of buckets){const g=mergeGeometries(parts,false);parts.forEach(p=>p.dispose());mesh(parent,g,material);}
}

export function buildRifle(root){
  const gun=group(root),m=weaponMaterials(),rigid=group(gun);gun.name='rifle';
  const fastener=(x,y,z)=>{const o=mesh(rigid,new T.CylinderGeometry(.004,.004,.003,6),m.edge,x,y,z);o.rotation.z=Math.PI/2;};
  // Upper receiver: separated side walls leave room for a moving bolt visible through the port.
  const receiver=[[-.12,-.025],[.105,-.025],[.112,.036],[.09,.048],[-.10,.048],[-.12,.032]];
  profile(rigid,receiver,.005,m.anodized,-.030);
  profile(rigid,receiver,.005,m.anodized,.030,[rect(.018,.024,.083,.024)]);
  box(rigid,.061,.008,.218,m.anodized,0,.044,-.004,.002);
  box(rigid,.06,.009,.218,m.anodized,0,-.025,-.004,.002);
  box(rigid,.052,.048,.008,m.dark,0,.008,-.111,.001);
  // Lower, magazine well, finger guard and sculpted angled grip.
  profile(rigid,[[-.112,-.024],[.10,-.024],[.095,-.062],[.055,-.068],[-.008,-.06],[-.027,-.043],[-.064,-.044],[-.077,-.06],[-.107,-.048]],.060,m.anodized);
  profile(rigid,[[-.084,-.044],[-.044,-.047],[-.052,-.084],[-.067,-.116],[-.107,-.108],[-.096,-.07]],.039,m.polymer,0,[],.003);
  for(let i=0;i<5;i++)box(rigid,.041,.003,.032,m.rubber,0,-.069-i*.008,-.078-i*.003,.001);
  profile(rigid,[[-.048,-.041],[.014,-.041],[.014,-.087],[-.038,-.087],[-.054,-.076]],.012,m.anodized,0,
    [[[-.044,-.047],[.008,-.047],[.008,-.080],[-.034,-.080],[-.047,-.073]]]);
  // Hollow magazine collar, below the lower receiver.
  for(const side of [-1,1])box(rigid,.005,.026,.078,m.anodized,side*.028,-.051,.023,.001);
  for(const z of [-.016,.062])box(rigid,.056,.026,.005,m.anodized,0,-.051,z,.001);
  // Stock tube and outlined stock retain the shoulder contact of the previous version.
  turned(rigid,[[0,-.287],[.016,-.287],[.016,-.112],[0,-.112]],m.steel,0,.012);
  profile(rigid,[[-.13,.035],[-.287,.035],[-.301,.018],[-.301,-.075],[-.275,-.075],[-.208,-.025],[-.13,-.018]],.044,m.polymer,0,
    [[[-.226,-.024],[-.278,-.024],[-.278,-.056],[-.262,-.056]]],.002);
  box(rigid,.057,.110,.018,m.rubber,0,-.024,-.303,.003);
  for(let i=0;i<8;i++)box(rigid,.058,.004,.003,m.rubber,0,.019-i*.012,-.313,.001);
  box(rigid,.046,.012,.10,m.polymer,0,.038,-.229,.004);
  // Hollow octagonal handguard. Each side is a perforated plate, not painted black slots.
  const vents=Array.from({length:6},(_,i)=>rect(.153+i*.041,0,.026,.009));
  for(let i=0;i<8;i++){
    const plate=profile(rigid,rect(.263,0,.304,.023),.003,m.anodized,.029,vents,.0006);
    // Rotate geometry and its offset together around the barrel centre.
    plate.geometry.translate(.029,0,0);plate.position.x=0;plate.geometry.rotateZ(i*Math.PI/4);plate.geometry.translate(0,.015,0);
  }
  turned(rigid,[[.013,.105],[.033,.105],[.033,.118],[.013,.118],[.013,.105]],m.steel,0,.015);
  turned(rigid,[[.012,.403],[.033,.403],[.033,.413],[.012,.413],[.012,.403]],m.steel,0,.015);
  // Rail base and individual teeth, including the gaps between them.
  box(rigid,.024,.008,.524,m.anodized,0,.055,.148,.001);
  for(let i=0;i<43;i++)box(rigid,.038,.006,.006,m.anodized,0,.062,-.105+i*.012,.0007);
  for(const side of [-1,1])for(let i=0;i<6;i++)box(rigid,.007,.025,.006,m.steel,side*.035,.015,.315+i*.014,.0008);
  // Turned barrel profile and open-ended muzzle brake with actual slots between ribs.
  turned(rigid,[[0,.105],[.013,.105],[.013,.31],[.010,.32],[.010,.59],[.014,.598],[.014,.616],[.006,.616],[.006,.59]],m.steel,0,.015);
  for(const z of [.615,.635,.654])turned(rigid,[[.006,z],[.022,z],[.022,z+.006],[.006,z+.006],[.006,z]],m.steel,0,.015);
  for(let i=0;i<6;i++){
    const angle=i*Math.PI/3;
    const rib=box(rigid,.006,.007,.057,m.steel,Math.sin(angle)*.018,.015+Math.cos(angle)*.018,.642,.001);rib.rotation.z=-angle;
  }
  turned(rigid,[[.006,.667],[.022,.667],[.022,.675],[.006,.675],[.006,.667]],m.steel,0,.015);
  // Gas block, tube and paired fold-down sight bases.
  turned(rigid,[[.01,.44],[.019,.44],[.019,.46],[.01,.46],[.01,.44]],m.steel,0,.015);
  box(rigid,.016,.022,.024,m.steel,0,.038,.449,.002);
  turned(rigid,[[0,.10],[.003,.10],[.003,.45],[0,.45]],m.steel,0,.041);
  for(const z of [-.091,.387]){
    box(rigid,.034,.009,.025,m.steel,0,.071,z,.001);
    box(rigid,.025,.006,.034,m.steel,0,.079,z,.001);
  }
  // Reflex sight is a hollow frame; glass and illuminated reticle are separate surfaces.
  box(rigid,.036,.014,.065,m.anodized,0,.078,-.026,.002);
  const sightShape=[[-.029,.086],[.029,.086],[.029,.132],[.021,.142],[-.021,.142],[-.029,.132]];
  const sightHole=[[-.020,.094],[.020,.094],[.020,.128],[.015,.133],[-.015,.133],[-.020,.128]];
  const s=new T.Shape(sightShape.map(p=>new T.Vector2(...p)));s.holes.push(new T.Path(sightHole.map(p=>new T.Vector2(...p))));
  const sg=new T.ExtrudeGeometry(s,{depth:.024,bevelEnabled:true,bevelSize:.001,bevelThickness:.001,bevelSegments:2,steps:1});sg.translate(0,0,-.042);mesh(rigid,sg,m.anodized);
  for(const side of [-1,1])for(const z of [-.082,.073])fastener(side*.034,-.014,z);
  for(const side of [-1,1]){
    fastener(side*.035,-.036,-.071);
    box(rigid,.005,.006,.020,m.steel,side*.036,-.032,-.064,.001).rotation.x=.4;
    box(rigid,.005,.014,.016,m.steel,side*.035,-.036,.052,.001);
  }
  batchRigid(rigid);weaponMarkings(gun);
  const glass=mesh(gun,new T.PlaneGeometry(.040,.036),m.glass,0,.113,-.029);
  const dot=mesh(gun,new T.CircleGeometry(.0013,12),new T.MeshBasicMaterial({color:new T.Color(4,.12,.025),side:T.DoubleSide}),0,.112,-.030);
  dot.name='reflex_reticle';glass.name='reflex_glass';
  // Curved ribbed magazine and visible cartridge at its feed lips.
  const mag=group(gun,...RIFLE.magazine);mag.rotation.x=RIFLE.magazineTilt;mag.name='magazine_loaded';
  const curve=y=>Math.max(0,-y-.005)**2*1.7,outline=[];
  for(let i=0;i<=12;i++){const y=.047-i*.010;outline.push([curve(y)-.031,y]);}
  for(let i=12;i>=0;i--){const y=.047-i*.010;outline.push([curve(y)+.031,y]);}
  profile(mag,outline,.043,m.magazine,0,[],.002);
  for(let i=0;i<7;i++){const y=.019-i*.013;box(mag,.046,.004,.063,m.polymer,0,y,curve(y),.001);}
  box(mag,.049,.009,.071,m.polymer,0,-.078,curve(-.078),.002);
  for(const side of [-1,1])box(mag,.004,.012,.045,m.steel,side*.020,.051,0,.001);
  batchRigid(mag);
  const round=group(mag);round.name='feed_round';
  turned(round,[[0,-.025],[.005,-.025],[.005,.012],[.004,.019],[.002,.028],[0,.032]],m.brass,0,.052);
  const heldMag=mag.clone(true);heldMag.name='magazine_in_hand';heldMag.visible=false;root.add(heldMag);
  const heldRound=heldMag.getObjectByName('feed_round');
  const bolt=group(gun);bolt.name='bolt_carrier';
  box(bolt,.018,.020,.085,m.edge,.020,.024,.018,.002);
  for(let i=0;i<4;i++)box(bolt,.002,.013,.002,m.dark,.030,.024,-.006+i*.009,.0005);
  const handle=group(gun,...RIFLE.handle);handle.name='charging_handle';
  box(handle,.075,.012,.018,m.steel,0,0,0,.002);box(handle,.016,.01,.045,m.anodized,0,0,.020,.001);
  const trigger=group(gun,0,-.047,-.023);trigger.name='trigger';
  tube(trigger,[[0,0,0],[0,-.014,-.002],[0,-.027,.008]],.003,m.steel,12);
  const muzzle=group(gun,...RIFLE.muzzle),ejection=group(gun,...RIFLE.ejection);
  const flash=group(muzzle);flash.visible=false;
  const flame=new T.MeshBasicMaterial({color:new T.Color(8,3.1,.5),transparent:true,opacity:.8,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending});
  for(let i=0;i<3;i++){
    const shape=new T.Shape([new T.Vector2(-.016,0),new T.Vector2(-.038,.045),new T.Vector2(-.012,.09),new T.Vector2(0,.20),new T.Vector2(.015,.08),new T.Vector2(.031,.035),new T.Vector2(.014,0)]);
    const g=new T.ShapeGeometry(shape);g.rotateX(Math.PI/2);g.rotateZ(i*Math.PI/3);
    const f=mesh(flash,g,flame);f.castShadow=f.receiveShadow=false;
  }
  const lamp=new T.PointLight('#ffb355',0,2.8,2);muzzle.add(lamp);
  return {gun,mag,heldMag,handle,bolt,trigger,round,heldRound,muzzle,ejection,flash,lamp};
}
