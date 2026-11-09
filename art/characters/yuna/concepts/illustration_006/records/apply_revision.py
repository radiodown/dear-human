import hashlib
import json
import shutil
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[6]
base = Path(__file__).resolve().parents[1]
records = base / 'records'
source = Path(r'C:\Users\axgatge\.codex\generated_images\01a1bee1-3e63-7033-8410-1da7ce13ec6e\exec-e0f476c6-ab7a-46c7-9f76-a20754b41b6e.png')
reference = root / 'art/characters/yuna/concepts/illustration_005/source/illustration.png'
sample = root / 'art/characters/yuna/concepts/face_gyaru_sample_006/source/portrait.png'
output = base / 'source/illustration.png'
digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
def backup(path):
    target = records / 'before' / path.relative_to(root)
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists():
        raise RuntimeError('Backup already exists: '+str(target))
    shutil.copyfile(path, target)

assert not output.exists(), 'Refusing to overwrite generated original'
for relative in ['AGENTS.md','README.md','wiki/AGENTS.md','wiki/README.md','wiki/content/articles/yuna.md','game/public/assets/catalog/asset_index.json']:
    backup(root / relative)
output.parent.mkdir(parents=True, exist_ok=True)
shutil.copyfile(source, output)
with Image.open(output) as img:
    img.load()
    width, height = img.size
    mode = img.mode
metadata = dict(tool='image_gen.imagegen', mode='built-in edit', model=None, seed=None, cost=None,
    generated_started_at='2026-11-09T06:02:34.931Z', generated_finished_at='2026-11-09T06:03:11.301Z',
    source_path=str(source), width=width, height=height, image_mode=mode, sha256=digest(output), transformations=[],
    face_direction_status='approved_by_user', fullbody_result_status='awaiting_user_review',
    user_instruction='좋아 그렇게 전 일러스트 변경',
    references=[dict(role=role,path=p.relative_to(root).as_posix(),sha256=digest(p)) for role,p in [('fullbody_edit_target',reference),('approved_face_identity',sample)]],
    review_scope='Approved gyaru face applied to full-body illustration; original hair, outfit, equipment and composition retained visually, not pixel-identical.')
write_json(records/'generation.json', metadata)

public_image=root/'wiki/public/assets/characters/yuna-illustration-006.png'
public_avatar=root/'wiki/public/assets/characters/yuna-face-006.png'
assert not public_image.exists() and not public_avatar.exists()
shutil.copyfile(output, public_image)
shutil.copyfile(sample, public_avatar)
write_json(root/'wiki/content/media/yuna-illustration-006.json',dict(asset=public_image.relative_to(root/'wiki').as_posix(),source=output.relative_to(root).as_posix(),sha256=digest(output),width=width,height=height,status='채택한 얼굴 적용 전신 006 · 세부 확인 대기',face_direction_status='approved_by_user',fullbody_result_status='awaiting_user_review',treatment='내장 image_gen 원본을 바이트 변경 없이 복사',prompt=(records/'prompt.md').relative_to(root).as_posix()))
write_json(root/'wiki/content/media/yuna-face-006.json',dict(asset=public_avatar.relative_to(root/'wiki').as_posix(),source=sample.relative_to(root).as_posix(),sha256=digest(sample),width=1024,height=1536,status='사용자 채택 얼굴 샘플 006',treatment='채택한 세로형 초상 원본을 바이트 변경 없이 복사; UI 아이콘으로 표시',supersedes='assets/characters/icons-001/yuna.webp'))

article=root/'wiki/content/articles/yuna.md'
text=article.read_text(encoding='utf-8')
lines=text.splitlines()
for i,line in enumerate(lines):
    if line.startswith('sources: '):
        value=json.loads(line.split(': ',1)[1]); value.append('2026-11-09 사용자 채택 · 약간 까무잡잡한 갸루 얼굴 샘플 006을 전신 일러스트에 적용'); lines[i]='sources: '+json.dumps(value,ensure_ascii=False)
    elif line.startswith('profile: '):
        value=json.loads(line.split(': ',1)[1])
        for field in value['fields']:
            if field[0]=='얼굴 표현': field[1]='약간 까무잡잡한 피부·또렷한 눈매와 갸루 메이크업 · 사용자 채택'
        value['note']='주 역할과 사용자 지정 외형은 기준 설정이다. 갸루 얼굴 방향은 사용자 채택, 전신 006의 세부 일치도는 확인 대기다. 성격·관계 전개는 보완안이다.'
        lines[i]='profile: '+json.dumps(value,ensure_ascii=False,separators=(',',':'))
    elif line.startswith('portrait: '):
        lines[i]='portrait: '+json.dumps(dict(src='assets/characters/yuna-illustration-006.png',alt='유나의 채택한 구릿빛 갸루 얼굴을 적용한 전신 일러스트 006',caption='유나 · 전신 006 · 채택한 갸루 얼굴 적용 · 누르면 크게 보기',width=width,height=height),ensure_ascii=False,separators=(',',':'))
    elif line.startswith('avatar: '):
        lines[i]='avatar: '+json.dumps(dict(src='assets/characters/yuna-face-006.png',alt='유나의 사용자 채택 갸루 얼굴 · 샘플 006',width=1024,height=1536),ensure_ascii=False,separators=(',',':'))
text='\n'.join(lines)+'\n'
old='외형은 **25~26세의 미모가 돋보이는 아시아계 성인 여성**이다. 최신 일러스트 005는 옆가르마를 준 긴 흑발 생머리 반묶음, 맑고 화사한 미인상을 제안한다. 개별 얼굴과 헤어는 사용자 검수 대기다.'
new='외형은 **25~26세의 미모가 돋보이는 아시아계 성인 여성**이다. 사용자가 채택한 얼굴 방향은 **약간 까무잡잡한 피부와 갸루 느낌의 메이크업**이다. 따뜻한 구릿빛 피부, 또렷한 아이라인과 속눈썹, 윤기 있는 입술을 사용하며, 기존 옆가르마 긴 흑발 생머리 반묶음과 전투복 컨셉은 유지한다. 최신 전신 일러스트 006은 채택된 얼굴 샘플을 적용한 결과다. 얼굴 방향은 채택됐으며 전신의 세부 일치도는 확인 대기다.'
assert old in text
article.write_text(text.replace(old,new),encoding='utf-8')

catalog_path=root/'game/public/assets/catalog/asset_index.json'
catalog=json.loads(catalog_path.read_text(encoding='utf-8'))
yuna=next(e for e in catalog['entries'] if e['entity_id']=='yuna' and e['kind']=='character')
assert all(r['revision_id']!='illustration_006' for r in yuna['revisions'])
approved_sample=next(r for r in yuna['revisions'] if r['revision_id']=='face_gyaru_sample_006')
approved_sample['art_direction_status']='approved'
approved_sample['review_notes'].append('사용자가 이 얼굴 샘플을 채택하고 전신 적용을 지시함. 새 전신은 illustration_006.')
files=[output,records/'prompt.json',records/'prompt.md',records/'generation.json']
yuna['revisions'].append(dict(revision_id='illustration_006',display_name='유나 · 전신 006 · 채택한 갸루 얼굴 적용',status='draft',verification='untested',art_direction_status='awaiting_user_review',face_direction_status='approved_by_user',recipe_key='yuna-fullbody-approved-gyaru-face-006',artifacts=[dict(path=p.relative_to(root).as_posix(),sha256=digest(p)) for p in files],dependencies=[dict(kind='character',entity_id='yuna',revision_id=r) for r in ['illustration_005','face_gyaru_sample_006']],description='사용자가 채택한 약간 까무잡잡한 갸루 얼굴을 기존 전신에 적용. 흑발 반묶음·방호복·물리 방패·권총·자세 유지. 새 전신 세부 확인 대기.',appearance_specs=[['외형상 나이','25~26세 상당'],['역할','방패·진입'],['얼굴','구릿빛 갸루 얼굴 · 방향 채택'],['헤어','흑발 긴 생머리 반묶음·옆가르마'],['전신','006 · 세부 확인 대기']],palette=[dict(label='블랙',hex='#17191F'),dict(label='건메탈',hex='#454954'),dict(label='절제된 금장',hex='#B79B6D')],review_notes=['내장 image_gen 1회 · 원본 보존','샘플 얼굴 방향은 사용자 채택 · 새 전신 일치도는 확인 대기','기존 005와 이전 아이콘·모션은 보존','얼굴 밖 픽셀 동일성은 보장하지 않음'],preview=dict(image_path=output.relative_to(root).as_posix(),width=width,height=height,views=['front'],type='concept_image',production_ready_cutout=False)))
yuna['review_revision_id']='illustration_006'
write_json(catalog_path,catalog)

for path,heading,bullet in [
    (root/'AGENTS.md','# Dear Human 제작 규칙','- 2026-11-09 사용자 채택: 유나는 **약간 까무잡잡한 갸루 느낌의 얼굴**을 사용한다. 채택한 얼굴 샘플 006을 전신 **006**에 적용했으며 기존 흑발 반묶음·25~26세 아시아계 성인 외형·전투복·물리 방패·권총·자세를 시각적으로 유지한다. [006 기록](art/characters/yuna/concepts/illustration_006/README.md)을 따른다. 얼굴 방향은 채택됐고 새 전신의 세부 일치도는 확인 대기다. 위키 전신·얼굴 아이콘과 미리보기 현재 버전을 갱신하며 005·이전 아이콘·참조·생성 기록·기존 모션·게임 구현은 보존한다. 다른 대원 외형은 변경하지 않는다.'),
    (root/'wiki/AGENTS.md','# Dear Human Wiki','- 2026-11-09 유나 얼굴 최신: 사용자가 **약간 까무잡잡한 갸루 얼굴 샘플 006**을 채택해 전신 **006**에 적용했다. `yuna`의 전신은 `yuna-illustration-006.png`, 얼굴 아이콘은 채택 초상 원본 `yuna-face-006.png`를 사용한다. 얼굴 방향은 채택, 새 전신 세부 일치도는 확인 대기다. 005·icons-001 원본과 메타데이터는 역사 기록으로 보존한다. 기존 흑발 반묶음·전투복·방패 기준과 서사·다른 인물은 유지한다.'),
]:
    value=path.read_text(encoding='utf-8'); assert value.startswith(heading)
    path.write_text(value.replace(heading,heading+'\n\n'+bullet,1),encoding='utf-8')
for path,paragraph in [(root/'README.md','유나 얼굴 최신은 [갸루 얼굴 전신 006](docs/squad-character-concepts-006.md)이다. 사용자 채택 얼굴을 전신·위키 얼굴 아이콘·미리보기에 적용했다.'),(root/'wiki/README.md','유나의 현재 전신은 `yuna-illustration-006.png`이며, 얼굴 아이콘은 사용자 채택 갸루 초상 `yuna-face-006.png`다. 다른 네 명의 위키 아이콘은 001을 유지한다. 유나의 005와 기존 icons-001 원본·기록은 이전 버전으로 보존한다.')]:
    value=path.read_text(encoding='utf-8'); header,rest=value.split('\n',1)
    path.write_text(header+'\n\n'+paragraph+'\n'+rest,encoding='utf-8')
print(json.dumps(dict(image=str(output),width=width,height=height,sha256=digest(output),wiki_updated=True,catalog_updated=True),ensure_ascii=False))
