# 07. 데이터와 에셋 규약

[문서 목록](../README.md) · 웹 구현용 제안 초기값이다. 크기·모션 수치는 Motion Lab 측정으로 조정한다.

`player.*`와 캐릭터 작업 ID `clone_01`은 전투 조작 클론을 뜻한다. 인간 지휘관과 작중 공식 식별코드는 [15](15-worldbuilding.md)의 서사 영역이며 기존 작업 ID와 구분한다. 초기 적 ID는 `swarm_creature_melee`, 관측 분류는 `unknown_swarm`, 진액 프로필은 `swarm_ichor`로 통일한다. 아래 경로와 ID는 아직 제작하지 않은 산출물의 규약이다.

## 1. 공통 단위

시간은 초, 거리는 논리 화면의 px, 속도는 px/초, HP와 피해는 정수다. 화면 배율 2배와 월드 좌표를 혼동하지 않는다. 월드 원점은 왼쪽 위이고 +Y는 아래다.

캐릭터 루트는 발 위치다. 64px 표시 비교용 조립 원화는 예를 들어 128×128px·발 기준점 (64,104)로 둔다. 개별 파츠는 자체 크기·피벗·뼈대 부착 오프셋을 사용한다. 모든 파츠를 같은 전신 캔버스로 강제하지 않는다. 무기는 캐릭터와 별도 이미지 좌표·축척·소켓을 갖는다.

위 크기와 아래 스테이지 수치는 기존 64px 인물 비교 기준이다. 128px 인물 실험에서는 더 큰 원본 캔버스와 표시 배율을 명시한다. 최종 크기를 바꾸면 총구·충돌체·적 Hurtbox·지면·카메라를 함께 조정한다. CSS 표시 크기·DPR·캔버스 버퍼 크기는 월드 좌표와 별도로 기록한다. Phaser의 ms API와 연결할 때만 시간을 변환한다.

## 2. 초기 밸런스

| ID / 항목 | 값 | 비고 |
|---|---|---|
| `player.max_hp` | 100 | 자동 회복 없음 |
| `player.move_speed` | 120 | 즉시 시작·정지, 관성 없음 |
| `player.invulnerability_sec` | 0.75 | 피해 적용 뒤 전역 무적 |
| `player.fire_pose_recovery_sec` | 0.12 | 사격 입력 종료 뒤 표현 회복 |
| `m16.fire_interval_sec` | 0.10 | 초당 10발 목표 |
| `m16.damage` | 20 | 적 1개체에 1회 |
| `m16.range_px` | 560 | 최근접 충돌까지 |
| `m16.ammo.capacity / initial_rounds` | 30 / 30 | 탄창 용량·시작 탄수, 실제 발사마다 1발 |
| `m16.ammo.reserve_mode / initial_reserve` | unlimited / null | 예비탄만 무제한, 탄약 수급 후속 |
| `m16.reload.strategy` | detachable_magazine | 초기 지원은 분리 탄창 교체 |
| `m16.reload.tactical / empty duration_sec` | 2.2 / 2.8 | 일반/빈 탄창 장전 시간, 게임용 제안값 |
| `m16.reload.auto_on_empty / move_speed_multiplier` | true / 0.75 | 0발 발사 시도 시 자동 장전·이동 배율 |
| `m16.recoil_offset_px` | 1.5 | 64px 표시 기준 시작값 |
| `m16.recoil_duration_sec` | 0.06 | 매 발 강조 |
| `m16.accuracy.base / movement_penalty` | 0.90 / 0.15 | 산포용 명중도와 이동 페널티 |
| `m16.accuracy.bloom_per_shot / max` | 0.02 / 0.20 | 현재 bloom으로 발사 후 증가 |
| `m16.accuracy.bloom_recovery_per_sec / delay` | 0.40 / 0.15초 | 마지막 발 후 회복 |
| `m16.accuracy.max_spread_deg` | 10 | 반각=(1-명중도)×10도 |
| `m16.hit_quality.graze_multiplier` | 0.5 | 스침 피해 10 |
| `m16.critical.chance / multiplier` | 0.10 / 2.0 | 일반 명중 확률 판정, 약점 확정·중첩 없음 |
| `swarm_creature_melee.max_hp` | 60 | M16 일반 비치명 3발 |
| `swarm_creature_melee.move_speed` | 48 | 단일 평면 접근 |
| `swarm_creature_melee.attack_range_px` | 24 | 발점 간 X 거리 |
| `swarm_creature_melee.attack_interval_sec` | 1.0 | 개체별 공격 시도 주기 |
| `swarm_creature_melee.damage` | 10 | 플레이어 무적 적용 |
| `swarm_creature_melee.hit_push_px` | 4 | World 충돌 안에서 이동 |
| `swarm_creature_melee.death_cleanup_sec` | 1.2 | 사망 표현 최대 수명, 판정은 즉시 제외 |
| `stage.max_alive` | 20 | 초과 예약은 대기 |
| `stage.spawn_interval_sec` | 1.5 | 실제 생성 성공 기준 |
| `stage.batch_gap_sec` | 1.5 | 마지막 생성 뒤 다음 배치까지 |
| `stage.warning_sec` | 0.8 | 구역 시작 시 경고 |
| `stage.spawn_safe_distance_px` | 96 | 플레이어와 스폰점 거리 |
| `ui.skill_slot_count` | 4 | 전부 비활성 |

플레이어의 충돌체는 초기 폭 18px·높이 54px, 군집생물의 몸통 충돌체는 폭 30px·높이 44px, 사격 Hurtbox는 폭 30px·높이 48px에서 시작한다. 군집생물 그림 전체의 꼬리·발톱까지 Hurtbox를 늘리지 않는다. 플레이어 총구 높이 약 `y=260`에서 탄이 몸통을 지나도록 확인한다. 발점·그림 크기와 충돌 크기는 구분하며 디버그로 실제 접촉 거리를 확인한다.

## 3. 스테이지 데이터 예시

아래 JSON은 **프로젝트가 제안하는 자체 포맷**이다. Phaser나 외부 도구의 기본 스키마가 아니다. TypeScript 타입과 로드 시 데이터 검증으로 읽는다.

```json
{
  "schema_version": 1,
  "stage_id": "stage_01",
  "width_px": 3840,
  "ground_y": 300,
  "player_start": [96, 300],
  "exit_x": 3680,
  "max_alive": 20,
  "spawn_interval_sec": 1.5,
  "batch_gap_sec": 1.5,
  "warning_sec": 0.8,
  "spawn_safe_distance_px": 96,
  "arenas": [
    {
      "id": "arena_a",
      "bounds_x": [640, 1280],
      "trigger_x": 704,
      "spawn_x": {"left": 672, "right": 1248},
      "batches": [
        {"enemy_type_id": "swarm_creature_melee", "right": 4, "left": 0},
        {"enemy_type_id": "swarm_creature_melee", "right": 6, "left": 0}
      ]
    },
    {
      "id": "arena_b",
      "bounds_x": [1600, 2240],
      "trigger_x": 1664,
      "spawn_x": {"left": 1632, "right": 2208},
      "batches": [
        {"enemy_type_id": "swarm_creature_melee", "right": 4, "left": 2},
        {"enemy_type_id": "swarm_creature_melee", "right": 4, "left": 2},
        {"enemy_type_id": "swarm_creature_melee", "right": 4, "left": 2}
      ]
    },
    {
      "id": "arena_c",
      "bounds_x": [2560, 3200],
      "trigger_x": 2624,
      "spawn_x": {"left": 2592, "right": 3168},
      "batches": [
        {"enemy_type_id": "swarm_creature_melee", "right": 5, "left": 3},
        {"enemy_type_id": "swarm_creature_melee", "right": 6, "left": 3},
        {"enemy_type_id": "swarm_creature_melee", "right": 6, "left": 3}
      ]
    }
  ]
}
```

양쪽 생성 예약이 있으면 오른쪽·왼쪽 순서로 교대로 처리하고 한쪽이 소진되면 남은 쪽을 생성한다.

안전거리 때문에 반대편에 생성한 경우에도 원래 예약을 하나만 소비한다. 방향별 수는 정상 상황의 배정이며 안전한 출현 위치를 우선한다. 총수는 바꾸지 않는다. 검증할 때는 난수를 사용하지 않아 재현 가능하게 한다.

### 3.1. 적 종류 정의

각 배치는 `enemy_type_id`로 생성할 종류를 명시한다. 현재는 아래 정의 하나만 EnemyCatalog에 등록한다. 이후 여러 배치에서 서로 다른 적을 선택할 수 있지만 이번 프로토타입에서는 군집생물 1종만 생성한다. 속도·체력·이펙트는 종류별 정의, 위치·방향·현재 HP는 생성된 개체의 상태다.

다음 JSON은 향후 만들 자체 데이터 예시다. view_key는 EnemyFactory의 뷰 생성 등록 키이며 Phaser Scene 파일 경로가 아니다. 등록 함수와 애니메이션은 아직 존재하지 않는다.

```json
{
  "schema_version": 1,
  "enemy_type_id": "swarm_creature_melee",
  "faction_id": "unknown_swarm",
  "view_key": "swarm_creature_melee_sprite",
  "behavior_id": "swarm_melee",
  "animation_set_id": "swarm_creature_melee",
  "max_hp": 60,
  "move_speed": 48,
  "attack_range_px": 24,
  "attack_interval_sec": 1.0,
  "damage": 10,
  "hit_push_px": 4,
  "death_cleanup_sec": 1.2,
  "hurt_zone_profile_id": "basic_melee_hit_zones",
  "death_profile_set_id": "basic_melee_deaths",
  "hit_profile_id": "swarm_ichor"
}
```

`faction_id`는 설정과 출현 구성을 분류하기 위한 값이다. 현재는 군집생물만 적대 대상으로 생성하며 세력 간 전쟁·동맹·아군 오발 규칙은 구현하지 않는다. `unknown_swarm`은 생물의 기원이나 조직성을 확정하지 않는다. `enemy_type_id`는 종류 ID, `enemy_id`는 개체 ID로 구분한다. 알 수 없는 종류 ID나 누락된 뷰 등록은 시작 전 데이터 검증에서 오류로 처리한다. 조작 클론의 붉은 혈액은 기존 human_blood 프로필을 사용한다.

### 3.2. 캐릭터 보조 모션 시작 프리셋

다음은 캐릭터 보조 반응을 조절하는 자체 데이터다. 무기 반동은 무기 정의에서 따로 관리한다. 생성 도구의 원래 manifest나 Spine의 직접 저장 형식이 아니다. 자체 스프링의 주파수·감쇠비이며 Spine 경로에서는 동일한 목표 반응으로 물리 제약을 조정·기록한다. 변위는 표시 인물 크기에 비례한다.

```json
{
  "schema_version": 1,
  "character_id": "clone_01",
  "reference_height_px": 64,
  "simulation_hz": 120,
  "head": {"frequency_hz": 6, "damping_ratio": 0.8, "max_offset_px": 1},
  "hair": {"frequency_hz": 4.5, "damping_ratio": 0.65, "max_offset_px": 1.5},
  "bust": {"frequency_hz": 5.5, "damping_ratio": 0.65, "max_offset_px": 1, "max_local_scale_delta": 0.015}
}
```

### 3.3. M16 무기 정의 예시

프로젝트 자체 스키마다. 원본 128×64 이미지의 픽셀 좌표와 월드 px를 구분한다. 아래 자산·등록 키는 향후 만들 예시이며 실제 파일이 아니다. 무기 장착 방식은 [16](16-modular-character-and-weapons.md)를 따른다.

```json
{
  "schema_version": 1,
  "weapon_id": "m16_basic",
  "weapon_class": "rifle_two_handed",
  "hold_profile_id": "rifle_two_handed",
  "visual": {
    "texture_key": "weapon_m16_body",
    "image_size_px": [128, 64],
    "pivot_px": [38, 38],
    "pixels_to_world": 0.5,
    "parts": {
      "magazine": {"texture_key": "weapon_m16_magazine", "mount_socket": "magazine_well"},
      "bolt_control": {"texture_key": "weapon_m16_bolt_control", "mount_socket": "bolt_control"}
    }
  },
  "sockets": {
    "primary_grip": {"position_px": [38, 38], "angle_deg": 0},
    "support_grip": {"position_px": [70, 36], "angle_deg": 0},
    "muzzle": {"position_px": [114, 28], "direction_deg": 0},
    "ejection": {"position_px": [46, 30], "direction_deg": -70},
    "magazine_well": {"position_px": [54, 40], "angle_deg": 0},
    "bolt_control": {"position_px": [44, 26], "angle_deg": 0}
  },
  "fire_interval_sec": 0.1,
  "damage": 20,
  "range_px": 560,
  "accuracy": {
    "base": 0.9,
    "movement_penalty": 0.15,
    "bloom_per_shot": 0.02,
    "bloom_max": 0.2,
    "bloom_recovery_per_sec": 0.4,
    "bloom_recovery_delay_sec": 0.15,
    "max_spread_deg": 10
  },
  "hit_quality": {"graze_multiplier": 0.5},
  "critical": {"chance": 0.1, "multiplier": 2, "weakspot_guaranteed": true},
  "ammo": {"capacity": 30, "initial_rounds": 30, "reserve_mode": "unlimited", "initial_reserve": null},
  "reload": {
    "strategy": "detachable_magazine",
    "tactical_profile_id": "m16_reload_tactical",
    "empty_profile_id": "m16_reload_empty",
    "auto_on_empty": true,
    "move_speed_multiplier": 0.75,
    "player_cancel_allowed": false
  },
  "recoil": {"offset_px": 1.5, "duration_sec": 0.06, "max_rotation_deg": 2, "shoulder_transfer": 0.25},
  "muzzle_fx_id": "m16_muzzle",
  "tracer_fx_id": "m16_tracer"
}
```

소켓과 피벗은 무기 원본의 좌표다. (position_px - pivot_px)에 pixels_to_world를 곱하고 장착·반동·좌우·월드 변환을 적용한다. 이미 캐릭터 로컬로 변환한 좌표를 다시 축척하지 않는다. 사격 이벤트에는 발사 당시 weapon_id·최종 소켓·효과 선택을 저장한다.

### 3.4. 무기군 파지 프로필 예시

공통 몸통 기준 장착 자세·손 모양·IK 정책이다. 손잡이 위치는 무기 정의에서 읽는다. 팔 길이·어깨 위치는 캐릭터 리그가 소유한다.

```json
{
  "schema_version": 1,
  "hold_profile_id": "rifle_two_handed",
  "compatible_weapon_classes": ["rifle_two_handed"],
  "reference_character_height_px": 64,
  "mount_offset_px": [-3, -35],
  "mount_angle_deg": 0,
  "primary_hand_pose_id": "rifle_trigger",
  "support_hand_pose_id": "rifle_foregrip",
  "ik": {"allow_stretch": false, "max_grip_error_px": 2}
}
```

장착점과 총구의 예시 계산은 반동이 0·오른쪽일 때 (-3,-35) + ([114,28]-[38,38])×0.5 = (35,-40)이다. 지면 y=300이면 총구 y=260으로 기존 64px 비교값과 연결된다. 실제 이미지·리그를 측정해 값을 교체한다.

### 3.5. 검증용 갑옷 외형 정의 예시

외형만 바꾸는 자체 스키마다. 아래는 향후 Motion Lab에서 사용할 몸통 판 예시이며 완성 갑옷 아이템이 아니다. slot_id는 스킬 슬롯이 아닌 외형 부위다. fit_profile_id=clone_standard는 표준 리그의 기본 체형·보정 0을 가리키는 시작 규약이다.

```json
{
  "schema_version": 1,
  "appearance_id": "diag_torso_plate",
  "slot_id": "torso",
  "compatible_rig_ids": ["clone_humanoid_v1"],
  "fit_profile_id": "clone_standard",
  "parts": [
    {
      "attachment_id": "diag_torso_front",
      "texture_key": "armor_diag_torso_plate",
      "anchor_alias": "torso_shell",
      "pivot_px": [32, 32],
      "pixels_to_world": 0.5,
      "offset_px": [0, 0],
      "draw_layer": "torso_outer",
      "deform_mode": "rigid",
      "hide_base_regions": ["outfit_chest_front"]
    }
  ],
  "motion_overrides": {"bust_visible_gain": 0},
  "collision_policy": "cosmetic_only"
}
```

외형 텍스처·메시·부착·가림은 장비 자산이 소유한다. 장착 상태 전체에서 기본 영역의 숨김과 모션 제한을 다시 계산한다. 기본 캐릭터 프리셋을 영구 변경하지 않는다. 호환되지 않는 rig_id·부착점·가림 영역·표시 모드는 시작 전 또는 장착 전 오류다. soft/rigid/segmented와 장비 간 간섭은 [17](17-modular-armor-appearance.md)을 따른다.

### 3.6. 통합 샘플 목록 예시

실제 목록은 game/public/assets/catalog/asset_index.json에 있다. 캐릭터는 정적 외형 이미지와 검토 버전을 등록했고 M16·초기 적은 planned다. 아래는 제작 전 planned 형식을 보여주는 예시이며 현재 실데이터의 복사본이 아니다. 시안과 실제 상태는 [23](23-character-appearance-review.md), 샘플 규약은 [18](18-preview-library-and-reuse.md), 검사·조회는 [20](20-agent-automation.md)을 따른다.

```json
{
  "schema_version": 1,
  "entries": [
    {
      "kind": "character",
      "entity_id": "clone_01",
      "display_name": "초기 캐릭터",
      "status": "planned",
      "selected_revision_id": null,
      "revisions": [],
      "capabilities": [],
      "motions": []
    },
    {
      "kind": "weapon",
      "entity_id": "m16_basic",
      "display_name": "M16",
      "status": "planned",
      "selected_revision_id": null,
      "revisions": [],
      "capabilities": []
    }
  ]
}
```

실제 버전에는 산출물의 상대 경로·content hash·의존 버전·recipe 키·검수·채택 상태를 연결한다. recipe 키는 기존 결과 검색용이고 content hash는 실제 파일 동일성 확인용이다. 모션을 추가하면 같은 character 항목에 등록하고 과거 버전을 덮어쓰지 않는다. 원화 보기·참고 GIF·실제 리그 재생의 capability를 구분한다.

첫 실제 에셋 제작과 함께 공통 사이트를 구축하고 목록을 갱신한다. 산출물 등록은 제작 작업이 수행하며, 페이지 방문 자체가 생성·전체 렌더를 시작하지 않는다. UI의 마지막 선택은 브라우저에 저장할 수 있으나 로컬 UI 상태를 원본 에셋 목록이나 채택 기록의 유일한 저장소로 쓰지 않는다.

### 3.7. 피격 영역·폭발·사망·피드백 프로필

다음은 자체 데이터 예시다. 영역은 Hurtbox의 왼쪽 위 (0,0)·오른쪽 아래 (1,1) 기준 [x,y,width,height]다. 초기 적 정의가 아래 공통 프로필을 참조한다. 실제 이미지와 맞춰 검수하며 폭발은 새 무기 없이 샘플에서 검증한다. 처리 순서는 [19](19-combat-feel-and-damage.md)을 따른다.

```json
{
  "schema_version": 1,
  "hurt_zone_profiles": [
    {
      "profile_id": "basic_melee_hit_zones",
      "core_rect_normalized": [
        0.15,
        0.15,
        0.7,
        0.7
      ],
      "weakspot_rect_normalized": [
        0.45,
        0.25,
        0.2,
        0.2
      ]
    }
  ],
  "explosion_profiles": [
    {
      "profile_id": "explosion_sample",
      "damage": 60,
      "radius_px": 120,
      "edge_damage_multiplier": 0.2,
      "requires_line_of_sight": true,
      "critical_mode": "none",
      "direct_damage": 0,
      "target_group": "enemies"
    }
  ],
  "death_profile_sets": [
    {
      "profile_set_id": "basic_melee_deaths",
      "priority": [
        "explosive",
        "critical",
        "normal"
      ],
      "variants": {
        "normal": {
          "duration_sec": 0.8
        },
        "critical": {
          "duration_sec": 1
        },
        "explosive": {
          "duration_sec": 1.2
        }
      }
    }
  ],
  "feedback_limits": {
    "damage_numbers": 32,
    "corpses": 8,
    "debris": 64,
    "explosions": 2,
    "camera_shake_max_px": 2.5
  }
}
```

final_damage는 최종 계산 피해, hp_loss는 실제 HP 감소, overkill은 final_damage-hp_loss다. 숫자는 final_damage, 체력 손실 집계는 hp_loss를 사용한다. M16은 스침/일반/치명 10/20/40, 가림 없는 폭발 샘플은 거리 0/60/120px에서 60/36/12를 시작값으로 둔다.

일반 비치명 3발 검증은 명중도 1·산포 0·치명타 확률 0의 진단 설정과 core를 지나는 사선으로 수행한다. 실제 게임 프리셋은 별도로 유지한다. 명중·치명·표현 난수는 공격 ID와 용도별 시드로 분리한다.

### 3.8. 스토리 정의

스토리 장면 데이터 계약·JSON 예시는 [21](21-story-and-skipping.md)의 6절을 기준으로 한다. 초기 ID는 `stage_01_intro`, `stage_01_outro`이며 화자는 `commander`, `clone_01`을 사용한다. 화자 등록은 지휘관의 전투 개체·추가 원화 제작을 요구하지 않는다.

StoryRegistry는 장면·노드 ID, dialogue/cutscene 노드, 화자·큐 참조, 순차 진행, 완료 플래그·다음 상태를 관리한다. 스토리 텍스트/큐 revision과 시각 에셋 의존 버전을 구분한다. 현행 asset_index의 kind에는 story를 추가하지 않는다. 실제 게임 구현 시 장면 참조·완료 상태를 별도로 검증한다.

### 3.9. 장전 프로필 예시

아래는 자체 게임 데이터 형식의 설계 예시이며 실제 모션 파일·소켓 측정 결과는 아니다. M16 본체에는 분리 탄창을 그려 넣지 않는다. 하위 파츠의 자체 pivot·축척·손 접점·리그 목표 경로는 실제 원화 제작 때 보완한다. 기존 공통 캐릭터·보행을 유지하고 필요한 장전 상체 모션만 연결한다. [22](22-weapon-reloading.md)의 상태·탄약 권위·취소 규약을 따른다.

```json
{
  "schema_version": 1,
  "reload_profiles": [
    {
      "profile_id": "m16_reload_tactical",
      "motion_id": "rifle_reload_tactical",
      "duration_sec": 2.2,
      "ammo_commit": "on_complete",
      "presentation_cues": [
        {"time_sec": 0.25, "cue": "magazine_out"},
        {"time_sec": 1.25, "cue": "magazine_in"},
        {"time_sec": 2.2, "cue": "ready"}
      ]
    },
    {
      "profile_id": "m16_reload_empty",
      "motion_id": "rifle_reload_empty",
      "duration_sec": 2.8,
      "ammo_commit": "on_complete",
      "presentation_cues": [
        {"time_sec": 0.25, "cue": "magazine_out"},
        {"time_sec": 1.25, "cue": "magazine_in"},
        {"time_sec": 2.2, "cue": "bolt_action"},
        {"time_sec": 2.8, "cue": "ready"}
      ]
    }
  ]
}
```

시간은 원본 프로필 길이 기준이며 모션과 표현 큐를 같은 장전 경과 시간으로 평가한다. ready 큐가 탄약을 반영하지는 않는다. 완료는 게임 상태에서 1회 반영한다. 무기별 탄수·예비탄·장전 ID·경과 시간은 이 정의를 참조하는 인스턴스 상태로 따로 둔다. 유한 예비탄은 reserve_mode를 finite로 하고 initial_reserve에 0 이상의 정수를 지정한다.

## 4. 스킬 슬롯 데이터

```json
{
  "slots": [
    {"index": 0, "input_action": "skill_1", "skill_id": null, "enabled": false},
    {"index": 1, "input_action": "skill_2", "skill_id": null, "enabled": false},
    {"index": 2, "input_action": "skill_3", "skill_id": null, "enabled": false},
    {"index": 3, "input_action": "skill_4", "skill_id": null, "enabled": false}
  ]
}
```

표시는 1~4, 내부 인덱스는 0~3을 사용한다. 스킬 효과량·비용·쿨다운은 이번 데이터에 넣지 않는다.

## 5. 캐릭터 공통 리그 메타데이터

플레이어는 전신 프레임별 총구 표 대신 공통 리그·손·무기 부착 규약을 저장한다. 다음은 앱의 RigAdapter용 자체 메타데이터이며 Spine 원본 파일 형식이 아니다. 캐릭터 리그와 무기 자산은 별도로 로드한다.

```json
{
  "schema_version": 1,
  "character_id": "clone_01",
  "rig_id": "clone_humanoid_v1",
  "backend": "spine",
  "skeleton_key": "clone_01_rig",
  "atlas_key": "clone_01_parts",
  "weapon_assets_embedded": false,
  "appearance_slot_ids": ["head", "torso", "shoulders", "arms", "legs", "feet"],
  "appearance_anchor_aliases": ["head_shell", "torso_shell", "shoulder_primary_shell", "shoulder_support_shell", "arm_primary_shell", "arm_support_shell", "leg_primary_shell", "leg_support_shell", "foot_primary_shell", "foot_support_shell"],
  "bindings": {
    "weapon_slot": "weapon",
    "mount_bone": "weapon_mount",
    "recoil_bone": "recoil_pivot",
    "primary_ik": "arm_primary_ik",
    "support_ik": "arm_support_ik"
  },
  "base_animations": {"idle": "idle", "walk": "walk"},
  "hold_profile_ids": ["rifle_two_handed"]
}
```

캐릭터 파츠·공통 리그·보행은 무기 ID에 종속시키지 않는다. 앞/뒤 팔·손의 파츠 피벗과 손바닥 접점·손목 방향을 기록한다. 무기 슬롯은 별도 무기 이미지 뷰를 받으며, 무기 추가에 캐릭터 전체 아틀라스 재패킹을 요구하지 않도록 한다. 의복·갑옷도 외부 appearance 자산으로 연결하고 부착점 별칭·가림 영역·호환 rig_id를 확인한다.

가슴/의복·머리카락 메시의 기준 정점과 뼈대 가중치는 파츠 리그에 저장한다. 같은 파츠를 Spine 물리와 앱 스프링이 이중으로 움직이지 않게 한다. 적·생성 참고물은 원래 프레임 순서·시간·캔버스를 보존하되 플레이어의 키 수를 14개로 강제하지 않는다.

## 6. 이펙트 메타데이터

타격감은 재질 + hit_quality + 치명/약점 + 피해 원인 + 사망 여부로 선택한다. 숫자·소리·카메라·표현 정지는 같은 계산 결과를 쓴다. 폭발의 그림 크기·입자 수가 피해 반경을 바꾸지 않게 한다. [19](19-combat-feel-and-damage.md)을 기준으로 삼는다.

각 효과에 ID, PNG, 프레임 영역, 각 프레임의 재생 시간, 피벗, 기본 표시 배율, 루프 여부, 표시 수명, 블렌드 방식, 부착 대상을 저장한다.

피격 프로필에는 분사 FX ID, 팔레트, 액적 수·초기 속도·중력·항력·수명, 잔흔 ID·수명, 반동·색 반응을 저장한다. human_blood는 human_blood_hit, swarm_ichor는 swarm_ichor_hit 분사 시트를 사용한다. 상세 값의 조절 범위와 상한은 [14](14-hit-effects.md)을 따른다.

`m16_muzzle`은 소켓 부착, `m16_tracer`와 명중 효과는 월드 고정이다. 외부 JSON의 피벗이 캔버스 좌표인지 정규화 좌표인지 확인하고 프로젝트에서는 픽셀 좌표로 통일한다. 원본 128px 효과를 그대로 64px 인물에 겹치지 않고 실제 화면에서 크기를 결정한다.

## 7. 권장 디렉터리

현재는 문서·프로젝트 스킬·tools의 기본 CLI/테스트·game 아래의 계획 목록이 있다. 아래 트리는 게임·샘플 구현 때의 전체 목표 구조이며 아직 모든 경로가 존재하지는 않는다.

```text
miss/
├─ README.md
├─ docs/
├─ game/                      # Vite·TypeScript 웹 프로젝트 루트
│  ├─ package.json / package-lock.json
│  ├─ index.html / tsconfig.json / vite.config.ts
│  ├─ src/
│  │  ├─ scenes/              # Boot·MotionLab·Stage·UI
│  │  ├─ samples/             # 대상별 경로·목록·버전 비교 UI
│  │  ├─ entities/            # 플레이어·적·Health
│  │  ├─ combat/              # 무기·히트스캔·피해 이벤트
│  │  ├─ animation/           # 공통 리그·IK·보조 모션·적 프레임
│  │  ├─ weapons/             # 장착·무기 자산·손잡이·반동
│  │  ├─ fx/                 # 분사·액적·잔흔·풀
│  │  ├─ story/              # StoryRunner·대화 UI·취소 가능한 컷신
│  │  └─ data/               # 타입·로더·게임 정의, story/의 장면 JSON
│  ├─ public/assets/catalog/  # asset_index와 버전 메타데이터
│  └─ dist/                  # 향후 정적 웹 빌드 출력
├─ art/                       # 모든 아트 원본·제작 기록·파생 출력
│  ├─ characters/clone_01/    # concepts·records·reviews, 향후 parts·rigs·motions
│  ├─ weapons/m16_basic/      # 별도 무기 원화·소켓·보정
│  ├─ armor/                 # 부위별 외형·메시·fit·가림·모션
│  ├─ enemies/swarm_creature_melee/
│  ├─ fx/ · backgrounds/
│  └─ runtime/                # 향후 검수된 배포용 아트
├─ tools/                     # 향후 필요한 변환·검증 도구
├─ evidence/                  # 실험 녹화·결과·기기 정보
└─ third_party/               # 라이선스·출처·커밋 기록
```

아트 원본·시안·제작 기록·파생 출력을 모두 art/ 아래에 모으고 game에는 목록 메타데이터와 앱 코드만 둔다. 로컬 샘플은 /art/를 읽기 전용으로 제공한다. 향후 빌드가 채택된 art/runtime 산출물만 dist에 패키징하며 원본 전체를 배포하지 않는다. Vite 전환 때 base와 에셋 URL을 검증하고 현재 로컬 서버 전용 경로를 배포에 그대로 가정하지 않는다.

## 8. 파일 이름과 출처

파일·ID는 소문자 `snake_case`, 프레임은 `frame_00.png`처럼 두 자리 번호를 사용한다. 외부 도구의 원래 이름은 source 폴더에 보존하고 게임용 복사본에서만 이름을 통일한다.

에셋별로 원본 위치, 도구 URL·커밋, 생성 모델·설정, 프롬프트, 제작일, 수정 내용, 사용 권한 근거를 기록한다. 도구 코드 라이선스와 입력·생성 이미지의 이용 조건은 별개로 관리한다. 외부 에셋을 가져오면 필요한 고지 파일을 빌드와 함께 제공한다.

## 9. 데이터 검증

스토리는 [21](21-story-and-skipping.md)의 ID·노드·참조·완료 전환을 검사하고, 관람/스킵의 같은 진행 결과를 [08](08-feasibility-and-qa.md)의 S 검수로 확인한다. 현재 CLI의 docs-check는 문서 링크·JSON 구문 검사이며 스토리 실행·장면 계약 검증기는 아직 없다.

샘플 목록은 kind+entity_id의 유일성, 버전 ID·실제 산출물·의존 참조·선택 버전을 검사한다. planned 항목에는 존재하지 않는 실제 재생 capability를 주지 않는다. 새 항목 등록 뒤 기존 캐릭터·모션·무기 페이지가 유지되는지 확인한다.

스테이지 합계 54, 구역별 합계 10/18/26, 적 상한 양수, 스폰점의 구역 내부 배치, 출구의 스테이지 내부 배치를 검사한다. 모든 배치의 `enemy_type_id`가 EnemyCatalog에 있고 이번 버전에서는 `swarm_creature_melee`인지 확인한다. 플레이어는 파츠·뼈대·슬롯·IK·hold_profile 참조를, 적 시트는 프레임·캔버스를 검사한다. 무기는 이미지 범위 내 피벗·소켓, 유효한 반동·파지·효과 ID, 손잡이 도달 범위를 검사한다. 무기 변경이 캐릭터 파츠·리그·공통 보행 변경을 요구하지 않는지 별도로 확인한다. 갑옷은 rig/슬롯/부착점/가림 영역 호환, rigid의 표시 변형 제한, 교체 후 기본 설정 복원과 cosmetic_only의 판정 불변을 확인한다. 슬롯은 개수 4, `enabled=false`, `skill_id=null`을 확인한다.

실험값을 바꾸면 이 문서를 먼저 갱신하고 게임 데이터 및 검증 기대값을 함께 바꾼다.
