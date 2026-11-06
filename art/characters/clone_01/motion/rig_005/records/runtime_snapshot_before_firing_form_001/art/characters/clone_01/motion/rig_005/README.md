# clone_01 · 파츠 모션 rig_005

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
