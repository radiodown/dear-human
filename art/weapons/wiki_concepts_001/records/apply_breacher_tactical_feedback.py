"""Apply tactical feedback and record unsuccessful image requests; no image editing."""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[4]
base = root / 'art/weapons/wiki_concepts_001'

def read(path):
    return json.loads(path.read_text(encoding='utf-8'))

def write(path, value):
    path.write_bytes((json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))

manifest_path = base / 'records/manifest.json'
manifest = read(manifest_path)
old = next(r for r in manifest if r['id'] == 'sg23-breacher' and r['revision'] == '002')
old['asset'] = 'assets/weapons/sg23-breacher-002.png'
old['status'] = 'previous-tactical-reference-new-revision-blocked'
for record in manifest:
    if record['id'] == 'sg23-breacher' and record['revision'] == '003':
        record.pop('asset', None)
        record['status'] = 'user-rejected-too-futuristic'
for revision in ['004', '005']:
    record = read(base / f'sg23-breacher_{revision}/records/generation.json')
    if not any(r['id'] == record['id'] and r['revision'] == revision for r in manifest):
        manifest.append(record)
write(manifest_path, manifest)
media_path = root / 'wiki/content/media/weapon-concepts-001.json'
media = read(media_path)
media['images'] = [old if r['id'] == 'sg23-breacher' else r for r in media['images']]
media['status'] = 'user-review-pending; HP-14 barrel, ML-70 futuristic exterior and SG-23 tactical revisions blocked'
write(media_path, media)
for slug in ['weapon-sg23-breacher', 'clone-special-weapons']:
    path = root / f'wiki/content/articles/{slug}.md'
    raw = path.read_text(encoding='utf-8')
    backup = base / 'sg23-breacher_004/records' / (slug + '-before.md')
    if not backup.exists():
        backup.write_bytes(raw.encode('utf-8'))
    lines = raw.splitlines()
    for i, line in enumerate(lines):
        if line.startswith('illustrations: '):
            illustrations = json.loads(line[len('illustrations: '):])
            for item in illustrations:
                if item.get('article') == 'weapon-sg23-breacher':
                    item['src'] = old['asset']
                    item['caption'] = '아렌 · 전투 산탄총 · 이전 시안 002 · 택티컬 보완 대기'
            lines[i] = 'illustrations: ' + json.dumps(illustrations, ensure_ascii=False, separators=(',', ':'))
        if line.startswith('sources: '):
            sources = json.loads(line[len('sources: '):])
            sources.append('2026-11-09 사용자 후속 지정 · 브리처 003은 너무 미래적이므로 택티컬한 방향으로 수정')
            lines[i] = 'sources: ' + json.dumps(sources, ensure_ascii=False)
    path.write_bytes(('\n'.join(lines) + '\n').encode('utf-8'))
