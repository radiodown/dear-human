from pathlib import Path
import json
from playwright.sync_api import sync_playwright

OUT=Path(__file__).resolve().parent
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1400,'height':1100},device_scale_factor=1)
    page.set_default_timeout(60000)
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.on('console',lambda msg:errors.append(msg.text) if msg.type=='error' else None)
    page.goto('http://127.0.0.1:4173/#/samples/characters/clone_01?plan=f&fPose=neutral&fYaw=90&fPitch=0',wait_until='networkidle')
    page.locator('#plan-f-loading').wait_for(state='hidden')
    print('loaded',page.locator('#plan-f-status').inner_text(),flush=True)
    checks=page.evaluate((OUT/'verify-body.js').read_text(encoding='utf-8'))
    (OUT/'body-checks.json').write_text(json.dumps(checks,indent=2),encoding='utf-8')
    print('body checks',checks['distalForearm'],max(x['maxEdge'] for x in checks['poses']),flush=True)
    page.locator('#plan-f-stage').screenshot(path=str(OUT/'neutral-front.png'))
    for side in ['side','back']:
        page.locator('[data-f-view="'+side+'"]').click()
        print(side,page.locator('#plan-f-camera-yaw').input_value(),flush=True)
        page.locator('#plan-f-stage').screenshot(path=str(OUT/f'neutral-{side}.png'))
    page.locator('#plan-f-neutral').click()
    page.locator('#plan-f-pause').click()
    page.locator('[data-f-view="front"]').click()
    page.locator('#plan-f-stage').screenshot(path=str(OUT/'combat-front.png'))
    page.locator('[data-f-view="side"]').click()
    page.locator('#plan-f-stage').screenshot(path=str(OUT/'combat-side.png'))
    print('combat restored',page.locator('#plan-f-neutral').get_attribute('aria-pressed'),flush=True)
    (OUT/'browser-errors.json').write_text(json.dumps(errors,ensure_ascii=False,indent=2),encoding='utf-8')
    browser.close()
