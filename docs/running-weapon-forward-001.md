# 뛰며쏴 · 숙임에 따른 총 전진 001

[문서 목록](../README.md) · [뛰며쏴](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=run_fire) · [이전 달리기 자세](running-mechanics-002.md)

사용자가 뛰며쏴에서 허리 숙임·웅크림에 따라 조준기가 눈 뒤로 가므로 총을 조금 앞으로 내밀도록 요청했다. `running_weapon_forward_001`은 기존 15° 달리기 자세와 총 높이·수평 방향을 유지하면서, 총 전체에 이동 방향의 수평 전진량을 더한다.

`firing-form.js`의 `runningForward`는 기본 2에 실제 몸통–골반 숙임(rad)의 8배와 골반 낮춤에 따른 최대 1.5를 더하고, 최대 10으로 제한한다. 달리기 자세·총 들기 전환량을 따라 부드럽게 적용하며 장전 조작 중에는 줄인다. 이는 작성한 논리 좌표 수치이며 재생 측정 결과가 아니다. 달리기와 뛰며쏴는 같은 계산을 사용해 발사 시작 시 총이 별도 위치로 튀지 않도록 한다.

실제 적용량은 양팔의 현재 투영 뼈 길이와 손목 목표에서 계산한 최대 수평 도달량으로 추가 제한한다. `formArmLengths`를 실제 팔 IK와 보정 한도에 공통 사용한다. 팔 길이나 손 그림을 확대하지 않으며, 깊은 숙임에서는 전진량이 도달 한도에 걸릴 수 있다.

`rig-core.js`는 양손·탄창·장전 접점·총구를 계산하기 전에 총 지지점과 무기 프레임을 함께 이동한다. 오른쪽을 보는 공통 리그의 +X 보정이며 왼쪽 방향은 기존 화면 반전을 따른다. 총 높이를 바꾸거나 눈을 조준선으로 이동하지 않는다. 실제 보정량은 pose의 `weaponAdvance`에 남긴다.

[변경 전 소스](../art/characters/clone_01/motion/rig_005/records/runtime_snapshot_before_running_weapon_forward_001/index.json) · [레시피](../art/characters/clone_01/motion/rig_005/records/running_weapon_forward_001.json) · [개발 인계](../art/characters/clone_01/motion/rig_005/records/development_handoff_running_weapon_forward_001.json). 과거 레시피·검사·프롬프트는 수정하지 않았다.

사용자 검증 인계 지시에 따라 테스트·구문/문서/목록 검사·브라우저 캡처를 실행하지 않았다. 상태는 `untested`·사용자 검수 대기다. 실제 조준기–눈 위치, 깊은 숙임과 총 높이 조합의 팔 접점, 장전 전환은 사용자 재생 검수가 남아 있다. 후속 출력은 `tests/running_weapon_forward_001`, `reviews/running_weapon_forward_001`로 분리해야 하며 검사 도구 기본 경로는 변경하지 않았다. 새 이미지·GIF·플랜 B/C 작업은 없다.
