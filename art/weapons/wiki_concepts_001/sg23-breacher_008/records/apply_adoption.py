"""Apply the user's 2026-11-13 SG-23 concept adoption; preserve prior assets."""
from pathlib import Path
import hashlib
import json
import shutil

ROOT = Path(__file__).resolve().parents[5]
BASE = Path(__file__).resolve().parents[1]
REL = BASE.relative_to(ROOT).as_posix()
GENERATED = Path('C:/Users/axgatge/.codex/generated_images/01a1ceda-b00e-7c71-a931-c30d89a9351e')
FINAL = GENERATED / 'exec-23e82ea1-9c61-4f32-86da-d8d59e0e7cc7.png'
PREVIOUS = GENERATED / 'exec-52d8abc8-7010-4484-a8cb-65d986dbb633.png'
SOURCE = '2026-11-13 사용자 채택·적용 요청 · SG-23 펄스 샷건, 짧은 총신 연결부, 직사각형 컴펜세이터와 숫자형 잔탄 표시'

def read(path):
    return (ROOT / path).read_text(encoding='utf-8-sig')

def write(path, text):
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding='utf-8')

def backup(path):
    dest = BASE / 'records/before' / path
    dest.parent.mkdir(parents=True, exist_ok=True)
    if not dest.exists():
        shutil.copy2(ROOT / path, dest)

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

files = ['AGENTS.md', 'wiki/AGENTS.md', 'docs/15-worldbuilding.md',
    'wiki/content/articles/weapon-sg23-breacher.md',
    'wiki/content/articles/clone-special-weapons.md', 'wiki/content/articles/iren.md',
    'wiki/content/articles/clone-weapon-materials.md',
    'wiki/content/articles/clone-ammunition-concepts.md',
    'wiki/content/articles/modern-weapon-design-references.md',
    'wiki/content/media/weapon-concepts-001.json', 'game/public/assets/catalog/asset_index.json']
for path in files:
    backup(path)
for src, dst in [(FINAL, BASE / 'source/illustration.png'),
                 (PREVIOUS, BASE / 'records/preview-before.png'),
                 (FINAL, ROOT / 'wiki/public/assets/weapons/sg23-breacher-008.png')]:
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)

caption = '아렌 · 펄스 샷건 · 짧은 총신·직사각형 컴펜세이터·잔탄 표시 · 원화 008 사용자 채택'
alt = '짧은 총신 연결부와 직사각형 컴펜세이터, AMMO 08 잔탄 표시를 갖춘 SG-23 펄스 샷건 채택 원화'
for path in files:
    if not path.startswith('wiki/content/articles/'):
        continue
    s = read(path)
    lines = s.splitlines()
    for i, line in enumerate(lines):
        if line.startswith('updated:'):
            lines[i] = 'updated: "2026-11-13"'
        elif line.startswith('sources:'):
            sources = json.loads(line[len('sources:'):])
            sources.append(SOURCE)
            lines[i] = 'sources: ' + json.dumps(sources, ensure_ascii=False)
        elif line.startswith('illustrations:'):
            illustrations = json.loads(line[len('illustrations:'):])
            for item in illustrations:
                if item.get('article') == 'weapon-sg23-breacher':
                    item.update(src='assets/weapons/sg23-breacher-008.png', alt=alt, caption=caption)
            lines[i] = 'illustrations: ' + json.dumps(illustrations, ensure_ascii=False, separators=(',', ':'))
    s = '\n'.join(lines) + '\n'
    if path.endswith('/weapon-sg23-breacher.md'):
        s = s.replace('분대장 아렌의 부무장으로 제안한 대구경 전투 산탄총.', '분대장 아렌의 펄스 샷건. 직사각형 컴펜세이터와 숫자형 잔탄 표시를 갖춘 채택 원화 008.')
        header = s.split('\n# SG-23 브리처')[0]
        s = header + '''
# SG-23 브리처

**SG-23 ‘브리처’**는 분대장 겸 돌격수 [[iren|아렌]]의 부무장인 **SF 펄스 샷건**이다. 2026년 11월 13일 사용자가 새 샘플을 채택해 기존 무기의 원화와 설정에 반영했다. 펄스 샷건이라는 분류와 채택 외형은 확정이며, 23mm 구경 제안과 탄약·작동 방식의 세부는 보완안이다.

## 디자인

현재 기준은 **채택 원화 008**이다. 검은 금속 몸통·개머리판·권총형 손잡이·유공 핸드가드·소형 조준장치를 유지하며, 앞쪽에 길게 노출되던 원통형 총신은 짧은 연결부로 줄였다.

총구 끝에는 **직사각형 컴펜세이터**를 장착한다. 평평한 옆면과 모서리 사선, 사선 개구부가 보이며 총열 축보다 아래쪽에 덩어리가 더 내려온다. 총몸과 높이·두께를 맞추려는 요청에서 출발했으며, 최종 채택 그림에는 하단이 총몸보다 조금 더 내려온 형태가 남아 있다. 현재 외형은 이 채택 그림을 기준으로 한다. 이전 소음기 장착·넙적한 소음기 보완 방향은 이 설정으로 대체한다.

몸통 측면의 **숫자형 인디케이터는 잔탄수**를 나타낸다. 그림의 주황색 `AMMO 08`은 남은 탄수의 표시 예시이며 최대 장탄수가 8발이라는 뜻은 아니다.

## 역할과 펄스 설정

[[weapon-ar12-rupture|돌격소총]]과 교체해 근접한 위협을 상대하는 보조 화기다. 펄스의 발생 원리·에너지원·발사체·발광 및 명중 효과·위력은 아직 정하지 않았다. 펄스라는 이름만으로 레이저·플라스마·전자기 가속·무반동·무한 탄약을 확정하지 않는다.

[[clone-ammunition-concepts|전용 탄약군 컨셉]]의 23mm 중량 단일탄 ‘말뚝’, 중산탄 ‘자갈’, 장애물 파쇄탄 ‘쇄문’은 변경 전 제안으로 보존한다. 펄스 샷건에서의 사용 여부와 관계는 재검토 대상이며, 새 외형 채택으로 탄종이나 호환성을 자동 채택하지 않는다.

## 미정 사항과 구현

정확한 전장·무게·장탄수·탄종·발사 및 장전 방식·반동·열과 휴대 방법은 미정이다. 강화 클론 전용 무장이라는 배치 방향은 유지한다.

이전 원화 007·샘플·실패 기록은 보존한다. 기존 소음기형 3D GLB와 아렌의 장착 모션은 이전 외형이며 새 원화의 컴펜세이터·잔탄 표시·펄스 효과는 아직 3D와 게임에 구현하지 않았다.
'''
    elif path.endswith('/clone-special-weapons.md'):
        s = s.replace('[[weapon-sg23-breacher]] · 23mm 전투 산탄총', '[[weapon-sg23-breacher]] · 펄스 샷건 (23mm는 이전 구경 제안)')
        s = s.replace('아렌은 묵직한 돌격소총과 산탄총', '아렌은 묵직한 돌격소총과 펄스 샷건')
        s = s.replace('브리처는 택티컬 몸통과 소음기를 반영한 007', '브리처는 짧은 총신 연결부·직사각형 컴펜세이터·잔탄 표시를 반영한 채택 원화 008')
        s = s.replace('새 그림들의 외형과 방패 분리 원화의 일치도는 사용자 검수 대기이며, AR-12의 새 총구 장착물과 브리처의 더 넙적한 소음기 외형은 아직 미반영이다.', '브리처 008은 사용자 채택이며 다른 그림들의 외형과 방패 분리 원화의 일치도는 사용자 검수 대기다. AR-12의 새 총구 장착물은 아직 미반영이다.')
        s = s.replace('유나의 [[weapon-hp14-bastion|바스티온]]은 컴펜세이터를, 아렌의 [[weapon-sg23-breacher|브리처]]는 소음기를 장착한다. 두 구성은 사용자 지정이며 각각 현재 원화 006과 007에 반영했다. 정확한 부품 외형과 성능은 검수 전이다.', '유나의 [[weapon-hp14-bastion|바스티온]]은 컴펜세이터를 장착한다. 아렌의 [[weapon-sg23-breacher|브리처]]도 최신 채택 원화 008에서 직사각형 컴펜세이터를 사용하며 이전 소음기 방향을 대체한다. 브리처의 숫자형 인디케이터는 잔탄수 표시이고 `08`은 예시다. 펄스 작동 원리·탄종·성능은 미정이다.')
        s = s.replace('기존 그림을 새 총의 확정 원화로 취급하지 않는다.', '브리처는 새로 채택한 008을 기준으로 하되 기존 3D 모델과 게임 구현에는 아직 반영하지 않았다.')
    elif path.endswith('/iren.md'):
        s = s.replace('산탄총 · SG-23 브리처 기본안', '펄스 샷건 · SG-23 브리처 · 원화 008 채택')
        s = s.replace('부무장은 산탄총이다.', '부무장은 펄스 샷건이다.')
        s = s.replace('와 [[weapon-sg23-breacher|SG-23 브리처]]라는 모델명을 기본안으로 둔다.', '를 주무장 기본안으로 두며, 부무장 [[weapon-sg23-breacher|SG-23 브리처]]는 짧은 총신 연결부·직사각형 컴펜세이터·숫자형 잔탄 표시의 원화 008을 채택했다.')
    elif path.endswith('/clone-weapon-materials.md'):
        s = s.replace('| 브리처 | 23mm 산탄총용 탄약군 | 근접 전투의 대형 탄자·산탄 기본안 |', '| 브리처 | 이전 23mm 산탄총용 탄약군 제안 | 펄스 샷건 008 채택에 따라 탄약·펄스 체계의 관계 재검토 |')
    elif path.endswith('/clone-ammunition-concepts.md'):
        s = s.replace('## 23mm — 브리처의 전용 셸', '## 23mm — 브리처의 이전 전용 셸 제안\n\n2026년 11월 13일 브리처는 펄스 샷건 원화 008을 채택했다. 아래 세 탄종과 23mm는 변경 전 보완안으로 보존하며, 펄스 방식에서의 채택·호환·역할은 재검토 대상이다. 잔탄 표시 `08`은 최대 장탄수 확정이 아니다.')
        s = s.replace('브리처의 소음기 장착 설정만으로 어떤 탄종이든 무음이 되거나 모든 탄종과 호환된다고 확정하지 않는다.', '현재 브리처는 소음기를 직사각형 컴펜세이터로 대체했다. 이 외형이나 펄스라는 분류만으로 탄종 호환성과 성능을 확정하지 않는다.')
        s = s.replace('[[weapon-sg23-breacher|SG-23 브리처]] · 아렌 | 중량', '[[weapon-sg23-breacher|SG-23 브리처]] · 아렌 · 펄스 전환 후 재검토 | 중량')
    elif path.endswith('/modern-weapon-design-references.md'):
        s = s.replace('| 브리처의 넙적한 소음기 |', '| 브리처의 이전 소음기 참고 (008에서 대체) |')
        s = s.replace('현재 007의 원통형 소음기를 넙적하게 보완하는 방향만 기록했으며 새 원화는 아직 제작하지 않았다.', '이 조사는 이전 소음기 방향의 이력이다. 2026년 11월 13일 채택 원화 008은 SF 펄스 샷건으로 전환하고 짧은 총신 연결부·직사각형 컴펜세이터·숫자형 잔탄 표시를 사용한다. 현실 소음기 참고를 현재 장착 설정으로 적용하지 않는다.')
    write(path, s)

s = read('docs/15-worldbuilding.md')
s = s.replace('| 아렌 | 분대장·돌격 · 파열탄 소총과 부무장 산탄총 | AR-12 럽처 12.7mm · SG-23 브리처 23mm |', '| 아렌 | 분대장·돌격 · 파열탄 소총과 부무장 펄스 샷건 | AR-12 럽처 12.7mm · SG-23 브리처 (23mm는 이전 제안) |\n\n2026-11-13 SG-23 브리처는 펄스 샷건 원화 008을 사용자 채택했다. 짧은 총신 연결부·직사각형 컴펜세이터·숫자형 잔탄 표시가 현재 기준이며 이전 소음기 방향을 대체한다. 표시 `08`은 잔탄 예시이고 최대 장탄수·펄스 원리·탄약 체계는 미정이다. [현재 무기 문서](../wiki/content/articles/weapon-sg23-breacher.md)를 따른다.')
write('docs/15-worldbuilding.md', s)

prompt = "Create a revised exterior concept-art sample of the fictional science-fiction SG-23 Breacher pulse shotgun shown in the reference. Preserve its stock, pistol grip, optic, dark metallic tactical body and neutral studio presentation. Apply the user's visual revisions: shorten the exposed round barrel section so the rectangular compensator connects almost directly to the front of the body through a short visible neck. Match the compensator's height and thickness to the main body, approximately aligning their upper and lower silhouettes. Keep the compensator rectangular with lightly chamfered edges and its mass extending below the barrel axis. Change the glowing indicator into a clearly readable inset amber digital remaining-ammunition display reading '08', with the small label 'AMMO'. The displayed number is illustrative. One complete fictional pulse shotgun, side view, stock left and muzzle right, light gray background, generous margins, detailed game concept rendering. Exterior appearance only, no technical plans, internal mechanisms, dimensions, people, or shooting scene."
request = {'prompt': prompt, 'referenced_image_paths': [str(PREVIOUS).replace('\\', '/')], 'transparent_background': False}
write(REL + '/records/prompt.json', json.dumps(request, ensure_ascii=False, indent=2) + '\n')
write(REL + '/records/prompt.md', '# Exact submitted image-generation prompt\n\n' + prompt + '\n')
meta = {'id': 'sg23-breacher', 'revision': '008', 'title': 'SG-23 브리처',
    'role': '아렌 · 펄스 샷건', 'dir': 'sg23-breacher_008', 'source': REL + '/source/illustration.png',
    'asset': 'assets/weapons/sg23-breacher-008.png', 'sha256': digest(FINAL),
    'width': 1536, 'height': 1024, 'status': 'user-approved', 'accepted_on': '2026-11-13',
    'tool': 'built-in image_gen.imagegen', 'model': 'not exposed by tool', 'cost': None,
    'elapsed_seconds': 27.6, 'generation_timestamp': None, 'error': None,
    'prompt': REL + '/records/prompt.json', 'reference_sha256': digest(PREVIOUS),
    'reference_archive': REL + '/records/preview-before.png', 'verification': 'untested',
    'scope': 'Approved concept and wiki/library update only; prior GLB and loadouts preserved.',
    'known_difference': 'Compensator lower edge extends slightly below main body in the accepted image.',
    'previous_failed_request_ids': ['4d277422-5cf7-41fa-ab05-3932abdaea55', '80199cd3-a75c-47b4-ab0a-80e8b31b9be4', '8020ff7e-27c2-4c44-9ef5-35129bb2ad2f'],
    'previous_failures': 'Three built-in calls returned moderation_blocked (violence); no image artifacts.'}
write(REL + '/records/result.json', json.dumps(meta, ensure_ascii=False, indent=2) + '\n')
write(REL + '/README.md', '''# SG-23 브리처 · 펄스 샷건 채택 원화 008

2026-11-13 사용자가 대화에서 마지막 수정 샘플을 채택하고 기존 무기에 반영하라고 요청했다. 새 생성 없이 내장 image_gen 출력 원본을 복사했다.

- 짧은 원통형 총신 연결부와 직사각형 컴펜세이터, 숫자형 잔탄 표시를 채택한다.
- 컴펜세이터 높이·두께를 총몸에 맞추려는 요청이었으나 채택 그림 하단은 조금 더 내려온다. 이 그림 그대로를 기준으로 보존한다.
- `AMMO 08`은 잔탄 예시다. 최대 장탄수·펄스 원리·탄약 체계·발사/장전 방식은 미정이다.
- 기존 소음기형 원화 007과 GLB·캐릭터 장착 모션은 보존한다. 3D·게임에 새 외형/기능을 구현한 것은 아니다.

원본: [illustration.png](source/illustration.png). 이전 샘플: [preview-before.png](records/preview-before.png). 정확한 제출 입력: [JSON](records/prompt.json) · [본문](records/prompt.md). 도구·시간·해시·실패 ID: [결과](records/result.json).

위키 무기 문서·무기고·아렌 갤러리와 공통 라이브러리의 기존 `sg23_breacher` 항목을 갱신한다. 소스 문서와 메타데이터 변경 전 사본은 `records/before/`에 보존했다. 생성 모델·비용·정확한 시각은 도구에서 미제공 또는 미기록이며 임의 추정하지 않는다.

아트는 사용자 채택. 기존 검증 인계 지침에 따라 테스트·문서/목록 검사·브라우저 캡처는 실행하지 않았고 연결 검증 상태는 untested다.
''')
media_path = 'wiki/content/media/weapon-concepts-001.json'
media = json.loads(read(media_path))
media['status'] = 'SG-23 concept 008 user-approved; other weapons retain their own review states; AR-12 muzzle attachment pending'
for i, item in enumerate(media['images']):
    if item['id'] == 'sg23-breacher':
        media['images'][i] = meta
write(media_path, json.dumps(media, ensure_ascii=False, indent=2) + '\n')

# Replace only this entity's block, preserving unrelated in-progress catalog edits.
catalog_path = 'game/public/assets/catalog/asset_index.json'
s = read(catalog_path)
catalog = json.loads(s)
entry = next(e for e in catalog['entries'] if e['entity_id'] == 'sg23_breacher')
entry['selected_revision_id'] = 'concept_008'
entry['review_revision_id'] = 'concept_008'
rev = {'revision_id': 'concept_008', 'display_name': 'SG-23 브리처 · 펄스 샷건 원화 008',
    'status': 'draft', 'verification': 'untested',
    'verification_scope': 'User approved image; site checks delegated to user. Existing GLB is the previous suppressor design.',
    'art_direction_status': 'approved', 'recipe_key': 'sg23-pulse-concept-008',
    'artifacts': [{'path': p, 'sha256': digest(ROOT / p)} for p in [REL + '/source/illustration.png', REL + '/README.md', REL + '/records/prompt.json']],
    'dependencies': [], 'description': '아렌의 SF 펄스 샷건. 짧은 총신 연결부·직사각형 컴펜세이터·숫자형 잔탄 표시의 사용자 채택 원화. 3D 탭은 이전 소음기형 모델이다.',
    'appearance_specs': [['분류', '펄스 샷건 · 아렌 부무장'], ['총구', '짧은 연결부·직사각형 컴펜세이터'], ['표시기', 'AMMO 08 · 잔탄 예시, 최대 장탄수 미정'], ['펄스 체계', '작동 원리·탄약·성능 미정'], ['3D 모델', '이전 소음기형 · 새 외형 미반영']],
    'palette': ['#171818', '#434448', '#5e6269', '#ffb43b'],
    'review_notes': ['2026-11-13 원화 사용자 채택', '컴펜세이터 하단이 총몸보다 조금 내려오는 채택 그림 기준', '기존 GLB·장착 모션 보존, 새 펄스 외형/효과 미구현', '페이지 검증은 사용자 인계'],
    'preview': {'image_path': REL + '/source/illustration.png', 'width': 1536, 'height': 1024}}
entry['revisions'].append(rev)
idx = s.index('"entity_id": "sg23_breacher"')
start = s.rfind('\n    {', 0, idx) + 1
end = s.index('\n    },', idx) + len('\n    }')
block = '\n'.join('    ' + line for line in json.dumps(entry, ensure_ascii=False, indent=2).splitlines())
write(catalog_path, s[:start] + block + s[end:])

note = '- 2026-11-13 사용자 채택으로 **SG-23 브리처는 SF 펄스 샷건**이다. 짧은 총신 연결부·직사각형 컴펜세이터·숫자형 잔탄 표시의 원화 008을 기존 무기 문서·무기고·아렌 갤러리·공통 미리보기에 반영했다. 이전 소음기 방향을 대체하며 채택 그림의 컴펜세이터 하단은 몸통보다 조금 내려온다. `AMMO 08`은 잔탄 예시로 최대 장탄수·펄스 원리·탄약 체계는 미정이다. 이전 원화·GLB·장착 모션은 보존하며 3D/게임 새 외형은 미반영이다. 아트 채택과 연결 검증을 구분하며 사용자 검증 인계 지침에 따라 테스트·문서/목록 검사·브라우저 캡처 없이 untested다.'
for path, link in [('AGENTS.md', REL + '/README.md'), ('wiki/AGENTS.md', '../' + REL + '/README.md')]:
    s = read(path)
    first, rest = s.split('\n', 1)
    write(path, first + '\n\n' + note + ' [기록](' + link + ')\n' + rest)
print('Applied SG-23 concept 008 adoption; prior assets and unrelated edits preserved.')
