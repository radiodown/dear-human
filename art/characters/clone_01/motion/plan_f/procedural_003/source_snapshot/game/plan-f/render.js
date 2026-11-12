import * as T from '../vendor/three-0.187.0/build/three.module.js';
const vertex='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
export class FilmRenderer{
  constructor(renderer){
    this.r=renderer;this.enabled=true;this.ao=true;this.bloom=true;
    const hdr=renderer.extensions.has('EXT_color_buffer_float')?T.HalfFloatType:T.UnsignedByteType;
    this.sceneTarget=new T.WebGLRenderTarget(1,1,{type:hdr,samples:4,depthTexture:new T.DepthTexture(1,1,T.UnsignedIntType)});
    this.a=new T.WebGLRenderTarget(1,1,{type:hdr,depthBuffer:false});this.b=this.a.clone();
    this.camera=new T.OrthographicCamera(-1,1,1,-1,0,1);this.scene=new T.Scene();this.quad=new T.Mesh(new T.PlaneGeometry(2,2));this.scene.add(this.quad);
    this.blur=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{source:{value:null},axis:{value:new T.Vector2()},threshold:{value:1}},vertexShader:vertex,fragmentShader:`varying vec2 vUv;uniform sampler2D source;uniform vec2 axis;uniform float threshold;
      vec3 sampleLight(vec2 uv){vec3 c=texture2D(source,uv).rgb;return c*mix(1.,smoothstep(1.,2.2,max(c.r,max(c.g,c.b))),threshold);}
      void main(){vec3 c=sampleLight(vUv)*.227027; c+=(sampleLight(vUv+axis*1.384615)+sampleLight(vUv-axis*1.384615))*.316216;c+=(sampleLight(vUv+axis*3.230769)+sampleLight(vUv-axis*3.230769))*.070270;gl_FragColor=vec4(c,1.);}`});
    this.final=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{colorTex:{value:this.sceneTarget.texture},depthTex:{value:this.sceneTarget.depthTexture},bloomTex:{value:this.b.texture},invProjection:{value:new T.Matrix4()},texel:{value:new T.Vector2()},bloomStrength:{value:.16},aoStrength:{value:.65}},vertexShader:vertex,fragmentShader:`
      varying vec2 vUv;uniform sampler2D colorTex,depthTex,bloomTex;uniform mat4 invProjection;uniform vec2 texel;uniform float bloomStrength,aoStrength;
      #include <common>
      vec3 positionAt(vec2 uv){float d=texture2D(depthTex,uv).r;vec4 p=invProjection*vec4(uv*2.-1.,d*2.-1.,1.);return p.xyz/p.w;}
      void main(){vec3 c=texture2D(colorTex,vUv).rgb;float depth=texture2D(depthTex,vUv).r;float occ=0.;
        if(depth<.9999&&aoStrength>0.){vec3 p=positionAt(vUv);vec3 n=normalize(cross(dFdx(p),dFdy(p)));if(n.z<0.)n=-n;
          for(int i=0;i<12;i++){float a=float(i)*2.39996;float radius=3.+float(i)*1.35;vec3 v=positionAt(vUv+vec2(cos(a),sin(a))*texel*radius)-p;float d=length(v);occ+=max(0.,dot(n,v)/max(d,.001)-.14)*(1.-smoothstep(.03,.22,d));} }
        c*=1.-clamp(occ/12.*aoStrength*2.4,0.,.38);c+=texture2D(bloomTex,vUv).rgb*bloomStrength;
        c=mix(vec3(dot(c,vec3(.2126,.7152,.0722))),c,1.04);
        float vignette=1.-.12*smoothstep(.25,.75,length(vUv-.5));gl_FragColor=vec4(c*vignette,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
  }
  resize(w,h){this.sceneTarget.setSize(w,h);this.a.setSize(Math.max(1,w>>2),Math.max(1,h>>2));this.b.setSize(Math.max(1,w>>2),Math.max(1,h>>2));this.final.uniforms.texel.value.set(1/w,1/h);}
  pass(mat,target){this.quad.material=mat;this.r.setRenderTarget(target);this.r.render(this.scene,this.camera);}
  render(scene,camera){const r=this.r;if(!this.enabled){r.setRenderTarget(null);r.render(scene,camera);return;}r.setRenderTarget(this.sceneTarget);r.render(scene,camera);
    this.blur.uniforms.source.value=this.sceneTarget.texture;this.blur.uniforms.threshold.value=1;this.blur.uniforms.axis.value.set(1/this.a.width,0);this.pass(this.blur,this.a);
    this.blur.uniforms.source.value=this.a.texture;this.blur.uniforms.threshold.value=0;this.blur.uniforms.axis.value.set(0,1/this.b.height);this.pass(this.blur,this.b);
    this.final.uniforms.invProjection.value.copy(camera.projectionMatrixInverse);this.final.uniforms.aoStrength.value=this.ao?.65:0;this.final.uniforms.bloomStrength.value=this.bloom?.16:0;this.pass(this.final,null);
  }
}
