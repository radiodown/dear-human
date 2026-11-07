# 플랜 B · 도트 단순화 003

[기록](../../../../../../docs/plan-b-pixel-003.md) · [미리보기](http://127.0.0.1:4173/#/samples/characters/clone_01?plan=b&study=pixel_003)

상세 외형을 도트풍으로 줄인 **기준 이미지 + 걷기 키포즈 시험**이다. 장식·재질 세부를 줄이고 긴 머리·검은 갑옷·망토·M16 실루엣을 유지했다. 외형 채택은 사용자 검수 대기다.

키포즈는 기준보다 머리·상체·총이 커져 반려했다. 지지 다리 교대도 불명확하다. 완성 보행·중간 프레임·GIF는 없으며 실패한 시트를 동작 완성본으로 재생하지 않는다.

- `source/baseline_generated.png`: 내장 이미지 생성 원본.
- `output/baseline.png`: 생성 전에 공통 1/4 배율과 고정 여백을 적용한 새 기준.
- `source/keyposes.png`: 모델이 함께 그린 키포즈 4개 원본.
- `reviews/baseline-key-comparison.png`: 개별 크기/중심 맞춤 없는 동일 셀 비교.
- `records/*_prompt.json`, `records/*_prompt.md`: 정확한 영어 제출 내용.
- `records/generation.json`, `records/normalization.json`: 도구·시간·표준화 기록.
- `recipe/prepare.py`: 기준 표준화와 비교판 패킹만 수행. 포즈 생성/변형 없음.
- `records/runtime_snapshot_before_pixel_003`: 변경 전 미리보기 코드·목록 보존.

기존 채택 외형과 `walk_001`·`walk_002`, 플랜 A/C/D는 별도 유지한다. 원본 출력의 픽셀 크기·색상 수를 재양자화하지 않았으므로 최종 고정 팔레트 게임 스프라이트로 보지 않는다.
