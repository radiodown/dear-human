# 플랜 B · 심플·슬림 자세 원화 005

사용자가 “도트화인데 요소가 많아졌다. 더 심플하고 슬림하게, 각 자세별 원화만 먼저. 동작은 아직 하지 말 것”이라고 지시해 모션 작업을 중단하고 새 스타일의 **정지 원화7장**을 만들었다. 내장 image_gen으로 정지 기준1장과 이를 참조한 나머지6자세를 각각 생성했다. 모든 자세는 원화 검토용이며 사용자 아트 검수 대기다.

[미리보기](http://127.0.0.1:4173/#/samples/characters/clone_01?plan=b&study=simple_poses_005&pose=idle) · [7자세 모아보기](output/pose-overview.png)

| 정지 원화 | 이미지 | 정확한 영어 JSON/MD 요청 |
|---|---|---|
| 정지 | [PNG](idle/output/pose.png) | [JSON](idle/records/prompt.json) · [MD](idle/records/prompt.md) |
| 걷기 자세 | [PNG](walk/output/pose.png) | [JSON](walk/records/prompt.json) · [MD](walk/records/prompt.md) |
| 걷기 사격 자세 | [PNG](walk_fire/output/pose.png) | [JSON](walk_fire/records/prompt.json) · [MD](walk_fire/records/prompt.md) |
| 정지 사격 자세 | [PNG](idle_fire/output/pose.png) | [JSON](idle_fire/records/prompt.json) · [MD](idle_fire/records/prompt.md) |
| 앉기 자세 | [PNG](kneel/output/pose.png) | [JSON](kneel/records/prompt.json) · [MD](kneel/records/prompt.md) |
| 앉아쏴 자세 | [PNG](kneel_fire/output/pose.png) | [JSON](kneel_fire/records/prompt.json) · [MD](kneel_fire/records/prompt.md) |
| 장전 자세 | [PNG](reload/output/pose.png) | [JSON](reload/records/prompt.json) · [MD](reload/records/prompt.md) |

## 단순화 기준

기존 `fighter_outfit_003`보다 머리/몸통/팔다리와 골반 주변 의상 부피를 줄여 가늘고 긴 성인 실루엣으로 다시 그렸다. 단순한 전체 가로 압축이나 원본 재배율이 아니다. 기존 원본·공통 리그의 체형은 바꾸지 않고 이 시안의 새 스타일에만 적용했다.

머리카락은 큰 실루엣과2~3개 명암 덩어리, 몸통은 검은 중앙 흉갑·회색 바깥 인셋·가슴 아래 스트랩·단순한 허리 벨트, 하의는3~4개 넓은 장갑 패널과 작은 파우치로 줄이도록 요청했다. 무릎/군화·M16도 몇 개의 큰 도형과 색면으로 읽게 하고 미세 리벳·다중 벨트/파우치·금색 잔선·촘촘한 머리카락·재질 명암을 줄였다. 검은 긴 머리·창백한 피부·회색 흉갑 인셋·짧은 장갑 하의·가터/스타킹·군화·금장 망토와 오른쪽 조준 방향은 유지한다.

12°는 얕은 내려보기의 요청 목표이며 측정된3D 카메라값은 아니다. 12~16색·재질당2단계 명암·큰 픽셀 덩어리를 목표로 요청했지만 정확한 고정 팔레트나 단일 논리 픽셀 격자를 자동 강제한 게임 최종본은 아니다. 후처리로 색을 줄이거나 개별 그림의 크기/중심을 보정하지 않았다. 각 생성 원본은 `pose/source/generated.png`, 동일한 표시 PNG는 `pose/output/pose.png`다.

## 정지 원화만 제공

같은 플랜 B 페이지에서 자세를 선택하고 ‘상세형과 심플·슬림형 비교’ 또는 ‘심플 원화7자세 한눈에 보기’를 펼친다. 배경/표시 크기·자세 주소와 새로고침 복원을 제공한다. 사격 원화도 한 장의 조준 자세이며 발사 입력·횟수·프레임 재생을 연결하지 않았다. 장전 역시 탄창 삽입 자세 한 장이다.

이 버전에는 중간 포즈·연속 프레임·애니메이션 atlas·GIF·새 모션 재생이 없다. 이전 모션 작업 [fighter_motion_004](../fighter_motion_004/README.md)는 사용자 중단 상태로 보존하고 미완성 탭과 재생 확장을 현재 표시 코드에서 제거했다. 그 작업을 완료·검증·채택으로 보고하지 않는다. 기존14프레임 모션과 이전 원화·플랜 E는 유지한다.

## 확인과 남은 검수

필요한 JS 구문과 짧은 Windows Chrome에서7장 PNG 표시·선택/주소/복원·정지원화 갤러리·상세형 대조·배경/크기·500px만 확인했다. 앱 내 브라우저의 앞선 연결 초기화 오류로 별도 Chrome을 썼다. 새 애니메이션 실행·전체 검사·GIF는 없다. [표시 기록](reviews/browser.json), [PNG/원본 바이트 확인](reviews/structure.json), [생성/실제 시간/해시](records/generation.json), [시각 관찰](reviews/visual.json)을 분리했다.

자세별 얼굴·머리/총 크기·의상 윤곽·접지/파지의 작은 차이는 사용자 검수 대기다. 정지 원화가 연결된 자연스러운 모션이나 게임용 최종 스프라이트를 보장하지 않는다. 모션 제작은 후속 사용자 지시 전까지 보류한다.
