"""Short Chrome playback and strength comparison on the existing parts page."""
import hashlib
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

output = Path('art/characters/clone_01/motion/rig_005/reviews/dynamic_motion_001')
output.mkdir(parents=True, exist_ok=True)
errors, captures, checks = [], [], []
base_url = os.environ.get('DEAR_HUMAN_REVIEW_BASE_URL', 'http://127.0.0.1:4173')
route = base_url + '/#/samples/characters/clone_01?'
sources = ['game/animation/gait.js', 'game/animation/secondary-motion.js', 'game/animation/cape.js',
           'game/animation/rig-core.js', 'game/rig-lab.js', 'game/app.js', 'game/index.html']
hashes = {p: hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in sources}
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1160}, device_scale_factor=1)
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(route + 'motion=run&energy=100&time=1.3&paused=1')
    expect(page.locator('#rig-loading')).to_be_hidden(timeout=15000)
    expect(page.locator('#rig-metrics')).to_contain_text('triangles', timeout=15000)
    page.evaluate("""async () => {
      const {RigLab}=await import('/rig-lab.js');
      const render=RigLab.prototype.render;
      RigLab.prototype.render=function(){window.__motionReview=this;return render.call(this);};
    }""")
    page.wait_for_function('() => window.__motionReview')

    def state():
        return page.evaluate('window.__motionReview.snapshot()')

    def capture(name):
        path = output / (name + '.png')
        page.locator('#rig-stage').screenshot(path=str(path))
        captures.append({'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})

    expect(page.locator('#rig-motion-energy-value')).to_have_text('100%')
    paused_time = state()['seconds']
    capture('run_100')
    dynamic = page.locator('#rig-canvas').evaluate('(c)=>c.toDataURL()')
    page.locator('[data-motion-energy="0"]').click()
    expect(page.locator('#rig-motion-energy-value')).to_have_text('0%')
    assert state()['seconds'] == paused_time
    assert page.locator('#rig-canvas').evaluate('(c)=>c.toDataURL()') != dynamic
    assert 'energy=0' in page.url
    capture('run_000')
    page.locator('[data-motion-energy="100"]').click()
    assert state()['seconds'] == paused_time
    assert page.locator('#rig-canvas').evaluate('(c)=>c.toDataURL()') == dynamic
    checks.append('Paused 0/100 comparison changes pose immediately and reversibly without advancing time.')
    page.locator('#rig-pause').click()
    page.wait_for_timeout(1800)
    running = state()
    assert running['seconds'] > paused_time + 1
    assert running['gripError'] < .001
    checks.append('Run plays in Chrome with stable grip contacts.')
    page.locator('[data-motion="run_fire"]').click()
    page.wait_for_timeout(900)
    fired = state()
    assert fired['shots'] > 0 and fired['gripError'] < .001
    page.locator('#rig-pause').click()
    capture('run_fire_100')
    checks.append('Running fire enters, fires and retains grips.')
    page.locator('#rig-motion-energy').fill('150')
    page.locator('#rig-motion-energy').dispatch_event('change')
    expect(page.locator('#rig-motion-energy-value')).to_have_text('150%')
    assert state()['secondary']['motionEnergy'] == 1.5
    page.goto('about:blank')
    page.goto(route + 'motion=walk&time=1.2&paused=1')
    expect(page.locator('#rig-metrics')).to_contain_text('triangles')
    expect(page.locator('#rig-motion-energy-value')).to_have_text('150%')
    checks.append('Custom strength persists across full document reload; URL can override it.')
    page.locator('[data-motion-energy="100"]').click()
    capture('walk_100')
    page.locator('#rig-reset').click()
    expect(page.locator('#rig-motion-energy-value')).to_have_text('100%')
    assert page.locator('#rig-motion-energy').input_value() == '100'
    checks.append('Reset restores the new 100% default.')
    browser.close()
assert not errors, errors
assert hashes == {p: hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in sources}, 'Sources changed during playback review'
report = {'status': 'passed', 'scope': 'Short macOS Chrome playback and strength UI only; visual art acceptance awaits user review.',
          'browser': 'Local Google Chrome via Python Playwright', 'base_url': base_url, 'checks': checks, 'page_errors': errors,
          'captures': captures, 'runtime_sources': [{'path': p, 'sha256': h} for p, h in hashes.items()], 'gifs_generated': False}
(output / 'browser.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'status': report['status'], 'checks': len(checks), 'captures': len(captures)}))
