"""Same-pose visual comparison of moving skirt drape and proximal thigh skinning."""
import hashlib
import json
import re
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

output = Path('art/characters/clone_01/motion/rig_005/reviews/skirt_walk_cover_001')
output.mkdir(parents=True, exist_ok=True)
sources = ['game/animation/waist.js', 'game/animation/webgl-character.js']
hashes = {path: hashlib.sha256(Path(path).read_bytes()).hexdigest() for path in sources}
captures, errors, checks = [], [], []
cases = [('walk_front', 'walk', 1.59167), ('walk_other', 'walk', 2.275), ('run', 'run', 1.3)]
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1160}, device_scale_factor=1)
    page.on('pageerror', lambda e: errors.append(str(e)))
    baseline_path = 'art/characters/clone_01/motion/rig_005/records/runtime_snapshot_before_skirt_walk_cover_001/game/animation/waist.js'
    baseline_source = re.sub(r"from '\./([^']+)'", r"from 'http://127.0.0.1:4174/animation/\1'", Path(baseline_path).read_text())
    page.route('**/' + baseline_path, lambda route: route.fulfill(status=200, content_type='text/javascript', body=baseline_source))
    for index, (name, mode, time) in enumerate(cases):
        page.goto(f'http://127.0.0.1:4174/?skirtReview={index}#/samples/characters/clone_01?motion={mode}&time={time}&paused=1')
        expect(page.locator('#rig-loading')).to_be_hidden(timeout=15000)
        expect(page.locator('#rig-metrics')).to_contain_text('triangles', timeout=15000)
        page.evaluate("""async () => {
          const {RigLab}=await import('/rig-lab.js');
          const {WebGLCharacter}=await import('/animation/webgl-character.js');
          const path='/art/characters/clone_01/motion/rig_005/records/runtime_snapshot_before_skirt_walk_cover_001/game/animation/waist.js';
          const old=await import(path);
          const mesh=WebGLCharacter.prototype.mesh,render=RigLab.prototype.render;
          window.__skirtBaseline=false;
          WebGLCharacter.prototype.mesh=function(key,x,y,width,height,options={}){
            if(window.__skirtBaseline){
              if(key.endsWith('_thigh'))options={...options,warp:undefined};
              if(key==='skirt_front_panel'||key==='skirt_rear_panel')options={...options,project:(u,v)=>old.skirtPanelPoint(this.__skirtPose,width,height,u,v,key==='skirt_front_panel')};
            }
            return mesh.call(this,key,x,y,width,height,options);
          };
          RigLab.prototype.render=function(){window.__skirtLab=this;if(this.renderer)this.renderer.__skirtPose=this.rig.pose();return render.call(this);};
        }""")
        page.wait_for_function('() => window.__skirtLab')
        seconds = page.evaluate('window.__skirtLab.rig.time')
        for baseline in [True, False]:
            page.evaluate('(value)=>{window.__skirtBaseline=value;window.__skirtLab.render();}', baseline)
            path = output / (name + ('_before.png' if baseline else '_after.png'))
            page.locator('#rig-stage').screenshot(path=str(path))
            captures.append({'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
            assert page.evaluate('window.__skirtLab.rig.time') == seconds
        assert page.evaluate('window.__skirtLab.rig.pose().gripError') < .001
        checks.append(name + ': same-pose before/after capture without advancing simulation.')
    page.locator('#rig-pause').click()
    page.wait_for_timeout(600)
    assert page.evaluate('window.__skirtLab.rig.time') > seconds
    checks.append('Short moving playback remains active; source artwork and original bones reused.')
    browser.close()
assert not errors, errors
assert hashes == {path: hashlib.sha256(Path(path).read_bytes()).hexdigest() for path in sources}
report = {'status': 'passed', 'scope': 'Short Chrome playback and frozen-pose comparison captures; coverage/naturalness still requires visual review.',
          'browser': 'Local Google Chrome via Python Playwright', 'checks': checks, 'page_errors': errors,
          'captures': captures, 'runtime_sources': [{'path': path, 'sha256': value} for path, value in hashes.items()], 'gifs_generated': False}
(output / 'browser.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'status': report['status'], 'checks': len(checks), 'captures': len(captures)}))
