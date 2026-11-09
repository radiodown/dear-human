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
catalog_path=root/'game/public/assets/catalog/asset_index.json'
catalog=json.loads(catalog_path.read_text(encoding='utf-8'))
before=copy.deepcopy(catalog)
roles={'sena':'저격·관측','moa':'분대지원화기','yuna':'방패·진입','iren':'돌격'}
uniforms={'sena':'가벼운 정찰 망토와 경량 장갑·전술 바지, 신형 정밀 사격 소총을 유지한다. 가터벨트는 착용하지 않는다.','moa':'탄약 하중을 받치는 하네스와 강화 장갑·전술 바지, 신형 지원화기를 유지한다. 가터벨트는 착용하지 않는다.','yuna':'방패용 전완·흉부 장갑과 짧은 망토·방호 바지, 신형 복합재 방패를 유지한다. 가터벨트는 착용하지 않는다.','iren':'분절 돌격 장갑과 짧은 장갑 하의·안전 하의·스타킹, 신형 돌격 소총을 유지한다. 네 명 중 이렌만 허리에서 스타킹으로 이어지는 가터벨트를 착용한다. 각성 후 약 7년 활동 기간과 기존 친구·전임 지휘관 사망 이력은 유지한다.'}

def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()

def write_json(file,data):
    file.parent.mkdir(parents=True,exist_ok=True)
    file.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

for item in manifest['outputs']:
    character=item['id']
    folder=root/f'art/characters/{character}/concepts/illustration_004'
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
    write_json(folder/'records/generation.json',{**item,'tool':'image_gen.imagegen','model':None,'cost':None,'seed':None,'width':width,'height':height,'sha256':content_hash,'transformations':[],'art_direction_status':'awaiting_user_review','review_scope':'new beautiful young adult Asian head and hairstyle; existing role equipment retained visually; aesthetic approval pending'})
    wiki_image=root/f'wiki/public/assets/characters/{character}-illustration-004.png'
    if wiki_image.exists():
        raise FileExistsError(wiki_image)
    shutil.copyfile(image,wiki_image)
    assert digest(wiki_image)==content_hash
    write_json(root/f'wiki/content/media/{character}-illustration-004.json',{'asset':f'public/assets/characters/{character}-illustration-004.png','source':image.relative_to(root).as_posix(),'sha256':content_hash,'width':width,'height':height,'status':'시안 004 · 사용자 검수 대기','treatment':'내장 image_gen 원본을 바이트 변경 없이 복사','prompt':f'art/characters/{character}/concepts/illustration_004/records/prompt.md'})
    article=root/f'wiki/content/articles/{character}.md'
    raw=article.read_text(encoding='utf-8').replace('\r\n','\n')
    match=re.fullmatch(r'---\n(.*?)\n---\n(.*)',raw,re.S)
    metadata={key:json.loads(value) for key,value in (line.split(':',1) for line in match[1].splitlines())}
    metadata['portrait']={'src':f'assets/characters/{character}-illustration-004.png','alt':item['name']+'의 새 얼굴과 헤어, 병과별 제복을 표현한 일러스트 시안 004','caption':item['name']+' · 일러스트 시안 004 · 사용자 검수 대기 · 누르면 크게 보기','width':width,'height':height}
    metadata['sources'].append('2026-11-09 사용자 수정 · 모두 미모의 아시아인·새 헤어 · 일러스트 004')
    metadata['profile']['fields']=[row for row in metadata['profile']['fields'] if row[0] not in ('얼굴 표현','헤어 시안')]+[['얼굴 표현',item['beauty']+' · 시안 004'],['헤어 시안',item['hair']]]
    section='## 콘셉트 시안 004\n\n**외형상 25~26세의 미모가 돋보이는 아시아계 성인 여성**을 목표로 얼굴·머리를 새로 디자인한 시안이다. '+item['beauty']+'이라는 방향과 **'+item['hair']+'**를 헤어 시안으로 둔다. 맑은 눈매와 조화로운 이목구비·부드러운 윤곽을 사용하며 굳은 인상과 노화를 피한다.\n\n'+uniforms[character]+' 검정·건메탈과 절제된 금장, 리안과 같은 시네마틱 3D 렌더 질감을 유지한다.\n\n개별 얼굴·머리색·헤어·성격과 세부 장비는 **시안 004·사용자 검수 대기**다. 미인상은 성격·작중 국적·혈통·생산권을 새로 확정하는 설정이 아니다.\n'
    body,count=re.subn(r'## 콘셉트 시안 003\n.*?(?=\n## |\Z)',lambda _:section,match[2],flags=re.S)
    assert count==1,(character,count)
    front='\n'.join(key+': '+json.dumps(value,ensure_ascii=False,separators=(',',':')) for key,value in metadata.items())
    article.write_text('---\n'+front+'\n---\n'+body,encoding='utf-8')
    entry=next(entry for entry in catalog['entries'] if entry['kind']=='character' and entry['entity_id']==character)
    assert not any(revision['revision_id']=='illustration_004' for revision in entry['revisions'])
    previous=next(revision for revision in entry['revisions'] if revision['revision_id']=='illustration_003')
    revision=copy.deepcopy(previous)
    revision.update({'revision_id':'illustration_004','display_name':item['name']+' · 일러스트 004 · 새 얼굴·헤어','status':'draft','verification':'untested','verification_scope':'awaiting_targeted_static_preview','art_direction_status':'awaiting_user_review','recipe_key':f'squad-illustration-004-{character}','description':item['beauty']+' · '+item['hair']+' · 25~26세 외형. '+uniforms[character]+' 최종 미감은 사용자 검수 대기다.','dependencies':[{'kind':'character','entity_id':'clone_01','revision_id':'reference_003_3d'},{'kind':'character','entity_id':character,'revision_id':'illustration_003'}]})
    revision['artifacts']=[{'path':file.relative_to(root).as_posix(),'sha256':digest(file)} for file in (image,folder/'records/prompt.json',folder/'records/prompt.md',folder/'records/generation.json')]
    revision['preview'].update({'image_path':image.relative_to(root).as_posix(),'width':width,'height':height})
    revision['appearance_specs']=[['외형상 나이','25~26세 상당'],['역할',roles[character]],['얼굴 시안',item['beauty']],['헤어',item['hair']],['가터벨트','이렌만 착용' if character=='iren' else '없음'],['상태','사용자 검수 대기']]
    revision['review_notes']=['004: 얼굴·헤어 새 디자인 · 사용자 검수 대기','25~26세·신형 장비·병과별 제복 유지','가터벨트는 이렌만 · 정지 이미지·모션 미지원']
    previous['status']='archived'
    previous['art_direction_status']='rejected_by_user'
    previous.setdefault('review_notes',[]).append('사용자 피드백: 미모와 머리스타일 재디자인 요청')
    entry['revisions'].append(revision)
    entry['review_revision_id']='illustration_004'
    print(character,width,height,'004 saved and registered')

write_json(records/'catalog-before-registration.json',before)
write_json(catalog_path,catalog)
