# Dear Human · 플랜 D

Windows/macOS 공통 C++20 코어와 SDL3 GPU 구현을 분리한 로컬 3D 프로토타입이다. 첫 단계는 **환경 구축 → 간단한 뼈대 → 기본 도형 렌더링**이며 현재 구조는 **architecture_002**다. 별도 웹 서버 없이 실행한다. macOS Metal은 실행 확인했고 Windows D3D12는 실제 빌드·실행이 남아 있다.

## 실행

Finder에서 [run.command](run.command)를 더블클릭하거나 프로젝트 루트에서 실행한다.

```sh
./native/plan-d/run.command
```

첫 화면은 관절과 도형을 함께 표시한다. 이 Mac에는 CMake 4.4.5, Ninja 1.13.2, SDL 3.4.20을 준비했고 Apple Clang 21로 빌드했다. Metal 창의 세 표시 모드를 실제 실행·캡처했다. 사용자 아트 채택과 전체 동작 검수는 별도다.

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
| `Q` / `E` | 수평 시점 회전 |
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
- [Platform.hpp](src/Platform.hpp), [Renderer.hpp](src/Renderer.hpp): `IPlatform`과 `IRenderer` 인터페이스. 공통 코드에 SDL 창이나 GPU 핸들을 노출하지 않는다.
- [Application.cpp](src/Application.cpp): 위 인터페이스만 사용하는 공통 실행 루프. 움직임을 먼저 갱신하고 읽기 전용 렌더 프레임을 전달한다.
- [SdlPlatform.cpp](src/backends/sdl/SdlPlatform.cpp): 창·이벤트·입력 변환·단조 시계·Retina 픽셀 크기.
- [SdlGpuRenderer.cpp](src/backends/sdl/SdlGpuRenderer.cpp): 두 운영체제가 공유하는 SDL GPU 버퍼·깊이 테스트·조명·화면 표시·PNG 캡처 구현.
- [Metal 설정](src/backends/metal/GpuBackendConfig.cpp), [D3D12 설정](src/backends/d3d12/GpuBackendConfig.cpp): CMake가 운영체제에 맞춰 하나만 선택하는 GPU 드라이버·셰이더 형식/경로.
- [main.cpp](src/main.cpp): SDL 프로세스 진입점과 런타임 선택만 수행한다.
- [manifest.json](manifest.json): 버전과 실제 산출물 진입점.

의존 관계는 **플랫폼 입력 → 공통 Simulation → 공통 RenderFrame → IRenderer → SDL GPU → Metal/D3D12**다. Mac/Windows마다 이동이나 애니메이션을 다시 작성하지 않는다. 추상화와 실제 Windows 동작 확인은 구분한다. 상세 경계는 [공통 구조 기록](../../docs/plan-d-cross-platform-002.md)을 따른다.

현재는 관절 변환으로 단단한 도형을 배치한다. 정점 가중치 기반 스키닝, 실제 캐릭터 외형·텍스처·갑옷·머리카락·망토, 총기·사격·장전·앉아쏴는 이번에 구현하지 않았다. 간단한 사인파 보행과 최저 발끝 높이 보정은 동작 확인용이다. 지지발 고정·물리·자연스러운 보행 완성으로 해석하지 않는다. 뼈대는 가려진 관절도 확인하도록 도형 위에 표시한다.

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

최초 [세 화면](../../art/characters/clone_01/motion/plan_d/preparation_001/README.md)과 후속 [공통 구조·동일 화면 확인](../../art/characters/clone_01/motion/plan_d/architecture_002/README.md)을 버전별로 보존한다. 구조 분리 후 Mac 캡처 한 장은 최초 overlay PNG와 바이트까지 동일했다. SDL 없는 코어 단독 빌드와 이동·일시정지·프레임 생성의 작은 검사 한 번을 수행했다. 대규모 테스트, 웹 검사, 장시간 성능 측정은 실행하지 않았다.

코어만 빌드하면 SDL 설치나 셰이더 도구가 필요 없다. 아래 검사는 별도 옵션이며 일반 실행 시 자동으로 돌리지 않는다.

```sh
cmake -S native/plan-d -B native/plan-d/build-core -G Ninja \
  -DPLAN_D_BUILD_VIEWER=OFF -DPLAN_D_BUILD_MOVEMENT_CHECK=ON
cmake --build native/plan-d/build-core
native/plan-d/build-core/bin/plan-d-movement-check
```
