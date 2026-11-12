import * as T from '../vendor/three-0.187.0/build/three.module.js';
export function createEffects(scene){
  const tracerGeometry=new T.CylinderGeometry(.004,.004,1,5);
  const pool=Array.from({length:18},()=>{
    const line=new T.Mesh(tracerGeometry,new T.MeshBasicMaterial({color:'#ffe4a5',transparent:true,opacity:.8}));line.visible=false;scene.add(line);return {line,life:0};
  });
  const shellGeometry=new T.CylinderGeometry(.0045,.0045,.027,8);
  const shellMaterial=new T.MeshStandardMaterial({color:'#b8a063',metalness:.78,roughness:.32});
  const shells=Array.from({length:36},()=>{
    const mesh=new T.Mesh(shellGeometry,shellMaterial);mesh.visible=false;mesh.castShadow=true;scene.add(mesh);
    return {mesh,life:0,velocity:new T.Vector3(),spin:new T.Vector3()};
  });
  // Generated soft alpha texture; no image fetch and no hard-edged smoke planes.
  const size=64,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const r=Math.hypot((x+.5)/size*2-1,(y+.5)/size*2-1),a=Math.max(0,1-r);
    data.set([180,191,199,Math.round(a*a*180)],(y*size+x)*4);
  }
  const map=new T.DataTexture(data,size,size);map.needsUpdate=true;map.magFilter=T.LinearFilter;map.minFilter=T.LinearFilter;map.colorSpace=T.SRGBColorSpace;
  const smoke=Array.from({length:24},()=>{
    const sprite=new T.Sprite(new T.SpriteMaterial({map,transparent:true,opacity:0,depthWrite:false,color:'#a5afb5'}));sprite.visible=false;scene.add(sprite);
    return {sprite,life:0,total:1.25,drift:new T.Vector3(),size:.07};
  });
  let cursor=0,shellCursor=0,smokeCursor=0,heat=0,silence=9,smokeClock=0;
  const up=new T.Vector3(0,1,0),muzzlePosition=new T.Vector3();
  return {
    shot(origin,direction,ejection,orientation){
      const e=pool[cursor++%pool.length];e.life=.075;e.line.visible=true;e.line.position.copy(origin).addScaledVector(direction,1.2);e.line.scale.y=2.4;e.line.quaternion.setFromUnitVectors(up,direction);
      heat=Math.min(1.5,heat+.12);silence=0;
      if(ejection&&orientation){
        const shell=shells[shellCursor++%shells.length],seed=(shellCursor*.61803398875)%1;
        shell.life=2.4;shell.mesh.visible=true;shell.mesh.position.copy(ejection);shell.mesh.quaternion.copy(orientation);
        shell.velocity.set(1.3+seed*.8,1.1+seed*.5,-.25+seed*.3).applyQuaternion(orientation);
        shell.spin.set(8+seed*12,5-seed*11,12-seed*7);
      }
    },
    update(dt,muzzle){
      for(const e of pool){e.life-=dt;e.line.visible=e.life>0;e.line.material.opacity=Math.max(0,e.life/.075)*.85;}
      for(const e of shells){
        if(e.life<=0)continue;e.life-=dt;e.mesh.visible=e.life>0;
        e.velocity.y-=9.81*dt;e.mesh.position.addScaledVector(e.velocity,dt);
        e.mesh.rotation.x+=e.spin.x*dt;e.mesh.rotation.y+=e.spin.y*dt;e.mesh.rotation.z+=e.spin.z*dt;
        if(e.mesh.position.y<.016){e.mesh.position.y=.016;e.velocity.y=Math.abs(e.velocity.y)*.28;e.velocity.x*=.6;e.velocity.z*=.6;e.spin.multiplyScalar(.55);}
      }
      silence+=dt;heat=Math.max(0,heat-dt*.20);smokeClock-=dt;
      if(muzzle&&silence>.10&&heat>.20&&smokeClock<=0){
        smokeClock=.085;const p=smoke[smokeCursor++%smoke.length],seed=(smokeCursor*.754877)%1;
        muzzle.getWorldPosition(muzzlePosition);p.sprite.position.copy(muzzlePosition);p.life=p.total;p.size=.055+heat*.055;
        p.drift.set((seed-.5)*.08,.12+heat*.06,(.5-seed)*.06);p.sprite.material.rotation=seed*6.28;
      }
      for(const p of smoke){
        p.life=Math.max(0,p.life-dt);p.sprite.visible=p.life>0;if(!p.life)continue;
        const age=1-p.life/p.total;p.sprite.position.addScaledVector(p.drift,dt);p.sprite.scale.setScalar(p.size*(1+age*2.6));
        p.sprite.material.opacity=Math.sin(Math.PI*age)*.28;
      }
    },
    clear(){
      for(const e of pool){e.life=0;e.line.visible=false;}
      for(const e of shells){e.life=0;e.mesh.visible=false;}
      for(const p of smoke){p.life=0;p.sprite.visible=false;}
      heat=0;silence=9;smokeClock=0;
    }
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
