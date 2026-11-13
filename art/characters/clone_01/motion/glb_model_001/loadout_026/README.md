# 리안 통합 무장 026: 쌍권총 꺼내기·넣기를 쌍권총 대기 2에 잇기

2026-11-13 사용자 요청 원문: “쌍권총의 꺼내기와 집어넣기를 쌍권총 대기 2 와 자연스럽게 이어지도록 수정해줘. 꺼내기의 최종 동작과 집어넣기의 처음 동작이 쌍권총 대기 2와 일치하도록.”

통합 무장 025(21개 동작)의 `dual_pull_out`(쌍권총 꺼내기)·`dual_put_away`(쌍권총 집어넣기)만 다시 만들었다. 나머지 19개 동작은 그대로다. 025는 보존하며 3D 탭의 리안 무장 `ar12_hp14t`가 026을 연다.

## 원인 (025 측정)

025의 꺼내기는 양팔만 `dual_idle`(쌍권총 대기, 총구 앞) 자세로 끝났고, 몸은 소총 꺼내기의 소총 자세 그대로였다. 쌍권총 대기 2(`dual_idle_high`) 첫 키와 비교하면 다음과 같이 달랐다(실제 mm, 키 1.0 = 1650mm).

- 골반: 10.6mm, 방향 51.8°(소총 자세와 권총 자세는 몸을 튼 방향이 다르다).
- 머리: 99mm, 골반 기준 34.4°.
- 손: 오른손 379mm, 왼손 263mm.
- 권총: 오른쪽 555mm·87.8°, 왼쪽 296mm·62.1°.
- 발: 왼발 209mm, 오른발 109mm.

손→권총 파지 오프셋은 `dual_idle`과 `dual_idle_high`가 같아서(0.00mm·0.00°) 그대로 쓴다.

## 방법

`tools/glb_retarget/make_dual_draw_clips.py`에 옵션을 더했다(기본값은 이전 동작과 같다).

- **`target=dual_idle_high`:** 권총이 생기는 24프레임부터 `blend=14`프레임 동안 양쪽 어깨·팔·손·손가락을 쌍권총 대기 2 첫 프레임 자세로 섞는다(24→38프레임).
- **`body=1`:** 골반·척추·목·머리·다리도 20→44프레임에 같은 첫 프레임 자세로 섞는다(골반 위치는 선형, 회전은 뼈마다 보간).
  - 발은 미끄러지지 않게 두 뼈 다리 IK로 제자리에 두고, 왼발은 20→33프레임, 오른발은 30→44프레임에 한 걸음씩(들림 0.02단위, 약 33mm) 권총 자세 자리로 옮긴다. 발목 IK 오차는 0이다.
  - 44~50프레임은 쌍권총 대기 2 첫 프레임 자세로 멈춘다.
- **권총이 생기는 순간:** 이전과 같다. 24프레임에 허리 옆에서 생기고(총구 오른쪽 −39°, 왼쪽 −44°), 팔이 올라가며 총구가 위로 선다.
- **`dual_put_away`:** 꺼내기를 거꾸로 재생한다. 쌍권총 대기 2 자세에서 시작해 28프레임에 권총이 사라진다.
- 입력 무장에 이미 `dual_pull_out`·`dual_put_away`가 있으면 지우고 다시 만들게 했다(없애지 않으면 이전 동작이 그대로 내보내졌다).
- **합치기:** `remove_glb_clips.py`로 025에서 두 동작을 지우고, `add_loadout_clips.py`로 새 두 동작을 붙였다(소총 크기 0, 68개 노드 기본 자세 일치 확인).

## 이어짐 측정 (026)

`dual_pull_out` 마지막 키와 `dual_put_away` 첫 키를 각각 `dual_idle_high` 첫 키와 비교했다. 골반(세계 좌표), 골반 기준 척추·목·머리·양손·양발·양 권총 모두 0.0mm·0.00°이고, 0.05°를 넘게 다른 뼈가 없다(이전 수치는 위 ‘원인’ 참고).

기존 19개 동작은 025와 채널별 키 시간·값 바이트가 같다(glTF 애니메이션 데이터 비교).

## 재현

```powershell
blender -b --python tools/glb_retarget/make_dual_draw_clips.py -- art/characters/clone_01/motion/glb_model_001/loadout_025/clone_01_ar12_hp14t.glb art/characters/clone_01/motion/glb_model_001/source/version04.glb <tmp>/dual_draw.glb target=dual_idle_high body=1 blend=14
py tools/glb_retarget/remove_glb_clips.py art/characters/clone_01/motion/glb_model_001/loadout_025/clone_01_ar12_hp14t.glb <tmp>/base.glb dual_pull_out dual_put_away
py tools/glb_retarget/add_loadout_clips.py <tmp>/base.glb <tmp>/dual_draw.glb art/characters/clone_01/motion/glb_model_001/loadout_026/clone_01_ar12_hp14t.glb --hide weapon_rifle
```

## 해시 (SHA-256)

- 입력 025: `3a14380ca575c1369daa534b069358d6cc214bf911d7a5966139a05b01429acd`
- 중간 `dual_draw.glb`: `afe696488fd95d72cec1d6cd902ca6c7bba04f4a9ae06601cafe649614840c10`
- 중간 `base.glb`: `5ebcefb86775f07b2027bfc463c9dccbe0ba23f97d09fd626f0b95080f11184b`
- 출력 026: `66c7689061d1224de68540431e3cbfec8cfbac6b7580cacc6b8ce1d8c5d13852`

중간 파일은 보존하지 않았다.

## 확인 범위

- **확인한 것:**
  - 위 이어짐 수치와 기존 19개 동작 동일성.
  - Blender 우측면·정면·대각선 렌더로 꺼내기 20·23·24·26·28·30·32·34·36·38·41·44·50프레임, 쌍권총 대기 2 1프레임, 넣기 1·10·20·27·28·32·50프레임을 봤다. 권총이 얼굴·몸을 뚫는 프레임은 보이지 않았다.
  - 3D 탭을 새로고침해 026을 불러오고 꺼내기·넣기가 재생되는 것을 확인했다. 넣기는 권총을 세워 든 자세에서 시작해 빈손으로 끝난다. 새로 생긴 콘솔 오류와 실패한 요청은 없다.
- **확인하지 않은 것 / 남은 점:**
  - 꺼내기 시작 자세(소총 꺼내기의 시작)는 바꾸지 않았다. 넣기의 끝도 같은 자세다.
  - 몸을 약 50° 트는 걸음이 24프레임(1초)에 들어가 있다. 걸음 미감은 사용자 검수 대기다.
  - 손–총 겹침 보정은 없다. 프레임 전체의 관통 수치는 재지 않았다.
  - `sprite_004`와 js-prototype의 쌍권총 꺼내기·넣기 스프라이트는 이전 동작 그대로다(재렌더 필요).
