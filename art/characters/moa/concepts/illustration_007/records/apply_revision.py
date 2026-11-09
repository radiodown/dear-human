from pathlib import Path
import hashlib
import json
import shutil
from PIL import Image

root=Path(__file__).resolve().parents[6];base=Path(__file__).resolve().parents[1];records=base/'records'
digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def write_text(path,text): path.write_bytes(text.encode('utf-8'))
def write_json(path,value): write_text(path,json.dumps(value,ensure_ascii=False,indent=2)+'\n')
def backup(path):
    dest=records/'before'/path.relative_to(root);dest.parent.mkdir(parents=True,exist_ok=True);assert not dest.exists();shutil.copyfile(path,dest)

for relative in ['AGENTS.md','README.md','wiki/AGENTS.md','wiki/README.md','wiki/content/articles/moa.md','game/public/assets/catalog/asset_index.json']:
    backup(root/relative)
source=Path(r'C:\Users\axgatge\.codex\generated_images\01a1bee1-3e63-7033-8410-1da7ce13ec6e\exec-898ddbfa-bf05-46f9-8c6f-d78462c67a96.png')
approved=root/'art/characters/moa/concepts/face_redesign_007/source/portrait.png'
reference=root/'art/characters/moa/concepts/illustration_006/source/illustration-no-folds.png'
output=base/'source/illustration.png';output.parent.mkdir(exist_ok=True);assert not output.exists();shutil.copyfile(source,output)
with Image.open(output) as im: im.load();width,height=im.size
metadata=dict(tool='image_gen.imagegen',mode='built-in edit',model=None,cost=None,seed=None,timing=json.loads((records/'timing.json').read_text(encoding='utf-8')),source_path=str(source),width=width,height=height,sha256=digest(output),transformations=[],user_instruction='이렇게 변경해줘',face_and_hair_status='approved_by_user',fullbody_result_status='awaiting_user_review',references=[dict(role=role,path=p.relative_to(root).as_posix(),sha256=digest(p)) for role,p in [('fullbody_edit_target',reference),('approved_face_and_hair',approved)]])
write_json(records/'generation.json',metadata)
public=root/'wiki/public/assets/characters/moa-illustration-007.png';avatar=root/'wiki/public/assets/characters/moa-icon-007.png';assert not public.exists() and not avatar.exists();shutil.copyfile(output,public);shutil.copyfile(approved,avatar)
write_json(root/'wiki/content/media/moa-illustration-007.json',dict(asset=public.relative_to(root/'wiki').as_posix(),source=output.relative_to(root).as_posix(),sha256=digest(output),width=width,height=height,status='채택 얼굴·헤어 적용 전신 007 · 세부 확인 대기',treatment='내장 image_gen 원본을 바이트 변경 없이 복사',prompt=(records/'prompt.md').relative_to(root).as_posix()))
write_json(root/'wiki/content/media/moa-icon-007.json',dict(asset=avatar.relative_to(root/'wiki').as_posix(),source=approved.relative_to(root).as_posix(),sha256=digest(approved),width=1254,height=1254,status='사용자 채택 얼굴·헤어 샘플 007',treatment='채택된 정사각형 초상 원본을 바이트 변경 없이 복사',supersedes='assets/characters/icons-001/moa.webp'))

article=root/'wiki/content/articles/moa.md';text=article.read_text(encoding='utf-8');lines=text.splitlines()
for i,line in enumerate(lines):
    if line.startswith('sources: '):
        value=json.loads(line.split(': ',1)[1]);value.append('2026-11-09 사용자 채택 · 백발·푸른 눈·러시아계 인상, 젊은 얼굴·생머리 중단발·시스루뱅 샘플 007을 전신 적용');lines[i]='sources: '+json.dumps(value,ensure_ascii=False)
    elif line.startswith('profile: '):
        value=json.loads(line.split(': ',1)[1])
        for field in value['fields']:
            if field[0]=='얼굴 표현': field[1]='젊고 부드러운 러시아계 인상·푸른 눈 · 샘플 007 채택'
            if field[0]=='헤어 시안': field[0]='헤어';field[1]='백발 생머리 중단발·얇은 시스루뱅 · 사용자 채택'
        value['note']='주 역할과 얼굴·헤어 방향은 사용자 지정·채택 기준이다. 러시아계 인상과 국적·혈통은 구분한다. 전신 007의 세부 일치도는 확인 대기이며 성격·관계 전개는 보완안이다.'
        lines[i]='profile: '+json.dumps(value,ensure_ascii=False,separators=(',',':'))
    elif line.startswith('portrait: '): lines[i]='portrait: '+json.dumps(dict(src='assets/characters/moa-illustration-007.png',alt='모아의 채택한 백발 생머리 중단발·시스루뱅과 푸른 눈의 젊은 얼굴을 적용한 전신 007',caption='모아 · 전신 007 · 채택한 얼굴·헤어 적용 · 누르면 크게 보기',width=width,height=height),ensure_ascii=False,separators=(',',':'))
    elif line.startswith('avatar: '): lines[i]='avatar: '+json.dumps(dict(src='assets/characters/moa-icon-007.png',alt='모아의 사용자 채택 백발 중단발·시스루뱅 얼굴 초상 007',width=1254,height=1254),ensure_ascii=False,separators=(',',':'))
text='\n'.join(lines)+'\n'
old='외형은 **25~26세의 미모가 돋보이는 아시아계 성인 여성**이다. 일러스트 004는 다크브라운 긴 웨이브와 자연스러운 사이드 가르마, 따뜻하고 화사한 미인상을 제안한다. 얼굴·헤어 세부는 사용자 검수 대기다.'
new='외형은 **25~26세의 젊고 부드러운 인상의 성인 여성**이다. 사용자가 채택한 외형은 **백발·푸른 눈·러시아계 인상**이며, 옆 볼륨을 줄인 **생머리 중단발과 얇은 시스루뱅**을 사용한다. 볼의 자연스러운 볼륨과 부드러운 턱선, 매끄러운 눈 밑·입가가 얼굴 방향이다. 최신 전신 007은 채택된 얼굴·헤어 샘플을 적용한 결과이며 세부 일치도는 확인 대기다. 러시아계 인상은 외형 기준으로, 국적·혈통을 별도로 확정하는 것은 아니다.'
assert old in text;write_text(article,text.replace(old,new))

catalog_path=root/'game/public/assets/catalog/asset_index.json';catalog=json.loads(catalog_path.read_text(encoding='utf-8'));entry=next(e for e in catalog['entries'] if e['kind']=='character' and e['entity_id']=='moa')
sample=next(r for r in entry['revisions'] if r['revision_id']=='face_redesign_007');sample['art_direction_status']='approved';sample['review_notes'].append('사용자가 이 얼굴·헤어를 채택해 전신 007 적용을 지시함.')
assert not any(r['revision_id']=='illustration_007' for r in entry['revisions'])
files=[output,records/'prompt.json',records/'prompt.md',records/'generation.json']
entry['revisions'].append(dict(revision_id='illustration_007',display_name='모아 · 전신 007 · 채택 얼굴·백발 중단발 적용',status='draft',verification='untested',art_direction_status='awaiting_user_review',face_and_hair_status='approved_by_user',recipe_key='moa-approved-face007-fullbody-007',artifacts=[dict(path=p.relative_to(root).as_posix(),sha256=digest(p)) for p in files],dependencies=[dict(kind='character',entity_id='moa',revision_id=r) for r in ['illustration_006_no_folds','face_redesign_007']],description='채택된 젊은 얼굴·백발 생머리 중단발·시스루뱅·푸른 눈을 적용한 전신 007. 러시아계 인상, 기존 의상·지원화기·포즈 유지. 전신 세부 확인 대기.',appearance_specs=[['외형상 나이','25~26세'],['헤어','백발 생머리 중단발·시스루뱅 · 채택'],['눈','푸른 눈'],['얼굴','젊고 부드러운 러시아계 인상 · 채택']],review_notes=['얼굴·헤어 방향은 사용자 채택 · 새 전신 일치도는 확인 대기','내장 image_gen 편집 1회 · 원본 보존','의상·무기·장비·포즈는 시각적으로 유지, 픽셀 동일성은 보장하지 않음'],preview=dict(image_path=output.relative_to(root).as_posix(),width=width,height=height,views=['front'],type='concept_image',production_ready_cutout=False)))
entry['review_revision_id']='illustration_007';write_json(catalog_path,catalog)

root_note='- 2026-11-09 사용자 채택: 모아의 최신 외형은 **백발·푸른 눈·러시아계 인상의 젊은 얼굴, 생머리 중단발·얇은 시스루뱅**이다. [채택 샘플 007](art/characters/moa/concepts/face_redesign_007/README.md)을 [전신 007](art/characters/moa/concepts/illustration_007/README.md)에 적용하고 위키 전신·얼굴 아이콘·미리보기 현재 버전을 갱신했다. 얼굴·헤어 방향은 채택, 새 전신 세부 일치도는 확인 대기다. 기존 004의 다크브라운 긴 웨이브·아시아계 인상과 006의 얼굴·헤어는 이전 기록이다. 러시아계 인상으로 작중 국적·혈통을 확정하지 않으며 의상·장비·포즈·다른 인물·모션·게임은 유지한다.'
wiki_note='- 2026-11-09 모아 외형 최신: 사용자가 **백발·푸른 눈·러시아계 인상의 젊은 얼굴, 생머리 중단발·얇은 시스루뱅** 샘플 007을 채택했다. 현재 전신은 `moa-illustration-007.png`, 얼굴 아이콘은 채택한 정사각형 초상을 그대로 복사한 `moa-icon-007.png`다. 얼굴·헤어는 채택, 새 전신 세부 일치도는 확인 대기다. 004~006·icons-001은 이전 기록으로 보존하고 러시아계 인상과 국적·혈통을 구분한다. 다른 대원·서사·게임은 변경하지 않는다.'
for path,heading,note in [(root/'AGENTS.md','# Dear Human 제작 규칙',root_note),(root/'wiki/AGENTS.md','# Dear Human Wiki',wiki_note)]:
    value=path.read_text(encoding='utf-8');assert value.startswith(heading);write_text(path,value.replace(heading,heading+'\n\n'+note,1))
path=root/'README.md';value=path.read_text(encoding='utf-8');heading,rest=value.split('\n',1);write_text(path,heading+'\n\n모아의 최신 외형은 [채택 얼굴·헤어 적용 전신 007](docs/squad-character-concepts-007.md)이다.\n'+rest)
path=root/'wiki/README.md';value=path.read_text(encoding='utf-8').replace('다른 네 명의 위키 아이콘은 001을 유지한다.','아렌·세나·리안의 위키 아이콘은 001을 유지한다.');heading,rest=value.split('\n',1);write_text(path,heading+'\n\n모아의 현재 전신은 `moa-illustration-007.png`, 얼굴 아이콘은 채택한 백발 중단발·시스루뱅 초상 `moa-icon-007.png`다. 이전 전신과 icons-001 원본·기록은 보존한다.\n'+rest)
print(json.dumps(dict(image=str(output),width=width,height=height,sha256=digest(output),wiki_updated=True,catalog_updated=True),ensure_ascii=False))
