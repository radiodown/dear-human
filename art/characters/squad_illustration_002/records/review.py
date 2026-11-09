from pathlib import Path
import json
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[4]
records = Path(__file__).parent
results = []
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe', headless=True)
    context = browser.new_context(viewport={'width':1440,'height':1000})
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    for character in ('sena','moa','yuna','iren'):
        response = page.goto(f'http://127.0.0.1:4173/#/samples/characters/{character}?motion=walk', wait_until='networkidle')
        if response is not None:
            assert response.status == 200
        page.wait_for_function("character => document.querySelector('#character-art').src.includes(character + '/concepts/illustration_002/') && document.querySelector('#character-art').naturalWidth === 1024 && !document.querySelector('#character-art').hidden",arg=character)
        assert f'{character}/concepts/illustration_002/' in page.locator('#character-art').get_attribute('src')
        assert page.locator('#mode-rig').is_hidden()
        assert page.locator('#reference-view').is_visible()
        assert page.locator('.nav-item.current').count() == 1
        assert page.locator('#error').is_hidden()
        results.append({'character':character,'sample_image':'002 loaded','unsupported_motion':'reference only','nav_current_count':1})
        if character == 'sena':
            page.screenshot(path=str(records/'sample-sena-desktop.png'))
            page.locator('#revision-select').select_option('illustration_001')
            page.wait_for_function("() => document.querySelector('#character-art').src.includes('illustration_001') && document.querySelector('#character-art').complete")
            page.locator('#revision-select').select_option('illustration_002')
    page.goto('http://127.0.0.1:4173/#/samples/characters/clone_01',wait_until='networkidle')
    assert page.locator('#mode-rig').is_visible()
    assert page.locator('#error').is_hidden()
    for character in ('sena','moa','yuna','iren'):
        page.goto(f'http://127.0.0.1:4175/#/article/{character}',wait_until='networkidle')
        page.wait_for_function("character => document.querySelector('.profile-portrait img')?.src.includes(character + '-illustration-002.png') && document.querySelector('.profile-portrait img').naturalWidth === 1024",arg=character)
        page.locator('.profile-portrait img').evaluate('image => image.decode()')
        page.evaluate('() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
        assert f'{character}-illustration-002.png' in page.locator('.profile-portrait img').get_attribute('src')
        assert '25~26세' in page.locator('.character-profile').inner_text()
        assert '시안 002' in page.locator('.profile-portrait figcaption').inner_text()
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
        results.append({'character':character,'wiki_portrait':'002 loaded','age_profile':'25~26','caption':'review pending'})
    page.screenshot(path=str(records/'wiki-iren-desktop.png'))
    with context.expect_page() as popup:
        page.locator('.profile-portrait a').click()
    popup.value.wait_for_load_state()
    assert 'iren-illustration-002.png' in popup.value.url
    popup.value.close()
    page.set_viewport_size({'width':500,'height':1000})
    page.goto('http://127.0.0.1:4175/#/article/yuna',wait_until='networkidle')
    page.locator('.profile-portrait img').evaluate('image => image.decode()')
    page.evaluate('() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    page.screenshot(path=str(records/'wiki-yuna-mobile.png'),full_page=True)
    assert not errors, errors
    browser.close()
(records/'browser-review.json').write_text(json.dumps({'scope':'four new sample routes and portraits, old-version selection, clone_01 rig button availability, one image open and 500px layout; no motion/game simulation tests','results':results,'page_errors':errors,'art_direction_status':'awaiting_user_review'},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Targeted preview review passed:',len(results),'new-page checks; no page errors.')
