"""Focused actual Three.js body recoil, contacts, cues and viewer checks for AR-12 018."""
import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright

OUT = Path('art/characters/clone_01/motion/glb_model_001/loadout_018/reviews')
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
        report = await page.evaluate('''async () => {
          const r=window.autoQA, T=r.THREE, root=r.current.root;
          const {firingCues}=await import('/glb-gun-fx.js');
          const clip=r.action.getClip(), cues=firingCues(clip.name,clip.duration);
          const gun=root.getObjectByName('weapon').children.find(n=>!n.isBone);
          const hands=['Left','Right'].map(s=>root.getObjectByName('mixamorig'+s+'Hand'));
          const feet=['Left','Right'].map(s=>root.getObjectByName('mixamorig'+s+'Foot'));
          const mags=['reload_magazine_old','reload_magazine_fresh'].map(n=>root.getObjectByName(n));
          const pose=t=>{
            r.action.time=t;r.current.mixer.update(0);
            if(r.inPlace&&r.current.hips){r.current.hips.position.x=r.current.hipsRest.x;r.current.hips.position.z=r.current.hipsRest.z}
            root.updateMatrixWorld(true);r.gunFx.update(clip.name,t,clip.duration);
          };
          pose(0);
          const offsets=hands.map(n=>gun.matrixWorld.clone().invert().multiply(n.matrixWorld));
          const planted=feet.map(n=>n.getWorldPosition(new T.Vector3()));
          const bodyNames=['Hips','Spine','Spine1','Spine2','Neck','Head','RightShoulder','LeftShoulder'];
          const body=bodyNames.map(n=>root.getObjectByName('mixamorig'+n));
          const bodyStart=body.map(n=>n.quaternion.clone());
          const bodyRotationDegrees=Object.fromEntries(bodyNames.map(n=>[n,0]));
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
            body.forEach((n,i)=>bodyRotationDegrees[bodyNames[i]]=Math.max(bodyRotationDegrees[bodyNames[i]],n.quaternion.angleTo(bodyStart[i])*180/Math.PI));
            const count=mags.filter(n=>n.scale.x>.5).length;gaps+=count===0;duplicates+=count>1;
            maxSmoke=Math.max(maxSmoke,r.gunFx.smoke.length);maxSparks=Math.max(maxSparks,r.gunFx.sparks.length);
          }
          r.gunFx.emitSmoke=emit;
          const matrixSnapshot=()=>[gun,...hands,...feet].map(n=>n.matrixWorld.elements.slice());
          pose(0);const first=matrixSnapshot();pose(clip.duration);const last=matrixSnapshot();
          const seam=Math.max(...first.flatMap((a,i)=>a.map((v,j)=>Math.abs(v-last[i][j]))));
          r.gunFx.reset();pose(.025);const flash=r.gunFx.mounts[0].group.visible;
          pose(.065);const darkGap=!r.gunFx.mounts[0].group.visible;
          return {source:r.source.url,clips:r.current.clips.map(c=>c.name),duration:clip.duration,
            cues:cues.map(c=>c.time),samples:800,emissions,maxContact,maxFoot,bodyRotationDegrees,gaps,duplicates,seam,maxSmoke,maxSparks,flash,darkGap};
        }''')
        assert report['emissions'] == 40, report
        assert report['maxContact'] < .0002 and report['maxFoot'] < .01, report
        assert report['bodyRotationDegrees']['Hips'] > 2.5 and report['bodyRotationDegrees']['Head'] > 2, report
        assert report['bodyRotationDegrees']['Spine'] > 1 and report['bodyRotationDegrees']['RightShoulder'] > 3, report
        assert report['seam'] < 1e-6 and not report['gaps'] and not report['duplicates'], report
        assert report['flash'] and report['darkGap'], report
        await page.evaluate("()=>{const r=window.autoQA;r.gunFx.reset();r.action.time=.03;r.current.mixer.update(0);r.render()}")
        await page.locator('#glb-stage').screenshot(path=str(OUT/'full_auto_side.png'))
        await page.evaluate("()=>{const r=window.autoQA;r.camera.position.set(-3,.8,2);r.camera.lookAt(0,.6,.1);r.render()}")
        await page.locator('#glb-stage').screenshot(path=str(OUT/'full_auto_angle.png'))
        await page.evaluate('()=>window.autoQA.placeCamera()')
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
