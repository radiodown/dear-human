from pathlib import Path
import hashlib
import importlib.util
import json
import shutil
from PIL import Image
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[6];base=Path(__file__).resolve().parents[1];records=base/'records'
generated=Path(r'C:\Users\axgatge\.codex\generated_images\01a1bee1-3e63-7033-8410-1da7ce13ec6e')
sources={'portrait.png':'exec-27c648e2-fc84-4cc3-bdbf-65c4534baeb8.png','previous-hair.png':'exec-e70aceeb-afca-4fb2-a02b-ebcc9c045bf3.png'}
(base/'source').mkdir(exist_ok=True)
for name,filename in sources.items():
    dest=base/'source'/name;assert not dest.exists();shutil.copyfile(generated/filename,dest)
digest=lambda path:hashlib.sha256(path.read_bytes()).hexdigest()
output=base/'source/portrait.png'
with Image.open(output) as im:
    im.load();width,height=im.size
record=dict(tool='image_gen.imagegen',mode='built-in edit',model=None,cost=None,seed=None,timing=json.loads((records/'timing.json').read_text(encoding='utf-8')),sources=sources,width=width,height=height,sha256=digest(output),transformations=[],art_direction_status='awaiting_user_review',scope='New youthful adult face, followed by modern straight medium bob and wispy fringe; portrait sample only',reference=dict(path='art/characters/moa/concepts/illustration_006/source/illustration-no-folds.png',sha256=digest(root/'art/characters/moa/concepts/illustration_006/source/illustration-no-folds.png')))
(records/'generation.json').write_bytes((json.dumps(record,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
catalog_path=root/'game/public/assets/catalog/asset_index.json';catalog=json.loads(catalog_path.read_text(encoding='utf-8'));shutil.copyfile(catalog_path,records/'catalog-before.json')
entry=next(e for e in catalog['entries'] if e['kind']=='character' and e['entity_id']=='moa')
assert not any(r['revision_id']=='face_redesign_007' for r in entry['revisions'])
for r in entry['revisions']:
    if r['revision_id'] in ['illustration_006','illustration_006_no_folds']:
        r['art_direction_status']='rejected';r.setdefault('review_notes',[]).append('사용자 반려: 얼굴이 나이 들어 보임. 007 새 얼굴·헤어 확대 샘플로 재검토.')
files=[output,base/'source/previous-hair.png',records/'prompt.json',records/'prompt.md',records/'prompt-modern-hair.json',records/'prompt-modern-hair.md',records/'generation.json']
revision=dict(revision_id='face_redesign_007',display_name='모아 · 얼굴·헤어 확대 007 · 직선 중단발·시스루뱅',status='draft',verification='untested',art_direction_status='awaiting_user_review',recipe_key='moa-young-new-face-white-sleek-lob-wispy-fringe-007',artifacts=[dict(path=p.relative_to(root).as_posix(),sha256=digest(p)) for p in files],dependencies=[dict(kind='character',entity_id='moa',revision_id='illustration_006_no_folds')],description='나이 들어 보인다는 피드백으로 얼굴 재설계 후 헤어를 보정한 확대 샘플. 백발·푸른 눈·러시아계 인상 유지. 직선 중단발·시스루뱅은 검수 대기.',appearance_specs=[['목표 외형상 나이','24~26세 성인'],['헤어 시안','백발·직선 중단발·얇은 시스루뱅'],['눈','푸른 눈'],['상태','얼굴 확대 샘플·채택 전']],review_notes=['얼굴 재설계 1회·헤어 편집 1회','전신·위키 아이콘 적용 전','얼굴·헤어·화풍의 미감은 사용자 검수 대기'],preview=dict(image_path=output.relative_to(root).as_posix(),width=width,height=height,views=['front'],type='concept_image',production_ready_cutout=False))
entry['revisions'].append(revision);entry['review_revision_id']='face_redesign_007'
spec=importlib.util.spec_from_file_location('pipeline',root/'tools/agent_pipeline.py');p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
issues=p.artifact_issues(root,revision,'moa:face_redesign_007');assert not issues,issues
catalog_path.write_bytes((json.dumps(catalog,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe',headless=True);page=browser.new_page(viewport={'width':1440,'height':1000})
    page.goto('http://127.0.0.1:4173/#/samples/characters/moa?rev=face_redesign_007',wait_until='networkidle')
    page.wait_for_function("document.querySelector('#character-art')?.src.includes('/face_redesign_007/source/portrait.png') && document.querySelector('#character-art').naturalWidth===1254")
    assert page.locator('#revision-select').input_value()=='face_redesign_007';page.screenshot(path=str(records/'sample-review.png'));browser.close()
revision['verification']='passed';revision['verification_scope']='png_decode_sha256_and_targeted_static_sample_display'
catalog_path.write_bytes((json.dumps(catalog,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
(records/'review.json').write_bytes((json.dumps(dict(issues=issues,png_decode_hash='passed',sample_display='passed',art_direction_status='awaiting_user_review',wiki_unchanged=True),ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
print(output)
