# 04. 웹 구현 설계

[문서 목록](../README.md) · 설계안이며 현재 게임 코드·실행 결과는 없다.

런타임의 Player·CharacterView와 `player.*` 상태는 전투에서 조작하는 배속 클론을 가리킨다. 인간 지휘관은 [15](15-worldbuilding.md)의 서사적 플레이어다. 초기 구현에 지휘관의 별도 조작 개체나 원격 신체 조종 시스템을 추가하지 않는다.

## 1. 기술 선택

실행 대상은 **데스크톱 웹 브라우저**다. Phaser 4.2.1 + TypeScript + Vite를 기본안으로 사용하고 WebGL 렌더러를 요구한다. npm 의존성과 제작 도구 커밋을 고정한다. 상세 비교와 공식 근거는 [12 도구 조사](12-web-tools-research.md)에 정리한다.

2dimg2motion·PixelFX·Python은 에셋 제작 때 사용한다. 브라우저에서는 번들 JavaScript·이미지·리그·정의 데이터를 실행·로드한다. 기본안에 별도 서버·로그인·데이터베이스는 필요 없다. 개발은 로컬 서버, 전달은 정적 웹 빌드로 한다.

## 2. 장면과 구성

```text
Phaser.Game
├─ BootScene                 # 에셋·메타데이터 로드와 검증
├─ SampleLibraryShell        # 고정 대상 경로·모션·버전·장비 선택
├─ MotionLabScene            # 샘플 페이지의 공통 모션 재생·검증
├─ StageScene                # 실제 1스테이지
│  ├─ Background / WorldBounds
│  ├─ PlayerBody             # 이동·피격용 몸체
│  ├─ PlayerView             # 공통 파츠 리그·양팔 IK·보조 모션
│  │  ├─ WeaponView          # 외부 무기 자산·손잡이·총구
│  │  └─ AppearanceViews     # 부위별 전투복·갑옷 외형
│  ├─ EnemyBodies / EnemyViews
│  ├─ GroundStains           # 캐릭터 뒤의 잔흔
│  ├─ WorldEffects           # 분사·액적·탄도·명중
│  └─ Camera
└─ UIScene                   # HUD·비활성 슬롯·대화·스킵·일시정지·결과
```

적마다 Phaser Scene을 하나씩 만들지 않는다. StageScene 안에서 적 개체·뷰를 관리한다. PlayerBody와 PlayerView는 같은 개체를 나타내지만 몸체의 판정과 표시의 변형은 분리한다.

## 3. 책임

| 모듈 | 책임 |
|---|---|
| AssetRegistry | 대상·버전·산출물·의존성 목록과 선택 에셋 캐시 |
| SampleLibraryRouter | 대상별 고정 경로·모션·장비·비교 설정 |
| SessionController | 게임 상태·시간·결과·재시작 |
| StoryRegistry / StoryRunner | 장면 데이터 검증·진행·스킵·완료 요청 |
| DialogueOverlay / CutscenePlayer | 화자·본문·스킵 UI, 공통 리그·카메라 연출과 취소 |
| InputRouter | 전투·스토리·메뉴 입력 우선순위, 입력 소비·눌림 초기화 |
| SimulationLoop | 고정 틱·단일 시간 기준·처리 순서 |
| PlayerController | 입력·수평 이동·바라보는 방향 |
| WeaponController | 발사 간격·탄수 소비·히트스캔·shot_id·장전 요청/사격 차단 |
| ReloadController / ReloadPoseDriver | 인스턴스별 장전 프로필·시간·완료 1회, 상체·손 목표·탄창 표시 |
| CharacterView / RigAdapter | 공통 파츠·기본 동작·IK·draw order·좌우 반전 |
| WeaponMountController | 외부 무기·장착점·두 손잡이 목표·무기군 자세 |
| AppearanceResolver | 부위별 외형·호환 리그·가림·draw order·재질 모션·fit 보정 |
| EnemyFrameAnimator | 초기 적의 프레임·이동 루프 |
| SecondaryMotionController | 총 반동·고개·머리카락·바스트의 감쇠 |
| SocketResolver | 최종 표시 자세에서 총구 월드 좌표 계산 |
| CombatResolver | 산포·교차·영역·치명타·최종 피해·사망 원인 |
| ExplosionResolver | 범위·거리 감쇠·가림·대상 중복 제거 |
| FeedbackDirector / DamageNumberPool | 결과별 숫자·소리·재질·카메라·사망 프로필 |
| HealthComponent | HP·무적·damage_id·중복 사망 방지 |
| SwarmMeleeController | 초기 군집생물 근접 적의 접근·공격 |
| EnemyCatalog / EnemyFactory | 종류 ID→정의·개체·뷰 생성 연결 |
| StageDirector | 트리거·배치·스폰 대기·경계·출구 |
| FxManager / FluidFxSystem | 화염·분사·입자·잔흔과 풀 |

같은 CharacterView·무기·피격 처리 코드를 Motion Lab과 스테이지에서 재사용한다. 샘플 홈과 캐릭터·무기별 페이지는 같은 웹 앱의 경로·데이터로 구성하고 공통 재생기를 사용한다. 에셋마다 사이트나 Phaser 런타임을 복제하지 않는다. 첫 실제 에셋 제작 시 이 셸을 구축한다. [18 통합 샘플](18-preview-library-and-reuse.md)을 따른다. 실험 전용으로 보기 좋은 가짜 모션을 만들어 실제 플레이 경로와 분리하지 않는다.

AssetRegistry는 asset_index.json을 읽고 선택한 대상·버전의 실제 산출물만 지연 로드한다. 미제작 항목에 가짜 움직임을 넣지 않으며 이미지 참고·프레임 참고·실제 리그 지원을 구분한다. 방문이나 페이지 변경이 모델 호출·에셋 재생성을 시작하지 않도록 한다.

스토리는 별도의 StoryRegistry로 텍스트·연출 큐·완료 결과를 관리한다. StoryRunner는 정상 종료와 스킵 모두 SessionController의 단일 완료 경로를 사용하고 `(run_id, scene_id)`별 한 번만 진행 플래그·다음 상태를 반영한다. 연출 콜백에 스폰·보상·클리어를 넣지 않는다. 큐·타이머·카메라 제어를 취소 가능하게 묶고 이전 실행의 콜백과 입력을 버린다. 데이터·상태·실패 처리는 [21](21-story-and-skipping.md)을 따른다.

## 4. 시간과 물리

거리·시간은 논리 px·초다. Phaser API가 ms를 요구하는 경계에서만 변환한다. 게임 판정 60Hz, 자체 보조 스프링 적분 120Hz를 기준으로 삼고 화면은 브라우저 렌더 주기를 따른다. Spine 경로는 사용 버전의 물리 평가 주기를 기록하고 같은 목표 반응으로 조정한다.

단일 평면 이동과 사각형 충돌에는 Arcade Physics를 사용한다. 공식 설명상 가벼운 사각형·원형 충돌용이므로 전투 이동에 적합하다. 머리·바스트 변형을 Arcade 강체로 만들지는 않는다. [Arcade Physics](https://docs.phaser.io/phaser/concepts/physics/arcade).

고정 틱을 소유하는 어댑터 한 곳에서 Arcade step과 게임 시간을 진행한다. 직접 step을 호출하면 엔진의 자동 step을 중복 실행하지 않도록 선택한 버전에서 확인한다. 렌더 delta가 길면 틱 누적과 최대 처리 횟수를 제한한다. 탭 복귀 때 경과 시간을 모두 따라잡지 않는다.

일시정지·탭 숨김은 판정·연사·스폰·스프링·이펙트 수명·통계를 함께 멈춘다. 복귀 때 누적 delta와 눌림 입력을 비우고 사용자가 재개하게 한다. Page Visibility 상태를 활용한다. [브라우저 가시성 API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API).

STORY 상태는 전투 시계를 멈추고 별도 연출 시계로 텍스트·카메라·리그 포즈를 진행한다. PAUSED/탭 숨김에서는 연출 시계도 정지한다. 스토리 종료 때 전투 시계를 따라잡지 않으며 전투 카메라·저장된 행동의 자세/장전 위상·입력 문맥을 복원한다.

## 5. 상태와 보조 모션

플레이어 생존은 ALIVE/DEAD, 기본 동작은 idle/walk/fire_stand/fire_move로 구분한다. 사망이 우선한다. 연사마다 기본 프레임을 0으로 되돌리지 않으며, 이동 사격 전환 시 보행 위상을 이어받는다.

무기 행동 READY/RELOADING/DISABLED를 하체 동작과 분리한다. 일반/빈 장전은 공통 보행 위에 상체·손 목표·분리 탄창을 합성한다. 탄약과 장전 완료는 고정 틱이 소유하고 모션 이벤트는 표현만 처리한다. PLAYING 이외에는 장전 시간도 진행하지 않는다. 프로필·취소·STORY 포즈 복구는 [22](22-weapon-reloading.md)을 따른다.

총·어깨 반동은 실제 발사 한 번에 한 번 적용한다. 머리·머리카락·바스트는 별도 상태로 조금 늦게 반응하고 감쇠한다. 자세의 기본 가중치와 런타임 변형을 합성한다. [13 보조 모션](13-secondary-motion.md)을 구현 기준으로 삼는다.

플레이어 기본안은 분리 파츠 리그와 독립 무기다. Spine Professional + 공식 Phaser 런타임을 권장하고, 자체 TypeScript 구현도 같은 뼈대·손잡이·소켓 계약을 따른다. 무기 포함 전신 프레임을 플레이어 런타임 기본안으로 쓰지 않는다. 적만 일반 프레임 방식을 유지할 수 있다. [16 파츠·무기 규약](16-modular-character-and-weapons.md)을 따른다.

## 6. 고정 틱 처리 순서

1. PLAYING·생존 여부와 무적 시간을 갱신하고 입력을 읽는다.
2. 장전 요청·기존 장전 시간/완료를 처리한 뒤 장전 이동 배율을 반영해 이동·방향·물리 몸체·지면·경계를 갱신한다.
3. 공통 하체·몸통→장비 fit→현재 무기군 파지 또는 장전 자세·장착점 순서로 평가한다. 장전 상태·탄수·발사 대기시간을 검사하고 유효한 발사만 탄수 1발을 소비한다.
4. 발사가 있으면 무기 반동을 한 번 넣는다. 사격 시 두 손잡이, 장전 시 위상별 손 목표·탄창/조작부를 평가하고 양팔 IK→머리·바스트 보조 모션→최종 변환 순서로 처리한다.
5. 최종 총구와 기본 방향을 저장하고 명중도·현재 bloom의 산포→실제 교차→피격 영역→치명타→피해 순으로 처리한다.
6. 적의 접근·공격, 피해·사망 이벤트, 생존 수를 처리한다.
7. HP 0 실패를 우선해 구역 완료·스폰·출구·결과를 처리한다.
8. 이벤트로 FX·HUD를 갱신한다. 렌더 보간은 판정 결과를 다시 바꾸지 않는다.

총구와 손잡이는 무기 자체 좌표에서 장착·반동·좌우·월드 변환으로 계산한다. 가슴/의복 파츠는 장착점·어깨의 부모가 아니다. 갑옷은 부위별 외형으로 연결하고 rigid 판에는 가슴 변형을 전달하지 않는다. 장비의 fit·가림·모션 설정은 기본 캐릭터 설정을 덮어쓰지 않고 장착 상태에서 합성한다. [17](17-modular-armor-appearance.md)을 따른다. 리그·파츠 계약은 [16](16-modular-character-and-weapons.md)에 정의한다.

발사에 쓴 소켓·화염의 시작점·디버그 발사선은 같은 자세를 사용한다. 렌더 보간으로 차이가 생기면 해당 발의 소켓을 저장해 맞춘다.

## 7. 히트스캔과 근접 겹침

사거리 560px의 기본 좌우 조준축에 명중도 산포를 적용하고 실제 선분과 살아 있는 적 Hurtbox·World의 교차에서 가장 가까운 결과 하나를 선택한다. core·weakspot은 그 대상 안의 사선 구간으로 평가한다. 단일 지면에서도 선분-AABB 검사는 기울어진 사선을 처리한다. 관통·물리 탄환은 없다. 정확한 순서와 수치는 [19](19-combat-feel-and-damage.md)을 따른다.

총구가 가까운 적 안이나 적 너머로 들어간 경우를 위해 몸통 중심→총구의 짧은 선분도 검사한다. 총구 지점 겹침도 확인하고, 이미 사망한 적은 제외한다. 동률은 거리와 고정 enemy_id로 정한다. 시각 트레이서는 최종 교차점에서 끝난다.

Arcade 충돌 그룹은 World/PlayerBody/EnemyBody로 관리하고, 사격 대상 Hurtbox 목록과 트리거는 별도로 둔다. 적끼리와 적-플레이어 사이의 밀어내기는 사용하지 않고, 근접 거리는 공격 규칙으로 처리한다.

## 8. 이벤트 계약

| 이벤트 | 최소 값 | 소비자 |
|---|---|---|
| shot_fired | shot_id·weapon_id·시간·origin·실제 direction/end_point·명중도/bloom/시드·효과 | 반동 기록·화염·실제 탄도 |
| reload_started / reload_completed / reload_cancelled | run_id·weapon_instance_id·weapon_id·reload_id·프로필·시간·사유 | 장전 모션·HUD·취소 정리·검수 |
| ammo_changed | run_id·weapon_instance_id·weapon_id·shot_id 또는 reload_id·이전/이후 탄수·예비탄 | 탄약 HUD·소비/보충 로그 |
| hit_confirmed | shot_id·대상/wall·position·normal·hit_quality | 명중 통계·벽 충돌·영역 기록 |
| damage_applied | damage_id·대상·final_damage/hp_loss·hit_quality·is_critical/critical_source·overkill·위치/방향·프로필·shot_id 또는 explosion_id | 혈액/진액·숫자·재질음·몸 반응 |
| health_changed | entity_id·previous_hp·hp | HUD |
| explosion_resolved | explosion_id·중심·반경·대상별 결과 | 폭발·거리 검증 |
| entity_died | entity_id·피해 원인·사망 프로필 | 집계·결과·일반/치명/폭발 사망 |
| arena_completed | arena_id | 경계·카메라 |

CombatResolver의 계산 결과를 FeedbackDirector가 사용하고 연출이 명중·치명타를 다시 굴리지 않는다. 산포·치명타·표현의 난수 스트림을 분리한다. final_damage는 숫자, hp_loss는 실제 체력 손실 집계에 사용한다.

생물성 피격 효과는 hp_loss가 양수인 damage_applied에서만 생성한다. 무적 등으로 피해가 거부되면 발행하지 않는다. hit_confirmed와 중복으로 진액을 생성하지 않는다. 사망·처치는 개체당 한 번이며, 죽은 개체는 즉시 쿼리 대상에서 제외한다.

## 9. 다른 적과 스킬

배치의 enemy_type_id를 EnemyCatalog에서 찾는다. 현재 등록은 swarm_creature_melee 하나다. 종류 ID와 개체 ID를 구분하고, 알 수 없는 ID는 시작 전 오류로 드러낸다. 모든 적이 같은 AI·피격 재질을 가진다고 가정하지 않는다.

피격 프로필은 인간·클론의 붉은 혈액, 군집생물 진액, 기계 파편처럼 정의로 선택할 수 있게 한다. 이번에는 human_blood와 swarm_ichor만 생물성 프로필로 제작한다. 스킬은 여전히 비활성 슬롯 UI·데이터만 제공한다.

## 10. 빌드와 브라우저 검증

Vite 개발 서버와 production build를 구분한다. 게임 파일은 game/ 아래에 구성하고 정적 빌드는 game/dist/로 출력한다. 빌드 후 로컬 preview 서버에서 확인한다. 파일을 더블클릭하는 file:// 실행을 전달 방식으로 쓰지 않는다.

Chrome·Edge를 우선, Firefox를 추가 대상으로 검증한다. 브라우저 이름·버전·GPU·WebGL 정보·DPR·캔버스 버퍼 크기를 기록한다. 기본 DPR 상한은 2로 시작해 불필요한 고해상도 버퍼를 제한한다. Canvas 폴백은 국소 메시와 동일 기능이라고 약속하지 않고 WebGL 요구를 안내한다.

후속 공개 배포는 별도 작업이다. 현재는 문서·에이전트 스킬·검사/조회 CLI 외에 정적 캐릭터 시안과 로컬 샘플 셸이 있다. 실제 상태는 [23](23-character-appearance-review.md)을 따른다. 게임 전투·리그·모션·렌더/생성/배포의 자동 연결은 아직 없다. 반복 자동화의 지원 범위는 [20](20-agent-automation.md)을 따른다.
