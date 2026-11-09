import importlib.util
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[6]
records=Path(__file__).parent
errors=[]
results=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe',headless=True)
    page=browser.new_page(viewport={'width':1440,'height':1000})
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.goto('http://127.0.0.1:4173/#/samples/characters/yuna',wait_until='networkidle')
    page.wait_for_function("document.querySelector('#character-art')?.src.includes('illustration_006/') && document.querySelector('#character-art').naturalWidth===1024")
    assert page.locator('#revision-select').input_value()=='illustration_006'
    assert page.locator('#mode-rig').is_hidden()
    page.screenshot(path=str(records/'sample-yuna-006.png'))
    results.append('Default Yuna sample selects illustration_006 and loads full-body PNG')
    page.goto('http://127.0.0.1:4174/#/article/yuna',wait_until='networkidle')
    page.wait_for_function("document.querySelector('.profile-portrait img')?.src.includes('yuna-illustration-006.png') && document.querySelector('.profile-portrait img').naturalWidth===1024")
    page.locator('.profile-portrait img').evaluate('img => img.decode()')
    assert '갸루' in page.locator('.character-profile').inner_text()
    avatar=page.locator('img[src$="assets/characters/yuna-icon-006.png"]')
    assert avatar.count()>=1
    page.wait_for_function("[...document.querySelectorAll('img[src$=\"assets/characters/yuna-icon-006.png\"]')].every(i=>i.complete&&i.naturalWidth===1254&&i.naturalHeight===1254)")
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.screenshot(path=str(records/'wiki-yuna-006-desktop.png'))
    results.append('Wiki Yuna shows 006 full-body portrait, updated facial description and square icon')
    page.set_viewport_size({'width':500,'height':1000})
    page.reload(wait_until='networkidle')
    page.locator('.profile-portrait img').evaluate('img=>img.decode()')
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.screenshot(path=str(records/'wiki-yuna-006-mobile.png'),full_page=True)
    results.append('500px wiki layout has no horizontal overflow')
    page.goto('http://127.0.0.1:4174/#/article/last-card',wait_until='networkidle')
    page.wait_for_function("document.querySelector('img[src$=\"assets/characters/yuna-icon-006.png\"]')?.naturalWidth===1254")
    results.append('Last Card roster reuses new Yuna icon')
    assert not errors,errors
    browser.close()

spec=importlib.util.spec_from_file_location('pipeline',root/'tools/agent_pipeline.py')
p=importlib.util.module_from_spec(spec); spec.loader.exec_module(p)
catalog_path=root/'game/public/assets/catalog/asset_index.json'
catalog=json.loads(catalog_path.read_text(encoding='utf-8'))
before=json.loads((records/'before/game/public/assets/catalog/asset_index.json').read_text(encoding='utf-8'))
assert [e for e in catalog['entries'] if e['entity_id']!='yuna']==[e for e in before['entries'] if e['entity_id']!='yuna']
yuna=next(e for e in catalog['entries'] if e['entity_id']=='yuna')
revision=next(r for r in yuna['revisions'] if r['revision_id']=='illustration_006')
issues=p.artifact_issues(root,revision,'yuna:illustration_006')
assert not issues,issues
assert p.sha256(root/'wiki/public/assets/characters/yuna-illustration-006.png')==p.sha256(root/'art/characters/yuna/concepts/illustration_006/source/illustration.png')
assert p.sha256(root/'wiki/public/assets/characters/yuna-icon-006.png')==p.sha256(root/'art/characters/yuna/concepts/illustration_006/source/icon.png')
revision['verification']='passed'
revision['verification_scope']='new_png_decode_sha256_and_targeted_static_sample_wiki_roster_500px_display'
catalog_path.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
report=dict(scope='New Yuna 006 static images and wiki/sample displays only; no motion/game tests',results=results,page_errors=errors,issues=issues,unrelated_catalog_entries_unchanged=True,face_direction_status='approved_by_user',fullbody_art_review='awaiting_user_review',browser='standalone headless Chrome; in-app connection unavailable')
(records/'preview-and-file-review.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,ensure_ascii=False))
