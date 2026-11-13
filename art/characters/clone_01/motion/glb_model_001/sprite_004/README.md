# 리안 스프라이트 004 (30fps, js-prototype용)

2026-11-13 사용자 요청 원문: “이제 프로토타입용 2d 스프라이트를 다시 만들거야. 리안 기준으로 만들거고 들어갈 모션은 사격 동작에 포함되어있는 동작, 맨손 걷기, 달리기, 대기1 을 추가할 거야. … 30fps 기준으로 스프라이트를 만들고 프로토타입에 적용해줘.”

`tools/glb_sprites/render_glb_sprites.py`로 렌더한 정사영 완전 우측면 스프라이트다. 200px/단위, 4배 렌더 후 축소, 무손실 WebP 시트(8열)·프레임 PNG·`manifest_200.json`은 기존 sprite_001~003과 같은 형식이고, `fps`만 **30**이다. 이전 스프라이트(sprite_001~003, 12fps)는 보존한다.

## 렌더 방법

- **30fps 샘플링:** 새 옵션 `--fps 30`이 24fps 동작을 0.8프레임 간격의 소수 프레임으로 샘플한다.
  - 반복 동작은 한 주기만 담는다. Mixamo 동작은 시작~끝+1, 마지막 키가 첫 키와 같은 동작(쌍권총·풀오토)은 시작~끝이다.
  - 한 번 재생 동작은 마지막 키로 끝난다.
  - 시작·끝은 실제 키 범위(소수 포함)를 쓴다. 합친 무장 파일은 무기를 숨기는 단일 키가 0프레임에 있어, 처음 렌더에서 반복 동작에 첫 프레임이 두 번 들어갔기 때문이다. 이를 고쳐 무장 동작은 다시 렌더했다. 맨손 3개는 영향이 없다.
- **맨손 3개:** 모델 `clone_01`(`source/version04.glb`, SHA-256 `4ebb9fbb8cb3f19ef5f32995c3d4b422e89bc2c031aa537deaaaeb3712cbbc34`)의 `idle.001`·`walk.001`·`run.001`. 기존과 같은 256px 캔버스다.
- **무장 19개:** 새 모델 `clone_01_armed`(`loadout_023/clone_01_ar12_hp14t.glb`, SHA-256 `5d8479bbafa3bb3cf3f37f114244592e564ce17eeccb2a09755be704539a94ce`)의 전체 동작.
  - 총구까지 담기 위해 캔버스 1.5단위(300px), 중심 (−0.03, 0.61)이다. `--bounds` 측정 범위는 앞뒤 −0.58~0.52, 높이 −0.10~1.32다.
  - 프로토타입은 `crop`·`originX`·`groundY` 기준점으로 발을 맞추므로 캔버스가 달라도 위치가 맞는다.
- **제자리:** 모두 엉덩이의 앞뒤 위치를 기본 자세 값에 고정했다(GLB 탭의 ‘제자리’와 같음).

```powershell
blender -b --python tools/glb_sprites/render_glb_sprites.py -- --model clone_01 --out art/characters/clone_01/motion/glb_model_001/sprite_004 --clips idle,walk,run --fps 30
blender -b --python tools/glb_sprites/render_glb_sprites.py -- --model clone_01_armed --out art/characters/clone_01/motion/glb_model_001/sprite_004 --fps 30
```

## 동작 (프레임 수, 반복 여부)

| 맨손 | 소총 AR-12 | 쌍권총 HP-14T |
|---|---|---|
| idle 대기 1: 462, 반복 | rifle_idle 소총 대기: 259, 반복 | dual_idle 대기: 80, 반복 |
| walk 걷기: 70, 반복 | rifle_aim_idle 조준 대기: 94, 반복 | dual_idle_high 대기 2: 80, 반복 |
| run 달리기: 38, 반복 | gunplay 조준 사격(단발): 19 | dual_fire 사격: 30, 반복 |
| | gunplay_auto 연사: 8, 반복 | dual_kneel_fire 앉아 사격: 120, 반복 |
| | rifle_full_auto 풀오토: 49, 반복 | dual_walk 걷기: 24, 반복 |
| | shoot_rifle 이동 사격: 29, 반복 | dual_run 달리기: 38, 반복 |
| | peek_aim 엄폐 조준: 79, 반복 | dual_pull_out 꺼내기: 63 |
| | rifle_reload 장전: 81 | dual_put_away 넣기: 63 |
| | rifle_reload_empty 탄 소진 장전: 105 | |
| | rifle_pull_out 꺼내기: 63 | |
| | rifle_put_away 넣기: 70 | |

전체 약 65MB(시트 + 프레임 PNG)다. 렌더 시간은 첫 렌더 약 35분, 무장 재렌더 약 30분이었고 유료 호출은 0회다.

## 확인 범위

- **확인한 것:**
  - 시험 렌더 프레임(조준 사격·쌍권총 꺼내기)을 눈으로 봤다.
  - 매니페스트의 프레임 수·fps·반복 여부를 확인했다(쌍권총 사격 30프레임 = 1초).
  - js-prototype에서 15개 동작을 불러와 재생했고, 페이지가 동작을 불러올 때 오류는 없다.
- **확인하지 않은 것:**
  - 모든 프레임을 하나씩 검수하지는 않았다.
  - 총구 화염 같은 효과는 스프라이트에 없다.
  - 장전·엄폐 조준·연사·쌍권총 대기 2·앉아 사격은 렌더만 하고 프로토타입에는 연결하지 않았다.
  - 미감은 사용자 검수 대기다.
