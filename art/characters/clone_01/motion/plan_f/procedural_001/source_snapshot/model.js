import * as T from '../vendor/three-0.187.0/build/three.module.js';

// All surfaces are constructed here. No imported mesh, image, rig or animation.
export function createLian() {
  const root = new T.Group();
  const mat = (color, metalness = 0, roughness = .65) => new T.MeshStandardMaterial({ color, metalness, roughness });
  const m = { armor: mat('#46535e', .35, .45), trim: mat('#b29a66', .45, .4), cloth: mat('#252c35'), skin: mat('#dfb9a7', 0, .6), hair: mat('#20202a', .05, .62), inset: mat('#88959c', .4, .4), black: mat('#101720', .1), eye: mat('#292b2d'), white: mat('#e4d7c9'), lip: mat('#a87371'), stocking: mat('#484049') };
  function mesh(parent, geo, material, x=0,y=0,z=0) { const o=new T.Mesh(geo,material);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o; }
  function box(parent,w,h,d,material,x=0,y=0,z=0) { return mesh(parent,new T.BoxGeometry(w,h,d),material,x,y,z); }
  function oval(parent,w,h,d,material,x=0,y=0,z=0) { const o=mesh(parent,new T.SphereGeometry(1,20,14),material,x,y,z);o.scale.set(w,h,d);return o; }
  function group(parent,x=0,y=0,z=0) { const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g; }
  // Elliptical rings keep the torso fitted, with a distinct waist and shoulders.
  function shell(parent,rings,depth,material) {
    const g=new T.LatheGeometry(rings.map(([r,y])=>new T.Vector2(r,y)),24);g.scale(1,1,depth);return mesh(parent,g,material);
  }
  const hips=group(root,0,.91,0), torso=group(hips,0,.08,0);
  shell(torso,[[.14,0],[.125,.09],[.135,.19],[.197,.31],[.19,.39],[.10,.43]],.66,m.cloth);
  const plate=shell(torso,[[.14,.12],[.17,.22],[.20,.31],[.18,.38]],.7,m.armor);
  for(const sign of [-1,1]) {
    const panel=box(torso,.038,.21,.025,m.inset,sign*.143,.27,.109);panel.rotation.z=sign*-.14;
    const strap=box(torso,.023,.35,.026,m.black,sign*.12,.23,.134);strap.rotation.z=sign*.16;
    for(let i=0;i<3;i++)box(torso,.028,.012,.009,m.trim,sign*.12,.12+i*.1,.151);
    box(torso,.009,.25,.01,m.trim,sign*.056,.19,.137);
  }
  box(torso,.29,.038,.22,m.black,0,.09,0);box(torso,.045,.03,.015,m.trim,0,.09,.12);
  box(hips,.31,.045,.23,m.armor,0,.065,0);box(hips,.04,.028,.016,m.trim,0,.065,.126);
  for(const sign of [-1,1])for(let i=0;i<3;i++) {
    const p=box(hips,.067,.14,.035,m.armor,sign*(.044+i*.065),-.055,.10-i*.021);p.rotation.z=sign*-.12;
    box(p,.045,.008,.008,m.trim,0,.052,.021);
  }
  const collar=shell(torso,[[.075,.40],[.076,.48]],.85,m.armor);
  box(torso,.012,.06,.012,m.trim,0,.443,.065);
  const head=group(torso,0,.555,0);
  oval(head,.102,.142,.093,m.skin,0,0,.012);
  oval(head,.087,.085,.085,m.skin,0,-.071,.025);
  for(const sign of [-1,1]) {
    oval(head,.022,.038,.02,m.skin,sign*.1,-.02,0);
    oval(head,.028,.011,.009,m.white,sign*.041,.008,.092);
    oval(head,.010,.011,.006,m.eye,sign*.041,.008,.10);
    const brow=box(head,.052,.006,.008,m.hair,sign*.043,.032,.097);brow.rotation.z=sign*-.10;
    const lid=box(head,.052,.003,.008,m.hair,sign*.043,.018,.101);lid.rotation.z=sign*.07;
    oval(head,.007,.011,.005,m.trim,sign*.109,-.043,.008);
  }
  oval(head,.012,.027,.018,m.skin,0,-.02,.103);
  oval(head,.023,.006,.008,m.lip,0,-.06,.104);
  oval(head,.105,.10,.093,m.hair,0,.07,-.016);
  const hair=[];
  for(let i=0;i<11;i++) {
    const a=(i/10-.5)*2.9;
    const lock=group(head,Math.sin(a)*.087,.065,-.045-Math.cos(a)*.033);
    const strand=oval(lock,.024,.25,.035,m.hair,0,-.19,0);strand.rotation.x=-.06;
    hair.push(lock);
  }
  for(let i=0;i<7;i++) {
    const x=(i-3)*.027;
    const bang=oval(head,.019,.075,.018,m.hair,x,.064-Math.abs(x)*.2,.081);
    bang.rotation.z=(i-3)*-.07;
  }
  // Code-built gold wing badge.
  for(const sign of [-1,1])for(let i=0;i<4;i++) {
    const feather=box(torso,.04-i*.005,.008,.01,m.trim,sign*(.014+i*.01),.34+i*.008,.15);feather.rotation.z=sign*.45;
  }
  const capePivot=group(torso,-.12,.38,-.09);
  const capeGeo=new T.PlaneGeometry(.56,1.05,10,16);
  capeGeo.translate(-.05,-.50,0);
  const cape=mesh(capePivot,capeGeo,new T.MeshStandardMaterial({color:'#232936',roughness:.9,side:T.DoubleSide}));
  const capeRest=capeGeo.attributes.position.array.slice();
  // Vertex-color edging is generated from UVs, including a woven fold pattern.
  const colors=[];const uv=capeGeo.attributes.uv;
  for(let i=0;i<uv.count;i++) {const u=uv.getX(i),v=uv.getY(i);const edge=u<.06||u>.94||v<.07;const c=new T.Color(edge?'#b7a071':'#768399');if(!edge)c.multiplyScalar(.7+.15*Math.cos(u*50));colors.push(c.r,c.g,c.b);}
  capeGeo.setAttribute('color',new T.Float32BufferAttribute(colors,3));cape.material.vertexColors=true;cape.material.color.set('#8592a2');
  const capeHem=box(capePivot,.56,.017,.012,m.trim,-.05,-1.025,0);
  const shoulders=[];
  for(const sign of [-1,1]) {
    const shoulder=group(torso,sign*.205,.35,0);
    oval(shoulder,.099,.074,.10,m.armor);
    const edge=box(shoulder,.12,.012,.14,m.trim,0,.035,.01);edge.rotation.z=sign*-.18;
    shoulders.push(shoulder);
  }
  // Segments are posed by their endpoints; same helper for arms and legs.
  function segment(radiusA,radiusB,length,material) {
    const g=group(root);mesh(g,new T.CylinderGeometry(radiusA,radiusB,length,14),material,0,-length/2,0);
    return {group:g,length};
  }
  function poseSegment(s,a,b) { s.group.position.copy(a);s.group.quaternion.setFromUnitVectors(new T.Vector3(0,-1,0),b.clone().sub(a).normalize()); }
  const legs=[-1,1].map(sign=>{
    const thigh=segment(.078,.058,.40,m.stocking),shin=segment(.06,.041,.39,m.armor);
    mesh(thigh.group,new T.CylinderGeometry(.079,.079,.034,16),m.black,0,-.08,0);
    box(thigh.group,.016,.29,.012,m.trim,sign*.055,-.16,.05);
    oval(shin.group,.065,.085,.045,m.armor,0,-.02,.028);
    box(shin.group,.011,.25,.013,m.trim,0,-.19,.053);
    const boot=group(root);oval(boot,.063,.061,.12,m.black,0,.05,.045);box(boot,.13,.025,.24,m.armor,0,.025,.04);
    return {sign,thigh,shin,boot};
  });
  const arms=[-1,1].map(sign=>({sign,upper:segment(.048,.038,.28,m.cloth),lower:segment(.043,.033,.28,m.armor),hand:oval(root,.033,.035,.047,m.black)}));
  // Rifle assembled from receiver, stock, handguard, barrel, magazine and sights.
  const gun=group(root,.09,1.27,.37);
  box(gun,.065,.085,.25,m.armor,0,0,0);
  box(gun,.055,.07,.19,m.black,0,-.012,-.20);
  box(gun,.066,.115,.025,m.black,0,-.025,-.30);
  box(gun,.048,.075,.29,m.black,0,.015,.26);
  for(let i=0;i<10;i++)box(gun,.054,.009,.009,m.inset,0,.058,.14+i*.023);
  const barrel=mesh(gun,new T.CylinderGeometry(.012,.012,.24,12),m.inset,0,.015,.51);barrel.rotation.x=Math.PI/2;
  box(gun,.045,.045,.055,m.black,0,.015,.64);
  const mag=box(gun,.044,.14,.065,m.armor,0,-.10,.025);mag.rotation.x=-.17;
  const grip=box(gun,.04,.085,.04,m.black,0,-.065,-.065);grip.rotation.x=-.2;
  box(gun,.018,.055,.02,m.black,0,.075,.43);
  box(gun,.03,.025,.08,m.black,0,.075,-.035);
  const muzzle=group(gun,0,.015,.675);
  const flash=mesh(muzzle,new T.ConeGeometry(.055,.23,7),new T.MeshBasicMaterial({color:'#ffe7a0',transparent:true,opacity:.95,depthWrite:false}),0,0,.10);flash.rotation.x=Math.PI/2;flash.visible=false;
  const lamp=new T.PointLight('#ffbf65',0,2);muzzle.add(lamp);
  const v=(x,y,z)=>new T.Vector3(x,y,z);
  function pose(state) {
    const stride=state.speed/1.3,phase=state.phase;
    const bob=Math.abs(Math.sin(phase))* .025*stride;
    hips.position.y=.91+bob;
    torso.rotation.x=.035+stride*.045;
    head.rotation.y=-.10;
    root.position.x=state.x;root.rotation.y=state.facing*1.08;
    gun.position.set(.09,1.27+bob,-state.recoil*.035+.37);
    gun.rotation.x=-state.recoil*.035;
    for(const l of legs) {
      const p=phase+(l.sign<0?Math.PI:0),s=Math.sin(p);
      const ankle=v(l.sign*.09,.085+Math.max(0,Math.cos(p))*.105*stride,s*.23*stride);
      const hip=v(l.sign*.09,.88+bob,0);
      const delta=ankle.clone().sub(hip),d=Math.min(.789,delta.length()),mid=hip.clone().add(ankle).multiplyScalar(.5);
      const bend=Math.sqrt(Math.max(0,.40*.40-d*d/4));mid.z+=bend;
      poseSegment(l.thigh,hip,mid);poseSegment(l.shin,mid,ankle);
      l.boot.position.copy(ankle).add(v(0,-.08,0));l.boot.rotation.x=Math.max(0,-Math.cos(p))*.18*stride;
    }
    for(const a of arms) {
      const shoulder=v(a.sign*.205,1.34+bob,0);
      const wrist=a.sign>0?v(.09,1.225+bob,.30-state.recoil*.035):v(.055,1.265+bob,.50-state.recoil*.035);
      // Two-bone reach: pole points down and out, elbows flex while hands remain on the gun.
      const axis=wrist.clone().sub(shoulder),d=Math.min(.559,axis.length());axis.normalize();
      const pole=v(a.sign*.4,-1,0).addScaledVector(axis,-v(a.sign*.4,-1,0).dot(axis)).normalize();
      const elbow=shoulder.clone().addScaledVector(axis,d/2).addScaledVector(pole,Math.sqrt(Math.max(0,.28*.28-d*d/4)));
      poseSegment(a.upper,shoulder,elbow);poseSegment(a.lower,elbow,wrist);a.hand.position.copy(wrist);
    }
    hair.forEach((h,i)=>{h.rotation.x=-.07-stride*.12+Math.sin(state.time*3+i*.4)*.025;});
    const pos=capeGeo.attributes.position;
    for(let i=0;i<pos.count;i++) {
      const x=capeRest[i*3],y=capeRest[i*3+1],f=Math.max(0,-y);
      pos.setXYZ(i,x,y,-.03-f*.12-stride*f*.19+Math.sin(state.time*3+x*9+f*4)*f*.035);
    }
    pos.needsUpdate=true;capeGeo.computeVertexNormals();capeHem.position.z=-.15-stride*.19+Math.sin(state.time*3+4)*.035;
    flash.visible=state.flash>0;flash.scale.setScalar(.8+state.flash*5);lamp.intensity=state.flash>0?3:0;
    root.updateMatrixWorld(true);
  }
  return {root,muzzle,pose};
}
