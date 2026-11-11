# 아렌(iren) · GLB 모델 001

- 사용자 지시(2026-11-11): “iren_rig를 바탕으로 오른쪽 3D 움직임과 스프라이트도 만들어줘. 아렌 탭에 추가해주고”. 브랜치 `glb-sprites`.
- 원본: 사용자가 리깅한 `shoot/tripo_convert_ee943903-….glb`(Tripo 메시 14,706 정점, Mixamo 65관절, 애니메이션 `walk.001`·`run.001`·`dive.001`·`afraid.001`)에서 정수리 뼈만 보정한 `shoot/iren_rig.glb`의 사본이 [source/iren_rig.glb](source/iren_rig.glb)다(SHA-256 `d7afbf6340545874…`).
- 정수리 뼈 보정(같은 날 사용자 요청 “정수리 쪽 뼈대가 튀어 나왔어”): 머리 꼭대기 1.00m보다 `mixamorig:Head` 끝이 1.026m, `mixamorig:HeadTop_End` 끝이 1.157m로 약 16cm 나와 있었다. `Head`의 시작점·방향(쉬는 자세 회전)은 그대로 두고 길이만 줄여 0.945m에서 끝나게 하고, `HeadTop_End`는 0.945→0.995m로 했다. glTF는 끝 뼈 길이를 저장하지 않아 다시 불러오면 Blender가 부모와 같은 길이로 정하므로 두 뼈를 같은 길이로 나눴다. `HeadTop_End`는 가중치 0·위치 키 0이다. 다시 불러와 원본과 비교하면 네 애니메이션의 처음·가운데·끝 프레임에서 메시 차이 최대 0.001mm, 바뀐 뼈는 두 개뿐이다. Blender에서 보이는 `Icosphere`는 가져오기 도구가 만드는 뼈 표시용이며 파일에는 없다.

## 3D 탭 (‘GLB 모델’)

- `game/glb-model-lab.js`의 `MODELS.iren`이 이 GLB를 Three.js로 재생한다. 리안과 같은 오른쪽 옆 정사영 카메라(화면 높이 1.3·시점 0.5)와 ‘제자리’(골반 앞뒤·좌우 고정), 속도·좌우 반전을 쓴다. 탭 이름은 걷기·달리기·다이브·겁먹음.
- 내장 브라우저에서 아렌 페이지 표시·네 동작 탭·오른쪽을 향한 재생만 확인했다.

## sprite_001 · 2D 스프라이트 (완전 우측면)

- 도구는 리안·몬스터와 같은 `tools/glb_sprites/render_glb_sprites.py --model iren`(Blender 5.2.3 헤드리스, 정사영 카메라를 정확히 −X 축에 둔 완전 우측면, 4배 렌더 후 면적 평균 축소, 12fps, 동작별 여백 자르기와 `crop`/`groundY`/`originX` 기준점, 무손실 WebP 8열 시트)다. 화면 범위는 리안과 같은 1.28m·중심 앞뒤 −0.01m·높이 0.52m이고 측정한 몸 범위(앞뒤 −0.62~0.59m, 높이 0~1.0m)가 들어간다.
- 제자리: `mixamorig:Hips`의 앞뒤 위치를 휴식값으로 고정한다. Mixamo 클립은 마지막 키가 첫 키와 달라 모든 키에서 한 장 건너 골랐다.
- 해상도 두 벌이 같은 폴더에 이름으로 나뉘어 있다: `frames_200/`·`spritesheet_200.webp`·`manifest_200.json`(기본), `frames_100/`·`spritesheet_100.webp`·`manifest_100.json`.

| 동작 | 장수 | 200px/m 프레임 (WebP SHA-256) | 100px/m 프레임 |
|---|---|---|---|
| 걷기 `walk.001` | 29 | 131×203 (`64c75f6c…`) | 67×103 |
| 달리기 `run.001` | 16 | 174×183 (`fafda19a…`) | 88×93 |
| 다이브 `dive.001` | 33 | 243×184 (`27afbdfb…`) | 123×93 |
| 겁먹음 `afraid.001` | 32 | 89×204 (`918c185b…`) | 46×104 |

- 폴더 4.9MB, 렌더 약 2분 43초(200px/m 약 1분 56초 + 100px/m 약 47초), 비용 없음. ‘GLB · 2D 스프라이트’ 탭(`#/samples/characters/iren?plan=glb-sprite`)에서 네 동작·두 해상도 전환만 확인했고 외형·동작은 사용자 검수 대기다.

## 대기·사격 동작 추가 (2026-11-11)

- 사용자 지시: “wait라는 glb 파일 … 대기 모션이 2개 있어. 이것들을 각 캐릭터들에 추가할 수 있어?” → “shoot에 gunmotion 넣었어 … 4가지 모션 적용되는지 확인해주고 적용된다면 페이지에 추가해줘”(Mixamo FBX, 방식 A).
- 원본: `shoot/wait.glb`(유나 모델·리그, `idle.001` 369프레임 15.3초·`wait.001` 145프레임 6.0초, SHA-256 `8f8c1427ff270df7…`)와 `shoot/gunmotion/`의 Mixamo FBX 4개(메시 없음·Mixamo 표준 캐릭터·T 포즈·30fps·뼈 이름 `mixamorig11:`·cm 단위): `Female Peek And Aim.fbx`(2.6초, `50a289f1…`)·`Gunplay.fbx`(0.57초, `47884699…`)·`Gunplay_auto.fbx`(0.2초, `fcb91c0e…`)·`Shoot Rifle.fbx`(0.93초·골반 1.78m 전진, `1ac2f33a…`).
- 방법: 캐릭터마다 기본 자세가 달라(유나 A 포즈 73°, 다른 대원·리안 거의 T 포즈 6~10°, Mixamo 원본 T 포즈) 키 값 복사로는 팔이 60° 넘게 어긋난다. 뼈마다 원본 뼈의 공간 방향을 따르도록 `T = S·Rs⁻¹·A·Rt`(S 원본 자세, Rs/Rt 원본/대상 기본 자세, A 대상→원본 기본 자세 뼈 방향의 최단 회전)로 옮기고, 골반 이동은 골반 높이 비율(사격 동작은 약 0.60~0.63)로 줄였다. 사격 동작은 24fps로 다시 뽑았다. 도구는 [`tools/glb_retarget/retarget_glb_clips.py`](../../../../../tools/glb_retarget/retarget_glb_clips.py)(GLB 원본)와 [`retarget_mixamo_fbx.py`](../../../../../tools/glb_retarget/retarget_mixamo_fbx.py)(FBX 원본, 뼈 이름 앞부분 무시).
- 바닥: 대기 동작은 원본 유나의 동작별 가장 낮은 지점(중앙값 0.5mm / −3.0mm)에 맞춰 골반 높이를 일정하게 올렸고, 메시가 없는 사격 원본은 대상 메시의 동작별 가장 낮은 지점 중앙값을 0에 맞췄다(결과 ±3.5mm 이내).
- 결과 파일: `shoot/iren_rig_wait.glb`(대기 2개 추가) → `shoot/iren_rig_gun.glb`(사격 4개 추가)이며, 이 폴더의 `source/iren_rig.glb`를 `_gun` 내용으로 교체했다(이전 내용은 git 기록). 기존 동작은 다시 불러와 비교한 메시 차이 0.0071mm 이하로 그대로다.
- 3D 탭 이름: `idle.001` 대기 1 · `wait.001` 대기 2 · `peek_aim` 엄폐 조준(원본처럼 등을 돌린 채 시작해 몸을 돌려 조준하고 돌아옴) · `gunplay` 조준 사격 · `gunplay_auto` 연사(0.2초 반복) · `shoot_rifle` 이동 사격(앞으로 이동, 탭의 ‘제자리’로 고정). 사격 동작에는 아직 총이 없고 손 모양만 있다.
- sprite_001 스프라이트: 대기 1(`idle`, 185장, 200px/m 프레임 46×204, WebP `5fbafbb9…`)·대기 2(`wait`, 73장, 58×202, `84fb6170…`)를 200·100px/m로 추가했다(12fps, 제자리). 사격 동작 스프라이트는 총을 붙인 뒤 렌더하려고 아직 만들지 않았다.
- 대기 동작 렌더 다섯 명 합계 약 29분, 비용 없음. 다섯 명·원본의 같은 프레임 렌더 대조, 탭 표시·재생만 확인했고 동작은 사용자 검수 대기다.
