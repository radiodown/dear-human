# 캐릭터 4방향 샘플 일러스트 001

[공통 캐릭터 페이지](http://127.0.0.1:4173/#/samples/characters/clone_01?rev=turnaround_001) · [채택 외형 기록](../../../../../docs/23-character-appearance-review.md)

사용자 요청으로 채택 원화 `reference_003_3d`를 참조해 내장 `image_gen`으로 앞·뒤·좌·우를 각각 새로 생성했다. 네 PNG는 모두 1024×1536, 불투명 회색 스튜디오 배경이다. 소총과 손에 든 헬멧을 제외한 중립 전신 자세로 의상 실루엣을 보여 준다.

| 방향 | 원본 PNG | 정확한 영어 JSON 프롬프트 |
|---|---|---|
| 정면 | [front.png](source/front.png) | [JSON](records/prompt_front.json) · [MD](records/prompt_front.md) |
| 후면 | [back.png](source/back.png) | [JSON](records/prompt_back.json) · [MD](records/prompt_back.md) |
| 좌측면 · 화면 왼쪽을 봄 | [left.png](source/left.png) | [JSON](records/prompt_left.json) · [MD](records/prompt_left.md) |
| 우측면 · 화면 오른쪽을 봄 | [right.png](source/right.png) | [JSON](records/prompt_right.json) · [MD](records/prompt_right.md) |

정면은 채택 원화를, 후면은 채택 원화와 새 정면을 참조했다. 좌측면은 정면·후면도 함께 참조하고 우측면은 좌측면까지 함께 참조했다. 생성은 총 4회이며 미러링·리사이즈·중심/발 정렬 등 이미지 후처리는 하지 않았다. 원본 바이트를 프로젝트에 복사했다.

같은 캐릭터 페이지의 버전 선택에서 ‘샘플 일러스트 · 앞뒤좌우 4방향’을 고르고 전체/정면/후면/좌측면/우측면을 본다. 각 그림과 ‘원본 보기’로 개별 PNG를 연다. `view=front`, `view=back`, `view=left`, `view=right` 직접 주소도 제공한다. 채택 외형은 기존 `reference_003_3d`를 유지하며 새 샘플은 사용자 아트 검수 대기다.

파일 디코딩·크기/해시와 짧은 Chrome 페이지 확인을 수행했다. 전체/4개 방향·원본 링크·방향 주소 복원·500px 2열 표시·채택 원화 복귀를 확인했으며 [검토 기록](reviews/browser.json)과 [데스크톱](reviews/desktop-gallery.png)·[500px](reviews/narrow-gallery.png) 캡처를 남겼다. 같은 폴더에서 다른 파츠 작업이 동시에 진행되어 최초 공통 페이지 재로딩 검사는 중단됐고, 이번 커밋의 표시 소스만 분리한 로컬 페이지로 확인했다. [첫 검사 기록](reviews/initial-shared-workspace-check.json)을 보존한다. 전체 검사는 실행하지 않았다.

후면의 두 갈래 망토와 금장 문양, 뒤쪽 무릎/장갑판 구조는 모델의 추정이다. 네 방향 사이 얼굴·장비·망토 주름/단 길이에 작은 차이가 있으므로 정확한 3D 회전이나 제작용 정투상 도면으로 취급하지 않는다. 파츠/리그/모션·플랜 B/C·GIF는 이번 제작에 포함하지 않는다.

[생성·의존·시간·비용/해시 기록](records/generation.json) · [도구 실행 원문 메타데이터](records/tool_runs.json). 모델 ID·seed·실제 청구 비용은 도구가 제공하지 않아 `null`이다.
