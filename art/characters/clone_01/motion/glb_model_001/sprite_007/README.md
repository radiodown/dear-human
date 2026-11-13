# 리안 스프라이트 007 (30fps, 쌍권총 대기 고개 정면)

2026-11-13 사용자 요청 원문: “쌍권총의 기본대기자세에서는 고개를 정면을 보도록 수정해줘”

[loadout_030](../loadout_030/README.md)에서 고개를 고친 5개 동작을 다시 렌더했다. 이전 004·005의 같은 동작은 보존한다. 형식은 004~006과 같다(200px/단위, 30fps, 정사영 완전 우측면, 4배 렌더 후 축소, 무손실 WebP 8열 시트·프레임 PNG·`manifest_200.json`, 캔버스 300px, 제자리).

| 동작 | 프레임 | 이전 위치 |
|---|---|---|
| `dual_idle_high` 쌍권총 대기(반복) | 80 | sprite_004 |
| `dual_pull_out` 쌍권총 꺼내기 | 63 | sprite_005 |
| `dual_put_away` 쌍권총 넣기 | 63 | sprite_005 |
| `dual_ready_to_aim` 쌍권총 대기 → 조준 | 20 | sprite_005 |
| `dual_aim_to_ready` 쌍권총 조준 → 대기 | 20 | sprite_005 |

입력은 `loadout_030/clone_01_ar12_hp14t.glb`(SHA-256 `0cb73396f2029899a3376d710854d4c730af953c7d6d9af27e55306a5b4ecd28`)다. 용량은 약 8.5MB, 렌더는 약 4분 걸렸고 유료 호출은 0회다.

```powershell
blender -b --python tools/glb_sprites/render_glb_sprites.py -- --model clone_01_armed --out art/characters/clone_01/motion/glb_model_001/sprite_007 --clips dual_idle_high,dual_pull_out,dual_put_away,dual_ready_to_aim,dual_aim_to_ready --fps 30
```

**확인 범위:** 매니페스트의 프레임 수를 확인했다. js-prototype이 이 5개를 007에서 불러오고, 쌍권총을 꺼내면 이 쌍권총 대기로 들어가는 것을 확인했다. 미감은 사용자 검수 대기다.
