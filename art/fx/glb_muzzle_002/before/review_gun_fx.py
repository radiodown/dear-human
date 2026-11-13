"""Focused Chromium checks for muzzle placement, shot cues and GLB viewer lifecycle."""
import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright

OUT=Path('art/fx/glb_muzzle_001/reviews')


async def main():
    OUT.mkdir(parents=True,exist_ok=True)
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True)
        page=await browser.new_page(viewport={'width':1300,'height':950},bypass_csp=True)
        errors=[]; page.on('pageerror',lambda e:errors.append(str(e)))
        source=Path('game/app.js').read_text(encoding='utf8')
        await page.route('**/app.js',lambda route:route.fulfill(status=200,content_type='text/javascript',body=source+'\nwindow.fxQA=glb;'))
        checks={}

        async def open_model(char,loadout,clip):
            await page.goto(f'http://127.0.0.1:4173/#/samples/characters/{char}?plan=glb&loadout={loadout}&clip={clip}&paused=1')
            await page.wait_for_function('([char,loadout,clip])=>window.fxQA?.current?.key===`${char}|${loadout}` && window.fxQA?.action?.getClip().name===clip',arg=[char,loadout,clip])

        async def pose(clip,t,reset=True):
            return await page.evaluate('''({clip,t,reset})=>{
              const r=window.fxQA;if(r.clipName!==clip)r.setClip(clip);
              if(reset)r.gunFx.reset();r.action.time=t;r.current.mixer.update(0);r.render();
              return {clip:r.clipName,time:r.action.time,mounts:r.gunFx.mounts.map(m=>({side:m.side,visible:m.group.visible,
                point:m.group.getWorldPosition(new r.THREE.Vector3()).toArray(),light:m.light.intensity})),smoke:r.gunFx.smoke.length};
            }''',{'clip':clip,'t':t,'reset':reset})

        await open_model('clone_01','ar12_rupture','gunplay')
        checks['rifle_before']=await pose('gunplay',.10)
        checks['rifle_shot']=await pose('gunplay',.14)
        assert checks['rifle_shot']['mounts'][0]['visible']
        assert not checks['rifle_before']['mounts'][0]['visible']
        await page.locator('#glb-stage').screenshot(path=str(OUT/'rifle_flash.png'))
        # Render once more without advancing time: paused light/smoke must stay unchanged.
        checks['paused']=await pose('gunplay',.14,False)
        assert checks['paused']==checks['rifle_shot']
        checks['rifle_after']=await pose('gunplay',.29,False)
        assert not checks['rifle_after']['mounts'][0]['visible']
        assert checks['rifle_after']['smoke']>0
        await page.locator('#glb-stage').screenshot(path=str(OUT/'rifle_smoke.png'))
        checks['rifle_auto']=await pose('gunplay_auto',.10)
        checks['rifle_walk_fire']=await pose('shoot_rifle',.22)
        await page.locator('#glb-gun-effects').uncheck()
        checks['disabled']=await pose('gunplay',.14)
        assert not any(m['visible'] for m in checks['disabled']['mounts'])
        assert not checks['disabled']['smoke']
        await page.locator('#glb-gun-effects').check()
        checks['reload']=await pose('rifle_reload',1.1)
        assert not any(m['visible'] for m in checks['reload']['mounts'])
        assert not checks['reload']['smoke']
        checks['idle']=await pose('rifle_aim_idle',.2)
        await page.locator('[data-loadout="hp14t_gemini"]').click()
        await page.wait_for_function("()=>window.fxQA.current?.key==='clone_01|hp14t_gemini'")
        checks['dual_right']=await pose('dual_fire',.02)
        checks['dual_left']=await pose('dual_fire',.27)
        assert [m['side'] for m in checks['dual_right']['mounts'] if m['visible']]==['right']
        assert [m['side'] for m in checks['dual_left']['mounts'] if m['visible']]==['left']
        await page.locator('#glb-stage').screenshot(path=str(OUT/'dual_left_flash.png'))
        await page.locator('#glb-turn').click()
        await page.locator('#glb-stage').screenshot(path=str(OUT/'dual_left_reverse.png'))
        checks['dual_kneel']=await pose('dual_kneel_fire',.52)
        # Run actual slow playback across the next authored shot cue.
        await pose('dual_fire',.18)
        await page.locator('#glb-speed').select_option('.25'); await page.locator('#glb-pause').click()
        await page.wait_for_function('()=>window.fxQA.action.time>.26')
        await page.locator('#glb-pause').click()
        checks['slow_time']=await page.evaluate('window.fxQA.action.time')
        await page.locator('[data-loadout=""]').click()
        await page.wait_for_function("()=>window.fxQA.current?.key==='clone_01|'")
        checks['unarmed']=await pose('gunplay',.14)
        assert not checks['unarmed']['mounts'] and not checks['unarmed']['smoke']
        # Every current long-gun loadout uses these same retargeted firing clips.
        for char,weapon in [('iren','ar12_rupture'),('iren','sg23_breacher'),('sena','amr21_nail'),
                            ('sena','pdw9_wasp'),('moa','hmg15_goliath'),('moa','ml70_mule')]:
            await open_model(char,weapon,'gunplay')
            state=await pose('gunplay',.14); checks[char+'_'+weapon]=state
            assert len(state['mounts'])==1 and state['mounts'][0]['visible']
        checks['page_errors']=errors
        assert not errors,errors
        (OUT/'viewer.json').write_text(json.dumps(checks,indent=2),encoding='utf8',newline='\n')
        print(json.dumps({'checks':len(checks),'errors':errors,'rifle_shot':checks['rifle_shot'],'dual_left':checks['dual_left']}))
        await browser.close()


if __name__=='__main__': asyncio.run(main())
