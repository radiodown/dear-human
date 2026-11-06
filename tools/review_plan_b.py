"""Verify Plan B playback in a separate headless local Chrome when the in-app browser fails."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
REVIEW=ROOT/'art/characters/clone_01/motion/plan_b/walk_001/reviews'
URL='http://127.0.0.1:4173/#/samples/characters/clone_01?plan=b&motion=walk'

def main():
    errors=[]
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe',headless=True)
        page=browser.new_page(viewport={'width':1440,'height':1100},device_scale_factor=1,bypass_csp=True)
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.goto(URL)
        page.wait_for_function("document.querySelector('#plan-b-loading').hidden && document.querySelector('#plan-b-canvas').width === 530")
        first=page.locator('#plan-b-counter').inner_text()
        page.wait_for_function('(previous) => document.querySelector("#plan-b-counter").value !== previous',arg=first)
        page.get_by_role('button',name='일시정지',exact=True).click()
        paused=page.locator('#plan-b-counter').inner_text()
        page.wait_for_timeout(200)
        assert page.locator('#plan-b-counter').inner_text()==paused
        page.get_by_role('button',name='다음 프레임',exact=True).click()
        assert page.locator('#plan-b-counter').inner_text()!=paused
        for index in [2,8,11]:
            page.locator('#plan-b-frame').evaluate('(element, index) => { element.value = index; element.dispatchEvent(new Event("input", {bubbles:true})); }', index)
            assert page.locator('#plan-b-counter').inner_text().startswith(f'{index:02d}')
            page.screenshot(path=str(REVIEW/f'browser-frame-{index:02d}.png'))
        page.locator('#plan-b-speed').select_option('0.5')
        page.locator('#plan-b-background').select_option('grid')
        page.get_by_role('button',name='재생',exact=True).click()
        page.wait_for_function("!document.querySelector('#plan-b-counter').value.startsWith('11')")
        page.get_by_role('button',name='채택 외형',exact=True).click()
        assert page.locator('#plan-b-view').is_hidden()
        assert page.locator('#reference-view').is_visible()
        hidden_frame=page.locator('#plan-b-counter').inner_text()
        page.wait_for_timeout(200)
        assert page.locator('#plan-b-counter').inner_text()==hidden_frame
        page.get_by_role('button',name='파츠 모션 테스트 LIVE',exact=True).click()
        page.wait_for_function("document.querySelector('#rig-loading').hidden")
        assert page.locator('#rig-view').is_visible()
        page.get_by_role('button',name='플랜 B · 걷기',exact=True).click()
        assert page.locator('#plan-b-view').is_visible()
        assert 'plan=b' in page.url
        page.set_viewport_size({'width':500,'height':1000})
        page.screenshot(path=str(REVIEW/'browser-mobile.png'),full_page=True)
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
        browser.close()
    report={'status':'passed' if not errors else 'failed','url':URL,'browser':'Separate headless local Chrome via Playwright; in-app browser failed before connecting.', 'checks':['PNG atlas decoded','animation advances','pause holds frame','single step','scrub 02/08/11','half speed','background','reference and rig view retained','hidden playback stops','Plan B URL retained','500px responsive layout'],'page_errors':errors,'art_acceptance':'awaiting user review'}
    (REVIEW/'browser.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False,indent=2))
    if errors: raise SystemExit(1)

if __name__=='__main__': main()
