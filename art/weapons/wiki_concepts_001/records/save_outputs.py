"""Save this production run without modifying generated pixels or game assets."""
import hashlib
import json
import shutil
from datetime import datetime
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[4]
BASE = ROOT / 'art/weapons/wiki_concepts_001'
runs = json.loads((BASE / 'records/runs-input.json').read_text(encoding='utf-8'))
selected = {'ml70-mule': '003', 'ih7-knocker': '003', 'hp14-bastion': '001', 'sg23-breacher': '002'}
manifest = []
for run in runs:
    directory = BASE / run['dir']
    record = dict(run)
    record.update(tool='built-in image_gen.imagegen', model='not exposed by tool', cost='not reported by tool')
    if run.get('source'):
        target = directory / 'source/illustration.png'
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(run['source'], target)
        with Image.open(target) as im:
            record.update(width=im.width, height=im.height, mode=im.mode)
        record['sha256'] = hashlib.sha256(target.read_bytes()).hexdigest()
        record['source'] = target.relative_to(ROOT).as_posix()
        current = selected.get(run['id'], '001') == run['revision']
        record['status'] = 'user-review-pending' if current else 'superseded-or-rejected'
        if current:
            filename = f"{run['id']}-{run['revision']}.png"
            public = ROOT / 'wiki/public/assets/weapons' / filename
            public.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(target, public)
            assert hashlib.sha256(public.read_bytes()).hexdigest() == record['sha256']
            record['asset'] = 'assets/weapons/' + filename
            if run['id'] == 'hp14-bastion':
                record['status'] = 'previous-concept-length-revision-blocked'
            if run['id'] == 'ml70-mule':
                record['status'] = 'previous-concept-futuristic-revision-blocked'
            if run['id'] == 'sg23-breacher':
                record['status'] = 'previous-tactical-reference-new-revision-blocked'
    else:
        record['status'] = 'generation-failed'
    if run.get('start') and run.get('end'):
        fmt = '%Y-%m-%d %H:%M:%S UTC'
        record['elapsed_seconds'] = (datetime.strptime(run['end']['current_time'], fmt) - datetime.strptime(run['start']['current_time'], fmt)).total_seconds()
    (directory / 'records/generation.json').write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    manifest.append(record)

chosen = [r for r in manifest if 'asset' in r]
assert len(chosen) == 10, f'Expected 10 available illustrations, got {len(chosen)}'
media = ROOT / 'wiki/content/media/weapon-concepts-001.json'
media.write_text(json.dumps({'status': 'user-review-pending; HP-14 barrel and ML-70 futuristic revisions blocked', 'images': chosen}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
(BASE / 'records/manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

def illustration(r):
    caption = r['role'] + ' · 시안 ' + r['revision'] + ' · 검수 대기'
    if r['id'] == 'hp14-bastion':
        caption = r['role'] + ' · 이전 시안 001 · 총열 재조정 대기'
    if r['id'] == 'ml70-mule':
        caption = r['role'] + ' · 이전 시안 003 · 근미래 외형 보완 대기'
    if r['id'] == 'sg23-breacher':
        caption = r['role'] + ' · 이전 시안 002 · 택티컬 보완 대기'
    return dict(src=r['asset'], title=r['title'], alt=r['title'] + ' 장비 외형 원화', caption=caption, width=r['width'], height=r['height'], article='yuna' if r['id'] == 'yuna-physical-shield' else 'weapon-' + r['id'])

def set_images(slug, images):
    path = ROOT / 'wiki/content/articles' / (slug + '.md')
    raw = path.read_text(encoding='utf-8')
    backup = BASE / 'records/before/articles' / path.name
    backup.parent.mkdir(parents=True, exist_ok=True)
    if not backup.exists():
        backup.write_text(raw, encoding='utf-8')
    lines = raw.splitlines()
    lines = [line for line in lines if not line.startswith('illustrations: ')]
    lines.insert(lines.index('---', 1), 'illustrations: ' + json.dumps(images, ensure_ascii=False, separators=(',', ':')))
    path.write_text('\n'.join(lines) + '\n', encoding='utf-8')

set_images('clone-special-weapons', [illustration(r) for r in chosen])
for r in chosen:
    if r['id'] != 'yuna-physical-shield':
        set_images('weapon-' + r['id'], [illustration(r)])
set_images('yuna', [illustration(r) for r in chosen if r['id'] in ['yuna-physical-shield', 'hp14-bastion', 'ih7-knocker']])
print(json.dumps({'saved': len([r for r in manifest if r.get('source')]), 'current': len(chosen), 'failed': len([r for r in manifest if r['status'] == 'generation-failed'])}))
