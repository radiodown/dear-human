# 10. 공식 참고 자료와 조사 범위

[문서 목록](../README.md) · 확인일 2026-11-06

공식 문서·저장소 소스를 확인했다. 도구 설치, 이미지 생성, 실제 렌더·웹 빌드·브라우저 성능 실험은 아직 하지 않았다. 아래 링크는 확인 당시 자료이며 실제 착수 시 버전·커밋을 고정한다.

## 1. 웹 엔진·빌드

- [Phaser 4 배포 목록](https://phaser.io/download/phaser4): 확인한 버전 4.2.1.
- [Phaser 4.2의 Mesh2D·Spine 연동](https://phaser.io/news/2026/07/phaser-4-2-spine-renderer-mesh2d-stencil).
- [Phaser 4.2.1 Mesh2D 소스](https://github.com/phaserjs/phaser/blob/v4.2.1/src/gameobjects/mesh2d/Mesh2D.js): 정점·UV·프레임 처리와 WebGL 조건.
- [Arcade Physics](https://docs.phaser.io/phaser/concepts/physics/arcade): 단순 이동·충돌의 후보.
- [Phaser Particles](https://docs.phaser.io/phaser/concepts/gameobjects/particles): 재사용 입자와 수명·운동 제어.
- [Vite 시작 안내](https://vite.dev/guide/): TypeScript 프로젝트·개발 서버·정적 빌드.
- [PixiJS 8 Mesh](https://pixijs.com/8.x/guides/components/scene-objects/mesh): 대체 렌더러의 국소 변형 기능.
- [Godot Web 내보내기](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html): 비교 대안. 현재 기본안은 Phaser다.

## 2. 모션·리깅

- [2dimg2motion 저장소](https://github.com/WU-HAOTIAN34/2dimg2motion), [README](https://github.com/WU-HAOTIAN34/2dimg2motion/blob/main/README.md): 기준 이미지·생성 프레임·납품·구조 검사.
- [Spine Physics Constraints](https://esotericsoftware.com/spine-physics-constraints): 보조 모션의 리그 경로.
- [Spine Slots](https://esotericsoftware.com/spine-slots): 무기 attachment와 draw order.
- [Spine IK Constraints](https://esotericsoftware.com/spine-ik-constraints): 팔 2본과 손 목표, 순환 의존 방지.
- [spine-phaser 공식 런타임](https://esotericsoftware.com/spine-phaser): Phaser 4·런타임·에디터 버전 조합.
- [Spine 에디션 비교](https://esotericsoftware.com/spine-purchase): 메시·물리 제약을 사용할 때의 에디션 선택.
- [Live2D Cubism Web SDK](https://www.live2d.com/en/sdk/download/web/), [물리 설정](https://docs.live2d.com/en/cubism-editor-manual/physics-operation/): 일러스트 변형 대안.
- [Aseprite 시트](https://www.aseprite.org/docs/sprite-sheet/), [Krita 레이어·마스크](https://docs.krita.org/en/reference_manual/layers_and_masks.html): 보정·분리 원본 작업.
- [25. 인체 모션 데이터·연구 조사](25-human-motion-research.md): 100STYLE·CMU·Mixamo 등 공식 출처와 이용 조건, 발 접지·관성화·Motion Matching의 현재 2D 리그 도입안. 데이터 이식·품질 검증은 후속이다.

## 3. 전투 효과

- [PixelFX 저장소](https://github.com/patch-gg/pixelfx), [README](https://github.com/patch-gg/pixelfx/blob/main/README.md).
- [PixelFX 카탈로그](https://github.com/patch-gg/pixelfx/blob/main/docs/CATALOG.md): 화염·탄도·충돌 후보.
- [PixelFX render.mjs](https://github.com/patch-gg/pixelfx/blob/main/tools/render.mjs): 출력 옵션.
- [PixelFX bleeding.js](https://github.com/patch-gg/pixelfx/blob/main/src/fx/status/bleeding.js): actor 의존성 확인.
- [Sprite Fusion Blood](https://www.spritefusion.com/pixel-art-vfx/blood): 추가 혈액·진액 원본 후보.

## 4. 브라우저 검증

- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance): 런타임 병목 조사.
- [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API): 탭 숨김·복귀 처리.
- [Canvas 크기와 WebGL](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/By_example/Canvas_size_and_WebGL): CSS 표시와 버퍼 크기 구분.

## 5. 세계관·성간항해·외계행성 참고

- [15. 세계관](15-worldbuilding.md): Dear Human의 시대·정치·클론·지휘관·행성·첫 임무를 관리하는 기준 문서.
- [알쿠비에레 워프 구상 원 논문](https://arxiv.org/abs/gr-qc/0009013): 국소적 시공간 변형을 통한 이동 구상과 특이한 물질 조건. 실제 우주선의 실증 보고가 아니다.
- [워프와 에너지 조건에 관한 연구](https://arxiv.org/abs/2105.03079): 워프 시공간에 요구되는 에너지 조건의 난점.
- [ESA 외계행성 생명 연구 소개](https://www.esa.int/Science_Exploration/Space_Science/Exoplanets/Life_on_exoplanets): 거주 가능 영역·대기 관측과 실제 생명·거주 조건의 구분.

논문과 관측 자료는 아이디어와 한계의 참고이며 작품의 워프 장치가 실현 가능하다고 입증하는 근거는 아니다. 베스퍼·칼리온은 가상 천체이며 거리·호흡 가능한 대기·지형·운항 성능·카트리지·통신 운반 체계는 창작 설정이다. 사용자 지정 조건과 보완안의 경계는 15에서 설명한다. 미확인 군집생물의 가칭·외형·진액 팔레트와 전투 수치도 자체 제안이다.

## 6. 근거와 가정의 경계

도구의 공개 기능을 확인한 것과 이 캐릭터에서 품질·성능을 검증한 것은 다르다. 파츠형 캐릭터·무기 재사용 계약은 [16](16-modular-character-and-weapons.md), 권장안과 비교 판단은 [12](12-web-tools-research.md), 보조 모션은 [13](13-secondary-motion.md), 유체 피격 효과는 [14](14-hit-effects.md)를 따른다. 수치 목표·메타데이터·새 커스텀 효과 ID는 자체 설계안이다.

문서에 적은 향후 경로와 명령은 존재하는 산출물을 뜻하지 않는다. 실제 채택한 에셋·도구 수정본은 출처·버전·이용 조건을 기록한다.
