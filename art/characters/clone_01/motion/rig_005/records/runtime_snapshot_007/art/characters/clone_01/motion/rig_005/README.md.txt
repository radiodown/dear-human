# clone_01 · 파츠 모션 rig_005

현재는 [머리카락·의상·팔·장전 손과 사격 자세 06/07](../../../../../docs/29-secondary-motion-and-firing-stance.md)을 검토한다. [사격 미리보기](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=fire)에서 고개와 몸을 낮춰 총에 기대는 자세를, 이동에서 머리카락과 옷자락을 확인한다. 팔꿈치의 소매 연결과 전완 가림, 장전 손목·탄창 접점도 보정했다.

- [현재 레시피](records/secondary_and_fire_007.json) · [22개 수치 검사](tests/standing_fire_007/simulation-metrics.json) · [브라우저 검사](reviews/standing_fire_007/browser.json).
- 장전용 놓기·탄창 파지·조작부 손 그림 3종은 아직 없고 기존 받침 손을 임시 사용한다. 손 모양 교체와 추가 그림의 사양은 29번에 기록했다.
- 흉갑·어깨 판·전완 장갑을 보호하며 기존 원본 그림을 재사용한다. 플랜 B·이미지 원본·GIF는 변경하지 않았다. 전체 아트 채택은 사용자 검토가 남아 있다.

## 이전 05 기록

[구현·검증·한계](../../../../../docs/28-combat-walk-and-cape.md) · [이동 사격 미리보기](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=walk_fire)

골반을 낮추고 상체를 앞으로 기울이는 전투 보행과 지연되는 망토 모션이다. 플랜 B는 이번 변경 대상이 아니다. [rig_004 원본과 영어 JSON/MD 프롬프트](../rig_004/README.md)를 재사용하며 새 이미지를 생성하지 않았다.

- [리그 정의](rig/parts.json): 기존 원본 UV를 참조하고 머리의 회전 전달을 보정.
- [변경 레시피](records/recipe.json): 이전/현재 보행 값, 이미지 재사용과 도구 사용 범위.
- [시뮬레이션 수치](tests/simulation-metrics.json): 접지·견착·전투 자세·망토를 포함한 17개 검사.
- [브라우저 입력](reviews/browser-interactions.json): 재생·정지·연사·반전의 실제 화면 확인.
- [검토 기록](reviews/review.json): 캡처·코드 해시와 남은 한계.

현재는 한 장의 망토 그림을 길이가 고정된 여러 구간으로 변형한다. 크게 접혀 뒤집히는 별도 망토 그림은 아직 없다. 몸통·허리·하의는 기존 연결 의상 레이어를 유지한다. 시각적 최종 사용자 검수는 별도다.
