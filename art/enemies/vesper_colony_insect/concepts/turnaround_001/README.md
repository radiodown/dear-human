# 베스퍼 군락형 곤충 · 투명 배경 4방향 001

사용자 요청으로 [기존 컨셉 001](../illustration_001/README.md)을 기준으로 정면·후면·좌측면·우측면을 각각 생성했다. 배경 없는 **RGBA PNG 원본 4장**이며, 내장 `image_gen.imagegen`을 방향별 한 번씩 총 4회 사용했다.

| 방향 | 투명 PNG 원본 | 실제 생성 입력 |
|---|---|---|
| 정면 | [front.png](source/front.png) | [JSON](records/prompt_front.json) · [영어 MD](records/prompt_front.md) |
| 후면 | [back.png](source/back.png) | [JSON](records/prompt_back.json) · [영어 MD](records/prompt_back.md) |
| 좌측면 · 머리가 화면 왼쪽 | [left.png](source/left.png) | [JSON](records/prompt_left.json) · [영어 MD](records/prompt_left.md) |
| 우측면 · 머리가 화면 오른쪽 | [right.png](source/right.png) | [JSON](records/prompt_right.json) · [영어 MD](records/prompt_right.md) |

## 유지한 디자인

짙은 적갈색의 마모된 키틴 갑각, 뾰족한 판이 겹친 큰 머리, 작은 검은 눈 무리, 짧은 더듬이, 안쪽으로 굽은 큰턱, 여섯 관절 보행 다리, 옅은 회백색 연결 조직, 위로 치켜든 분절된 배를 기준으로 삼았다.

네 방향 모두 원래 전경 개체를 참고했다. 정면을 먼저 만들고 후면은 원화+정면, 좌측면은 원화+정면+후면, 우측면은 원화+앞뒤+좌측면을 참고해 이어 생성했다. 우측면도 별도로 생성했으며 좌측면 PNG를 단순 반전하지 않았다. 원본을 재인코딩·크롭·리사이즈·알파 후처리하지 않고 그대로 보존했다.

정면·후면은 각각 1536×1024, 양쪽 측면은 각각 1774×887이다. 생성된 방향별 캔버스와 알파를 유지했다. 파일 속 RGB에는 투명 영역의 잔여 색이 있을 수 있으므로 **알파 채널을 보존하는 뷰어·가져오기 방식**을 사용한다.

## 통합 미리보기

[앞뒤좌우 전체 보기](http://127.0.0.1:4173/#/samples/enemies/vesper_colony_insect?rev=turnaround_001)

같은 대상 페이지의 버전 선택에서 기존 원화와 새 4방향을 전환한다. 전체·정면·후면·좌측면·우측면 버튼과 `view=front`, `view=back`, `view=left`, `view=right` 주소를 사용한다. 미리보기는 저장된 PNG를 표시하며 새 이미지나 모션을 생성하지 않는다.

## 검토 범위와 남은 항목

원본/사본 해시, PNG 디코드, RGBA 알파와 투명 픽셀, 주요 불투명 윤곽의 프레임 여유를 확인했다. 각 파일의 실제 크기·알파 범위·해시·검토 결과는 [파일 검사 기록](records/file-verification.json)에 남겼다. 생성 호출 시각·입력 의존성은 [생성 기록](records/generation.json), 페이지 표시는 [브라우저 검토](reviews/browser.json)를 따른다.

앱 내 브라우저 연결이 실패해 별도 로컬 Chrome으로 확인했다. 네 방향 표시와 개별 버튼·주소 복원, 밝은/격자 배경, 기존 원화 복귀, 500px 갤러리를 확인했으며 페이지 오류는 없었다. [갤러리 화면](reviews/gallery.png) · [우측면 밝은 배경](reviews/right-light.png) · [500px 화면](reviews/gallery-500.png). 브라우저 확인 도구의 초기 CSP 대기/선택자 오류는 검토 스크립트에서 수정했으며 앱 소스나 보안 정책은 변경하지 않았다.

생성형 회전 시안이므로 방향 사이 갑각 분절·눈·관절·발의 세부와 몸통 비례가 완전히 같은 3D 형상으로 보장되지는 않는다. 후면과 가려진 반대편 구조는 원화에서 추정한 시안이며 최종 미감·해부학 채택은 사용자 검수 대기다. 정확한 정투영 모델링 도면이나 자동 정렬된 스프라이트 세트로 확정하지 않는다.

기존 컨셉 001 원본, 게임 적 `swarm_creature_melee`, 전투 수치·모션·3D 모델·리그·위키 설정은 변경하지 않는다.

