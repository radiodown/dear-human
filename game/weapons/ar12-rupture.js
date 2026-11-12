// AR-12 Rupture / procedural_001. Visual fiction, authored in metres.
// Saltline reference: profile extrusions with holes, turned parts, finish separation.
import * as T from '../vendor/three-0.187.0/build/three.module.js';
import { mergeGeometries } from '../vendor/three-0.187.0/examples/jsm/utils/BufferGeometryUtils.js';
import { box, group, mesh, tube } from '../plan-f/geometry.js';
import { weaponMaterials } from '../plan-f/weapon-materials.js';

const rectangle=(z,y,w,h)=>[[z-w/2,y-h/2],[z+w/2,y-h/2],[z+w/2,y+h/2],[z-w/2,y+h/2]];
function profile(parent,outline,width,material,x=0,holes=[],bevel=.0015){
  const shape=new T.Shape(outline.map(([z,y])=>new T.Vector2(-z,y)));shape.closePath();
  for(const hole of holes){const path=new T.Path(hole.map(([z,y])=>new T.Vector2(-z,y)));path.closePath();shape.holes.push(path);}
  const g=new T.ExtrudeGeometry(shape,{depth:width,steps:1,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2});
  g.translate(0,0,-width/2);g.rotateY(Math.PI/2);return mesh(parent,g,material,x);
}
function turned(parent,points,material,x=0,y=0){
  const g=new T.LatheGeometry(points.map(p=>new T.Vector2(...p)),32);g.rotateX(Math.PI/2);return mesh(parent,g,material,x,y);
}
function batch(parent){
  const buckets=new Map();
  for(const child of [...parent.children]){
    if(!child.isMesh)continue;
    child.updateMatrix();const g=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();
    g.applyMatrix4(child.matrix);g.clearGroups();
    if(!buckets.has(child.material))buckets.set(child.material,[]);
    buckets.get(child.material).push(g);parent.remove(child);
  }
  for(const [material,parts] of buckets){const combined=mergeGeometries(parts,false);parts.forEach(p=>p.dispose());mesh(parent,combined,material);}
}
function markings(parent){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;
  const c=canvas.getContext('2d');c.fillStyle='#c5c6bc';c.font='bold 58px monospace';c.fillText('AR-12 / RUPTURE',24,75);
  c.font='25px monospace';c.fillText('DEAR HUMAN   //   001',24,125);c.fillText('SAFE     SEMI     AUTO',24,208);
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
  const material=new T.MeshStandardMaterial({map,transparent:true,roughness:.75,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  for(const side of [-1,1]){const label=mesh(parent,new T.PlaneGeometry(.145,.03625),material,side*.044,.008,-.02);label.rotation.y=side*Math.PI/2;}
}

export function createAR12(){
  const root=new T.Group();root.name='ar12_rupture_procedural_001';
  const gun=group(root),body=group(gun),m=weaponMaterials();body.name='receiver_and_furniture';
  m.anodized.color.set('#30383b');m.polymer.color.set('#242a29');m.magazine.color.set('#3a403d');
  const screw=(x,y,z)=>{const o=mesh(body,new T.CylinderGeometry(.0045,.0045,.0035,6),m.edge,x,y,z);o.rotation.z=Math.PI/2;};
  // Broad, angular upper receiver; the right port is an actual opening.
  const upper=[[-.128,-.027],[.119,-.027],[.135,.012],[.118,.054],[-.106,.054],[-.128,.031]];
  profile(body,upper,.006,m.anodized,-.039);
  profile(body,upper,.006,m.anodized,.039,[rectangle(.028,.026,.088,.025)]);
  box(body,.076,.010,.228,m.anodized,0,.05,0,.002);
  box(body,.076,.010,.241,m.anodized,0,-.027,0,.002);
  box(body,.072,.067,.012,m.steel,0,.012,-.122,.002);
  profile(body,[[-.12,-.03],[.116,-.03],[.104,-.085],[.027,-.085],[.005,-.053],[-.048,-.05],[-.064,-.072],[-.116,-.059]],.069,m.anodized);
  // Open trigger guard and swept rubberised grip.
  profile(body,[[-.070,-.052],[.013,-.052],[.013,-.103],[-.058,-.103],[-.078,-.085]],.018,m.steel,0,
    [[[-.064,-.059],[.006,-.059],[.006,-.095],[-.054,-.095],[-.069,-.081]]]);
  profile(body,[[-.117,-.05],[-.073,-.055],[-.084,-.097],[-.106,-.157],[-.146,-.145],[-.132,-.097]],.045,m.polymer,0,[],.003);
  for(let i=0;i<7;i++)box(body,.047,.004,.032,m.rubber,0,-.085-i*.009,-.109-i*.003,.001);
  const trigger=group(gun,0,-.06,-.033);trigger.name='trigger';
  tube(trigger,[[0,0,0],[0,-.018,-.002],[0,-.032,.01]],.0035,m.steel,12);
  // Folding-stock hinge, skeleton aperture, cheek pad and separate buttpad.
  mesh(body,new T.CylinderGeometry(.020,.020,.079,20),m.steel,0,.008,-.146);
  profile(body,[[-.15,.045],[-.290,.045],[-.307,.025],[-.307,-.093],[-.280,-.093],[-.220,-.038],[-.15,-.024]],.052,m.polymer,0,
    [[[-.188,-.013],[-.278,-.015],[-.278,-.067],[-.246,-.044]]],.002);
  box(body,.058,.017,.12,m.polymer,0,.047,-.232,.004);
  box(body,.067,.139,.014,m.rubber,0,-.026,-.307,.002);
  for(let i=0;i<10;i++)box(body,.068,.004,.003,m.rubber,0,.029-i*.012,-.315,.001);
  // Four separate perforated side plates form a hollow octagonal handguard.
  const vents=Array.from({length:5},(_,i)=>rectangle(.166+i*.043,.014,.028,.014));
  const fore=[ [.124,-.032],[.381,-.032],[.397,-.015],[.397,.040],[.382,.051],[.124,.051] ];
  for(const side of [-1,1]){
    profile(body,fore,.004,m.anodized,side*.038,vents,.001);
    for(const sign of [-1,1]){
      const plate=box(body,.027,.004,.267,m.anodized,side*.029,.010+sign*.037,.260,.001);
      plate.rotation.z=-side*sign*.48;
    }
    for(const z of [.137,.383])screw(side*.043,-.012,z);
  }
  box(body,.052,.004,.267,m.anodized,0,-.033,.260,.001);
  box(body,.052,.004,.267,m.anodized,0,.051,.260,.001);
  // A support pad distinct from the ventilation openings.
  profile(body,[[.179,-.038],[.285,-.038],[.275,-.052],[.201,-.059],[.182,-.051]],.056,m.polymer);
  for(let i=0;i<7;i++)box(body,.058,.003,.005,m.rubber,0,-.053,.202+i*.010,.0005);
  box(body,.027,.007,.515,m.anodized,0,.060,.129,.001);
  for(let i=0;i<42;i++)box(body,.046,.007,.006,m.steel,0,.067,-.122+i*.0123,.0007);
  turned(body,[[0,.11],[.016,.11],[.016,.397],[.012,.41],[.012,.466],[0,.466]],m.steel,0,.012);
  // Short, thick angular muzzle attachment: open centre and side gaps, no black painted holes.
  for(const z of [.463,.494,.524]){
    const outer=[[-.035,-.015],[.035,-.015],[.041,-.007],[.041,.033],[.033,.041],[-.033,.041],[-.041,.033],[-.041,-.007]];
    const shape=new T.Shape(outer.map(p=>new T.Vector2(...p)));
    const aperture=new T.Path();aperture.absarc(0,.012,.011,0,Math.PI*2,true);shape.holes.push(aperture);
    const geo=new T.ExtrudeGeometry(shape,{depth:.009,steps:1,bevelEnabled:true,bevelThickness:.001,bevelSize:.001,bevelSegments:2});
    mesh(body,geo,m.steel,0,0,z);
  }
  for(const y of [-.012,.036])box(body,.049,.008,.070,m.steel,0,y,.498,.001);
  // Raised open reflex hood, transparent lens and subtle reticle.
  box(body,.044,.013,.076,m.anodized,0,.078,-.034,.002);
  for(const side of [-1,1])box(body,.008,.049,.030,m.anodized,side*.028,.104,-.029,.002);
  box(body,.062,.008,.030,m.anodized,0,.130,-.029,.002);
  mesh(gun,new T.PlaneGeometry(.047,.037),m.glass,0,.107,-.030).name='optic_lens';
  mesh(gun,new T.CircleGeometry(.0011,16),new T.MeshBasicMaterial({color:'#e96a3d',side:T.DoubleSide}),0,.107,-.031).name='optic_reticle';
  for(const side of [-1,1]){
    for(const z of [-.095,.088])screw(side*.044,-.015,z);
    screw(side*.039,-.048,-.090);
    box(body,.007,.006,.024,m.steel,side*.043,-.048,-.079,.001).rotation.x=.35;
    box(body,.006,.017,.019,m.steel,side*.039,-.059,.076,.001);
  }
  // Independent bolt and side handle stay accessible for a future animation adapter.
  const bolt=group(gun);bolt.name='bolt_carrier';
  box(bolt,.017,.022,.092,m.edge,.027,.026,.028,.001);
  box(bolt,.026,.010,.018,m.steel,.045,.022,.006,.001);
  // Wide, gently curved magazine with separate floorplate and feed lips.
  const mag=group(gun,0,-.113,.065);mag.name='magazine';
  const outline=[],curve=y=>Math.max(0,-y)**2*2.2;
  for(let i=0;i<=12;i++){const y=.041-i*.015;outline.push([curve(y)-.038,y]);}
  for(let i=12;i>=0;i--){const y=.041-i*.015;outline.push([curve(y)+.038,y]);}
  profile(mag,outline,.057,m.magazine,0,[],.002);
  for(let i=0;i<9;i++){const y=.006-i*.016;box(mag,.060,.004,.078,m.polymer,0,y,curve(y),.001);}
  box(mag,.065,.012,.086,m.polymer,0,-.144,curve(-.144),.002);
  for(const side of [-1,1])box(mag,.005,.012,.055,m.steel,side*.025,.041,0,.001);
  batch(body);batch(mag);markings(gun);
  const sockets={socket_stock:[0,-.026,-.318],socket_grip:[.023,-.10,-.112],socket_support:[0,-.056,.23],socket_muzzle:[0,.012,.534],socket_mag:[0,-.113,.065]};
  for(const [name,pos] of Object.entries(sockets)){const node=group(gun,...pos);node.name=name;}
  // Shared preview convention: muzzle +X, up +Y.
  gun.rotation.y=Math.PI/2;
  root.userData={assetId:'ar12_rupture',revision:'procedural_001',verification:'untested'};
  return root;
}
