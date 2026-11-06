# 31. 플랜 C · Three.js 조사와 도입 준비

[문서 목록](../README.md) · 사용자 지시: “Three.js를 조사하고 도입할 준비해봐. 이건 플랜 C야.” · 조사일 2026-11-06 KST

## 현재 결정

**Three.js를 플랜 C의 시험 후보로 준비했다. 첫 범위는 기존 PNG 파츠와 공통 리그를 Three.js에서 표시하는 호환성 검증이다.** Three.js 0.187.0을 별도 [로컬 패키지](../game/plan-c/package.json)에 설치하고 lockfile로 고정했다. 조사 당시 npm 응답과 공식 [r187 릴리스](https://github.com/mrdoob/three.js/releases/tag/r187)를 확인했다. 최종 렌더러·제작 도구 채택은 아직이다.

플랜 A는 현재 자체 WebGL 파츠 리그, 플랜 B는 기존 2dimg2motion 결과, 플랜 C는 이번 Three.js 준비로 구분한다. 현재 앱은 C를 import하지 않는다. 캐릭터 페이지의 C 버튼·전체 캐릭터 어댑터·실제 3D 모델은 아직 없다. 새로운 사이트나 가짜 모션을 만들지 않았고, 기존 원화와 기본 재생을 바꾸지 않았다.

## 조사 결과와 프로젝트 적용 판단

| 공식 기능 | Dear Human에 적용할 수 있는 일 | 필요한 별도 작업 |
|---|---|---|
| 직교 카메라 | 기존 논리 픽셀과 횡스크롤 구도를 유지하며 PNG 평면 메시를 표시 | 카메라·화면 배율·Y축·좌우 반전 계약 |
| BufferGeometry | 아틀라스 UV와 국소 정점 변형을 담기 | 몸통·망토·머리카락의 기존 변형 함수를 어댑터에 연결 |
| MeshBasicMaterial | 조명으로 원화 색을 바꾸지 않고 기존 그림을 표시 | sRGB와 투명 경계, 축소 필터 검수 |
| SkinnedMesh / Skeleton | 실제 뼈대가 있는 메시의 스키닝 | 스켈레톤·정점 가중치·bind pose 제작 |
| AnimationMixer / Clip | 준비된 키프레임·뼈대·모프 애니메이션의 재생과 혼합 | 실제 클립·전환·이벤트 타이밍 제작 |
| GLTFLoader | 준비한 glTF 2.0 / GLB 모델을 런타임에 읽기 | 실제 모델·재질·리그·애니메이션 자산 |
| CCDIKSolver addon | SkinnedMesh 기반 3D IK 실험 | 골격·제한각·접점 설정과 검수 |

근거: [OrthographicCamera](https://threejs.org/docs/pages/OrthographicCamera.html), [BufferGeometry](https://threejs.org/docs/pages/BufferGeometry.html), [MeshBasicMaterial](https://threejs.org/docs/pages/MeshBasicMaterial.html), [SkinnedMesh](https://threejs.org/docs/pages/SkinnedMesh.html), [애니메이션 시스템](https://threejs.org/manual/pages/animation-system.html), [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html), [CCDIKSolver](https://threejs.org/docs/pages/CCDIKSolver.html).

현재 PNG를 Three.js로 옮기는 것만으로 어깨 원근·팔꿈치 그림·손가락·장전 접촉·모션의 체중감이 개선된다고 판단할 근거는 없다. 이는 위 기능과 현재 데이터 구조를 대조한 **프로젝트의 판단**이다. 현행 2본 IK·발사 준비·보행·장전 상태는 우선 재사용하며, AnimationMixer를 별도의 게임 시계로 추가하지 않는다.

## 두 가지 도입 경로

| 경로 | 재사용과 기대 효과 | 남는 제작 범위 |
|---|---|---|
| 2D 파츠 / 2.5D 표시 | 기존 그림·소켓·공통 리그를 재사용하고 렌더링·리소스 관리를 표준 라이브러리로 옮길 수 있다. 이번 준비의 대상이다. | 이미지의 시점·가려진 부위·손 원화는 그대로 남는다. 전체 파츠·soft 메시 연결과 품질 비교가 필요하다. |
| 실제 3D 캐릭터 + 직교 표시 | 모델이 준비되면 시점 회전과 뼈대 변형을 시험할 수 있다. 횡스크롤 게임 구도를 유지할 수 있다. | 모델링·토폴로지·UV·재질·스키닝·클립·머리/망토 처리·분리 무기 제작이 필요하다. 현재 저장소에서 GLB/GLTF/FBX/BLEND/OBJ/VRM 자산은 찾지 못했다. |

3D풍 참고 그림을 실제 3D 모델로 간주하지 않는다. 실제 3D 자산 제작은 이번에 실행하지 않았다. 향후 해당 경로를 선택하면 채택 외형과 M16을 기준으로 별도 버전에 제작하고, 모델링 시간·비용·품질을 다시 검토한다.

## 기술 조건

현재 `WebGLRenderer`는 WebGL2를 사용하며 WebGL1 지원은 r163부터 없다. 기존 자체 렌더러는 WebGL1을 요청하므로 지원 범위가 같다고 간주할 수 없다. 이번 Chrome 한 환경에서 WebGL2를 확인했다. 미지원 환경은 probe의 `unsupported`로 보고한다. [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html).

기존 원화는 컬러 텍스처를 sRGB로 표시하고, 조명 영향을 받지 않는 재질·명시적 출력 색 공간·tone mapping 없음으로 비교한다. `transparent`, `depthWrite=false`, `depthTest=false`, `renderOrder`를 사용해 2D 표시 순서를 시험한다. 실제 머리카락·망토·장전 팔의 복잡한 가림은 추가 검수가 필요하다. [색 관리](https://threejs.org/manual/pages/color-management.html), [투명도](https://threejs.org/manual/pages/transparency.html).

geometry·material·texture는 사용 후 각각 해제해야 한다. 준비 probe는 명시 호출 한 번만 렌더링하고 자원을 정리하며, 100회 반복 렌더에서 geometry·texture 개수가 늘지 않는지 확인한다. 이는 장시간 누수나 실제 프레임 성능 검사를 대신하지 않는다. [리소스 해제](https://threejs.org/manual/pages/how-to-dispose-of-objects.html).

초기에는 WebGLRenderer를 사용한다. WebGPURenderer는 WebGPU와 WebGL2 백엔드를 지원하지만 이번 준비에서는 설치된 Three.js의 기본 WebGL 경로만 검사했다. GPU 백엔드 확대는 후속이다. [WebGPURenderer](https://threejs.org/docs/pages/WebGPURenderer.html).

npm 배포의 MIT 라이선스를 확인했다. 향후 배포 번들에 라이선스 고지를 포함한다. 현재 `node_modules` 상대 import는 로컬 호환성 시험용이며 생산용 번들·CDN·배포 구성이 아니다. 공식 설치 문서가 설명하는 npm/빌드 도구 경로는 전체 앱 연결 단계에서 정한다. [라이선스](https://github.com/mrdoob/three.js/blob/master/LICENSE), [설치](https://threejs.org/manual/pages/installation.html).

## 실제로 준비하고 확인한 것

준비 코드는 [game/plan-c](../game/plan-c/README.md), 결과는 [plan_c/preparation_001](../art/characters/clone_01/motion/plan_c/README.md)에 분리했다. 아트·리그 원본·기존 테스트 기록·카탈로그를 이번 작업에서 수정하지 않았다. 이번 산출물은 소프트웨어 준비와 기술 캡처이며 새 캐릭터 모션으로 등록하지 않는다.

| 검사 | 확인한 결과 | 검증하지 않은 범위 |
|---|---|---|
| Node | 고정 버전 import, 실제 PNG 크기, 모든 현재 파츠의 아틀라스 범위·원본 비율, 좌우/6동작에서 소켓 10,860건 투영. 최대 좌표 오차 약 6.36e-14px | 게임 동작 개선, 전체 캐릭터 Three 렌더링 |
| Chrome 156.0.8078.80 | 기존 body_core 원본 배율 표시·좌우 반전에서 실루엣 IoU 1.0, 불투명 픽셀 평균 RGB 오차 약 0.49/255 | 최종 표시 크기의 축소 품질·반투명 경계·미술 채택 |
| 투명 합성 | 합성용 두 평면의 명시적 그리기 순서를 바꾸면 실제 읽은 픽셀도 바뀜 | 실제 전체 캐릭터 레이어·장전 가림 |
| 반복 렌더 | 같은 몸통 파츠 100회에서 geometry/texture 수 증가 없음, 파츠 표시 1 draw | 전체 캐릭터 성능·여러 적·장시간 누수·모바일 |
| 현재 앱 구문 | `npm --prefix game run check` 통과 | 기존 리그의 이번 Three 시험을 통한 새 모션 승인 |

Node 보고서의 실제 아틀라스·파츠 수와 `source_hashes`가 그 실행의 입력이다. 조사 중 다른 작업의 리그·원화 목록 변경이 관찰돼, 처음 조회한 수와 후속 검사 수가 달랐다. 미완성 새 파츠를 사용자 채택으로 해석하지 않는다. 카탈로그 해시 불일치도 관찰했으며 별도 [기존 상태 검사](../art/characters/clone_01/motion/plan_c/preparation_001/tests/catalog-baseline.json)에 남긴다. 관련 원본·카탈로그는 자동 수정하지 않는다.

첫 Chrome 비교는 1315px 높이 그림을 200px로 줄였을 때 평균 색차 7.088이 기준 4를 넘어서 **실패**했다. [첫 실패 기록](../art/characters/clone_01/motion/plan_c/preparation_001/records/attempt_001.json)을 보존했다. Canvas2D와 GPU의 축소 보간 차이를 색 공간과 분리하기 위해 두 번째 검사는 원본 배율에서 같은 오차 기준으로 진행했다. 따라서 원본 배율 검사의 통과를 축소 품질 통과로 보고하지 않는다.

## 재현 명령

프로젝트 루트에서 실행한다. 현재 명령은 기존 `agent_pipeline.py`의 generate/register/render 기능이 아니다.

```sh
npm --prefix game/plan-c ci --ignore-scripts
npm --prefix game/plan-c run check
```

새 버전 경로에 JSON을 남길 때는 Node 스크립트를 직접 호출한다. 아래 경로는 예시이며 재검사 시 기존 검수 기록을 덮어쓰지 않는다.

```sh
node tools/check_plan_c.mjs --output art/characters/clone_01/motion/plan_c/preparation_002/tests/node.json
```

브라우저 시험은 Python Playwright와 설치된 macOS Chrome을 사용한다. 브라우저 바이너리 다운로드는 필요하지 않다.

```sh
python3 -m venv .venv-plan-c
.venv-plan-c/bin/python -m pip install -r tools/plan-c-requirements.txt
python3 tools/preview_server.py --port 4173
```

이미 미리보기가 실행 중이면 같은 서버를 사용한다. 서버를 실행한 터미널을 유지하고 다른 터미널에서 다음을 실행한다.

```sh
.venv-plan-c/bin/python tools/review_plan_c.py --output art/characters/clone_01/motion/plan_c/preparation_002/reviews
```

이 도구는 [기존 캐릭터 페이지](http://127.0.0.1:4173/#/samples/characters/clone_01)를 열어 명시적으로 probe 모듈을 호출한다. 화면에 C 모션 버튼을 추가하지 않는다. 실제 실행에서는 외부 HTTP 요청과 pageerror가 없었다. `preparation_001`은 이번 결과로 보존한다.

## 다음 구현과 통과 조건

1. **전체 캐릭터 표시 어댑터:** 같은 `CharacterRig.pose()`·120Hz 상태·아틀라스·proportions·gait·cape·secondary-motion·waist 코드를 연결한다. 먼저 기존 렌더러와 같은 자세의 결과를 비교한다. 캐릭터 도형이나 독립된 절차 모션을 새로 만들어 대체하지 않는다.
2. **같은 페이지 선택:** 기존 대상 페이지에 C 선택만 추가하고 기본값을 유지한다. 선택한 렌더러만 재생하고 전환/페이지 이탈 시 자원을 해제한다. 현재는 미구현이다.
3. **모든 접점·가림:** M16 stock–stockPocket, 양손, 총구, 발 접지, 골반–의상–다리, 장전 팔/손/탄창 순서를 양방향에서 검수한다. 머리·흉갑·어깨~벨트·M16의 비례를 대조하고 프레임별 자동 크기 보정으로 차이를 숨기지 않는다.
4. **기존 동작 유지:** 대기·보행·약 .12초의 준비 후 첫 발·연사·이동 사격·일반/빈 장전·반전·정지/재개·무기 교체를 같은 입력과 시점으로 검사한다. Three의 렌더링 통과와 손/어깨 원화 완성은 별도로 표시한다.
5. **품질·성능 비교:** 최종 표시 크기의 축소 필터·투명 경계, 전체 캐릭터 frame time·draw calls·텍스처 메모리·반복 선택 누수를 측정한다. 데스크톱 60fps의 16.7ms 예산은 제안 목표이며 이번에 달성한 결과가 아니다. Firefox·Safari·모바일·WebGL2 미지원도 별도 확인한다.
6. **실제 3D 경로 판단:** 2D 파츠의 시점 문제가 계속 제작 병목이면 실제 3D 모델 시험 범위·도구·예상 비용을 구체화한다. 그 전까지 GLTFLoader/SkinnedMesh/AnimationMixer 사용을 완료로 표시하지 않는다.

1~5의 비교 결과가 있어야 렌더러 채택 여부를 판단할 수 있다. 현재 완료 범위는 **공식 조사·버전 고정·기존 데이터 연결의 기초·단일 파츠 브라우저 시험**이다.
