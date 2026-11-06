# 20. AI 에이전트 스킬·도구와 반복 작업 자동화

[문서 목록](../README.md) · 반복 작업을 스킬·도구로 구성할 수 있어야 한다는 사용자 요구를 반영한다.

## 1. 구성 원칙

**스킬은 작업 판단·문서 선택·실행 순서를, CLI는 반복 가능한 검사·조회를 담당**한다. 생성·렌더·검수·등록·미리보기 갱신의 입력·출력을 맞추고 같은 작업을 매번 긴 프롬프트와 새 코드로 다시 만들지 않는다.

프로젝트 전용 스킬 원본은 [SKILL.md](../skills/dear-human-pipeline/SKILL.md), 실제 도구는 [agent_pipeline.py](../tools/agent_pipeline.py)다. 스킬 이름은 dear-human-pipeline이며 Codex 검색 경로에도 복사해 사용할 수 있게 준비한다. 프로젝트 규칙은 [AGENTS.md](../AGENTS.md)가 연결한다.

## 2. 현재 실행 가능한 도구

Python 3 표준 라이브러리만 사용한다. 아래 명령은 읽기 전용이며 에셋 생성·자동 등록·배포를 수행하지 않는다.

| 명령 | 입력 | 실제 동작 |
|---|---|---|
| docs-check | 프로젝트 루트 | 로컬 문서 링크·코드 펜스·JSON 예시 검사 |
| catalog-list | 선택 kind/entity_id | 대상·상태·버전 수·선택 버전의 짧은 목록 |
| catalog-check | 초기/등록 목록 | 중복 ID·선택 버전·의존 참조·순환·실제 파일 SHA-256 검사 |
| reuse-find | kind·entity_id·recipe_key | passed 버전과 그 의존 파일의 해시를 확인해 재사용 후보 반환 |
| impact | kind·entity_id·revision_id | 해당 버전에 직접·간접 의존하는 기존 버전 조회 |

목록은 [asset_index.json](../game/public/assets/catalog/asset_index.json)에 있다. clone_01은 정적 외형 이미지를 가진 draft이고 M16·초기 적은 planned다. 캐릭터는 concept_image capability만 갖고 리그·모션은 없다. selected_revision_id와 review_revision_id는 모두 남긴 기본 제복을 가리킨다. 캐릭터 등록 버전은 하나이며 삭제된 시안으로의 dependencies는 제거했다. 이 선택이 게임용 파츠·리그 완료를 뜻하지 않는다. [23](23-character-appearance-review.md)을 따른다. docs-check는 art 아래 프롬프트 MD의 JSON 코드 블록도 검사한다.

```powershell
python tools/agent_pipeline.py --root . docs-check
python tools/agent_pipeline.py --root . catalog-list
python tools/agent_pipeline.py --root . catalog-check
python tools/agent_pipeline.py --root . reuse-find --kind weapon --entity-id m16_basic --recipe-key request-fingerprint
```

impact는 실제 등록된 revision_id를 사용한다. 아직 버전이 없는 planned 항목에 실행하면 입력 오류로 보고한다. --catalog와 --limit는 하위 명령 앞의 전역 옵션이다. 초기 한도는 결과/문제 각 20개다.

## 3. 결과와 상태

유효한 명령은 schema_version·command·status·summary·items·issues를 JSON으로 출력한다. issue에는 code·path·message가 있다. 명령행 문법 오류는 argparse의 표준 오류와 종료 코드 2를 따른다.

- 종료 0: 검사 통과 또는 정상 조회. 재사용 후보 0개도 정상 조회다.
- 종료 1: 유효한 입력에서 검증 문제 발견.
- 종료 2: 입력·파일 오류, 초기화되지 않은 목록 등 실행 조건 미충족. 목록 누락은 status=not_ready다.

검사 통과는 현재 기록·참조·파일 동일성이 맞다는 뜻이다. 캐릭터 모션 품질·아트 채택·실제 게임 성능을 검증했다는 뜻은 아니다. 도구는 파일을 자동 고치거나 채택 버전을 바꾸지 않는다.

## 4. 목록의 버전 계약

kind는 character/weapon/enemy/armor/fx, 논리 대상은 kind+entity_id, 버전은 revision_id로 식별한다. 상태는 planned/draft/ready/failed/archived로 둔다. planned는 revisions 비어 있음·selected_revision_id=null·재생 capability 없음이 조건이다.

실제 revision은 revision_id, artifacts, verification을 가진다. verification은 untested/passed/failed다. artifact는 프로젝트 루트 기준 상대 경로 path와 소문자 64자리 sha256을 기록한다. recipe_key와 dependencies는 필요한 버전에 기록한다. dependencies는 kind·entity_id·revision_id의 정확한 참조다.

원본 파일이 있는 초기 버전부터 실제 해시를 기록한다. 절대 경로·외부 URL·상위 디렉터리 이동·프로젝트 밖으로 해석되는 링크는 산출물 경로로 사용하지 않는다. 입력 파일·설정·도구/모델·의존 버전이 recipe_key의 의미에 포함돼야 하며, 현재 CLI가 이 요청 키를 자동 설계해 주는 것은 아니다.

재사용 조회는 대상 후보와 연결된 의존 파일까지 확인한다. 동일 레시피가 동일 이미지를 생성한다는 약속은 아니다. 사용자가 새 시도를 요청하면 새 작업·버전으로 처리한다.

## 5. 이후 연결할 자동화 단계

다음은 **계약·구현 계획**이며 현재 CLI의 실행 명령이 아니다.

| 단계 | 자동화할 반복 작업 | 연결 지점 |
|---|---|---|
| 환경 점검 | 실제 생성 기능·도구 커밋·리그 런타임 가용성 확인 | 준비 상태 보고, 미설치/미연결 구분 |
| 레시피 계산 | 입력·파라미터·의존 버전의 요청 키 계산 | reuse-find 앞 단계 |
| 에셋 생성 | 2dimg2motion 포즈·적 시트, 이미지·음원 제작 | 실제 사용 가능한 생성 도구 |
| 렌더·패킹 | PixelFX 출력, 파츠/프레임 아틀라스·리그 산출물 변환 | 선택 도구의 실제 CLI·파일 출력 |
| 등록 | 새 버전·해시·의존 참조를 검증 후 목록에 반영 | 기존 채택 파일 보존·부분 실패 복구 |
| 미리보기 갱신 | 대상 페이지·모션·장비·피드백 프리셋 추가 | 공통 샘플 사이트와 실제 게임 코드 |
| 시각/전투 검수 | 관절·총구·파지·모핑·피해/숫자·폭발 재현 | [08](08-feasibility-and-qa.md)의 검수와 증거 |
| 스토리 검수 | 장면 참조·관람/스킵 완료 결과·중복 콜백·입력 소비 비교 | [21](21-story-and-skipping.md)의 StoryRegistry·공통 실행기·격리 샘플 |
| 장전 검수 | 총기별 탄수·시간·일반/빈 동작·취소/재개·완료 중복 방지 | [22](22-weapon-reloading.md)의 공통 장전 상태·파츠 뷰·격리 샘플 |

스킬은 현재 이용 가능한 기능을 골라 작업하고, 없는 기능을 완료됐다고 표시하지 않는다. MCP 서버나 외부 생성 서비스가 실제로 연결된 상태는 아니다. 추후 MCP가 필요하면 같은 검사·등록 로직을 JSON 도구 입력/출력으로 감싸며 판정 코드를 이중 구현하지 않는다.

## 6. 작게 실행하는 작업 단위

작업 요청은 대상 ID·동작·변경 범위·입력/의존 버전·원하는 산출물·검수 프리셋을 포함한다. 예를 들어 ‘캐릭터 전체’ 대신 ‘기존 공통 리그에서 M16 이동 사격의 손 접점 보정’처럼 범위를 지정한다.

에이전트는 목록 조회 → 재사용 판단 → 영향 범위 확인 → 필요한 제작 → 검수 → 등록·샘플 갱신으로 진행한다. 기존 규약을 매번 전부 읽지 않고 관련 문서와 짧은 JSON 결과를 참조한다.

스토리 문구 수정은 장면 텍스트·관련 검수만 갱신하고 캐릭터·무기를 재생성하지 않는다. 큐 변경은 해당 장면, 공통 StoryRunner 변경은 모든 장면을 검수한다. 현재 docs-check는 스토리 문서의 링크·JSON 구문만 확인하며 위 스토리 검수는 후속 연결 계획이다. 존재하지 않는 story-check 실행 명령을 가정하지 않는다.

생성 횟수·수정 시도·시간·동시 작업·실제 비용은 작업별로 기록·제한할 수 있게 설계한다. 구체적인 한도와 추가 작업 범위는 현재 사용자 지시를 따른다. 알 수 없는 비용·seed·검수 결과를 0이나 성공으로 채우지 않는다.

같은 입력·같은 오류를 원인 변경 없이 반복하지 않는다. 한 단계가 실패하면 유효한 이전 산출물을 보존하고 실패 단계·원인·다음 작업을 기록한다. 단순 조회·페이지 방문이 유료 생성·전체 재렌더·공개 배포를 자동 시작하지 않게 한다.

## 7. 사람의 판단과 기계 검사

파일·해시·참조·범위·검증 로그는 도구가 처리한다. 외형의 매력, 손·얼굴의 자연스러움, 타격감·속도감·소리의 만족도는 실제 미리보기·플레이로 판단한다. passed 기록과 채택 상태를 분리한다.

새 무기·갑옷은 캐릭터 전체를 다시 만들지 않고 관련 파츠·소켓·파지·fit을 수정한다. 변경된 조합만 재검수하고 공통 리그·전투 런타임을 바꾸면 관련 의존 범위를 넓힌다. [16](16-modular-character-and-weapons.md)·[17](17-modular-armor-appearance.md)·[18](18-preview-library-and-reuse.md)·[19](19-combat-feel-and-damage.md)를 따른다.

## 8. 검증 범위

기본 도구의 테스트는 [test_agent_pipeline.py](../tools/tests/test_agent_pipeline.py)에 있다. 손상된 파일·의존 참조·순환·변경 해시·경로 이탈·전이 영향 범위·미제작 상태와 구조화된 오류를 검증한다.

```powershell
python -m unittest discover -s tools/tests -p 'test_*.py' -v
```

테스트는 격리된 임시 파일을 사용한다. 실제 캐릭터·모션·사이트가 제작됐다는 증거가 아니다. 이미지 생성·렌더·자동 등록·웹 미리보기·배포 연결은 다음 구현 단계다.


## 모션 시험의 실제 실행 명령

rig_002부터 npm --prefix game run check와 npm --prefix game test를 사용할 수 있다. 전자는 JavaScript 구문을 검사하고 후자는 IK·고정 스텝·반동·장전·100회 무기 교체 검사를 실행한다. test는 art/characters/clone_01/motion/rig_002/tests/simulation-metrics.json을 갱신하므로 읽기 전용 CLI와 구분한다. 이미지·프레임·모델을 생성하지 않는다. 상세 결과와 브라우저 검수 범위는 [24](24-motion-rig-test.md)를 따른다.
