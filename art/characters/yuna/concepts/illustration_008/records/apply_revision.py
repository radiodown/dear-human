import hashlib
import json
import shutil
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[6]
base = Path(__file__).resolve().parents[1]
records = base/'records'
digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
relative = lambda p: p.relative_to(root).as_posix()

def write_json(p, value):
    p.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

def read(p):
    with p.open('r',encoding='utf-8',newline='') as f:
        return f.read()

def write(p, text):
    with p.open('w',encoding='utf-8',newline='') as f:
        f.write(text)

def replace(p, old, new):
    text = read(p)
    assert text.count(old)==1, (relative(p),text.count(old))
    write(p,text.replace(old,new))

def prepend(p, paragraph):
    text = read(p)
    nl = '\r\n' if '\r\n' in text else '\n'
    title, rest = text.split(nl,1)
    write(p,title+nl+nl+paragraph+nl+rest)

affected = ['AGENTS.md','README.md','wiki/AGENTS.md','wiki/README.md','wiki/content/articles/yuna.md','wiki/content/articles/characters.md','docs/15-worldbuilding.md','docs/squad-character-concepts-006.md','game/public/assets/catalog/asset_index.json','art/characters/yuna/concepts/face_blonde_sample_008/README.md']
for item in affected:
    p = root/item
    dest = records/'before'/item
    assert not dest.exists(), f'Backup already exists: {dest}'
    dest.parent.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(p,dest)

generated = Path(r'C:\Users\axgatge\.codex\generated_images\01a1bef9-ff7c-7740-89dc-8113d6cdcaae')
source_files = {'fullbody':generated/'exec-2caf3975-81f2-4b53-a4d2-2bd3ee0e5fd4.png','icon':generated/'exec-4844638e-4012-4abf-884d-c3d7f39cb53a.png'}
outfiles = {'fullbody':base/'source/illustration.png','icon':base/'source/icon.png'}
timing = json.loads((records/'timing.json').read_text(encoding='utf-8'))
sample = root/'art/characters/yuna/concepts/face_blonde_sample_008/source/portrait.png'
target = root/'art/characters/yuna/concepts/illustration_006/source/illustration.png'
outputs = {}
for kind, src in source_files.items():
    out = outfiles[kind]
    assert not out.exists()
    out.parent.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(src,out)
    with Image.open(out) as im:
        im.load()
        width,height = im.size
        mode = im.mode
    if kind=='icon':
        assert width==height
    outputs[kind] = dict(source_path=str(src),saved_path=relative(out),width=width,height=height,image_mode=mode,sha256=digest(out),transformations=[],timing=timing[kind],prompt='prompt.json' if kind=='fullbody' else 'icon-prompt.json')
metadata = dict(tool='image_gen.imagegen',mode='built-in edit',calls=2,model=None,cost=None,seed=None,user_instruction='이걸로 전부 변경해서 다시 생성',face_direction_status='approved_by_user',derivative_status='awaiting_user_review',references=[dict(role=role,path=relative(p),sha256=digest(p)) for role,p in [('fullbody_edit_target',target),('approved_blonde_face_identity',sample)]],outputs=outputs,review_scope='Visually inspected generated fullbody and icon; golden blonde and approved face applied; armor/shield/pistol/pose retained visually. Pixel identity is not guaranteed. No browser or game tests.')
write_json(records/'generation.json',metadata)
write_json(records/'approval.json',dict(date='2026-11-09',approved_revision='face_blonde_sample_008',instruction='이걸로 전부 변경해서 다시 생성',scope='Approved blonde facial identity applied to current fullbody, icon and appearance descriptions. Historical originals and game/motion preserved.'))

for kind, name in [('fullbody','yuna-illustration-008.png'),('icon','yuna-icon-008.png')]:
    public = root/'wiki/public/assets/characters'/name
    assert not public.exists()
    shutil.copyfile(outfiles[kind],public)
    entry = outputs[kind]
    write_json(root/'wiki/content/media'/name.replace('.png','.json'),dict(asset=public.relative_to(root/'wiki').as_posix(),source=relative(outfiles[kind]),sha256=entry['sha256'],width=entry['width'],height=entry['height'],status='채택한 밝은 금발·새 얼굴 적용 008 · 파생 세부 일치도 확인 대기',face_direction_status='approved_by_user',derivative_status='awaiting_user_review',treatment='내장 image_gen 원본을 바이트 변경 없이 복사',prompt=relative(records/('prompt.md' if kind=='fullbody' else 'icon-prompt.md')),supersedes='assets/characters/'+('yuna-illustration-006.png' if kind=='fullbody' else 'yuna-icon-006.png')))

article = root/'wiki/content/articles/yuna.md'
lines = read(article).replace('\r\n','\n').splitlines()
for i,line in enumerate(lines):
    if line.startswith('sources: '):
        value=json.loads(line.split(': ',1)[1])
        value.append('2026-11-09 사용자 채택·전면 적용 지시 · 밝은 금발·새 얼굴 샘플 008을 전신과 아이콘에 적용')
    elif line.startswith('profile: '):
        value=json.loads(line.split(': ',1)[1])
        for row in value['fields']:
            if row[0]=='얼굴 표현': row[1]='샘플 008의 새 얼굴형·눈·코·입과 미소 · 따뜻한 피부·갸루 메이크업 · 사용자 채택'
            if row[0]=='헤어 시안': row[:]=['헤어','밝은 금발 긴 생머리 반묶음·옆가르마 · 사용자 채택']
        value['note']='주 역할·미국인 설정·밝은 금발과 새 얼굴 방향은 사용자 채택이다. 전신·아이콘 008의 세부 일치도는 확인 대기다. 성격·관계 전개는 보완안이다.'
    elif line.startswith('portrait: '):
        value=dict(src='assets/characters/yuna-illustration-008.png',alt='유나의 채택한 밝은 금발과 새 얼굴을 적용한 전신 일러스트 008',caption='유나 · 전신 008 · 채택 금발·새 얼굴 적용 · 누르면 크게 보기',width=outputs['fullbody']['width'],height=outputs['fullbody']['height'])
    elif line.startswith('avatar: '):
        value=dict(src='assets/characters/yuna-icon-008.png',alt='유나의 채택한 밝은 금발과 새 얼굴 정사각형 아이콘 008',width=outputs['icon']['width'],height=outputs['icon']['height'])
    else:
        continue
    lines[i]=line.split(': ',1)[0]+': '+json.dumps(value,ensure_ascii=False,separators=(',',':'))
text='\n'.join(lines)+'\n'
start=text.index('국적은 **미국**이며,')
end=text.index('\n\n',start)
new='국적은 **미국**이며 출생지·혈통·국적 취득 경위는 미정이다. 외형상 **25~26세의 성인 여성**으로, 사용자가 채택한 **밝은 금발과 샘플 008의 새 얼굴**을 사용한다. 긴 생머리 반묶음과 옆가르마, 따뜻한 피부·갸루 메이크업의 분위기를 유지하며 얼굴형·눈·코·입과 미소를 재설계했다. 현재 전신과 얼굴 아이콘은 이 채택 샘플을 적용해 다시 생성한 **008**이다. 얼굴·금발 방향은 채택됐으며 새 전신과 아이콘의 세부 일치도는 확인 대기다. 이전 흑발 006과 원화·아이콘·생성 기록은 이전 버전으로 보존한다. 외형상의 인상만으로 혈통을 확정하지 않는다.'
text=text[:start]+new+text[end:]
text=text.replace('성격·말투·개별 외형과 사건별 선택도 보완안 또는 시안이다.','성격·말투와 사건별 선택은 보완안이다. 채택한 외형 방향과 새 전신·아이콘의 세부 검수 상태는 구분한다.')
write(article,text)

catalog_path=root/'game/public/assets/catalog/asset_index.json'
catalog=json.loads(catalog_path.read_text(encoding='utf-8'))
yuna=next(e for e in catalog['entries'] if e['kind']=='character' and e['entity_id']=='yuna')
assert not any(r['revision_id']=='illustration_008' for r in yuna['revisions'])
approved=next(r for r in yuna['revisions'] if r['revision_id']=='face_blonde_sample_008')
approved['art_direction_status']='approved'
approved['review_notes'].append('사용자가 밝은 금발·새 얼굴 샘플을 채택하고 전신·아이콘 등 현재 표시 적용 지시. 후속 전신 illustration_008.')
files=list(outfiles.values())+[records/name for name in ['prompt.json','prompt.md','icon-prompt.json','icon-prompt.md','generation.json','approval.json']]
yuna['revisions'].append(dict(revision_id='illustration_008',display_name='유나 · 전신 008 · 채택 금발·새 얼굴 적용',status='draft',verification='untested',art_direction_status='awaiting_user_review',face_direction_status='approved_by_user',recipe_key='yuna-fullbody-approved-blonde-face-008',artifacts=[dict(path=relative(p),sha256=digest(p)) for p in files],dependencies=[dict(kind='character',entity_id='yuna',revision_id=r) for r in ['illustration_006','face_blonde_sample_008']],description='채택한 밝은 금발·새 얼굴을 전신과 위키 아이콘에 적용. 방호복·방패·권총·자세 유지. 파생 결과 세부 일치도 확인 대기.',appearance_specs=[['국적','미국'],['외형상 나이','25~26세 상당'],['역할','방패·진입'],['얼굴','샘플 008의 새 얼굴 · 사용자 채택'],['헤어','밝은 금발 긴 생머리 반묶음·옆가르마'],['상태','전신·아이콘 008 · 세부 확인 대기']],palette=[dict(label='블랙',hex='#17191F'),dict(label='건메탈',hex='#454954'),dict(label='절제된 금장',hex='#B79B6D')],review_notes=['내장 image_gen 전신 1회·아이콘 1회 · 원본 바이트 보존','얼굴과 금발 방향은 사용자 채택 · 파생 전신·아이콘 세부 일치도는 확인 대기','이미지 직접 확인·크기·해시 기록. 브라우저·게임 테스트 미실행','기존 006·아이콘·과거 기록·모션·게임 구현 보존'],preview=dict(image_path=relative(outfiles['fullbody']),width=outputs['fullbody']['width'],height=outputs['fullbody']['height'],views=['front'],type='concept_image',production_ready_cutout=False)))
yuna['review_revision_id']='illustration_008'
write_json(catalog_path,catalog)

rule='- 2026-11-09 유나 외형 최신 채택: **미국인·밝은 금발 긴 생머리 반묶음·サンプル 008의 새 얼굴**을 사용한다. 사용자가 금발 얼굴 샘플 008을 채택해 [전신·정사각형 아이콘 008](art/characters/yuna/concepts/illustration_008/README.md)을 재생성하고 현재 위키·미리보기에 적용했다. 기존 따뜻한 피부·갸루 분위기·25~26세 외형·전투복·방패·권총·자세를 유지한다. 흑발과 기존 아시아계 얼굴 고정 지시는 유나의 현재 외형 기준에서 대체하며 혈통은 미정이다. 얼굴·금발 방향은 채택, 파생 전신·아이콘 세부는 검수 대기다. 006·중단 007·과거 원화·아이콘·생성 기록과 기존 모션·게임·다른 인물은 보존한다.'
rule=rule.replace('サンプル','샘플')
prepend(root/'AGENTS.md',rule)
prepend(root/'wiki/AGENTS.md','- 2026-11-09 유나 외형 최신 채택: **미국인·밝은 금발·새 얼굴 샘플 008**이다. 현재 전신 `yuna-illustration-008.png`와 정사각형 아이콘 `yuna-icon-008.png`를 재생성해 프로필·공통 둘러보기·Last Card 구성원 표시에서 사용한다. 25~26세·따뜻한 피부·갸루 분위기와 반묶음·기존 전투복·방패·권총은 유지한다. 이전 흑발·아시아계 얼굴 고정 기준은 유나의 현재 외형에서 대체한다. 금발·얼굴 방향은 채택, 새 전신·아이콘 세부는 확인 대기다. 006·이전 원본과 기록은 보존하며 혈통·게임·모션·다른 인물은 변경하지 않는다.')
replace(root/'README.md','유나 얼굴 최신은 [갸루 얼굴 전신 006](docs/squad-character-concepts-006.md)이다. 사용자 채택 얼굴을 전신·위키 얼굴 아이콘·미리보기에 적용했다.','유나 외형 최신은 [밝은 금발·새 얼굴 전신 008](docs/squad-character-concepts-008.md)이다. 사용자 채택 샘플 008을 전신·위키 얼굴 아이콘·미리보기에 적용했다. 이전 흑발 006과 생성 기록은 보존한다.')
replace(root/'wiki/README.md','유나의 현재 전신은 `yuna-illustration-006.png`이며, 얼굴 아이콘은 채택 갸루 초상에서 파생한 정사각형 `yuna-icon-006.png`다. 아렌·세나·리안의 위키 아이콘은 001을 유지한다. 유나의 005와 기존 icons-001 원본·기록은 이전 버전으로 보존한다.','유나의 현재 전신은 채택 금발·새 얼굴을 적용한 `yuna-illustration-008.png`이며 얼굴 아이콘은 정사각형 `yuna-icon-008.png`다. Last Card와 공통 인물 둘러보기에서도 이 아이콘을 재사용한다. 다른 네 명의 아이콘은 유지하며 유나의 흑발 006·005·icons-001 원본과 기록은 이전 버전으로 보존한다. 금발·얼굴 방향은 사용자 채택, 새 전신·아이콘 세부 일치도는 확인 대기다.')
old='2026-11-09 사용자 변경으로 **유나는 미국인**이다. 국적은 미국으로 명시하며, 기존 25~26세 외형·채택한 약간 까무잡잡한 갸루 얼굴·흑발 반묶음과 방패·진입 역할은 유지한다. 국적과 외형상의 인상·혈통은 구분하고 출생지·혈통·국적 취득 경위는 미정으로 둔다. 기존 원화·아이콘·모션·게임 구현은 변경하지 않는다.'
new='2026-11-09 사용자 변경으로 **유나는 미국인**이다. 후속 지시로 **밝은 금발과 새 얼굴 샘플 008**을 채택해 전신·얼굴 아이콘 008을 재생성하고 현재 위키·미리보기에 적용한다. 25~26세 외형·긴 생머리 반묶음·따뜻한 피부와 갸루 분위기·방패 진입 역할과 장비는 유지한다. 기존 흑발과 아시아계 얼굴 고정 방향은 유나의 현재 외형 기준에서 대체한다. 국적과 외형상의 인상·혈통은 구분하고 출생지·혈통·국적 취득 경위는 미정으로 둔다. 얼굴·금발 방향은 채택, 파생 전신·아이콘의 세부 일치도는 검수 대기다. [외형 008](squad-character-concepts-008.md)을 따르며 이전 원화·아이콘·생성 기록·기존 모션·게임 구현은 보존한다.'
replace(root/'docs/15-worldbuilding.md',old,new)
replace(root/'docs/15-worldbuilding.md','후속 외형 지시로 **세나·모아·유나·아렌 모두 외형상 25~26세·미모의 아시아계 성인 여성**을 목표로 얼굴과 머리를 새로 디자인한다.','이전 공통 외형안은 **세나·모아·유나·아렌 모두 외형상 25~26세·미모의 아시아계 성인 여성**을 목표로 했다. 유나의 현재 외형은 위의 채택 금발·새 얼굴 008을 우선한다.')
replace(root/'wiki/content/articles/characters.md','네 명은 외형상 25~26세의 미모가 돋보이는 아시아계 성인 여성으로 디자인한다. 최신 일러스트는 아렌·유나 005, 세나·모아 004이며 개별 얼굴·헤어는 사용자 검수 대기다. 아렌은 깔끔한 생머리 단발, 유나는 옆가르마 긴 생머리 반묶음으로 수정한 시안을 사용한다.','네 명은 외형상 25~26세 성인 여성으로 디자인한다. 유나는 미국인으로, 채택한 **밝은 금발·새 얼굴 샘플 008**을 전신과 얼굴 아이콘에 적용한다. 옆가르마 긴 생머리 반묶음과 따뜻한 피부·갸루 메이크업의 분위기를 유지한다. 이전 공통 아시아계 얼굴 고정 기준은 유나의 현재 외형에서 대체되며 혈통은 미정이다. 유나의 새 전신·아이콘 008 세부 일치도는 확인 대기다. 다른 대원의 최신 원화와 검수 상태는 각 인물 문서를 따른다.')
prepend(root/'docs/squad-character-concepts-006.md','이 문서는 이전 흑발 버전의 제작 기록이다. 현재 유나 외형은 사용자 채택 [밝은 금발·새 얼굴 008](squad-character-concepts-008.md)을 따른다.')
prepend(root/'art/characters/yuna/concepts/face_blonde_sample_008/README.md','후속 사용자 지시로 이 샘플의 금발·얼굴 방향이 채택됐다. [전신·아이콘 008](../illustration_008/README.md)에 적용했으며 아래 내용은 샘플 제작 당시의 기록이다.')
print(json.dumps(dict(fullbody=relative(outfiles['fullbody']),icon=relative(outfiles['icon']),face_direction='approved_by_user',derivative_review='awaiting_user_review',wiki_updated=True,catalog_current='illustration_008'),ensure_ascii=False))
