import json
from pathlib import Path
root=Path(__file__).resolve().parents[5]
base=root/'art/weapons/wiki_concepts_001'
here=base/'ar12-rupture_002/records'
for slug in ['weapon-ar12-rupture','clone-special-weapons']:
    path=root/f'wiki/content/articles/{slug}.md'
    raw=path.read_text(encoding='utf-8')
    if not (here/(slug+'-before.md')).exists():
        (here/(slug+'-before.md')).write_bytes(raw.encode('utf-8'))
    lines=raw.splitlines()
    for i,line in enumerate(lines):
        if line.startswith('illustrations: '):
            images=json.loads(line[len('illustrations: '):])
            for image in images:
                if image.get('article')=='weapon-ar12-rupture':
                    image['caption']='아렌 · 파열탄 돌격소총 · 이전 시안 001 · 총구 장착물 보완 대기'
            lines[i]='illustrations: '+json.dumps(images,ensure_ascii=False,separators=(',',':'))
        if slug=='weapon-ar12-rupture' and line.startswith('sources: '):
            sources=json.loads(line[len('sources: '):])
            sources.append('2026-11-09 사용자 요청 · AR-12 럽처 총열 앞 장착물 추가')
            lines[i]='sources: '+json.dumps(sources,ensure_ascii=False)
    path.write_bytes(('\n'.join(lines)+'\n').encode('utf-8'))
manifest_path=base/'records/manifest.json'
manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
record=json.loads((here/'generation.json').read_text(encoding='utf-8'))
if not any(r['id']==record['id'] and r['revision']==record['revision'] for r in manifest):
    manifest.append(record)
manifest_path.write_bytes((json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
media_path=root/'wiki/content/media/weapon-concepts-001.json'
media=json.loads(media_path.read_text(encoding='utf-8'))
for image in media['images']:
    if image['id']=='ar12-rupture':
        image['status']='previous-concept; muzzle attachment revision pending'
        image['requested_equipment']='More distinct barrel-front attachment requested; angular muzzle brake proposed. Edit 002 rejected.'
media_path.write_bytes((json.dumps(media,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
