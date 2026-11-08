# Dear Human · 플랜 D

Windows/macOS 공통 C++20 코어와 SDL3 GPU의 로컬 3D 프로토타입이다. 최신은 hair_006이며 Mac 실행 확인, Windows 실행은 미확인이다.

[얼굴/앞머리와 몸 접촉 006](../../docs/plan-d-face-hair-006.md)을 따른다. 몸과 긴 머리를 유지하고 얼굴과 앞머리를 보정했다. 모든 주변 소품과 외부 장애물 시연은 제거했다. N 헤어 비교, W 걷기, F 얼굴 확대를 사용하며 바람은 기본 OFF다.

[최신 산출물과 화면](../../art/characters/clone_01/motion/plan_d/hair_006/README.md). 얼굴/앞머리는 사용자 외형 검수 대기다.

## 실행

Finder에서 [run.command](run.command)를 더블클릭하거나 프로젝트 루트에서 실행한다.

```sh
./native/plan-d/run.command
```

첫 화면은 clone_01의 3D 모델 초안이다. 이 Mac에는 CMake 4.4.5, Ninja 1.13.2, SDL 3.4.20을 준비했고 Apple Clang 21로 빌드했다. 003에서 전신·얼굴·뒤쪽·짧은 보행, 004에서 머리 정면·옆·뒤·사선 정지를 Metal 창에서 확인했다. 원화 수준의 얼굴·질감 재현과 사용자 아트 채택은 별도다. [제작 범위와 한계](../../docs/plan-d-clone-model-003.md), [GLB 파일](../../art/characters/clone_01/motion/plan_d/clone_model_003/source/clone_01.glb)을 따른다.

다른 Mac의 필수 환경은 Apple Command Line Tools와 CMake/Ninja이며, SDL은 설치된 정확한 버전을 찾고 없으면 CMake가 고정 릴리스를 내려받는다. Homebrew를 사용한다면 다음 명령으로 준비한다.

```sh
brew install cmake ninja sdl3
```

## 조작

| 조작 | 동작 |
|---|---|
| `1` / `2` / `3`, 상단 탭 클릭 | 뼈대 / 도형 / 겹쳐 보기 |
| `←` / `→` | 좌우 이동·방향 전환·카메라 추적 |
| `W` | 간단한 제자리 보행 켜기/끄기 |
| `Space` | 시간 일시정지/재개 |
| `Q` / `E` | 360° 수평 시점 회전 |
| `F` | 얼굴 확대 / 현재 보기 |
| `H` | 머리만 / 전체 (얼굴 확대 해제) |
| `M` | clone_01 / 중립 마네킹 비교 |
| `N` / `Shift+N` | 헤어 6슬롯 다음/이전 |
| `P` / `U` / `C` | 헤어 물리 / 바람 / 충돌 켜기·끄기 |
| `G` | 몸 충돌 형상 표시 |
| `↑` / `↓` | 내려다보는 각도 조절 |
| `V` | 정측면 0° / 사선 25°·하향 12° 비교 |
| 마우스 휠 | 확대/축소 |
| `R` | 초기화 |
| `F12` | 현재 GPU 화면을 `captures/`에 PNG 저장 |
| `Esc` | 종료 |

일시정지 중에도 보기·카메라·확대를 바꿀 수 있다. 실제 GPU 프레임의 PNG 저장은 명시적 캡처 요청에서만 수행한다.

## 구현

- [Simulation.cpp](src/Simulation.cpp): 공통 이동·보행·일시정지·120Hz 고정 업데이트. SDL 없이 빌드하는 `plan-d-core`에 포함된다.
- [Input.hpp](src/Input.hpp): 운영체제 키 코드가 없는 공통 입력 명령과 이동 축.
- [Skeleton.cpp](src/Skeleton.cpp): 골반·허리·흉곽·목·머리, 양팔, 양다리의 21개 관절과 부모–자식 변환. 좌표는 X 이동 / Y 높이 / Z 깊이이며 기본 전방은 +X다.
- [Scene.cpp](src/Scene.cpp): 같은 뼈대에 붙이는 구·타원체·원기둥·상자 메시, 관절 표시, 바닥 격자와 조작 안내.
- [CloneModel.cpp](src/CloneModel.cpp): clone_01 체형·얼굴·머리·의상·갑옷의 실제 곡면과 정점 가중치·CPU 스키닝.
- [HairModel.cpp](src/HairModel.cpp): 파트별 가이드·곡면 카드·두피 받침과 UV. [atlas 생성기](tools/build_hair_atlas.py)는 명시적 오프라인 실행 전용.
- [SampleAssets.cpp](src/SampleAssets.cpp): MIT cgltf로 무료 glTF/GLB를 실제 읽고 기존 Head에 장착한다. base color 텍스처를 Metal/HLSL에서 공유한다.
- [HairDynamics.cpp](src/HairDynamics.cpp), [SampleWorld.cpp](src/SampleWorld.cpp): 120Hz 가이드 반응·근사 접촉·샘플 장면. Long/Buns/004 유연, 짧은 세 샘플 고정.
- [ModelExport.cpp](src/ModelExport.cpp): 뷰어와 같은 모델 데이터를 스켈레톤·가중치·재질을 포함한 GLB로 저장.
- [Platform.hpp](src/Platform.hpp), [Renderer.hpp](src/Renderer.hpp): `IPlatform`과 `IRenderer` 인터페이스. 공통 코드에 SDL 창이나 GPU 핸들을 노출하지 않는다.
- [Application.cpp](src/Application.cpp): 위 인터페이스만 사용하는 공통 실행 루프. 움직임을 먼저 갱신하고 읽기 전용 렌더 프레임을 전달한다.
- [SdlPlatform.cpp](src/backends/sdl/SdlPlatform.cpp): 창·이벤트·입력 변환·단조 시계·Retina 픽셀 크기.
- [SdlGpuRenderer.cpp](src/backends/sdl/SdlGpuRenderer.cpp): 두 운영체제가 공유하는 SDL GPU 버퍼·깊이 테스트·조명·화면 표시·PNG 캡처 구현.
- [Metal 설정](src/backends/metal/GpuBackendConfig.cpp), [D3D12 설정](src/backends/d3d12/GpuBackendConfig.cpp): CMake가 운영체제에 맞춰 하나만 선택하는 GPU 드라이버·셰이더 형식/경로.
- [main.cpp](src/main.cpp): SDL 프로세스 진입점과 런타임 선택만 수행한다.
- [manifest.json](manifest.json): 버전과 실제 산출물 진입점.

의존 관계는 **플랫폼 입력 → 공통 Simulation → 공통 RenderFrame → IRenderer → SDL GPU → Metal/D3D12**다. Mac/Windows마다 이동이나 애니메이션을 다시 작성하지 않는다. 추상화와 실제 Windows 동작 확인은 구분한다. 상세 경계는 [공통 구조 기록](../../docs/plan-d-cross-platform-002.md)을 따른다.

원본 004 전체 모델은 45,835 정점·69,680 삼각형·21관절·16재질이며 머리카락만은 21,025 정점·30,256 삼각형이다. 157개 헤어 카드와 1024² coverage atlas를 사용한다. 형상/표시 경로와 원화 완성도는 구분한다. 실제 자체 그림자·모발끼리 충돌·거리 LOD·총기·사격·장전·앉아쏴는 미구현이다. 기존 사인파 보행은 연결 확인용이다.

GLB 저장은 다음처럼 새 경로에 명시적으로 실행한다. 현재 export는 자체 006 정지 리그 전용이다. 선택한 외부 헤어/소품과 물리 변형은 내보내지 않는다. 뷰어의 외부 샘플에는 cgltf 로더를 사용한다.

```sh
native/plan-d/build/bin/dear-human-plan-d --export-model /tmp/clone_01.glb
native/plan-d/build/bin/dear-human-plan-d --export-hair /tmp/hair.glb
```

## 직접 빌드

```sh
cmake -S native/plan-d -B native/plan-d/build -G Ninja \
  -DCMAKE_BUILD_TYPE=Debug -DCMAKE_PREFIX_PATH=/opt/homebrew/opt/sdl3
cmake --build native/plan-d/build
native/plan-d/build/bin/dear-human-plan-d
```

SDL 버전은 3.4.20으로 고정한다. macOS에서는 작은 MSL 셰이더를 SDL을 통해 실행 시 컴파일하므로 별도 오프라인 Metal 컴파일러 설치를 요구하지 않는다. 셰이더는 실행 파일 옆 `shaders/`에 빌드 시 복사되며 현재 작업 디렉터리에 의존하지 않는다.

Windows용 D3D12 코드와 HLSL/DXC 빌드 경로는 준비했지만 **Windows 빌드·실행은 미확인**이다. Windows에서는 C++20 도구 체인과 CMake, `dxc`가 필요하다. SDL을 찾지 못하면 고정 소스 릴리스를 받아 정적 라이브러리로 빌드한다.

Windows의 실행 진입점은 [run-windows.ps1](run-windows.ps1)이다.

```powershell
./native/plan-d/run-windows.ps1
```

```powershell
cmake -S native/plan-d -B native/plan-d/build-windows
cmake --build native/plan-d/build-windows --config Debug
./native/plan-d/build-windows/bin/dear-human-plan-d.exe
```

## 렌더링 기록

현재 [clone_model_003](../../art/characters/clone_01/motion/plan_d/clone_model_003/README.md)은 전신·얼굴·뒤쪽과 90프레임 보행을 확인했다. 저장 GLB는 Khronos gltf-validator 2.0.0-dev.3.10의 오류/경고가 0이다. 형식 검사를 아트 품질 승인이나 천 충돌 검사로 확대하지 않는다.

최초 [세 화면](../../art/characters/clone_01/motion/plan_d/preparation_001/README.md)과 후속 [공통 구조·동일 화면 확인](../../art/characters/clone_01/motion/plan_d/architecture_002/README.md)을 버전별로 보존한다. 구조 분리 후 Mac 캡처 한 장은 최초 overlay PNG와 바이트까지 동일했다. SDL 없는 코어 단독 빌드와 이동·일시정지·프레임 생성의 작은 검사 한 번을 수행했다. 대규모 테스트, 웹 검사, 장시간 성능 측정은 실행하지 않았다.

코어만 빌드하면 SDL 설치나 셰이더 도구가 필요 없다. 아래 검사는 별도 옵션이며 일반 실행 시 자동으로 돌리지 않는다.

```sh
cmake -S native/plan-d -B native/plan-d/build-core -G Ninja \
  -DPLAN_D_BUILD_VIEWER=OFF -DPLAN_D_BUILD_MOVEMENT_CHECK=ON
cmake --build native/plan-d/build-core
native/plan-d/build-core/bin/plan-d-movement-check
```
