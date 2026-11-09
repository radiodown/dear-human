"""Persist this retry batch and install only successfully produced illustrations."""
import hashlib
import json
import shutil
from datetime import datetime
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[4]
BASE = ROOT / 'art/weapons/wiki_concepts_001'
RUNS = json.loads((BASE / 'records/regeneration-002-complete-runs.json').read_text(encoding='utf-8'))
CAPTIONS = {
    'hp14-bastion': '유나 · 대구경 권총 · 컴펜세이터·총열 비례 조정 · 시안 006 · 검수 대기',
    'sg23-breacher': '아렌 · 택티컬 산탄총·소음기 · 시안 007 · 검수 대기',
    'ml70-mule': '모아 · 근미래 유탄발사기 · 시안 007 · 검수 대기',
}
ALTS = {
    'hp14-bastion': '적당한 총열 길이와 짧은 컴펜세이터를 갖춘 HP-14 바스티온 원화',
    'sg23-breacher': '금속 몸통과 소음기를 갖춘 택티컬 SG-23 브리처 원화',
    'ml70-mule': '부분 드럼 외피와 통합 광학계를 적용한 근미래 ML-70 뮬 원화',
}

def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes((json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))

records = []
selected = {}
for run in RUNS:
    record = dict(run, tool='built-in image_gen.imagegen', model='not exposed by tool', cost='not reported by tool')
    directory = BASE / run['dir']
    if run.get('source'):
        source = directory / 'source/illustration.png'
        source.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(run['source'], source)
        with Image.open(source) as im:
            im.verify()
        with Image.open(source) as im:
            record.update(width=im.width, height=im.height, mode=im.mode)
        record['source'] = source.relative_to(ROOT).as_posix()
        record['sha256'] = hashlib.sha256(source.read_bytes()).hexdigest()
        record['status'] = 'user-review-pending'
        record['asset'] = f"assets/weapons/{run['id']}-{run['revision']}.png"
        public = ROOT / 'wiki/public' / record['asset']
        shutil.copyfile(source, public)
        assert hashlib.sha256(public.read_bytes()).hexdigest() == record['sha256']
        selected[run['id']] = record
    else:
        record['status'] = 'generation-failed'
    if run.get('reference'):
        ref = Path(run['reference'])
        record['reference'] = ref.relative_to(ROOT).as_posix()
        record['reference_sha256'] = hashlib.sha256(ref.read_bytes()).hexdigest()
    fmt = '%Y-%m-%d %H:%M:%S UTC'
    record['elapsed_seconds'] = (datetime.strptime(run['end']['current_time'], fmt) - datetime.strptime(run['start']['current_time'], fmt)).total_seconds()
    write(directory / 'records/generation.json', record)
    records.append(record)

assert set(selected) == set(CAPTIONS), 'Review outcomes before changing the installed selection'
manifest_path = BASE / 'records/manifest.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
batch_keys = {(r['id'], r['revision']) for r in records}
manifest = [r for r in manifest if (r['id'], r['revision']) not in batch_keys]
for previous in manifest:
    if previous['id'] in selected and 'asset' in previous:
        previous.pop('asset')
        previous['status'] = 'superseded-by-' + selected[previous['id']]['revision']
manifest.extend(records)
write(manifest_path, manifest)
media_path = ROOT / 'wiki/content/media/weapon-concepts-001.json'
media = json.loads(media_path.read_text(encoding='utf-8'))
media['images'] = [selected.get(r['id'], r) for r in media['images']]
media['status'] = 'user-review-pending; AR-12 muzzle attachment revision remains blocked'
write(media_path, media)

updated = []
for path in (ROOT / 'wiki/content/articles').glob('*.md'):
    raw = path.read_text(encoding='utf-8')
    lines = raw.splitlines()
    changed = False
    for i, line in enumerate(lines):
        if not line.startswith('illustrations: '):
            continue
        images = json.loads(line[len('illustrations: '):])
        for image in images:
            slug = image.get('article', '')
            identifier = slug.removeprefix('weapon-')
            if identifier in selected:
                record = selected[identifier]
                image.update(src=record['asset'], width=record['width'], height=record['height'], caption=CAPTIONS[identifier], alt=ALTS[identifier])
                changed = True
        if changed:
            lines[i] = 'illustrations: ' + json.dumps(images, ensure_ascii=False, separators=(',', ':'))
    if changed:
        backup = BASE / 'records/before-regeneration-002' / path.name
        backup.parent.mkdir(parents=True, exist_ok=True)
        if not backup.exists():
            backup.write_bytes(raw.encode('utf-8'))
        for i, line in enumerate(lines):
            if line.startswith('sources: '):
                sources = json.loads(line[len('sources: '):])
                note = '2026-11-09 사용자 재생성 요청 · 바스티온 006·브리처 007·뮬 007 새 원화'
                if note not in sources:
                    sources.append(note)
                lines[i] = 'sources: ' + json.dumps(sources, ensure_ascii=False)
        path.write_bytes(('\n'.join(lines) + '\n').encode('utf-8'))
        updated.append(path.name)
write(BASE / 'records/regeneration-002-result.json', {'attempts': len(records), 'generated': list(selected), 'failed': [r['dir'] for r in records if r['status'] == 'generation-failed'], 'updated_articles': updated, 'records': records})
print(json.dumps({'saved': len(selected), 'failed_attempts': len(records) - len(selected), 'updated_articles': updated}))
