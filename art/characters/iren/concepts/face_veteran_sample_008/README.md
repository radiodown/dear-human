# 아렌 · 전장 경험·깔끔한 단발 얼굴 샘플 008

사용자 피드백: 이전 007이 못되게 보이고 얼굴이 마음에 들지 않는다. 오래 전장을 겪은 경험 많은 인상, 뽀샤시한 표현보다 자연스러운 질감, 더 깔끔한 단발을 원한다.

- [검토용 시안](source/portrait.png): 검정·금장 전투복을 유지한 상반신 얼굴·헤어 수정. 정돈된 흑발 생머리 원랭스 단발·한쪽 귀 노출, 자연스러운 피부 질감·차분한 시선을 목표로 했다.
- [첫 출력](source/first-pass.png)은 단발을 정리했지만 이전 얼굴 인상이 많이 남아 두 번째 생성에서 얼굴형·눈·코·입 재설계를 다시 요청했다. 최종 출력도 얼굴 변화 정도·미모·전장 경험의 표현은 사용자 검수 대기다.
- 내장 image_gen 2회. 두 출력 모두 원본 바이트 그대로 저장했다. 정확한 모델명·비용은 도구에서 제공되지 않았다.
- [첫 영어 JSON](records/prompt.json) · [첫 영어 MD](records/prompt.md) · [재수정 영어 JSON](records/prompt-face-revision.json) · [재수정 영어 MD](records/prompt-face-revision.md) · [실제 시간·해시](records/generation.json).
- 공통 미리보기: `http://127.0.0.1:4173/#/samples/characters/iren?rev=face_veteran_sample_008`.
- [해당 시안 표시 확인](reviews/verification.json). 기존 전신 005·위키 전신과 얼굴 아이콘·다른 대원·모션·게임 구현은 유지했다.
- 얼굴·헤어 시안이며 새 흉터·부상·추가 전투 이력·계급·국적·혈통을 확정하지 않는다. 007은 반려된 이전 시안으로 보존한다.
