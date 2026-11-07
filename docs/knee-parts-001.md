# 앉기 무릎 파츠 보정 · knee_parts_001

사용자 요청: “앉기에서 무릎파츠가 이상해”. [앉기](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=kneel)와 [앉아쏴](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=kneel_fire)에 같은 파츠 보정을 적용했다. 사용자 채택 `kneeling_fire_001`과 017의 골반·양발·접지 무릎 및 고정 길이 다리는 유지한다.

기존 무릎 장갑은 정강이 원본 v=.28에서 수평으로 잘렸다. 실제 장갑 끝은 그보다 아래에 있어, 장갑 아래쪽이 정강이에 남아 서로 다른 방향으로 돌았다. 무릎 안쪽을 가리던 파츠는 허벅지 아래 32%를 통째로 다시 그려 무릎 위·옆으로 삼각형처럼 튀어나왔다. 앉기/일어서기에서는 뒤 정강이가 `atan2` 경계를 넘으면서 무릎 장갑의 계산 각도가 한 스텝에 약 6.35rad 튀는 문제도 확인했다.

원본 `limbs_atlas.png`를 재사용해 장갑 끝을 따라 UV 경계를 작성했다. `KNEE_FRONTIER`의 (u,v)는 (0,.21), (.35,.21), (.48,.25), (.61,.33), (1,.34)이며 무릎 장갑과 정강이 연결부가 이 경계를 공유한다. 두 메시의 원본 영역은 중복이나 누락 없이 기존 정강이 한 장을 이룬다. [작성 도구](../art/characters/clone_01/motion/rig_005/records/knee_parts_001/author.py)와 [버전별 부착물](../art/characters/clone_01/motion/rig_005/records/knee_parts_001/attachments.json)에 저장하고 현재 정의에 연결했다. 017의 부착물 원문은 보존한다.

앉을 때 장갑의 등록 중심은 원본 v=.13에서 .19로 옮긴다. 새 하단 .34와의 차이가 기존 .28−.13과 같아 접지 관절 높이는 그대로다. 장갑 경계에서 정강이의 짧은 연결부를 이어 붙이고 v=.44 아래 주 장갑·발목은 기존 정강이 변환을 유지한다. 무릎 안쪽 천은 기존 허벅지의 중앙 하단 일부만 사용한 작은 둥근 메시로 바꾸고 관절 중심에 배치했다. 원본·뼈 길이·허벅지의 현재 폭은 바꾸지 않는다.

무릎 장갑 각도는 정강이 방향을 먼저 −π~π로 정규화한 뒤 정방향으로 전환한다. 접힌 정강이가 방향 경계를 지나도 한 바퀴 도는 보간이 생기지 않는다. 걷기/달리기와 대기는 기존 통합 정강이 표시를 사용한다.

변경 JS 구문과 한 번의 앉기↔일어서기 288스텝만 확인했다. 공유 경계의 위치 오차는 약 2×10⁻¹⁴, 주 정강이 변형 차이는 0, 다리 길이 오차는 약 4×10⁻¹⁴ 논리 단위였다. 장갑 최대 각도 변화는 한 스텝 .0624rad로 줄었다. UV 영역 합, 접지 장갑 메시 하단과 변경하지 않은 28개 파츠 정의도 확인했다. [수치 기록](../art/characters/clone_01/motion/rig_005/tests/knee_parts_001/knee-attachments.json). 이는 실제 알파 표면 충돌이나 전신 아트 채택의 판정은 아니다.

Mac Chrome에서 동일한 시간·135% 배율로 보존 소스/현재 소스를 비교하고, 기존 버튼으로 일어서기→앉기를 짧게 재생했다. 정측면·망토 끄기에서도 무릎을 확인했다. [앉기 전후](../art/characters/clone_01/motion/rig_005/reviews/knee_parts_001/kneel-comparison.png) · [앉아쏴 전후](../art/characters/clone_01/motion/rig_005/reviews/knee_parts_001/kneel_fire-comparison.png) · [정측면 상세](../art/characters/clone_01/motion/rig_005/reviews/knee_parts_001/kneel-after-side-detail.png) · [Chrome 기록](../art/characters/clone_01/motion/rig_005/reviews/knee_parts_001/browser.json).

변경 전 두 JS와 리그 정의는 `runtime_snapshot_before_knee_parts_001`, 새 레시피/인계와 tests/reviews는 `knee_parts_001`로 분리했다. 큰 수동 설정·모든 전환 조합은 확인하지 않았고, 깊게 접힌 뒤 무릎 연결부의 2D 변형과 가림은 사용자 아트 검수 대기다. 실제 3D 관절·새 이면/접힘 원화·PNG 수정·GIF·플랜 B/C 변경·전체 검사나 문서/목록 검사는 없다.
