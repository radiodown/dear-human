# samples_005 · 무료 샘플 / 흔들림 / 충돌

[실행](../../../../../../native/plan-d/run.command) · [상세 기록](../../../../../../docs/plan-d-samples-005.md) · [외부 원본/라이선스](../../../../../external/samples_005/README.md)

기존 몸/얼굴/21관절에 Quaternius 무료 헤어 5개와 Kenney 소품 6개를 연결했다. N으로 기존 헤어 포함 6슬롯을 순환한다. P 물리 / U 바람 / C 충돌 / B 장애물 왕복 / T 구·상자 전환. 기본 화면은 전신이다.

- [최종 전신](reviews/long-full-final.png)
- [헤어 6슬롯 초기 비교](reviews/hair-contact-sheet-initial.png): 원본 장착 확인, 짧은 머리 고정 정책 적용 전.
- [외부 Long + 구](reviews/long-sphere-contact.png)
- [기존 004 + 상자](reviews/original-box-contact.png)
- [집중 코어 확인](records/physics-check.txt)
- [변경 전](records/runtime-before.tar.gz)
- [제작 기록](records/recipe.json) / [인계](records/handoff.json)

Windows/macOS 공통 C++ 코어이며 실제 실행 확인은 Mac Metal에 한정한다. 가이드 기반 근사 접촉·바람·관성 초안으로, 원화 수준 완성·모발끼리 충돌·정밀 천/강체 물리·Windows 검증 완료가 아니다. 사용자 검수 대기.
