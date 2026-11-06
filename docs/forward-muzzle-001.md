# 모든 자세의 전방 수평 총구 001

[문서 목록](../README.md) · [서서쏴](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=fire) · [이동 사격](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=walk_fire) · [뛰며쏴](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=run_fire)

사용자의 요청에 따라 앉아쏴와 같은 전방 수평 총구 기준을 모든 자세에 적용했다. 이전에는 서기·걷기에 `torso.a*.08 + bendAngle*.72`가 남아 있어 허리 숙임을 늘리면 총도 아래로 회전했다. 해당 자세 회전 전달을 제거하고 총의 기본각을 모든 자세와 전환 중에 수평 0으로 통일했다. 기존 화면 반전이 좌우 방향을 처리한다.

발사 시 작은 반동 각도와 장전 조작의 의도된 기울임은 이어 사용한다. ‘수평’은 기본 방향을 뜻하며 이 동작까지 고정한 것은 아니다. 총은 계속 현재 몸통의 지지점과 높이·전진 설정을 따르고, 새 각도로 stock 소켓의 회전 오프셋을 계산한 뒤 양손·탄창·조준선·총구를 같은 무기 프레임에서 구한다. 앉아쏴 높이와 사격 허리각 조절, 현재 파츠·모션·카메라를 재사용한다.

[변경 전 소스](../art/characters/clone_01/motion/rig_005/records/runtime_snapshot_before_forward_muzzle_001/index.json) · [레시피](../art/characters/clone_01/motion/rig_005/records/forward_muzzle_001.json) · [개발 인계](../art/characters/clone_01/motion/rig_005/records/development_handoff_forward_muzzle_001.json). 기존 기록·원화·프롬프트는 수정하지 않았으며 새 이미지·GIF·플랜 B/C 작업은 없다.

사용자 검증 인계 지시에 따라 테스트·구문/문서/목록 검사·브라우저 검수를 실행하지 않았다. `untested`·사용자 검수 대기다. 큰 허리각·추가 숙임·총 높이 조합의 손 도달과 견착/가림, 자세 전환, 좌우 표시가 실제 검수로 남아 있다. 후속 출력은 `tests/forward_muzzle_001`, `reviews/forward_muzzle_001`로 분리하며 검사 도구 기본 경로는 바꾸지 않았다.
