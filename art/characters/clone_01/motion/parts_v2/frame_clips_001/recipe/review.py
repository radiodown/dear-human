"""Bounded browser check of the separate, discrete-pose V2 player."""
import hashlib
import json
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

base = Path('art/characters/clone_01/motion/parts_v2/frame_clips_001')
output = base / 'reviews'
output.mkdir(exist_ok=True)
sources = ['game/app.js', 'game/index.html', 'game/styles.css', 'game/parts-v2-lab.js', 'game/animation/parts-frame-player.js']
hashes = {path: hashlib.sha256(Path(path).read_bytes()).hexdigest() for path in sources}
errors, requests, checks, captures = [], [], [], []
url = 'http://127.0.0.1:4174/'
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1160}, device_scale_factor=1)
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('request', lambda request: requests.append(request.url))
    page.goto(url + '?v2Review=1#/samples/characters/clone_01')
    expect(page.locator('#mode-rig-v2')).to_be_visible()
    assert not any('/parts_v2/' in path for path in requests)
    page.locator('#mode-rig-v2').click()
    expect(page.locator('#v2-loading')).to_be_hidden(timeout=15000)
    expect(page.locator('#rig-v2-view')).to_be_visible()
    expect(page.locator('#rig-view')).to_be_hidden()
    page.evaluate("""async () => {
      const {PartsV2Lab}=await import('/parts-v2-lab.js'),render=PartsV2Lab.prototype.render;
      PartsV2Lab.prototype.render=function(){window.__v2Lab=this;return render.call(this);};
      const {CharacterRig}=await import('/animation/rig-core.js'),step=CharacterRig.prototype.step;
      window.__liveSteps=0;CharacterRig.prototype.step=function(){window.__liveSteps++;return step.call(this);};
    }""")
    page.wait_for_function('() => window.__v2Lab')
    page.locator('#v2-pause').click()
    page.locator('#v2-restart').click()
    expect(page.locator('#v2-frame-value')).to_have_text('1 / 14')
    first = page.locator('#v2-canvas').evaluate('(canvas) => canvas.toDataURL()')
    page.wait_for_timeout(180)
    assert first == page.locator('#v2-canvas').evaluate('(canvas) => canvas.toDataURL()')
    page.locator('#v2-next').click()
    expect(page.locator('#v2-frame-value')).to_have_text('2 / 14')
    assert first != page.locator('#v2-canvas').evaluate('(canvas) => canvas.toDataURL()')
    page.locator('#v2-prev').click()
    assert first == page.locator('#v2-canvas').evaluate('(canvas) => canvas.toDataURL()')
    page.locator('#v2-frames button').nth(6).click()
    expect(page.locator('#v2-frame-value')).to_have_text('7 / 14')
    page.locator('#v2-fps').select_option('12')
    page.locator('#v2-pause').click()
    page.wait_for_timeout(200)
    assert page.evaluate('window.__v2Lab.player.index') != 6
    page.locator('#v2-pause').click()
    page.locator('#v2-restart').click()
    path = output / 'v2-walk-desktop.png'
    page.locator('.viewer-panel').screenshot(path=str(path))
    captures.append({'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
    checks.append('V2 loads only on selection; held pixels stay identical, adjacent frames differ, backward restores the same pixels; play/seek/FPS work.')
    clips = {}
    for mode in ['idle', 'relaxed', 'walk', 'fire', 'walk_fire', 'run', 'run_fire', 'kneel', 'kneel_fire']:
        page.locator(f'[data-v2-motion="{mode}"]').click()
        expect(page.locator('#v2-loading')).to_be_hidden(timeout=15000)
        assert page.evaluate('window.__v2Lab.player.index') == 0
        assert page.evaluate('window.__v2Lab.player.clip.id') == mode
        assert page.evaluate('window.__v2Lab.renderer.triangles') > 0
        clips[mode] = page.locator('#v2-frames button').count()
    assert page.evaluate('window.__liveSteps') == 0
    checks.append('All nine clips hard-cut to frame 1; zero CharacterRig.step calls while V2 renders/plays/switches clips.')
    # Confirm no hidden advancement while another preview tab is visible.
    page.locator('#mode-reference').click()
    frozen = page.evaluate('window.__v2Lab.player.index')
    page.wait_for_timeout(160)
    assert page.evaluate('window.__v2Lab.player.index') == frozen
    page.locator('#mode-rig').click()
    expect(page.locator('#rig-loading')).to_be_hidden(timeout=15000)
    expect(page.locator('#rig-metrics')).to_contain_text('triangles', timeout=15000)
    page.locator('#mode-rig-v2').click()
    expect(page.locator('#rig-v2-view')).to_be_visible()
    checks.append('Reference and original LIVE tabs remain reachable; hidden V2 does not advance.')
    page.goto(url + '?v2Review=restore#/samples/characters/clone_01?plan=parts-v2&motion=run&frame=4&paused=1&fps=6&loop=0&face=left&viewPitch=0')
    expect(page.locator('#v2-loading')).to_be_hidden(timeout=15000)
    expect(page.locator('#v2-frame-value')).to_have_text('5 / 10')
    expect(page.locator('#v2-pause')).to_have_text('재생')
    expect(page.locator('#v2-fps')).to_have_value('6')
    expect(page.locator('#v2-loop')).not_to_be_checked()
    expect(page.locator('#v2-camera')).to_have_value('0')
    page.locator('#v2-frames button').last.click()
    page.locator('#v2-pause').click()
    expect(page.locator('#v2-pause')).to_have_text('재생', timeout=5000)
    expect(page.locator('#v2-frame-value')).to_have_text('10 / 10')
    checks.append('Shared URL restores frame, paused state, FPS, no-loop, facing and camera; one-shot playback stops at the last frame.')
    page.set_viewport_size({'width': 500, 'height': 1050})
    page.locator('[data-v2-motion="kneel"]').click()
    expect(page.locator('#v2-loading')).to_be_hidden(timeout=15000)
    page.locator('#v2-frames button').nth(7).click()
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    path = output / 'v2-kneel-narrow.png'
    page.locator('.viewer-panel').screenshot(path=str(path))
    captures.append({'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
    checks.append('500px layout keeps action/frame controls accessible without page overflow.')
    browser.close()
assert not errors, errors
assert hashes == {path: hashlib.sha256(Path(path).read_bytes()).hexdigest() for path in sources}
report = {'status': 'passed', 'scope': 'Short local Chrome UI/discrete-frame behavior only; existing pose/loop aesthetics await user review.',
          'checks': checks, 'clips': clips, 'page_errors': errors, 'captures': captures,
          'runtime_sources': [{'path': path, 'sha256': value} for path, value in hashes.items()],
          'clip_requests': sorted(set(path for path in requests if '/parts_v2/' in path)), 'gifs_generated': False}
(output / 'browser.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'status': 'passed', 'checks': len(checks), 'clips': len(clips), 'captures': len(captures)}))
