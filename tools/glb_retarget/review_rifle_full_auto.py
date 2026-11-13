"""Focused actual Three.js body recoil, contacts, cues and viewer checks for AR-12 shoulder follow 005."""
import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright

OUT = Path('art/characters/clone_01/motion/glb_model_001/full_auto_005/reviews')
URL = 'http://127.0.0.1:4173/#/samples/characters/clone_01?plan=glb&loadout=ar12_rupture&clip=rifle_full_auto&paused=1'


async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={'width': 1300, 'height': 950})
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        source = Path('game/app.js').read_text(encoding='utf8')
        await page.route('**/app.js', lambda r: r.fulfill(status=200, content_type='text/javascript', body=source+'\nwindow.autoQA=glb;'))
        await page.goto(URL)
        await page.wait_for_function("()=>window.autoQA?.action?.getClip().name === 'rifle_full_auto'")
        anchor = json.loads((OUT.parent/'clone_01_ar12_rupture.json').read_text(encoding='utf8'))['shoulder_anchor']
        report = await page.evaluate('''async anchor => {
          const r=window.autoQA, T=r.THREE, root=r.current.root;
          const {firingCues}=await import('/glb-gun-fx.js');
          const clip=r.action.getClip(), cues=firingCues(clip.name,clip.duration);
          const gun=root.getObjectByName('weapon').children.find(n=>!n.isBone);
          const hands=['Left','Right'].map(s=>root.getObjectByName('mixamorig'+s+'Hand'));
          const feet=['Left','Right'].map(s=>root.getObjectByName('mixamorig'+s+'Foot'));
          const mags=['reload_magazine_old','reload_magazine_fresh'].map(n=>root.getObjectByName(n));
          const pose=t=>{
            r.action.time=t;r.current.mixer.update(0);
            if(r.inPlace&&r.current.hips&&r.clipName!=='rifle_full_auto'){r.current.hips.position.x=r.current.hipsRest.x;r.current.hips.position.z=r.current.hipsRest.z}
            root.updateMatrixWorld(true);r.gunFx.update(clip.name,t,clip.duration);
          };
          pose(0);
          const offsets=hands.map(n=>gun.matrixWorld.clone().invert().multiply(n.matrixWorld));
          const planted=feet.map(n=>n.getWorldPosition(new T.Vector3()));
          let frontDrift=0,rearRetreat=0,rearLift=0,rearPlantDrift=0,lowestPelvis=Infinity;
          const rearPlant=new T.Vector3().copy(planted[1]).add(new T.Vector3(0,0,-.04));
          const bodyNames=['Hips','Spine','Spine1','Spine2','Neck','Head','RightShoulder','LeftShoulder',
            'RightArm','LeftArm','RightForeArm','LeftForeArm','RightUpLeg','LeftUpLeg','RightLeg','LeftLeg'];
          const body=bodyNames.map(n=>root.getObjectByName('mixamorig'+n));
          const bodyStart=body.map(n=>n.quaternion.clone());
          const bodyRotationDegrees=Object.fromEntries(bodyNames.map(n=>[n,0]));
          let pitchMin=Infinity,pitchMax=-Infinity,yawMin=Infinity,yawMax=-Infinity;
          const shoulder=root.getObjectByName(anchor.node.replace(':',''));
          const stockLocal=new T.Vector3(...anchor.stock_local),pocketLocal=new T.Vector3(...anchor.pocket_local);
          const recoilDirection=new T.Vector3(...anchor.recoil_direction);
          let maxShoulderSlip=0,maxShoulderCrossSlip=0;
          const followSamples=[];
          let maxContact=0,maxFoot=0,gaps=0,duplicates=0,maxSmoke=0,maxSparks=0;
          let emissions=0;
          const emit=r.gunFx.emitSmoke.bind(r.gunFx);
          r.gunFx.emitSmoke=(...args)=>{emissions++;emit(...args)};
          r.gunFx.reset();
          for(let frame=0;frame<800;frame++) {
            pose((frame/250)%clip.duration);
            hands.forEach((n,i)=>{
              const expected=new T.Vector3().setFromMatrixPosition(gun.matrixWorld.clone().multiply(offsets[i]));
              maxContact=Math.max(maxContact,expected.distanceTo(n.getWorldPosition(new T.Vector3())));
            });
            feet.forEach((n,i)=>maxFoot=Math.max(maxFoot,planted[i].distanceTo(n.getWorldPosition(new T.Vector3()))));
            const front=feet[0].getWorldPosition(new T.Vector3()),rear=feet[1].getWorldPosition(new T.Vector3());
            frontDrift=Math.max(frontDrift,front.distanceTo(planted[0]));
            rearRetreat=Math.max(rearRetreat,planted[1].z-rear.z);rearLift=Math.max(rearLift,rear.y-planted[1].y);
            if(r.action.time>=.88&&r.action.time<=1.14)rearPlantDrift=Math.max(rearPlantDrift,rear.distanceTo(rearPlant));
            lowestPelvis=Math.min(lowestPelvis,r.current.hips.getWorldPosition(new T.Vector3()).y);
            body.forEach((n,i)=>bodyRotationDegrees[bodyNames[i]]=Math.max(bodyRotationDegrees[bodyNames[i]],n.quaternion.angleTo(bodyStart[i])*180/Math.PI));
            const aim=new T.Vector3(1,0,0).transformDirection(gun.matrixWorld);
            const pitch=Math.atan2(aim.y,Math.hypot(aim.x,aim.z))*180/Math.PI,yaw=Math.atan2(aim.x,aim.z)*180/Math.PI;
            pitchMin=Math.min(pitchMin,pitch);pitchMax=Math.max(pitchMax,pitch);yawMin=Math.min(yawMin,yaw);yawMax=Math.max(yawMax,yaw);
            const stock=stockLocal.clone().applyMatrix4(gun.matrixWorld),pocket=pocketLocal.clone().applyMatrix4(shoulder.matrixWorld);
            const slip=stock.clone().sub(pocket);
            maxShoulderSlip=Math.max(maxShoulderSlip,slip.length());
            const crossSlip=slip.clone().addScaledVector(recoilDirection,-slip.dot(recoilDirection));
            maxShoulderCrossSlip=Math.max(maxShoulderCrossSlip,crossSlip.length());
            if([0,140,180,200,240,320].includes(frame))followSamples.push({time:r.action.time,stock:stock.toArray(),pocket:pocket.toArray()});
            const count=mags.filter(n=>n.scale.x>.5).length;gaps+=count===0;duplicates+=count>1;
            maxSmoke=Math.max(maxSmoke,r.gunFx.smoke.length);maxSparks=Math.max(maxSparks,r.gunFx.sparks.length);
          }
          r.gunFx.emitSmoke=emit;
          const matrixSnapshot=()=>[gun,...hands,...feet].map(n=>n.matrixWorld.elements.slice());
          pose(0);const first=matrixSnapshot();pose(clip.duration);const last=matrixSnapshot();
          const seam=Math.max(...first.flatMap((a,i)=>a.map((v,j)=>Math.abs(v-last[i][j]))));
          r.gunFx.reset();pose(.025);const flash=r.gunFx.mounts[0].group.visible;
          pose(.065);const darkGap=!r.gunFx.mounts[0].group.visible;
          r.setClip('gunplay_auto');r.action.time=0;r.current.mixer.update(0);
          const referenceStart=body.map(n=>n.quaternion.clone());
          const referenceBody=Object.fromEntries(bodyNames.map(n=>[n,{maxDegrees:0,peakTime:0}]));
          for(let frame=0;frame<=60;frame++){
            r.action.time=frame/240;r.current.mixer.update(0);
            body.forEach((n,i)=>{const angle=n.quaternion.angleTo(referenceStart[i])*180/Math.PI;
              if(angle>referenceBody[bodyNames[i]].maxDegrees)referenceBody[bodyNames[i]]={maxDegrees:angle,peakTime:frame/240};});
          }
          r.setClip('rifle_full_auto');
          return {source:r.source.url,clips:r.current.clips.map(c=>c.name),duration:clip.duration,
            cues:cues.map(c=>c.time),samples:800,emissions,maxContact,maxFoot,bodyRotationDegrees,
            shoulderFollow:{maxShoulderSlip,maxShoulderCrossSlip,followSamples},referenceBody,
            aim:{pitchMin,pitchMax,yawMin,yawMax},
            stance:{frontDrift,rearRetreat,rearLift,rearPlantDrift,lowestPelvis},gaps,duplicates,seam,maxSmoke,maxSparks,flash,darkGap};
        }''', anchor)
        assert report['emissions'] == 40, report
        assert report['maxContact'] < .0002 and report['maxFoot'] < .041, report
        assert report['stance']['frontDrift'] < .0001 and report['stance']['rearPlantDrift'] < .0001, report
        assert .0399 < report['stance']['rearRetreat'] < .0401 and report['stance']['rearLift'] > .0119, report
        assert report['bodyRotationDegrees']['Hips'] > 2.5 and report['bodyRotationDegrees']['Head'] > 2, report
        assert report['bodyRotationDegrees']['Spine'] > 1 and report['bodyRotationDegrees']['RightShoulder'] > 3, report
        assert report['aim']['pitchMax'] < .5 and report['aim']['pitchMin'] > -.25, report
        assert report['aim']['yawMax']-report['aim']['yawMin'] < .3, report
        assert report['shoulderFollow']['maxShoulderSlip'] < .0036, report
        assert report['shoulderFollow']['maxShoulderCrossSlip'] < .0001, report
        before,after=report['shoulderFollow']['followSamples'][0],report['shoulderFollow']['followSamples'][3]
        assert after['stock'][1]-before['stock'][1] < -.018, report
        for axis in range(3):
            assert abs((after['stock'][axis]-before['stock'][axis])-(after['pocket'][axis]-before['pocket'][axis])) < .0001
        assert report['seam'] < 1e-6 and not report['gaps'] and not report['duplicates'], report
        assert report['flash'] and report['darkGap'], report
        await page.evaluate("()=>{const r=window.autoQA;r.setClip('gunplay_auto');r.action.time=.125;r.current.mixer.update(0);r.render()}")
        await page.locator('#glb-stage').screenshot(path=str(OUT/'reference_auto_recoil.png'))
        await page.evaluate("()=>window.autoQA.setClip('rifle_full_auto')")
        await page.evaluate("()=>{const r=window.autoQA;r.gunFx.reset();r.action.time=.03;r.current.mixer.update(0);r.render()}")
        await page.locator('#glb-stage').screenshot(path=str(OUT/'full_auto_side.png'))
        await page.evaluate("()=>{const r=window.autoQA;r.camera.position.set(-3,.8,2);r.camera.lookAt(0,.6,.1);r.render()}")
        await page.locator('#glb-stage').screenshot(path=str(OUT/'full_auto_angle.png'))
        await page.evaluate('()=>window.autoQA.placeCamera()')
        for label,t in [('brace',.68),('retreat',.77),('planted',.94),('recover',1.27)]:
            await page.evaluate('''t=>{const r=window.autoQA;r.action.time=t;r.current.mixer.update(0);r.render()}''',t)
            await page.locator('#glb-stage').screenshot(path=str(OUT/f'stance_{label}.png'))
        await page.locator('#glb-speed').select_option('.25')
        await page.locator('#glb-restart').click()
        await page.locator('#glb-pause').click()
        await page.wait_for_timeout(500)
        t = await page.evaluate('window.autoQA.action.time')
        assert .06 < t < .23, t
        await page.locator('#glb-pause').click()
        state = await page.evaluate('window.autoQA.action.time')
        await page.wait_for_timeout(180)
        assert await page.evaluate('window.autoQA.action.time') == state
        report['slowPlaybackTimeAfter500ms'] = t
        report['pauseStable'] = True
        await page.locator('#glb-gun-effects').uncheck()
        assert await page.evaluate('window.autoQA.gunFx.mounts.every(m=>!m.group.visible)')
        await page.locator('#glb-gun-effects').check()
        await page.locator('[data-clip="rifle_reload"]').click()
        await page.evaluate('()=>{const r=window.autoQA;r.action.time=1.1;r.current.mixer.update(0);r.render()}')
        await page.locator('[data-clip="rifle_full_auto"]').click()
        report['reloadToAuto'] = await page.evaluate('''()=>{
          const r=window.autoQA;return ['reload_magazine_old','reload_magazine_fresh'].map(n=>r.current.root.getObjectByName(n).scale.x)
        }''')
        assert report['reloadToAuto'] == [1, 0]
        await page.locator('[data-clip="gunplay_auto"]').click()
        assert abs(await page.evaluate('window.autoQA.action.getClip().duration')-.25)<1e-6
        await page.locator('[data-clip="rifle_full_auto"]').click()
        await page.locator('#glb-speed').select_option('1')
        await page.locator('#glb-pause').click()
        await page.wait_for_timeout(400)
        report['normalPlaybackTimeAfter400ms'] = await page.evaluate('window.autoQA.action.time')
        report['errors'] = errors
        assert not errors, errors
        (OUT/'viewer.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf8')
        print(json.dumps(report, ensure_ascii=False, indent=2))
        await browser.close()


if __name__ == '__main__':
    asyncio.run(main())
