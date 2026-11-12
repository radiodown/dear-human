import * as T from '../vendor/three-0.187.0/build/three.module.js';
import {V,mesh,group,box,loft,tube} from './geometry.js';
import {sweep} from './human-surface.js';
import {ease,RELOAD} from './reload.js';

// Palm frame retains the existing rifle's hand socket; fingers are actual bone chains.
export function buildHumanHand(root,sign,m){
  const hand=group(root),fingers=[],fabric=m.leather.clone();fabric.metalness=0;fabric.roughness=.84;
  const palm=loft([[-.025,.017,.017],[-.016,.025,.019],[.006,.028,.020],[.026,.026,.017],[.034,.022,.012]],24,20,(x,y,z)=>[x,y*.9,z]);
  palm.rotateX(Math.PI/2);mesh(hand,palm,fabric);
  // Wrist cuff, dorsal pads and saddle stitching are tied to the palm frame.
  const cuff=loft([[-.046,.021,.018],[-.043,.025,.021],[-.033,.025,.021],[-.029,.022,.018]],24,8);cuff.rotateX(Math.PI/2);mesh(hand,cuff,m.cloth);
  for(let i=0;i<3;i++)box(hand,.013,.005,.023,m.armor,(i-1)*.017,.020,-.003,.002);
  tube(hand,[[-.023,.018,-.023],[-.024,.020,.005],[-.016,.018,.024]],.0008,m.edge,16);
  tube(hand,[[.023,.018,-.023],[.024,.020,.005],[.016,.018,.024]],.0008,m.edge,16);
  function digit(x,z,lengths,radii,thumb=false){
    const anchor=group(hand,x,thumb?-.004:0,z),bones=[];
    if(thumb)anchor.rotation.y=sign*-.8;
    for(let j=0;j<3;j++){const b=new T.Bone();b.name=(thumb?'thumb':'finger')+'_'+fingers.length+'_'+j;if(j){b.position.z=lengths[j-1];bones[j-1].add(b);}else anchor.add(b);bones.push(b);}
    const total=lengths.reduce((a,b)=>a+b,0),g=sweep([[0,0,0],[0,0,total*.5],[0,0,total]],[radii,radii*.98,radii*.83,.0004],10,24,.85);
    const ids=[],weights=[];
    for(let i=0;i<g.attributes.position.count;i++){
      const z=g.attributes.position.getZ(i),j=z<lengths[0]+.006?0:1;
      const joint=j===0?lengths[0]:lengths[0]+lengths[1],next=j+1,w=ease((z-joint+.006)/.012);
      ids.push(j,next,0,0);weights.push(1-w,w,0,0);
    }
    g.setAttribute('skinIndex',new T.Uint16BufferAttribute(ids,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
    const skin=new T.SkinnedMesh(g,fabric);skin.castShadow=true;skin.receiveShadow=true;skin.frustumCulled=false;anchor.add(skin);
    // Bind in anchor-local coordinates before the hand is posed.
    root.updateMatrixWorld(true);skin.bind(new T.Skeleton(bones));
    for(let j=0;j<2;j++)box(bones[j],radii*1.5,.003,lengths[j]*.50,m.armor,0,radii*.85,lengths[j]*.45,.001);
    const data={anchor,bones,thumb};fingers.push(data);return data;
  }
  for(let i=0;i<4;i++)digit((i-1.5)*.013,.020-[.002,0,.002,.008][i],[.027,.019,.015].map(v=>v*[.94,1,.95,.77][i]),.0063-(i===3?.0007:0));
  digit(sign*.023,-.009,[.024,.019,.014],.008,true);
  const presets={
    grip:[.78,1.25,1.03],support:[.58,1.08,.92],magazine:[.42,.92,.78],bolt:[.30,.72,.70],open:[.12,.23,.18],
  };
  function pose(state){
    let a=sign>0?'grip':'support',b=a,t=0;
    if(sign<0&&state.reload){
      const time=state.reload.elapsed;
      if(time<RELOAD.grab){b='magazine';t=ease((time-.12)/(RELOAD.grab-.12));}
      else if(time<1.72)a=b='magazine';
      else if(state.reload.empty&&time<2.40){a='magazine';b='bolt';t=ease((time-1.72)/.25);}
      else {a=state.reload.empty?'bolt':'magazine';b='support';t=ease((time-(state.reload.empty?2.40:1.72))/.32);}
      if(time>=RELOAD.stow&&time<RELOAD.fresh){a='magazine';b='open';t=Math.sin(Math.PI*(time-RELOAD.stow)/(RELOAD.fresh-RELOAD.stow));}
    }
    const ages=state.time-state.lastShot,trigger=state.firing||ages<.075?1:1-ease((ages-.075)/.11);
    for(let i=0;i<fingers.length;i++){
      const f=fingers[i];for(let j=0;j<3;j++){
        let angle=T.MathUtils.lerp(presets[a][j],presets[b][j],t);
        if(f.thumb)angle*=.63;
        else if(sign>0&&i===0)angle=[.12+trigger*.25,.20+trigger*.62,.20+trigger*.35][j];
        f.bones[j].rotation.x=angle;
      }
      if(!f.thumb)f.bones[0].rotation.y=(i-1.5)*.045;
    }
  }
  return {hand,pose,indexFinger:null};
}
