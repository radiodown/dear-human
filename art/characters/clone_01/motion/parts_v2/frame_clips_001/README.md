# 프레임 클립 001

[V2 미리보기](http://127.0.0.1:4173/#/samples/characters/clone_01?plan=parts-v2&motion=walk) · [적용 기록](../../../../../../docs/parts-motion-v2-001.md) · [레시피](recipe/recipe.json) · [인계](records/handoff.json).

기존 파츠 리그에서 동작마다 독립적으로 저장한 9개 클립·136개 포즈를 프레임 단위로 표시한다. 프레임 간 보간/동작 전환 없이 번호 선택·단계 이동·속도·반복/한 번 재생을 사용한다. 현재 원본/손/무릎/보행을 재사용한 첫 초안이며 V2의 새 수작업 포즈는 아니다.

- `clips/`: 프레임 포즈 JSON, 리그 정의 사본, 목록/소스 해시.
- `recipe/bake.mjs`: 명시적으로 실행하는 오프라인 작성. 페이지 방문으로 실행하지 않는다.
- `recipe/check.mjs`, `tests/`: 짧은 클립/이산 재생 확인.
- `recipe/review.py`, `reviews/`: 필요한 Chrome 재생/UI·500px 확인.
- `records/before/`: 변경 전 표시 앱 소스.

프레임 뷰어의 동작 검사는 통과했으며 개별 자세·루프·연출 타이밍은 사용자 아트 검수 대기다. 원본 PNG·V1/플랜 B/C·GIF·과거 검수 기록은 변경하지 않는다.
