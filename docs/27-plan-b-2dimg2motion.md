# 27. Plan B — 2dimg2motion 보행

최신 재생 가능한 도트 보행은 [도트 걷기 004](plan-b-pixel-walk-004.md)다. 003 기준 외형과 같은 크기의 입력 보드에서 모델이 키포즈·중간 프레임을 생성했고, 14프레임 PNG를 같은 페이지에 연결했다. 발 높이·망토·루프 연결은 검토 대기이며 아래 반려 기록은 이력으로 유지한다.

새 스타일 시도는 [도트 단순화 003](plan-b-pixel-003.md)에 별도 기록한다. 도트풍 기준 외형과 걷기 키포즈 4개를 만들었으며, 키포즈는 크기 일관성 실패로 반려했다. 아래 001/002의 과거 판정과 원본은 유지한다.

> 최신 판정: 사용자가 크기 불일치를 지적했다. `walk_001`은 **시각적 크기·비례 검수 실패**이며 아래 이전 PNG 구조·기능 통과는 아트 품질 통과를 뜻하지 않는다. 공식 사용법을 재확인하고 `walk_002` 키포즈를 한 차례 재생성했지만 비례 검사에서 반려했다. 수정된 14프레임 완성본은 아직 없다.

[문서 목록](../README.md) · [플랜 B 폴더](../art/characters/clone_01/motion/plan_b/README.md)

사용자가 2dimg2motion을 플랜 B로 명시하고 실행을 요청했다. 첫 결과는 **M16 준비 자세의 오른쪽 측면 제자리 보행 14프레임**이며, 기존 측면 기준 이미지 `rig_004/source/side_master.png`를 재사용했다. 플랜 B는 별도 `art/characters/clone_01/motion/plan_b/walk_001`에 저장한다.

## 실제 실행

[2dimg2motion 공식 저장소](https://github.com/WU-HAOTIAN34/2dimg2motion)의 커밋 `d4d73e243b6ff64b7cbb3879e45e951f972a7e62`를 `tools/vendor/2dimg2motion`에 가져와 해당 SKILL과 키포즈·중간 프레임 규약을 적용했다. 내장 image_gen으로 4개 공유 키포즈와 8개 중간 포즈를 전신 재생성했다. 이미지 모델 호출은 총 6회이며 첫 키포즈·첫 보정·첫 중간 B 시트는 다리 위상 반복 때문에 최종 납품에서 제외했다. 정확한 제출 영어 JSON과 같은 내용의 MD, 원본 시트와 재시도 기록을 별도로 보존한다.

Python/Pillow는 공식 기준 이미지 표준화, 셀 분리, 전체 프레임 공통 비율 축소, 고정 발 기준선 정렬, 거의 투명한 가장자리 정리, PNG 패킹에만 사용했다. 코드로 포즈·관절을 만들거나 보간하지 않았다. 00/13은 표준화한 기준 이미지와 동일하고, 02/05/08/11 키포즈는 시퀀스의 같은 번호와 동일한 파일이다. 최종 캔버스는 530×648, 발 기준선은 y=503, 기본 프레임 시간은 85ms다.

## 저장과 확인

- [납품 manifest](../art/characters/clone_01/motion/plan_b/walk_001/output/manifest.json), [14프레임 시트](../art/characters/clone_01/motion/plan_b/walk_001/output/contact-sheet.png), `output/fullframe`의 투명 PNG 14장과 `output/keyframe`의 키포즈 4장.
- [생성 기록](../art/characters/clone_01/motion/plan_b/walk_001/records/generation.json), [입력 분석](../art/characters/clone_01/motion/plan_b/walk_001/records/analysis.json), [정규화 기록](../art/characters/clone_01/motion/plan_b/walk_001/records/normalization.json).
- [PNG 구조 검사](../art/characters/clone_01/motion/plan_b/walk_001/reviews/structure.json), [브라우저 검사](../art/characters/clone_01/motion/plan_b/walk_001/reviews/browser.json).
- [같은 캐릭터 페이지에서 재생](http://127.0.0.1:4173/#/samples/characters/clone_01?plan=b&motion=walk). ‘플랜 B · 걷기’에서 일시정지·한 프레임 이동·스크러빙·속도·배경 변경을 지원한다.

기존 사용자 지시에 따라 GIF는 생성하지 않았다. 공식 검증기의 PNG 관련 검사를 재사용하며, GIF 존재·프레임 수·흰 배경 검사는 명시적으로 제외했다. 일반 호출로 공식 검증기의 전체 납품 검사가 통과했다고 주장하지 않는다. 재검사는 `python tools/plan_b_motion.py validate`, 별도 로컬 Chrome에서 페이지 검사는 `python tools/review_plan_b.py`다. 내장 브라우저는 연결 전 도구 오류로 실패해 별도 headless Chrome에서 확인했다.

## 현재 한계

프레임 생성·저장·페이지 재생 및 구조 검사는 완료했다. 얼굴·몸통 폭·망토의 세부가 일부 프레임에서 흔들리고, 기준 자세로 복귀하는 루프에 멈칫함이 남는다. 최종 아트 채택은 사용자 검토 대기다. 총이 전신 PNG에 포함되므로 이 버전만으로 무기 교체·분리 갑옷을 지원하지 않는다. 사격·장전·피격 등 추가 플랜 B 모션은 아직 생성하지 않았다. 자체 파츠 리그의 실제 게임 적용과 이번 PNG 시퀀스 결과는 구분한다.

## 크기 불일치 재검토

공식 main의 커밋이 보관본과 동일함을 확인하고 SKILL.md, keypose-redraw.md, motion-prompt-patterns.md, img2mo-std/SKILL.md를 다시 읽었다. 공식 규칙은 모델이 캐릭터 크기·중심을 바꾸거나 프레임별 크기/중심 맞춤이 필요한 경우 시트를 반려하고 다시 생성하도록 요구한다. 동일한 RGBA 캔버스와 파일 관계 검사는 이 시각 검수를 대체하지 않는다. [공식 지침](https://github.com/WU-HAOTIAN34/2dimg2motion/blob/main/SKILL.md).

walk_001의 12개 새 포즈에는 같은 배율 `360/484`를 적용했고 기준 이미지 00/13은 원본 그대로 사용했다. 개별 프레임을 따로 확대/축소한 것은 아니지만, 모델이 다시 그린 머리·몸통·총의 비례가 기준과 다른 것을 승인해 실제 크기가 튀는 결과를 만들었다. 또한 발 외곽에 맞춘 개별 y 이동은 원본 시트의 기준선 차이를 가렸다. 플레이어는 동일한 소스/목적 캔버스로 재생하므로 이 문제를 재생 화면의 자동 크기 변경으로 설명할 수 없다.

차기 키포즈 승인 조건에 기준 대비 머리, 어깨~벨트 길이, 흉갑 폭, M16 길이, 중심 위치 비교를 추가했다. 정상적인 무릎 굽힘·상하 움직임과 실제 확대/축소를 구분하고, 외곽 높이만으로 배율을 고르지 않는다. 키포즈 승인 전에 중간 프레임 생성을 진행하지 않는다.

- [walk_001 실패 판정](../art/characters/clone_01/motion/plan_b/walk_001/reviews/scale_rejection.json).
- [walk_002 공식 규약 재검토](../art/characters/clone_01/motion/plan_b/walk_002/records/official_review.json).
- [기준 이미지와 새 키포즈 대조](../art/characters/clone_01/motion/plan_b/walk_002/reviews/baseline-key-size-comparison.png), [새 키포즈 반려 판정](../art/characters/clone_01/motion/plan_b/walk_002/reviews/key-size-gate.json).
- [프로젝트 작업 지식](../img2mo-knowledge/failures.md): 다음 작업에서 적용할 실패 조건을 보관했다.

새 시도는 내장 이미지 생성 1회, 관측 도구 시간 38.5초다. 모델 ID·seed·실제 과금은 도구가 제공하지 않아 미기록이다. 원본·정확한 제출 JSON/MD·비교 시트를 보존하며 원래 제출 프롬프트는 수정하지 않았다.
