import hashlib
import json
import shutil
from pathlib import Path
from PIL import Image

base = Path(__file__).resolve().parents[1]
root = Path(__file__).resolve().parents[6]
records = base / 'records'
generated = Path(r'C:\Users\axgatge\.codex\generated_images\01a1bef9-ff7c-7740-89dc-8113d6cdcaae')
inputs = [generated/'exec-a4ac8cfa-d4dd-40f5-8990-43cb62c955b9.png', generated/'exec-24a035b2-74b0-4a21-b62b-7c1a1e42fd51.png']
outputs = [base/'source/first-pass.png', base/'source/portrait.png']
for p in outputs:
    if p.exists():
        raise SystemExit(f'Refusing to overwrite {p}')
outputs[0].parent.mkdir(parents=True, exist_ok=True)
digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
timing = json.loads((records/'timing.json').read_text(encoding='utf-8'))
reference = root/'art/characters/yuna/concepts/face_gyaru_sample_006/source/portrait.png'
generations = []
for i, (src, out) in enumerate(zip(inputs, outputs)):
    shutil.copyfile(src, out)
    with Image.open(out) as im:
        im.load()
        width, height = im.size
        mode = im.mode
    generations.append(dict(source_path=str(src), saved_path=out.relative_to(root).as_posix(), sha256=digest(out), width=width, height=height, image_mode=mode, transformations=[], timing=timing['first' if i==0 else 'face_revision'], prompt='prompt.json' if i==0 else 'prompt-face-revision.json'))
metadata = dict(tool='image_gen.imagegen', mode='built-in', calls=2, model=None, seed=None, cost=None, reference=dict(path=reference.relative_to(root).as_posix(),sha256=digest(reference)), outputs=generations, art_direction_status='awaiting_user_review', review='Bright golden blonde confirmed visually; second output changes facial outline, nose, mouth and smile. Facial redesign degree and aesthetics await user review. No pixel-identity guarantee for costume. No browser or game tests.')
(records/'generation.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
catalog_path = root/'game/public/assets/catalog/asset_index.json'
catalog = json.loads(catalog_path.read_text(encoding='utf-8'))
yuna = next(e for e in catalog['entries'] if e['kind']=='character' and e['entity_id']=='yuna')
revision_id = 'face_blonde_sample_008'
assert not any(r['revision_id']==revision_id for r in yuna['revisions'])
shutil.copyfile(catalog_path, records/'catalog-before.json')
files = outputs + [records/p for p in ['prompt.json','prompt.md','prompt-face-revision.json','prompt-face-revision.md','generation.json']]
yuna['revisions'].append(dict(revision_id=revision_id,display_name='유나 · 밝은 금발·새 얼굴 샘플 008',status='draft',verification='untested',art_direction_status='awaiting_user_review',recipe_key='yuna-bright-blonde-face-sample-008',artifacts=[dict(path=p.relative_to(root).as_posix(),sha256=digest(p)) for p in files],dependencies=[dict(kind='character',entity_id='yuna',revision_id='face_gyaru_sample_006')],description='밝은 금발과 전면 재설계한 얼굴의 상반신 샘플. 기존 갸루 분위기와 반묶음·방호복 컨셉 유지. 사용자 검수 대기.',appearance_specs=[['외형상 나이','25~26세'],['머리','밝은 금발 · 긴 생머리 반묶음'],['얼굴','새 얼굴형·눈·코·입·미소 시안'],['상태','검토용 샘플 · 채택 전']],review_notes=['내장 image_gen 2회 · 두 출력 원본 보존','첫 출력은 기존 얼굴 인상이 많이 남아 두 번째 생성 진행','사용자 정정: 백발이 아니라 밝은 금발','이미지 직접 확인·PNG 크기와 해시 기록. 브라우저·게임 테스트 미실행.','기존 전신 006·위키 아이콘·모션은 유지. 얼굴 재설계 정도와 미감은 사용자 검수 대기.'],preview=dict(image_path=outputs[1].relative_to(root).as_posix(),width=width,height=height,views=['front'],type='concept_image',production_ready_cutout=False)))
yuna['review_revision_id'] = revision_id
catalog_path.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

rule = '- 2026-11-09 유나 외형 최신 요청: **현재 분위기를 유지하면서 밝은 금발·얼굴 전면 재설계 샘플을 먼저 제작**한다. 백발은 사용자 정정으로 대체됐다. [샘플 008](art/characters/yuna/concepts/face_blonde_sample_008/README.md)은 내장 image_gen 2회로 제작한 상반신 초상이며 얼굴 변경 정도·미감은 검수 대기다. 미국인 설정은 유지하고 혈통을 새로 확정하지 않는다. 기존 전신 006·위키 아이콘·모션·게임은 샘플만으로 교체하지 않는다.'
p = root/'AGENTS.md'
with p.open('r',encoding='utf-8',newline='') as f:
    text = f.read()
nl = '\r\n' if '\r\n' in text else '\n'
title, rest = text.split(nl,1)
with p.open('w',encoding='utf-8',newline='') as f:
    f.write(title+nl+nl+rule+nl+rest)
print(json.dumps(dict(saved=outputs[1].relative_to(root).as_posix(),width=width,height=height,sha256=digest(outputs[1]),revision_id=revision_id),ensure_ascii=False))
