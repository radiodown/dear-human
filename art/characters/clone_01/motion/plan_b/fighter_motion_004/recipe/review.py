"""Focused Chrome check for seven clips, real input fire, one-shot completion and legacy playback."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

BASE=Path(__file__).resolve().parents[1]
URL='http://127.0.0.1:4173/#/samples/characters/clone_01?plan=b&study=fighter_motion_004&motion=walk'
CLIPS={'walk':'걷기','walk_fire':'걸으며쏴','idle':'정지','idle_fire':'서서쏴','kneel':'앉기','kneel_fire':'앉아쏴','reload':'장전'}


def main():
    reviews=BASE/'reviews'
    reviews.mkdir(exist_ok=True)
    errors=[]
    checks=[]
    clip_results=[]
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe',headless=True)
        page=browser.new_page(viewport={'width':1440,'height':1200},device_scale_factor=1)
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.goto(URL)
        def ready():
            page.wait_for_function("() => document.querySelector('#plan-b-loading').hidden && document.querySelector('#plan-b-canvas').width === 627")
        ready()
        assert page.locator('#plan-b-frame').get_attribute('max')=='7'
        checks.append('Direct motion URL loads an 8-frame/627px track and selects the 12-degree walk.')
        for clip,title in CLIPS.items():
            page.get_by_role('button',name='12° '+title,exact=True).click()
            ready()
            assert 'study=fighter_motion_004' in page.url and 'motion='+clip in page.url
            assert page.locator('#plan-b-frame').get_attribute('max')=='7'
            result={'clip':clip,'url':page.url}
            if clip.endswith('_fire'):
                page.wait_for_timeout(180)
                assert page.locator('#plan-b-shot-count').inner_text()=='0발'
                page.get_by_role('button',name='단발',exact=True).click()
                assert page.locator('#plan-b-shot-count').inner_text()=='1발'
                page.wait_for_timeout(210)
                assert page.locator('#plan-b-shot-count').inner_text()=='1발'
                page.locator('#plan-b-view').screenshot(path=str(reviews/f'browser-{clip}.png'))
                hold=page.get_by_role('button',name='누르고 연사',exact=True)
                box=hold.bounding_box()
                page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2)
                page.mouse.down()
                page.wait_for_timeout(360)
                count=int(page.locator('#plan-b-shot-count').inner_text().removesuffix('발'))
                assert count>=4
                page.mouse.move(5,5)
                page.mouse.up()
                page.wait_for_timeout(200)
                released=page.locator('#plan-b-shot-count').inner_text()
                page.wait_for_timeout(160)
                assert page.locator('#plan-b-shot-count').inner_text()==released
                result.update(no_auto_fire=True,single_shot=True,held_count=count,release_stops=True)
            elif clip in ['kneel','reload']:
                if page.locator('#plan-b-pause').inner_text()=='재생':
                    page.get_by_role('button',name='재생',exact=True).click()
                page.wait_for_function("() => document.querySelector('#plan-b-counter').value.startsWith('07') && document.querySelector('#plan-b-pause').textContent==='재생'")
                last=page.locator('#plan-b-counter').inner_text()
                page.wait_for_timeout(160)
                assert page.locator('#plan-b-counter').inner_text()==last
                page.locator('#plan-b-view').screenshot(path=str(reviews/f'browser-{clip}.png'))
                page.get_by_role('button',name='재생',exact=True).click()
                assert not page.locator('#plan-b-counter').inner_text().startswith('07')
                result.update(one_shot_holds_last=True,replay_restarts=True)
            else:
                if page.locator('#plan-b-pause').inner_text()=='재생':
                    page.get_by_role('button',name='재생',exact=True).click()
                first=page.locator('#plan-b-counter').inner_text()
                page.wait_for_function('(first) => document.querySelector("#plan-b-counter").value !== first',arg=first)
                page.locator('#plan-b-view').screenshot(path=str(reviews/f'browser-{clip}.png'))
                result['animation_advances']=True
            clip_results.append(result)
        checks.append('All seven buttons/URLs load; loops advance, three firing clips accept input, kneel/reload hold the final pose and replay.')
        page.get_by_role('button',name='12° 걷기',exact=True).click()
        ready()
        page.get_by_role('button',name='일시정지',exact=True).click()
        page.locator('#plan-b-frame').evaluate("el => { el.value='7'; el.dispatchEvent(new Event('input',{bubbles:true})); }")
        page.get_by_role('button',name='다음 프레임',exact=True).click()
        assert page.locator('#plan-b-counter').inner_text().startswith('00')
        page.get_by_role('button',name='재생',exact=True).click()
        page.reload()
        ready()
        assert page.get_by_role('button',name='12° 걷기',exact=True).get_attribute('aria-pressed')=='true'
        checks.append('Pause/scrub/next wraps at frame 7; reload restores the selected motion.')
        page.get_by_role('button',name='경계 걷기',exact=True).click()
        page.wait_for_function("() => document.querySelector('#plan-b-loading').hidden && document.querySelector('#plan-b-canvas').width===512")
        assert page.locator('#plan-b-frame').get_attribute('max')=='13'
        first=page.locator('#plan-b-counter').inner_text()
        page.wait_for_function('(first) => document.querySelector("#plan-b-counter").value !== first',arg=first)
        page.get_by_role('button',name='단발',exact=True).click()
        assert page.locator('#plan-b-shot-count').inner_text()=='1발'
        checks.append('Existing 14-frame guard walk still advances and accepts one input shot.')
        page.get_by_role('button',name='12° 걷기',exact=True).click()
        ready()
        page.set_viewport_size({'width':500,'height':1000})
        assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth')
        page.locator('#plan-b-view').screenshot(path=str(reviews/'browser-narrow.png'))
        checks.append('500px layout has no horizontal page overflow.')
        browser.close()
    result={'status':'passed' if not errors else 'failed','url':URL,'browser':'Separate local headless Windows Chrome; earlier in-app bootstrap unavailable (missing sandboxPolicy).',
            'checks':checks,'clips':clip_results,'page_errors':errors,'art_acceptance':'awaiting_user_review',
            'scope':'Short new-family playback/input/one-shot/URL review plus one legacy 14-frame smoke check; no full suite or GIF.'}
    (reviews/'browser.json').write_bytes((json.dumps(result,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
    print(json.dumps(result,ensure_ascii=False,indent=2))
    if errors:raise SystemExit(1)


if __name__=='__main__':main()
