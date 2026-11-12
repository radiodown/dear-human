from pathlib import Path
import json
from playwright.sync_api import sync_playwright
OUT=Path(__file__).resolve().parent
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1200,'height':1000},device_scale_factor=1)
    page.set_default_timeout(60000)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:4173/#/samples/characters/clone_01?plan=f&fPose=neutral&fYaw=90&fPitch=0',wait_until='networkidle')
    page.locator('#plan-f-loading').wait_for(state='hidden')
    checks={}
    checks['neutral_from_url']=page.locator('#plan-f-neutral').get_attribute('aria-pressed')=='true'
    checks['combat_buttons_disabled']=page.locator('#plan-f-shot').is_disabled() and page.locator('#plan-f-crouch').is_disabled()
    page.locator('#plan-f-stage').focus();page.keyboard.press('j')
    checks['neutral_does_not_fire']=page.locator('#plan-f-ammo').inner_text()=='30 / 30'
    page.locator('#plan-f-post').uncheck()
    page.locator('#plan-f-neutral').click()
    page.locator('#plan-f-pause').click()
    page.locator('#plan-f-crouch').click()
    checks['crouch_when_paused']=page.locator('#plan-f-crouch').get_attribute('aria-pressed')=='true'
    page.locator('#plan-f-neutral').click()
    page.locator('#plan-f-neutral').click()
    checks['crouch_preserved_after_neutral']=page.locator('#plan-f-crouch').get_attribute('aria-pressed')=='true'
    page.locator('#plan-f-shot').click()
    page.wait_for_function("document.getElementById('plan-f-ammo').textContent==='29 / 30'")
    checks['single_shot_after_neutral']=True
    page.locator('#plan-f-pause').click()
    page.locator('[data-f-view="side"]').click()
    page.locator('#plan-f-stage').screenshot(path=str(OUT/'crouch-side.png'))
    page.locator('#plan-f-crouch').click()
    page.locator('#plan-f-pause').click()
    page.locator('#plan-f-stage').focus();page.keyboard.down('a')
    page.wait_for_function("parseFloat(document.getElementById('plan-f-position').textContent)<-.05")
    page.keyboard.up('a');page.locator('#plan-f-pause').click()
    checks['left_movement']=True
    page.locator('#plan-f-neutral').click();page.locator('[data-f-view="front"]').click()
    checks['front_follows_left_facing']=page.locator('#plan-f-camera-yaw').input_value()=='-90'
    checks['neutral_url_written']='fPose=neutral' in page.url
    checks['no_page_errors']=not errors
    (OUT/'control-checks.json').write_text(json.dumps({'checks':checks,'errors':errors},indent=2),encoding='utf-8')
    print(json.dumps(checks),flush=True)
    assert all(checks.values()),checks
    browser.close()
