# 플랜 D · preparation_001

2026-11-07 KST. 사용자 요청 순서인 **환경 구축 / 간단한 뼈대 / 렌더링 씌어보기**를 위한 첫 로컬 C++ 프로토타입이다.

[실행 안내](../../../../../../native/plan-d/README.md) · [개발 기록](../../../../../../docs/plan-d-native-001.md) · [원문 설계서](source/technical-design-v0.2.md) · [도구·환경](records/environment.json) · [개발 인계](records/handoff.json) · [실제 실행 출력](records/native-runs.log)

## 저장한 화면

| 보기 | 실제 GPU PNG |
|---|---|
| 중립 뼈대 | [bones.png](reviews/bones.png) |
| 중립 도형 + 뼈대 | [overlay.png](reviews/overlay.png) |
| 기본 도형·보행 정지 포즈 | [solid-walk-pose.png](reviews/solid-walk-pose.png) |

모두 실제 Metal 창의 오프스크린 타깃에서 내려받은 2560×1600 PNG다. 같은 타깃을 창에도 표시한다. 원본을 편집·재합성하거나 AI로 이미지를 생성하지 않았다. 중립 인체의 계층·가림·기본 조명을 시각 확인했으며 채택 외형·자연스러운 보행 승인으로 해석하지 않는다.

## 재현

프로젝트 루트에서 빌드한 실행 파일을 호출한다. 아래는 이번 실행의 상태 설정이며, 재검수한다면 `--capture`는 새 버전 경로를 사용해 기존 PNG를 덮어쓰지 않는다.

```sh
native/plan-d/build/bin/dear-human-plan-d --view overlay --paused --frames 3 --capture /tmp/plan-d-overlay.png
native/plan-d/build/bin/dear-human-plan-d --view bones --paused --frames 3 --capture /tmp/plan-d-bones.png
native/plan-d/build/bin/dear-human-plan-d --view solid --walk --phase 1.0 --paused --frames 3 --capture /tmp/plan-d-solid.png
```

`--capture` 없이 평소 실행하면 자동 캡처나 일괄 검수를 수행하지 않는다. 코드 생성 도형은 `native/plan-d/src/Scene.cpp`와 `Skeleton.cpp`가 원본이며 외부 3D 모델이나 원화 프롬프트는 없다. 소스와 결과의 실제 SHA-256은 [artifacts.sha256](records/artifacts.sha256)에 기록한다.

현재 확인은 macOS Debug 빌드와 세 정지 화면에 한정한다. 입력 전체·보행 품질·Windows·성능 검수는 미완료이며 사용자 검수 대기다. 후속 결과는 새 버전에 남긴다.
