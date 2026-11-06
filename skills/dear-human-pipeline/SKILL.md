---
name: dear-human-pipeline
description: Run reusable catalog, cache, dependency and document checks for asset production in the Dear Human game workspace. Use for its character, motion, weapon, armor, FX and preview workflow; skip unrelated projects.
---

# Dear Human production pipeline

프로젝트 루트의 AGENTS.md와 docs/18-preview-library-and-reuse.md, tools/agent_pipeline.py를 먼저 확인한다. 이 프로젝트의 기존 자산·규약을 재사용하고 필요한 문서만 읽는다.

## 반복 검사와 조회

프로젝트 루트에서 다음 CLI를 사용한다. Python 표준 라이브러리만 필요하며 아래 명령은 읽기 전용이다.

```powershell
python tools/agent_pipeline.py --root . docs-check
python tools/agent_pipeline.py --root . catalog-list
python tools/agent_pipeline.py --root . catalog-check
python tools/agent_pipeline.py --root . reuse-find --kind character --entity-id clone_01 --recipe-key RECIPE_KEY
python tools/agent_pipeline.py --root . impact --kind character --entity-id clone_01 --revision-id REVISION_ID
```

RECIPE_KEY와 REVISION_ID는 실제 요청·등록 버전의 값으로 바꾼다. 계획 상태의 대상에 존재하지 않는 버전 ID를 만들어 넣지 않는다. --limit의 기본값은 20이며 전역 옵션은 하위 명령 앞에 둔다.

- 생성 전 목록과 재사용 후보를 조회한다. reuse-find는 passed 기록과 실제 파일·의존 파일 해시가 맞는 후보만 반환한다. 후보가 없다는 결과는 생성 성공이나 자동 생성 명령이 아니다.
- 리그·무기·외형 변경 시 impact로 기존 의존 버전을 확인한다. 이 결과는 재검토 범위이며 파일을 수정하거나 재생성하지 않는다.
- JSON의 status와 issues를 확인하고 완료·미제작·실패를 구분한다. 실제 작품 품질은 시각·플레이 검수로 별도 판단한다.

## 실제 제작 작업

작업에 필요한 규약을 선택해서 읽는다: 파츠/무기는 docs/16-modular-character-and-weapons.md, 갑옷은 docs/17-modular-armor-appearance.md, 미리보기는 docs/18-preview-library-and-reuse.md, 전투 피드백은 docs/19-combat-feel-and-damage.md, 도구 계약은 docs/20-agent-automation.md.

2dimg2motion·PixelFX·이미지 생성·리깅·브라우저·배포는 실제 이용 가능한 도구와 사용 조건을 확인해 수행한다. 현재 CLI에 없는 register/render/generate 명령이나 MCP 연결을 추측해 실행하지 않는다.

새 에셋은 변경된 부분만 제작하고 레시피·입력·산출물·의존 버전·실제 비용/시간을 기록한다. 기존 채택 파일을 덮어쓰지 않는다. 실패 원인이 바뀌지 않은 무한 재시도를 피하고 현재 작업의 요청 범위·예산을 따른다.

첫 실제 시각 에셋부터 공통 샘플 사이트를 구축·갱신하고 실제 게임 재생 코드를 공유한다. 아직 원화만 있다면 원화 보기와 미지원 모션을 구분한다. 문서·메타데이터 변경만 있는 작업에 가짜 시각 에셋이나 빈 사이트를 만들지 않는다.

작업 후 관련 검사와 미리보기 확인 결과를 짧게 보고한다. 도구의 passed는 기록·구조 검수이며 사용자의 아트 선택을 대신하는 표시가 아니다.

## 현재 모션 시험

rig_002의 구현·한계·실제 결과는 docs/24-motion-rig-test.md를 따른다. 프로젝트 루트에서 npm --prefix game run check로 구문을, npm --prefix game test로 IK·고정 스텝·반동·장전·100회 무기 교체를 검사한다. test는 art/characters/clone_01/motion/rig_002/tests/simulation-metrics.json을 갱신하므로 읽기 전용 CLI와 구분한다. 모델 호출·이미지 생성은 하지 않는다. 기존 검사 결과가 현재 코드 해시와 다르면 다시 검사한 뒤 목록 해시도 갱신한다. 브라우저 정지 캡처와 실제 입력·전체 애니메이션 검수, 자체 리그 시험과 Spine 시험을 구분한다.
