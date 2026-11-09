import hashlib
import json
import shutil
from pathlib import Path
from PIL import Image

root=Path(__file__).resolve().parents[6]
base=Path(__file__).resolve().parents[1]
source=Path(r'C:\Users\axgatge\.codex\generated_images\01a1bee1-3e63-7033-8410-1da7ce13ec6e\exec-8944b111-cc66-4c49-bcad-2f37e4b68ddb.png')
output=base/'source/icon.png'
public=root/'wiki/public/assets/characters/yuna-icon-006.png'
assert not output.exists() and not public.exists()
shutil.copyfile(source,output)
shutil.copyfile(source,public)
with Image.open(output) as image:
    image.load(); width,height=image.size
assert width==height
digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
record=dict(tool='image_gen.imagegen',mode='built-in edit',model=None,cost=None,seed=None,generated_started_at='2026-11-09T06:05:38.154Z',generated_finished_at='2026-11-09T06:06:01.264Z',source_path=str(source),sha256=digest(output),width=width,height=height,reference='art/characters/yuna/concepts/face_gyaru_sample_006/source/portrait.png',transformations=[],face_direction_status='approved_by_user',derivative_status='awaiting_user_review')
(base/'records/icon-generation.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
metadata=dict(asset='public/assets/characters/yuna-icon-006.png',source=output.relative_to(root).as_posix(),sha256=digest(output),width=width,height=height,status='채택한 갸루 얼굴의 정사각형 파생 아이콘 006 · 일치도 검수 대기',treatment='내장 image_gen 정사각형 파생 편집 원본을 바이트 변경 없이 복사',prompt=(base/'records/icon-prompt.json').relative_to(root).as_posix(),supersedes='assets/characters/icons-001/yuna.webp')
(root/'wiki/content/media/yuna-icon-006.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
article=root/'wiki/content/articles/yuna.md'
lines=article.read_text(encoding='utf-8').splitlines()
for i,line in enumerate(lines):
    if line.startswith('avatar: '):
        lines[i]='avatar: '+json.dumps(dict(src='assets/characters/yuna-icon-006.png',alt='유나의 채택한 갸루 얼굴을 참조한 정사각형 아이콘 006',width=width,height=height),ensure_ascii=False,separators=(',',':'))
article.write_text('\n'.join(lines)+'\n',encoding='utf-8')
for path in [root/'wiki/AGENTS.md',root/'wiki/README.md']:
    text=path.read_text(encoding='utf-8').replace('채택 초상 원본 `yuna-face-006.png`','채택 초상에서 파생한 정사각형 `yuna-icon-006.png`').replace('사용자 채택 갸루 초상 `yuna-face-006.png`','채택 갸루 초상에서 파생한 정사각형 `yuna-icon-006.png`')
    path.write_text(text,encoding='utf-8')
readme=base/'README.md'
text=readme.read_text(encoding='utf-8').replace('내장 image_gen 편집 1회.','내장 image_gen 전신 편집 1회.').replace('얼굴 아이콘은 채택 초상을 바이트 변경 없이 사용한다.','얼굴 아이콘은 채택 초상에서 정사각형으로 파생한 내장 image_gen 편집 1회를 추가 사용했으며, [아이콘 원본](source/icon.png)과 [입력](records/icon-prompt.json)·[생성 기록](records/icon-generation.json)을 보존한다.')
readme.write_text(text,encoding='utf-8')
print(json.dumps(dict(icon=str(output),width=width,height=height,sha256=digest(output)),ensure_ascii=False))
