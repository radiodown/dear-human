# 리안 통합 무장 025: 조준 → 내림 (AR-12)

2026-11-13 사용자 요청 원문: “조준에서 내리는 모션에도 총을 자연스럽게 이어지도록 적용해줘”

통합 무장 024(20개 동작)에 AR-12를 든 `rifle_aim_to_down`(조준 → 내림, 37프레임·약 1.5초)을 더했다(21개 동작). 024는 보존하며 3D 탭의 리안 무장 `ar12_hp14t`가 025를 연다. 맨손 동작은 이미 `source/version04.glb`에 있던 것(2026-11-12 추가)을 그대로 썼다.

## 방법

1. **총 붙이기:** `attach_weapon.py`(긴 총, 기준 `rifle_aim_idle`)로 붙였다. `RAMP_CLIPS`가 조준→내림 방향을 판단해, 견착 가중치를 총구가 내려가는 정도에 맞춰 1에서 0으로 내린다(최소 8프레임). 발사 판정은 끈다.
2. **양끝 잇기:** `blend_clip_ends.py`로 처음 8프레임은 024의 `rifle_aim_idle` 첫 키 자세에서 출발하고, 마지막 8프레임은 `rifle_idle` 첫 키 자세로 끝나게 양팔·손가락·무기 뼈를 섞었다.
   - 섞기 전에는 시작이 조준 대기와 오른손 37mm, 왼손 30mm, 총 26mm·3.7° 달랐다.
   - 끝은 소총 대기와 왼손 10mm, 총 1mm·0.2° 달랐다.
3. **합치기:** `add_loadout_clips.py`로 024에 붙였다(`weapon` → `weapon_rifle`, 쌍권총 크기 0, 소총 크기 1). 66개 노드의 기본 자세가 같은 것을 확인했다.

## 이어짐 측정 (Hips 기준, 실제 mm)

- **시작:** `rifle_aim_idle` 첫 키와 비교해 오른손 0, 왼손 1, 머리 0, 총 0mm·0.0°다. 발만 왼발 16mm, 오른발 10mm 다르다.
- **끝:** `rifle_idle` 첫 키와 비교해 오른손 1, 왼손 2, 머리 1, 총 0mm·0.0°다. 발만 왼발 9mm, 오른발 4mm 다르다.

024의 `rifle_down_to_aim`과 합치면 소총 대기 → 조준 → 소총 대기가 손·총 기준으로 끊김 없이 돈다.

## 재현

```powershell
blender -b --python tools/glb_retarget/attach_weapon.py -- art/characters/clone_01/motion/glb_model_001/source/version04.glb art/weapons/ar12_rupture/model_3d_003/ar12_rupture.glb long rifle_aim_idle <tmp>/lian_aimdown.glb rifle_aim_to_down
blender -b --python tools/glb_retarget/blend_clip_ends.py -- art/characters/clone_01/motion/glb_model_001/loadout_024/clone_01_ar12_hp14t.glb <tmp>/lian_aimdown.glb <tmp>/lian_aimdown_b.glb rifle_aim_to_down start=rifle_aim_idle@first end=rifle_idle@first frames=8 map=weapon_rifle=weapon
py tools/glb_retarget/add_loadout_clips.py art/characters/clone_01/motion/glb_model_001/loadout_024/clone_01_ar12_hp14t.glb <tmp>/lian_aimdown_b.glb art/characters/clone_01/motion/glb_model_001/loadout_025/clone_01_ar12_hp14t.glb --rename weapon=weapon_rifle --hide weapon_pistol_r weapon_pistol_l --show weapon_rifle
```

## 해시 (SHA-256)

- 입력 024: `42fade6d6237478cd250e22c79ed6d79b6a1e0a69d1127a42412daaa42d026ed`
- 중간 `lian_aimdown.glb`: `143685dd7b437975395a01b3ae94495dbbee6b48a1752d71b7b714fd3285f16a`
- 중간 `lian_aimdown_b.glb`: `d566308015695113c327149a2d6733dcbe5ccf0ffcbfc26b03246571e4bf6470`
- 출력 025: `3a14380ca575c1369daa534b069358d6cc214bf911d7a5966139a05b01429acd`

중간 파일은 보존하지 않았다.

## 확인 범위

- **확인한 것:**
  - Blender 우측면·정면 렌더로 조준 대기 → 조준→내림 1·5·10·16·24·30·37프레임 순서를 봤다.
  - 위 이어짐 수치를 측정했다.
  - 3D 탭에서 재생을 확인했고 불러오기 오류는 없다.
- **확인하지 않은 것:**
  - 시작 쪽에서 손이 총에 겹치는 부분 중 일부 프레임은 보정이 다 되지 않았다(검사 프레임 중 9개).
  - 스프라이트·js-prototype 연결은 없다.
  - 미감은 사용자 검수 대기다.
