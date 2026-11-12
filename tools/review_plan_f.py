"""Small, targeted local Chrome check for Plan F movement and firing."""
from pathlib import Path
import json
import time
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'art/characters/clone_01/motion/plan_f/procedural_003/review'
OUT.mkdir(parents=True, exist_ok=True)

def until(predicate):
    deadline=time.monotonic()+10
    while not predicate():
        if time.monotonic()>deadline: raise AssertionError('UI condition timed out')
        time.sleep(.05)


with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe', headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1100}, device_scale_factor=1)
    errors, requests = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('console', lambda msg: errors.append(msg.text) if msg.type=='error' else None)
    page.on('request', lambda request: requests.append(request.url))
    page.goto('http://127.0.0.1:4173/#/samples/characters/clone_01?plan=f')
    page.locator('#plan-f-loading').wait_for(state='hidden')
    stage = page.locator('#plan-f-stage')
    stage.screenshot(path=str(OUT / 'idle.png'))
    stage.focus()
    page.keyboard.down('KeyD')
    page.keyboard.down('Space')
    until(lambda: float(page.locator('#plan-f-position').inner_text().split()[0])>.6 and int(page.locator('#plan-f-shots').inner_text().split()[0])>=4)
    stage.screenshot(path=str(OUT / 'moving-fire.png'))
    page.keyboard.up('Space')
    page.keyboard.up('KeyD')
    shots = int(page.locator('#plan-f-shots').inner_text().split()[0])
    x = float(page.locator('#plan-f-position').inner_text().split()[0])
    page.wait_for_timeout(220)  # More than two fire intervals: release must stop fire.
    assert int(page.locator('#plan-f-shots').inner_text().split()[0]) == shots
    stage.focus()
    page.keyboard.down('KeyA')
    until(lambda: float(page.locator('#plan-f-position').inner_text().split()[0])<x-.3)
    page.keyboard.up('KeyA')
    page.locator('#plan-f-pause').click()
    frozen = page.locator('#plan-f-position').inner_text()
    stage.focus()
    page.keyboard.down('KeyD')
    page.keyboard.down('Space')
    page.wait_for_timeout(220)
    assert page.locator('#plan-f-position').inner_text() == frozen
    assert int(page.locator('#plan-f-shots').inner_text().split()[0]) == shots
    page.keyboard.up('KeyD'); page.keyboard.up('Space')
    page.locator('#plan-f-reset').click()
    until(lambda: page.locator('#plan-f-shots').inner_text()=='0 발')
    fire = page.locator('[data-f-input="fire"]')
    fire.hover(); page.mouse.down()
    until(lambda: int(page.locator('#plan-f-shots').inner_text().split()[0])>=2)
    page.mouse.up()
    pointer_shots = int(page.locator('#plan-f-shots').inner_text().split()[0])
    page.wait_for_timeout(220)
    assert int(page.locator('#plan-f-shots').inner_text().split()[0]) == pointer_shots
    page.locator('#mode-reference').click()
    assert page.locator('#plan-f-view').is_hidden()
    page.wait_for_timeout(220)
    assert int(page.locator('#plan-f-shots').inner_text().split()[0]) == pointer_shots
    page.locator('#mode-plan-f').click()
    assert 'plan=f' in page.url
    page.locator('#plan-f-reset').click()
    page.locator('#plan-f-speed').select_option('0.25')
    page.locator('#plan-f-shot').click()
    until(lambda: int(page.locator('#plan-f-shots').inner_text().split()[0])==1)
    page.wait_for_timeout(650)
    assert int(page.locator('#plan-f-shots').inner_text().split()[0]) == 1
    stage.focus(); page.keyboard.down('Space')
    until(lambda: int(page.locator('#plan-f-shots').inner_text().split()[0])>=2)
    slow_start = int(page.locator('#plan-f-shots').inner_text().split()[0])
    page.wait_for_timeout(850)
    slow_count = int(page.locator('#plan-f-shots').inner_text().split()[0])-slow_start
    page.keyboard.up('Space')
    assert 1 <= slow_count <= 3, slow_count
    page.locator('#plan-f-speed').select_option('1')
    page.locator('#plan-f-reset').click()
    page.set_viewport_size({'width': 650, 'height': 1000})
    stage.screenshot(path=str(OUT / 'narrow.png'))
    page.locator('.f-controls').screenshot(path=str(OUT / 'narrow-controls.png'))
    assert page.locator('#plan-f-shot').is_visible()
    assert page.locator('.f-options').bounding_box()['width'] <= page.locator('.f-controls').bounding_box()['width']
    assert page.locator('#plan-f-canvas').bounding_box()['width'] > 0
    assert not errors, errors
    external_models = [u for u in requests if any(u.split('?')[0].endswith(ext) for ext in ('.glb', '.gltf', '.fbx'))]
    assert not external_models, external_models
    result = {'status': 'passed', 'scope': ['initial rendering', 'keyboard movement both directions', 'moving fire', 'release stops fire', 'pause freezes position and shots', 'reset', 'pointer fire/release', 'tab stop/reentry', 'single shot fires exactly once', 'quarter speed firing cadence', 'narrow viewport', 'no GLB/FBX requests'], 'browser': browser.version, 'page_errors': errors, 'external_model_requests': external_models, 'art_review': 'awaiting_user_review', 'note': 'The existing library still loads its reference artwork; Plan F itself uses generated geometry only.'}
    (OUT / 'result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(result, ensure_ascii=False))
    browser.close()
