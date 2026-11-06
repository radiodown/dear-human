# 2.5D 횡스크롤 게임 자체 개발 — 기술 설계서

> **문서 버전:** v0.2  
> **작성일:** 2026-11-07  
> **상태:** 초기 기술 설계 / 구현 전  
> **핵심 방향:** macOS에서 개발하고 Windows에서도 실행 가능한, 자체 제작 2.5D 게임

---

## 1. 프로젝트 목표

Unity, Unreal 같은 완성형 게임 엔진에 의존하지 않고, 게임 시스템과 3D 표현 방식을 직접 구현한다. Blender 등 3D 제작 프로그램도 필수 전제로 두지 않으며, 최초에는 코드로 만든 메시와 관절형 캐릭터로 시작한다.

### 현재 확정한 요구사항

| 구분 | 요구사항 |
|---|---|
| 게임 유형 | 2.5D 횡스크롤 게임 |
| 시점 | 옆에서 보되, 약간 위쪽에서 내려다보는 카메라 |
| 유닛 이동 | 기본적으로 좌우(횡방향) 이동 |
| 월드 표현 | 실시간 3D 폴리곤, 3D 공간과 카메라 |
| 캐릭터 움직임 | 3D 뼈대/관절 기반 애니메이션을 목표로 함 |
| 개발 환경 | macOS |
| 실행 대상 | macOS와 Windows |
| 개발 언어 | C 고집 없음. C++20을 우선 선택 |
| 엔진 정책 | Unity/Unreal 미사용. 게임 시스템 직접 개발 |
| 모델 제작 정책 | Blender 필수 아님. 절차적 메시 생성부터 시작 |

### 아직 확정하지 않은 사항

- 실제 화면의 아트 스타일: 단순 도형 / 로우폴리 / 사실적 메시
- 플레이 가능한 이동 범위: 완전한 1차원 좌우 이동인지, 일부 Z축 이동을 허용할지
- 점프, 공격, 적 AI, 물리 엔진 도입 범위
- 목표 프레임레이트, 해상도, 지원할 최소 OS 버전
- 외부 3D 모델 에셋을 장기적으로 허용할지

이 문서에서는 **X축 이동만 허용하는 단순한 2.5D 프로토타입**을 첫 목표로 둔다.

---

## 2. 2.5D 게임의 좌표와 카메라

### 좌표계 제안

- **X:** 캐릭터의 좌우 이동
- **Y:** 높이와 점프
- **Z:** 앞뒤 깊이(배경, 장애물 배치)

3D 공간과 깊이를 사용해 장면을 구성하더라도, 게임 규칙에서 플레이어의 Z좌표를 고정하면 2D처럼 조작할 수 있다.

```cpp
struct Vec3 {
    float x, y, z;
};

struct Character {
    Vec3 position;
    float horizontalSpeed;
};

void move_character(Character& c, float axis, float dt) {
    c.position.x += axis * c.horizontalSpeed * dt;
    // 초기 프로토타입에서는 Z 좌표를 변경하지 않는다.
}
```

### 카메라

- 캐릭터의 측면에서 장면을 바라봄
- 카메라 위치를 대상보다 높게 두고 아래로 기울임
- 먼저 **직교 투영(orthographic projection)** 으로 시작하여 횡스크롤 느낌을 유지
- 나중에 원근 투영(perspective projection)을 실험 가능
- 카메라의 X좌표가 플레이어를 따라가도록 구현

카메라가 높은 위치에 있으면 바닥 윗면이 보이지만, 이동 축 자체는 X로 유지된다.

---

## 3. 권장 기술 스택

| 계층 | 권장 기술 | 역할 |
|---|---|---|
| 주 언어 | **C++20** | 게임 시스템, 자료구조, 메모리 관리, 렌더러 제어 |
| 빌드 | **CMake** | macOS 및 Windows 프로젝트 생성·빌드 |
| 플랫폼 계층 | **SDL3** | 창, 이벤트, 키보드/마우스/게임패드 입력 |
| 그래픽 계층 | **SDL3 GPU** | GPU 디바이스, 버퍼, 렌더 파이프라인, 렌더 패스 |
| macOS GPU 백엔드 | **Metal** | macOS GPU 렌더링 |
| Windows GPU 백엔드 | **Direct3D 12 또는 Vulkan** | Windows GPU 렌더링 |
| 셰이더 | 백엔드별 호환 셰이더 패키징 | 정점 변환, 색상, 조명, 스키닝 |
| 수학 | 초기에는 자체 Vec/Mat, 필요하면 GLM 검토 | 벡터, 행렬, 회전, 투영 |
| 개발 환경 | VS Code 또는 Xcode + 터미널 | 작성, 빌드, 디버깅 |

**선정 이유:** 운영체제별 그래픽 API 연결은 SDL3 GPU에 맡기되, 이동/충돌/카메라/메시/애니메이션/렌더링 로직은 직접 작성할 수 있다.

> **중요:** SDL3 GPU를 사용한다고 Metal 코드를 직접 작성하는 것은 아니다. macOS에서 SDL3 GPU가 Metal 백엔드를 사용하도록 구성하고, 게임 코드에서는 공통 SDL GPU API를 호출하는 방식이다. Windows에서도 별도의 실행 파일을 빌드하고 테스트해야 한다.

### 고려한 다른 선택지

| 방식 | 장점 | 단점/주의점 | 적합한 경우 |
|---|---|---|---|
| C + raylib | 가장 빠르게 3D 프로토타입 구현 | 직접 제어하는 렌더링 단계가 상대적으로 적음 | 플레이 감각·게임성 검증 우선 |
| **C++20 + SDL3 GPU** | GPU 렌더링 구조 학습과 크로스플랫폼 균형 | 셰이더, 파이프라인, 메시 업로드를 직접 구현 | **현재 추천** |
| C++ + bgfx | 그래픽 백엔드 추상화와 예제가 잘 마련됨 | 라이브러리의 렌더링 방식에 맞춰야 함 | 자체 엔진을 더 빨리 완성하고 싶을 때 |
| C++ + Metal-cpp | Metal에 직접 접근 | Windows용 별도 렌더러 필요 | macOS 전용 그래픽 학습 목적 |
| 직접 Metal + D3D12/Vulkan | 최대한 세밀한 API 제어 | 백엔드별 코드와 유지보수 비용 큼 | 저수준 렌더링 자체가 주목적 |

### 참고 문서

- SDL3 GPU: https://wiki.libsdl.org/SDL3/CategoryGPU
- SDL3: https://wiki.libsdl.org/SDL3/FrontPage
- CMake: https://cmake.org/cmake/help/latest/
- Apple Metal: https://developer.apple.com/metal/
- Metal-cpp: https://developer.apple.com/metal/cpp/
- bgfx: https://bkaradzic.github.io/bgfx/overview.html
- raylib: https://www.raylib.com/

---

## 4. 크로스플랫폼 아키텍처

```text
+-------------------------------------------------------+
|                    Game (C++20)                       |
|  플레이어 / 규칙 / 충돌 / 카메라 / 월드 / 애니메이션     |
+----------------------------+--------------------------+
                             |
+----------------------------v--------------------------+
|                  Engine Core (C++20)                   |
|  입력 처리 / 씬 / 리소스 / 수학 / 메모리 / 업데이트 루프  |
+----------------------------+--------------------------+
                             |
+----------------------------v--------------------------+
|                Renderer (C++20 + SDL3 GPU)             |
|  버퍼 / 메시 / 셰이더 / 파이프라인 / 렌더패스 / 드로우    |
+----------------------------+--------------------------+
                             |
                  +----------+----------+
                  |                     |
             macOS/Metal       Windows/D3D12 or Vulkan
```

### 모듈별 책임

1. **Platform:** 창 생성, 이벤트, 프레임 시간, 프로그램 종료
2. **Game:** 플레이어 조작, 게임 규칙, 적과 상호작용
3. **Scene:** 오브젝트의 위치·회전·크기 및 계층 구조
4. **Animation:** 뼈대, 관절 회전, 포즈 계산, 애니메이션 상태
5. **Renderer:** 정점/인덱스 버퍼, GPU 자원, 셰이더, 렌더 패스
6. **Assets:** 코드 생성 메시, 셰이더 파일, 텍스처 등 관리

**원칙:** Game은 Metal, Direct3D 12, Vulkan 같은 플랫폼별 API를 직접 알지 않도록 한다.

---

## 5. 3D 캐릭터를 Blender 없이 만드는 방법

### 1단계: 기초 도형 기반 캐릭터

머리(구), 몸통(상자/캡슐), 팔과 다리(원기둥/캡슐)를 조합한다. 관절마다 부모-자식 관계를 만들어 회전값으로 움직인다.

```text
Character Root
 ├─ Torso
 │   ├─ Neck -> Head
 │   ├─ LeftShoulder -> LeftElbow -> LeftHand
 │   └─ RightShoulder -> RightElbow -> RightHand
 ├─ LeftHip -> LeftKnee -> LeftFoot
 └─ RightHip -> RightKnee -> RightFoot
```

### 2단계: 걷기 애니메이션

관절 각도를 시간 기반 함수로 변경한다. 팔과 다리는 서로 반대 위상으로 흔들어 기본 보행을 구현한다.

```cpp
float phase = time * walkFrequency;
float leftLegAngle = std::sin(phase) * amplitude;
float rightLegAngle = std::sin(phase + std::numbers::pi_v<float>) * amplitude;
```

이것은 **간단한 관절 애니메이션 아이디어**일 뿐, 자연스러운 보행 전체를 구현하는 공식은 아니다. 발 접지, 무릎 굽힘, 몸통 상하 이동 등을 추가해야 실제 보행에 가까워진다.

### 3단계: 메시와 스키닝

- **Mesh:** 삼각형 정점, 법선, 인덱스 등으로 구성한 외형
- **Skeleton:** 관절과 부모 관계를 나타내는 계층
- **Skinning:** 각 정점이 관절 변환에 따라 움직이도록 가중치를 적용
- **Shader:** 정점 위치 변환과 표면 음영 계산

완성된 메시 모델을 수작업으로 만들지 않아도, 코드로 절차적 메시를 생성할 수 있다. 다만 인간형 외형, 옷, 자연스러운 변형까지 직접 구현하는 난도는 높으므로 단계적으로 접근한다.

---

## 6. 첫 번째 렌더링 목표

첫 번째 성공 기준은 다음 장면을 **macOS에서 실시간으로 출력**하는 것이다.

1. 프로그램 창을 연다.
2. GPU 디바이스와 스왑체인을 초기화한다.
3. 정점·인덱스 버퍼를 업로드한다.
4. 정점 셰이더와 프래그먼트 셰이더를 준비한다.
5. 깊이 테스트를 포함한 3D 렌더 파이프라인을 만든다.
6. 바닥과 큐브 캐릭터를 그린다.
7. 방향키를 누르면 캐릭터의 X좌표가 변한다.
8. 카메라가 캐릭터를 따라간다.

**주의:** raylib의 `DrawCube()`와 달리 SDL3 GPU는 정점 데이터, 파이프라인, 셰이더 등을 직접 준비해야 한다. SDL3 GPU만 설치해 곧바로 큐브를 그리는 함수가 생기는 것은 아니다.

### 게임 루프 의사코드

```cpp
while (running) {
    float dt = timer.elapsed_seconds();

    platform.poll_events();
    input.update();
    game.update(dt);           // X축 이동과 게임 규칙
    animation.update(dt);      // 관절 포즈 계산
    camera.follow(player);     // 측면 카메라

    renderer.begin_frame();
    renderer.draw(world);
    renderer.draw(player);
    renderer.end_frame();
}
```

위 코드는 **설계 설명용 의사코드**이며, 그대로 컴파일되는 SDL3 GPU 예제는 아니다.

---

## 7. macOS 개발 환경

### 필수 도구

1. Apple Command Line Tools 또는 Xcode
2. Homebrew(선택 사항이지만 패키지 설치에 편리)
3. CMake
4. Ninja(권장)
5. SDL3
6. C++ 편집기(VS Code 또는 Xcode)

### 설치 예시

```bash
xcode-select --install

# Homebrew 설치 후
brew install cmake ninja sdl3 pkg-config
```

버전과 설치 경로는 macOS/CPU 아키텍처에 따라 다를 수 있다.

### 기본 프로젝트 구조

```text
MyGame/
├── CMakeLists.txt
├── README.md
├── src/
│   ├── main.cpp
│   ├── core/
│   │   ├── Game.cpp
│   │   ├── Input.cpp
│   │   └── Timer.cpp
│   ├── graphics/
│   │   ├── Renderer.cpp
│   │   ├── Mesh.cpp
│   │   ├── Camera.cpp
│   │   └── Shader.cpp
│   ├── animation/
│   │   ├── Skeleton.cpp
│   │   └── Animator.cpp
│   └── gameplay/
│       ├── Character.cpp
│       └── World.cpp
├── include/
├── shaders/
├── assets/
└── tests/
```

### 최소 CMake 예제 (SDL3 연결)

```cmake
cmake_minimum_required(VERSION 3.21)
project(My2_5DGame LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(SDL3 REQUIRED CONFIG)
add_executable(My2_5DGame src/main.cpp)
target_link_libraries(My2_5DGame PRIVATE SDL3::SDL3)
```

```bash
cmake -S . -B build -G Ninja
cmake --build build
```

이 예제는 **빌드 기반만 구성**한다. 실제 3D 렌더링에는 SDL GPU 초기화와 셰이더·파이프라인 코드가 추가로 필요하다.

---

## 8. Windows 호환성 확보 방법

- 공통 코드는 **표준 C++20 + SDL3/SDL3 GPU API**로 작성한다.
- 운영체제별 기능은 Platform 모듈 뒤로 숨긴다.
- 파일 경로를 `/`나 `\\`에 의존해 직접 합치기보다 `std::filesystem`을 사용한다.
- 셰이더는 Metal과 Windows 백엔드에서 필요한 형식으로 **플랫폼별 변환/패키징**하도록 빌드 단계를 설계한다.
- macOS에서 실행 확인한 후 Windows에서 **별도로 빌드·실행·성능 확인**한다.
- 하나의 macOS 실행 파일을 Windows에서 그대로 실행하는 것은 불가능하다.
- 최종 배포에서는 DLL/동적 라이브러리, 에셋 경로, 셰이더 포함 여부를 확인한다.

Windows용으로 빌드할 때는 Windows 머신의 MSVC/Visual Studio 또는 지원되는 크로스컴파일 환경이 필요하다. **Windows에서 실제 실행 테스트를 하는 것이 권장된다.**

---

## 9. 권장 개발 로드맵

### Phase 0 — 공통 개발 환경

- [ ] C++20 + CMake 프로젝트 생성
- [ ] SDL3 창 생성 및 이벤트 루프
- [ ] macOS에서 빌드/실행
- [ ] 저장소와 빌드 명령 문서화

**완료 기준:** 빈 창이 뜨고 정상 종료된다.

### Phase 1 — Metal 백엔드를 사용하는 첫 3D 렌더링

- [ ] SDL3 GPU 디바이스 초기화
- [ ] 스왑체인 확보
- [ ] 삼각형 렌더링
- [ ] 깊이 버퍼 및 3D 큐브 렌더링
- [ ] 카메라 행렬 적용

**완료 기준:** macOS에서 회전 가능한 3D 큐브가 그려진다.

### Phase 2 — 2.5D 조작

- [ ] 직교 투영의 측면 카메라
- [ ] X축 이동 및 카메라 추적
- [ ] 바닥, 장애물 및 기본 충돌 처리
- [ ] 고정 프레임 기반 또는 안정적인 업데이트 루프 정리

**완료 기준:** 큐브 캐릭터가 횡스크롤 공간을 이동한다.

### Phase 3 — 절차적 인체와 관절

- [ ] 코드로 구/상자/원기둥 메시 생성
- [ ] 계층형 관절 구조 구현
- [ ] 기본 보행과 정지 애니메이션
- [ ] 걷기 방향에 따른 캐릭터 회전

**완료 기준:** Blender 없이 생성한 인체형 캐릭터가 좌우로 걷는다.

### Phase 4 — 외형 개선

- [ ] 법선과 기본 조명
- [ ] 메시 연결/스키닝 실험
- [ ] 발 접지, 무릎 및 팔 움직임 개선
- [ ] 그림자와 배경 연출

**완료 기준:** 단순 도형을 넘어 입체적 캐릭터의 움직임이 자연스럽게 보인다.

### Phase 5 — Windows 포팅

- [ ] Windows에서 CMake 빌드
- [ ] SDL3 GPU 백엔드 동작 확인
- [ ] 셰이더 패키징 검증
- [ ] 입력·렌더링·리소스 경로 테스트

**완료 기준:** 동일한 게임 규칙과 장면을 macOS 및 Windows에서 실행한다.

> Windows 지원은 마지막에만 확인하지 말고, **Phase 1~2를 마친 시점부터 Windows 빌드를 주기적으로 검증**하는 것이 좋다.

---

## 10. 기술적 난점과 대응

| 위험 | 이유 | 초기 대응 |
|---|---|---|
| GPU API 학습 비용 | SDL3 GPU는 저수준 렌더링 개념 필요 | 삼각형 → 큐브 → 장면 순서로 확장 |
| 플랫폼별 셰이더 | 각 백엔드가 요구하는 셰이더 바이너리/형식 차이 | 셰이더 빌드 자동화와 초기 Windows 검증 |
| 자연스러운 인체 외형 | 관절 구조와 표면 메시가 별도 문제 | 기본 도형 인체부터 시작 |
| 자연스러운 보행 | 사인파만으로는 발 접지 및 균형 표현 어려움 | 포즈 상태와 보행 주기 단계적 개선 |
| 개발 범위 확대 | 엔진과 게임을 동시에 개발하면 일정이 길어짐 | 작은 플레이어블 프로토타입을 우선 완성 |
| OS별 문제 | 그래픽 드라이버, 창, 입력, 경로가 다름 | 플랫폼 추상화와 반복 검증 |

---

## 11. 이번 프로젝트에서 권장하는 결정

**우선 채택:** `C++20 + CMake + SDL3 + SDL3 GPU`

- macOS 개발 시 Metal 백엔드를 이용한다.
- Windows에서는 지원되는 Direct3D 12 또는 Vulkan 백엔드를 이용한다.
- 3D 씬, 좌우 이동, 카메라, 애니메이션, 메시 생성은 직접 만든다.
- 초반에는 Blender나 외부 3D 에셋에 의존하지 않는다.
- 첫 완성 목표는 **바닥 + 카메라 + 좌우 이동하는 관절형 캐릭터**다.

### 성공 기준 — 첫 번째 플레이 가능 빌드

> macOS에서 시작해, 옆에서 약간 내려다보는 카메라로 3D 공간을 보여주고, 코드로 생성한 캐릭터가 좌우로 움직이며 간단한 보행 동작을 수행한다. 이후 같은 소스를 Windows에서 별도 빌드하여 같은 동작을 검증한다.

---

## 12. 다음 구현 작업

1. SDL3 GPU의 **삼각형 렌더링** 샘플을 macOS에서 실행한다.
2. 정점/인덱스 버퍼와 행렬을 도입해 **3D 큐브**로 확장한다.
3. 2.5D **카메라와 좌우 입력**을 연결한다.
4. 큐브를 **절차적으로 만든 관절형 캐릭터**로 교체한다.
5. Windows 빌드 및 셰이더 호환성을 검증한다.

**권장 원칙:** 실제로 보이는 결과를 매 단계 만들어야 한다. 처음부터 완전한 게임 엔진이나 사실적인 캐릭터를 설계하려고 하지 않는다.
