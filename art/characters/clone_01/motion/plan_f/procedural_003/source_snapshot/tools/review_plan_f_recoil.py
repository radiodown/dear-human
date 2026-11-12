"""Inspect actual procedural rig contacts over firing and movement; render fixed recoil samples."""
from pathlib import Path
import base64
import json
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'art/characters/clone_01/motion/plan_f/procedural_003/review'
OUT.mkdir(parents=True, exist_ok=True)

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe', headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1100})
    page.goto('http://127.0.0.1:4173/#/samples/characters/clone_01?plan=f')
    page.locator('#plan-f-loading').wait_for(state='hidden')
    page.locator('#plan-f-pause').click()
    result = page.evaluate("""async () => {
      const base='/plan-f/';
      const [T,{createLian},{newState,advance,STEP},{SOCKETS},{createStage},{FilmRenderer}]=await Promise.all([
        import('/vendor/three-0.187.0/build/three.module.js'),import(base+'model.js'),import(base+'simulation.js'),
        import(base+'weapon-pose.js'),import(base+'environment.js'),import(base+'render.js')]);
      const actor=createLian(),get=name=>actor.root.getObjectByName(name),gun=get('rifle');
      const max={armJoint:0,wrist:0,handSocket:0,knee:0,ankle:0};
      const check=(key,a,b)=>{max[key]=Math.max(max[key],a.distanceTo(b));};
      const end=(object,length)=>new T.Vector3(0,-length,0).applyQuaternion(object.quaternion).add(object.position);
      let s=newState();
      for(let i=0;i<720;i++){
        advance(s,{left:i>=240&&i<360,right:i>=120&&i<240,fire:i<480});
        const before=JSON.stringify(s);actor.pose(s);actor.pose(s);
        if(before!==JSON.stringify(s))throw Error('Pose mutated simulation');
        for(const sign of [-1,1]){
          const upper=get('upper_arm_'+sign),lower=get('forearm_'+sign),hand=get('hand_'+sign),thigh=get('thigh_'+sign),shin=get('shin_'+sign),boot=get('boot_'+sign);
          check('armJoint',end(upper,.28),lower.position);check('wrist',end(lower,.28),hand.position);
          check('handSocket',hand.position,(sign>0?SOCKETS.trigger:SOCKETS.support).clone().applyQuaternion(gun.quaternion).add(gun.position));
          check('knee',end(thigh,.40),shin.position);check('ankle',end(shin,.39),boot.position.clone().add(new T.Vector3(0,.08,0)));
        }
      }
      if(Object.values(max).some(x=>x>1e-6))throw Error('Rig contact error '+JSON.stringify(max));
      if(s.shots!==80)throw Error('Cadence '+s.shots);
      if(s.kick.x>1e-6||s.body.x>1e-6||s.headLag.x>1e-6)throw Error('Recoil did not settle');
      const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(859,540);
      renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;
      const scene=new T.Scene(),world=createStage(scene,renderer),film=new FilmRenderer(renderer);film.resize(859,540);scene.add(actor.root);
      const camera=new T.OrthographicCamera(-1.23*859/540,1.23*859/540,1.23,-1.23,.1,35);
      camera.position.set(0,1.95,7);camera.lookAt(0,.93,0);
      s=newState();const samples=[],pictures=[];
      for(let i=0;i<=60;i++){
        if(i>0)advance(s,{left:false,right:false,fire:i===1});
        actor.pose(s);
        samples.push({time:s.time,kick:s.kick.x,body:s.body.x,head:s.headLag.x});
        if([0,1,4,12,60].includes(i)){
          world.update(s.time);film.render(scene,camera);
          pictures.push({frame:i,png:renderer.domElement.toDataURL('image/png').split(',')[1]});
        }
      }
      const peak=key=>samples.reduce((a,b)=>b[key]>a[key]?b:a).time;
      if(!(peak('kick')<peak('body')&&peak('body')<peak('head')))throw Error('Recoil phases not staggered');
      return {status:'passed',framesChecked:720,maxContactErrorMeters:max,shotsInEightSeconds:80,peakSeconds:{gun:peak('kick'),body:peak('body'),head:peak('head')},samples,pictures};
    }""")
    for picture in result.pop('pictures'):
        (OUT / f"recoil-frame-{picture['frame']:02d}.png").write_bytes(base64.b64decode(picture['png']))
    (OUT / 'recoil-check.json').write_bytes((json.dumps(result, indent=2)+'\n').encode())
    print(json.dumps({k:v for k,v in result.items() if k!='samples'}, indent=2))
    browser.close()
