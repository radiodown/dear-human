import * as T from '../vendor/three-0.187.0/build/three.module.js';
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
  reload(phase){
    const cue={start:[.035,700,.024],magout:[.075,1300,.055],magin:[.055,2300,.085],tap:[.025,900,.045],bolt:[.080,3100,.075]}[phase];
    const c=this.context;if(!cue||!this.enabled||!this.buffer||c?.state!=='running')return;
    const [duration,frequency,volume]=cue,now=c.currentTime,noise=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();
    noise.buffer=this.buffer;filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=1.4;
    gain.gain.setValueAtTime(volume,now);gain.gain.exponentialRampToValueAtTime(.001,now+duration);
    noise.connect(filter).connect(gain).connect(c.destination);noise.start(now,0,duration);
    noise.onended=()=>{noise.disconnect();filter.disconnect();gain.disconnect();};
  }
}
