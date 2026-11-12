import * as T from '../vendor/three-0.187.0/build/three.module.js';
import {V,mesh,group,oval,tube,loft} from './geometry.js';
import {sweep} from './human-surface.js';
const gauss=(x,c,s)=>Math.exp(-(((x-c)/s)**2));

function lipGeometry(upper){
  const ps=[],uv=[],ix=[],nx=32,ny=6;
  for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
    const u=i/nx*2-1,t=j/ny,envelope=Math.pow(Math.max(0,1-u*u),.7);
    const seam=-.067+.0014*Math.cos(u*Math.PI),cupid=.002+ .0028*gauss(Math.abs(u),.34,.20);
    const y=seam+(upper?1:-1)*t*envelope*(upper?cupid:.005),z=.077+envelope*(.004+.003*Math.sin(Math.PI*t));
    ps.push(u*.022,y,z);uv.push(i/nx,t);
    if(j<ny&&i<nx){const k=j*(nx+1)+i;if(upper)ix.push(k,k+1,k+nx+1,k+1,k+nx+2,k+nx+1);else ix.push(k,k+nx+1,k+1,k+1,k+nx+1,k+nx+2);}
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(ps,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;
}

export function buildHumanHead(torso,m){
  const head=group(torso,0,.563,.004);head.name='head';head.scale.setScalar(.79);
  const skin=m.skin.clone();skin.vertexColors=true;skin.roughness=.75;skin.normalScale.set(.10,.10);
  const face=loft([[-.135,.008,.022],[-.126,.031,.036],[-.109,.051,.052],[-.080,.070,.064],[-.043,.085,.074],[.008,.092,.078],[.055,.091,.079],[.098,.082,.071],[.135,.055,.048],[.153,.003,.003]],64,64,(x,y,z,a)=>{
    const f=Math.pow(Math.max(0,Math.cos(a)),4);
    const bridge=.024*gauss(x,0,.012)*gauss(y,-.018,.037),tip=.013*gauss(x,0,.013)*gauss(y,-.043,.012);
    const alar=.006*(gauss(x,-.012,.007)+gauss(x,.012,.007))*gauss(y,-.047,.008);
    const socket=-.006*(gauss(x,-.036,.025)+gauss(x,.036,.025))*gauss(y,.005,.016);
    const cheek=.008*(gauss(x,-.052,.022)+gauss(x,.052,.022))*gauss(y,-.031,.020);
    const chin=.004*gauss(x,0,.028)*gauss(y,-.106,.017),mouth=.005*gauss(x,0,.028)*gauss(y,-.067,.012);
    return[x,y,z+f*(bridge+tip+alar+socket+cheek+chin+mouth)];
  });
  const color=[],p=face.attributes.position,base=new T.Color('#ead0bb'),blush=new T.Color('#ce8c80');
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),amount=.28*gauss(Math.abs(x),.055,.026)*gauss(y,-.033,.022)*Math.max(0,z/.09);
    const c=base.clone().lerp(blush,amount);color.push(c.r,c.g,c.b);
  }
  face.setAttribute('color',new T.Float32BufferAttribute(color,3));skin.color.set('#ffffff');mesh(head,face,skin);
  const rim=m.skin.clone();rim.color.set('#d6a995');const crease=m.lip.clone();crease.color.set('#714943');
  const white=new T.MeshPhysicalMaterial({color:'#ddd5c5',roughness:.26,clearcoat:.45});
  const iris=new T.MeshPhysicalMaterial({color:'#594d36',roughness:.23,clearcoat:.65});
  for(const s of [-1,1]){
    // An almond-shaped corneal patch, bounded by upper/lower lid margins.
    const eye=group(head,s*.035,.006,.076),ps=[],uv=[],ix=[],nx=24,ny=10;
    for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
      const u=i/nx*2-1,v=j/ny*2-1,h=Math.sqrt(Math.max(0,1-u*u));
      ps.push(u*.025,v*h*(v>0?.008:.005)+u*s*.002,.004*(1-u*u)*(1-v*v)-Math.abs(u)*.003);uv.push(i/nx,j/ny);
      if(j<ny&&i<nx){const k=j*(nx+1)+i;ix.push(k,k+1,k+nx+1,k+1,k+nx+2,k+nx+1);}
    }
    const eg=new T.BufferGeometry();eg.setAttribute('position',new T.Float32BufferAttribute(ps,3));eg.setAttribute('uv',new T.Float32BufferAttribute(uv,2));eg.setIndex(ix);eg.computeVertexNormals();mesh(eye,eg,white);
    oval(eye,.007,.0075,.0018,iris,0,.0006,.004);oval(eye,.003,.004,.001,m.pupil,0,.0007,.0058);
    // Physical clearcoat supplies highlights rather than fixed white dots.
    for(const upper of [false,true]){
      const pts=[];for(let i=0;i<=16;i++){const u=i/8-1,h=Math.sqrt(Math.max(0,1-u*u));pts.push([u*.025,(upper?.008:-.005)*h+u*s*.002,.001-Math.abs(u)*.003]);}
      mesh(eye,sweep(pts,[.0006,.0018,.0018,.0006],8,24,.8),upper?rim:m.skin);
      if(upper){const lash=pts.map(([x,y,z])=>[x,y+.0005,z+.001]);mesh(eye,sweep(lash,[.0001,.00065,.0008,.0001],6,24),m.hair);}
    }
    tube(head,[[s*.013,.022,.075],[s*.035,.026,.080],[s*.057,.019,.067]],.0007,rim,20);
    mesh(head,sweep([[s*.014,.033,.076],[s*.035,.037,.078],[s*.060,.027,.066]],[.001,.0026,.0002],8,22,.5),m.hair);
    const ear=group(head,s*.091,-.025,-.011);oval(ear,.014,.027,.011,m.skin);
    oval(ear,.008,.017,.003,rim,s*.004,0,.010);
    mesh(ear,sweep([[s*.003,-.018,.010],[s*.010,-.010,.011],[s*.012,.013,.008],[s*.003,.024,.004],[-s*.005,.016,.003]],[.0017,.0026,.0021,.001],8,24),m.skin);
    oval(ear,.004,.009,.003,m.skin,-s*.005,-.004,.012);oval(ear,.003,.005,.003,m.gold,0,-.028,.003);
    oval(head,.004,.0014,.0017,crease,s*.009,-.050,.087);
  }
  mesh(head,lipGeometry(true),m.lip);mesh(head,lipGeometry(false),m.lip);
  mesh(head,sweep([[-.020,-.067,.078],[0,-.066,.082],[.020,-.067,.078]],[.0002,.0006,.0002],6,24),crease);
  tube(head,[[-.003,-.055,.080],[-.002,-.061,.081]],.0006,rim,8);
  tube(head,[[.003,-.055,.080],[.002,-.061,.081]],.0006,rim,8);

  const hair=[],hairMat=m.hair.clone();hairMat.metalness=0;hairMat.roughness=.42;hairMat.normalScale.set(.45,.10);
  mesh(head,loft([[.035,.098,.087],[.090,.093,.085],[.132,.069,.062],[.153,.036,.035],[.165,.0001,.0001]],48,32),hairMat);
  const lock=(parent,pts,width)=>mesh(parent,sweep(pts,[width*.55,width,width*.86,width*.5,.0006],10,30,.23),hairMat);
  for(let i=0;i<23;i++){
    const a=(i/22-.5)*3.7,x=Math.sin(a)*.09,z=-.012-Math.cos(a)*.075,g=group(head,x,.067,z);
    lock(g,[[0,.04,0],[x*.08,-.055,-.006],[x*.2,-.29,-.024],[x*.4,-.50-(i%4)*.008,-.019]],.014+(i%3)*.002);
    hair.push(g);
  }
  for(let i=0;i<11;i++){
    const x=(i-5)*.016;lock(head,[[x*.55,.148,.027],[x*.85,.100,.085],[x,.055,.083],[x+(i%2?.005:-.004),.025+Math.abs(x)*.17,.082]],.009);
  }
  for(const s of [-1,1])lock(head,[[s*.078,.108,.032],[s*.094,.015,.032],[s*.091,-.130,.019],[s*.107,-.260,-.008]],.015);
  return {head,hair};
}
