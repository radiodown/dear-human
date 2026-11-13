# 플랜 F · GLB 캐릭터 로딩 수정 002

2026-11-13 · 사용자 오류 보고: “훈련장을 불러오지 못하겠데”.

[플랜 F 열기](http://127.0.0.1:4173/#/samples/characters/clone_01?plan=f)

001에서 실제 Chromium으로 `Hips` 뼈대를 찾을 수 없다는 예외를 재현했다. GLTFLoader가 glTF 노드 이름의 콜론을 지워 `mixamorig:Hips`를 `mixamorigHips`로 바꾸는데, 캐릭터 연결 코드는 콜론으로만 접두사를 분리하고 있었다.

`game/plan-f/glb-character.js`에서 콜론 유무에 관계없이 `mixamorig`와 뒤에 붙는 숫자 접두사를 제거해 관절 이름으로 등록한다. 모델·텍스처·F 동작·무기·배경은 그대로 사용한다.

내장 브라우저는 연결 단계에서 sandboxPolicy 오류가 나 설치된 Playwright Chromium으로 확인했다. 서버 CSP를 유지한 채 최초 로딩·새로고침, 단발 1발/29발 잔탄, 장전 진행과 완료 후 30발 복귀, 앉기 선택, 중립 보기와 전투 복귀를 확인한다. 검사 결과는 [browser.json](reviews/browser.json), 실제 로딩 화면은 [loaded.png](reviews/loaded.png), 중립 화면은 [neutral.png](reviews/neutral.png)에 기록한다. 최초 추가 조작 검사에서 문자열 기반 대기 함수가 CSP에 막혀 locator assertion으로 교체했다. 사이트의 CSP는 바꾸지 않았다.

이번 사용자 오류 보고에 필요한 로딩/기본 조작 검사만 수행한다. 전체 모션·천 충돌·손가락 접촉·미감 채택을 의미하지 않는다. 이전 001의 소스·검수 상태는 유지하고, 002 변경 전후 소스와 해시는 `before/`, `source_snapshot/`, `record.json`에 남긴다.
