"""Record a suppressor setting; the rejected edit produced no new image."""
import json
from pathlib import Path
root = Path(__file__).resolve().parents[5]
base = root / 'art/weapons/wiki_concepts_001'
here = base / 'sg23-breacher_006/records'
for slug in ['weapon-sg23-breacher', 'clone-special-weapons']:
    path = root / f'wiki/content/articles/{slug}.md'
    raw = path.read_text(encoding='utf-8')
    if not (here / (slug + '-before.md')).exists():
        (here / (slug + '-before.md')).write_bytes(raw.encode('utf-8'))
    lines = raw.splitlines()
    for i, line in enumerate(lines):
        if line.startswith('illustrations: '):
            images = json.loads(line[len('illustrations: '):])
            for image in images:
                if image.get('article') == 'weapon-sg23-breacher':
                    image['caption'] = '아렌 · 전투 산탄총 · 이전 시안 002 · 소음기 그림 미반영·택티컬 보완 대기'
            lines[i] = 'illustrations: ' + json.dumps(images, ensure_ascii=False, separators=(',', ':'))
        if slug == 'weapon-sg23-breacher' and line.startswith('sources: '):
            sources = json.loads(line[len('sources: '):])
            note = '2026-11-09 사용자 지정 · 브리처에 소음기 장착'
            if note not in sources:
                sources.append(note)
            lines[i] = 'sources: ' + json.dumps(sources, ensure_ascii=False)
    path.write_bytes(('\n'.join(lines) + '\n').encode('utf-8'))
manifest_path = base / 'records/manifest.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
record = json.loads((here / 'generation.json').read_text(encoding='utf-8'))
if not any(r['id'] == record['id'] and r['revision'] == record['revision'] for r in manifest):
    manifest.append(record)
manifest_path.write_bytes((json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
media_path = root / 'wiki/content/media/weapon-concepts-001.json'
media = json.loads(media_path.read_text(encoding='utf-8'))
for image in media['images']:
    if image['id'] == 'sg23-breacher':
        image['status'] = 'previous-concept; suppressor not pictured; tactical revision pending'
        image['requested_equipment'] = 'Suppressor fitted; user-confirmed fictional equipment setting. Image edit 006 rejected.'
media_path.write_bytes((json.dumps(media, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
