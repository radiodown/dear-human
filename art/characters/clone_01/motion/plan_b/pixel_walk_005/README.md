# 플랜 B · 다리 교차 005

[재생](http://127.0.0.1:4173/#/samples/characters/clone_01?plan=b&study=pixel_005&motion=walk) · [제작·검수 기록](../../../../../../docs/plan-b-pixel-walk-005.md)

004의 같은 다리 반복 문제를 고친 새 보행이다. 밝은 전경 A와 어두운 후경 B를 끝까지 같은 다리로 유지하고, 두 반주기에서 발 앞뒤 순서와 지지/회수 역할을 바꾼다. 05는 밝은 다리 지지·어두운 다리 교차, 11은 어두운 다리 지지·밝은 다리 교차다. 같은 페이지의 두 비교 버튼으로 바로 멈춰 볼 수 있다.

14장 PNG 중 00/13은 정지 기준이며, 실제 반복은 01~12의 걷기 포즈 12개다. `./run.sh`로 예제 서버를 실행한다. 004는 반려 기록으로 보존한다.

- `source/identity_003.png`: 원래 도트 외형 입력.
- `source/baseline_generated.png`, `source/baseline.png`: 다리 명암 구분을 추가한 새 생성 원본과 표준 기준.
- `source/*_edit_board.png`: 같은 크기/위치의 입력 보드.
- `source/keyposes.png`, `source/inbetweens_a.png`, `source/inbetweens_b.png`: 모델이 직접 생성한 다리 교차 포즈 원본.
- `output/fullframe/`, `output/keyframe/`, `output/spritesheet.png`, `output/manifest.json`: 같은 PNG 재생기에서 사용하는 데이터.
- `records/*_prompt.json`, `records/*_prompt.md`: 정확한 영어 제출 내용.
- `reviews/key-leg-alternation.png`, `reviews/browser-crossing-comparison.png`: 반대 다리 지지/교차의 원본 대조와 실제 페이지 표시.
- `reviews/rejection-of-004.json`: 사용자 반려와 이전 검수 누락 기록.
- `records/generation.json`, `records/packing.json`, `recipe/pack.py`: 도구·시간·입력·공통 후처리 레시피.

내장 image_gen 네 호출로 기준 명암·네 키포즈·여덟 중간 프레임을 생성했다. 로컬은 동일 셀 분리·공통 배율·미세 alpha 잡음 정리·패킹만 수행한다. 다리/포즈 변형·개별 크기/중심/발 높이 보정·미러링은 없다.

다리 교대/교차와 짧은 Chrome 재생은 확인했다. 약 3px 발 높이 변화·망토/윤곽 세부는 남으며 최종 모션·아트 채택은 사용자 검수 대기다. 엄격한 공식 발 기준선/GIF 납품 통과나 실제 물리 접촉을 주장하지 않는다. GIF는 만들지 않았다.
