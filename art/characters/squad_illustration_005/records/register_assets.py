from pathlib import Path
import copy
import hashlib
import json
import re
import shutil
from PIL import Image

root=Path(__file__).resolve().parents[4]
records=Path(__file__).parent
manifest=json.loads((records/'generated-files.json').read_text(encoding='utf-8'))
catalog_file=root/'game/public/assets/catalog/asset_index.json'
catalog=json.loads(catalog_file.read_text(encoding='utf-8'))
before=copy.deepcopy(catalog)

def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()

def write_json(file,data):
    file.parent.mkdir(parents=True,exist_ok=True)
    file.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

for item in manifest['outputs']:
    character=item['id']
    folder=root/f'art/characters/{character}/concepts/illustration_005'
    image=folder/'source/illustration.png'
    image.parent.mkdir(parents=True,exist_ok=True)
    if image.exists():
        raise FileExistsError(image)
    shutil.copyfile(item['source_path'],image)
    with Image.open(image) as source:
        source.verify()
    with Image.open(image) as source:
        width,height=source.size
    content_hash=digest(image)
    write_json(folder/'records/generation.json',{**item,'tool':'image_gen.imagegen','model':None,'cost':None,'seed':None,'width':width,'height':height,'sha256':content_hash,'transformations':[],'art_direction_status':'awaiting_user_review','review_scope':'face and hairstyle edit; equipment and wardrobe retained visually; aesthetic approval pending'})
    wiki_image=root/f'wiki/public/assets/characters/{character}-illustration-005.png'
    if wiki_image.exists():
        raise FileExistsError(wiki_image)
    shutil.copyfile(image,wiki_image)
    assert digest(wiki_image)==content_hash
    write_json(root/f'wiki/content/media/{character}-illustration-005.json',{'asset':f'public/assets/characters/{character}-illustration-005.png','source':image.relative_to(root).as_posix(),'sha256':content_hash,'width':width,'height':height,'status':'시안 005 · 사용자 검수 대기','treatment':'내장 image_gen 원본을 바이트 변경 없이 복사','prompt':f'art/characters/{character}/concepts/illustration_005/records/prompt.md'})
    article=root/f'wiki/content/articles/{character}.md'
    raw=article.read_text(encoding='utf-8').replace('\r\n','\n')
    match=re.fullmatch(r'---\n(.*?)\n---\n(.*)',raw,re.S)
    metadata={key:json.loads(value) for key,value in (line.split(':',1) for line in match[1].splitlines())}
    metadata['portrait']={'src':f'assets/characters/{character}-illustration-005.png','alt':item['name']+'의 얼굴과 헤어를 수정한 일러스트 시안 005','caption':item['name']+' · 일러스트 시안 005 · 사용자 검수 대기 · 누르면 크게 보기','width':width,'height':height}
    metadata['sources'].append('2026-11-09 사용자 수정 · 이렌 생머리 단발·유나 헤어 변경과 더 미인인 얼굴 · 일러스트 005')
    metadata['profile']['fields']=[row for row in metadata['profile']['fields'] if row[0] not in ('얼굴 표현','헤어 시안')]+[['얼굴 표현',item['beauty']+' · 시안 005'],['헤어 시안',item['hair']]]
    metadata['profile']['note']=metadata['profile']['note'].replace('일러스트 004','일러스트 005')
    body=match[2].replace('최신 일러스트 004','최신 일러스트 005')
    if character=='iren':
        old='윤기나는 흑발 쇄골 길이 레이어드 컷, 옆으로 넘긴 앞머리'
        new='턱선 아래에서 반듯하게 끝나는 깔끔한 흑발 생머리 단발과 정돈된 옆가르마'
    else:
        old='윤기나는 흑발 하이 포니테일과 깔끔한 헤어라인'
        new='옆가르마를 준 긴 흑발 생머리 반묶음'
        body=body.replace('산뜻하고 또렷한 미인상','맑고 화사한 미인상')
    assert old in body,(character,'Expected current appearance paragraph missing')
    body=body.replace(old,new)
    front='\n'.join(key+': '+json.dumps(value,ensure_ascii=False,separators=(',',':')) for key,value in metadata.items())
    article.write_text('---\n'+front+'\n---\n'+body,encoding='utf-8')
    entry=next(entry for entry in catalog['entries'] if entry['kind']=='character' and entry['entity_id']==character)
    assert not any(revision['revision_id']=='illustration_005' for revision in entry['revisions'])
    previous=next(revision for revision in entry['revisions'] if revision['revision_id']=='illustration_004')
    revision=copy.deepcopy(previous)
    revision.update({'revision_id':'illustration_005','display_name':item['name']+' · 일러스트 005 · 얼굴·헤어 수정','status':'draft','verification':'untested','verification_scope':'awaiting_targeted_static_preview','art_direction_status':'awaiting_user_review','recipe_key':f'squad-illustration-005-{character}','description':item['beauty']+' · '+item['hair']+' · 25~26세 외형. 병과별 제복과 신형 장비 유지. 사용자 검수 대기.','dependencies':[{'kind':'character','entity_id':'clone_01','revision_id':'reference_003_3d'},{'kind':'character','entity_id':character,'revision_id':'illustration_004'}]})
    revision['artifacts']=[{'path':file.relative_to(root).as_posix(),'sha256':digest(file)} for file in (image,folder/'records/prompt.json',folder/'records/prompt.md',folder/'records/generation.json')]
    revision['preview'].update({'image_path':image.relative_to(root).as_posix(),'width':width,'height':height})
    revision['appearance_specs']=[row for row in previous['appearance_specs'] if row[0] not in ('얼굴 시안','헤어')]+[['얼굴 시안',item['beauty']],['헤어',item['hair']]]
    revision['review_notes']=['005: 얼굴·헤어 수정 · 사용자 검수 대기','25~26세·병과별 제복·장비 유지','이렌만 가터벨트 · 세나·모아 원화는 004 유지']
    previous['status']='archived'
    previous['art_direction_status']='revision_requested'
    previous.setdefault('review_notes',[]).append('사용자 요청으로 해당 인물 얼굴·헤어를 005에서 수정')
    entry['revisions'].append(revision)
    entry['review_revision_id']='illustration_005'
    print(character,width,height,'005 saved and registered')

write_json(records/'catalog-before-registration.json',before)
write_json(catalog_file,catalog)
