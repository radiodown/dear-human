"""Capture the existing parts preview and exercise its real UI (no GIF rendering)."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from playwright.sync_api import expect, sync_playwright


def review_standing_fire(page, ready, capture, checks):
    ready('motion=idle')
    # Read the real lab's rendered pose without exposing a diagnostic API in the app.
    page.evaluate("""async () => {
      const {RigLab} = await import('/rig-lab.js');
      const render = RigLab.prototype.render;
      RigLab.prototype.render = function() {
        const result = render.call(this), p = this.renderer?.lastPose;
        if (p) window.__standingReview = {
          hip:p.pelvis.y, lean:p.torso.a*180/Math.PI, aim:p.aimAmount,
          muzzle:p.weapon.a*180/Math.PI, shots:this.rig.shots,
          grip:p.gripError, stock:Math.hypot(p.sockets.stock.x-p.stockTarget.x,p.sockets.stock.y-p.stockTarget.y),
          feet:p.legs.map(l=>({x:l.foot.x,y:l.foot.y,a:l.foot.a}))
        };
        return result;
      };
    }""")
    page.wait_for_function('() => window.__standingReview')
    idle = page.evaluate('window.__standingReview')
    capture('idle')
    page.locator('#rig-shot').click()
    page.wait_for_function('() => window.__standingReview.hip > -167 && window.__standingReview.lean > 3')
    capture('single_shot')
    page.wait_for_function('() => window.__standingReview.aim < .01')
    page.locator('#rig-hold').hover()
    page.mouse.down()
    try:
        page.wait_for_function('() => window.__standingReview.aim > .95')
        held = page.evaluate('window.__standingReview')
        assert 5 < held['lean'] < 7
        assert 6 < held['hip'] - idle['hip'] < 8
        assert abs(held['muzzle']) < 2 and held['stock'] < 1e-5 and held['grip'] < 1e-5
        assert held['feet'] == idle['feet']
        capture('standing_fire', True)
    finally:
        page.mouse.up()
    page.wait_for_function('() => window.__standingReview.aim < .01')
    recovered = page.evaluate('window.__standingReview')
    assert abs(recovered['lean']) < .1
    assert abs(recovered['hip'] - idle['hip']) < .2
    capture('released')
    checks.append('Real single-shot and held-fire inputs lower the pelvis and lean the torso; releasing restores idle')
    checks.append('Standing fire keeps both planted feet, level aim, hand contacts and shoulder stock contact')

    page.locator('[data-motion="fire"]').click()
    page.wait_for_function('() => window.__standingReview.aim > .95')
    page.locator('#rig-pause').click()
    canvas = page.locator('#rig-canvas')
    first = canvas.evaluate('(canvas)=>canvas.toDataURL()')
    page.wait_for_timeout(180)
    assert canvas.evaluate('(canvas)=>canvas.toDataURL()') == first
    checks.append('Standing-fire mode preserves its braced pose when paused')
    page.locator('#rig-turn').click()
    page.set_viewport_size({'width': 500, 'height': 1000})
    capture('standing_fire_left', True)
    checks.append('Paused standing-fire pose displays facing left at 500px viewport')
    return {'idle': idle, 'held': held, 'recovered': recovered}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default='http://127.0.0.1:4173')
    parser.add_argument('--chrome', default='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    parser.add_argument('--output', type=Path)
    parser.add_argument('--scope', choices=['secondary', 'standing-fire'], default='standing-fire')
    args = parser.parse_args()
    if args.output is None:
        args.output = Path('art/characters/clone_01/motion/rig_005/reviews/shoulder_height_008') / (
            'standing_inputs' if args.scope == 'standing-fire' else 'secondary')
    args.output.mkdir(parents=True, exist_ok=True)
    sources = [Path(name) for name in [
        'game/index.html', 'game/app.js', 'game/rig-lab.js', 'game/animation/gait.js',
        'game/animation/rig-core.js', 'game/animation/webgl-character.js',
        'game/animation/proportions.js', 'game/animation/secondary-motion.js',
        'game/animation/reload-pose.js', 'game/animation/cape.js',
        'game/animation/weapon-profiles.js',
        'art/characters/clone_01/motion/rig_005/rig/parts.json',
    ]]
    source_hashes = {p.as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in sources}
    errors, captures, checks, standing_metrics = [], [], [], None
    route = args.base_url + '/#/samples/characters/clone_01?'
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=args.chrome, headless=True)
        page = browser.new_page(viewport={'width': 1440, 'height': 1160}, device_scale_factor=1)
        page.on('pageerror', lambda e: errors.append(str(e)))

        def ready(query):
            # Hash-only navigation retains the old rig. Start a fresh document
            # so each time parameter reconstructs exactly one isolated pose.
            page.goto('about:blank')
            page.goto(route + query)
            expect(page.locator('#rig-loading')).to_be_hidden()
            expect(page.locator('#rig-metrics')).to_contain_text('triangles', timeout=15000)

        def capture(name, full=False):
            target = args.output / (name + '.png')
            if full:
                page.screenshot(path=str(target), full_page=True)
            else:
                page.locator('#rig-stage').screenshot(path=str(target))
            captures.append({'path': str(target), 'sha256': hashlib.sha256(target.read_bytes()).hexdigest()})

        if args.scope == 'standing-fire':
            standing_metrics = review_standing_fire(page, ready, capture, checks)
        else:
            review_secondary(page, ready, capture, checks)
        browser.close()
    assert not errors, errors
    assert source_hashes == {p.as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in sources}, 'Runtime changed during browser review'
    report = {'status': 'passed', 'scope': 'Browser display and input checks, not art acceptance',
              'url': route + ('motion=fire' if args.scope == 'standing-fire' else 'motion=walk'),
              'browser': 'Local Google Chrome through Python Playwright',
              'checks': checks, 'page_errors': errors, 'captures': captures,
              'runtime_sources': [{'path': name, 'sha256': digest} for name, digest in source_hashes.items()],
              'new_hand_art': 'missing; support-hand placeholder explicitly labelled', 'gifs_generated': False}
    if standing_metrics:
        report['standing_fire'] = standing_metrics
    (args.output / 'browser.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'status': 'passed', 'checks': len(checks), 'captures': len(captures)}, ensure_ascii=False))


def review_secondary(page, ready, capture, checks):
    for name, query in [
        ('idle', 'motion=idle&paused=1'),
        ('walk_a', 'motion=walk&time=2&paused=1'),
        ('walk_b', 'motion=walk&time=2.25&paused=1'),
        ('walk_fire', 'motion=walk_fire&time=1.5&paused=1'),
        ('fire_brace', 'motion=fire&time=.8&paused=1'),
        ('reload_extract', 'motion=reload&time=.60&paused=1'),
        ('reload_insert', 'motion=reload&time=1.22&paused=1'),
        ('reload_bolt', 'motion=reload_empty&time=1.82&paused=1'),
    ]:
        ready(query)
        capture(name, name == 'walk_fire')
    checks.append('Existing character route loads idle, walk, moving fire and reload poses without page errors')

    canvas = page.locator('#rig-canvas')
    first = canvas.evaluate('(canvas)=>canvas.toDataURL()')
    page.wait_for_timeout(180)
    assert canvas.evaluate('(canvas)=>canvas.toDataURL()') == first
    checks.append('Paused canvas stays identical')
    page.locator('#rig-step').click()
    assert canvas.evaluate('(canvas)=>canvas.toDataURL()') != first
    checks.append('Single frame advances paused reload')

    page.locator('#rig-reset').click()
    page.locator('[data-motion="walk"]').click()
    page.wait_for_timeout(600)
    page.locator('#rig-fx-hair').uncheck()
    page.locator('#rig-fx-cloth').uncheck()
    page.wait_for_timeout(100)
    assert '머리 끝 0.0' in page.locator('#rig-springs').inner_text()
    assert '옷자락 0.0°' in page.locator('#rig-springs').inner_text()
    page.locator('#rig-fx-hair').check()
    page.locator('#rig-fx-cloth').check()
    page.wait_for_timeout(600)
    assert '머리 끝 0.0' not in page.locator('#rig-springs').inner_text()
    checks.append('Hair and garment toggles disable and restore the actual walking response')

    page.locator('#rig-reset').click()
    page.locator('#rig-empty-reload').click()
    reload_states = set()
    for _ in range(55):
        reload_states.add(page.locator('#rig-state').inner_text())
        page.wait_for_timeout(60)
    assert any('탄창 빼기' in s for s in reload_states)
    assert any('삽입' in s for s in reload_states)
    assert any('조작부' in s for s in reload_states)
    assert page.locator('#rig-ammo').inner_text() == '30 / 30'
    checks.append('Live empty reload visits extraction, insertion and bolt phases and refills')

    page.locator('#rig-hold').hover()
    page.mouse.down()
    page.wait_for_timeout(320)
    page.mouse.up()
    assert page.locator('#rig-ammo').inner_text() != '30 / 30'
    checks.append('Live firing still consumes ammunition')

    page.locator('#rig-turn').click()
    page.locator('[data-motion="walk"]').click()
    page.wait_for_timeout(350)
    page.locator('#rig-pause').click()
    page.set_viewport_size({'width': 500, 'height': 1000})
    capture('narrow_left', True)
    checks.append('Mirrored walking displays at 500px viewport')

if __name__ == '__main__':
    main()
