# 리안 통합 무장 027: 쌍권총 대기 ↔ 조준 대기 전환

2026-11-13 사용자 요청 원문: “쌍권총의 조준 대기와 쌍권총 대기도 자연스럽게 이어지도록 에이전트로 작업해줘”

통합 무장 026(21개 동작)에 전환 동작 두 개를 더했다(23개 동작). 026은 보존하며 3D 탭의 리안 무장 `ar12_hp14t`가 027을 연다.

- `dual_ready_to_aim`(쌍권총 대기 → 조준): `dual_idle_high`(쌍권총 대기, 총구 위) 첫 키에서 시작해 `dual_idle`(쌍권총 조준 대기) 첫 키로 끝난다. 16키(15구간, 0.625초, 24fps), 한 번 재생.
- `dual_aim_to_ready`(쌍권총 조준 → 대기): 같은 경로를 거꾸로 간다. 16키.

## 방법

Mixamo에는 쌍권총 전환 동작이 없어 `tools/glb_retarget/make_dual_pistol_clips.py`의 권총 목표 방식으로 새로 만들었다(`Move` 클래스, `CLIPS` 표에 두 줄 추가).

- **양끝:** 두 대기 동작의 첫 프레임 목표(손잡이 위치·총구 각·팔꿈치 방향·팔 펴짐 한도)를 그대로 쓴다. 양끝에서는 보간 없이 그 목표 자체를 반환한다.
- **사이:** 손잡이는 두 위치를 잇는 직선 위를 부드럽게 출발·정지(5차 곡선)하며 간다. 총구 각과 팔꿈치 방향은 이동보다 1.3배 앞서 가서, 팔이 다 펴지기 전(이동의 약 77%)에 총구가 수평이 된다. 팔은 매 프레임 두 뼈 IK로 푼다(단순 관절 보간 아님).
- **좌우 시간차:** 오른손(머리 옆)은 처음부터 움직여 전체의 90% 지점에 도착하고, 왼손은 10% 늦게 출발해 끝에 도착한다.
- **몸:** 골반·척추·머리·다리는 `pistol_idle2` 첫 프레임에 고정했다. 두 대기 동작 모두 첫 프레임의 몸이 이 자세라서 양끝이 맞는다.
- **합치기:** `add_loadout_clips.py`로 026에 붙였다(`weapon` → `weapon_pistol_r`, `weapon_l` → `weapon_pistol_l`, 소총 크기 0, 67개 노드 기본 자세 일치 확인).

## 이어짐 측정 (027, Blender에서 전체 뼈 비교)

골반은 세계 좌표, 나머지 모든 뼈와 두 권총 뼈는 골반 기준으로 위치·방향을 비교했다(실제 mm, 키 1.0 = 1650mm).

| 비교 | 최대 차이 |
|---|---|
| `dual_ready_to_aim` 첫 키 ↔ `dual_idle_high` 첫 키 | 0.001mm · 0.000° |
| `dual_ready_to_aim` 마지막 키 ↔ `dual_idle` 첫 키 | 0.001mm · 0.000° |
| `dual_aim_to_ready` 첫 키 ↔ `dual_idle` 첫 키 | 0.001mm · 0.000° |
| `dual_aim_to_ready` 마지막 키 ↔ `dual_idle_high` 첫 키 | 0.001mm · 0.000° |

- **루프 위상:** 두 대기 동작은 65키 루프이고 마지막 키가 첫 키와 같다(0.000mm). 전환은 대기 동작의 첫 키(= 루프 끝)에서 이어야 정확히 맞는다. 루프 중간에서 넘기면 호흡 오르내림만큼(손잡이 최대 약 8~13mm, 총구 1~1.5°) 어긋나므로 그때는 짧은 교차 혼합이 필요하다.
- **다른 동작과의 관계:** `dual_put_away` 첫 키도 `dual_idle_high` 첫 키와 같다(0.001mm). `dual_fire` 첫 키는 `dual_idle` 첫 키와 최대 16.8mm·2.2° 다르다(이번 범위 밖, 바꾸지 않음).
- **팔꿈치 각:** 오른팔 49° → 169°, 왼팔 23° → 168°. 권총 최고 속도는 오른쪽 70mm/프레임, 왼쪽 62mm/프레임이고 양끝 속도는 0에 가깝다.

## 기존 동작 동일성

- 026의 21개 동작은 027에서 채널별 키 시간·값 바이트가 같다.
- 도구를 고치기 전(HEAD)과 후에 같은 입력으로 만든 기존 6개 쌍권총 동작도 채널별 바이트가 같다.

## 재현

```powershell
blender -b --python tools/glb_retarget/make_dual_pistol_clips.py -- art/characters/clone_01/motion/glb_model_001/source/version04.glb art/weapons/hp14t_gemini/model_3d_002/hp14t_gemini.glb <tmp>/dual.glb
py tools/glb_retarget/add_loadout_clips.py art/characters/clone_01/motion/glb_model_001/loadout_026/clone_01_ar12_hp14t.glb <tmp>/dual.glb art/characters/clone_01/motion/glb_model_001/loadout_027/clone_01_ar12_hp14t.glb --rename weapon=weapon_pistol_r weapon_l=weapon_pistol_l --hide weapon_rifle --clips dual_ready_to_aim dual_aim_to_ready
```

## 해시 (SHA-256)

- 입력 026: `66c7689061d1224de68540431e3cbfec8cfbac6b7580cacc6b8ce1d8c5d13852`
- 입력 `source/version04.glb`(작업 폴더 현재본): `293363502127846d8d951a08728096110151682c2a1f34a065b28a32bf3f09c5`
- 입력 `hp14t_gemini/model_3d_002/hp14t_gemini.glb`: `ba54d657791132e107a52afd50de18e7a86fbbcb56235690be8c647e1e2a3e1b`
- 중간 `dual.glb`: `36014a1fd7afdf288fd4e10c8e669249a5900015a84e2c264535618d65c97097`
- 출력 027 (7,739,748바이트): `7b9f5de6fb52a791349a581c78d04da2112bcb6c83d71dad2672a1a802882e9f`

중간 파일은 보존하지 않았다.

## 확인 범위

- **확인한 것:**
  - 위 이어짐 수치와 기존 동작 동일성.
  - Blender 정우측·정면 렌더로 대기 1프레임 → 전환 1·4·6·8·10·12·14·16프레임 → 조준 대기 1프레임, 그리고 반대 순서(전환 1·3·5·7·9·11·13·16프레임)를 봤다. 권총이 머리·얼굴·몸을 뚫는 프레임은 보이지 않았다(권총은 얼굴 앞·바깥쪽으로 지나간다).
  - 3D 탭 재생: 새로고침 후 027을 불러오고 동작 버튼 두 개(‘쌍권총 대기 → 조준’·‘쌍권총 조준 → 대기’)가 생겼으며, `clip=dual_ready_to_aim`이 권총을 세운 자세와 뻗은 자세 사이로 재생되는 것을 화면으로 확인했다. 새로고침 뒤 실패한 요청(4xx/5xx)은 없다. `dual_aim_to_ready`는 탭에서 따로 재생해 보지 않았다(버튼 표시만 확인).
- **확인하지 않은 것 / 남은 점:**
  - 관통은 눈으로만 봤고 수치로 재지 않았다(몸 메시가 닫힌 면이 아니라 안팎 판정이 맞지 않았다).
  - 전환 중 몸(골반·척추·머리·다리)은 움직이지 않는다. 상체 반응을 넣을지는 사용자 검수 후 결정한다.
  - 왼팔은 대기 자세에서 팔꿈치가 23°로 많이 접혀 있다(기존 `dual_idle_high` 자세 그대로).
  - `sprite_004`와 js-prototype에는 두 전환 동작의 스프라이트가 없다(스프라이트 렌더 필요).
  - 동작 미감은 사용자 검수 대기다.
