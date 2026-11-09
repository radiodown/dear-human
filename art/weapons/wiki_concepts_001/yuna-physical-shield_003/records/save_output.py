"""Install shield 003 derived from the selected Yuna illustration; preserve originals."""
import hashlib
import json
import shutil
from datetime import datetime
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[5]
base = root / 'art/weapons/wiki_concepts_001'
here = base / 'yuna-physical-shield_003'
record = json.loads((here / 'records/run-input.json').read_text(encoding='utf-8'))
original = here / 'source/illustration.png'
original.parent.mkdir(parents=True, exist_ok=True)
shutil.copyfile(record['source'], original)
with Image.open(original) as im:
    im.verify()
with Image.open(original) as im:
    record.update(width=im.width, height=im.height, mode=im.mode)
reference = root / record['reference']
refcopy = here / 'references/yuna-illustration-005.png'
refcopy.parent.mkdir(parents=True, exist_ok=True)
shutil.copyfile(reference, refcopy)
record['reference_sha256'] = hashlib.sha256(reference.read_bytes()).hexdigest()
record['reference_copy'] = refcopy.relative_to(root).as_posix()
record['source'] = original.relative_to(root).as_posix()
record['sha256'] = hashlib.sha256(original.read_bytes()).hexdigest()
record['asset'] = 'assets/weapons/yuna-physical-shield-003.png'
public = root / 'wiki/public' / record['asset']
shutil.copyfile(original, public)
assert hashlib.sha256(public.read_bytes()).hexdigest() == record['sha256']
fmt = '%Y-%m-%d %H:%M:%S UTC'
record['elapsed_seconds'] = (datetime.strptime(record['end']['current_time'], fmt) - datetime.strptime(record['start']['current_time'], fmt)).total_seconds()

def write(path, value):
    path.write_bytes((json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))

write(here / 'records/generation.json', record)
path = base / 'records/manifest.json'
manifest = json.loads(path.read_text(encoding='utf-8'))
manifest = [r for r in manifest if not (r['id'] == record['id'] and r['revision'] == record['revision'])]
for old in manifest:
    if old['id'] == record['id'] and 'asset' in old:
        old.pop('asset')
        old['status'] = 'superseded-by-yuna-reference-derived-003'
manifest.append(record)
write(path, manifest)
path = root / 'wiki/content/media/weapon-concepts-001.json'
media = json.loads(path.read_text(encoding='utf-8'))
media['images'] = [record if r['id'] == record['id'] else r for r in media['images']]
write(path, media)
for slug in ['yuna', 'clone-special-weapons']:
    path = root / f'wiki/content/articles/{slug}.md'
    raw = path.read_text(encoding='utf-8')
    backup = here / 'records' / (slug + '-before.md')
    if not backup.exists(): backup.write_bytes(raw.encode('utf-8'))
    lines = raw.splitlines()
    for i, line in enumerate(lines):
        if line.startswith('illustrations: '):
            images = json.loads(line[len('illustrations: '):])
            for image in images:
                if image['src'].startswith('assets/weapons/yuna-physical-shield-'):
                    image.update(src=record['asset'], width=record['width'], height=record['height'], alt='유나 일러스트의 흑색·금색 방패를 기준으로 분리한 장비 원화', caption='유나 일러스트 005의 방패 · 분리 원화 003 · 일치도 검수 대기')
            lines[i] = 'illustrations: ' + json.dumps(images, ensure_ascii=False, separators=(',', ':'))
        if line.startswith('sources: '):
            sources = json.loads(line[len('sources: '):])
            note = '2026-11-09 사용자 첨부·지정 · 물리 방패는 유나 이미지 속 디자인을 사용'
            if note not in sources: sources.append(note)
            lines[i] = 'sources: ' + json.dumps(sources, ensure_ascii=False)
        if slug == 'yuna' and line.startswith('profile: '):
            profile = json.loads(line[len('profile: '):])
            for field in profile['fields']:
                if field[0] == '장비 기본안': field[1] = '물리 방패 · 유나 일러스트 005 외형 기준 · 사양 미정'
            lines[i] = 'profile: ' + json.dumps(profile, ensure_ascii=False, separators=(',', ':'))
    path.write_bytes(('\n'.join(lines) + '\n').encode('utf-8'))
assert hashlib.sha256(reference.read_bytes()).hexdigest() == record['reference_sha256']
print(json.dumps({'asset': record['asset'], 'dimensions': [record['width'], record['height']], 'reference_unchanged': True}))
