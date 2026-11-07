# 플랜 B · 전투 모션006

[이동 사격 재생](http://127.0.0.1:4173/#/samples/characters/clone_01?plan=b&study=combat_006&motion=walk_fire) · [앉아쏴 재생](http://127.0.0.1:4173/#/samples/characters/clone_01?plan=b&study=combat_006&motion=kneel_fire) · [제작·검수 기록](../../../../../../docs/plan-b-combat-006.md)

005 도트 캐릭터로 새로 생성한 두 전투 모션이다. 같은 캐릭터 페이지에서 동작을 선택하고 발사 자세·다음 반동 프레임을 비교한다. 예제 서버는 `./run.sh`로 실행한다.

- `walk_fire/`: 양발 교차를 유지한 이동 사격. 02/08 발사, 어깨/흉곽 반동과 복귀·머리/망토 지연 반응.
- `kneel_fire/`: 무릎·앞발로 낮게 지지하는 앉아쏴 반복. 05/11 발사, 견착·상체 반응과 바닥 망토.
- 각 `output/fullframe/`: 512×512 RGBA 14장. 00/13은 동일 기준, 실제 반복은01~12의12포즈.
- 각 `output/keyframe/`, `spritesheet.png`, `contact-sheet.png`, `manifest.json`: 같은 PNG 재생기의 입력.
- 각 `records/*_prompt.json`와 같은 이름의 MD: 정확한 영어 제출 내용. `output/keyframe-prompts.md`는 채택한 키포즈 제출본이다.
- 각 `source/`: 원본·기준·입력 보드·채택/반려 시트. `attempt01`은 실패 기록이다.
- 각 `reviews/`: 크기/자세 대조·PNG 검사·실제 Chrome 발사/반동 캡처.
- 공통 `records/generation.json`: 내장 image_gen9회(실패 포함), 실제 도구 시간·입력/출력 해시. 미제공 과금/모델/seed는 null.
- `recipe/pack.py`, `review_png.py`, `record.py`: 공통 셀 분리·패킹·범위를 제한한 PNG 확인·목록 등록. 포즈를 합성하거나 변형하지 않는다.

실제 Chrome 재생은 확인했으며 최종 아트 검수는 대기다. 발 높이 차이(이동 사격4px/앉아쏴3px)와 망토/윤곽 세부 변화가 남는다. 서기↔앉기 전환·실제 전투 판정·독립 무기 교체·천/모발 충돌은 구현하지 않았다. 총/발사광/조명은 PNG에 포함되며 고정 팔레트 최종 게임 도트나 전체 공식 GIF 납품 통과로 보지 않는다. GIF는 생성하지 않았다.
