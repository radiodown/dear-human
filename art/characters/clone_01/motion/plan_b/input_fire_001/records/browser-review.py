from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT=Path('/Users/jin/Desktop/dear-human/art/characters/clone_01/motion/plan_b/input_fire_001')
URL='http://127.0.0.1:4173/#/samples/characters/clone_01?plan=b'
report={'status':'running','url':URL,'browser':'Local macOS Chrome via Playwright',
        'scope':'Focused actual-canvas input/shot-count/release and narrow UI review; no full-game tests.',
        'checks':[],'page_errors':[]}
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless=True)
    page=browser.new_page(viewport={'width':1280,'height':1100},bypass_csp=True)
    page.set_default_timeout(10000)
    page.on('pageerror',lambda e:report['page_errors'].append(str(e)))
    def count():
        return int(page.locator('#plan-b-shot-count').inner_text().removesuffix('발'))
    def wait_ready(study):
        page.wait_for_function("document.querySelector('#plan-b-loading').hidden && !document.querySelector('#plan-b-shot').disabled",polling=50)
        assert page.locator(f'[data-plan-b-study="{study}"]').get_attribute('aria-pressed')=='true'
        assert page.locator('#error').is_hidden(),page.locator('#error').inner_text()
    def select(study):
        page.locator(f'[data-plan-b-study="{study}"]').click();wait_ready(study)
    def hold_down():
        page.locator('#plan-b-hold').hover();page.mouse.down()
    def release_outside():
        page.mouse.move(5,5);page.mouse.up()
    try:
        page.goto(URL,wait_until='networkidle');page.wait_for_timeout(500);wait_ready('guard-walk')
        page.wait_for_timeout(1150);assert count()==0
        report['checks'].append('Default guarded walk runs without unsolicited shots.')
        page.locator('#plan-b-shot').click()
        # Freeze the live firing pose through the real pause control, rather than
        # seeking a baked review frame that did not fire an input-driven shot.
        page.wait_for_function("()=>{if(document.querySelector('#plan-b-shot-count').value==='1발' && document.querySelector('#plan-b-fire-state').textContent==='발사'){document.querySelector('#plan-b-pause').click();return true;}return false;}",polling=10)
        page.locator('#plan-b-view').screenshot(path=str(ROOT/'reviews/walk-single.png'))
        assert count()==1
        page.locator('#plan-b-pause').click()
        page.wait_for_timeout(1450);assert count()==1
        report['checks'].append('One click fires exactly once; live shot/recoil recovers while walking continues.')
        hold_down()
        page.wait_for_function("parseInt(document.querySelector('#plan-b-shot-count').value)>=3",polling=20)
        release_outside();released=count()
        page.wait_for_timeout(1150);assert count()==released
        assert page.locator('#plan-b-hold').get_attribute('aria-pressed')=='false'
        assert page.locator('#plan-b-shot').is_enabled()
        report['pointer_release_count']=released
        report['checks'].append('Held pointer repeats; release outside the button stops further shots and completes recovery.')
        before=count();page.locator('#plan-b-hold').focus();page.keyboard.down('Space')
        page.wait_for_function('(n)=>parseInt(document.querySelector("#plan-b-shot-count").value)>n',arg=before,polling=20)
        page.keyboard.up('Space');released=count();page.wait_for_timeout(1100);assert count()==released
        report['checks'].append('Focused hold button supports keyboard press/release without repeated keydown shots.')
        hold_down();page.wait_for_timeout(650)
        page.evaluate("window.dispatchEvent(new Event('blur'))")
        release_outside();released=count();page.wait_for_timeout(1100);assert count()==released
        report['checks'].append('Window blur cancels the held trigger and pending input.')
        select('guard-fire');page.wait_for_timeout(650);assert count()==0
        report['checks'].append('Walking-fire tab also waits for input instead of auto-firing its baked loop.')
        select('kneel-fire');page.wait_for_timeout(600);assert count()==0
        page.locator('#plan-b-shot').click();assert count()==1
        page.wait_for_timeout(750);assert count()==1
        assert page.locator('#plan-b-frame').input_value()=='0'
        report['checks'].append('Kneeling single shot starts immediately and returns to clean idle; no second shot.')
        hold_down()
        page.wait_for_function("parseInt(document.querySelector('#plan-b-shot-count').value)>=3",polling=20)
        release_outside();released=count();page.wait_for_timeout(700);assert count()==released
        assert page.locator('#plan-b-frame').input_value()=='0'
        report['kneeling_release_count']=released
        report['checks'].append('Kneeling automatic fire repeats and returns to idle after the final recoil.')
        page.locator('#plan-b-cross-first').click();assert count()==released
        assert page.locator('#plan-b-frame').input_value()=='5'
        page.locator('#plan-b-pause').click();page.wait_for_timeout(600);assert count()==released
        assert page.locator('#plan-b-frame').input_value()=='0'
        report['checks'].append('Manual pose review emits no shot and resumes into clean waiting pose.')
        select('kneel-fire');assert page.locator('#plan-b-shot').is_enabled()
        page.locator('#plan-b-history summary').click()
        page.locator('[data-plan-b-study="pixel-walk-004"]').click()
        page.wait_for_function("document.querySelector('#plan-b-loading').hidden",polling=50)
        assert page.locator('#plan-b-fire-controls').is_hidden()
        select('kneel-fire');page.locator('#plan-b-history summary').click()
        report['checks'].append('Archived studies remain playback-only; cached current tab restores usable controls.')
        page.set_viewport_size({'width':500,'height':1100})
        for target in ['#plan-b-shot','#plan-b-hold','#plan-b-shot-count']:
            box=page.locator(target).bounding_box();assert box['x']>=0 and box['x']+box['width']<=500,box
        page.locator('#plan-b-view').screenshot(path=str(ROOT/'reviews/narrow-kneeling.png'))
        report['checks'].append('Shot/hold/count controls fit500px.')
        assert not report['page_errors'],report['page_errors']
        report['status']='passed'
    except Exception as e:
        report['status']='failed';report['failure']=str(e)
        report['page_state']=page.evaluate("({load:document.querySelector('#plan-b-loading')?.textContent,loading:!document.querySelector('#plan-b-loading')?.hidden,error:document.querySelector('#error')?.textContent})")
        raise
    finally:
        (ROOT/'reviews/browser.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
        print(json.dumps(report,ensure_ascii=False,indent=2),flush=True)
        browser.close()
