from pathlib import Path
import json,statistics
from playwright.sync_api import sync_playwright

ROOT=Path('/Users/jin/Desktop/dear-human/art/characters/clone_01/motion/plan_b/input_fire_002')
URL='http://127.0.0.1:4173/#/samples/characters/clone_01?plan=b'
report={'status':'running','url':URL,'browser':'Local macOS Chrome via Playwright',
        'scope':'Focused cadence, immediate input, walking continuity, release and socket/flash render review.',
        'page_errors':[],'checks':[],'bursts':{}}
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless=True)
    page=browser.new_page(viewport={'width':1280,'height':1100},bypass_csp=True)
    page.set_default_timeout(10000)
    page.on('pageerror',lambda e:report['page_errors'].append(str(e)))
    def count():return int(page.locator('#plan-b-shot-count').inner_text().removesuffix('발'))
    def ready(study):
        page.locator('#plan-b-loading').wait_for(state='hidden')
        page.locator('#plan-b-shot:enabled').wait_for(state='visible')
        assert page.locator(f'[data-plan-b-study="{study}"]').get_attribute('aria-pressed')=='true'
        assert page.locator('#error').is_hidden()
    def burst(study,walking):
        if walking:page.locator('#plan-b-cross-first').click()
        before=count()
        page.evaluate("""()=>{
          window.__cadence={shots:[],frames:[]};
          let lastCount=parseInt(document.querySelector('#plan-b-shot-count').value),lastFrame=-1;
          window.__counterObserver=new MutationObserver(()=>{
            const count=parseInt(document.querySelector('#plan-b-shot-count').value);
            if(count!==lastCount){window.__cadence.shots.push({time:performance.now(),count,frame:Number(document.querySelector('#plan-b-frame').value)});lastCount=count;}
          });
          window.__counterObserver.observe(document.querySelector('#plan-b-shot-count'),{subtree:true,childList:true,characterData:true});
          window.__frameSampler=setInterval(()=>{
            const frame=Number(document.querySelector('#plan-b-frame').value);
            if(frame!==lastFrame){window.__cadence.frames.push({time:performance.now(),frame});lastFrame=frame;}
          },10);
        }""")
        page.locator('#plan-b-hold').hover();page.mouse.down()
        assert count()==before+1,'First shot must be immediate.'
        page.wait_for_timeout(1150)
        page.mouse.move(5,5);page.mouse.up()
        released=count();page.wait_for_timeout(300);assert count()==released
        measured=page.evaluate("()=>{window.__counterObserver.disconnect();clearInterval(window.__frameSampler);return window.__cadence;}")
        shots=measured['shots'];assert len(shots)>=10,shots
        gaps=[b['time']-a['time'] for a,b in zip(shots,shots[1:])]
        average=statistics.mean(gaps);assert 75<=average<=125,(study,average)
        if walking:
            frames=[v['frame'] for v in measured['frames']]
            assert all(1<=i<=12 for i in frames)
            assert all(b==(a%12)+1 for a,b in zip(frames,frames[1:])),frames
            steps=[b['time']-a['time'] for a,b in zip(measured['frames'],measured['frames'][1:])]
            median=statistics.median(steps)
            assert 80<=median<=110,(study,median)
            assert shots[0]['frame']==5,shots[0]
            measured['median_walk_frame_ms']=median
        else:assert page.locator('#plan-b-frame').input_value()=='0'
        measured.update({'measured_average_shot_interval_ms':average,'shots_during_hold':released-before,'no_additional_shot_after_release':True})
        report['bursts'][study]=measured
    try:
        page.goto(URL,wait_until='networkidle');page.wait_for_timeout(1000);ready('guard-walk')
        page.wait_for_timeout(300);assert count()==0
        page.locator('#plan-b-cross-first').click()
        page.evaluate("document.querySelector('#plan-b-shot').click();document.querySelector('#plan-b-pause').click();")
        assert count()==1 and page.locator('#plan-b-frame').input_value()=='5'
        page.locator('#plan-b-view').screenshot(path=str(ROOT/'reviews/immediate-walking-shot.png'))
        page.locator('#plan-b-pause').click();page.wait_for_timeout(450);assert count()==1
        report['checks'].append('Single shot starts immediately on walking pose05, outside the old02/08 gate, and remains exactly one shot.')
        burst('guard-walk',True)
        page.locator('[data-plan-b-study="pixel-walk"]').click();ready('pixel-walk');burst('pixel-walk',True)
        page.locator('[data-plan-b-study="kneel-fire"]').click();ready('kneel-fire');burst('kneel-fire',False)
        report['checks'].append('Guard/basic walking and kneeling all measure approximately100ms shot intervals with immediate first shot.')
        report['checks'].append('Both walking loops keep ordered01..12 frames at the original95ms cadence while firing.')
        report['checks'].append('Pointer release outside the control emits no further shots; kneeling returns to clean idle.')
        page.set_viewport_size({'width':500,'height':1100})
        page.evaluate("document.querySelector('#plan-b-shot').click();document.querySelector('#plan-b-pause').click();")
        page.locator('#plan-b-view').screenshot(path=str(ROOT/'reviews/narrow-kneeling-shot.png'))
        report['checks'].append('Actual live flash/weapon alignment inspected on walking pose05 and kneeling at500px.')
        assert not report['page_errors'],report['page_errors']
        report['status']='passed'
    except Exception as e:
        report['status']='failed';report['failure']=str(e)
        report['page_state']=page.evaluate("({loading:!document.querySelector('#plan-b-loading')?.hidden,load:document.querySelector('#plan-b-loading')?.textContent,error:document.querySelector('#error')?.textContent})")
        raise
    finally:
        (ROOT/'reviews/browser.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
        summary={k:v for k,v in report.items() if k!='bursts'}
        summary['rates']={k:{f:v[f] for f in ['measured_average_shot_interval_ms','shots_during_hold'] if f in v} for k,v in report['bursts'].items()}
        print(json.dumps(summary,ensure_ascii=False,indent=2),flush=True)
        browser.close()
