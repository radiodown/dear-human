"""Small local Chromium render review of the authored GLB; no runtime/game writes."""
import asyncio
import json
import sys
from pathlib import Path
import numpy as np
from make_rifle_reload import GLB
from playwright.async_api import async_playwright

VERSION = sys.argv[1] if len(sys.argv)>1 else 'loadout_020'
OUT = Path('art/characters/clone_01/motion/glb_model_001')/VERSION/'reviews'


def inspect_rig():
    base = OUT.parent.parent
    source = GLB(base/'loadout_007/clone_01_ar12_rupture.glb')
    model = GLB(OUT.parent/'clone_01_ar12_rupture.glb')
    assert model.j['animations'][:len(source.j['animations'])] == source.j['animations']
    assert model.bin[:len(source.bin)] == source.bin
    names = {n.get('name'):i for i,n in enumerate(model.j['nodes'])}
    neutral = model.world(model.sample('rifle_aim_idle',0))
    hand = names['mixamorig:LeftHand']; middle = names['mixamorig:LeftHandMiddle1']
    palm = (neutral[hand][:3,3]+neutral[middle][:3,3])*.5
    palm_local = np.linalg.inv(neutral[hand]) @ np.r_[palm,1]
    clip = next(a for a in model.j['animations'] if a['name']=='rifle_reload'); duration = clip['extras']['duration_seconds']
    max_foot = 0.; max_palm = 0.; arms = {}; finger_motion = {}
    for ch in clip['channels']:
        name = model.j['nodes'][ch['target']['node']].get('name','')
        if ch['target']['path'] != 'rotation' or not name.startswith('mixamorig:'): continue
        q = model.read(clip['samplers'][ch['sampler']]['output']).astype(float)
        q /= np.linalg.norm(q,axis=1)[:,None]
        if any(name.endswith(x) for x in ('Arm','ForeArm','Hand')):
            arms[name] = float(np.degrees(2*np.arccos(np.clip(np.abs(np.sum(q[1:]*q[:-1],axis=1)),0,1))).max())
        if name.startswith('mixamorig:LeftHand') and name[-1:].isdigit():
            finger_motion[name] = float(np.degrees(2*np.arccos(np.clip(np.abs(q @ q[0]),0,1))).max())
    for t in np.linspace(0,duration,round(duration*60)+1):
        trs = model.sample('rifle_reload',t)
        w = model.world(trs)
        for name in ('mixamorig:LeftFoot','mixamorig:RightFoot'):
            i = names[name]; max_foot = max(max_foot,float(np.linalg.norm(w[i][:3,3]-neutral[i][:3,3])))
        if (VERSION == 'loadout_016' and .54 <= t <= 1.74) or (VERSION in ('loadout_017','loadout_019','loadout_020') and (.48 <= t <= .61 or 1.09 <= t <= 1.85)):
            # STEP transitions use float32 key times; choose the actual visible node.
            mag = next(names[n] for n in ('reload_magazine_old','reload_magazine_fresh') if trs[names[n]][2][0] > .5)
            expected = w[mag] @ np.r_[clip['extras'].get('palm_contact',[-.025,-.008,-.006]),1]
            max_palm = max(max_palm,float(np.linalg.norm((w[hand] @ palm_local)[:3]-expected[:3])))
    assert max_foot < 1e-6 and max(arms.values()) < 16
    if VERSION in ('loadout_016','loadout_017','loadout_019','loadout_020'):
        assert max_palm < .0001
        assert sum(v > 1 for v in finger_motion.values()) >= 12
    bolt_contact = None
    empty_arms = {}
    if VERSION == 'loadout_020':
        empty_clip = next(a for a in model.j['animations'] if a['name']=='rifle_reload_empty')
        for ch in empty_clip['channels']:
            name = model.j['nodes'][ch['target']['node']].get('name','')
            if ch['target']['path'] != 'rotation' or not any(name.endswith(x) for x in ('Arm','ForeArm','Hand')): continue
            q = model.read(empty_clip['samplers'][ch['sampler']]['output']).astype(float)
            q /= np.linalg.norm(q,axis=1)[:,None]
            empty_arms[name] = float(np.degrees(2*np.arccos(np.clip(np.abs(np.sum(q[1:]*q[:-1],axis=1)),0,1))).max())
        assert max(empty_arms.values()) < 16
        bolt = names['ar12_reload_bolt']; bolt_contact = 0.
        for t in np.arange(2.15,2.50,1/60):
            w = model.world(model.sample('rifle_reload_empty',t))
            expected = w[bolt] @ np.array([0,0,-.020,1])
            bolt_contact = max(bolt_contact,float(np.linalg.norm((w[hand] @ palm_local)[:3]-expected[:3])))
        assert bolt_contact < .0001,bolt_contact
    return {'original_six_animation_definitions_and_binary_preserved':True,
            'max_foot_position_error':max_foot,'max_arm_degrees_per_60hz_sample':arms,
            'finger_rotation_range_degrees':finger_motion,'max_carried_palm_contact_error':max_palm if VERSION in ('loadout_016','loadout_017','loadout_019','loadout_020') else None,
            'max_bolt_pull_palm_contact_error':bolt_contact,'empty_reload_max_arm_degrees_per_60hz_sample':empty_arms}


async def main():
    OUT.mkdir(parents=True,exist_ok=True)
    (OUT/'rig_checks.json').write_text(json.dumps(inspect_rig(),indent=2),encoding='utf8',newline='\n')
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={'width':1100,'height':820},device_scale_factor=1,bypass_csp=True)
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        await page.goto('http://127.0.0.1:4173/')
        result=await page.evaluate('''async (version) => {
          const T = await import('/vendor/three-0.187.0/build/three.module.js');
          const {GLTFLoader} = await import('/vendor/three-0.187.0/examples/jsm/loaders/GLTFLoader.js');
          const model = await new GLTFLoader().loadAsync(`/art/characters/clone_01/motion/glb_model_001/${version}/clone_01_ar12_rupture.glb`);
          for (const child of document.body.children) child.style.display='none';
          const scene = new T.Scene(); scene.background=new T.Color(0x62666e); scene.add(model.scene);
          scene.add(new T.HemisphereLight(0xffffff,0x666677,2));
          const light=new T.DirectionalLight(0xffffff,2.5); light.position.set(-2,3,3); scene.add(light);
          const rim=new T.DirectionalLight(0xffffff,1); rim.position.set(2,2,-2); scene.add(rim);
          const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
          renderer.setSize(1100,820); document.body.append(renderer.domElement); document.body.style.margin='0';
          const camera=new T.OrthographicCamera(-.52,.52,.388,-.388,.01,20);
          camera.position.set(-3,1.15,3); camera.lookAt(0,.66,.13);
          const mixer=new T.AnimationMixer(model.scene); const clip=model.animations.find(a=>a.name==='rifle_reload');
          mixer.clipAction(clip).play();
          window.review={T,scene,renderer,camera,mixer,model,clip};
          return {clips:model.animations.map(a=>a.name),duration:clip.duration};
        }''',VERSION)
        crisp = VERSION in ('loadout_014','loadout_016','loadout_017','loadout_019','loadout_020')
        poses = [('ready',0),('grasp',.49),('extract',.72),('pouch',1.10),('insert',1.61),('seated',1.72),('return',2.25)] if crisp else [('ready',0),('grasp',.77),('extract',1.05),('pouch',1.48),('insert',2.04),('seated',2.18),('return',2.8)]
        for label,t in poses:
            await page.evaluate('''t=>{const r=window.review;r.mixer.setTime(t);r.model.scene.updateMatrixWorld(true);r.renderer.render(r.scene,r.camera)}''',t)
            await page.screenshot(path=str(OUT/f'{label}.png'))
        # Both default side view and front reveal hand/weapon occlusion.
        for label,pos in [('side',[-3,.75,0]),('front',[0,.75,3])]:
            await page.evaluate('''({pos,time})=>{const r=window.review;r.camera.position.set(...pos);r.camera.lookAt(0,.66,.13);r.mixer.setTime(time);r.renderer.render(r.scene,r.camera)}''',{'pos':pos,'time':.72 if crisp else 1.05})
            await page.screenshot(path=str(OUT/f'extract_{label}.png'))
        if VERSION in ('loadout_013','loadout_014','loadout_016'):
            continuity=await page.evaluate('''async (priorVersion) => {
              const r=window.review, T=r.T;
              const {GLTFLoader}=await import('/vendor/three-0.187.0/examples/jsm/loaders/GLTFLoader.js');
              const prior=await new GLTFLoader().loadAsync(`/art/characters/clone_01/motion/glb_model_001/${priorVersion}/clone_01_ar12_rupture.glb`);
              function inspect(model) {
                const mixer=new T.AnimationMixer(model.scene), clip=model.animations.find(c=>c.name==='rifle_reload');
                const action=mixer.clipAction(clip);action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();
                const mags=['reload_magazine_old','reload_magazine_fresh'].map(n=>model.scene.getObjectByName(n));
                const center=new T.Vector3(-.027,.037,0);let last=null,maxStep=0,gaps=0,duplicates=0,partial=0;
                const count=Math.round(clip.duration*240);
                for(let i=0;i<=count;i++) {
                  mixer.setTime(i/240);model.scene.updateMatrixWorld(true);
                  const visible=mags.filter(n=>n.scale.x>.5);
                  gaps+=visible.length===0;duplicates+=visible.length>1;
                  partial+=mags.some(n=>n.scale.x!==0&&n.scale.x!==1);
                  if(visible.length===1) {
                    const point=visible[0].localToWorld(center.clone());
                    if(last)maxStep=Math.max(maxStep,point.distanceTo(last));last=point;
                  }else last=null;
                }
                const handoffs=[];
                const events=model.parser.json.animations.find(a=>a.name==='rifle_reload').extras.events;
                for(const time of [events.exchange,events.seated_mesh_swap]) {
                  mixer.setTime(time);model.scene.updateMatrixWorld(true);
                  const matrices=mags.map(n=>n.parent.matrixWorld.clone().multiply(new T.Matrix4().compose(n.position,n.quaternion,new T.Vector3(1,1,1))));
                  handoffs.push({time,positionError:center.clone().applyMatrix4(matrices[0]).distanceTo(center.clone().applyMatrix4(matrices[1])),
                    rotationError:new T.Quaternion().setFromRotationMatrix(matrices[0]).angleTo(new T.Quaternion().setFromRotationMatrix(matrices[1]))});
                }
                mixer.stopAllAction();return {samples:count+1,duration:clip.duration,gaps,duplicates,partial,maxStep,maxSpeed:maxStep*240,handoffs};
              }
              // Keep the render mixer's state separate from this dense animation audit.
              r.mixer.stopAllAction();const result={before:inspect(prior),after:inspect(r.model)};
              r.mixer.clipAction(r.clip).reset().play();return result;
            }''','loadout_014' if VERSION == 'loadout_016' else ('loadout_013' if crisp else 'loadout_012'))
            assert continuity['after']['gaps']==0 and continuity['after']['duplicates']==0
            assert continuity['after']['partial']==0 and continuity['after']['maxStep']<.008
            assert all(h['positionError']<1e-5 and h['rotationError']<1e-4 for h in continuity['after']['handoffs'])
            (OUT/'magazine_continuity.json').write_text(json.dumps(continuity,indent=2),encoding='utf8',newline='\n')
            print(json.dumps(continuity))
            handoff_poses=[('exchange_before',1.08),('exchange_after',1.12),('seat_before',1.88),('seat_after',1.92)] if crisp else [('exchange_before',1.48),('exchange_after',1.52),('seat_before',2.315),('seat_after',2.35)]
            for label,t in handoff_poses:
                await page.evaluate('''t=>{const r=window.review;r.camera.position.set(-3,1.15,3);r.camera.lookAt(0,.66,.13);r.mixer.setTime(t);r.renderer.render(r.scene,r.camera)}''',t)
                await page.screenshot(path=str(OUT/f'{label}.png'))
        if VERSION in ('loadout_017','loadout_019','loadout_020'):
            drop_checks=await page.evaluate('''() => {
              const r=window.review,T=r.T,root=r.model.scene;
              const old=root.getObjectByName('reload_magazine_old'),fresh=root.getObjectByName('reload_magazine_fresh'),
                dropped=root.getObjectByName('reload_magazine_dropped'),hand=root.getObjectByName('mixamorigLeftHand') || root.getObjectByName('mixamorig:LeftHand');
              const center=new T.Vector3(-.027,.037,0),events=r.model.parser.json.animations.find(a=>a.name==='rifle_reload').extras.events;
              const action=r.mixer.clipAction(r.clip);action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;
              let gaps=0,invalidCount=0,maxDropStep=0,last=null,landed=null,landedDrift=0,minFloor=Infinity,maxRise=0,handSeparation=0;
              for(let i=0;i<=636;i++) {
                const t=i/240;r.mixer.setTime(t);root.updateMatrixWorld(true);
                const visible=[old,fresh,dropped].filter(n=>n.scale.x>.5);gaps+=visible.length===0;
                // Two physical magazines coexist once the replacement is drawn.
                const expected=t<events.drop-1e-6?1:(t<events.new_visible-1e-6?1:(t<r.clip.duration-1e-6?2:1));
                // Avoid counting float32 boundary rounding as a visibility mismatch.
                if(![events.drop,events.new_visible,events.seated_mesh_swap,r.clip.duration].some(v=>Math.abs(t-v)<1e-5)) invalidCount+=visible.length!==expected;
                if(dropped.scale.x>.5) {
                  const point=dropped.localToWorld(center.clone());
                  if(last){maxDropStep=Math.max(maxDropStep,point.distanceTo(last));if(t<events.ground)maxRise=Math.max(maxRise,point.y-last.y);}
                  last=point;
                  if(t>events.ground+.02){landed??=point.clone();landedDrift=Math.max(landedDrift,point.distanceTo(landed));}
                  minFloor=Math.min(minFloor,new T.Box3().setFromObject(dropped).min.y);
                  if(Math.abs(t-1)<1e-5)handSeparation=point.distanceTo(hand.getWorldPosition(new T.Vector3()));
                }
              }
              function mismatch(time,a,b) {
                r.mixer.setTime(time);root.updateMatrixWorld(true);
                const matrices=[a,b].map(n=>n.parent.matrixWorld.clone().multiply(new T.Matrix4().compose(n.position,n.quaternion,new T.Vector3(1,1,1))));
                return {time,position:center.clone().applyMatrix4(matrices[0]).distanceTo(center.clone().applyMatrix4(matrices[1])),
                  rotation:new T.Quaternion().setFromRotationMatrix(matrices[0]).angleTo(new T.Quaternion().setFromRotationMatrix(matrices[1]))};
              }
              const handoffs=[mismatch(events.drop,old,dropped),mismatch(events.seated_mesh_swap,old,fresh)];
              return {samples:637,gaps,invalidCount,maxDropStep,landedDrift,minFloor,maxRise,handSeparation,handoffs,events};
            }''')
            assert drop_checks['gaps']==0 and drop_checks['invalidCount']==0,drop_checks
            assert drop_checks['maxDropStep']<.025 and drop_checks['landedDrift']<1e-5,drop_checks
            assert drop_checks['minFloor']>=-.001 and drop_checks['maxRise']<.001,drop_checks
            assert drop_checks['handSeparation']>.15,drop_checks
            assert all(h['position']<1e-5 and h['rotation']<1e-4 for h in drop_checks['handoffs']),drop_checks
            (OUT/'discard_continuity.json').write_text(json.dumps(drop_checks,indent=2),encoding='utf8',newline='\n')
            print(json.dumps(drop_checks))
            for label,t in [('release_before',.63),('release_after',.67),('empty_hand',.83),('pickup',1.04),('dropped_on_floor',1.3)]:
                await page.evaluate('''t=>{const r=window.review;r.camera.position.set(-3,.85,0);r.camera.lookAt(0,.53,.12);
                  r.camera.zoom=.7;r.camera.updateProjectionMatrix();r.mixer.setTime(t);r.renderer.render(r.scene,r.camera)}''',t)
                await page.screenshot(path=str(OUT/f'{label}.png'))
            await page.evaluate('()=>{const r=window.review;r.camera.zoom=1;r.camera.updateProjectionMatrix()}')
        if VERSION in ('loadout_016','loadout_017','loadout_019','loadout_020'):
            # Eight actual GLB poses in order, rendered directly into a review sheet.
            await page.evaluate('''() => {
              const r=window.review, sheet=document.createElement('canvas');sheet.id='motion-sequence';
              sheet.width=1100;sheet.height=800;const c=sheet.getContext('2d');
              c.fillStyle='#25282d';c.fillRect(0,0,1100,800);c.font='16px sans-serif';
              r.camera.position.set(-3,.85,0);r.camera.lookAt(0,.70,.13);
              const times=[.35,.62,.80,1.00,1.26,1.55,1.85,2.12];
              times.forEach((t,i)=>{r.mixer.setTime(t);r.renderer.render(r.scene,r.camera);
                const x=i%4*275,y=Math.floor(i/4)*400;
                c.drawImage(r.renderer.domElement,210,70,670,710,x,y+26,275,374);
                c.fillStyle='white';c.fillText(`${t.toFixed(2)}s`,x+10,y+20);});
              r.renderer.domElement.style.display='none';document.body.append(sheet);
            }''')
            await page.locator('#motion-sequence').screenshot(path=str(OUT/'motion_sequence.png'))
        result['page_errors']=errors
        (OUT/'render.json').write_text(json.dumps(result,indent=2),encoding='utf8',newline='\n')
        print(json.dumps(result))
        # Exercise the real shared viewer. The hook exists only in this intercepted QA response.
        app_source=Path('game/app.js').read_text(encoding='utf8')
        await page.route('**/app.js',lambda route:route.fulfill(status=200,content_type='text/javascript',
                                                             body=app_source+'\nwindow.reloadQA = glb;'))
        await page.goto('http://127.0.0.1:4173/#/samples/characters/clone_01?plan=glb&loadout=ar12_rupture&clip=rifle_reload&paused=1')
        await page.reload()
        await page.wait_for_function("window.reloadQA?.action?.getClip().name === 'rifle_reload'")
        await page.locator('[data-clip="rifle_reload"]').click()
        await page.evaluate('''() => {const r=window.reloadQA;r.action.time=1.05;r.current.mixer.update(0);r.render()}''')
        await page.locator('#glb-stage').screenshot(path=str(OUT/'viewer_reload.png'))
        checks=await page.evaluate('''() => {
          const r=window.reloadQA, root=r.current.root;
          return {clip:r.action.getClip().name,label:document.querySelector('[data-clip="rifle_reload"]').textContent,
                  file:r.source.url,oldScale:root.getObjectByName('reload_magazine_old').scale.toArray(),
                  newScale:root.getObjectByName('reload_magazine_fresh').scale.toArray()};
        }''')
        if '/'+VERSION+'/' not in checks['file']:
            # A concurrent firing revision may wrap the finished reload. Accept
            # that integration only after verifying the exact authored tracks.
            expected=GLB(OUT.parent/'clone_01_ar12_rupture.glb')
            actual=GLB(Path(checks['file'].lstrip('/')))
            assert [n.get('name') for n in expected.j['nodes']]==[n.get('name') for n in actual.j['nodes']]
            for name in ('rifle_reload','rifle_reload_empty'):
                a=next(a for a in expected.j['animations'] if a['name']==name)
                b=next(a for a in actual.j['animations'] if a['name']==name)
                assert a==b,name
                for sampler in a['samplers']:
                    for field in ('input','output'):
                        assert np.array_equal(expected.read(sampler[field]),actual.read(sampler[field])),name
            checks['verified_reload_source']=VERSION
        # Stop during the magazine exchange, then change clip: the seated magazine must be restored.
        await page.evaluate('''() => {const r=window.reloadQA;r.action.time=1.7;r.current.mixer.update(0)}''')
        await page.locator('[data-clip="rifle_aim_idle"]').click()
        await page.evaluate('''() => {const r=window.reloadQA;r.current.mixer.update(0);r.render()}''')
        checks['after_switch']=await page.evaluate('''() => {const r=window.reloadQA;return {
          clip:r.action.getClip().name,oldScale:r.current.root.getObjectByName('reload_magazine_old').scale.toArray(),
          newScale:r.current.root.getObjectByName('reload_magazine_fresh').scale.toArray()}}''')
        await page.locator('[data-clip="rifle_reload"]').click()
        await page.locator('#glb-speed').select_option('.25')
        await page.locator('#glb-pause').click()
        await page.wait_for_function('window.reloadQA.action.time > .08')
        await page.locator('#glb-pause').click()
        checks['slow_play_time']=await page.evaluate('window.reloadQA.action.time')
        checks['page_errors']=errors
        assert checks['after_switch']['oldScale']==[1,1,1]
        assert checks['after_switch']['newScale']==[0,0,0]
        if VERSION in ('loadout_017','loadout_019','loadout_020'):
            # Switching away mid-drop must restore the hidden loose object, including
            # the carried-over firing clip that predates this new node.
            checks['drop_switches']={}
            for clip_name in ('rifle_aim_idle','rifle_full_auto'):
                await page.locator('[data-clip="rifle_reload"]').click()
                await page.evaluate('()=>{const r=window.reloadQA;r.action.time=.9;r.current.mixer.update(0);r.render()}')
                await page.locator(f'[data-clip="{clip_name}"]').click()
                state=await page.evaluate('()=>{const r=window.reloadQA;r.current.mixer.update(0);r.render();return r.current.root.getObjectByName("reload_magazine_dropped").scale.toArray()}')
                checks['drop_switches'][clip_name]=state
                assert state==[0,0,0],state
        if VERSION == 'loadout_020':
            variants={}
            for clip_name in ('rifle_reload','rifle_reload_empty'):
                await page.locator(f'[data-clip="{clip_name}"]').click()
                data=await page.evaluate('''() => {
                  const r=window.reloadQA,root=r.current.root,bolt=root.getObjectByName('ar12_reload_bolt');
                  const duration=r.action.getClip().duration,count=Math.round(duration*240);
                  let min=Infinity,max=-Infinity,maxStep=0,last=null;
                  for(let i=0;i<=count;i++) {
                    r.action.time=i===count?duration:i/240;r.current.mixer.update(0);root.updateMatrixWorld(true);
                    min=Math.min(min,bolt.position.x);max=Math.max(max,bolt.position.x);
                    if(last!==null)maxStep=Math.max(maxStep,Math.abs(bolt.position.x-last));last=bolt.position.x;
                  }
                  return {duration,samples:count+1,min,max,travel:max-min,maxStep,finalBolt:bolt.position.toArray(),
                    dropped:root.getObjectByName('reload_magazine_dropped').scale.toArray(),
                    seated:root.getObjectByName('reload_magazine_old').scale.toArray()};
                }''')
                variants[clip_name]=data
                assert data['dropped']==[0,0,0] and data['seated']==[1,1,1],data
            assert variants['rifle_reload']['travel']<1e-7
            assert abs(variants['rifle_reload_empty']['travel']-.034)<1e-6
            await page.locator('[data-clip="rifle_reload_empty"]').click()
            for label,t in [('bolt_reach',2.14),('bolt_back',2.44),('bolt_released',2.64)]:
                await page.evaluate('''t=>{const r=window.reloadQA;r.action.time=t;r.current.mixer.update(0);r.camera.zoom=2.2;
                  r.camera.position.set(5,.8,.1);r.camera.lookAt(0,.76,.22);r.camera.updateProjectionMatrix();r.render()}''',t)
                await page.locator('#glb-stage').screenshot(path=str(OUT/f'{label}.png'))
            # Change away while the handle is fully back: it must return to its base pose.
            await page.evaluate('()=>{const r=window.reloadQA;r.action.time=2.44;r.current.mixer.update(0);r.render()}')
            await page.locator('[data-clip="rifle_full_auto"]').click()
            restored=await page.evaluate('()=>{const r=window.reloadQA;r.current.mixer.update(0);r.render();return r.current.root.getObjectByName("ar12_reload_bolt").position.toArray()}')
            assert abs(restored[0]+.040)<1e-6,restored
            variants['switch_to_full_auto_bolt']=restored
            await page.locator('[data-clip="rifle_reload_empty"]').click()
            await page.evaluate('()=>{const r=window.reloadQA;r.action.time=2.18;r.current.mixer.update(0);r.camera.zoom=1;r.camera.updateProjectionMatrix();r.placeCamera()}')
            await page.locator('#glb-speed').select_option('.25');await page.locator('#glb-pause').click()
            await page.wait_for_function('window.reloadQA.action.time>2.3')
            await page.locator('#glb-pause').click()
            variants['empty_slow_time']=await page.evaluate('window.reloadQA.action.time')
            (OUT/'reload_variants.json').write_text(json.dumps(variants,indent=2),encoding='utf8',newline='\n')
            checks['variants']=variants
        assert not errors,errors
        (OUT/'viewer.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf8',newline='\n')
        print(json.dumps(checks,ensure_ascii=True))
        await browser.close()


if __name__=='__main__': asyncio.run(main())
