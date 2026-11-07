import { transform } from './rig-core.js';
import { partDimensions, LEG_SHAPE } from './proportions.js';
import { capeOffset, groundedCapeSurface } from './cape.js';
import { sleeveOffset } from './secondary-motion.js';
import { outfitPoint, skirtPanelPoint, thighRootOffset, torsoPoint, bustPoint, waistStrain } from './waist.js';
import { KNEEL_ART, kneelingKneeAngle } from './kneeling-pose.js';
import { MUZZLE_LIGHT, muzzleLightState, lightSurface, CHARACTER_VERTEX_SHADER, CHARACTER_FRAGMENT_SHADER } from './muzzle-light.js';
import { SIDE_CAMERA, sideCamera, sideDepthPose } from './side-camera.js';

export class WebGLCharacter {
  constructor(canvas, images, definition) {
    this.canvas=canvas; this.definition=definition; this.drawCalls=0; this.triangles=0;
    const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:true});
    if(!gl) throw new Error('이 브라우저에서 WebGL을 사용할 수 없습니다.');
    this.gl=gl;
    const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
    const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,CHARACTER_VERTEX_SHADER));
    gl.attachShader(program,shader(gl.FRAGMENT_SHADER,CHARACTER_FRAGMENT_SHADER));
    gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
    this.program=program;gl.useProgram(program);
    this.position=gl.getAttribLocation(program,'a_position');this.uv=gl.getAttribLocation(program,'a_uv');this.resolution=gl.getUniformLocation(program,'u_resolution');this.tint=gl.getUniformLocation(program,'u_tint');
    this.lightUniforms=Object.fromEntries(['lightPosition','lightColor','light','material','normal','normalRotation','cameraPitch','effect'].map(key=>[key,gl.getUniformLocation(program,'u_'+key)]));
    this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.enableVertexAttribArray(this.position);gl.enableVertexAttribArray(this.uv);gl.vertexAttribPointer(this.position,2,gl.FLOAT,false,16,0);gl.vertexAttribPointer(this.uv,2,gl.FLOAT,false,16,8);
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.uniform1i(gl.getUniformLocation(program,'u_texture'),0);
    const texture=(img)=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);return t;};
    this.textures=Object.fromEntries(Object.entries(images).map(([key,img])=>[key,texture(img)]));
    this.white=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.white);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
    this.meshLines=[];
  }
  screen(p) {const view=this.camera.project(p);return {x:this.origin.x+view.x*this.scale*this.facing,y:this.origin.y+view.y*this.scale};}
  submit(vertices,texture,tint=[1,1,1,1],mode=this.gl.TRIANGLES,surface=null,effect=0) {
    const gl=this.gl,u=this.lightUniforms;
    gl.uniform4fv(u.material,surface?.material??[0,0,1,0]);
    gl.uniform4fv(u.normal,surface?.normal??[0,0,0,0]);
    gl.uniform3fv(u.normalRotation,surface?.rotation??[1,0,this.facing??1]);
    gl.uniform1f(u.effect,effect);
    gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform4fv(this.tint,tint);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.DYNAMIC_DRAW);gl.drawArrays(mode,0,vertices.length/4);this.drawCalls++;if(mode===gl.TRIANGLES)this.triangles+=vertices.length/12;
  }
  mesh(key,x,y,w,h,options={}) {
    const item=this.definition.parts[key];if(!item)throw new Error(`Missing atlas part: ${key}`);
    const {rect,atlas='character'}=item, size=this.definition.atlases[atlas];
    const mapped=options.warp||options.project||typeof options.depth==='function', geometry=item.uv_mesh;
    const columns=mapped?(options.columns??4):1, rows=mapped?(options.rows??10):1, points=[];
    const [v0,v1]=item.source_band??[0,1], region=options.sourceRegion??[0,0,1,1];
    const a=options.angle||0, px=(options.pivot?.[0]??.5)*w, py=(options.pivot?.[1]??0)*h;
    const point=(u,v,weight=0)=>{
      const delta=options.warp?.(u,v)||{x:0,y:0};
      const world=options.project?options.project(u,v,weight):transform({x:(u-region[0])/(region[2]-region[0])*w-px+delta.x,y:(v-region[1])/(region[3]-region[1])*h-py+delta.y},{x,y,a});
      const depth=typeof options.depth==='function'?options.depth(world,u,v):options.depth??world.z??0;
      const p=this.screen({...world,z:depth});
      return [p.x,p.y,(rect[0]+u*rect[2])/size.width,(rect[1]+v*rect[3])/size.height];
    };
    const vertices=[],indices=[];
    if(geometry){
      geometry.vertices.forEach(([u,v],i)=>points.push(point(u,v,geometry.bust_weights?.[i]??0)));
      indices.push(...geometry.indices);
    }else{
      for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++)points.push(point(i/columns,v0+(v1-v0)*j/rows));
      for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){
        const k=j*(columns+1)+i;indices.push(k,k+1,k+columns+1,k+1,k+columns+2,k+columns+1);
      }
    }
    for(let i=0;i<indices.length;i+=3){
      const ids=indices.slice(i,i+3);
      for(const id of ids)vertices.push(...points[id]);
      if(this.debugMesh&&(mapped||geometry))for(const [a,b]of[[ids[0],ids[1]],[ids[1],ids[2]],[ids[2],ids[0]]])this.meshLines.push(points[a],points[b]);
    }
    const surface=lightSurface(key,item),[cu,cv,su,sv]=surface.normal,angle=options.normalAngle??a;
    surface.normal=[(rect[0]+cu*rect[2])/size.width,(rect[1]+cv*rect[3])/size.height,su*size.width/rect[2],sv*size.height/rect[3]];
    surface.rotation=[Math.cos(angle),Math.sin(angle),this.facing];
    this.submit(vertices,this.textures[atlas],options.tint||[1,1,1,1],this.gl.TRIANGLES,surface);
  }
  muzzleFlash(p,state){
    if(!state.envelope)return;
    const quad=(x0,y0,x1,y1,effect,tint)=>{
      const points=[[x0,y0,0,0],[x1,y0,1,0],[x0,y1,0,1],[x1,y1,1,1]].map(([x,y,u,v])=>{
        const s=this.screen({...transform({x,y},{...state.position,a:p.weapon.a}),z:state.position.z});return [s.x,s.y,u,v];
      });
      const vertices=[0,1,2,1,3,2].flatMap(i=>points[i]);
      this.submit(vertices,this.white,tint,this.gl.TRIANGLES,null,effect);
    };
    const r=MUZZLE_LIGHT.haloRadius;
    quad(-r,-r,r,r,2,[1,.43,.10,.25*state.envelope]);
    const half=MUZZLE_LIGHT.jetHalfHeight,length=MUZZLE_LIGHT.jetLength*state.variation;
    quad(-3,-half,length,half,1,[1,.60,.16,state.envelope]);
  }
  line(points,color=[.4,.9,.85,.9],world=true) {
    const vertices=[];for(const q of points){const p=world?this.screen(q):{x:q[0],y:q[1]};vertices.push(p.x,p.y,0,0);}
    this.submit(vertices,this.white,color,this.gl.LINES);
  }
  marker(p,color) {this.line([{...p,x:p.x-2},{...p,x:p.x+2},{...p,y:p.y-2},{...p,y:p.y+2}],color);}
  sprite(key,x,y,height,options={}) {
    const {widthScale=1,...settings}=options;
    const {width}=partDimensions(this.definition.parts[key].rect,height);
    this.mesh(key,x,y,width*widthScale,height,settings);
  }
  limb(key,start,end,tint,jointBend=null,upper=false,hipPose=null) {
    const dx=end.x-start.x,dy=end.y-start.y;
    const part=this.definition.parts[key],rect=part.rect;
    const [a,b]=part.joints??[0,1],joints=part.joint_points??[[.5,a],[.5,b]];
    const sx=(joints[1][0]-joints[0][0])*rect[2],sy=(joints[1][1]-joints[0][1])*rect[3];
    const height=Math.hypot(dx,dy)*rect[3]/Math.hypot(sx,sy);
    const widthScale=key.endsWith('_thigh')?LEG_SHAPE.thighWidth:1;
    const width=partDimensions(this.definition.parts[key].rect,height).width*widthScale;
    const angle=Math.atan2(dy,dx)-Math.atan2(sy,sx);
    const warp=hipPose?(u,v)=>thighRootOffset(hipPose,width,height,joints[0],angle,u,v)
      :jointBend===null||part.joint_points?undefined:(u,v)=>sleeveOffset(width,height,[a,b],jointBend,upper,u,v);
    const depth=p=>{const t=Math.max(0,Math.min(1,((p.x-start.x)*dx+(p.y-start.y)*dy)/(dx*dx+dy*dy||1)));
      return (start.z??0)+((end.z??0)-(start.z??0))*t;};
    this.sprite(key,start.x,start.y,height,{angle,pivot:joints[0],tint,warp,depth,rows:18,widthScale});
  }
  armSegment(prefix,arm,upper,key=null){
    const a=Math.atan2(arm.elbow.y-arm.root.y,arm.elbow.x-arm.root.x),b=Math.atan2(arm.hand.y-arm.elbow.y,arm.hand.x-arm.elbow.x);
    const difference=upper?b-a:a-b,bend=Math.atan2(Math.sin(difference),Math.cos(difference));
    this.limb(key??prefix+(upper?'_upper_arm':'_forearm'),upper?arm.root:arm.elbow,upper?arm.elbow:arm.hand,undefined,bend,upper);
  }
  legSegments(prefix,leg,amount,pose){
    this.limb(prefix+'_thigh',leg.root,leg.elbow,undefined,null,false,pose);
    if(amount<=.001){this.limb(prefix+'_shin',leg.elbow,leg.hand);return null;}
    const thigh=this.definition.parts[prefix+'_thigh'],fold=this.definition.parts[prefix+'_knee_fold'];
    const [j0,j1]=thigh.joints;
    const clothHeight=Math.hypot(leg.elbow.x-leg.root.x,leg.elbow.y-leg.root.y)*fold.rect[3]/((j1-j0)*thigh.rect[3]);
    const upper=Math.atan2(leg.elbow.y-leg.root.y,leg.elbow.x-leg.root.x),lower=Math.atan2(leg.hand.y-leg.elbow.y,leg.hand.x-leg.elbow.x);
    const bend=Math.atan2(Math.sin(lower-upper),Math.cos(lower-upper));
    this.sprite(prefix+'_knee_fold',leg.elbow.x,leg.elbow.y,clothHeight,{
      pivot:[.5,.72],angle:upper+bend/2-Math.PI/2,depth:leg.elbow.z,tint:[1,1,1,amount],widthScale:LEG_SHAPE.thighWidth
    });
    this.limb(prefix+'_shin_shaft',leg.elbow,leg.hand);
    const shin=this.definition.parts[prefix+'_shin'],height=Math.hypot(leg.hand.x-leg.elbow.x,leg.hand.y-leg.elbow.y)/(shin.joints[1]-shin.joints[0]);
    return ()=>this.sprite(prefix+'_knee_cap',leg.elbow.x,leg.elbow.y,height,{
      pivot:[.5,KNEEL_ART.kneePivot],angle:kneelingKneeAngle(leg,amount),depth:leg.elbow.z
    });
  }
  render(rig,{zoom=1,debug=false,mesh=false,explode=false,showCape=true,size=300,muzzleLight=true,lightStrength=1,cameraPitch=SIDE_CAMERA.defaultPitch}={}) {
    const gl=this.gl,box=this.canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
    const width=Math.max(1,Math.round(box.width*dpr)),height=Math.max(1,Math.round(box.height*dpr));
    if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}
    gl.viewport(0,0,width,height);gl.uniform2f(this.resolution,width,height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
    this.drawCalls=this.triangles=0;this.meshLines=[];this.debugMesh=mesh;
    this.scale=Math.min((height-70*dpr)/310,(width-40*dpr)/290)*zoom*(size/300);
    this.origin={x:width*(rig.facing===1?.45:.55),y:height-35*dpr};this.facing=rig.facing;
    this.camera=sideCamera(explode?0:cameraPitch);
    const p=sideDepthPose(rig.pose()),u=this.lightUniforms;
    gl.uniform2f(u.cameraPitch,this.camera.cosine,this.camera.sine);
    this.flashLight=muzzleLightState(rig,p,{enabled:muzzleLight&&!explode,strength:lightStrength});
    const source=this.screen(this.flashLight.position);
    gl.uniform2f(u.lightPosition,source.x,source.y);gl.uniform3fv(u.lightColor,MUZZLE_LIGHT.color);
    gl.uniform4f(u.light,MUZZLE_LIGHT.radius,MUZZLE_LIGHT.depth,this.flashLight.power,1/this.scale);
    if(!explode)this.ground(rig,p);
    this.renderSideLayers(rig,p,{debug,mesh,explode,showCape});
  }
  ground(rig,p){
    if(this.camera.pitch===0){
      this.line([{x:-100,y:1},{x:150,y:1}],[.7,.75,.73,.4]);
      const marks=[];for(let x=-120;x<200;x+=24){const at=x-(rig.distance%24);marks.push({x:at,y:3},{x:at+5,y:3});}
      this.line(marks,[.55,.63,.65,.3]);return;
    }
    const corners=[[-120,-48],[180,-48],[-120,48],[180,48]].map(([x,z])=>this.screen({x,y:1,z}));
    this.submit([0,1,2,1,3,2].flatMap(i=>[corners[i].x,corners[i].y,0,0]),this.white,[.65,.73,.75,.035]);
    const grid=[];
    for(let z=-48;z<=48;z+=24)grid.push({x:-120,y:1,z},{x:180,y:1,z});
    for(let x=-120;x<180;x+=24){const at=x-(rig.distance%24);grid.push({x:at,y:1,z:-48},{x:at,y:1,z:48});}
    this.line(grid,[.55,.63,.65,.18]);
    for(const leg of p.legs){
      // A ground cue only; these ellipses are not cast shadows from a 3D model.
      const opacity=.16*Math.max(0,1-Math.max(0,-Math.max(leg.foot.heel.y,leg.foot.toe.y))/30),vertices=[];
      const center=this.screen({x:leg.foot.x,y:.6,z:leg.foot.z});
      for(let i=0;i<20;i++){
        vertices.push(center.x,center.y,0,0);
        for(const a of [i/20*Math.PI*2,(i+1)/20*Math.PI*2]){
          const s=this.screen({x:leg.foot.x+Math.cos(a)*12,y:.6,z:leg.foot.z+Math.sin(a)*5});vertices.push(s.x,s.y,0,0);
        }
      }
      this.submit(vertices,this.white,[.03,.05,.06,opacity]);
    }
  }
  renderSideLayers(rig,p,{debug,mesh,explode,showCape}){
    const definition=this.definition,b=definition.bindings,t=p.torso;
    if(explode){
      const keys=Object.keys(definition.parts).filter(k=>definition.parts[k].atlas!=='weapon'&&!definition.parts[k].preview_hidden);
      this.scale=Math.min(this.canvas.width/270,this.canvas.height/330);this.origin={x:this.canvas.width/2,y:this.canvas.height/2};this.facing=1;
      keys.forEach((key,i)=>{
        const item=definition.parts[key],[v0,v1]=item.source_band??[0,1],region=item.preview_bounds??[0,v0,1,v1];
        const aspect=item.rect[2]*(region[2]-region[0])/(item.rect[3]*(region[3]-region[1])),h=Math.min(65,48/aspect);
        this.mesh(key,(i%4-1.5)*64,(Math.floor(i/4)-2)*77,aspect*h,h,{sourceRegion:region});
      });return;
    }
    const body=(key,extra={})=>{
      const {offset={x:0,y:0},frame,...options}=extra,s=b[key],at=frame??transform({x:s.x+offset.x,y:s.y+offset.y},t);
      const softDepth=key==='cape'?SIDE_CAMERA.cape:key==='hair_back'?SIDE_CAMERA.hair:0;
      const rootDepth=key==='head'||key==='hair_back'?(p.headDepth??0):SIDE_CAMERA.body;
      const depth=softDepth?(_p,_u,v)=>{
        const pinned=key==='cape'?.2:.625,q=Math.max(0,Math.min(1,(v-pinned)/(1-pinned)));
        return rootDepth+(softDepth-rootDepth)*q*q*(3-2*q);
      }:rootDepth;
      this.sprite(key,at.x,at.y,s.height,{pivot:s.pivot,depth,...options,angle:(frame?frame.a:t.a*(s.rotationMix??1)+(s.angle||0))+(options.angle||0)});
    };
    if(showCape){
      if(p.kneeSupport.amount>.001){
        const dimensions=partDimensions(definition.parts.cape.rect,b.cape.height);
        this.mesh('cape',0,0,dimensions.width,dimensions.height,{
          project:groundedCapeSurface(p,b.cape,dimensions.width),rows:40,columns:12,normalAngle:0
        });
      }else body('cape',{warp:(u,v)=>capeOffset(p.capePoints,b.cape.height,u,v)});
    }
    // Head, eye and scalp share the solved frame. Retain the source artwork's
    // head-only registration angle when attaching the separate back hair.
    const hairAngle=p.headFrame.a-(b.head.angle||0),hairRoot=transform(
      {x:b.hair_back.x-b.head.x,y:b.hair_back.y-b.head.y},{...p.headFrame,a:hairAngle});
    body('hair_back',{frame:{...hairRoot,a:hairAngle+(b.hair_back.angle||0)},
      warp:(u,v)=>capeOffset(p.hairPoints,b.hair_back.height,u,v),rows:16});
    for(const [index,prefix]of [[0,'far'],[1,'near']]){
      const leg=p.legs[index];
      const knee=this.legSegments(prefix,leg,p.kneeSupport.amount,p);
      const boot=b[prefix+'_boot'];
      this.sprite(prefix+'_boot',leg.foot.x,leg.foot.y,boot.height,{pivot:boot.pivot,angle:leg.foot.a,depth:leg.foot.z});
      knee?.();
    }
    this.armSegment('far',p.armB,true);
    const supportHand=()=>{const key=p.supportHandKey,s=b[key];this.sprite(key,p.armB.hand.x,p.armB.hand.y,s.height,{pivot:s.pivot,angle:p.handAngleB,depth:p.armB.hand.z});};
    const magazine=()=>{if(p.magazineVisible&&rig.weapon.id==='m16_basic')this.sprite('magazine',p.magazine.x,p.magazine.y,25,{angle:p.magazine.a,depth:p.magazine.z});};
    const carriedBehind=p.supportArmBehind&&p.reloadContact?.carrying;
    if(p.supportArmBehind){
      this.armSegment('far',p.armB,false,p.supportForearmKey);
      if(carriedBehind)magazine();
      supportHand();
    }
    // Four independent attachments reuse the source. The torso mesh has a hole
    // for the rigid breastplate, so its old image cannot remain underneath it.
    body('head',{frame:p.headFrame});
    const bodySize=partDimensions(definition.parts.body_core.rect,b.body_core.height);
    const {width,height}=bodySize;
    for(const key of ['waist_cloth','skirt_core','skirt_rear_panel','skirt_front_panel','torso_shell','bust_armor'])this.mesh(key,0,0,width,height,{
      project:(u,v,weight)=>key==='bust_armor'?bustPoint(p,width,height,u,v):key==='torso_shell'?torsoPoint(p,width,height,u,v,weight):key.startsWith('skirt_')&&key.endsWith('_panel')?skirtPanelPoint(p,width,height,u,v,key==='skirt_front_panel'):outfitPoint(p,width,height,u,v),
      normalAngle:key==='bust_armor'?p.bust.a:key==='torso_shell'?p.chest.a:key==='waist_cloth'?(p.waist.a+p.pelvis.a)/2:p.pelvis.a,
      rows:key==='waist_cloth'?12:key==='skirt_core'?12:1,columns:key==='waist_cloth'?12:4
    });
    this.waistStrain=waistStrain(p,bodySize.width,bodySize.height);
    // The support forearm crosses in front of the torso to reach the rifle.
    if(!p.supportArmBehind)this.armSegment('far',p.armB,false,p.supportForearmKey);
    const w=rig.weapon;
    if(w.id==='diagnostic'){
      const verts=[{x:-33,y:-4},{x:83,y:-4},{x:83,y:3},{x:-33,y:-4},{x:83,y:3},{x:-33,y:3}].flatMap(v=>{const s=this.screen({...transform(v,p.weapon),z:p.weapon.z});return[s.x,s.y,0,0];});this.submit(verts,this.white,[.5,.75,.8,1]);
    }else this.mesh('rifle',p.weapon.x,p.weapon.y,w.width,w.height,{pivot:[w.pivot.x,w.pivot.y],angle:p.weapon.a,depth:p.weapon.z});
    if(!carriedBehind)magazine();
    if(!p.supportArmBehind)supportHand();
    this.armSegment('near',p.armA,true);
    this.armSegment('near',p.armA,false);
    this.sprite('primary_hand',p.armA.hand.x,p.armA.hand.y,b.primary_hand.height,{pivot:b.primary_hand.pivot,angle:p.handAngleA,depth:p.armA.hand.z});
    this.muzzleFlash(p,this.flashLight);
    if(mesh&&this.meshLines.length)this.line(this.meshLines,[.45,.76,1,.4],false);
    if(debug){
      for(const arm of[p.armA,p.armB,...p.legs]){this.line([arm.root,arm.elbow,arm.elbow,arm.hand]);this.marker(arm.target,[1,.47,.28,1]);}
      for(const point of Object.values(p.sockets))this.marker(point,[.4,1,.6,1]);
      for(const leg of p.legs)this.line([leg.foot.heel,leg.foot.toe],[.4,1,.55,1]);
      if(p.kneeSupport.amount>.01){
        this.marker(p.kneeSupport.target,[1,.8,.35,1]);
        this.line([p.kneeSupport.target,{...p.kneeSupport.target,y:0}],[1,.8,.35,.7]);
      }
      this.marker(p.waist,[1,.55,.8,1]);
      this.marker(p.chest,[1,.7,.4,1]);this.marker(p.girdle,[.6,1,.85,1]);
      this.line([p.pelvis,p.waist,p.waist,p.chest,p.chest,p.torso,p.girdle,p.armA.root,p.girdle,p.armB.root],[1,.55,.8,.75]);
      for(const arm of [p.armA,p.armB])if(arm.referenceElbow)this.marker(arm.referenceElbow,[.7,.7,1,.8]);
      this.marker(p.bust,[.85,.8,1,1]);
      if(p.sightLine){this.line([p.eye,p.sightLine.rear,p.sightLine.rear,p.sightLine.front],[1,.8,.35,.9]);this.marker(p.eye,[1,.9,.4,1]);}
    }
    this.lastPose=p;
  }
  dispose(){const gl=this.gl;for(const t of Object.values(this.textures))gl.deleteTexture(t);gl.deleteTexture(this.white);gl.deleteBuffer(this.buffer);gl.deleteProgram(this.program);}
}
