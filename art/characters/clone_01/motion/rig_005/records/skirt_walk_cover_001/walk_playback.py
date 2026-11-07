"""One short live walking check without another capture batch."""
import hashlib
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

errors = []
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1160})
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto('http://127.0.0.1:4174/#/samples/characters/clone_01?motion=walk&time=1.3')
    expect(page.locator('#rig-metrics')).to_contain_text('triangles', timeout=15000)
    before = page.locator('#rig-canvas').evaluate('(c)=>c.toDataURL()')
    page.wait_for_timeout(650)
    after = page.locator('#rig-canvas').evaluate('(c)=>c.toDataURL()')
    expect(page.locator('[data-motion="walk"]')).to_have_attribute('aria-pressed', 'true')
    assert before != after and not errors
    browser.close()
report = {'status': 'passed', 'scope': '650 ms live Chrome walking playback and canvas progression only; no art acceptance.',
          'page_errors': errors, 'canvas_changed': True,
          'runtime_sources': [{'path': path, 'sha256': hashlib.sha256(Path(path).read_bytes()).hexdigest()}
                              for path in ['game/animation/waist.js', 'game/animation/webgl-character.js']]}
output = Path('art/characters/clone_01/motion/rig_005/reviews/skirt_walk_cover_001/walk-playback.json')
output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'status': report['status'], 'canvas_changed': True}))
