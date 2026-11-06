# Dear Human 아트 보관함

최신 채택 캐릭터는 검은 긴 머리·전술 갑옷·망토·3D 렌더 질감의 reference_003_3d다. 이전 제복과 중단된 시험 자료는 사용자 요청으로 삭제했다. 원본·파츠·프롬프트·리그 정의·검사 기록은 art 아래 대상·버전별로 모은다.

- characters/clone_01/concepts/reference_003_3d: 채택 원화, 제출 영어 JSON/MD, 사용자 참고 JSON/MD, 생성·채택 기록.
- characters/clone_01/motion/rig_002: 새 파츠 아틀라스, UV·재질 정의, 제출 프롬프트·생성 기록, 시뮬레이션 수치와 실제 웹 화면 캡처.
- weapons/m16_basic/rig_002: 독립 M16 본체/탄창 아틀라스, 실제 사용 데이터의 JSON 스냅샷, 제출 프롬프트·생성 기록.

[채택 원화](characters/clone_01/concepts/reference_003_3d/source/appearance.png) · [사용자 참고 JSON MD](characters/clone_01/concepts/reference_003_3d/records/user_reference.md) · [파츠 원본](characters/clone_01/motion/rig_002/source/parts_atlas.png) · [파츠 프롬프트 MD](characters/clone_01/motion/rig_002/records/prompt.md) · [M16 원본](weapons/m16_basic/rig_002/source/weapon_atlas.png) · [무기 프롬프트 MD](weapons/m16_basic/rig_002/records/prompt.md).

내장 이미지 생성 도구의 원본 출력을 수정하지 않고 사용한다. UV는 원본 좌표로 정의하며 이미지 바이너리를 game 아래 중복 복사하지 않는다. 코드·표시기는 game/animation 아래에서 공유한다. 실제 3D 모델은 없으며 이미지가 사실적인 3D 재질감을 가진다.

[캐릭터 모션](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=idle)과 [M16 샘플](http://127.0.0.1:4173/#/samples/weapons/m16_basic?motion=idle)은 같은 앱과 리그를 사용한다. 프로젝트 루트에서 python tools/preview_server.py --port 4173으로 실행한다. 페이지 방문·모션 전환에서 이미지 생성은 하지 않는다.

원화는 사용자 채택, 파츠·모션은 초안이다. 현재 구조·수치 검사와 웹 정지 캡처를 확인했으며 파지/가림 보정·전체 동작 검수·성능 측정·도구 최종 확정은 남아 있다. 상세 내용은 [24](../docs/24-motion-rig-test.md), 목록은 [asset_index](../game/public/assets/catalog/asset_index.json)를 따른다. 도구가 제공하지 않은 모델 ID·seed·비용과 측정하지 않은 수작업 시간은 null이다.
