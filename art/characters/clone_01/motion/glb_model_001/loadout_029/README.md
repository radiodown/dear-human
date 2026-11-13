# 리안 통합 무장 029: 소총 걷기·달리기·걷다 멈춤 (AR-12)

2026-11-13 사용자 요청 원문: “모션들에서 프로토타입의 움직임을 자연스럽게 연결할 수 있는 동작들을 총기 모션을 추가해줘”

통합 무장 028(24개 동작)에 AR-12를 든 `rifle_walk`(소총 걷기, 32키)·`rifle_run`(소총 달리기, 17키)·`rifle_walk_to_stop`(소총 걷다 멈춤, 87키)을 더했다(27개 동작). 028은 보존하며 3D 탭의 리안 무장 `ar12_hp14t`가 029를 연다. 세 동작은 같은 날 `source/version04.glb`에 넣은 맨손 동작(Rifle Walk·Rifle Run, 그리고 이전의 Rifle Walk To Stop)이다.

## 방법

- **총 붙이기:** `attach_weapon.py`의 `HIP_CLIPS`(견착하지 않고 오른손에 든 낮춘 자세)에 세 동작을 더했다.
  - 손 위치가 소총 대기와 같은 낮춘 자세이기 때문이다(Spine2 기준 앞 0.09~0.18, 아래 0.07~0.16단위).
  - 총은 `rifle_aim_idle` 기준 오른손 오프셋으로 들고, 왼손은 받침점에 IK로 맞춘다. 손–총 겹침 보정을 쓰며, 이전 `HIP_CLIPS`인 `rifle_idle`과 같은 처리다.
- **합치기:** `add_loadout_clips.py --rename weapon=weapon_rifle --hide weapon_pistol_r weapon_pistol_l --show weapon_rifle`로 028에 붙였다. 66개 노드의 기본 자세가 같은 것을 확인했다.
- **도구 측정값:**

| 동작 | 오른손–손잡이 최대 | 왼손–총 최대 | 왼손 미끄럼 | 겹침 보정 후 남은 검사 프레임 |
|---|---|---|---|---|
| 걷기 | 42.9mm | 26.8mm | 48mm | 7 |
| 달리기 | 43.1mm | 36.6mm | 3mm | 1 |
| 걷다 멈춤 | 45.4mm | 36.2mm | 67mm | 19 |

`rifle_idle`과 같은 수준이며, 오른손 거리는 손바닥을 총 밖으로 뺀 거리를 포함한다.

```powershell
blender -b --python tools/glb_retarget/attach_weapon.py -- art/characters/clone_01/motion/glb_model_001/source/version04.glb art/weapons/ar12_rupture/model_3d_003/ar12_rupture.glb long rifle_aim_idle <tmp>/lian_move.glb rifle_walk rifle_run rifle_walk_to_stop
py tools/glb_retarget/add_loadout_clips.py art/characters/clone_01/motion/glb_model_001/loadout_028/clone_01_ar12_hp14t.glb <tmp>/lian_move.glb art/characters/clone_01/motion/glb_model_001/loadout_029/clone_01_ar12_hp14t.glb --rename weapon=weapon_rifle --hide weapon_pistol_r weapon_pistol_l --show weapon_rifle
```

## 해시 (SHA-256)

- 입력 `source/version04.glb`: `bf73c4cdfff98d96df80440e8ba5811d990a3a202f5935f3158966cb694477e5`
- 입력 028: `020462bcae97568c9c6da69b410f01569314bf99b99a47b22eaf437813bc3a76`
- 중간 `lian_move.glb`(보존하지 않음): `88633580e1f810ba0a720fd967b891e676bb3917585a4994a4d15de41027fa7c`
- 출력 029: `4b6b479cc937449b18ce3a62bcf4cc5c97f9ad7c2e0a5009f1e7c1325b7148a2`

## 확인 범위

- **확인한 것:** Blender 우측면·정면 렌더로 소총 대기와 걷기 1·9·17키, 달리기 1·5·9·13키, 걷다 멈춤 마지막 키를 비교했다. 걷기·걷다 멈춤 끝은 소총 대기와 같은 낮춘 자세다.
- **달리기:** 총을 몸 앞에 수평에 가깝게 든다.
- **연결:** 세 동작의 스프라이트는 [sprite_006](../sprite_006/README.md)에 렌더했고, js-prototype 003의 무장 이동에 걷기·달리기를 연결했다. 걷다 멈춤은 렌더만 했다.
- **확인하지 않은 것:** 왼손이 총에 조금 남는 프레임이 있다(위 표). 미감은 사용자 검수 대기다.
