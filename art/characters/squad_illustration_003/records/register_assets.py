from pathlib import Path
import copy
import hashlib
import json
import re
import shutil
from PIL import Image

root = Path(__file__).resolve().parents[4]
records = Path(__file__).parent
manifest = json.loads((records/'generated-files.json').read_text(encoding='utf-8'))
catalog_file = root/'game/public/assets/catalog/asset_index.json'
catalog = json.loads(catalog_file.read_text(encoding='utf-8'))
before = copy.deepcopy(catalog)
rows = []

def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()

def write_json(file, data):
    file.parent.mkdir(parents=True,exist_ok=True)
    file.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

for item in manifest['outputs']:
    character = item['id']
    folder = root/f'art/characters/{character}/concepts/illustration_003'
    image = folder/'source/illustration.png'
    image.parent.mkdir(parents=True,exist_ok=True)
    if image.exists():
        raise FileExistsError(image)
    shutil.copyfile(item['source_path'],image)
    with Image.open(image) as source:
        source.verify()
    with Image.open(image) as source:
        width,height=source.size
    content_hash=digest(image)
    write_json(folder/'records/generation.json',{**item,'tool':'image_gen.imagegen','model':None,'cost':None,'seed':None,'width':width,'height':height,'sha256':content_hash,'transformations':[],'art_direction_status':'awaiting_user_review','review_scope':'East Asian facial art direction; adult appearance and existing role equipment retained visually; no pixel identity guarantee'})
    wiki_image=root/f'wiki/public/assets/characters/{character}-illustration-003.png'
    if wiki_image.exists():
        raise FileExistsError(wiki_image)
    shutil.copyfile(image,wiki_image)
    assert digest(wiki_image)==content_hash
    write_json(root/f'wiki/content/media/{character}-illustration-003.json',{'asset':f'public/assets/characters/{character}-illustration-003.png','source':image.relative_to(root).as_posix(),'sha256':content_hash,'width':width,'height':height,'status':'시안 003 · 사용자 검수 대기','treatment':'내장 image_gen 원본을 바이트 변경 없이 복사','prompt':f'art/characters/{character}/concepts/illustration_003/records/prompt.md'})
    article=root/f'wiki/content/articles/{character}.md'
    raw=article.read_text(encoding='utf-8').replace('\r\n','\n')
    match=re.fullmatch(r'---\n(.*?)\n---\n(.*)',raw,re.S)
    metadata={}
    for line in match[1].splitlines():
        key,value=line.split(':',1)
        metadata[key]=json.loads(value)
    metadata['portrait']={'src':f'assets/characters/{character}-illustration-003.png','alt':f'{item["name"]}의 동아시아계 얼굴 인상과 병과별 제복을 표현한 전신 콘셉트 시안 003','caption':f'{item["name"]} · 일러스트 시안 003 · 사용자 검수 대기 · 누르면 크게 보기','width':width,'height':height}
    metadata['sources'].append('2026-11-09 사용자 수정 · 동아시아계 얼굴 인상 · 일러스트 003')
    metadata['profile']['fields'].append(['얼굴 표현','동아시아계 인상 · 시안 003'])
    body=match[2].replace('콘셉트 시안 002','콘셉트 시안 003').replace('시안 002','시안 003')
    body=body.replace('## 콘셉트 시안 003\n','## 콘셉트 시안 003\n\n얼굴 표현은 **동아시아계의 자연스러운 인상**으로 맞춘다. 리안의 공통 화풍을 참고하되 각기 다른 얼굴이며 작중 국적·혈통·생산권을 새로 정하는 설정은 아니다.\n',1)
    front='\n'.join(key+': '+json.dumps(value,ensure_ascii=False,separators=(',',':')) for key,value in metadata.items())
    article.write_text('---\n'+front+'\n---\n'+body,encoding='utf-8')
    entry=next(entry for entry in catalog['entries'] if entry['kind']=='character' and entry['entity_id']==character)
    if any(revision['revision_id']=='illustration_003' for revision in entry['revisions']):
        raise ValueError('Revision 003 already registered')
    previous=next(revision for revision in entry['revisions'] if revision['revision_id']=='illustration_002')
    revision=copy.deepcopy(previous)
    revision.update({'revision_id':'illustration_003','display_name':item['name']+' · 일러스트 003 · 동아시아계 인상','status':'draft','verification':'untested','verification_scope':'awaiting_targeted_static_preview','art_direction_status':'awaiting_user_review','recipe_key':f'squad-illustration-003-{character}','description':previous['description']+' 동아시아계 얼굴 인상으로 수정한 시안 003.','dependencies':[{'kind':'character','entity_id':'clone_01','revision_id':'reference_003_3d'},{'kind':'character','entity_id':character,'revision_id':'illustration_002'}]})
    revision['artifacts']=[{'path':file.relative_to(root).as_posix(),'sha256':digest(file)} for file in (image,folder/'records/prompt.json',folder/'records/prompt.md',folder/'records/generation.json')]
    revision['preview']['image_path']=image.relative_to(root).as_posix()
    revision['preview']['width']=width
    revision['preview']['height']=height
    revision['appearance_specs'].append(['얼굴 표현','동아시아계 인상 · 시안'])
    revision['review_notes']=['003: 동아시아계 얼굴 인상 · 사용자 검수 대기','25~26세 외형·신형 장비·병과별 제복 유지','가터벨트는 이렌만 · 정지 이미지·모션 미지원']
    previous['status']='archived'
    previous['art_direction_status']='rejected_by_user'
    previous.setdefault('review_notes',[]).append('사용자 피드백: 얼굴이 너무 서양인처럼 보여 003에서 수정')
    entry['revisions'].append(revision)
    entry['review_revision_id']='illustration_003'
    rows.append({'character':character,'width':width,'height':height,'sha256':content_hash,'source_equals_wiki':True})
    print(character,width,height,'003 saved and registered')

write_json(records/'catalog-before-registration.json',before)
write_json(catalog_file,catalog)
write_json(records/'file-review.json',{'scope':'four new 003 files only; PNG decode/dimensions/SHA-256 and byte-identical wiki copy','items':rows,'art_direction_status':'awaiting_user_review'})
