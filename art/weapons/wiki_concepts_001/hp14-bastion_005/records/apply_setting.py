"""Record the requested fictional equipment setting without claiming an image edit."""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[5]
base = root / 'art/weapons/wiki_concepts_001'
for slug in ['weapon-hp14-bastion', 'clone-special-weapons', 'yuna']:
    path = root / f'wiki/content/articles/{slug}.md'
    raw = path.read_text(encoding='utf-8')
    backup = base / 'hp14-bastion_005/records' / (slug + '-before.md')
    if not backup.exists():
        backup.write_bytes(raw.encode('utf-8'))
    lines = raw.splitlines()
    for index, line in enumerate(lines):
        if line.startswith('illustrations: '):
            images = json.loads(line[len('illustrations: '):])
            for image in images:
                if image.get('article') == 'weapon-hp14-bastion':
                    image['caption'] = '유나 · 대구경 권총 · 이전 시안 001 · 컴펜세이터 그림 미반영·총열 재조정 대기'
            lines[index] = 'illustrations: ' + json.dumps(images, ensure_ascii=False, separators=(',', ':'))
        if slug == 'weapon-hp14-bastion' and line.startswith('sources: '):
            sources = json.loads(line[len('sources: '):])
            note = '2026-11-09 사용자 지정 · 바스티온에 컴펜세이터 장착'
            if note not in sources:
                sources.append(note)
            lines[index] = 'sources: ' + json.dumps(sources, ensure_ascii=False)
    path.write_bytes(('\n'.join(lines) + '\n').encode('utf-8'))
manifest_path = base / 'records/manifest.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
record = json.loads((base / 'hp14-bastion_005/records/generation.json').read_text(encoding='utf-8'))
if not any(r['id'] == record['id'] and r['revision'] == record['revision'] for r in manifest):
    manifest.append(record)
manifest_path.write_bytes((json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
media_path = root / 'wiki/content/media/weapon-concepts-001.json'
media = json.loads(media_path.read_text(encoding='utf-8'))
for image in media['images']:
    if image['id'] == 'hp14-bastion':
        image['status'] = 'previous-concept; compensator not pictured; barrel revision pending'
        image['requested_equipment'] = 'Compensator fitted; user-confirmed fictional equipment setting. Image edit 005 rejected.'
media_path.write_bytes((json.dumps(media, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
