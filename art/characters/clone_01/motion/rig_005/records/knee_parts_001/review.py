"""Short Chrome comparison of knee attachments and sitting/standing playback."""
import hashlib
import json
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

base = Path('art/characters/clone_01/motion/rig_005')
output = base / 'reviews/knee_parts_001'
output.mkdir(parents=True, exist_ok=True)
snapshot = base / 'records/runtime_snapshot_before_knee_parts_001'
sources = ['game/animation/kneeling-pose.js', 'game/animation/webgl-character.js', str(base / 'rig/parts.json')]
hashes = {path: hashlib.sha256(Path(path).read_bytes()).hexdigest() for path in sources}
errors, captures, poses, checks = [], [], {}, []
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless=True)
    for mode in ['kneel', 'kneel_fire']:
        frames = []
        for old in [True, False]:
            page = browser.new_page(viewport={'width': 1440, 'height': 1160}, device_scale_factor=1)
            page.on('pageerror', lambda e: errors.append(str(e)))
            if old:
                for name in ['kneeling-pose.js', 'webgl-character.js']:
                    source = (snapshot / 'game/animation' / name).read_text()
                    page.route('**/animation/' + name, lambda route, request, source=source: route.fulfill(status=200, content_type='text/javascript', body=source))
                definition = (snapshot / sources[-1]).read_text()
                page.route('**/rig_005/rig/parts.json', lambda route, request: route.fulfill(status=200, content_type='application/json', body=definition))
            page.goto(f'http://127.0.0.1:4174/?kneeReview={mode}-{old}#/samples/characters/clone_01?motion={mode}&time=1.5&paused=1')
            expect(page.locator('#rig-loading')).to_be_hidden(timeout=15000)
            expect(page.locator('#rig-metrics')).to_contain_text('triangles', timeout=15000)
            page.evaluate("""async () => {
              const {RigLab}=await import('/rig-lab.js'),render=RigLab.prototype.render;
              RigLab.prototype.render=function(){window.__kneeLab=this;return render.call(this);};
            }""")
            page.wait_for_function('() => window.__kneeLab')
            sample = page.evaluate("""() => {
              const lab=window.__kneeLab;lab.zoom=1.35;lab.render();const p=lab.rig.pose();
              return {image:document.querySelector('#rig-canvas').toDataURL(),time:lab.rig.time,
                grip:p.gripError,kneeSupport:p.kneeSupport,legs:p.legs.map(l=>({root:l.root,knee:l.elbow,ankle:l.hand})),triangles:lab.renderer.triangles};
            }""")
            frames.append({'label': '이전' if old else '보정', 'image': sample.pop('image')})
            poses[mode + ('_before' if old else '_after')] = sample
            assert sample['grip'] < .001 and sample['kneeSupport']['error'] < .001
            if not old:
                page.evaluate("""({frames,mode})=>{
                  const panel=document.createElement('div');panel.id='knee-review-grid';
                  panel.style.cssText='position:absolute;left:0;top:0;width:1720px;padding:14px;background:#182025;color:#eee;z-index:99999;font:16px system-ui;box-sizing:border-box';
                  const title=document.createElement('div');title.textContent=mode+' · 이전 / 보정 · 확대 135%';title.style.marginBottom='12px';panel.append(title);
                  const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(2,1fr);gap:8px';
                  for(const frame of frames){const cell=document.createElement('div'),label=document.createElement('div'),im=document.createElement('img');
                    label.textContent=frame.label;label.style.padding='5px';im.src=frame.image;im.style.cssText='display:block;width:100%;background:#263138';cell.append(label,im);grid.append(cell);}
                  panel.append(grid);document.body.append(panel);
                }""", {'frames': frames, 'mode': mode})
                path = output / (mode + '-comparison.png')
                page.locator('#knee-review-grid').screenshot(path=str(path))
                captures.append({'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
                page.evaluate('document.querySelector("#knee-review-grid").remove()')
                if mode == 'kneel':
                    # Same live instance, public state APIs; no reload or extra motions.
                    page.locator('#rig-pause').click()
                    page.locator('[data-motion="idle"]').click()
                    page.wait_for_function('() => window.__kneeLab.rig.kneelAmount < .01', timeout=5000)
                    page.locator('[data-motion="kneel"]').click()
                    page.wait_for_function('() => window.__kneeLab.rig.pose().kneeSupport.amount > .99', timeout=5000)
                    page.locator('#rig-pause').click()
                    page.evaluate('window.__kneeLab.options.showCape=false;window.__kneeLab.options.cameraPitch=0;window.__kneeLab.render()')
                    path = output / 'kneel-after-side-detail.png'
                    page.locator('#rig-canvas').screenshot(path=str(path))
                    captures.append({'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
            page.close()
        checks.append(mode + ': same-source-ratio saved/current attachment comparison; joints and grips retained.')
    browser.close()
assert not errors, errors
assert hashes == {path: hashlib.sha256(Path(path).read_bytes()).hexdigest() for path in sources}
checks.append('Short live standing/sitting return and side-view knee detail inspected; no full gameplay QA.')
report = {'status': 'passed', 'scope': 'Short macOS Chrome kneel/kneel_fire attachment comparison, live stand/sit and side view; user art review pending.',
          'browser': 'Local Google Chrome via Python Playwright', 'checks': checks, 'page_errors': errors,
          'captures': captures, 'poses': poses, 'runtime_sources': [{'path': path, 'sha256': value} for path, value in hashes.items()], 'gifs_generated': False}
(output / 'browser.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'status': report['status'], 'captures': len(captures)}))
