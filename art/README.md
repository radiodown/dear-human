# Dear Human 아트 보관함

[Plan D / face and hair 006](characters/clone_01/motion/plan_d/hair_006/README.md): current head, fringe and body-only hair contact. Scenery removed.

[플랜 B · 도트 단순화 003](characters/clone_01/motion/plan_b/pixel_walk_003/README.md): 장식과 명암을 줄인 기준 외형 1장·걷기 키포즈 4개. 기준 외형 채택 대기, 키포즈는 크기 일관성 실패로 보존하며 완성 보행은 없다.

[플랜 D · 무료 샘플/충돌 005](characters/clone_01/motion/plan_d/samples_005/README.md): 기존 몸에 외부 헤어 5개와 소품 6개, 유연한 헤어의 흔들림·근사 접촉. [외부 원본/라이선스](external/samples_005/README.md).

[플랜 D · 머리카락 004](characters/clone_01/motion/plan_d/hair_004/README.md): 논문·공개 구현 조사 후 가이드/카드/coverage를 도입했다. 별도 hair.glb·atlas·정면/옆/뒤 캡처를 보존하며 원화 품질 검수 대기다.

[플랜 D · clone_01 모델 초안 003](characters/clone_01/motion/plan_d/clone_model_003/README.md)에 실제 3D 곡면·21관절 가중치·15재질 GLB와 전신/얼굴/뒤쪽/보행 GPU 캡처를 보존했다. 형식 검사는 오류·경고 0이며 얼굴 닮음·세부 질감·천 충돌은 미완료다. [로컬 실행](../native/plan-d/README.md)에서 기본 표시하고 기존 마네킹과 비교한다.

[플랜 D · 로컬 3D](characters/clone_01/motion/plan_d/README.md)는 별도 네이티브 경로다. `preparation_001`에 중립 21개 관절 인체의 뼈대/도형/겹쳐 보기 GPU 캡처와 환경·개발 기록을 보존했다. 실행은 [native/plan-d](../native/plan-d/README.md)이며 이번 세 정지 화면의 렌더 확인과 채택 캐릭터 외형·완성 모션 검수는 구분한다.

[앉아쏴 보정 rig_017](characters/clone_01/motion/rig_017/README.md)은 사용자 채택 `kneeling_fire_001`을 기준으로 기존 무릎/정강이·스커트 UV를 분리하고 공통 리그의 자세·견착·바닥 망토를 수정했다. 새 원화 생성 없이 현재 rig_005에 연결했으며 `untested`·사용자 검수 대기다.

최신 손은 [rig_014](characters/clone_01/motion/rig_014/README.md)의 총열 감싸 쥔 손이다. 엄지는 반대편에 가려져 보이지 않으며 공통 rig_005에 연결했다. [M16 접점 014](weapons/m16_basic/rig_014/README.md)과 함께 사용자 검수 대기다. 사용자 지시로 추가 검사는 실행하지 않았다.

현재 파츠 보행은 [rig_005](characters/clone_01/motion/rig_005/README.md)다. rig_004의 이미지를 재사용하며 전투 자세·보폭·망토를 보정했다. 플랜 B는 별도 경로를 유지하고 이번 보정에서 변경하지 않았다.

- [Plan B · 2dimg2motion](characters/clone_01/motion/plan_b/README.md): M16 준비 보행 14프레임, 키포즈·중간 프레임 원본, 정확한 제출 프롬프트, PNG 시퀀스·시트·검수 기록. 기존 캐릭터 페이지의 ‘플랜 B · 걷기’에서 검토한다.

최신 채택 캐릭터는 검은 긴 머리·전술 갑옷·망토·3D 렌더 질감의 reference_003_3d다. 이전 제복과 중단된 시험 자료는 사용자 요청으로 삭제했다. 원본·파츠·프롬프트·리그 정의·검사 기록은 art 아래 대상·버전별로 모은다.

- characters/clone_01/concepts/reference_003_3d: 채택 원화, 제출 영어 JSON/MD, 사용자 참고 JSON/MD, 생성·채택 기록.
- characters/clone_01/motion/rig_002: 새 파츠 아틀라스, UV·재질 정의, 제출 프롬프트·생성 기록, 시뮬레이션 수치와 실제 웹 화면 캡처.
- [characters/clone_01/motion/rig_004](characters/clone_01/motion/rig_004/README.md): 현재 측면 기준 자세·새 파츠·견착 보정·영어 JSON/MD·검토 기록. rig_002는 사용자 반려 후 비교용으로 보존한다.
- weapons/m16_basic/rig_002: 독립 M16 본체/탄창 아틀라스, 실제 사용 데이터의 JSON 스냅샷, 제출 프롬프트·생성 기록.

[채택 원화](characters/clone_01/concepts/reference_003_3d/source/appearance.png) · [사용자 참고 JSON MD](characters/clone_01/concepts/reference_003_3d/records/user_reference.md) · [파츠 원본](characters/clone_01/motion/rig_002/source/parts_atlas.png) · [파츠 프롬프트 MD](characters/clone_01/motion/rig_002/records/prompt.md) · [M16 원본](weapons/m16_basic/rig_002/source/weapon_atlas.png) · [무기 프롬프트 MD](weapons/m16_basic/rig_002/records/prompt.md).

내장 이미지 생성 도구의 원본 출력을 수정하지 않고 사용한다. UV는 원본 좌표로 정의하며 이미지 바이너리를 game 아래 중복 복사하지 않는다. 코드·표시기는 game/animation 아래에서 공유한다. 실제 3D 모델은 없으며 이미지가 사실적인 3D 재질감을 가진다.

[캐릭터 모션](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=idle)과 [M16 샘플](http://127.0.0.1:4173/#/samples/weapons/m16_basic?motion=idle)은 같은 앱과 리그를 사용한다. 프로젝트 루트에서 python tools/preview_server.py --port 4173으로 실행한다. 페이지 방문·모션 전환에서 이미지 생성은 하지 않는다.

원화는 사용자 채택, 파츠·모션은 초안이다. 현재 구조·수치 검사와 웹 정지 캡처를 확인했으며 파지/가림 보정·전체 동작 검수·성능 측정·도구 최종 확정은 남아 있다. 상세 내용은 [24](../docs/24-motion-rig-test.md), 목록은 [asset_index](../game/public/assets/catalog/asset_index.json)를 따른다. 도구가 제공하지 않은 모델 ID·seed·비용과 측정하지 않은 수작업 시간은 null이다.

현재 공통 페이지는 rig_004를 사용한다. 최신 구현과 한계는 [26](../docs/26-side-parts-and-shoulder-contact.md)을 따른다. 과거 런타임 코드의 정확한 바이트는 해당 버전의 records/runtime_snapshot에 보존해 과거 검사 해시를 현재 코드와 혼동하지 않게 했다.

- [총구 조명 lighting_001](fx/muzzle_flash/lighting_001/README.md): 현재 발사 소켓과 타이머에 연결한 2D 셰이더 조명. 새 이미지·GIF 생성 없이 기존 캐릭터 페이지에 연결했으며 사용자 검수 대기다.
