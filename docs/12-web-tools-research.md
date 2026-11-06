# 12. 웹 구현 도구 조사와 선택

사용자 후속 지시로 **Three.js를 플랜 C**로 조사하고 별도 설치·기초 호환성 시험을 준비했다. [31. 플랜 C](31-plan-c-threejs-readiness.md)가 그 범위와 실제 결과다. 아래 Phaser·Spine 제안은 기존 비교안이며, 이번 준비가 도구의 최종 채택이나 현재 앱의 교체를 뜻하지 않는다.

[문서 목록](../README.md) · 조사일 2026-11-06 · 공식 문서·소스 조사 결과이며 실행 벤치마크는 아직 없다.

## 1. 권장 구성

**Phaser 4.2.1 + TypeScript + Vite**를 웹 프로토타입의 기본 구성으로 제안한다. 공통 파츠 리그·IK 제작은 **Spine Professional 권장**, 기본 포즈 참고와 적 프레임 제작은 **2dimg2motion**, 화염·충돌·유체 효과의 원본 제작은 **PixelFX**, 반동·머리 흔들림·바스트 모핑은 **런타임 보조 모션**으로 분담한다.

사용자 요구에 따라 플레이어는 **처음부터 파츠형 리그·분리 무기·양팔 IK**를 기본 구조로 삼는다. 이전에 검토한 무기 포함 전신 시트의 국소 변형은 플레이어 기본안에서 제외한다. 새 무기 자산·소켓·반동·무기군 자세를 추가하고 캐릭터 원화·공통 리그·걷기를 재사용한다. [16 상세 규약](16-modular-character-and-weapons.md)을 따른다.

Spine Professional은 파츠·메시·팔 IK·보조 물리를 한 제작 흐름에서 다루기 위한 권장 도구다. 현재 구매·설치하지 않았다. 유료 도구를 사용하지 않는 대안은 같은 파츠 계약의 TypeScript 리그·2본 IK·국소 메시를 직접 작성하는 것이며 개발 비용을 별도로 측정한다.

## 2. 웹 엔진 비교

| 후보 | 공식 자료에서 확인한 기능 | 이 프로젝트에서의 판단 |
|---|---|---|
| Phaser 4 | 웹 2D 게임 프레임워크, 4.2 계열의 Mesh2D와 Spine 연동 | 씬·입력·카메라·효과·게임 흐름을 한 엔진에서 구성하는 기본안 |
| PixiJS 8 | MeshGeometry·MeshSimple·MeshPlane 등의 정점 변형 | 렌더링 제어 중심의 좋은 대안. 이동·전투·웨이브 관리 코드는 별도 작성 |
| Godot Web | WebAssembly·WebGL 2 기반 웹 내보내기 | 웹 구현도 가능하나, 아직 코드가 없으므로 TypeScript 중심으로 전환 |

Phaser 공식 배포 목록에서 **4.2.1**을 확인했다. Phaser 3용 렌더 파이프라인 예제를 4에 그대로 붙이지 않는다. 실제 프로젝트의 npm 버전과 lockfile을 고정한다. [Phaser 릴리스 목록](https://phaser.io/download/phaser4), [Phaser 4.2 소개](https://phaser.io/news/2026/07/phaser-4-2-spine-renderer-mesh2d-stencil).

PixiJS의 버텍스 버퍼 편집 기능과 Godot의 웹 실행 조건은 공식 문서에서 확인했다. 위 우선순위는 Dear Human의 현재 범위에 대한 설계 판단이다. [PixiJS Mesh](https://pixijs.com/8.x/guides/components/scene-objects/mesh), [Godot Web](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html).

## 3. 캐릭터 모션 방식 비교

| 방식 | 적합한 작업 | 제약·추가 작업 | 채택 위치 |
|---|---|---|---|
| 2dimg2motion 전신 프레임 | 기본 동작 포즈·타이밍 참고, 적 접근 동작 | 자동 파츠·리그·IK 추출이 아님 | 플레이어 참고·적 프레임 |
| 무기 포함 전신 프레임 + 국소 변형 | 작은 시각 보정 | 가림·독립 무기 교체·캐릭터 재사용에 한계 | 플레이어 기본안에서 제외 |
| 레이어 분리 + Spine Professional | 파츠·메시·IK·무기 장착·보조 물리 | 분리 원화·가려진 부분 보완·리깅 필요 | 플레이어 권장 기본 경로 |
| 파츠 + TypeScript 리그·IK·Mesh2D | 같은 재사용 구조를 코드로 구성 | 관절·constraint 순서·도구·디버그를 직접 개발 | 유료 제작 도구 없는 대안 |
| Live2D Cubism + Web SDK | 파라미터·물리 기반 일러스트 변형 | 전용 모델링·레이어 준비와 게임 내 통합 필요 | 확대 일러스트·대화 모델 중심으로 재검토 |
| 모션을 모두 프레임에 굽기 | 작은 적 다수의 저렴한 재생 | 발사 속도·충격에 맞춘 임의의 동적 반응이 제한됨 | 초기 적 20마리 |

Spine의 물리 제약은 머리카락·의복 등의 보조 모션을 지원하며 Essential에는 제공되지 않는다. Mesh·IK·물리를 포함한 권장안은 Professional을 대상으로 한다. [Spine 물리 제약](https://esotericsoftware.com/spine-physics-constraints), [에디션 비교](https://esotericsoftware.com/spine-purchase).

Spine 공식 Phaser 런타임은 `spine-phaser-v4`이며, 조사한 문서는 **런타임 4.3.11 이상과 Phaser 4.2.1 이상**의 조합을 안내한다. 에디터와 런타임의 major.minor를 맞춰야 한다. 실제 도입 시 호환되는 정확한 패치 버전을 함께 고정한다. [spine-phaser 공식 문서](https://esotericsoftware.com/spine-phaser).

Live2D는 Web SDK와 물리 설정을 제공한다. 이 기능만으로 생성 PNG 시트가 Cubism 모델로 자동 변환되는 것은 아니다. 이 프로젝트에서는 전신 이동·총기 견착의 제작 흐름을 우선해 기본안에 넣지 않는다. [Web SDK](https://www.live2d.com/en/sdk/download/web/), [물리 설정](https://docs.live2d.com/en/cubism-editor-manual/physics-operation/).

## 4. 2dimg2motion의 정확한 역할

캐릭터의 키포즈·타이밍 참고와 적의 연속 PNG를 제작하는 도구로 사용한다. 도구가 내보내는 manifest는 캐릭터의 자동 뼈대·가슴 물리·총구 소켓 데이터라는 뜻이 아니다. 추가 메타데이터는 프로젝트가 작성한다. [공식 README](https://github.com/WU-HAOTIAN34/2dimg2motion/blob/main/README.md).

플레이어 공통 리그에서는 생성한 키포즈·동작 시트를 기준과 타이밍 참고로 활용한다. 다만 이를 그대로 가져오면 완성된 Spine 리그가 된다는 약속은 하지 않는다. 적은 계속 프레임 애니메이션으로 재생할 수 있다.

## 5. PixelFX와 피격 효과

PixelFX는 JavaScript 직접 실행과 PNG·JSON 출력 경로를 제공한다. 기본안은 **사전 렌더한 화염·충돌·짧은 분사 + Phaser에서 움직이는 소량의 액체 입자·잔흔**이다. [공식 README](https://github.com/patch-gg/pixelfx/blob/main/README.md).

직접 실행 방식도 가능하지만 CPU 색상 버퍼를 매 프레임 텍스처로 전송하는 비용을 따로 측정해야 한다. 처음부터 전체 화면 PixelFX 버퍼와 Phaser 장면을 중복 렌더링하지 않는다.

`status/bleeding` 소스는 actor 모양을 참조하는 지속 출혈 효과다. 이를 독립적인 총알 명중 분사로 그대로 쓰거나 `--no-actor`만 붙이면 해결된다고 보지 않는다. 필요한 것은 actor와 분리한 짧은 일회 효과다. [PixelFX bleeding 소스](https://github.com/patch-gg/pixelfx/blob/main/src/fx/status/bleeding.js).

추가 원본 후보로 Sprite Fusion의 혈액 효과를 확인했다. 명중 방향 분사·액적·잔흔과 재색상 흐름을 제공하므로 적 진액 효과를 설계할 때 참고할 수 있다. 도입 여부는 PixelFX 커스텀 효과와 비교한다. [Sprite Fusion Blood](https://www.spritefusion.com/pixel-art-vfx/blood).

## 6. 보조 제작·개발 도구

| 도구 | 사용할 일 | 선택 |
|---|---|---|
| TypeScript | 상태·이벤트·에셋 메타데이터의 타입 정의 | 기본 |
| Vite | 개발 서버, 정적 웹 빌드 | 기본 |
| Aseprite | 픽셀 프레임 보정·시트 작업 | 픽셀 스타일 유지 시 선택 |
| Krita | 분리 레이어·가중치 마스크·가려진 영역 보완 | 원화 보정용 선택 |
| Chrome DevTools | 스크립트·렌더링 병목과 메모리 조사 | 기본 |
| 브라우저 내 Motion Lab | 보조 모션 on/off, 단발·연사, 좌우 전환, 피격 재현 | 직접 작성할 검증 장면 |

Vite의 개발 서버·정적 빌드, Aseprite의 시트 입출력, Krita의 레이어·마스크, DevTools의 성능 기록 기능을 공식 자료에서 확인했다. [Vite](https://vite.dev/guide/), [Aseprite](https://www.aseprite.org/docs/sprite-sheet/), [Krita](https://docs.krita.org/en/reference_manual/layers_and_masks.html), [DevTools](https://developer.chrome.com/docs/devtools/performance).

Python·Pillow·Node.js는 제작·변환 때 사용한다. 플레이어에게 설치를 요구하지 않는다. 웹 런타임은 번들 JavaScript와 검수된 에셋을 내려받아 실행한다.

## 7. 스타일·크기를 먼저 비교할 이유

이전 문서의 **64px 캐릭터·픽셀 아트는 제안값**이다. 바스트·머리카락의 1px 안팎 변형은 이 크기에서 잘 안 보이거나 외곽선 떨림이 될 수 있다. Motion Lab에서 **64px와 128px 인물 표시**를 비교하고 픽셀 필터와 부드러운 보간도 확인한다.

고해상도 실험에서는 충분히 큰 원본과 여백을 준비한다. 128px 원본을 확대했다고 디테일이 새로 생기지는 않는다. 최종 크기를 바꾸면 [07 데이터 규약](07-data-and-assets.md)의 소켓·충돌·사격 높이·카메라를 함께 조정한다. 비교 전에는 기존 스테이지 좌표를 임의로 확정하지 않는다.

## 8. 조사 결론과 미검증 항목

기술적으로 구성할 수 있는 경로는 확인했다. 파츠형·분리 무기는 확정 요구이고, 구체적 리그 백엔드·관절 품질·제작 시간·브라우저 프레임 시간은 미검증이다. 기본 리그의 정지·이동 사격과 다른 길이 무기 장착을 실제 영상·파일 변경 기록으로 검증한다.

우선순위는 **분리 원화·공통 리그 → 무기 장착·양팔 IK → 웹 Motion Lab → 반동·머리·바스트 → 혈액·진액 → 이동 사격 → 무기 재사용 검증 → 20마리 부하 → 전체 스테이지**다. 세부 알고리즘은 [13](13-secondary-motion.md), 피격 효과는 [14](14-hit-effects.md)를 따른다.

## 9. 실제 착수 시 명령 예시

아래는 향후 빈 game/ 프로젝트를 만들 때의 PowerShell 예시다. **이번 문서 작업에서 실행하지 않았다.** Vite·TypeScript·Node 버전은 생성 시 환경 기록과 lockfile에 남기고 이후 재현에는 npm ci를 사용한다. 최신 템플릿의 Node 요구 조건은 위 Vite 공식 문서와 함께 확인한다.

```powershell
npm create vite@latest game -- --template vanilla-ts
Set-Location game
npm install
npm install --save-exact phaser@4.2.1
npm run dev
```

검증할 생산용 빌드는 같은 프로젝트에서 만든다.

```powershell
npm run build
npm run preview
```

Phaser 게임 진입점과 Motion Lab은 이 기본 템플릿에 별도로 작성한다. 명령 실행만으로 게임이 만들어지는 것은 아니다. Spine 권장 경로는 사용할 에디터·정확한 런타임 패치를 맞춘 후 추가한다. 위 명령은 Vite·Phaser 기본 환경 예시이며 리깅·무기 교체까지 완료하는 명령이 아니다.
