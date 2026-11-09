from pathlib import Path
import importlib.util
import json
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[6];records=Path(__file__).parent
errors=[];results=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe',headless=True)
    page=browser.new_page(viewport={'width':1440,'height':1000});page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto('http://127.0.0.1:4173/#/samples/characters/moa',wait_until='networkidle')
    page.wait_for_function("document.querySelector('#character-art')?.src.includes('/moa/concepts/illustration_007/') && document.querySelector('#character-art').naturalWidth===1024")
    assert page.locator('#revision-select').input_value()=='illustration_007';assert page.locator('#mode-rig').is_hidden()
    page.screenshot(path=str(records/'sample-moa-007.png'));results.append('Default Moa sample displays full-body 007')
    page.goto('http://127.0.0.1:4174/#/article/moa',wait_until='networkidle')
    page.wait_for_function("document.querySelector('.profile-portrait img')?.src.includes('moa-illustration-007.png') && document.querySelector('.profile-portrait img').naturalWidth===1024")
    page.locator('.profile-portrait img').evaluate('img=>img.decode()')
    assert '시스루뱅' in page.locator('.character-profile').inner_text()
    avatar=page.locator('img[src$="assets/characters/moa-icon-007.png"]');assert avatar.count()>=1
    page.wait_for_function("[...document.querySelectorAll('img[src$=\"assets/characters/moa-icon-007.png\"]')].every(i=>i.complete&&i.naturalWidth===1254&&i.naturalHeight===1254)")
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(records/'wiki-moa-007-desktop.png'));results.append('Wiki displays updated full-body, approved icon and facial/hair description')
    page.set_viewport_size({'width':500,'height':1000});page.reload(wait_until='networkidle');page.locator('.profile-portrait img').evaluate('img=>img.decode()')
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(records/'wiki-moa-007-mobile.png'),full_page=True);results.append('500px wiki layout has no horizontal overflow')
    page.goto('http://127.0.0.1:4174/#/article/last-card',wait_until='networkidle')
    page.wait_for_function("document.querySelector('img[src$=\"assets/characters/moa-icon-007.png\"]')?.naturalWidth===1254");results.append('Last Card roster reuses approved Moa icon')
    assert not errors,errors;browser.close()
spec=importlib.util.spec_from_file_location('pipeline',root/'tools/agent_pipeline.py');p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
catalog_path=root/'game/public/assets/catalog/asset_index.json';catalog=json.loads(catalog_path.read_text(encoding='utf-8'));before=json.loads((records/'before/game/public/assets/catalog/asset_index.json').read_text(encoding='utf-8'))
assert [e for e in catalog['entries'] if e['entity_id']!='moa']==[e for e in before['entries'] if e['entity_id']!='moa']
entry=next(e for e in catalog['entries'] if e['entity_id']=='moa');revision=next(r for r in entry['revisions'] if r['revision_id']=='illustration_007')
issues=p.artifact_issues(root,revision,'moa:illustration_007');issues+=p.validate_catalog(root,catalog,check_files=False)[0];assert not issues,issues
assert p.sha256(root/'wiki/public/assets/characters/moa-illustration-007.png')==p.sha256(root/'art/characters/moa/concepts/illustration_007/source/illustration.png')
assert p.sha256(root/'wiki/public/assets/characters/moa-icon-007.png')==p.sha256(root/'art/characters/moa/concepts/face_redesign_007/source/portrait.png')
revision['verification']='passed';revision['verification_scope']='png_decode_sha256_targeted_sample_wiki_roster_and_500px_display';catalog_path.write_bytes((json.dumps(catalog,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
report=dict(scope='New Moa 007 static PNGs and wiki/sample display only; no game/motion tests',results=results,page_errors=errors,issues=issues,unrelated_catalog_entries_unchanged=True,face_and_hair_status='approved_by_user',fullbody_result_status='awaiting_user_review',browser='standalone headless Chrome; in-app connection unavailable')
(records/'preview-and-file-review.json').write_bytes((json.dumps(report,ensure_ascii=False,indent=2)+'\n').encode('utf-8'));print(json.dumps(report,ensure_ascii=False))
