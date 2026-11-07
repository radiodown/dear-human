"""Short Chrome moving-frame coherence and shared head/scalp frame review."""
import hashlib
import json
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

output = Path('art/characters/clone_01/motion/rig_005/reviews/head_body_sync_001')
output.mkdir(parents=True, exist_ok=True)
sources = ['game/animation/' + name for name in ['gait.js', 'secondary-motion.js', 'rig-core.js', 'webgl-character.js', 'side-camera.js']]
hashes = {path: hashlib.sha256(Path(path).read_bytes()).hexdigest() for path in sources}
errors, checks, captures, metrics = [], [], [], {}
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1160}, device_scale_factor=1)
    page.on('pageerror', lambda e: errors.append(str(e)))
    for index, mode in enumerate(['walk', 'run', 'run_fire', 'kneel_fire']):
        page.goto(f'http://127.0.0.1:4174/?syncReview={index}#/samples/characters/clone_01?motion={mode}&time=1.3&viewPitch=12')
        expect(page.locator('#rig-loading')).to_be_hidden(timeout=15000)
        expect(page.locator('#rig-metrics')).to_contain_text('triangles', timeout=15000)
        page.evaluate("""async () => {
          const {RigLab}=await import('/rig-lab.js');
          const {WebGLCharacter}=await import('/animation/webgl-character.js');
          const sprite=WebGLCharacter.prototype.sprite,render=RigLab.prototype.render;
          window.__headSprites={};window.__headSamples=[];
          WebGLCharacter.prototype.sprite=function(key,x,y,height,options){
            if(key==='head'||key==='hair_back')window.__headSprites[key]={x,y,a:options.angle};
            return sprite.call(this,key,x,y,height,options);
          };
          RigLab.prototype.render=function(){
            window.__headLab=this;const result=render.call(this),p=this.renderer?.lastPose,h=window.__headSprites.head;
            if(p&&h)window.__headSamples.push({relative:p.headAngle-p.torso.a,grip:p.gripError,
              renderError:Math.max(Math.abs(h.x-p.headFrame.x),Math.abs(h.y-p.headFrame.y),Math.abs(h.a-p.headFrame.a))});
            return result;
          };
        }""")
        page.wait_for_function('() => window.__headSamples.length > 12')
        page.wait_for_timeout(700)
        page.locator('#rig-pause').click()
        values = page.evaluate('window.__headSamples')
        measured = {'samples': len(values), 'maxRenderError': max(v['renderError'] for v in values),
                    'maxGripError': max(v['grip'] for v in values),
                    'relativeRangeDegrees': (max(v['relative'] for v in values)-min(v['relative'] for v in values))*180/3.141592653589793}
        assert measured['maxRenderError'] < 1e-9 and measured['maxGripError'] < .001
        if mode != 'kneel_fire':
            assert measured['relativeRangeDegrees'] < .05
        metrics[mode] = measured
        path = output / (mode + '.png')
        page.locator('#rig-stage').screenshot(path=str(path))
        captures.append({'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
    checks.append('Live walking, running and running fire keep head/body pitch changes in the same rendered frames.')
    checks.append('Rendered head matches the simulation head frame exactly; grips remain connected in all four samples.')
    first = page.locator('#rig-canvas').evaluate('(c)=>c.toDataURL()')
    page.wait_for_timeout(150)
    assert page.locator('#rig-canvas').evaluate('(c)=>c.toDataURL()') == first
    checks.append('Paused canvas is stable; kneeling fire remains visible with its authored aiming fit.')
    browser.close()
assert not errors, errors
assert hashes == {path: hashlib.sha256(Path(path).read_bytes()).hexdigest() for path in sources}
report = {'status': 'passed', 'scope': 'Short Chrome coherence/render-frame check and visual capture; naturalness awaits user art review.',
          'browser': 'Local Google Chrome via Python Playwright', 'checks': checks, 'metrics': metrics, 'page_errors': errors,
          'captures': captures, 'runtime_sources': [{'path': path, 'sha256': value} for path, value in hashes.items()], 'gifs_generated': False}
(output / 'browser.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'status': report['status'], 'checks': len(checks), 'captures': len(captures)}))
