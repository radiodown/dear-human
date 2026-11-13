# 리안 스프라이트 005 (30fps, js-prototype 자세 전환)

2026-11-13 사용자 요청 원문: “지금 수정한 작업들 스프라이트로 만들어주고, 동작에 규칙을 추가해 줄게. 총을 꺼내면 '기본 대기 -> 사격 시 조준 대기로 변경 및 사격 -> 사격 중지 시 사격 대기 -> 5초 간 정지해 있으면 기본 대기로 변경' 이 흐름을 따라 가도록 프로토타입에 추가해줘.”

[sprite_004](../sprite_004/README.md)(이미 커밋된 30fps 세트)는 덮어쓰지 않았다. 이번에 새로 만들었거나 바뀐 동작 6개만 이 폴더에 렌더했다. 형식은 004와 같다(200px/단위, 30fps, 정사영 완전 우측면, 4배 렌더 후 축소, 무손실 WebP 8열 시트·프레임 PNG·`manifest_200.json`, 캔버스 300px, 제자리). js-prototype은 아래 6개를 이 폴더에서, 나머지를 004에서 읽는다.

| 동작 | 프레임 | 출처 |
|---|---|---|
| `rifle_down_to_aim` 내림 → 조준 | 28 | loadout_024 |
| `rifle_aim_to_down` 조준 → 내림 | 46 | loadout_025 |
| `dual_pull_out` 쌍권총 꺼내기(대기 2로 끝남) | 63 | loadout_026 |
| `dual_put_away` 쌍권총 넣기(대기 2에서 시작) | 63 | loadout_026 |
| `dual_ready_to_aim` 쌍권총 대기 → 조준 | 20 | loadout_027 |
| `dual_aim_to_ready` 쌍권총 조준 → 대기 | 20 | loadout_027 |

모두 한 번 재생 동작이다. 입력 GLB는 `loadout_027/clone_01_ar12_hp14t.glb`(SHA-256 `7b9f5de6fb52a791349a581c78d04da2112bcb6c83d71dad2672a1a802882e9f`)이고, 위 동작을 모두 담고 있다. `render_glb_sprites.py`의 `clone_01_armed` 모델을 027로 옮기고 전환 동작 4개를 표에 더했다. 004에 있는 다른 동작은 023과 027에서 키가 같아 다시 렌더하지 않았다. 004의 `dual_pull_out`/`dual_put_away`는 이전 동작(쌍권총 조준 대기로 끝남)이므로 js-prototype은 005의 것을 쓴다.

```powershell
blender -b --python tools/glb_sprites/render_glb_sprites.py -- --model clone_01_armed --out art/characters/clone_01/motion/glb_model_001/sprite_005 --clips rifle_down_to_aim,rifle_aim_to_down,dual_ready_to_aim,dual_aim_to_ready,dual_pull_out,dual_put_away --fps 30
```

용량은 약 8.5MB이고 렌더는 약 5분 걸렸다. 유료 호출은 0회다.

**확인 범위:** 매니페스트의 프레임 수를 확인했다. js-prototype에서 6개 모두 불러와 상태 전환에 쓰이는 것을 확인했다(아래 프로토타입 README). 프레임을 하나씩 검수하지는 않았고, 미감은 사용자 검수 대기다.
