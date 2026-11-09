import hashlib
import json
import shutil
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[6]
base = Path(__file__).resolve().parents[1]
source = Path(r'C:\Users\axgatge\.codex\generated_images\01a1bee1-3e63-7033-8410-1da7ce13ec6e\exec-b2bdc951-b593-4e28-bed3-173d91f7186d.png')
output = base / 'source/portrait.png'
output.parent.mkdir(parents=True, exist_ok=True)
if output.exists():
    raise SystemExit('Refusing to overwrite sample')
shutil.copyfile(source, output)
digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
with Image.open(output) as img:
    img.load()
    width, height = img.size
    mode = img.mode
reference = root / 'art/characters/yuna/concepts/illustration_005/source/illustration.png'
metadata = dict(tool='image_gen.imagegen', mode='built-in edit', model=None, seed=None, cost=None,
    generated_started_at='2026-11-09T06:00:13.781Z', generated_finished_at='2026-11-09T06:00:48.482Z',
    source_path=str(source), width=width, height=height, image_mode=mode, sha256=digest(output),
    transformations=[], art_direction_status='awaiting_user_review',
    reference=dict(path=reference.relative_to(root).as_posix(), sha256=digest(reference)),
    review_scope='Single upper-body facial redesign sample; slightly tan gyaru makeup; black half-up hair and armor concept retained visually. New cheek beauty mark visible. No full-body replacement or adoption.')
(base / 'records/generation.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
catalog_path = root / 'game/public/assets/catalog/asset_index.json'
catalog = json.loads(catalog_path.read_text(encoding='utf-8'))
yuna = next(e for e in catalog['entries'] if e['entity_id']=='yuna' and e['kind']=='character')
revision_id = 'face_gyaru_sample_006'
assert all(r['revision_id'] != revision_id for r in yuna['revisions'])
shutil.copyfile(catalog_path, base / 'records/catalog-before.json')
files = [output, base/'records/prompt.json', base/'records/prompt.md', base/'records/generation.json']
yuna['revisions'].append(dict(revision_id=revision_id, display_name='유나 · 갸루 얼굴 샘플 006', status='draft',
    verification='untested', art_direction_status='awaiting_user_review', recipe_key='yuna-face-gyaru-sample-006',
    artifacts=[dict(path=p.relative_to(root).as_posix(),sha256=digest(p)) for p in files],
    dependencies=[dict(kind='character',entity_id='yuna',revision_id='illustration_005')],
    description='얼굴 확인용 상반신 샘플. 약간 까무잡잡한 구릿빛 피부와 갸루 메이크업. 기존 흑발 반묶음·방호복 컨셉 유지. 사용자 검수 대기.',
    appearance_specs=[['외형상 나이','25~26세'],['얼굴','구릿빛 피부·갸루 메이크업'],['상태','샘플 · 채택 전']],
    review_notes=['내장 image_gen 편집 1회 · 원본 바이트 보존','005 전신 원화와 위키 인물 이미지는 교체하지 않음','새 얼굴 옆 점이 생성됨 · 의상 세부 픽셀 동일성은 보장하지 않음','PNG 디코딩·해시 확인 완료. 브라우저 표시 검사는 미실행. 미감은 사용자 검수 대기.'],
    preview=dict(image_path=output.relative_to(root).as_posix(),width=width,height=height,views=['front'],type='concept_image',production_ready_cutout=False)))
catalog_path.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(dict(path=output.relative_to(root).as_posix(),width=width,height=height,sha256=digest(output),preview='#/samples/characters/yuna?rev='+revision_id),ensure_ascii=False))
