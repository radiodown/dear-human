"""Save shield 002 and update only its current wiki references."""
import hashlib
import json
import shutil
from pathlib import Path
from datetime import datetime
from PIL import Image

root = Path(__file__).resolve().parents[5]
base = root / 'art/weapons/wiki_concepts_001'
here = base / 'yuna-physical-shield_002'
record = json.loads((here / 'records/run-input.json').read_text(encoding='utf-8'))
target = here / 'source/illustration.png'
target.parent.mkdir(parents=True, exist_ok=True)
shutil.copyfile(record['source'], target)
with Image.open(target) as im:
    record.update(width=im.width, height=im.height, mode=im.mode)
record['source'] = target.relative_to(root).as_posix()
record['sha256'] = hashlib.sha256(target.read_bytes()).hexdigest()
record['input_sha256'] = hashlib.sha256((base / 'yuna-physical-shield/source/illustration.png').read_bytes()).hexdigest()
record['asset'] = 'assets/weapons/yuna-physical-shield-002.png'
fmt = '%Y-%m-%d %H:%M:%S UTC'
record['elapsed_seconds'] = (datetime.strptime(record['end']['current_time'], fmt) - datetime.strptime(record['start']['current_time'], fmt)).total_seconds()
public = root / 'wiki/public' / record['asset']
shutil.copyfile(target, public)
assert hashlib.sha256(public.read_bytes()).hexdigest() == record['sha256']

def write(path, value):
    path.write_bytes((json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))

write(here / 'records/generation.json', record)
manifest_path = base / 'records/manifest.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
for old in manifest:
    if old['id'] == record['id']:
        old.pop('asset', None)
        old['status'] = 'superseded-by-flat-shield-002'
manifest = [old for old in manifest if not (old['id'] == record['id'] and old['revision'] == record['revision'])]
manifest.append(record)
write(manifest_path, manifest)
media_path = root / 'wiki/content/media/weapon-concepts-001.json'
media = json.loads(media_path.read_text(encoding='utf-8'))
media['images'] = [record if old['id'] == record['id'] else old for old in media['images']]
write(media_path, media)

for slug in ['yuna', 'clone-special-weapons']:
    path = root / f'wiki/content/articles/{slug}.md'
    raw = path.read_text(encoding='utf-8')
    backup = here / 'records' / (slug + '-before.md')
    if not backup.exists():
        backup.write_bytes(raw.encode('utf-8'))
    lines = raw.splitlines()
    for index, line in enumerate(lines):
        if line.startswith('illustrations: '):
            images = json.loads(line[len('illustrations: '):])
            for image in images:
                if image['src'].startswith('assets/weapons/yuna-physical-shield-'):
                    image.update(src=record['asset'], width=record['width'], height=record['height'], alt='평판형 전면에 제국 문장 시안을 넣은 유나의 물리 방패', caption='유나 · 평판형 물리 방패 · 제국 문장 시안 002 · 검수 대기')
            lines[index] = 'illustrations: ' + json.dumps(images, ensure_ascii=False, separators=(',', ':'))
        if line.startswith('sources: '):
            sources = json.loads(line[len('sources: '):])
            note = '2026-11-09 사용자 원화 수정 · 물리 방패는 평면적으로, 전면에 제국 로고'
            if note not in sources:
                sources.append(note)
            lines[index] = 'sources: ' + json.dumps(sources, ensure_ascii=False)
    path.write_bytes(('\n'.join(lines) + '\n').encode('utf-8'))
print(json.dumps({'asset': record['asset'], 'dimensions': [record['width'], record['height']], 'sha256': record['sha256']}))
