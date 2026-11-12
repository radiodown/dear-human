"""Small local Chromium render review of the authored GLB; no runtime/game writes."""
import asyncio
import json
import sys
from pathlib import Path
from playwright.async_api import async_playwright

VERSION = sys.argv[1] if len(sys.argv)>1 else 'loadout_012'
OUT = Path('art/characters/clone_01/motion/glb_model_001')/VERSION/'reviews'


async def main():
    OUT.mkdir(parents=True,exist_ok=True)
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
        for label,t in [('ready',0),('grasp',.77),('extract',1.05),('pouch',1.48),('insert',2.04),('seated',2.18),('return',2.8)]:
            await page.evaluate('''t=>{const r=window.review;r.mixer.setTime(t);r.model.scene.updateMatrixWorld(true);r.renderer.render(r.scene,r.camera)}''',t)
            await page.screenshot(path=str(OUT/f'{label}.png'))
        # Both default side view and front reveal hand/weapon occlusion.
        for label,pos in [('side',[-3,.75,0]),('front',[0,.75,3])]:
            await page.evaluate('''({pos})=>{const r=window.review;r.camera.position.set(...pos);r.camera.lookAt(0,.66,.13);r.mixer.setTime(1.05);r.renderer.render(r.scene,r.camera)}''',{'pos':pos})
            await page.screenshot(path=str(OUT/f'extract_{label}.png'))
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
        assert not errors,errors
        (OUT/'viewer.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf8',newline='\n')
        print(json.dumps(checks,ensure_ascii=True))
        await browser.close()


if __name__=='__main__': asyncio.run(main())
