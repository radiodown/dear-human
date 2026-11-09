"""Focused display and routing check for the revised shallow camera and opened torso."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

BASE = Path(__file__).resolve().parents[1]
URL = 'http://127.0.0.1:4173/#/samples/characters/clone_01?plan=b&study=fighter_view_002'


def main():
    reviews = BASE / 'reviews'
    reviews.mkdir(exist_ok=True)
    errors = []
    checks = []
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe', headless=True)
        page = browser.new_page(viewport={'width':1440, 'height':1100}, device_scale_factor=1)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(URL)

        def ready():
            page.wait_for_function("""() => {
                const image = document.querySelector('#plan-b-pixel-image');
                return image.src.includes('fighter_view_002/output/baseline.png') && image.complete && image.naturalWidth > 0
                    && document.querySelector('#plan-b-pixel-loading').hidden;
            }""")

        ready()
        assert page.get_by_role('button', name='격투게임식 · 12° 기준', exact=True).get_attribute('aria-pressed') == 'true'
        assert page.locator('#plan-b-walk-view').is_hidden()
        assert page.locator('#plan-b-fire-controls').is_hidden()
        assert page.locator('#plan-b-pixel-view').is_visible()
        image_size = page.locator('#plan-b-pixel-image').evaluate('(el) => [el.naturalWidth, el.naturalHeight]')
        checks.append('Direct address selects the static angle sample; image decoded; animation/fire controls hidden.')
        page.locator('#plan-b-view').screenshot(path=str(reviews / 'browser-angle.png'))
        page.locator('#plan-b-pixel-background').select_option('dark')
        assert 'bg-dark' in page.locator('#plan-b-pixel-stage').get_attribute('class')
        page.locator('#plan-b-pixel-background').select_option('grid')
        assert 'bg-grid' in page.locator('#plan-b-pixel-stage').get_attribute('class')
        page.locator('#plan-b-pixel-size').select_option('small')
        assert page.locator('#plan-b-pixel-image').bounding_box()['width'] <= 256
        page.locator('#plan-b-pixel-size').select_option('large')
        checks.append('Existing background and display-size controls work for the new angle.')
        page.get_by_text('30°와 격투게임식 시점 비교', exact=True).click()
        page.wait_for_function("() => [...document.querySelectorAll('#plan-b-angle-comparison img')].every(i => i.complete && i.naturalWidth > 0)")
        page.locator('#plan-b-angle-comparison').screenshot(path=str(reviews / 'browser-comparison.png'))
        checks.append('Previous 30-degree and revised 12-degree images load in the comparison disclosure.')
        page.get_by_text('이전 버전·기준 외형', exact=True).click()
        page.get_by_role('button', name='30° 내려보기 · 기준', exact=True).click()
        page.wait_for_function("() => document.querySelector('#plan-b-pixel-image').src.includes('camera_pitch30_001/output/baseline.png') && document.querySelector('#plan-b-pixel-image').complete")
        assert page.locator('#plan-b-angle-summary').inner_text() == '정측면과 30° 내려보기 비교'
        assert page.locator('#plan-b-angle-current').get_attribute('src').endswith('camera_pitch30_001/output/baseline.png')
        assert 'study=camera_pitch30_001' in page.url
        page.get_by_role('button', name='격투게임식 · 12° 기준', exact=True).click()
        ready()
        assert 'study=fighter_view_002' in page.url
        assert page.locator('#plan-b-walk-view').is_hidden()
        assert page.locator('#plan-b-angle-summary').inner_text() == '30°와 격투게임식 시점 비교'
        checks.append('Previous 30-degree view remains available; switching restores each image, comparison and URL.')
        page.reload()
        ready()
        checks.append('Reload restores the camera-angle selection.')
        page.set_viewport_size({'width':500, 'height':1000})
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
        page.locator('#plan-b-view').screenshot(path=str(reviews / 'browser-narrow.png'))
        checks.append('500px layout has no horizontal page overflow.')
        browser.close()

    result = {
        'status': 'passed' if not errors else 'failed', 'url': URL,
        'browser': 'Separate headless local Windows Chrome through Playwright. In-app browser bootstrap unavailable: missing sandboxPolicy.',
        'decoded_size': image_size, 'checks': checks, 'page_errors': errors,
        'art_acceptance': 'awaiting_user_review',
        'scope': 'One still and its display/URL integration only; no animation-art validation or complete test suite.'
    }
    (reviews / 'browser.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if errors:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
