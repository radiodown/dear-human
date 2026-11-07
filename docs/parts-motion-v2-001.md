# 파츠 모션 V2 · 독립 프레임 클립 001

[같은 캐릭터 페이지 · V2](http://127.0.0.1:4173/#/samples/characters/clone_01?plan=parts-v2&motion=walk)에서 ‘파츠 모션 V2’ 탭을 선택한다. 사용자의 “동작을 연결하려하지말고 … 애니메이션 움직이듯 프레임동작” 요청에 따라 기존 LIVE 탭 옆에 별도로 추가했다.

각 동작은 자체 프레임 목록을 갖는다. 걷기에서 앉기로 바꾸면 앉기 첫 장으로 즉시 교체하고, 프레임 사이도 중간 자세 없이 다음 장이 될 때까지 유지한다. 이전/다음·프레임 번호·슬라이더는 정지한 한 장을 선택하며, 동작 기본 속도와 6/12/18/24fps·반복/한 번 재생을 제공한다. 한 번 재생은 마지막 장에서 정지한다. 첫 프레임·좌우 반전·0/12/20° 시점·망토 표시도 같은 화면에서 사용한다. 캔버스에 포커스한 뒤 Space·좌우 화살표로 조작한다.

| 동작 | 프레임 | 기본 fps |
|---|---:|---:|
| 견착 대기 / 완전 대기 / 앉기 | 각각 24 | 약 6.3 |
| 걷기 / 걸으며쏴 | 각각 14 | 12.5 |
| 달리기 / 뛰며쏴 | 각각 10 | 약 13.5 |
| 서서쏴 / 앉아쏴 | 각각 8 | 20 |

총 9개 동작·136프레임이다. 기본 속도는 대기의 3.8초 호흡, 걷기 1.12초·달리기 .74초 주기를 보존하고 정지 사격은 .4초 발사/복귀로 작성했다. 움직이는 사격은 두 발 디딤에 발사 프레임을 두었다. 표시되는 발사광·반동도 해당 장에 저장한 상태이며 실시간 발사 입력이나 탄약/명중 판정을 연결하지 않았다.

첫 버전의 포즈는 현재 공통 파츠 리그에서 오프라인으로 샘플링했다. [작성 도구](../art/characters/clone_01/motion/parts_v2/frame_clips_001/recipe/bake.mjs)가 동작마다 새 리그를 정착시킨 다음 각 포즈를 파일로 저장한다. 현재 팔·무릎·체형·스커트 수정과 원본 그림을 재사용하며 V2용 새 수작업 키포즈를 작성한 결과는 아니다. [목록](../art/characters/clone_01/motion/parts_v2/frame_clips_001/clips/manifest.json)과 리그 정의 사본도 버전별로 보존했다. 브라우저 방문은 저장된 선택 동작만 읽고, 전체 프레임 생성이나 전체 렌더를 실행하지 않는다.

`PartsFramePlayer`는 선택 인덱스와 유지 시간만 갱신하고 공통 `WebGLCharacter`로 저장 포즈를 표시한다. 재생 중 `CharacterRig.step()`이나 동작 간 블렌딩을 호출하지 않는다. 다른 탭이나 숨긴 페이지에서는 진행을 멈춘다. V1 LIVE와 플랜 B/C·원본·GIF는 그대로다. V1 자세 조절 저장값을 V2의 고정 포즈에 적용하지 않는다.

주소의 `plan=parts-v2`, `motion`, `frame`(0부터), `paused=1`, 선택 `fps`·`loop=0`·`face=left`·`viewPitch`로 같은 프레임을 복원한다. 예: [달리기 5번째 장 정지](http://127.0.0.1:4173/#/samples/characters/clone_01?plan=parts-v2&motion=run&frame=4&paused=1). 최초 탭 진입은 걷기이며 동작 변경은 항상 첫 장에서 시작한다.

필요한 변경 JS 구문, 136개 저장 포즈의 접점과 클립 계약, 프레임 유지/정지/되감기/반복/한 번 재생을 짧게 확인했다. Chrome에서는 9개 클립 첫 장, 고정 프레임 픽셀 일치, 짧은 재생 중 LIVE 스텝 호출 0회, 직접 주소 복원·원래 탭 복귀·500px 화면을 확인했다. [수치 기록](../art/characters/clone_01/motion/parts_v2/frame_clips_001/tests/discrete-frames.json) · [Chrome 기록](../art/characters/clone_01/motion/parts_v2/frame_clips_001/reviews/browser.json) · [데스크톱](../art/characters/clone_01/motion/parts_v2/frame_clips_001/reviews/v2-walk-desktop.png) · [작은 화면](../art/characters/clone_01/motion/parts_v2/frame_clips_001/reviews/v2-kneel-narrow.png).

변경 전 앱/HTML/CSS/package는 해당 버전의 `records/before`에 보존했다. 전체 검사나 문서/목록 검사, 새 래스터/GIF 생성은 없다. 재생 방식은 연결했으며 개별 포즈의 자연스러움·프레임 수/타이밍·반복 끝과 시작의 연결은 사용자 검수 대기다.
