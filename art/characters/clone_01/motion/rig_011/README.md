# clone_01 · 몸통 관절과 전투 자세 011

[구현 기록](../../../../../docs/32-body-articulation-and-combat-poses.md) · [견착 대기](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=idle) · [앉아쏴](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=kneel_fire) · [뛰며쏴](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=run_fire)

몸통·바스트/흉갑·허리 연결부·스커트를 별도 메시 부착물로 나누고 숙임 조절과 견착 대기·앉아쏴·달리기 사격을 공통 rig_005에 연결했다. 사용자 요청대로 개발만 진행했으며 추가 테스트나 브라우저 검수는 실행하지 않았다. 현재는 사용자 검수 대기다.

## 의상 파트

- [body_parts.json](rig/body_parts.json): 원본 좌표, 네 파트, 삼각형 메시, 흉갑 경계 구멍과 경계 가중치.
- [작성 레시피](recipe/build_body_parts.py): 기존 `rig_004/source/body_core.png`의 UV만 분리하는 재현용 코드. 이미지 편집·생성·검사 도구가 아니다. `--connect`는 공통 파츠 정의도 갱신한다.
- 원본 텍스처는 유지한다. 흉갑은 rigid, 몸통은 흉갑 경계를 따르는 천, 허리는 상체–골반 연결, 스커트는 골반 부착이다. 새 몸통 PNG나 이면 원화는 생성하지 않았다.

## 총열 아래 받침 손

- [생성 원본](source/support_hand_underbarrel.png): 내장 image_gen 편집 결과를 변경 없이 복사했다. 이전 `rig_010/source/support_hand_foregrip_v2.png`는 장갑 외형 참고이며 새 손은 위로 향한 손바닥으로 총열 하단을 받치는 자세다.
- [정확한 영어 JSON 프롬프트](records/prompt_support_hand_underbarrel.json) · [동일 제출문 MD](records/prompt_support_hand_underbarrel.md) · [실제 생성 기록](records/generation.json).
- [손목·손바닥 접점](rig/hand_binding.json): 작성한 소스 영역과 두 접점을 저장했다. 원본 비율과 투명도를 유지한다.
- 생성 도구는 built-in image_gen이다. 도구가 모델명과 비용을 반환하지 않아 null로 기록했다. 실제 호출 시간은 생성 기록에 있다. 별도 CLI/API는 사용하지 않았다.

장전 손 3종은 미제작이며 이번 새 손은 사격/대기 받침 손으로만 사용한다. 원화 채택, 총열과 손가락의 가림·접촉 및 새 자세 품질은 사용자 검수 대기다.
