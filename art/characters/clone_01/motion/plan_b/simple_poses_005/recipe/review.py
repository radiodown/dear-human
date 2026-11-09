"""Focused static-only image, selection, gallery and URL check; never runs animation work."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

BASE=Path(__file__).resolve().parents[1]
URL='http://127.0.0.1:4173/#/samples/characters/clone_01?plan=b&study=simple_poses_005&pose=idle'
BUTTONS={'idle':'심플 · 정지','walk':'심플 · 걷기 자세','walk_fire':'심플 · 걷기 사격',
         'idle_fire':'심플 · 정지 사격','kneel':'심플 · 앉기 자세','kneel_fire':'심플 · 앉아쏴','reload':'심플 · 장전 자세'}


def main():
    errors=[]
    reports=[]
    directory=BASE/'reviews'
    directory.mkdir(exist_ok=True)
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe',headless=True)
        page=browser.new_page(viewport={'width':1440,'height':1200},device_scale_factor=1)
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.goto(URL)
        def ready(pose):
            page.wait_for_function("""pose => {
                const image=document.querySelector('#plan-b-pixel-image');
                return image.src.includes('/simple_poses_005/'+pose+'/output/pose.png') && image.complete && image.naturalWidth>0
                    && document.querySelector('#plan-b-pixel-loading').hidden;
            }""",arg=pose)
        ready('idle')
        for pose,label in BUTTONS.items():
            page.get_by_role('button',name=label,exact=True).click()
            ready(pose)
            assert 'study=simple_poses_005' in page.url and 'pose='+pose in page.url
            assert page.locator('#plan-b-walk-view').is_hidden()
            assert page.locator('#plan-b-fire-controls').is_hidden()
            assert page.locator('#plan-b-pixel-view').is_visible()
            source=page.locator('#plan-b-pixel-image').get_attribute('src')
            page.wait_for_timeout(100)
            assert page.locator('#plan-b-pixel-image').get_attribute('src')==source
            reports.append({'pose':pose,'decoded':True,'static':True,'url':page.url})
        page.locator('#plan-b-view').screenshot(path=str(directory/'browser-reload-pose.png'))
        page.get_by_text('심플 원화 7자세 한눈에 보기',exact=True).click()
        page.get_by_alt_text('심플 장전 자세 원화',exact=True).scroll_into_view_if_needed()
        page.wait_for_function("() => [...document.querySelectorAll('#plan-b-simple-gallery img')].every(i => i.complete && i.naturalWidth>0)")
        page.locator('#plan-b-simple-gallery').screenshot(path=str(directory/'browser-gallery.png'))
        page.get_by_role('button',name='심플 · 정지',exact=True).click()
        ready('idle')
        page.get_by_text('상세형과 심플·슬림형 비교',exact=True).click()
        page.wait_for_function("() => [...document.querySelectorAll('#plan-b-angle-comparison img')].every(i => i.complete && i.naturalWidth>0)")
        page.locator('#plan-b-angle-comparison').screenshot(path=str(directory/'browser-style-comparison.png'))
        page.reload()
        ready('idle')
        assert page.get_by_role('button',name='심플 · 정지',exact=True).get_attribute('aria-pressed')=='true'
        page.locator('#plan-b-pixel-background').select_option('dark')
        page.locator('#plan-b-pixel-size').select_option('small')
        assert page.locator('#plan-b-pixel-image').bounding_box()['width']<=256
        page.locator('#plan-b-pixel-size').select_option('large')
        page.locator('#plan-b-pixel-background').select_option('light')
        page.set_viewport_size({'width':500,'height':1000})
        assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth')
        page.locator('#plan-b-view').screenshot(path=str(directory/'browser-narrow.png'))
        browser.close()
    result={'status':'passed' if not errors else 'failed','url':URL,'poses':reports,
            'checks':['Seven separate stills decoded; correct selection and pose URL.','Animation and input-fire controls hidden in every new pose.','Static all-pose gallery and detailed/simple style comparison.','Reload restoration, display size/background, 500px layout.'],
            'browser':'Separate local headless Windows Chrome; in-app bootstrap earlier unavailable (missing sandboxPolicy).',
            'page_errors':errors,'art_acceptance':'awaiting_user_review','motion_work':'Stopped by user; no new animation checks or execution.'}
    (directory/'browser.json').write_bytes((json.dumps(result,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
    print(json.dumps(result,ensure_ascii=False,indent=2))
    if errors:raise SystemExit(1)


if __name__=='__main__':main()
