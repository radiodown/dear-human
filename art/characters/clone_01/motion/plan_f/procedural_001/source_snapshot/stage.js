import * as T from '../vendor/three-0.187.0/build/three.module.js';
export function createStage(scene){
  scene.background=new T.Color('#141f2a');scene.fog=new T.Fog('#141f2a',9,24);
  scene.add(new T.HemisphereLight('#c4e0ef','#49464a',2.1));
  const key=new T.DirectionalLight('#fff2dc',3.3);key.position.set(2,6,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-8;key.shadow.camera.right=8;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;key.shadow.normalBias=.025;scene.add(key);
  const rim=new T.DirectionalLight('#6caaff',2);rim.position.set(-3,3,-4);scene.add(rim);
  const floor=new T.Mesh(new T.PlaneGeometry(32,15),new T.MeshStandardMaterial({color:'#36424b',roughness:.9}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
  function box(w,h,d,c,x,y,z){const o=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color:c,roughness:.8}));o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;scene.add(o);return o;}
  for(let i=-8;i<=8;i++){
    box(.018,.004,4,'#59606a',i,.004,0);
    box(.45,.006,.025,'#aa9364',i,.008,.65);
    if(i%2===0){box(.12,2.5,.17,'#283945',i,1.25,-2.2);box(1.9,.04,.05,'#66828f',i+.95,1.8,-2.2);}
  }
  box(22,.035,.06,'#788693',0,.4,-2.2);
  for(const x of [-4,4]){box(.85,.55,.75,'#243640',x,.28,-1.3);box(.86,.035,.76,'#9b8556',x,.56,-1.3);}
}

export function createEffects(scene){
  const pool=Array.from({length:18},()=>{
    const line=new T.Mesh(new T.CylinderGeometry(.004,.004,1,5),new T.MeshBasicMaterial({color:'#ffe4a5',transparent:true,opacity:.8}));line.visible=false;scene.add(line);return {line,life:0};
  });let cursor=0;
  return {
    shot(origin,direction){const e=pool[cursor++%pool.length];e.life=.075;e.line.visible=true;e.line.position.copy(origin).addScaledVector(direction,1.2);e.line.scale.y=2.4;e.line.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction);},
    update(dt){for(const e of pool){e.life-=dt;e.line.visible=e.life>0;e.line.material.opacity=Math.max(0,e.life/.075)*.85;}},
    clear(){for(const e of pool){e.life=0;e.line.visible=false;}}
  };
}

export class GunAudio{
  constructor(){this.enabled=false;}
  unlock(){if(!this.enabled)return;try{this.context??=new AudioContext();this.context.resume().catch(()=>{});if(!this.buffer){this.buffer=this.context.createBuffer(1,this.context.sampleRate*.12,this.context.sampleRate);const data=this.buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/data.length*9);}}catch{this.enabled=false;}}
  shot(){const c=this.context;if(!this.enabled||!this.buffer||c?.state!=='running')return;const noise=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();noise.buffer=this.buffer;filter.type='lowpass';filter.frequency.value=2400;gain.gain.value=.13;noise.connect(filter).connect(gain).connect(c.destination);noise.start();noise.onended=()=>{noise.disconnect();filter.disconnect();gain.disconnect();};}
}
