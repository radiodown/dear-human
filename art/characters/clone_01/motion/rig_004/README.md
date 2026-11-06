# clone_01 · 측면 파츠와 견착 04

[변경 이유·구현·검사 범위](../../../../../docs/26-side-parts-and-shoulder-contact.md) · [같은 모션 페이지](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=idle)

채택 외형 reference_003_3d를 측면 전투 구도로 다시 준비한 초안이다. 사실적인 3D 렌더 질감의 2D 이미지이며 실제 3D 모델은 없다. 외형·움직임의 최종 사용자 승인은 별도다.

| 경로 | 내용 |
|---|---|
| [source/side_master.png](source/side_master.png) | 전신 측면 기준 자세 |
| [source/base_atlas.png](source/base_atlas.png) | 머리·뒷머리·망토. 팔이 남은 몸통 셀은 사용 제외 |
| [source/limbs_atlas.png](source/limbs_atlas.png) | 앞뒤 상완·전완·허벅지·정강이·부츠, 방아쇠 손·보조 손 |
| [source/body_core.png](source/body_core.png) | 팔 없는 몸통·허리·하의 연결 의상 |
| [rig/parts.json](rig/parts.json) | 원본 UV·관절·크기·가림 순서·배치 |
| [records/assembly.json](records/assembly.json) | 셀 경계 수정과 의상 분리 수준 기록 |
| [tests/simulation-metrics.json](tests/simulation-metrics.json) | 현재 공유 리그의 수치 검사와 입력 해시 |
| [reviews/review.json](reviews/review.json) | 실제 웹 정지 캡처 조건·판단·한계 |

이미지는 내장 imagegen 도구로 만들었다. 원본 RGBA 파일을 픽셀 수정 없이 보존하고, 표시할 영역은 UV로 선택한다. M16 본체·탄창 그림은 기존 것을 재사용한다. 페이지 방문이나 무기 교체 시 새 이미지를 생성하지 않는다. GIF 추가 출력도 없다.

제출한 영어 JSON과 동일한 내용을 MD에 함께 저장했다. 과거 프롬프트를 새 결과에 맞춰 소급 수정하지 않는다.

- 기준 자세: [JSON](records/master_prompt.json) · [MD](records/master_prompt.md) · [생성 기록](records/master_generation.json)
- 기본 레이어: [JSON](records/base_prompt.json) · [MD](records/base_prompt.md) · [생성 기록](records/base_generation.json)
- 팔다리: [JSON](records/limbs_prompt.json) · [MD](records/limbs_prompt.md) · [생성 기록](records/limbs_generation.json)
- 몸통 보정: [JSON](records/body_prompt.json) · [MD](records/body_prompt.md) · [생성 기록](records/body_generation.json)

생성 도구가 반환하지 않은 모델 ID·seed·비용은 null이다. 기록한 생성 경과 시간에는 수작업 리깅·조정·검수가 포함되지 않는다. 몸통·허리·하의의 세부 장갑 교체와 반대쪽 전용 그림은 아직 준비하지 않았다.
