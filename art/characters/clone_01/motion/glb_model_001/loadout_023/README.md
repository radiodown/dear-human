# 리안 통합 무장 023: 총 꺼내기·넣기 (AR-12 · 쌍권총)

2026-11-13 사용자 요청 원문: “총을 꺼내고 넣는 모션에 총기를 추가해줘. 소총의 경우 넣는 경우 등에 장착하고 있도록 해서.”
이어서 같은 날 정정 요청: “일단 등에 메는 대신 총이 사라지는 것으로 수정해줘. 꺼내는 것도 총이 생기는 것으로 해주고”
이어서 같은 날 요청: “쌍권총도 마찬가지로 만들어줘”

통합 무장 022(소총 9개 + 쌍권총 6개)에 맨손 동작 `rifle_pull_out`(총 꺼내기)·`rifle_put_away`(총 집어넣기)를 AR-12를 든 동작으로 만들어 더했고, 쌍권총 꺼내기 `dual_pull_out`·쌍권총 집어넣기 `dual_put_away`도 더했다(모두 19개 동작). 022는 보존하며, 3D 탭의 리안 무장 `ar12_hp14t`가 023을 연다.

## 현재 방식 (사라짐·생김)

`tools/glb_retarget/make_draw_holster_clips.py`(기본 `style=vanish`)가 `source/version04.glb`의 두 맨손 동작과 `art/weapons/ar12_rupture/model_3d_003`으로 두 동작을 만든다.

- **무기 설정:** `attach_weapon.py`와 같다. Hips 아래 `weapon` 뼈를 쓰고, 키 비율을 곱하며, `rifle_aim_idle` 중간 프레임에서 오른손 기준 오프셋을 잡는다. 총은 원래 동작의 오른손을 따라 대기 자세로 들린다.
- **보이는 구간:** 손에 든 총의 총구가 −40° 아래로 내려가는 동안은 총을 크기 0(STEP 키)으로 숨긴다. 그 구간에 보이면 총이 다리를 뚫고 아래를 향하기 때문이다.
  - **꺼내기:** 30프레임(총구 −38°)부터 끝까지 보인다.
  - **넣기:** 1~30프레임만 보이고, 31프레임(총구 −42°)에 사라진다.
- **왼손:** 총이 보이는 동안만 받침점에 둔다(두 뼈 IK, 멀면 손잡이 쪽으로 미끄러뜨림). 꺼내기는 30→36프레임에 받침점을 잡고, 넣기는 25→31프레임에 놓는다.
- **바꾸는 범위:** 오른팔은 원래 동작 그대로다. 왼팔과 무기 뼈만 바꾼다.
- **합치기:** `tools/glb_retarget/add_loadout_clips.py`가 두 동작 키를 022에 바이트 그대로 붙인다.
  - `weapon` 키는 `weapon_rifle`로 옮기고, 쌍권총 두 자루는 크기 0으로 고정한다. 소총의 보임·숨김은 동작 키를 그대로 쓴다.
  - 쓰인 66개 노드의 기본 자세가 두 파일에서 같은 것을 확인했다. 기존 15개 동작은 바꾸지 않았다.

## 쌍권총 꺼내기·넣기

`tools/glb_retarget/make_dual_draw_clips.py`(Blender)가 022와 `source/version04.glb`로 만든다. 권총 꺼내기·넣기용 Mixamo 동작이 없어서 소총 꺼내기의 몸·다리·척추·머리를 쓴다.

- **`dual_pull_out`(50프레임):**
  - 오른손에 든 권총 총구가 −40° 위로 올라오는 24프레임에 양손에 권총이 생긴다. 이때 오른손은 허리 옆에서 앞으로 나오는 중이고, 총구는 오른쪽 −39°·왼쪽 −44°다.
  - 24~34프레임에 양쪽 어깨·팔·손·손가락을 `dual_idle` 첫 프레임 자세로 섞어(뼈마다 회전 보간) 쌍권총 대기 자세로 끝난다.
  - 권총은 `dual_idle`에서 잰 손→권총 오프셋으로 각 손에 붙는다.
- **`dual_put_away`(50프레임):** `dual_pull_out`을 거꾸로 재생한다. 쌍권총 대기 자세에서 팔이 허리로 내려가고, 28프레임에 권총이 사라진다.
  - 처음에는 소총 넣기의 팔 경로를 썼는데, 권총이 얼굴·배 앞을 지나고 사라질 프레임도 잡히지 않았다. 그래서 거꾸로 재생하는 방식으로 바꿨다.
- **합치기:** `add_loadout_clips.py`로 붙였다. 권총 뼈는 022의 `weapon_pistol_r`/`weapon_pistol_l`을 그대로 쓰고, 소총은 크기 0으로 고정했다. 68개 노드의 기본 자세가 같은 것을 확인했다.
- **확인한 것:**
  - Blender 렌더로 꺼내기 23·24·28·34·40·50프레임을 봤다.
  - 3D 탭에서 넣기를 0.38초·2.00초에 멈춰 보니 처음에는 권총을 들고 있고 끝에서는 빈손이다. 소총은 숨겨지고 콘솔 오류는 없다.
  - Blender로 다시 불러온 넣기 렌더에는 권총이 보이지 않았다. GLB의 크기 키는 1→0으로 맞고 3D 탭(Three.js)에서도 정상이라, Blender 가져오기 쪽 문제로 보고 따로 고치지 않았다.

재현:

```powershell
blender -b --python tools/glb_retarget/make_dual_draw_clips.py -- art/characters/clone_01/motion/glb_model_001/loadout_022/clone_01_ar12_hp14t.glb art/characters/clone_01/motion/glb_model_001/source/version04.glb <tmp>/dual_draw.glb
py tools/glb_retarget/add_loadout_clips.py <tmp>/023a.glb <tmp>/dual_draw.glb art/characters/clone_01/motion/glb_model_001/loadout_023/clone_01_ar12_hp14t.glb --hide weapon_rifle
```

`<tmp>/023a.glb`는 위 소총 재현의 두 번째 명령 출력이다(출력 경로만 다름).

## 이전 시도 (등에 메기, 같은 날 정정으로 교체)

`style=back`으로 남겨 두었다. 소총을 `Spine2`를 따라 등에 대각선으로 메고(총구 왼쪽 어깨 위·개머리판 오른쪽 허리, 깊이 0.113단위), 오른손을 두 뼈 IK로 등의 손잡이까지 끌어가 잡고 놓았다. 이 버전의 출력은 커밋하지 않았다.

## 재현

```powershell
blender -b --python tools/glb_retarget/make_draw_holster_clips.py -- art/characters/clone_01/motion/glb_model_001/source/version04.glb art/weapons/ar12_rupture/model_3d_003/ar12_rupture.glb <tmp>/lian_draw.glb
py tools/glb_retarget/add_loadout_clips.py art/characters/clone_01/motion/glb_model_001/loadout_022/clone_01_ar12_hp14t.glb <tmp>/lian_draw.glb art/characters/clone_01/motion/glb_model_001/loadout_023/clone_01_ar12_hp14t.glb --rename weapon=weapon_rifle --hide weapon_pistol_r weapon_pistol_l
```

## 해시 (SHA-256)

- 입력 022 `clone_01_ar12_hp14t.glb`: `09bd9840dedee3ca0c40537925b83e2cf8dd5659be5f66409b80e048ea831d65`
- 중간 `lian_draw.glb`(보존하지 않음): `c6008ac7e102de1332d05886ae701244bedb58b69928decf8b3fd1f25347bb1b`
- 중간 `dual_draw.glb`(보존하지 않음): `ab3059fdaede0c055c219e9e46912b457be5eace4d25aa235a98f0ff60e064ff`
- 출력 023 `clone_01_ar12_hp14t.glb`(19개 동작): `5d8479bbafa3bb3cf3f37f114244592e564ce17eeccb2a09755be704539a94ce`

## 확인 범위

- **확인한 것:**
  - Blender 우측면 렌더로 총이 생기기 직전·직후, 대기, 사라지기 직전·직후를 봤다.
  - 출력 GLB에서 소총 크기 키가 꺼내기는 0→1, 넣기는 1→0으로 한 번씩만 바뀌는 것을 확인했다.
  - 3D 탭을 새로고침해 두 동작이 재생되고, 넣은 뒤 빈손이 되고, 권총이 숨겨지는 것을 확인했다. 콘솔 오류는 없다.
- **확인하지 않은 것 / 남은 점:**
  - 생기고 사라지는 효과(빛·연기)는 없고, 한 프레임에 나타나거나 없어진다.
  - 넣기 중반에는 원래 손 움직임을 따라 총이 어깨 높이로 올라간다.
  - 손–총 겹침 보정(`hand_clearance`)은 없다.
  - 다른 대원과 다른 무기는 아직 적용하지 않았다.
  - 미감은 사용자 검수 대기다.
