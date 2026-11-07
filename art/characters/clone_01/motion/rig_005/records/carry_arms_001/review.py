"""Bounded lowered-carry comparison and short Chrome playback."""
import hashlib
import json
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

base = Path('art/characters/clone_01/motion/rig_005')
output = base / 'reviews/carry_arms_001'
output.mkdir(parents=True, exist_ok=True)
snapshot = base / 'records/runtime_snapshot_before_carry_arms_001'
names = ['firing-form.js', 'rig-core.js']
hashes = {f'game/animation/{name}': hashlib.sha256(Path(f'game/animation/{name}').read_bytes()).hexdigest() for name in names}
errors, captures, poses, checks = [], [], {}, []
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless=True)
    for mode in ['relaxed', 'run']:
        frames = []
        for old in [True, False]:
            page = browser.new_page(viewport={'width': 1440, 'height': 1160}, device_scale_factor=1)
            page.on('pageerror', lambda e: errors.append(str(e)))
            if old:
                for name in names:
                    source = (snapshot / 'game/animation' / name).read_text()
                    page.route('**/animation/' + name, lambda route, request, source=source: route.fulfill(status=200, content_type='text/javascript', body=source))
            page.goto(f'http://127.0.0.1:4174/?carryArms={mode}-{old}#/samples/characters/clone_01?motion={mode}&time=1.5&paused=1')
            expect(page.locator('#rig-loading')).to_be_hidden(timeout=15000)
            expect(page.locator('#rig-metrics')).to_contain_text('triangles', timeout=15000)
            page.evaluate("""async () => {
              const {RigLab}=await import('/rig-lab.js'),render=RigLab.prototype.render;
              RigLab.prototype.render=function(){window.__carryLab=this;return render.call(this);};
            }""")
            page.wait_for_function('() => window.__carryLab')
            values = []
            for tick in range(2 if mode == 'run' else 1):
                sample = page.evaluate("""tick => {
                  const lab=window.__carryLab;
                  if(tick)for(let i=0;i<22;i++)lab.rig.step();
                  lab.render();const p=lab.rig.pose();
                  return {image:document.querySelector('#rig-canvas').toDataURL(),time:lab.rig.time,
                    grip:p.gripError,angle:p.weapon.a*180/Math.PI,fit:p.carryStockFit,
                    arms:[p.armA,p.armB].map(a=>({root:a.root,elbow:a.elbow,wrist:a.hand,bend:a.bendSign}))};
                }""", tick)
                frames.append({'label': ('이전' if old else '보정') + f' · {sample["time"]:.2f}s', 'image': sample.pop('image')})
                values.append(sample)
                assert sample['grip'] < .001
            poses[mode + ('_before' if old else '_after')] = values
            if not old:
                ordered = [frames[i] for i in ([0, 2, 1, 3] if mode == 'run' else [0, 1])]
                page.evaluate("""({frames,mode})=>{
                  const panel=document.createElement('div');panel.id='carry-review-grid';
                  panel.style.cssText='position:absolute;left:0;top:0;width:1720px;padding:14px;background:#182025;color:#eee;z-index:99999;font:16px system-ui;box-sizing:border-box';
                  const title=document.createElement('div');title.textContent=mode+' · 이전 / 보정';title.style.marginBottom='12px';panel.append(title);
                  const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(2,1fr);gap:8px';
                  for(const frame of frames){const cell=document.createElement('div'),label=document.createElement('div'),image=document.createElement('img');
                    label.textContent=frame.label;label.style.padding='5px';image.src=frame.image;image.style.cssText='display:block;width:100%;background:#263138';cell.append(label,image);grid.append(cell);}
                  panel.append(grid);document.body.append(panel);
                }""", {'frames': ordered, 'mode': mode})
                path = output / (mode + '-comparison.png')
                page.locator('#carry-review-grid').screenshot(path=str(path))
                captures.append({'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
                page.evaluate('document.querySelector("#carry-review-grid").remove()')
                before = page.evaluate('window.__carryLab.rig.time')
                page.locator('#rig-pause').click()
                page.wait_for_timeout(650)
                assert page.evaluate('window.__carryLab.rig.time') > before
                assert page.evaluate('window.__carryLab.rig.pose().gripError') < .001
                page.locator('#rig-pause').click()
                # Capture a raised shot after the carry, without automatic reload.
                page.evaluate("""() => {const lab=window.__carryLab;lab.rig.requestFire();for(let i=0;i<40;i++)lab.rig.step();lab.render();}""")
                path = output / (mode + '-raised.png')
                page.locator('#rig-canvas').screenshot(path=str(path))
                captures.append({'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
            page.close()
        checks.append(mode + ': saved/current carry comparison, short live playback and raised shot captured.')
    browser.close()
assert not errors, errors
assert hashes == {path: hashlib.sha256(Path(path).read_bytes()).hexdigest() for path in hashes}
report = {'status': 'passed', 'scope': 'Short macOS Chrome lowered carry and raise captures; user art review pending.',
          'browser': 'Local Google Chrome via Python Playwright', 'checks': checks, 'page_errors': errors,
          'captures': captures, 'poses': poses, 'runtime_sources': [{'path': path, 'sha256': value} for path, value in hashes.items()], 'gifs_generated': False}
(output / 'browser.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'status': report['status'], 'captures': len(captures)}))
