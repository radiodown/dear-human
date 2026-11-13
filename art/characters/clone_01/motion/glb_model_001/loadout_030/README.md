# 리안 통합 무장 030: 쌍권총 대기 고개 정면

2026-11-13 사용자 요청 원문: “쌍권총의 기본대기자세에서는 고개를 정면을 보도록 수정해줘”

029(27개 동작)에서 쌍권총 대기 `dual_idle_high`의 고개를 정면으로 고치고, 이 자세로 시작하거나 끝나는 연결 동작 4개를 같이 맞췄다. 029는 보존하며 3D 탭의 리안 무장 `ar12_hp14t`가 030을 연다. 다른 22개 동작은 그대로다(`remove_glb_clips.py`·`add_loadout_clips.py`가 키 데이터를 다시 계산하지 않고 그대로 옮김).

## 원인과 수정

- **원인:** `dual_idle_high`는 몸을 `pistol_idle2`(Mixamo 권총 대기)에서 가져와, 얼굴이 아래로 31°, 옆으로 18° 돌아가 있었다. 비교하면 소총 대기는 −1°/+4°다.
- **새 도구 `tools/glb_retarget/level_head.py`:**
  - 얼굴 방향은 기본 자세에서 캐릭터 정면(월드 −Y)을 가리키는 머리 뼈의 축으로 정했다.
  - 매 프레임 그 방향을 수평 정면으로 돌리는 가장 짧은 회전을 구해, 목에 40%, 머리에 나머지를 나눠 준다.
  - 목·머리 키는 먼저 매 프레임 하나씩(선형) 굽는다. 그대로 두면 전환 동작은 첫·끝 키만 계단식으로 있어 보정이 끝에서 한 번에 바뀐다.
  - 내보낼 때 프레임 범위를 실제 키 범위로 맞춘다. 0프레임의 무기 숨김 키 때문에 첫 자세가 한 프레임 더 들어가는 것을 막기 위해서다.
- **동작별 보정 가중치:**

| 동작 | 가중치 | 얼굴 기울기/좌우(이전 → 지금) |
|---|---|---|
| `dual_idle_high` 쌍권총 대기 | 전체 | −31°/−18° → 0°/0°(65키 모두) |
| `dual_pull_out` 쌍권총 꺼내기 | 24→44프레임에 걸쳐 0→1 | 시작 −2°/−4° 그대로, 끝 0°/0° |
| `dual_put_away` 쌍권총 넣기 | 7→27프레임에 걸쳐 1→0 | 시작 0°/0°, 끝 −2°/−4° 그대로 |
| `dual_ready_to_aim` 쌍권총 대기 → 조준 | 1→16프레임에 걸쳐 1→0 | 0°/0°에서 조준 대기의 −31°/−18°로 서서히 |
| `dual_aim_to_ready` 쌍권총 조준 → 대기 | 1→16프레임에 걸쳐 0→1 | 그 반대 |

꺼내기 끝·넣기 시작·두 전환의 대기 쪽 끝이 고친 쌍권총 대기와 같은 얼굴 방향(0°/0°)으로 이어진다. 쌍권총 조준 대기 `dual_idle`(−31°/−18°)은 요청 범위가 아니라 그대로 두었다.

```powershell
blender -b --python tools/glb_retarget/level_head.py -- art/characters/clone_01/motion/glb_model_001/loadout_029/clone_01_ar12_hp14t.glb <tmp>/head.glb dual_idle_high=full dual_pull_out=in:24:44 dual_put_away=out:7:27 dual_ready_to_aim=out:1:16 dual_aim_to_ready=in:1:16
py tools/glb_retarget/remove_glb_clips.py art/characters/clone_01/motion/glb_model_001/loadout_029/clone_01_ar12_hp14t.glb <tmp>/minus.glb dual_idle_high dual_pull_out dual_put_away dual_ready_to_aim dual_aim_to_ready
py tools/glb_retarget/add_loadout_clips.py <tmp>/minus.glb <tmp>/head.glb art/characters/clone_01/motion/glb_model_001/loadout_030/clone_01_ar12_hp14t.glb
```

## 해시 (SHA-256)

- 입력 029: `4b6b479cc937449b18ce3a62bcf4cc5c97f9ad7c2e0a5009f1e7c1325b7148a2`
- 중간 `head.glb`(보존하지 않음): `24b2a55e36f4e0fbaa4f63739e1065610043a3c858384dbce0de3f359e7e921b`
- 출력 030: `0cb73396f2029899a3376d710854d4c730af953c7d6d9af27e55306a5b4ecd28`

## 확인 범위

- **확인한 것:**
  - 030을 다시 불러와 위 표의 얼굴 각도를 프레임별로 쟀다.
  - Blender 우측면·정면 렌더로 쌍권총 대기의 고치기 전·후를 비교했다.
  - 바뀐 5개 동작을 [sprite_007](../sprite_007/README.md)로 다시 렌더해 js-prototype이 쓰게 했다.
- **확인하지 않은 것:**
  - 3D 탭 재생은 보지 않았다(GLB 구조는 029와 같은 방식).
  - 머리를 돌리면서 머리카락이 어깨·권총과 겹치는지는 렌더로만 봤다.
  - 미감은 사용자 검수 대기다.
