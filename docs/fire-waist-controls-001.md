# 사격 허리각 조절 001

[문서 목록](../README.md) · [서서쏴](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=fire) · [뛰며쏴](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=run_fire)

사용자의 요청에 따라 같은 캐릭터 페이지에 **서서쏴 허리각**, **뛰며쏴 허리각** 조절을 추가했다. 각 기본각은 0~45° 범위를 .5° 단위로 조절하며 기본값은 12° / 15°다. ‘사격각도 기본값’은 두 값만 되돌리고, 기존 전체 ‘초기화’도 기본값으로 되돌린다. 기존 숙임 조절은 ‘공통 추가 숙임’으로 이름을 바꾸고 사격 기본각 위에 별도로 더한다.

공통 리그의 `CharacterRig.setFireWaist(kind, degrees, immediate)`가 `standing` / `running`을 받는다. 설정 목표와 실제 각도를 분리해 고정 스텝에서 기존 .10초 시정수로 전환한다. 실제 사격 준비량과 보행·달리기·앉기 전환량으로 보정 비중을 계산하므로 Space·발사 버튼도 같은 경로를 사용한다. 일시정지 중 현재 사격 자세의 슬라이더를 움직이면 각도 설정을 즉시 반영하며 시간을 진행하거나 발사를 추가하지 않는다.

사격 기본각은 정지/달리기의 기본 허리각을 바꾸며 호흡·하중·반동과 공통 추가 숙임은 유지한다. 따라서 실제 표시 허리각은 이런 움직임이 합쳐진 값이다. 이동 사격·앉아쏴의 기본 자세는 이번 전용 조절 대상에 포함하지 않았으며 기존 공통 추가 숙임을 사용할 수 있다. 사격 해제·장전 전환에서는 실제 준비량을 따라 전용 보정을 줄인다. 총 전진 보정과 양손·총구·머리 계산은 변경된 허리 자세를 이어 사용한다.

두 설정은 브라우저의 `dear-human:fire-waist:v1`에 저장하고, 주소의 `fireBend` / `runFireBend`로 공유·복원한다. 주소에 값이 있으면 해당 값을 우선한다. 슬라이더를 움직이는 동안은 자세와 저장값을 갱신하고 조절을 마치면 주소를 갱신한다. 저장소가 제한된 경우에도 현재 화면 조절과 주소 사용은 계속 가능하다.

[변경 전 소스](../art/characters/clone_01/motion/rig_005/records/runtime_snapshot_before_fire_waist_controls_001/index.json) · [레시피](../art/characters/clone_01/motion/rig_005/records/fire_waist_controls_001.json) · [개발 인계](../art/characters/clone_01/motion/rig_005/records/development_handoff_fire_waist_controls_001.json). 현재 앉아쏴 017·호흡/반동 016·달리기·손·천·카메라를 유지했고 새 원화·프롬프트·GIF·플랜 B/C 작업은 없다.

사용자의 검증 인계 지시로 테스트·구문/문서/목록 검사·브라우저 검수를 실행하지 않았다. `untested`·사용자 검수 대기다. 사격 중 실시간/일시정지 조절, 모션 전환·새로고침·주소 복원, 큰 각도와 공통 숙임을 더한 조합에서 의상·총·팔 접점은 실제 사용자 검수가 남아 있다. 후속 출력은 `tests/fire_waist_controls_001`, `reviews/fire_waist_controls_001`로 분리하며 이번에는 검사 도구 기본 경로를 바꾸지 않았다.
