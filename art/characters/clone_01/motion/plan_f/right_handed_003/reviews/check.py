from pathlib import Path
import json
from playwright.sync_api import sync_playwright
OUT=Path(__file__).resolve().parent
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1400,'height':1100},device_scale_factor=1)
    page.set_default_timeout(60000)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:4173/#/samples/characters/clone_01?plan=f&fPose=neutral&fYaw=0&fPitch=0',wait_until='networkidle')
    page.locator('#plan-f-loading').wait_for(state='hidden')
    hands=page.evaluate((OUT/'check-hands.js').read_text(encoding='utf-8'))
    (OUT/'hand-checks.json').write_text(json.dumps(hands,indent=2),encoding='utf-8')
    print('Hand checks:',len(hands['poses']),hands['triggerFinger'],flush=True)
    body=page.evaluate((OUT.parent.parent/'human_proportion_002/reviews/verify-body.js').read_text(encoding='utf-8'))
    (OUT/'body-checks.json').write_text(json.dumps(body,indent=2),encoding='utf-8')
    print('Body checks:',len(body['poses']),max(x['maxEdge'] for x in body['poses']),flush=True)
    page.locator('#plan-f-neutral').click();page.locator('#plan-f-pause').click()
    page.locator('#plan-f-stage').screenshot(path=str(OUT/'right-trigger-side.png'))
    page.locator('[data-f-view="front"]').click()
    page.locator('#plan-f-stage').screenshot(path=str(OUT/'right-trigger-front.png'))
    (OUT/'browser-errors.json').write_text(json.dumps(errors,indent=2),encoding='utf-8')
    assert not errors,errors
    browser.close()
