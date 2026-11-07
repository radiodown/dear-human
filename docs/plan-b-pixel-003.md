# 플랜 B · 도트 단순화 003

[문서 목록](../README.md) · [산출물](../art/characters/clone_01/motion/plan_b/pixel_walk_003/README.md) · [같은 캐릭터 페이지](http://127.0.0.1:4173/#/samples/characters/clone_01?plan=b&study=pixel_003)

사용자의 “플랜 B에서 요소를 도트적으로 줄여 시도” 요청에 따라 기존 상세 측면 외형을 도트풍으로 다시 그렸다. `pixel_walk_003`은 새 스타일 시험이며 채택 외형이나 플랜 A/C/D를 교체하지 않는다. 이전 `walk_001`·`walk_002`의 실패 기록도 유지한다.

긴 검은 머리·창백한 얼굴·검정/건메탈 갑옷·망토·M16은 남겼다. 머리핀·땋은 머리·독수리 문양·자수·직물 무늬·스크래치·리벳·다중 파우치·작은 버클을 없애고, 머리는 큰 덩어리, 갑옷은 넓은 판, 스커트는 몇 개 패널로 줄였다. 넓은 색 덩어리와 계단형 외곽선을 사용했다. 고정된 24색 팔레트나 단일 논리 픽셀 격자를 강제한 게임용 최종 스프라이트는 아니다.

## 실제 결과

내장 `image_gen` 두 번으로 도트풍 기준 외형 1장과 걷기 키포즈 4개를 한 시트로 만들었다. 프롬프트는 영어 JSON과 정확히 같은 MD로 보존했다. 첫 입력은 기존 `rig_004/source/side_master.png`, 키포즈 입력은 새 도트 기준을 공통 1/4 배율·nearest-neighbor로 줄이고 고정 여백을 둔 `output/baseline.png`다. 이 기준 표준화는 키포즈 생성 전에 수행했다.

- [기준 외형](../art/characters/clone_01/motion/plan_b/pixel_walk_003/output/baseline.png): 512×512 RGBA, 원본 1024×1536도 보존.
- [걷기 키포즈 원본](../art/characters/clone_01/motion/plan_b/pixel_walk_003/source/keyposes.png): 1254×1254 RGBA, 02/05/08/11 순서의 2×2 시트.
- [동일 배율 크기 대조](../art/characters/clone_01/motion/plan_b/pixel_walk_003/reviews/baseline-key-comparison.png): 시트 전체에 공통 배율만 사용하며 개별 프레임 크기/중심/발 기준선 보정은 없다.
- [시각 판정](../art/characters/clone_01/motion/plan_b/pixel_walk_003/reviews/visual.json), [생성·시간 기록](../art/characters/clone_01/motion/plan_b/pixel_walk_003/records/generation.json).

도트 외형의 장식 단순화는 확인했다. **키포즈는 기준보다 머리·상체·총이 커지고**, 05/11의 지지 다리 교대도 명확하지 않아 반려했다. 머리·흉갑·어깨~벨트·M16 비교 조건을 충족하지 못했으므로 중간 프레임·14프레임·스프라이트시트·GIF를 만들지 않았다. 단순화만으로 크기 일관성이 해결됐다고 보고하지 않는다. 기준 외형 자체의 아트 채택은 사용자 검수 대기다.

## 미리보기와 검수 범위

같은 캐릭터 페이지의 ‘플랜 B · 도트 시도’에서 기준 외형·반려한 키포즈·이전 보행 기록을 선택한다. 새 두 보기는 정지 이미지다. 표시 크기와 밝게/어둡게/격자 배경, 기존 상세 외형과의 비교를 제공한다. 기존 `?plan=b&motion=walk`는 이전 14프레임 기록을 계속 표시한다.

이미지·크기 대조와 이 페이지의 짧은 macOS Chrome 표시 확인을 수행했다. 새 기준/키포즈 로드·실패 표시·크기/배경 조절·이전 보행 진입·500px 폭·기준 외형 복귀를 확인했고 페이지 오류는 없었다. 수정한 두 JavaScript 파일의 구문도 확인했다. 전체 게임 테스트·다른 플랜의 재검수는 실행하지 않았다. [브라우저 기록](../art/characters/clone_01/motion/plan_b/pixel_walk_003/reviews/browser.json)의 표시 통과, 키포즈의 시각적 실패, 사용자 스타일 채택 대기를 구분한다.
