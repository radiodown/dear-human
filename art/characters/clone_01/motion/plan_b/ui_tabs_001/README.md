# 플랜 B · 동작 탭001

[같은 캐릭터 페이지](http://127.0.0.1:4173/#/samples/characters/clone_01?plan=b)에서 드롭다운을 없애고 파츠 모션과 같은 버튼형 탭으로 동작을 전환한다.

경계 걷기·경계 이동 사격·앉아쏴·기본 걷기·기본 이동 사격은 위에 바로 표시한다. 기준 외형과 반려한 버전은 ‘이전 버전·기준 외형’을 펼쳐 볼 수 있다. 이전 버전의 직접 주소로 들어오면 해당 탭을 표시하고 펼친다. 선택한 버튼은 aria-pressed로 강조하며 원래 주소 형식과 재생 조작을 재사용한다.

game/index.html·plan-b-lab.js·styles.css만 변경했다. 변경 전 세 소스는 records/runtime_snapshot_before에 보존했다. 기존 PNG·manifest·생성 프롬프트·카탈로그와 과거 검수 기록은 변경하지 않았다. 새 이미지 생성과 GIF 출력은 없다.

필요한 JS 구문과 [Mac Chrome UI 확인](reviews/browser.json)을 수행했다. [데스크톱](reviews/desktop.png)·[500px 표시](reviews/narrow.png), 주요 동작 탭·선택 강조·주소·이전 버전·키보드 전환만 확인했다. 전체 게임·문서/목록 검사 묶음과 모션 아트 재검수는 하지 않았다. 검토 도중의 기대값 수정과 초기 준비 대기 타임아웃·직접 재진입 확인은 browser.json에 구분해 남겼다.
