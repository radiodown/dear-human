from pathlib import Path
import hashlib
import json
import re
import shutil
from PIL import Image

root = Path(__file__).resolve().parents[4]
records = Path(__file__).parent
manifest = json.loads((records / 'generated-files.json').read_text(encoding='utf-8'))
catalog_path = root / 'game/public/assets/catalog/asset_index.json'
catalog = json.loads(catalog_path.read_text(encoding='utf-8'))
original_entries = json.loads(json.dumps(catalog['entries']))
names = {'sena':'세나', 'moa':'모아', 'yuna':'유나', 'iren':'이렌'}
review_rows = []

def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()

def write_json(file, data):
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

for item in manifest['outputs']:
    character = item['id']
    if any(entry['kind']=='character' and entry['entity_id']==character for entry in catalog['entries']):
        raise ValueError(f'Existing character requires explicit revision handling: {character}')
    folder = root / f'art/characters/{character}/concepts/illustration_002'
    image = folder / 'source/illustration.png'
    image.parent.mkdir(parents=True, exist_ok=True)
    if image.exists():
        raise FileExistsError(image)
    shutil.copyfile(item['source_path'], image)
    with Image.open(image) as source:
        source.verify()
    with Image.open(image) as source:
        width, height = source.size
        mode = source.mode
    source_hash = digest(image)
    generation = {**item, 'tool':'image_gen.imagegen', 'model':None, 'cost':None, 'seed':None, 'width':width, 'height':height, 'mode':mode, 'source_sha256':source_hash, 'art_direction_status':'awaiting_user_review', 'transformations':[], 'review_scope':'full-body portrait, youthful adult face direction, role-specific equipment and Iren-only garters; user aesthetic approval pending', 'limitations':'Illustrative weapons; exact engineering, ages as visually perceived and production cutout usability require user review.'}
    write_json(folder / 'records/generation.json', generation)
    wiki_image = root / f'wiki/public/assets/characters/{character}-illustration-002.png'
    if wiki_image.exists():
        raise FileExistsError(wiki_image)
    shutil.copyfile(image, wiki_image)
    assert digest(wiki_image) == source_hash
    write_json(root / f'wiki/content/media/{character}-illustration-002.json', {'asset':f'public/assets/characters/{character}-illustration-002.png', 'source':image.relative_to(root).as_posix(), 'sha256':source_hash, 'width':width, 'height':height, 'status':'시안 002 · 사용자 검수 대기', 'treatment':'원본 PNG를 바이트 변경 없이 복사. 이전 001은 사용자 반려 상태로 아트 폴더에 보존.', 'prompt':f'art/characters/{character}/concepts/illustration_002/records/prompt.md'})
    article = root / f'wiki/content/articles/{character}.md'
    raw = article.read_text(encoding='utf-8').replace('\r\n','\n')
    match = re.fullmatch(r'---\n(.*?)\n---\n(.*)', raw, re.S)
    metadata = {}
    for line in match[1].splitlines():
        key, value = line.split(':',1)
        metadata[key] = json.loads(value)
    metadata['portrait'] = {'src':f'assets/characters/{character}-illustration-002.png', 'alt':f'{names[character]}의 병과별 제복과 신형 장비를 표현한 전신 콘셉트 시안 002', 'caption':f'{names[character]} · 일러스트 시안 002 · 사용자 검수 대기 · 누르면 크게 보기', 'width':width, 'height':height}
    front = '\n'.join(key + ': ' + json.dumps(value, ensure_ascii=False, separators=(',',':')) for key, value in metadata.items())
    article.write_text('---\n'+front+'\n---\n'+match[2], encoding='utf-8')
    revisions = []
    for version in ('001','002'):
        version_folder = root / f'art/characters/{character}/concepts/illustration_{version}'
        artifacts = [{'path':file.relative_to(root).as_posix(), 'sha256':digest(file)} for file in [version_folder/'source/illustration.png', version_folder/'records/prompt.json', version_folder/'records/prompt.md', version_folder/'records/generation.json']]
        dependencies = [{'kind':'character','entity_id':'clone_01','revision_id':'reference_003_3d'}]
        if version == '002':
            dependencies.append({'kind':'character','entity_id':character,'revision_id':'illustration_001'})
        revisions.append({'revision_id':f'illustration_{version}', 'display_name':f'{names[character]} · 일러스트 {version}'+(' · 반려' if version=='001' else ' · 병과별 신형 장비'), 'status':'archived' if version=='001' else 'draft', 'verification':'failed' if version=='001' else 'untested', 'verification_scope':'user_art_review_rejected' if version=='001' else 'awaiting_targeted_preview_check', 'art_direction_status':'rejected_by_user' if version=='001' else 'awaiting_user_review', 'recipe_key':f'squad-illustration-{version}-{character}', 'artifacts':artifacts, 'dependencies':dependencies, 'description':('사용자 반려: 구식 화기·노화된 인상. 변경 전 기록이다.' if version=='001' else item['concept']+' 외형 시안·사용자 검수 대기. 모션은 미지원.'), 'appearance_specs':[['외형상 나이','25~26세 상당' if version=='002' else '반려한 이전 시도'],['역할',{'sena':'저격·관측','moa':'분대지원화기','yuna':'방패·진입','iren':'돌격'}[character]],['가터벨트','이렌만 착용' if character=='iren' and version=='002' else '없음'],['상태','사용자 반려' if version=='001' else '검수 대기']], 'palette':[{'label':'블랙','hex':'#17191F'},{'label':'건메탈','hex':'#454954'},{'label':'절제된 금장','hex':'#B79B6D'}], 'review_notes':['정지 일러스트만 제공 · 모션·리그 없음', '정확한 무기 모델·방호 수치 미정', '001은 사용자 반려 · 002는 사용자 검수 대기'], 'preview':{'image_path':f'art/characters/{character}/concepts/illustration_{version}/source/illustration.png','width':width,'height':height,'views':['front'],'type':'concept_image','production_ready_cutout':False}})
    catalog['entries'].append({'kind':'character','entity_id':character,'display_name':names[character], 'status':'draft','selected_revision_id':None,'review_revision_id':'illustration_002','capabilities':['concept_image'],'revisions':revisions})
    review_rows.append({'character':character, 'width':width,'height':height,'sha256':source_hash,'source_equals_wiki':True})
    print(character, width, height, 'saved and registered')

assert catalog['entries'][:len(original_entries)] == original_entries
write_json(records / 'catalog-before-registration.json', {'schema_version':catalog['schema_version'],'entries':original_entries})
write_json(catalog_path, catalog)
write_json(records / 'file-review.json', {'scope':'new 002 PNG decode/dimensions/hash and byte-identical wiki copies only; original catalog entries preserved','items':review_rows,'art_direction_status':'awaiting_user_review'})
