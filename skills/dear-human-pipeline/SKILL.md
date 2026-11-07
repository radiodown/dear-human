---
name: dear-human-pipeline
description: Run reusable catalog, cache, dependency and document checks for asset production in the Dear Human game workspace. Use for its character, motion, weapon, armor, FX and preview workflow; skip unrelated projects.
---

# Dear Human production pipeline

## 검증 범위

머리/몸통 연결 최신은 `docs/head-body-sync-001.md`다. 지속적인 숙임만 시선 역보정하고 순간 몸통 회전은 머리에 동기 전달한다. 별도의 흉곽 상하 바운스는 제거하며 호흡·접지·017 조준·carry_idle_001과 조절/저장은 유지한다. 공통 `headFrame`을 표시와 눈/머리카락에서 공유하고 새 결과는 tests/reviews의 `head_body_sync_001`로 분리한다. 필요한 짧은 동기화/접점/Chrome 범위만 확인하며 이전 검사·플랜 B/C·GIF는 변경하지 않는다.

달리기 총구·두 대기 최신은 `docs/carry-idle-001.md`다. 비사격 달리기는 아래 35°, 완전 대기 `relaxed`는 전경을 풀고 아래 58°로 총을 든다. `idle` 견착 대기와 사격은 전방 수평이다. 최신 사용자 지시가 이전 모든 자세 수평 규칙의 두 낮춘 자세를 대체한다. 준비량을 따라 총을 들고 기존 첫 발 조건을 유지한다. 완전 대기를 포함한 9개 동작은 같은 조절/별도 저장을 사용한다. 필요한 결과는 tests/reviews의 `carry_idle_001`에 분리하고 기존 기록·플랜 B/C·GIF는 변경하지 않는다.

동작별 공통 조절 최신은 `docs/motion-controls-001.md`다. 동일 패널과 공통 `setMotionControls`로 8개 동작의 기본 허리각·추가 숙임·흉갑·수직 총 낮춤·동작 강도와 반응/조명을 개별 저장한다. 현재 동작/전체 초기화·일시정지·새/이전 주소 복원과 기존 기본 자세를 유지한다. 필요한 결과는 tests/reviews의 `motion_controls_001`로 분리하고 이전 기록을 갱신하지 않는다. 플랜 B/C·GIF나 전체 검사 묶음은 이번 범위가 아니다.

파츠 활동감 최신 보정은 `docs/dynamic-parts-motion-001.md`다. 공통 리그의 `setMotionEnergy(0~1.5)`, 같은 페이지 강도 0~150%(기본 100%), 일시정지 0/100 비교와 주소/브라우저 저장을 사용한다. 원본·접지·뼈 길이·수평 총구·017 앉아쏴를 유지하고 골반 상승은 양쪽 다리 도달 범위로 제한한다. 필요한 변경 JS 구문·짧은 수치/이전 소스 비교·Chrome 재생/UI 결과는 tests/reviews의 `dynamic_motion_001`에 분리했다. 전체 검사 묶음이나 문서/목록 검사는 실행하지 않았고 사용자 아트 검수는 대기다. 과거 버전의 `untested`를 소급 변경하지 않는다.

사용자 최신 검증 지시는 “이미지나 랜더링 피드백에 필요한건 검사는하되, 과도한 테스트는 하지말것”이다. 필요한 빌드·짧은 실행·시각 피드백은 수행하되 관련 없는 전체 검사나 반복 테스트는 자동 실행하지 않는다. 이전 버전의 미검수 기록은 그대로 보존한다.

## 정답 이미지 적용 앉아쏴 017 개발 인계

`docs/kneeling-image-application-017.md`와 `rig_005/records/kneeling_image_017`을 따른다. 전용 `kneeling-pose.js`와 rig_017의 기존 UV 부착물을 공통 rig_005에 연결했다. 접지 무릎은 골반 앞에 두고 무릎 장갑/정강이를 분리하며 스커트 패널은 허벅지를, 남는 망토는 바닥 경로를 따른다. 전용 상체/양팔·수평 총신과 눈 정렬은 사용자 채택 이미지를 기준으로 한다. 원본·014 손/M16·현재 달리기 총 전진·016 반응·플랜 B/C·GIF는 유지한다. 사용자 지시로 테스트·구문/문서/목록 검사·브라우저 검수를 실행하지 않으며 후속 출력은 tests/reviews의 kneeling_image_017로 분리한다. 현재는 untested·사용자 검수 대기이며 실제 3D/새 사선 원화·깊은 압축 주름 완성으로 보고하지 않는다.

## 호흡·상체·의상 반응 016 개발 인계

`docs/breathing-and-body-motion-016.md`와 `rig_005/records/breathing_016`을 따른다. 공통 리그의 호흡·허리 움직임과 매 발사 후 상체 복귀를 사용한다. ‘허리·옷자락’은 계산 상태를 유지하며 pose 출력만 즉시 가려 일시정지 중에도 비교한다. 원본·현재 사격 폼/접지/달리기·카메라·플랜 B/C·GIF는 변경하지 않았다. 변경 전 파일은 `runtime_snapshot_before_breathing_016`에 보존한다. 사용자 검증 인계 지시를 유지하므로 추가 테스트·구문/문서/목록 검사·브라우저 검수를 실행하지 않는다. 후속 결과는 `tests/breathing_016`, `reviews/breathing_016`을 사용하며 이번에는 도구의 기본 출력 경로를 수정하지 않았다. 현재 상태는 `untested`·사용자 검수 대기다.

## 수직 시점 camera_pitch_001 개발 인계

`docs/camera-pitch-001.md`를 따른다. 공통 파츠 카메라는 기본 12° 하향과 0~20° 조절, 정측면 비교 버튼을 제공한다. `viewPitch` URL 설정과 손·총·총구·바닥의 공통 깊이 투영을 사용한다. 기존 측면 PNG의 정사영 근사이며 3D 모델이나 윗면 원화 추가가 아니다. 이전 표시 소스는 `runtime_snapshot_before_camera_pitch_001`에 보존한다. 기존 사용자 검증 인계 지시가 유효하므로 추가 테스트·구문/문서/목록 검사·브라우저 검수를 실행하지 않는다. 상태는 `untested`·사용자 검수 대기이며 후속 검사를 요청받으면 `tests/camera_pitch_001`, `reviews/camera_pitch_001`로 출력한다.

## 현재 014 총열 파지 손 개발 인계

docs/35-closed-handguard-grip.md를 따른다. rig_014의 네 손가락으로 핸드가드를 감싸 쥔 손과 m16_binding_014의 중심 접점 (.63, .34)을 공통 rig_005에 연결했다. 엄지는 반대편에 가려진 그림이다. 013 소스는 runtime_snapshot_013에 보존했다. 사용자 검증 인계 지시는 계속 유효하므로 테스트·docs-check/catalog-check·브라우저 검수는 실행하지 않는다. 다음 출력은 tests/closed_grip_014, reviews/closed_grip_014이며 현재 상태는 untested·사용자 검수 대기다.

## 플랜 C 준비 검사

Three.js 후속 작업은 `docs/31-plan-c-threejs-readiness.md`와 `game/plan-c/README.md`를 읽는다. 독립 패키지는 `npm --prefix game/plan-c ci --ignore-scripts`, 기초 검사는 `npm --prefix game/plan-c run check`다. 저장하려면 `node tools/check_plan_c.mjs --output 새버전/tests/node.json`을 사용한다. Chrome 검사는 `tools/review_plan_c.py --output 새버전/reviews`이며 Python 의존성은 `tools/plan-c-requirements.txt`다. 이 두 스크립트는 명시한 경로에 쓰므로 읽기 전용 CLI와 구분한다. 기존 공통 미리보기를 사용하며 별도 사이트를 만들지 않는다. 단일 파츠 호환성·원본 배율 비교를 전체 캐릭터·축소 품질·모션·실제 3D 모델·아트 채택으로 표시하지 않는다. `preparation_001`의 첫 실패와 후속 통과 기록은 보존한다.

프로젝트 루트의 AGENTS.md와 docs/18-preview-library-and-reuse.md, tools/agent_pipeline.py를 먼저 확인한다. 이 프로젝트의 기존 자산·규약을 재사용하고 필요한 문서만 읽는다.

## 반복 검사와 조회

프로젝트 루트에서 다음 CLI를 사용한다. Python 표준 라이브러리만 필요하며 아래 명령은 읽기 전용이다.

```powershell
python tools/agent_pipeline.py --root . docs-check
python tools/agent_pipeline.py --root . catalog-list
python tools/agent_pipeline.py --root . catalog-check
python tools/agent_pipeline.py --root . reuse-find --kind character --entity-id clone_01 --recipe-key RECIPE_KEY
python tools/agent_pipeline.py --root . impact --kind character --entity-id clone_01 --revision-id REVISION_ID
```

RECIPE_KEY와 REVISION_ID는 실제 요청·등록 버전의 값으로 바꾼다. 계획 상태의 대상에 존재하지 않는 버전 ID를 만들어 넣지 않는다. --limit의 기본값은 20이며 전역 옵션은 하위 명령 앞에 둔다.

- 생성 전 목록과 재사용 후보를 조회한다. reuse-find는 passed 기록과 실제 파일·의존 파일 해시가 맞는 후보만 반환한다. 후보가 없다는 결과는 생성 성공이나 자동 생성 명령이 아니다.
- 리그·무기·외형 변경 시 impact로 기존 의존 버전을 확인한다. 이 결과는 재검토 범위이며 파일을 수정하거나 재생성하지 않는다.
- JSON의 status와 issues를 확인하고 완료·미제작·실패를 구분한다. 실제 작품 품질은 시각·플레이 검수로 별도 판단한다.

## 실제 제작 작업

작업에 필요한 규약을 선택해서 읽는다: 파츠/무기는 docs/16-modular-character-and-weapons.md, 갑옷은 docs/17-modular-armor-appearance.md, 미리보기는 docs/18-preview-library-and-reuse.md, 전투 피드백은 docs/19-combat-feel-and-damage.md, 도구 계약은 docs/20-agent-automation.md.

2dimg2motion·PixelFX·이미지 생성·리깅·브라우저·배포는 실제 이용 가능한 도구와 사용 조건을 확인해 수행한다. 현재 CLI에 없는 register/render/generate 명령이나 MCP 연결을 추측해 실행하지 않는다.

새 에셋은 변경된 부분만 제작하고 레시피·입력·산출물·의존 버전·실제 비용/시간을 기록한다. 기존 채택 파일을 덮어쓰지 않는다. 실패 원인이 바뀌지 않은 무한 재시도를 피하고 현재 작업의 요청 범위·예산을 따른다.

첫 실제 시각 에셋부터 공통 샘플 사이트를 구축·갱신하고 실제 게임 재생 코드를 공유한다. 아직 원화만 있다면 원화 보기와 미지원 모션을 구분한다. 문서·메타데이터 변경만 있는 작업에 가짜 시각 에셋이나 빈 사이트를 만들지 않는다.

작업 후 관련 검사와 미리보기 확인 결과를 짧게 보고한다. 도구의 passed는 기록·구조 검수이며 사용자의 아트 선택을 대신하는 표시가 아니다.

## 현재 모션 시험

현재 공통 재생은 rig_005이며 docs/28-combat-walk-and-cape.md와 docs/29-secondary-motion-and-firing-stance.md, docs/30-body-mechanics-and-reload-views.md를 따른다. npm --prefix game run check로 구문을, npm --prefix game test로 IK·고정 스텝·반동·장전·100회 무기 교체·견착 접점·전투 자세·망토·머리카락·옷자락·고개·손과 탄창 접점을 검사한다. test는 art/characters/clone_01/motion/rig_005/tests/body_mechanics_009/simulation-metrics.json에 25개 시뮬레이션 검사 결과를 기록하므로 읽기 전용 CLI와 구분한다. 이전 tests/simulation-metrics.json과 tests/secondary_006, tests/standing_fire_007, tests/shoulder_height_008은 보존한다. 모델 호출·이미지 생성은 하지 않는다.

브라우저 검사는 Python Playwright와 로컬 Chrome으로 tools/review_parts_motion.py --scope standing-fire를 실행한다. 같은 캐릭터 페이지의 UI를 사용하며 캡처·보고서는 rig_005/reviews/body_mechanics_009/standing_inputs에 저장한다. 보조 모션은 --scope secondary --output art/characters/clone_01/motion/rig_005/reviews/body_mechanics_009/secondary를 사용해 이전 06~08 기록을 덮어쓰지 않는다. 해시 경로만 이동하면 리그 상태가 남으므로 정지 캡처마다 새 문서에서 시점을 재구성한다. 장전 손 3종은 미제작이며 접점 통과와 손가락 그림 완성을 구분한다.

기존 검사 결과가 현재 코드 해시와 다르면 새 버전을 검사하고 목록 해시도 갱신한다. 사용자 반려 버전 rig_002의 코드 스냅샷·검사 기록을 보존하며 새 결과로 소급 갱신하지 않는다. 손 도달 검사만으로 견착이나 가림이 맞았다고 판단하지 않는다. 브라우저 정지 캡처와 실제 입력·전체 애니메이션 검수, 수치 통과와 사용자 채택, 자체 리그 시험과 Spine 시험을 구분한다.

09는 발사 입력에 requestFire/trigger를 사용해 약 .12초의 사격 준비 뒤 첫 발을 발생시킨다. fire는 준비된 이벤트를 발생시키는 내부 경로다. 골반·의상·허벅지의 공통 접점, 장전 왼팔/손/운반 탄창의 몸통 뒤 가림과 앞발 접지·뒷발 반응을 검사한다. 어깨·전완의 시점 전환 원화와 손 3종은 미제작이며 수치 통과를 그림 완성으로 해석하지 않는다.

## 사용자 지시 · 010 개발 인계 기록

사용자가 “검증은 내가할게 개발만해봐”라고 지시했다. 이 지시가 바뀌기 전에는 개발·파일 저장·목록 갱신만 진행하고 추가 테스트, docs-check/catalog-check, 브라우저 캡처를 자동 실행하지 않는다. 현재는 docs/31-waist-axis-and-new-parts.md의 허리축과 새 손·측면 어깨·장전 전완을 개발 연결했으며 verification은 untested다. 검사 도구의 다음 출력 경로는 rig_005/tests/waist_and_parts_010와 reviews/waist_and_parts_010이지만 실행 승인을 받은 것으로 해석하지 않는다. 최신 원화·정확한 생성 프롬프트는 art/characters/clone_01/motion/rig_010 아래에 있다. 탄창 파지 손 생성은 이미지 도구가 거부해 미제작이다.

## 011 개발 인계 기록

현재 파츠 재생은 docs/32-body-articulation-and-combat-poses.md의 네 의상 메시(몸통·바스트/흉갑·허리·스커트), 숙임 조절, 견착 대기·앉아쏴·달리기 사격과 rig_011의 총열 하단 받침 손을 사용한다. 무기 바인딩은 m16_binding_011이다. 사용자 검증 인계 지시는 계속 유효하므로 테스트·docs-check/catalog-check·브라우저 캡처를 실행하지 않는다. 기존 검사 도구의 다음 출력 경로만 tests/articulation_combat_011, reviews/articulation_combat_011로 옮겼으며 실행 결과는 없다. 변경 전 010 코드·정의·도구 소스는 runtime_snapshot_010에 보존한다. 등록은 untested·awaiting_user_review로 유지하고 큰 숙임·무릎 접지·달리기·손/총열 가림을 검수 완료로 보고하지 않는다.

## 012 총구 조명 개발 인계 기록

docs/33-muzzle-light-on-character.md의 셰이더 조명과 art/fx/muzzle_flash/lighting_001 프로필을 사용한다. 조명은 실제 발사의 flash 타이머와 현재 muzzle 소켓을 따르며 피부·금속·천의 반응을 나눈다. 원본 알파/가림과 기존 011 리그를 재사용하며 원화·플랜 B/C·GIF를 다시 만들지 않는다. 011 코드는 runtime_snapshot_011에 보존한다. 사용자 지시로 테스트·docs-check/catalog-check·브라우저 캡처는 실행하지 않는다. 다음 출력 경로만 tests/muzzle_light_012와 reviews/muzzle_light_012로 변경했고 새 검사 결과는 없다. 현재 조명은 실제 노멀맵이나 3D 투영 그림자가 없는 2D 표면 근사이며 시각·기기 성능 검수는 대기다.

## 현재 013 뛰며쏴 개발 인계

docs/34-running-fire-without-eye-aim.md를 따른다. 뛰며쏴는 눈 조준을 해제하고 총을 낮춘다. fire 준비량 aimAmount와 eyeAim을 분리하고 총 받침 전환 뒤 첫 발을 허용한다. 012 총구 빛·기존 파츠·달리기를 재사용하며 새 이미지·GIF는 생성하지 않는다. 변경 전 012는 runtime_snapshot_012에 보존하고 검사 도구의 다음 출력만 tests/running_point_fire_013, reviews/running_point_fire_013으로 옮겼다. 사용자 지시로 테스트·docs-check/catalog-check·브라우저 검수는 실행하지 않는다. 현재는 untested·사용자 검수 대기다.

## 달리기 보정 running_mechanics_001

`docs/36-running-mechanics.md`와 `rig_005/records/running_mechanics_001.json`을 따른다. 접지와 골반 타이밍, 긴 보폭·뒤꿈치/무릎 회수, 고정 스텝의 `RunFootContacts`를 같은 페이지에서 사용한다. 기존 앉기·손·천 및 총 낮춤은 유지한다. 변경 전 두 소스는 `runtime_snapshot_before_running_mechanics_001`이다. 사용자 검증 인계 지시로 테스트·구문/문서/목록 검사·브라우저 캡처를 실행하지 않았다. 상태는 `untested`이며 후속 결과 경로는 tests/reviews의 `running_mechanics_001`로 분리한다. 이번에는 검사 도구 기본 출력 경로를 바꾸지 않았으므로 기존 기본 실행을 새 보정의 검증으로 보고하지 않는다.

## 사격 폼 적용 015 개발 인계

docs/firing-form-application-001.md와 game/animation/firing-form.js를 따른다. 새 이미지를 생성하지 않고 rig_015의 흉곽–허리 연결 메시와 양팔 기준 포즈를 연결했다. 014 손·현재 무릎 접지/달리기 접촉/카메라 작업은 보존한다. 뛰며쏴 시선과 carryDrop(0~18, 기본 6)은 별도 조건이다. 사용자 검증 인계 지시를 유지하므로 테스트·docs-check/catalog-check·브라우저 검수는 실행하지 않는다. 변경 전 소스는 runtime_snapshot_before_firing_form_001에 보존하며 다음 검사 출력은 tests/firing_form_015, reviews/firing_form_015다. 현재 좌표 연결과 사용자 아트 검수를 구분한다.

## 달리기 미세 보정 running_mechanics_002

최신 달리기는 `docs/running-mechanics-002.md`와 `rig_005/records/running_mechanics_002.json`을 따른다. 허리 기본 15°·정면 시선·수평 총구, 5차 수평 회수와 단일 수직 회수 곡선을 사용한다. 수동 bend는 추가량이며 총 높이·다른 현재 파츠/자세는 재사용한다. 001의 레시피와 스냅샷을 소급 수정하지 않는다. 변경 전 소스는 `runtime_snapshot_before_running_mechanics_002`다. 사용자 지시로 테스트·구문/문서/목록 검사·브라우저 검수를 실행하지 않았으며 untested·사용자 검수 대기다. 후속 출력은 tests/reviews의 `running_mechanics_002`로 분리하고 기존 도구의 기본 출력 경로를 새 버전 검증으로 혼동하지 않는다.

## 뛰며쏴 총 전진 running_weapon_forward_001

`docs/running-weapon-forward-001.md`와 rig_005의 해당 레시피/인계를 따른다. 숙임·골반 낮춤에 따른 작은 수평 전진을 양팔 도달 범위로 제한하고 소켓 계산 전에 무기 프레임에 적용한다. 현재 달리기·총 높이·호흡/반동/천 변경은 유지한다. 변경 전 소스와 과거 기록을 보존하며 사용자 지시로 테스트·구문/문서/목록 검사·브라우저 검수를 실행하지 않았다. untested·사용자 검수 대기이며 후속 출력은 tests/reviews의 `running_weapon_forward_001`로 분리한다. 검사 도구 기본 경로는 변경하지 않았다.

## 사격 허리각 조절 fire_waist_controls_001

`docs/fire-waist-controls-001.md`와 해당 rig_005 레시피/인계를 따른다. 서서쏴/뛰며쏴 기본 허리각 조절은 공통 리그의 setFireWaist와 실제 준비량을 사용하며 기존 공통 추가 숙임과 구분한다. 브라우저 저장값·주소 복원·개별/전체 초기화를 연결했다. 사용자 지시로 테스트·구문/문서/목록 검사·브라우저 검수는 실행하지 않았다. 이전 소스와 기록을 보존하며 후속 출력은 tests/reviews의 `fire_waist_controls_001`로 분리한다. 검사 도구 기본 경로는 바꾸지 않았다.

## 앉아쏴 총 높이 kneeling_weapon_level_001

`docs/kneeling-weapon-level-001.md`와 해당 rig_005 레시피/인계를 따른다. 총 낮춤 0~18(기본 0)은 월드 수직 이동이며 총구 각도와 구분한다. 총 프레임에서 손/탄창/총구가 함께 이동하고 기존 머리 보정 한도를 유지한다. 낮춘 총의 지지점 일치를 아이레벨·어깨 견착 검증으로 보고하지 않는다. 사용자 지시로 테스트·구문/문서/목록 검사·브라우저 검수를 실행하지 않았고 untested·사용자 검수 대기다. 이전 소스와 기록을 보존하며 후속 출력은 tests/reviews의 `kneeling_weapon_level_001`로 분리한다. 검사 도구 기본 경로는 변경하지 않았다.

## 공통 전방 총구 forward_muzzle_001

`docs/forward-muzzle-001.md`와 해당 rig_005 레시피/인계를 따른다. 모든 자세의 기본 총구 방향은 전방 수평이며 허리각/자세 전환에서 총신을 숙이지 않는다. 반동과 장전 조작은 기존대로 별도 가산한다. 높이·전진·접점은 공통 무기 프레임에서 계산한다. 사용자 지시로 추가 테스트·구문/문서/목록 검사·브라우저 검수를 실행하지 않았고 untested·사용자 검수 대기다. 변경 전 소스와 과거 기록을 보존하며 후속 결과는 tests/reviews의 `forward_muzzle_001`로 분리한다. 검사 도구 기본 경로는 바꾸지 않았다.
