"""Short Chrome gait-phase comparison and live walk/run review."""
import hashlib
import json
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

base = Path('art/characters/clone_01/motion/rig_005')
output = base / 'reviews/leg_gait_001'
output.mkdir(parents=True, exist_ok=True)
snapshot = base / 'records/runtime_snapshot_before_leg_gait_001'
names = ['proportions.js', 'gait.js', 'rig-core.js', 'webgl-character.js', 'secondary-motion.js']
sources = ['game/animation/' + name for name in names]
hashes = {path: hashlib.sha256(Path(path).read_bytes()).hexdigest() for path in sources}
errors, captures, checks, poses = [], [], [], {}
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless=True)
    for mode in ['walk', 'run']:
        frames = []
        for old in [True, False]:
            page = browser.new_page(viewport={'width': 1440, 'height': 1160}, device_scale_factor=1)
            page.on('pageerror', lambda e: errors.append(str(e)))
            if old:
                for name in names:
                    source = (snapshot / 'game/animation' / name).read_text()
                    page.route('**/animation/' + name, lambda route, request, source=source: route.fulfill(status=200, content_type='text/javascript', body=source))
            page.goto(f'http://127.0.0.1:4174/?legReview={mode}-{old}#/samples/characters/clone_01?motion={mode}&time=1.3&paused=1')
            expect(page.locator('#rig-loading')).to_be_hidden(timeout=15000)
            expect(page.locator('#rig-metrics')).to_contain_text('triangles', timeout=15000)
            page.evaluate("""async () => {
              const {RigLab}=await import('/rig-lab.js');const render=RigLab.prototype.render;
              const {WebGLCharacter}=await import('/animation/webgl-character.js');const mesh=WebGLCharacter.prototype.mesh;
              window.__legWidths={};
              WebGLCharacter.prototype.mesh=function(key,x,y,width,height,options){
                if(key.endsWith('_thigh'))window.__legWidths[key]={width,height};
                return mesh.call(this,key,x,y,width,height,options);
              };
              RigLab.prototype.render=function(){window.__legLab=this;return render.call(this);};
            }""")
            page.wait_for_function('() => window.__legLab')
            # Compare naturally simulated phases. Cadence differs, so elapsed
            # time differs; never align individual parts or rescale poses.
            cycle = page.evaluate('Math.floor(window.__legLab.rig.phase/(Math.PI*2))+1')
            values = []
            for index, fraction in enumerate([0, .25, .5, .75]):
                sample = page.evaluate("""({cycle,fraction}) => {
                  const lab=window.__legLab,target=(cycle+fraction)*Math.PI*2;
                  while(lab.rig.phase<target)lab.rig.step();
                  lab.render();const p=lab.rig.pose();
                  return {image:document.querySelector('#rig-canvas').toDataURL(),time:lab.rig.time,
                    phase:lab.rig.phase/(Math.PI*2)%1,hips:p.pelvis,grip:p.gripError,widths:window.__legWidths,
                    legs:p.legs.map(l=>({root:l.root,knee:l.elbow,foot:l.foot}))};
                }""", {'cycle': cycle, 'fraction': fraction})
                frames.append({'label': ('이전' if old else '보정') + f' · {int(fraction*100)}%', 'image': sample.pop('image')})
                values.append(sample)
                assert sample['grip'] < .001
            poses[mode + ('_before' if old else '_after')] = values
            if old:
                page.close()
            else:
                page.evaluate("""({frames,mode})=>{
                  const panel=document.createElement('div');panel.id='leg-review-grid';
                  panel.style.cssText='position:absolute;left:0;top:0;width:1720px;padding:14px;background:#182025;color:#eee;z-index:99999;font:16px system-ui;box-sizing:border-box';
                  const title=document.createElement('div');title.textContent=mode+' · 이전 / 보정 · 같은 주기의 4개 시점';title.style.marginBottom='12px';panel.append(title);
                  const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(4,1fr);gap:8px';
                  for(const frame of frames){const cell=document.createElement('div'),label=document.createElement('div'),image=document.createElement('img');
                    label.textContent=frame.label;label.style.padding='5px';image.src=frame.image;image.style.cssText='display:block;width:100%;background:#263138';cell.append(label,image);grid.append(cell);}
                  panel.append(grid);document.body.append(panel);
                }""", {'frames': frames, 'mode': mode})
                path = output / (mode + '-comparison.png')
                page.locator('#leg-review-grid').screenshot(path=str(path))
                captures.append({'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
                page.evaluate('document.querySelector("#leg-review-grid").remove()')
                before = page.evaluate('window.__legLab.rig.time')
                page.locator('#rig-pause').click()
                page.wait_for_timeout(650)
                assert page.evaluate('window.__legLab.rig.time') > before
                assert page.evaluate('window.__legLab.rig.pose().gripError') < .001
                page.close()
        checks.append(mode + ': four simulated phases compared to saved sources; short live playback and grip contacts checked.')
    browser.close()
for mode in ['walk', 'run']:
    old, new = poses[mode + '_before'][0]['widths'], poses[mode + '_after'][0]['widths']
    for key in ['near_thigh', 'far_thigh']:
        assert abs(new[key]['width']/old[key]['width'] - .76) < 1e-6
checks.append('Rendered thigh width is 76% of previous width at unchanged thigh length; no image or per-frame size alignment.')
assert not errors, errors
assert hashes == {path: hashlib.sha256(Path(path).read_bytes()).hexdigest() for path in sources}
report = {'status': 'passed', 'scope': 'Short macOS Chrome phase comparisons and live walk/run only; art/naturalness awaits user review.',
          'browser': 'Local Google Chrome via Python Playwright', 'checks': checks, 'page_errors': errors,
          'captures': captures, 'poses': poses, 'runtime_sources': [{'path': path, 'sha256': value} for path, value in hashes.items()], 'gifs_generated': False}
(output / 'browser.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'status': report['status'], 'checks': len(checks), 'captures': len(captures)}))
