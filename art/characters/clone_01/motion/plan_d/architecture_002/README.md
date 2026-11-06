# 플랜 D · architecture_002

2026-11-07 KST. 메인 움직임·포즈·화면 데이터와 플랫폼 입력·GPU 구현을 분리한 버전이다.

[실행 안내](../../../../../../native/plan-d/README.md) · [구조 설명](../../../../../../docs/plan-d-cross-platform-002.md) · [개발 인계](records/handoff.json) · [실제 실행 출력](records/verification.log) · [변경 전 소스](records/runtime-before.tar.gz) · [소스·산출물 해시](records/artifacts.sha256)

- `plan-d-core`: SDL 없이 빌드하는 공통 이동·보행·포즈·장면 계산.
- `plan-d-app`: `IPlatform` / `IRenderer`를 사용하는 공통 실행 루프.
- `plan-d-sdl`: 공통 SDL 창·입력·GPU 구현. CMake가 macOS Metal 또는 Windows D3D12 설정을 선택.

기존 인체와 그림을 재사용했으며 새 외형·모션을 생성하지 않았다. [overlay.png](reviews/overlay.png)는 실제 Metal 창의 GPU 타깃에서 받은 2560×1600 PNG이며 시각 확인 후 최초 같은 설정 PNG와 바이트까지 동일함을 확인했다.

확인은 SDL 없는 코어 단독 빌드, 작은 이동/시간/렌더 분리 검사 한 번, Mac 빌드와 3프레임 실행·한 장 캡처로 제한했다. Windows용 코드·빌드 진입점은 준비했지만 실제 Windows 빌드·실행·입력·배포는 미검증이다. 일반 실행에서 테스트나 캡처를 자동 수행하지 않는다.
