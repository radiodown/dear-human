# Plan B — 2dimg2motion

최신 시도는 [도트 단순화 `pixel_walk_003`](pixel_walk_003/README.md)다. 장식·재질 세부를 줄인 기준 외형 1장과 걷기 키포즈 4개를 생성했다. 기준 외형 채택은 사용자 검수 대기이며 키포즈는 머리·상체·총의 크기 변화로 반려해 중간 프레임은 만들지 않았다. [같은 페이지](http://127.0.0.1:4173/#/samples/characters/clone_01?plan=b&study=pixel_003)에서 새 정지 이미지와 이전 보행 기록을 선택한다.

최신 판정: `walk_001`은 기준 이미지와 머리·몸통·총 비례가 달라 **크기 검수 실패**다. `walk_002`에서 공식 규약을 재학습하고 키포즈 1시트를 재생성했지만 동일 비례 검사를 통과하지 못했다. 두 시도는 실패 기록이며 크기가 보정된 완성 모션은 아직 없다. 재검토 기준은 프로젝트 `img2mo-knowledge/failures.md`, 실제 판정은 각 버전의 `reviews`에 보관한다.

사용자 지시로 플랜 B를 가동했다. 2dimg2motion의 **전신 키포즈 재생성 → 모델 중간 프레임 → 투명 PNG 시퀀스** 경로를 사용한다.

- 첫 작업: `walk_001`, M16 준비 자세의 오른쪽 측면 제자리 보행 14프레임.
- 입력: 기존 `rig_004/source/side_master.png`를 재사용하며, 채택 외형은 `reference_003_3d`다.
- 도구: [2dimg2motion](https://github.com/WU-HAOTIAN34/2dimg2motion), 커밋 `d4d73e243b6ff64b7cbb3879e45e951f972a7e62`.
- 이미지 제작은 내장 image_gen, 로컬 Python/Pillow는 표준화·셀 분리·동일 비율 정리·패킹·검사에만 사용한다.
- 원본과 프롬프트·실제 생성 기록은 `walk_001/source`와 `walk_001/records`, 납품 프레임은 `walk_001/output`에 구분한다.
- 기존 사용자 지시에 따라 GIF는 생성하지 않고 공통 캐릭터 페이지에서 PNG 프레임을 재생한다.
- 플랜 A 파츠 리그 및 기존 채택 파일을 대체하지 않는다. 이 버전은 총이 전신 프레임에 포함된 플랜 B 검토본이다.

진행 상태와 검수는 `walk_001/records/generation.json` 및 `walk_001/reviews`에 기록한다.
