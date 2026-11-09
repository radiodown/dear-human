from pathlib import Path
import copy
import importlib.util
import json
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[4]
records=Path(__file__).parent
names=('sena','moa','yuna','iren')
results=[]
with sync_playwright() as playwright:
    browser=playwright.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe',headless=True)
    page=browser.new_page(viewport={'width':1440,'height':1000})
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    for character in names:
        page.goto(f'http://127.0.0.1:4173/#/samples/characters/{character}',wait_until='networkidle')
        page.wait_for_function("character => document.querySelector('#character-art').src.includes(character + '/concepts/illustration_004/') && document.querySelector('#character-art').naturalWidth === 1024",arg=character)
        page.locator('#character-art').evaluate('image => image.decode()')
        assert page.locator('#mode-rig').is_hidden()
        page.goto(f'http://127.0.0.1:4175/#/article/{character}',wait_until='networkidle')
        page.wait_for_function("character => document.querySelector('.profile-portrait img')?.src.includes(character + '-illustration-004.png') && document.querySelector('.profile-portrait img').naturalWidth === 1024",arg=character)
        page.locator('.profile-portrait img').evaluate('image => image.decode()')
        page.evaluate('() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
        assert '시안 004' in page.locator('.profile-portrait figcaption').inner_text()
        assert '25~26세' in page.locator('.character-profile').inner_text()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        results.append({'character':character,'sample':'004 displayed','wiki':'004 displayed','age':'25~26','garter_direction':'Iren only; checked in generated full-body images'})
    page.screenshot(path=str(records/'wiki-iren-desktop.png'))
    page.set_viewport_size({'width':500,'height':1000})
    page.reload(wait_until='networkidle')
    page.locator('.profile-portrait img').evaluate('image => image.decode()')
    page.evaluate('() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.screenshot(path=str(records/'wiki-iren-mobile.png'),full_page=True)
    assert not errors,errors
    browser.close()

module_spec=importlib.util.spec_from_file_location('pipeline',root/'tools/agent_pipeline.py')
pipeline=importlib.util.module_from_spec(module_spec)
module_spec.loader.exec_module(pipeline)
catalog_path=root/'game/public/assets/catalog/asset_index.json'
catalog=json.loads(catalog_path.read_text(encoding='utf-8'))
before=json.loads((records/'catalog-before-registration.json').read_text(encoding='utf-8'))
assert [entry for entry in catalog['entries'] if entry['entity_id'] not in names]==[entry for entry in before['entries'] if entry['entity_id'] not in names]
issues,_,_=pipeline.validate_catalog(root,catalog,check_files=False)
for entry in catalog['entries']:
    if entry['entity_id'] in names:
        revision=next(revision for revision in entry['revisions'] if revision['revision_id']=='illustration_004')
        issues.extend(pipeline.artifact_issues(root,revision,entry['entity_id']+':004'))
        revision['verification']='passed'
        revision['verification_scope']='new_png_decode_sha256_and_targeted_static_sample_and_wiki_display'
assert not issues,issues
catalog_path.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(records/'preview-and-file-review.json').write_text(json.dumps({'scope':'only four new 004 revisions, their static sample/wiki display and one mobile layout; no motion/game tests','results':results,'page_errors':errors,'issues':issues,'unrelated_catalog_entries_unchanged':True,'art_direction_status':'awaiting_user_review'},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('004 targeted PNG/hash/static preview checks passed for four characters.')
