# 리안 스프라이트 006 (30fps, js-prototype 무장 이동)

2026-11-13 사용자 요청 원문: “모션들에서 프로토타입의 움직임을 자연스럽게 연결할 수 있는 동작들을 총기 모션을 추가해줘”

[sprite_004](../sprite_004/README.md)·[sprite_005](../sprite_005/README.md)는 덮어쓰지 않았다. 무장 이동 동작 4개만 이 폴더에 렌더했다. 형식은 004·005와 같다(200px/단위, 30fps, 정사영 완전 우측면, 4배 렌더 후 축소, 무손실 WebP 8열 시트·프레임 PNG·`manifest_200.json`, 캔버스 300px, 제자리).

| 동작 | 프레임 | 반복 | 출처 |
|---|---|---|---|
| `rifle_walk` 소총 걷기 | 40 | 반복 | loadout_029 |
| `rifle_run` 소총 달리기 | 22 | 반복 | loadout_029 |
| `rifle_walk_to_stop` 소총 걷다 멈춤 | 109 | 한 번 | loadout_029 |
| `dual_walk_basic` 쌍권총 기본 걷기 | 69 | 반복(마지막 키 = 첫 키) | loadout_028 = 029 |

입력 GLB는 `loadout_029/clone_01_ar12_hp14t.glb`(SHA-256 `4b6b479cc937449b18ce3a62bcf4cc5c97f9ad7c2e0a5009f1e7c1325b7148a2`)다. `render_glb_sprites.py`의 `clone_01_armed`를 029로 옮기고 위 4개를 표에 더했다. 용량은 약 8.6MB, 렌더는 약 5분 걸렸고 유료 호출은 0회다.

```powershell
blender -b --python tools/glb_sprites/render_glb_sprites.py -- --model clone_01_armed --out art/characters/clone_01/motion/glb_model_001/sprite_006 --clips rifle_walk,rifle_run,rifle_walk_to_stop,dual_walk_basic --fps 30
```

**확인 범위:** 매니페스트의 프레임 수를 확인했다. js-prototype이 걷기·달리기·쌍권총 기본 걷기 3개를 불러와 쓰는 것을 확인했다. 걷다 멈춤은 렌더만 했고 아직 연결하지 않았다(3.6초로 길어서, 멈출 때 자연스럽게 쓰려면 이동 감속과 맞추는 작업이 필요). 미감은 사용자 검수 대기다.
