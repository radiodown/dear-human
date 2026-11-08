# 무료 외부 샘플 원본 · 005

2026-11-07, Dear Human 플랜 D. 사용자 선택: 무료 공개 에셋부터 도입. 구매비 0.

사용자 요청으로 실행에 쓰지 않는 다운로드 ZIP·중복 원본·소품은 프로젝트 루트의 `tmp/art/external/samples_005/source/`로 이동했다. `tmp/`는 Git에서 제외하며 파일은 로컬에 보존한다. 현재 N 비교에서 사용하는 헤어 5종과 텍스처는 `native/plan-d/assets/samples/hair/`에 유지한다. 아래 `tmp/` 경로는 프로젝트 루트 기준이다.

- `tmp/art/external/samples_005/source/quaternius/Universal-Base-Characters-Standard.zip`: Quaternius 공식 itch.io 무료 Standard 다운로드(무료 업로드 15861669). 원본 ZIP 128,968,391 bytes. [제품](https://quaternius.com/packs/universalbasecharacters.html), [배포](https://quaternius.itch.io/universal-base-characters).
- `source/quaternius/Universal Base Characters[Standard]/License_Standard.txt`: ZIP에 동봉된 CC0 1.0 고지.
- `tmp/art/external/samples_005/source/quaternius/hair/`: ZIP의 `Hairstyles/Origin at 0/glTF (Godot)/`를 수정 없이 추출한 원본. 런타임은 Long/Buns/SimpleParted/BuzzedFemale/Buzzed와 BaseColor 2개만 사용한다. 수염/눈썹·노멀맵은 런타임에 연결하지 않았다.
- `source/kenney/`: [Kenney 공식 저장소](https://github.com/KenneyNL/Starter-Kit-3D-Platformer/tree/3fa8a04b1c01ab23db43123d4ce814a34c3fc7f0)의 README/LICENSE는 유지한다. 현재 제거된 소품 모델 6개와 colormap은 `tmp/art/external/samples_005/source/kenney/models/`에 보관한다. 실패한 다운로드 파일 `kenney_furniture-kit.zip`도 `tmp/`의 같은 상대 경로로 이동했다.
- [`native/plan-d/assets/samples`](../../../native/plan-d/assets/samples): 선택한 원본 파일과 라이선스의 런타임 복사본. 실행 시 네트워크 다운로드를 하지 않는다.
- [`native/plan-d/third_party/cgltf`](../../../native/plan-d/third_party/cgltf): MIT glTF 로더, 고정 commit 85cd62382dfea638278962690cf515023f33ed00 및 LICENSE.
- `sources.json` / `sha256.txt`: 출처·고정 버전·파일 해시. `sha256.txt`의 원래 획득 경로는 보존하며, 이동한 파일은 기존 프로젝트 경로 앞에 `tmp/`를 붙이면 찾을 수 있다. 라이선스와 README는 기존 경로에 유지한다.

상용 사용을 허용하는 무료 자료의 도입이다. 유료 Source 팩·Hair Tool·Character Creator·MetaHuman·Filament·TressFX·Jolt를 구매하거나 통합한 결과가 아니다. 자체 기존 몸/얼굴을 유지하며 외부 인체로 교체하지 않았다.
