import hashlib
import importlib.util
import json
import shutil
from pathlib import Path
from PIL import Image

root=Path(__file__).resolve().parents[6]
base=Path(__file__).resolve().parents[1]
records=base/'records'
generated=Path(r'C:\Users\axgatge\.codex\generated_images\01a1bee1-3e63-7033-8410-1da7ce13ec6e')
files={'illustration.png':'exec-3fd6f25c-7830-4000-af1d-83a35a06e3a4.png','previous-face.png':'exec-448b2e5b-002e-4774-aeba-e46549e09adc.png'}
(base/'source').mkdir(exist_ok=True)
for name,filename in files.items():
    destination=base/'source'/name
    assert not destination.exists()
    shutil.copyfile(generated/filename,destination)
digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
output=base/'source/illustration.png'
with Image.open(output) as image:
    image.load();width,height=image.size
record=dict(tool='image_gen.imagegen',mode='built-in edit',model=None,cost=None,seed=None,timing=json.loads((records/'timing.json').read_text(encoding='utf-8')),width=width,height=height,sha256=digest(output),transformations=[],art_direction_status='awaiting_user_review',scope='White straight shoulder-length bob, blue eyes, Russian-inspired adult appearance; younger face correction. Strong anime style cancelled. Existing wiki images and other characters retained.',references=[dict(path='art/characters/moa/concepts/illustration_004/source/illustration.png',sha256=digest(root/'art/characters/moa/concepts/illustration_004/source/illustration.png'))],generated_sources=files)
(records/'generation.json').write_bytes((json.dumps(record,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
catalog_path=root/'game/public/assets/catalog/asset_index.json'
catalog=json.loads(catalog_path.read_text(encoding='utf-8'))
shutil.copyfile(catalog_path,records/'catalog-before.json')
entry=next(e for e in catalog['entries'] if e['entity_id']=='moa' and e['kind']=='character')
assert not any(r['revision_id']=='illustration_006' for r in entry['revisions'])
paths=[output,base/'source/previous-face.png',records/'prompt.json',records/'prompt.md',records/'prompt-younger-face.json',records/'prompt-younger-face.md',records/'generation.json']
revision=dict(revision_id='illustration_006',display_name='모아 · 백발 생머리 중단발 006 · 젊은 얼굴 수정',status='draft',verification='untested',art_direction_status='awaiting_user_review',recipe_key='moa-white-straight-lob-blue-russian-younger-face-006',artifacts=[dict(path=p.relative_to(root).as_posix(),sha256=digest(p)) for p in paths],dependencies=[dict(kind='character',entity_id='moa',revision_id='illustration_004')],description='백발 생머리 중단발·푸른 눈·러시아계 인상. 얼굴을 25~26세의 젊고 부드러운 인상으로 보정한 검토 샘플. 기존 의상·장비·구도 유지. 강한 애니풍은 취소.',appearance_specs=[['외형상 나이','25~26세'],['헤어','백발·생머리 중단발·옆가르마'],['눈','푸른 눈'],['얼굴 방향','러시아계 인상 · 국적 확정 아님']],review_notes=['나이 들어 보인다는 사용자 피드백으로 얼굴 추가 보정','미감은 사용자 검수 대기','기존 위키·아이콘·모션·다른 인물 유지'],preview=dict(image_path=output.relative_to(root).as_posix(),width=width,height=height,views=['front'],type='concept_image',production_ready_cutout=False))
entry['revisions'].append(revision)
spec=importlib.util.spec_from_file_location('pipeline',root/'tools/agent_pipeline.py');p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
issues=p.artifact_issues(root,revision,'moa:illustration_006');assert not issues,issues
catalog_path.write_bytes((json.dumps(catalog,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
instruction='- 2026-11-09 모아 외형 최신 요청: **백발·푸른 눈·러시아계 인상, 스트레이트 중단발**이다. [006 얼굴 보정 샘플](art/characters/moa/concepts/illustration_006/README.md)에서 나이 들어 보인다는 피드백을 받아 25~26세의 젊고 부드러운 얼굴로 수정했다. 구체 미감은 검수 대기이며 러시아계 인상으로 작중 국적·혈통을 확정하지 않는다. 모아·유나·아렌의 강한 애니풍 변경은 사용자 취소로 반영하지 않으며, 기존 위키 이미지·아이콘·모션은 유지한다.'
agents=root/'AGENTS.md';text=agents.read_text(encoding='utf-8');text=text.replace('# Dear Human 제작 규칙','# Dear Human 제작 규칙\n\n'+instruction,1);agents.write_bytes(text.encode('utf-8'))
print(json.dumps(dict(path=output.relative_to(root).as_posix(),width=width,height=height,sha256=digest(output),issues=issues),ensure_ascii=False))
