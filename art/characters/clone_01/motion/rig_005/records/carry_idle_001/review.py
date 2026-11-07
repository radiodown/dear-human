"""Brief Chrome comparison of both idles, lowered running and running fire."""
import hashlib
import json
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

output = Path('art/characters/clone_01/motion/rig_005/reviews/carry_idle_001')
output.mkdir(parents=True, exist_ok=True)
sources = ['game/animation/firing-form.js', 'game/animation/rig-core.js', 'game/animation/motion-controls.js', 'game/rig-lab.js', 'game/index.html']
hashes = {path: hashlib.sha256(Path(path).read_bytes()).hexdigest() for path in sources}
captures, errors, checks = [], [], []
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1160}, device_scale_factor=1)
    page.on('pageerror', lambda e: errors.append(str(e)))
    for index, mode in enumerate(['idle', 'relaxed', 'run', 'run_fire']):
        page.goto(f'http://127.0.0.1:4174/?carryReview={index}#/samples/characters/clone_01?motion={mode}&time=1.3&paused=1')
        expect(page.locator('#rig-loading')).to_be_hidden(timeout=15000)
        expect(page.locator('#rig-metrics')).to_contain_text('triangles', timeout=15000)
        expect(page.locator(f'[data-motion="{mode}"]')).to_have_attribute('aria-pressed', 'true')
        page.evaluate("""async () => {
          const {RigLab}=await import('/rig-lab.js');const render=RigLab.prototype.render;
          RigLab.prototype.render=function(){window.__carryReview=this;return render.call(this);};
        }""")
        page.wait_for_function('() => window.__carryReview')
        pose = page.evaluate('({pitch:window.__carryReview.rig.pose().weapon.a*180/Math.PI,grip:window.__carryReview.rig.pose().gripError})')
        assert pose['grip'] < .001
        if mode == 'relaxed':
            assert pose['pitch'] > 55
        elif mode == 'run':
            assert 34 < pose['pitch'] < 36
        else:
            assert abs(pose['pitch']) < 1
        path = output / (mode + '.png')
        page.locator('#rig-stage').screenshot(path=str(path))
        captures.append({'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
        if mode == 'relaxed':
            before = page.evaluate('window.__carryReview.rig.time')
            page.locator('#rig-weapon-drop').fill('4')
            page.locator('#rig-weapon-drop').dispatch_event('change')
            assert page.evaluate('window.__carryReview.rig.time') == before
            page.locator('[data-motion="idle"]').click()
            page.locator('[data-motion="relaxed"]').click()
            expect(page.locator('#rig-weapon-drop')).to_have_value('4')
            checks.append('Relaxed idle has the same controls, paused height editing and its own remembered values.')
        if mode == 'run':
            page.locator('#rig-pause').click()
            page.wait_for_timeout(700)
            page.locator('#rig-shot').click()
            page.wait_for_function('() => window.__carryReview.rig.shots > 0')
            assert page.evaluate('Math.abs(window.__carryReview.rig.pose().weapon.a*180/Math.PI)') < 2.1
            checks.append('Actual run playback lowers the muzzle; a shot input raises it before firing.')
    checks.append('Shouldered idle, relaxed idle, non-firing run and running fire display distinct expected muzzle directions.')
    browser.close()
assert not errors, errors
assert hashes == {path: hashlib.sha256(Path(path).read_bytes()).hexdigest() for path in sources}
report = {'status': 'passed', 'scope': 'Short macOS Chrome carry/idle display, playback and controls check; user art review pending.',
          'browser': 'Local Google Chrome via Python Playwright', 'base_url': 'http://127.0.0.1:4174',
          'checks': checks, 'page_errors': errors, 'captures': captures,
          'runtime_sources': [{'path': path, 'sha256': value} for path, value in hashes.items()], 'gifs_generated': False}
(output / 'browser.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'status': report['status'], 'checks': len(checks), 'captures': len(captures)}))
