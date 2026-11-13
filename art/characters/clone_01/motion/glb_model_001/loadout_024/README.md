# 리안 통합 무장 024: 내림 → 조준 (AR-12)

2026-11-13 사용자 요청 원문: “gunmotion 폴더의 Rifle Down To Aim.fbx 캐릭터들에 적용해주고 리아에게는 총까지 적용해서 대기 상태에 조준으로 자연스럽게 이어지도록해줘”

통합 무장 023(19개 동작)에 AR-12를 든 `rifle_down_to_aim`(내림 → 조준, 22프레임·약 0.9초)을 더했다(20개 동작). 023은 보존하며 3D 탭의 리안 무장 `ar12_hp14t`가 024를 연다. 맨손 동작은 다섯 대원의 `source` GLB에 넣었다(리안 README의 같은 날 항목 참고).

## 방법

1. **리타깃:** `retarget_mixamo_fbx.py`로 `shoot/gunmotion/Rifle Down To Aim.fbx`를 `source/version04.glb`에 넣었다. `FOOT_IK`를 쓰고 기존 동작은 바꾸지 않았다.
2. **총 붙이기:** `attach_weapon.py`의 긴 총 견착 방식에 이번에 `RAMP_CLIPS`를 추가했다.
   - 이 동작은 총을 낮춘 자세에서 시작하므로, 처음부터 개머리판을 어깨에 고정하면 총이 끌려 올라간다.
   - 그래서 견착 가중치를 총구가 들리는 정도(손에 든 총의 시작→끝 기울기 변화의 35%→90%)에 맞춰 0에서 1로 올린다.
   - 이 동작은 총이 빨리 올라가 그대로 두면 1프레임에 전환되므로, 시간으로 최소 8프레임에 걸치게 했다. 결과는 4프레임 0.01 → 11프레임 0.99다.
   - 총이 올라가는 움직임을 반동으로 오인하지 않도록 이 동작에서는 발사 판정을 끈다. 조준 프레임의 총구 수평 맞춤과 손–총 겹침 보정은 그대로다.
3. **소총 대기와 잇기:** 새 도구 `blend_clip_ends.py`로 처음 8프레임 동안 양팔·손가락과 무기 뼈를 023의 `rifle_idle` 첫 키 자세에서 출발시켰다.
   - 원래 Mixamo 시작 자세는 몸은 같지만 팔·총이 소총 대기와 오른손 103mm, 왼손 232mm, 총 189mm·24.5° 달랐다.
4. **합치기:** `add_loadout_clips.py`로 023에 붙였다(`weapon` → `weapon_rifle`, 쌍권총 크기 0, 소총 크기 1). 66개 노드의 기본 자세가 같은 것을 확인했다.

## 이어짐 측정 (Hips 기준, 실제 mm)

- **시작:** `rifle_idle` 첫 키와 비교해 오른손 0, 왼손 1, 머리 1, 총 0mm·0.0°다. 발만 왼발 9mm, 오른발 4mm 다르다.
- **끝:** `rifle_aim_idle` 첫 키와 비교해 양손 0, 머리 0, 총 0mm·0.1°다. 발만 왼발 11mm, 오른발 15mm 다르다(원래 동작의 발 위치).

## 재현

```powershell
blender -b --python tools/glb_retarget/retarget_mixamo_fbx.py -- <shoot>/version04_downaim.glb art/characters/clone_01/motion/glb_model_001/source/version04.glb "rifle_down_to_aim=<shoot>/gunmotion/Rifle Down To Aim.fbx"
blender -b --python tools/glb_retarget/attach_weapon.py -- art/characters/clone_01/motion/glb_model_001/source/version04.glb art/weapons/ar12_rupture/model_3d_003/ar12_rupture.glb long rifle_aim_idle <tmp>/lian_downaim.glb rifle_down_to_aim
blender -b --python tools/glb_retarget/blend_clip_ends.py -- art/characters/clone_01/motion/glb_model_001/loadout_023/clone_01_ar12_hp14t.glb <tmp>/lian_downaim.glb <tmp>/lian_downaim_b.glb rifle_down_to_aim start=rifle_idle@first frames=8 map=weapon_rifle=weapon
py tools/glb_retarget/add_loadout_clips.py art/characters/clone_01/motion/glb_model_001/loadout_023/clone_01_ar12_hp14t.glb <tmp>/lian_downaim_b.glb art/characters/clone_01/motion/glb_model_001/loadout_024/clone_01_ar12_hp14t.glb --rename weapon=weapon_rifle --hide weapon_pistol_r weapon_pistol_l --show weapon_rifle
```

## 해시 (SHA-256)

- 입력 023: `5d8479bbafa3bb3cf3f37f114244592e564ce17eeccb2a09755be704539a94ce`
- 입력 `source/version04.glb`(새 동작 포함): `293363502127846d8d951a08728096110151682c2a1f34a065b28a32bf3f09c5`
- 중간 `lian_downaim.glb`: `f07a4debbf772bbbf15400e044c97f415e807fe599231596e978af5550c6b59d`
- 중간 `lian_downaim_b.glb`: `d9acf5fa2a2e906d25689c3e8137fe10063eae3c5b87827bb0b4722324eee4c8`
- 출력 024: `42fade6d6237478cd250e22c79ed6d79b6a1e0a69d1127a42412daaa42d026ed`

중간 파일은 보존하지 않았다.

## 확인 범위

- **확인한 것:**
  - Blender 우측면·정면 렌더로 소총 대기 → 내림→조준 1·4·7·10·14·22프레임 → 조준 대기 순서를 봤다.
  - 위 이어짐 수치를 측정했다.
  - 3D 탭에서 리안 무장 `내림 → 조준` 재생과, 모아 맨손 `내림 → 조준` 재생을 확인했다. 현재 페이지에 오류는 없다.
- **확인하지 않은 것:**
  - 이 동작의 스프라이트(sprite_004)와 js-prototype 연결은 아직 하지 않았다.
  - 시작·끝에서 발이 1~1.5cm 다르다.
  - 미감은 사용자 검수 대기다.
