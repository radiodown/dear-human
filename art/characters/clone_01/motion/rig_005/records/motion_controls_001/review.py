"""Short Chrome check of the shared panel, per-action memory and paused edits."""
import hashlib
import json
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

output = Path('art/characters/clone_01/motion/rig_005/reviews/motion_controls_001')
output.mkdir(parents=True, exist_ok=True)
route = 'http://127.0.0.1:4174/#/samples/characters/clone_01?'
sources = ['game/animation/motion-controls.js', 'game/animation/rig-core.js', 'game/rig-lab.js', 'game/app.js', 'game/index.html']
hashes = {p: hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in sources}
errors, checks, captures = [], [], []
navigation = [0]
modes = ['idle', 'walk', 'fire', 'walk_fire', 'run', 'run_fire', 'kneel', 'kneel_fire']

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1160}, device_scale_factor=1)
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.add_init_script("""if(location.origin==='http://127.0.0.1:4174'){
      localStorage.setItem('dear-human:fire-waist:v1',JSON.stringify({standing:16,running:18}));
      localStorage.setItem('dear-human:kneel-drop:v1','4');localStorage.setItem('dear-human:motion-energy:v1','85');}""")

    def ready(query):
        navigation[0] += 1
        # A new document without entering about:blank's denied storage origin.
        page.goto(route.replace('/#', '/?controlsReview=' + str(navigation[0]) + '#') + query)
        expect(page.locator('#rig-loading')).to_be_hidden(timeout=15000)
        try:
            expect(page.locator('#rig-metrics')).to_contain_text('triangles', timeout=15000)
        except AssertionError:
            print(json.dumps({'query': query, 'app_error': page.locator('#error').inner_text(),
                              'loading': page.locator('#rig-loading').inner_text(), 'page_errors': errors}, ensure_ascii=False))
            raise
        page.evaluate("""async () => {
          const {RigLab}=await import('/rig-lab.js');const render=RigLab.prototype.render;
          RigLab.prototype.render=function(){window.__controlsReview=this;return render.call(this);};
        }""")
        page.wait_for_function('() => window.__controlsReview')

    def state():
        return page.evaluate('window.__controlsReview.snapshot()')

    def edit(selector, value):
        page.locator(selector).fill(format(value, 'g'))
        page.locator(selector).dispatch_event('change')

    def capture(name, selector='#rig-stage'):
        path = output / (name + '.png')
        page.locator(selector).screenshot(path=str(path))
        captures.append({'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})

    ready('motion=idle&time=1.2&paused=1')
    assert state()['settings']['energy'] == 85
    for mode, key, value in [('fire', 'waist', 16), ('run_fire', 'waist', 18), ('kneel_fire', 'weaponDrop', 4)]:
        page.locator(f'[data-motion="{mode}"]').click()
        assert state()['settings'][key] == value
    checks.append('Existing firing waist, kneeling height and energy preferences migrate into action profiles.')
    expected = {}
    for index, mode in enumerate(modes):
        page.locator(f'[data-motion="{mode}"]').click()
        before_time = state()['seconds']
        for selector in ['#rig-pose-waist', '#rig-waist-bend', '#rig-bust-pitch', '#rig-weapon-drop', '#rig-motion-energy', '#rig-light-strength']:
            expect(page.locator(selector)).to_be_visible()
            expect(page.locator(selector)).to_be_enabled()
        edit('#rig-pose-waist', 8 + index)
        edit('#rig-waist-bend', index * .5)
        edit('#rig-bust-pitch', 1)
        edit('#rig-weapon-drop', 2 + index)
        edit('#rig-motion-energy', 50 + index * 5)
        edit('#rig-light-strength', 100 + index * 10)
        page.locator('#rig-fx-cloth').set_checked(index % 2 == 0)
        current = state()
        assert current['seconds'] == before_time
        assert current['motionControls']['mode'] == mode
        assert current['settings']['waist'] == 8 + index
        assert current['settings']['weaponDrop'] == 2 + index
        expected[mode] = current['settings']
    for mode in modes:
        page.locator(f'[data-motion="{mode}"]').click()
        assert state()['settings'] == expected[mode]
    checks.append('All eight actions expose the same live controls; paused edits do not advance time; switching restores independent values and reaction toggles.')
    assert 'weaponDrop=9' in page.url and 'waist=15' in page.url
    ready('motion=walk')
    assert state()['settings'] == expected['walk']
    checks.append('Profiles survive a full reload and shared URLs encode the selected action.')
    page.locator('#rig-pause').click()
    page.locator('#rig-motion-reset').click()
    assert state()['settings']['waist'] == 6 and state()['settings']['energy'] == 100
    page.locator('[data-motion="run"]').click()
    assert state()['settings'] == expected['run']
    checks.append('Current-action reset preserves other actions.')
    ready('motion=walk_fire&waist=20&weaponDrop=8&energy=110&time=1.2&paused=1')
    assert state()['settings']['waist'] == 20 and state()['settings']['weaponDrop'] == 8
    capture('walk_fire_controls', '#rig-view')
    capture('walk_fire_pose')
    checks.append('URL overrides apply to walking fire through the common controls.')
    ready('motion=kneel_fire&fireBend=24&kneelDrop=7&time=1&paused=1')
    assert state()['settings']['weaponDrop'] == 7
    capture('kneel_fire_pose')
    page.locator('#rig-pause').click()
    page.wait_for_timeout(650)
    assert state()['shots'] > 0
    page.locator('#rig-reset').click()
    assert state()['mode'] == 'idle' and state()['settings']['waist'] == 4
    page.locator('[data-motion="run"]').click()
    assert state()['settings']['waist'] == 15 and state()['settings']['weaponDrop'] == 6
    checks.append('Legacy height URLs still work, firing plays, and full reset restores all action defaults.')
    browser.close()
assert not errors, errors
assert hashes == {p: hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in sources}
report = {'status': 'passed', 'scope': 'Short macOS Chrome shared-controls and persistence check only; no art acceptance or exhaustive pose combinations.',
          'browser': 'Local Google Chrome via Python Playwright', 'base_url': 'http://127.0.0.1:4174',
          'checks': checks, 'page_errors': errors, 'captures': captures,
          'runtime_sources': [{'path': path, 'sha256': value} for path, value in hashes.items()], 'gifs_generated': False}
(output / 'browser.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'status': report['status'], 'checks': len(checks), 'captures': len(captures)}))
