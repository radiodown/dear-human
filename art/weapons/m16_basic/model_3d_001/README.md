# M16A1 · 3D 모델 001

- 사용자 지시(2026-11-11): “무기 모델링 탭 따로 만들어서 보여줘”. 앞선 결정으로 사격 동작은 Mixamo FBX를 옮기는 방식(A)이며, 이 모델은 그 동작에 붙일 총의 첫 번째다.
- 형상: 플랜 E [sprite_007](../../../characters/clone_01/motion/plan_e/sprite_007/README.md)에서 `tools/plan_e/render_sprites.py`로 만든 M16A1(실제 치수: 개머리판 끝 −0.345m ~ 총구 0.645m, 20인치 총열, 길이 0.997m)의 부품 목록·재질·베벨을 [`tools/weapons/build_weapon_glb.py`](../../../../tools/weapons/build_weapon_glb.py)로 그대로 옮겨 탄창까지 붙인 독립 GLB다. 렌더 스크립트는 불러오는 순간 장면 전체를 만들기 때문에 import하지 않고 형상 코드를 복사했다(이름만 `plan_e_` → `m16_`/`m16a1_`).
- 재질 4종: 리시버(아노다이즈 알루미늄)·수지(개머리판·손잡이·총열 덮개)·강철(총열·가늠쇠)·밝은 소부품(핀·레버·가늠쇠 기둥). 1.6mm 모서리 베벨은 내보낼 때 적용된다.
- 좌표: Blender에서 +X 총구, +Z 위, −Y가 총의 왼쪽(노리쇠 멈치·조정간이 보이는 면). glTF로 내보내면 +Z 위가 +Y 위로 바뀐다.
- 기준점(빈 노드 `socket_*`, 총 기준 좌표 m): `socket_grip` 권총 손잡이(−0.022, 0, −0.075, 오른손 손바닥) · `socket_support` 총열 덮개 아래(0.31, 0, 0.004, 왼손) · `socket_stock` 개머리판 끝 중앙(−0.348, 0, −0.01, 어깨) · `socket_muzzle` 총구(0.645, 0, 0.034, 화염 위치) · `socket_mag` 탄창 구멍(0.122, 0, −0.04). 캐릭터 손에 붙일 때 이 점들을 기준으로 맞춘다.
- 결과: `m16a1.glb`. 삼각형은 웹 표시 기준 7,616개(베벨 적용 후), Blender 원본 다각형 기준 1,792개. 명령 `blender -b --python tools/weapons/build_weapon_glb.py -- art/weapons/m16_basic/model_3d_001/m16a1.glb`, 약 3초, 비용 없음.

## 웹 탭 (‘무기 모델 3D’)

- M16 무기 페이지(`#/samples/weapons/m16_basic?plan=weapon-3d`)에 새 탭을 추가했다(`game/weapon-model-lab.js`, Three.js 0.187.0, 탭을 열 때만 불러옴). 무기 목록 버튼(지금은 M16A1 하나, `WEAPONS` 표에 추가하면 늘어남), 자동 회전·끌어서 돌리기, ‘측면 (총구 →)’(총의 왼쪽 면, 스프라이트 카메라가 보는 면)·‘반대쪽’·‘위에서’, 기준점 표시(색깔 점과 범례), 배경 밝기, 주소 복원(`weapon3d`·`sockets`·`spin`·`bg`).
- 내장 브라우저에서 불러오기·측면 방향·기준점 위치·배경 전환만 확인했다. 아직 캐릭터 손에 붙이지 않았고 대원별 무기(위키 원화 `art/weapons/wiki_concepts_001`)는 3D로 만들지 않았다. 외형은 사용자 검수 대기다.
