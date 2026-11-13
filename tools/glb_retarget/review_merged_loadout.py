"""Verify the conflict-resolution merge of rifle 021 and dual pistols 011."""
import asyncio
import json
from pathlib import Path
import numpy as np
from playwright.async_api import async_playwright
from make_rifle_reload import GLB

BASE = Path('art/characters/clone_01/motion/glb_model_001')
OUT = BASE/'loadout_022/reviews'


async def main():
    OUT.mkdir(parents=True,exist_ok=True)
    rifle=GLB(BASE/'loadout_021/clone_01_ar12_rupture.glb')
    pistols=GLB(BASE/'loadout_011/clone_01_hp14t_gemini.glb')
    merged=GLB(BASE/'loadout_022/clone_01_ar12_hp14t.glb')
    assert merged.bin[:len(rifle.bin)]==rifle.bin
    tracks=0
    for source,renames in [(rifle,{'weapon':'weapon_rifle'}),(pistols,{'weapon':'weapon_pistol_r','weapon_l':'weapon_pistol_l'})]:
        for clip in source.j['animations']:
            target=next(a for a in merged.j['animations'] if a['name']==clip['name'])
            for ch in clip['channels']:
                node=source.j['nodes'][ch['target']['node']];name=node['name']
                if name in renames:name=renames[name]+('_mesh' if 'mesh' in node else '')
                dst=next(c for c in target['channels'] if merged.j['nodes'][c['target']['node']]['name']==name and c['target']['path']==ch['target']['path'])
                a,b=clip['samplers'][ch['sampler']],target['samplers'][dst['sampler']]
                assert a.get('interpolation','LINEAR')==b.get('interpolation','LINEAR')
                for field in ('input','output'):assert np.array_equal(source.read(a[field]),merged.read(b[field]))
                tracks+=1
    checks={'preserved_tracks':tracks,'clips':[a['name'] for a in merged.j['animations']]}
    assert len(checks['clips'])==15
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True)
        page=await browser.new_page(viewport={'width':1100,'height':820},bypass_csp=True)
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        app=Path('game/app.js').read_text(encoding='utf8')
        await page.route('**/app.js',lambda route:route.fulfill(status=200,content_type='text/javascript',body=app+'\nwindow.mergeQA=glb;'))
        await page.goto('http://127.0.0.1:4173/#/samples/characters/clone_01?plan=glb&loadout=ar12_rupture&clip=rifle_reload_empty&paused=1')
        await page.wait_for_function("window.mergeQA?.action?.getClip().name==='rifle_reload_empty'")
        checks['rifle_alias']=await page.evaluate('window.mergeQA.source.url')
        assert '/loadout_022/' in checks['rifle_alias']
        async def pose(name,time):
            await page.locator(f'[data-clip="{name}"]').click()
            return await page.evaluate('''t=>{const r=window.mergeQA;r.action.time=t;r.current.mixer.update(0);r.render();
              const root=r.current.root;return {scales:Object.fromEntries(['weapon_rifle','weapon_pistol_r','weapon_pistol_l','reload_magazine_dropped'].map(n=>[n,root.getObjectByName(n).scale.toArray()])),
                bolt:root.getObjectByName('ar12_reload_bolt').position.x,
                flashes:r.gunFx.mounts.filter(m=>m.group.visible).map(m=>m.gun.name)};}''',time)
        checks['empty_reload']=await pose('rifle_reload_empty',2.44)
        assert checks['empty_reload']['bolt']<-.07
        assert checks['empty_reload']['scales']['reload_magazine_dropped']==[1,1,1]
        checks['dual_after_reload']=await pose('dual_fire',.02)
        assert checks['dual_after_reload']['scales']['weapon_rifle']==[0,0,0]
        assert checks['dual_after_reload']['scales']['reload_magazine_dropped']==[0,0,0]
        assert np.allclose(checks['dual_after_reload']['scales']['weapon_pistol_r'],[1,1,1],atol=1e-6)
        assert len(checks['dual_after_reload']['flashes'])==1 and 'pistol_r' in checks['dual_after_reload']['flashes'][0]
        checks['rifle_after_dual']=await pose('rifle_full_auto',.03)
        assert checks['rifle_after_dual']['scales']['weapon_pistol_r']==[0,0,0]
        assert checks['rifle_after_dual']['scales']['weapon_pistol_l']==[0,0,0]
        assert len(checks['rifle_after_dual']['flashes'])==1 and 'rifle' in checks['rifle_after_dual']['flashes'][0]
        assert abs(checks['rifle_after_dual']['bolt']+.04)<1e-6
        await page.goto('http://127.0.0.1:4173/#/samples/characters/clone_01?plan=glb&loadout=hp14t_gemini&paused=1')
        await page.wait_for_function("window.mergeQA?.action?.getClip().name==='dual_idle'")
        checks['pistol_alias']=await page.evaluate('window.mergeQA.source.url')
        assert '/loadout_022/' in checks['pistol_alias']
        await page.goto('http://127.0.0.1:4173/#/samples/characters/yuna?plan=glb&loadout=shield_hp14&clip=shield_guard&paused=1')
        await page.wait_for_function("window.mergeQA?.action?.getClip().name==='shield_guard'")
        checks['yuna']=await page.evaluate('({url:window.mergeQA.source.url,clips:window.mergeQA.current.clips.map(c=>c.name)})')
        assert '/loadout_008/' in checks['yuna']['url']
        assert 'shield_fire' in checks['yuna']['clips']
        assert not errors,errors
        checks['page_errors']=errors
        await browser.close()
    (OUT/'merge.json').write_text(json.dumps(checks,indent=2),encoding='utf8',newline='\n')
    print(json.dumps(checks))


if __name__=='__main__':asyncio.run(main())
