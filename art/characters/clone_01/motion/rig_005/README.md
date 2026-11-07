# clone_01 · 파츠 모션 rig_005

**앉기 무릎 파츠 knee_parts_001:** [변경/전후 비교](../../../../../docs/knee-parts-001.md) · [부착물](records/knee_parts_001/attachments.json) · [레시피](records/knee_parts_001/recipe.json) · [인계](records/knee_parts_001/handoff.json). 무릎 장갑/정강이를 장갑 윤곽에서 분리하고 공유 경계를 연결했다. 무릎 밖으로 튀어나오던 천을 짧게 바꾸고 앉기/일어서기 각도 점프를 고쳤다. 017의 관절 목표·다리 길이·현재 원본/다른 동작은 유지한다. 필요한 짧은 연결/전환·Chrome 비교는 tests/reviews의 `knee_parts_001`이며 최종 아트 검수는 대기다.

**달리기·완전 대기 팔 carry_arms_001:** [변경/전후 비교](../../../../../docs/carry-arms-001.md) · [레시피](records/carry_arms_001/recipe.json) · [인계](records/carry_arms_001/handoff.json). 낮춘 총의 지지점을 옮겨 손목이 어깨 뒤로 접히는 자세를 보정하고 팔꿈치의 아래쪽 분기를 유지한다. 총 높이가 도달을 넘으면 총 전체를 양팔 범위 안으로 옮긴다. 기존 총구35°/58°·원본/팔 길이·현재 보행과 사격 자세는 유지한다. 필요한 짧은 접점/전환·Chrome 전후/재생은 tests/reviews의 `carry_arms_001`이며 최종 아트 검수는 대기다.

**허벅지·보행 폼 leg_gait_001:** [변경/전후 비교](../../../../../docs/leg-gait-001.md) · [레시피](records/leg_gait_001/recipe.json) · [인계](records/leg_gait_001/handoff.json). 사용자 요청으로 허벅지 렌더 폭을 .76배로 줄이고 움직이는 고관절을 +2/-2로 모았다. 걷기 골반/보폭/회수와 달리기 착지/밀어내기/체공을 함께 보정하고 상체 흔들림을 줄였다. 원본·뼈 길이·무릎 장갑/군화·현재 머리 연결/총구/대기/조절과 앉아쏴 관절 목표는 유지한다. 필요한 짧은 구문·접지/도달/전환·Chrome 비교 결과는 tests/reviews의 `leg_gait_001`이며 최종 아트 검수는 대기다.

**걷기 스커트 덮임 skirt_walk_cover_001:** [변경 내용](../../../../../docs/skirt-walk-cover-001.md) · [레시피](records/skirt_walk_cover_001/recipe.json) · [인계](records/skirt_walk_cover_001/handoff.json). 걷기에서 허벅지 윗단의 회전을 골반에 연결하고 스커트 패널이 양쪽 다리의 바깥 움직임을 받아 덮도록 했다. 아랫단의 과도한 들림을 줄이고 아래 늘어짐을 더했다. 벨트/중앙 경계·고관절/무릎 중심·대기/앉아쏴와 원본은 유지한다. 필요한 짧은 연결 확인과 Chrome 전후/재생 결과는 tests/reviews의 `skirt_walk_cover_001`이며 실제 알파 덮임과 자연스러움은 사용자 검수 대기다.

**머리·몸통 연결 head_body_sync_001:** [변경 내용](../../../../../docs/head-body-sync-001.md) · [레시피](records/head_body_sync_001/recipe.json) · [인계](records/head_body_sync_001/handoff.json). 지속적인 기본 숙임만 시선 보정하고 발걸음/몸통의 순간 회전은 머리에 전달한다. 흉곽의 별도 상하 바운스는 제거하고 느린 호흡·접지 움직임은 유지했다. 머리/눈/뒤 머리카락이 공통 `headFrame`을 쓰며 앉아쏴 조준과 총구/대기/조절 기능은 유지한다. 필요한 구문·짧은 동기화/접점·Chrome 확인 결과는 tests/reviews의 `head_body_sync_001`이다. 자연스러움과 목 실루엣은 사용자 검수 대기다.

**달리기 총구·두 대기 carry_idle_001:** [변경 내용](../../../../../docs/carry-idle-001.md) · [레시피](records/carry_idle_001/recipe.json) · [인계](records/carry_idle_001/handoff.json). 비사격 달리기 총구를 아래 35°로 내리고 완전 대기(총구 아래 58°·상체 전경 해제)를 추가했다. 기존 견착 대기와 뛰며쏴의 전방 수평은 유지하며, 두 낮춘 자세에서 발사 입력은 총을 든 뒤 첫 발을 낸다. 완전 대기도 같은 조절·별도 저장·일시정지 비교를 사용한다. 필요한 짧은 구문·접점/전환·Chrome 확인 결과는 tests/reviews의 `carry_idle_001`이며 아트 검수는 대기다.

**동작별 공통 조절 motion_controls_001:** [변경 내용](../../../../../docs/motion-controls-001.md) · [레시피](records/motion_controls_001/recipe.json) · [인계](records/motion_controls_001/handoff.json). 8개 동작의 동일 패널에서 기본 허리각·추가 숙임·흉갑·총 낮춤·활동감과 반응/조명을 동작별로 조절·저장한다. 이동 사격/앉기에도 같은 허리각·수직 총 높이를 적용하며 일시정지 비교와 개별/전체 초기화를 제공한다. 기존 기본 자세와 수평 총구는 유지한다. 새 결과는 tests/reviews의 `motion_controls_001`로 분리하며 큰 각도·총 높이 조합과 가림은 사용자 검수 대기다.

**파츠 모션 활동감 dynamic_motion_001:** [변경 내용](../../../../../docs/dynamic-parts-motion-001.md) · [레시피](records/dynamic_motion_001/recipe.json) · [인계](records/dynamic_motion_001/handoff.json) · [달리기](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=run&energy=100). 착지 압축·발 회수·흉곽 시간차·출발/정지와 발사 후 상체 반응·망토/머리 끝/옷자락을 강조했다. 강도는 0~150%, 기본 100%이며 0%는 이전 움직임이다. 양쪽 다리의 도달 범위로 골반 상승을 제한하고 접지·수평 총구·017 앉아쏴를 유지한다. 필요한 구문·짧은 접점 검사와 Chrome 재생/UI 확인을 수행했으며 사용자 아트 검수는 대기다. 새 결과는 tests/reviews의 `dynamic_motion_001`에 분리했다.

**전방 수평 총구 001:** [변경 내용](../../../../../docs/forward-muzzle-001.md) · [레시피](records/forward_muzzle_001.json) · [인계](records/development_handoff_forward_muzzle_001.json) · [서서쏴](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=fire) · [이동 사격](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=walk_fire). 모든 자세에서 허리각과 독립적으로 총구 기본 방향을 전방 수평으로 맞췄다. 발사 반동·장전 기울임과 총 높이/전진 설정을 이어 쓰며 추가 검사 없이 `untested`·사용자 검수 대기다.

**앉아쏴 총 높이 조절 001:** [변경 내용](../../../../../docs/kneeling-weapon-level-001.md) · [레시피](records/kneeling_weapon_level_001.json) · [인계](records/development_handoff_kneeling_weapon_level_001.json) · [앉아쏴](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=kneel_fire). 앉아쏴 총 낮춤 0~18을 추가했다. 기본 0은 기존 높이이며 총구 수평을 유지한 채 총과 양손을 함께 내린다. 값은 브라우저와 주소에 저장하며 추가 검사 없이 `untested`·사용자 검수 대기다.

**사격 허리각 조절 001:** [변경 내용](../../../../../docs/fire-waist-controls-001.md) · [레시피](records/fire_waist_controls_001.json) · [인계](records/development_handoff_fire_waist_controls_001.json) · [서서쏴](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=fire) · [뛰며쏴](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=run_fire). 두 사격 기본각을 0~45°로 따로 조절·저장하며 기본은 12° / 15°다. 기존 공통 추가 숙임은 별도 유지한다. 추가 검사 없이 `untested`·사용자 검수 대기다.

**정답 이미지 적용 앉아쏴 017:** [적용 기록](../../../../../docs/kneeling-image-application-017.md) · [부착물 rig_017](../rig_017/README.md) · [앉아쏴](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=kneel_fire). 골반 앞 무릎·전용 상체/양팔·수평 견착과 눈 정렬, 독립 무릎 장갑·앞/뒤 스커트 패널, 길이를 유지한 망토 바닥 경로를 연결했다. 기존 UV를 재사용한 개발 버전이며 새 사선/깊은 접힘 원화는 없다. 테스트·구문/문서/목록 검사·브라우저 검수 없이 `untested`·사용자 검수 대기다.

**뛰며쏴 총 전진 001:** [변경 내용](../../../../../docs/running-weapon-forward-001.md) · [레시피](records/running_weapon_forward_001.json) · [인계](records/development_handoff_running_weapon_forward_001.json) · [뛰며쏴](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=run_fire). 숙임·골반 낮춤에 따라 총 전체를 조금 앞으로 옮기고 양팔 도달 범위로 제한한다. 총 높이·수평 방향과 현재 모션을 유지하며 추가 검사 없이 `untested`·사용자 검수 대기다.

최신 추가 반응은 [호흡·상체·의상 016](../../../../../docs/breathing-and-body-motion-016.md)을 따른다. 대기 호흡, 걷기·달리기의 작은 허리 움직임과 매 발사 후 상체 복귀를 연결했다. ‘허리·옷자락’은 연결 천과 하단 옷자락의 반응을 즉시 켜고 끄며 일시정지 중에도 비교한다. 기존 파츠와 현재 자세·접지를 재사용하며 추가 검증 없이 `untested`·사용자 검수 대기다.

[016 레시피](records/breathing_016/recipe.json) · [016 인계](records/breathing_016/handoff.json) · [대기](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=idle)

**달리기 미세 보정 running_mechanics_002:** [변경 내용](../../../../../docs/running-mechanics-002.md) · [레시피](records/running_mechanics_002.json) · [인계](records/development_handoff_running_mechanics_002.json) · [달리기](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=run) · [뛰며쏴](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=run_fire). 기본 허리 15°·정면 시선·수평 총구와 연속 발 회수, 작은 골반 흔들림을 연결했다. 수동 허리 숙임은 추가량이며 현재 총 높이를 재사용한다. 추가 검사 없이 `untested`·사용자 검수 대기다.

현재 사격 폼은 [015 적용 기록](../../../../../docs/firing-form-application-001.md)을 따른다. 발·무릎·골반의 준비 자세와 흉곽·어깨 축, 작은 머리 보정, 양팔 기준 포즈를 연결했다. 014 닫힌 손·무릎 접지·달리기·총구 빛과 현재 카메라 작업을 유지한다. 사용자 지시로 추가 검증은 실행하지 않았다.

[레시피](records/firing_form_015.json) · [인계](records/development_handoff_015.json) · [사격](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=fire) · [뛰며쏴](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=run_fire)

## 이전 기록

**수직 시점 001:** [구현·한계](../../../../../docs/camera-pitch-001.md) · [레시피](records/camera_pitch_001/recipe.json) · [인계](records/camera_pitch_001/handoff.json) · [12° 페이지](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=idle&viewPitch=12). 기본을 살짝 내려다보는 12°로 바꾸고 0~20° 조절·정측면 비교를 연결했다. 기존 파츠의 깊이 배치/정사영이며 새 윗면 원화나 3D 모델은 없다. 추가 테스트·구문/문서/목록 검사·브라우저 검수 없이 `untested`·사용자 검수 대기다.

**달리기 보정 running_mechanics_001:** [변경 내용](../../../../../docs/36-running-mechanics.md) · [레시피](records/running_mechanics_001.json) · [인계](records/development_handoff_running_mechanics_001.json) · [달리기](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=run) · [뛰며쏴](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=run_fire). 접지와 골반 상하 타이밍, 긴 보폭, 뒤꿈치/무릎 회수와 걷기↔달리기 접지를 수정했다. 현재 앉기·손·천 변경은 유지하며 추가 검사 없이 `untested`·사용자 검수 대기다.

**앉아쏴 사진 보정 001:** [사진 분석·변경](../../../../../docs/kneeling-reference-pose-001.md) · [레시피](records/kneeling_reference_001/recipe.json) · [인계](records/kneeling_reference_001/handoff.json) · [앉아쏴 페이지](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=kneel_fire). 뒷무릎과 발의 지지에서 골반 높이를 계산하고 앉아쏴 반동·첫 발 시점을 보정했다. 기존 파츠·현재 받침 손을 재사용한다. 추가 테스트·문서/목록 검사·브라우저 캡처 없이 `untested`·사용자 검수 대기다.

현재는 [총열 파지 손 014](../../../../../docs/35-closed-handguard-grip.md)를 개발 연결했다. [새 손](../rig_014/README.md)은 네 손가락으로 핸드가드를 감싸고 엄지는 보이지 않는다. 지지 접점을 핸드가드 축으로 옮겼다. 사용자 지시로 추가 검증은 실행하지 않았으며 검수 대기다.

[레시피](records/closed_grip_014.json) · [인계 기록](records/development_handoff_014.json) · [캐릭터 페이지](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=idle)

## 이전 013 기록

현재는 [뛰며쏴 013](../../../../../docs/34-running-fire-without-eye-aim.md)을 개발 연결했다. 달릴 때 총을 가슴 쪽으로 낮추고 눈을 조준선에 붙이는 자세를 해제한다. 기존 파츠·달리기·총구 빛을 재사용하며 사용자 지시로 추가 검증은 실행하지 않았다.

[레시피](records/running_point_fire_013.json) · [인계 기록](records/development_handoff_013.json) · [뛰며쏴 페이지](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=run_fire)

## 이전 012 기록

현재는 [총구 조명 012](../../../../../docs/33-muzzle-light-on-character.md)를 개발 연결했다. 발사 순간 현재 총구에서 가까운 피부·장갑·갑옷·총에 따뜻한 빛을 더하며 011의 의상 관절과 전투 자세를 이어 쓴다. 같은 페이지에서 ‘캐릭터에 총구 빛’과 ‘빛 세기’를 조절한다. 사용자 지시로 추가 검증은 실행하지 않았다.

[레시피](records/muzzle_light_012.json) · [개발 인계](records/development_handoff_012.json) · [사격 페이지](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=fire) · [효과 프로필](../../../../fx/muzzle_flash/lighting_001/README.md)

## 이전 011 기록

현재는 [몸통 관절과 전투 자세 011](../../../../../docs/32-body-articulation-and-combat-poses.md)을 개발 연결했다. 몸통·바스트/흉갑·허리 연결부·스커트를 따로 움직이며 허리 숙임과 흉갑 각도를 조절한다. 견착 대기·앉아쏴·뛰며쏴와 [총열 아래 받침 손](../rig_011/README.md)을 적용했다. 사용자가 검증을 맡기로 했으므로 추가 검증은 실행하지 않았다.

[개발 레시피](records/articulation_combat_011.json) · [인계 기록](records/development_handoff_011.json) · [견착 대기](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=idle) · [앉아쏴](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=kneel_fire) · [뛰며쏴](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=run_fire)

## 이전 010 기록

현재는 [허리축과 새 파츠 010](../../../../../docs/31-waist-axis-and-new-parts.md)을 개발 연결한 상태다. 흉갑–연결 천–스커트를 나누고 실제 허리축을 추가했으며 [새 원화](../rig_010/README.md)의 총열 받침 손 v2·측면 어깨·장전 전완을 사용한다. 사용자 검수 대기이며 최신 지시에 따라 추가 검증은 실행하지 않는다.

[개발 레시피](records/waist_parts_010.json) · [인계 기록](records/development_handoff_010.json) · [사격 페이지](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=fire)

## 이전 09 기록

현재는 [골반 연결·발사 전 자세·장전 가림 09](../../../../../docs/30-body-mechanics-and-reload-views.md)를 검토한다. 작은 목 조정과 상체 기울임을 먼저 적용한 뒤 첫 발이 나간다. 골반/허벅지의 공통 접점, 어깨 높이까지 고정한 머리카락, 보행 하중, 첫 반동의 뒷발 반응과 탄창 각도도 보정했다. 장전 왼팔은 몸통 뒤에 가려진다.

[현재 레시피](records/body_mechanics_009.json) · [25개 수치 검사](tests/body_mechanics_009/simulation-metrics.json) · [실제 사격 입력](reviews/body_mechanics_009/standing_inputs/browser.json) · [장전·보조 모션](reviews/body_mechanics_009/secondary/browser.json). 어깨판과 장전 팔의 시점 전환 그림, 손 3종은 미제작이며 기존 그림의 원근 한계가 남아 있다.

## 이전 08 기록

현재는 [어깨 견착 높이 08](../../../../../docs/29-secondary-motion-and-firing-stance.md)을 검토한다. 사용자 첨부 자세 그림을 참고해 얼굴을 가리던 총과 개머리판 접점을 낮췄으며, 기존 고개 숙임·웅크리는 사격 자세는 유지한다. [현재 레시피](records/shoulder_height_008.json) · [현재 수치 검사](tests/shoulder_height_008/simulation-metrics.json) · [사격 입력](reviews/shoulder_height_008/standing_inputs/browser.json) · [이동/장전](reviews/shoulder_height_008/secondary/browser.json).

## 이전 06/07 기록

현재는 [머리카락·의상·팔·장전 손과 사격 자세 06/07](../../../../../docs/29-secondary-motion-and-firing-stance.md)을 검토한다. [사격 미리보기](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=fire)에서 고개와 몸을 낮춰 총에 기대는 자세를, 이동에서 머리카락과 옷자락을 확인한다. 팔꿈치의 소매 연결과 전완 가림, 장전 손목·탄창 접점도 보정했다.

- [현재 레시피](records/secondary_and_fire_007.json) · [22개 수치 검사](tests/standing_fire_007/simulation-metrics.json) · [브라우저 검사](reviews/standing_fire_007/browser.json).
- 장전용 놓기·탄창 파지·조작부 손 그림 3종은 아직 없고 기존 받침 손을 임시 사용한다. 손 모양 교체와 추가 그림의 사양은 29번에 기록했다.
- 흉갑·어깨 판·전완 장갑을 보호하며 기존 원본 그림을 재사용한다. 플랜 B·이미지 원본·GIF는 변경하지 않았다. 전체 아트 채택은 사용자 검토가 남아 있다.

## 이전 05 기록

[구현·검증·한계](../../../../../docs/28-combat-walk-and-cape.md) · [이동 사격 미리보기](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=walk_fire)

골반을 낮추고 상체를 앞으로 기울이는 전투 보행과 지연되는 망토 모션이다. 플랜 B는 이번 변경 대상이 아니다. [rig_004 원본과 영어 JSON/MD 프롬프트](../rig_004/README.md)를 재사용하며 새 이미지를 생성하지 않았다.

- [리그 정의](rig/parts.json): 기존 원본 UV를 참조하고 머리의 회전 전달을 보정.
- [변경 레시피](records/recipe.json): 이전/현재 보행 값, 이미지 재사용과 도구 사용 범위.
- [시뮬레이션 수치](tests/simulation-metrics.json): 접지·견착·전투 자세·망토를 포함한 17개 검사.
- [브라우저 입력](reviews/browser-interactions.json): 재생·정지·연사·반전의 실제 화면 확인.
- [검토 기록](reviews/review.json): 캡처·코드 해시와 남은 한계.

현재는 한 장의 망토 그림을 길이가 고정된 여러 구간으로 변형한다. 크게 접혀 뒤집히는 별도 망토 그림은 아직 없다. 몸통·허리·하의는 기존 연결 의상 레이어를 유지한다. 시각적 최종 사용자 검수는 별도다.
