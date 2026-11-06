# 35. 총열을 감싸 쥔 손 · 엄지 가림 014

[문서 목록](../README.md) · [견착 대기](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=idle) · [사격](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=fire)

사용자는 총을 가볍게 받치는 손 대신 총열을 잡는 손과 보이지 않는 엄지를 요청했다. 같은 장갑을 참고해 네 손가락이 수평 핸드가드를 감싸는 새 원화를 built-in image_gen으로 편집 생성하고 공통 rig_005에 연결했다. 엄지는 무기 반대편에 가려진 자세이며 새 그림에 보이지 않는다. 사용자 검증 인계 지시에 따라 테스트·문서/목록 검사·브라우저 검수는 실행하지 않았다. 현재는 `untested`·사용자 검수 대기다.

- [새 손과 정확한 영어 JSON/MD 프롬프트](../art/characters/clone_01/motion/rig_014/README.md)를 별도 버전에 보존한다. 생성 PNG의 알파와 픽셀은 수정하지 않았다.
- 기존 손을 아래로 받치던 `support_hand_underbarrel`에서 `support_hand_closed_grip`으로 교체했다. 손목과 핸드가드 축을 따로 등록하고 원본 비율을 유지한다. 네 손가락은 기존 공통 렌더러에서 무기 앞에 그려져 핸드가드 옆면을 감싼다.
- M16 지지 접점은 (.63, .48)의 하단에서 **(.63, .34)**의 핸드가드 축으로 옮겼다. [m16_binding_014](../art/weapons/m16_basic/rig_014/README.md)에 기록한다. 팔 IK와 렌더러가 같은 손목·접점을 사용한다.
- 대기·보행·서서쏴·앉아쏴·달리기에 같은 손을 사용한다. 장전은 기존 임시 손을 이어 사용하며 놓기·탄창 파지·조작부 손 3종은 미제작이다.
- 이전 013 소스는 `rig_005/records/runtime_snapshot_013`에 보존했다. 이전 원화·프롬프트·검수 기록을 덮어쓰지 않았다. 다음 검사 출력만 `tests/closed_grip_014`, `reviews/closed_grip_014`로 분리했으며 실행하지 않았다.

[제작 레시피](../art/characters/clone_01/motion/rig_005/records/closed_grip_014.json)와 [개발 인계](../art/characters/clone_01/motion/rig_005/records/development_handoff_014.json)에 의존 파일·생성 도구·실제 호출 시간과 미검수 범위를 기록한다. 실제 재생 중 손 크기·손목 연결·손가락/핸드가드 겹침은 사용자 검수가 남아 있다.
