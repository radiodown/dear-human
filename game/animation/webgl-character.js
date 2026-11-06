import { transform } from './rig-core.js';

export class WebGLCharacter {
  constructor(canvas, atlas, weaponAtlas, definition) {
    this.canvas=canvas; this.definition=definition; this.drawCalls=0; this.triangles=0;
    const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:true});
    if(!gl) throw new Error('이 브라우저에서 WebGL을 사용할 수 없습니다.');
    this.gl=gl;
    const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
    const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec2 a_position;attribute vec2 a_uv;uniform vec2 u_resolution;varying vec2 v_uv;void main(){vec2 p=a_position/u_resolution*2.0-1.0;gl_Position=vec4(p.x,-p.y,0,1);v_uv=a_uv;}'));
    gl.attachShader(program,shader(gl.FRAGMENT_SHADER,'precision mediump float;uniform sampler2D u_texture;uniform vec4 u_tint;varying vec2 v_uv;void main(){gl_FragColor=texture2D(u_texture,v_uv)*u_tint;}'));
    gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
    this.program=program;gl.useProgram(program);
    this.position=gl.getAttribLocation(program,'a_position');this.uv=gl.getAttribLocation(program,'a_uv');this.resolution=gl.getUniformLocation(program,'u_resolution');this.tint=gl.getUniformLocation(program,'u_tint');
    this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.enableVertexAttribArray(this.position);gl.enableVertexAttribArray(this.uv);gl.vertexAttribPointer(this.position,2,gl.FLOAT,false,16,0);gl.vertexAttribPointer(this.uv,2,gl.FLOAT,false,16,8);
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.uniform1i(gl.getUniformLocation(program,'u_texture'),0);
    const texture=(img)=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);return t;};
    this.textures={character:texture(atlas),weapon:texture(weaponAtlas)};
    this.white=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.white);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
    this.meshLines=[];
  }
  screen(p) {return {x:this.origin.x+p.x*this.scale*this.facing,y:this.origin.y+p.y*this.scale};}
  submit(vertices,texture,tint=[1,1,1,1],mode=this.gl.TRIANGLES) {
    const gl=this.gl;gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform4fv(this.tint,tint);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.DYNAMIC_DRAW);gl.drawArrays(mode,0,vertices.length/4);this.drawCalls++;if(mode===gl.TRIANGLES)this.triangles+=vertices.length/12;
  }
  mesh(key,x,y,w,h,options={}) {
    const item=this.definition.parts[key];if(!item)throw new Error(`Missing atlas part: ${key}`);
    const {rect,atlas='character'}=item, size=this.definition.atlases[atlas];
    const columns=options.warp?4:1, rows=options.warp?10:1, points=[];
    const a=options.angle||0, px=(options.pivot?.[0]??.5)*w, py=(options.pivot?.[1]??0)*h;
    for(let j=0;j<=rows;j++) for(let i=0;i<=columns;i++){
      const u=i/columns,v=j/rows, delta=options.warp?.(u,v)||{x:0,y:0};
      const world=transform({x:u*w-px+delta.x,y:v*h-py+delta.y},{x,y,a});const p=this.screen(world);
      points.push([p.x,p.y,(rect[0]+u*rect[2])/size.width,(rect[1]+v*rect[3])/size.height]);
    }
    const vertices=[];
    for(let j=0;j<rows;j++) for(let i=0;i<columns;i++) {
      const k=j*(columns+1)+i,ids=[k,k+1,k+columns+1,k+1,k+columns+2,k+columns+1];
      for(const id of ids) vertices.push(...points[id]);
      if(this.debugMesh&&options.warp)for(const [a,b]of[[k,k+1],[k,k+columns+1]])this.meshLines.push(points[a],points[b]);
    }
    this.submit(vertices,this.textures[atlas],options.tint||[1,1,1,1]);
  }
  line(points,color=[.4,.9,.85,.9],world=true) {
    const vertices=[];for(const q of points){const p=world?this.screen(q):{x:q[0],y:q[1]};vertices.push(p.x,p.y,0,0);}
    this.submit(vertices,this.white,color,this.gl.LINES);
  }
  marker(p,color) {this.line([{x:p.x-2,y:p.y},{x:p.x+2,y:p.y},{x:p.x,y:p.y-2},{x:p.x,y:p.y+2}],color);}
  limb(key,start,end,width,overlap=7,tint) {
    const dx=end.x-start.x,dy=end.y-start.y;
    this.mesh(key,start.x,start.y,width,Math.hypot(dx,dy)+overlap,{angle:Math.atan2(dy,dx)-Math.PI/2,pivot:[.5,.07],tint});
  }
  render(rig,{zoom=1,debug=false,mesh=false,explode=false,showCape=true,size=300}={}) {
    const gl=this.gl,box=this.canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
    const width=Math.max(1,Math.round(box.width*dpr)),height=Math.max(1,Math.round(box.height*dpr));
    if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}
    gl.viewport(0,0,width,height);gl.uniform2f(this.resolution,width,height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
    this.drawCalls=this.triangles=0;this.meshLines=[];this.debugMesh=mesh;
    this.scale=Math.min((height-70*dpr)/310,(width-40*dpr)/290)*zoom*(size/300);
    this.origin={x:width*.45,y:height-35*dpr};this.facing=rig.facing;
    const p=rig.pose(),t=p.torso;
    this.line([{x:-100,y:1},{x:150,y:1}],[.7,.75,.73,.4]);
    if(explode){
      const keys=['head','hair_back','inner_torso','chest','pelvis','upper_arm','forearm','hand','thigh','shin','boot','cape','shoulder','cape_front','helmet','hair_side'];
      this.scale=Math.min(width/270,height/330);this.origin={x:width/2,y:height/2};this.facing=1;
      keys.forEach((k,i)=>{const item=this.definition.parts[k];const aspect=item.rect[2]/item.rect[3];const h=Math.min(65,48/aspect);this.mesh(k,(i%4-1.5)*64,(Math.floor(i/4)-2)*77,aspect*h,h);});return;
    }
    const capeWarp=(u,v)=>({x:(p.cape+ (rig.walk?-4:0))*v*v,y:Math.sin(u*Math.PI)*p.cape*v*.3});
    if(showCape)this.mesh('cape',t.x-12,t.y-5,99,218,{warp:capeWarp});
    this.mesh('hair_back',t.x-4+p.head*.3,t.y-57,45,83,{warp:(u,v)=>({x:p.hair*v*v,y:0}),angle:p.head*.008});
    const far=[.72,.76,.83,1];
    const drawLeg=(leg,tint)=>{this.limb('thigh',leg.root,leg.elbow,24,10,tint);this.limb('shin',leg.elbow,leg.hand,22,6,tint);this.mesh('boot',leg.hand.x+5,leg.hand.y-8,35,24,{tint});};
    drawLeg(p.legs[0],far);drawLeg(p.legs[1]);
    this.limb('upper_arm',p.armB.root,p.armB.elbow,23,8,far);this.limb('forearm',p.armB.elbow,p.armB.hand,20,7,far);
    this.mesh('inner_torso',t.x,t.y-15,62,94,{warp:(u,v)=>({x:0,y:p.cloth*Math.sin(v*Math.PI)**2*Math.sin(u*Math.PI)})});
    // Outer armor is a rigid attachment: deliberately receives no cloth deformation.
    this.mesh('chest',t.x,t.y-15,64,94);
    this.mesh('pelvis',t.x,t.y+72,69,55);
    this.mesh('head',t.x+5+p.head*.35,t.y-16,43,58,{pivot:[.5,1],angle:p.head*.012});
    this.mesh('hair_side',t.x-6,t.y-51,17,77,{warp:(u,v)=>({x:p.hair*v*v,y:0})});
    if(showCape)this.mesh('cape_front',t.x-29,t.y-4,18,209,{warp:capeWarp});
    this.mesh('shoulder',p.armB.root.x-3,p.armB.root.y-8,27,23,{tint:far});
    const w=rig.weapon;
    if(w.id==='diagnostic'){
      const shape=[{x:-33,y:-4},{x:83,y:-4},{x:83,y:3},{x:-33,y:-4},{x:83,y:3},{x:-33,y:3}].flatMap(v=>{const s=this.screen(transform(v,p.weapon));return[s.x,s.y,0,0];});
      this.submit(shape,this.white,[.5,.75,.8,1]);
    }else this.mesh('rifle',p.weapon.x,p.weapon.y,w.width,w.height,{pivot:[w.pivot.x,w.pivot.y],angle:p.weapon.a});
    if(p.magazineVisible&&w.id==='m16_basic')this.mesh('magazine',p.sockets.mag.x,p.sockets.mag.y+p.magOffset,12,27,{angle:p.weapon.a});
    this.mesh('hand',p.armB.hand.x,p.armB.hand.y,17,13,{pivot:[.6,.5],angle:p.weapon.a});
    this.limb('upper_arm',p.armA.root,p.armA.elbow,24,8);this.limb('forearm',p.armA.elbow,p.armA.hand,20,7);
    this.mesh('shoulder',p.armA.root.x-3,p.armA.root.y-9,28,24);
    this.mesh('hand',p.armA.hand.x,p.armA.hand.y,17,13,{pivot:[.6,.5],angle:p.weapon.a});
    if(rig.flash>0){
      const m=p.sockets.muzzle;
      const verts=[{x:0,y:-3},{x:19,y:0},{x:0,y:3}].flatMap(v=>{const s=this.screen(transform(v,{...m,a:p.weapon.a}));return[s.x,s.y,0,0];});this.submit(verts,this.white,[1,.79,.31,.95]);
      this.line([m,transform({x:95,y:0},{...m,a:p.weapon.a})],[1,.86,.53,.42]);
    }
    if(mesh&&this.meshLines.length)this.line(this.meshLines,[.45,.76,1,.4],false);
    if(debug){
      for(const arm of[p.armA,p.armB,...p.legs]){this.line([arm.root,arm.elbow,arm.elbow,arm.hand]);this.marker(arm.target,[1,.47,.28,1]);}
      for(const [name,s]of Object.entries(p.sockets))this.marker(s,name==='muzzle'?[1,.85,.3,1]:[.4,1,.6,1]);
    }
    this.lastPose=p;
  }
  dispose(){const gl=this.gl;for(const t of Object.values(this.textures))gl.deleteTexture(t);gl.deleteTexture(this.white);gl.deleteBuffer(this.buffer);gl.deleteProgram(this.program);}
}
