# clone_01 · 전투 보행과 망토 05

[구현·검증·한계](../../../../../docs/28-combat-walk-and-cape.md) · [이동 사격 미리보기](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=walk_fire)

골반을 낮추고 상체를 앞으로 기울이는 전투 보행과 지연되는 망토 모션이다. 플랜 B는 이번 변경 대상이 아니다. [rig_004 원본과 영어 JSON/MD 프롬프트](../rig_004/README.md)를 재사용하며 새 이미지를 생성하지 않았다.

- [리그 정의](rig/parts.json): 기존 원본 UV를 참조하고 머리의 회전 전달을 보정.
- [변경 레시피](records/recipe.json): 이전/현재 보행 값, 이미지 재사용과 도구 사용 범위.
- [시뮬레이션 수치](tests/simulation-metrics.json): 접지·견착·전투 자세·망토를 포함한 17개 검사.
- [브라우저 입력](reviews/browser-interactions.json): 재생·정지·연사·반전의 실제 화면 확인.
- [검토 기록](reviews/review.json): 캡처·코드 해시와 남은 한계.

현재는 한 장의 망토 그림을 길이가 고정된 여러 구간으로 변형한다. 크게 접혀 뒤집히는 별도 망토 그림은 아직 없다. 몸통·허리·하의는 기존 연결 의상 레이어를 유지한다. 시각적 최종 사용자 검수는 별도다.
