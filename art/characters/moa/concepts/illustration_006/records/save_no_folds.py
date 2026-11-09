from pathlib import Path
import hashlib
import importlib.util
import json
import shutil
from PIL import Image
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[6]
base=Path(__file__).resolve().parents[1]
records=base/'records'
source=Path(r'C:\Users\axgatge\.codex\generated_images\01a1bee1-3e63-7033-8410-1da7ce13ec6e\exec-bf64b07a-2d2a-4e77-bce7-803cafd3062e.png')
output=base/'source/illustration-no-folds.png'
assert not output.exists()
shutil.copyfile(source,output)
digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
with Image.open(output) as img:
    img.load();width,height=img.size
metadata=dict(tool='image_gen.imagegen',mode='built-in edit',model=None,cost=None,seed=None,started_at='2026-11-09T06:22:32.597Z',finished_at='2026-11-09T06:23:08.933Z',source_path=str(source),width=width,height=height,sha256=digest(output),transformations=[],reference=dict(path=(base/'source/illustration.png').relative_to(root).as_posix(),sha256=digest(base/'source/illustration.png')),request='팔자주름과 코 옆에서 입가로 이어지는 음영 제거',art_direction_status='awaiting_user_review')
(records/'generation-no-folds.json').write_bytes((json.dumps(metadata,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
catalog_path=root/'game/public/assets/catalog/asset_index.json'
catalog=json.loads(catalog_path.read_text(encoding='utf-8'))
shutil.copyfile(catalog_path,records/'catalog-before-no-folds.json')
entry=next(e for e in catalog['entries'] if e['kind']=='character' and e['entity_id']=='moa')
rev_id='illustration_006_no_folds'
assert not any(r['revision_id']==rev_id for r in entry['revisions'])
paths=[output,records/'prompt-no-nasolabial-folds.json',records/'prompt-no-nasolabial-folds.md',records/'generation-no-folds.json']
revision=dict(revision_id=rev_id,display_name='모아 · 006 팔자주름 제거 수정본',status='draft',verification='untested',art_direction_status='awaiting_user_review',recipe_key='moa-006-no-nasolabial-folds',artifacts=[dict(path=p.relative_to(root).as_posix(),sha256=digest(p)) for p in paths],dependencies=[dict(kind='character',entity_id='moa',revision_id='illustration_006')],description='백발 생머리 중단발·푸른 눈·러시아계 인상을 유지한 팔자주름·입가 음영 제거 수정 샘플.',appearance_specs=[['외형상 나이','25~26세'],['헤어','백발 생머리 중단발'],['눈','푸른 눈'],['수정','팔자주름·입가 음영 제거']],review_notes=['내장 image_gen 국소 편집 1회 · 이전 원본 보존','의상·장비·헤어 유지 목표 · 픽셀 동일성은 보장하지 않음','주름 제거 정도와 미감은 사용자 검수 대기'],preview=dict(image_path=output.relative_to(root).as_posix(),width=width,height=height,views=['front'],type='concept_image',production_ready_cutout=False))
entry['revisions'].append(revision);entry['review_revision_id']=rev_id
spec=importlib.util.spec_from_file_location('pipeline',root/'tools/agent_pipeline.py');p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
issues=p.artifact_issues(root,revision,'moa:'+rev_id);assert not issues,issues
catalog_path.write_bytes((json.dumps(catalog,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
readme=base/'README.md'
text=readme.read_text(encoding='utf-8')
text=text.replace('# 모아 · 백발 생머리 중단발 006','# 모아 · 백발 생머리 중단발 006\n\n최신은 [팔자주름 제거 수정본](source/illustration-no-folds.png)이다. [정확한 영어 입력](records/prompt-no-nasolabial-folds.md)과 [생성 기록](records/generation-no-folds.json)을 보존한다. 검토 주소는 `http://127.0.0.1:4173/#/samples/characters/moa?rev=illustration_006_no_folds`다.',1)
readme.write_bytes(text.encode('utf-8'))
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe',headless=True)
    page=browser.new_page(viewport={'width':1440,'height':1000})
    page.goto('http://127.0.0.1:4173/#/samples/characters/moa?rev='+rev_id,wait_until='networkidle')
    page.wait_for_function("document.querySelector('#character-art')?.src.includes('illustration-no-folds.png') && document.querySelector('#character-art').naturalWidth===1024")
    assert page.locator('#revision-select').input_value()==rev_id
    page.screenshot(path=str(records/'no-folds-preview.png'))
    browser.close()
revision['verification']='passed';revision['verification_scope']='new_png_decode_sha256_and_targeted_static_sample_display'
catalog_path.write_bytes((json.dumps(catalog,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
(records/'no-folds-review.json').write_bytes((json.dumps(dict(issues=issues,png_decode_hash='passed',sample_display='passed',art_direction_status='awaiting_user_review',wiki_unchanged=True),ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
print(output)
