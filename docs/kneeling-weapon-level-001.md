# 앉아쏴 총 높이 조절 001

[문서 목록](../README.md) · [앉아쏴](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=kneel_fire)

사용자의 요청에 따라 같은 캐릭터 페이지에 **앉아쏴 총 낮춤** 조절을 추가했다. 범위는 0~18, 기본 0이며 값을 늘리면 총 전체를 아래로 내린다. 0은 기존 017의 기준 높이다. 총구의 수평 방향과 서서쏴·뛰며쏴의 설정은 유지한다. 설정은 앉기와 앉아쏴에 함께 적용해 발사 시 높이가 바뀌지 않도록 한다.

공통 리그의 `setKneelCarryDrop(value, immediate)`와 `KNEEL_CARRY`를 사용한다. 고정 스텝에서 기존 .10초 시정수로 전환하고, 앉는 양을 곱해 서거나 달릴 때 보정을 줄인다. 앉은 자세에서 일시정지 조절은 시간을 진행하지 않고 즉시 적용한다. 몸통 로컬 축 대신 월드 수직 방향으로 총 지지점과 무기 프레임을 옮긴 뒤 양손·탄창·장전·총구 접점을 계산한다.

낮춘 총에서도 기존 머리/시선 보정의 이동 한도를 유지한다. 높이 조절과 실제 아이레벨 조준 완료는 구분한다. 높이를 낮춘 상태의 접점 수치는 ‘총 지지’로 표시하며 물리적인 어깨 견착 통과로 보고하지 않는다.

값은 브라우저 저장소 `dear-human:kneel-drop:v1`와 주소의 `kneelDrop`으로 저장·복원한다. 주소의 값이 우선이며 전체 초기화는 0으로 되돌린다. 저장소 접근이 제한돼도 현재 조절과 주소 사용은 이어간다. 값의 단위는 공통 리그 논리 좌표이며 실제 화면 픽셀이나 총구 각도가 아니다.

[변경 전 소스](../art/characters/clone_01/motion/rig_005/records/runtime_snapshot_before_kneeling_weapon_level_001/index.json) · [레시피](../art/characters/clone_01/motion/rig_005/records/kneeling_weapon_level_001.json) · [개발 인계](../art/characters/clone_01/motion/rig_005/records/development_handoff_kneeling_weapon_level_001.json). 기존 원화·017 파츠·다른 모션·과거 기록을 덮어쓰지 않았고 이미지·GIF·플랜 B/C 작업은 없다.

사용자 검증 인계 지시에 따라 테스트·구문/문서/목록 검사·브라우저 검수를 실행하지 않았다. `untested`·사용자 검수 대기다. 낮춘 총과 시선의 관계, 최대 낮춤·큰 허리 숙임 조합의 손 도달/가림, 장전·자세 전환, 저장·주소 복원은 실제 검수가 남아 있다. 후속 출력은 `tests/kneeling_weapon_level_001`, `reviews/kneeling_weapon_level_001`로 분리하며 검사 도구 기본 경로는 변경하지 않았다.
