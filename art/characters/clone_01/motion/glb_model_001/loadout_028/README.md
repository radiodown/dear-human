# 리안 통합 무장 028: 쌍권총 기본 걷기

2026-11-13 사용자 요청 원문: “맨손 기본 걷기에 쌍권총을 쥐여준 형태로 쌍권총의 기본 걷기를 추가해줘. 그 후 shoot 폴더에 새로 추가된 모션들을 확인해서 캐릭터 모션에 추가해줘.”

통합 무장 027(23개 동작)에 `dual_walk_basic`(쌍권총 기본 걷기, 56키·24fps, 반복)을 더했다(24개 동작). 027은 보존하며 3D 탭의 리안 무장 `ar12_hp14t`가 028을 연다. 같은 요청의 뒷부분(Rifle Walk·Rifle Run)은 다섯 대원의 `source`에 맨손으로 넣었다(리안 README의 같은 날 항목).

## 방법

- **동작 만들기:** `tools/glb_retarget/make_dual_pistol_clips.py`의 `CLIPS`에 `('dual_walk_basic', 'walk.001', 56, 1, None, None)` 한 줄을 더했다.
  - `dual_run`(맨손 달리기의 팔 흔들기)과 같은 방식이다. 목표가 `None`이면 맨손 걷기 `walk.001`의 몸 전체와 양팔 흔들기를 그대로 쓴다.
  - 손가락만 권총 파지로 바꾸고, 두 권총은 `dual_idle`과 같은 손→권총 오프셋으로 각 손을 따라간다. 총구 방향은 보정하지 않는다(팔을 내린 구간에서는 아래를 향함).
  - 다른 동작의 정의는 바꾸지 않았다.
- **루프 길이:** 이 도구의 반복 동작 규칙(마지막 키 = 첫 키)대로 `walk.001`(1~56)의 1~55 구간을 한 주기로 샘플했다. 맨손 걷기보다 주기가 1프레임(약 1.8%) 짧다. `dual_run`도 같은 방식이다.
- **입력:** 도구 입력은 커밋된 HEAD의 `source/version04.glb`(SHA-256 `293363502127846d8d951a08728096110151682c2a1f34a065b28a32bf3f09c5`, 소총 걷기·달리기를 넣기 전)다. 몸·팔 동작은 이후 교체한 source와 같다.
- **합치기:** `add_loadout_clips.py --rename weapon=weapon_pistol_r weapon_l=weapon_pistol_l --hide weapon_rifle --clips dual_walk_basic`로 027에 붙였다. 67개 노드의 기본 자세가 같은 것을 확인했다.

```powershell
blender -b --python tools/glb_retarget/make_dual_pistol_clips.py -- <HEAD source/version04.glb> art/weapons/hp14t_gemini/model_3d_002/hp14t_gemini.glb <tmp>/dual.glb
py tools/glb_retarget/add_loadout_clips.py art/characters/clone_01/motion/glb_model_001/loadout_027/clone_01_ar12_hp14t.glb <tmp>/dual.glb art/characters/clone_01/motion/glb_model_001/loadout_028/clone_01_ar12_hp14t.glb --rename weapon=weapon_pistol_r weapon_l=weapon_pistol_l --hide weapon_rifle --clips dual_walk_basic
```

## 해시 (SHA-256)

- 입력 027: `7b9f5de6fb52a791349a581c78d04da2112bcb6c83d71dad2672a1a802882e9f`
- 중간 `dual.glb`(보존하지 않음): `edee40aac0cb6a1352c5f1626ac128537c944a639ca2a1a5162cc84a647324ad`
- 출력 028: `020462bcae97568c9c6da69b410f01569314bf99b99a47b22eaf437813bc3a76`

## 확인 범위

- **확인한 것:**
  - Blender 우측면·정면 렌더로 1·14·28·42키를 봤다. 팔 흔들기와 권총 쥔 모습이 나온다.
  - 도구 출력의 권총–손 거리 차이는 0이고, 두 손이 IK로 닿지 않은 거리도 0mm다.
  - 3D 탭에서 `쌍권총 기본 걷기` 재생을 확인했고 실패한 요청은 없다.
- **확인하지 않은 것:**
  - 팔을 내린 구간에서 권총이 허벅지에 가까이 지나간다. 관통 여부는 수치로 재지 않았다.
  - 스프라이트·js-prototype 연결은 없다.
  - 미감은 사용자 검수 대기다.
