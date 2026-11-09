# vesper_colony_insect · GLB 모델 001

[illustration_001](../../concepts/illustration_001/source/illustration.png)을 바탕으로 사용자가 Tripo로 만든 메시에 직접 리깅한 mob 모델이다. 사용자 지시로 다리 대칭을 보정하고 제자리 걷기 클립을 넣었다. 미리보기 사이트의 ‘베스퍼 군락형 곤충’ 페이지 → ‘GLB 모델’ 탭(`#/samples/enemies/vesper_colony_insect?plan=glb`)이 `game/glb-model-lab.js`로 재생한다. 페이지를 열어도 렌더나 변환은 실행되지 않는다.

## 버전 이력 (원본은 프로젝트 상위 `shoot/` 폴더)

| 파일 | 작업 | SHA-256 |
|---|---|---|
| `mob.glb` → `mob_before_symmetry.glb` | 사용자 첫 내보내기. `leg_first_*_L` 웨이트 없음, L 다리가 `bone_40`·`leg_first_04_R`에 묶임 | — |
| `mob.glb` (수정본) | `leg_first` L 뼈·roll을 R의 Y 반전으로, L 다리 2,200정점에 R 웨이트 반전 복사 | — |
| `mob_version02.glb` | 사용자가 뼈 이름 정리(`leg_{first,second,third,last}_0N_{L,R}`, `abdomen_01~04`) | `4f1a0e4e…6bbe6a` |
| `mob_version03.glb` | R 기준: `abdomen_04`의 몸 앞쪽(x>0) 1,490정점 웨이트 제거·재정규화, 다리 4쌍 L 뼈/roll을 R 반전으로, L 다리 7,424정점에 R 웨이트 반전 복사 | `ea98a3cd…d255d117` |
| `mob_version04.glb` | version03 + `walk`만. 사용자 지시로 프로젝트 사본은 삭제(같은 `walk`가 version05에 들어 있음) | — |
| `mob_version05.glb` (이 폴더 `source/`, 탭이 사용) | version03 + `walk`(키 0~24프레임, 클립 0~1.00초) + `walk_fast`(같은 보행을 2배 빠르게: 12프레임, 0.5초 주기) | `8b79ffd9…43ecf89a` |

## walk / walk_fast 클립

- `walk_fast`는 사용자 지시(“2배정도 빠른 움직임”)로 추가했다. 보폭·발 들림·접지 비율·몸통/배 흔들림은 `walk`와 같고 한 주기만 12프레임(0.5초)이다. 제자리 클립이므로 실제 이동 속도도 보폭/주기 기준 2배(.26/초)에 해당한다.

- 24프레임·24fps·1초 루프, 제자리(몸은 이동하지 않고 발이 뒤로 밀림). Blender 5.2 헤드리스, [tools/build_walk.py](tools/build_walk.py).
- 교대 4족 보행: A조 L1·R2·L3·R4 / B조 R1·L2·R3·L4, 위상차 .5. 보폭 .13, 발 들림 .055, 접지 비율 .62.
- 다리마다 발끝 IK(체인 3, `_01`은 고정), 맨 뒤 다리는 `_03` 끝에서 발끝까지 잠근 보조 뼈로 목표를 잡았다. 매 프레임 포즈 행렬을 저장한 뒤 IK·보조 뼈를 지우고 위치/쿼터니언 키로 구웠다. glb에는 원래 뼈만 남는다.
- 몸통(`tripo::Root`) 상하 .006·좌우 기울기 1.2°·회전 1°, 배 4마디의 지연 흔들림, 입틀(`bone_30`/`tripo::Spine_2`) 4° 개폐.
- 측정: 접지 발끝 IK 오차 0, 무릎이 고관절 아래로 꺾인 프레임 0. `walk`는 정지 프레임 8장(측면·3/4 위)만 확인했다([records/walk_frames.png](records/walk_frames.png), version04 단계에서 렌더했으며 같은 수치의 `walk`다). `walk_fast`도 IK 오차 0·무릎 뒤집힘 0이며 웹 탭 재생만 확인했다.

## 남은 문제 (사용자 검수 대기)

- `leg_last`는 무릎 아래 뼈가 없어 아래 마디가 통째로 움직인다.
- 배 뒤쪽 `abdomen_04` 웨이트가 좌우 비대칭(L 281 / R 670 정점)이다.
- 머리 쪽 `bone_30`·`bone_31`·`bone_33`·`tripo::Spine_2`는 이름 미정리.
- 장면에 `Icosphere` 보조 오브젝트가 함께 들어 있다(웹 탭에서도 보일 수 있음).
- 동작의 자연스러움·속도는 사용자 검수 대기이며 스프라이트 시트는 아직 만들지 않았다.
