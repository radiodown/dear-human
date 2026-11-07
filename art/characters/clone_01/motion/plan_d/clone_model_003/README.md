# 플랜 D · clone_model_003

2026-11-07 KST. 사용자 채택 clone_01의 특징을 옮긴 실제 3D 모델 첫 초안이다. 현재 목표는 모델 생성·관절 연결·네이티브 표시 경로를 확인하는 것이며 채택 외형의 최종 품질 승인은 남아 있다.

[로컬 실행](../../../../../../native/plan-d/README.md) · [제작 범위·한계](../../../../../../docs/plan-d-clone-model-003.md) · [GLB 모델](source/clone_01.glb) · [제작 레시피](records/recipe.json) · [인계](records/handoff.json) · [GLB 검사](records/gltf-validation.json)

| 확인 화면 | 실제 Metal GPU PNG |
|---|---|
| 전신 사선 | [three-quarter.png](reviews/three-quarter.png) |
| 얼굴 정면 확대 | [face.png](reviews/face.png) |
| 뒤쪽 사선 | [back-three-quarter.png](reviews/back-three-quarter.png) |
| 90프레임 보행 후 | [walking.png](reviews/walking.png) |

모델은 28,334 정점 / 44,768 삼각형 / 21개 관절 / 15개 재질이다. 정점 가중치로 공통 뼈대에 연결했고 `clone_01.glb`에도 같은 데이터와 inverse bind를 저장했다. GLB에는 애니메이션 클립이 없다. 뷰어는 같은 C++ 작성 코드에서 메시를 만들며 GLB 가져오기 로더는 아직 없다. PNG 원화를 평면에 붙이거나 AI 이미지를 생성한 결과가 아니다.

GLB는 공식 검사기에서 오류·경고 0건이다. 피부·머리·의상은 고해상도 텍스처가 없는 단순화된 모델이며 얼굴 닮음·천/머리 충돌·완성 모션·Windows 실행은 미검수다. 초기 렌더는 `attempt-*`로 보존했다. 변경 전 코드는 [runtime-before.tar.gz](records/runtime-before.tar.gz), 현재 작성 소스는 [runtime-sources.tar.gz](source/runtime-sources.tar.gz), 결과 해시는 [artifacts.sha256](records/artifacts.sha256)에 있다.

## 실행과 저장

프로젝트 루트에서 실행한다.

```sh
./native/plan-d/run.command
```

`Q/E` 회전, `F` 얼굴 확대, `M` 마네킹 비교, `W` 보행, `Space` 정지/재개. 모델 파일을 다시 저장하려면 새 출력 경로를 사용한다.

```sh
native/plan-d/build/bin/dear-human-plan-d --export-model /tmp/clone_01.glb
```

모델 작성은 `CloneModel.cpp`의 절차적 곡면·장비 메시와 `ModelExport.cpp`의 표준 GLB 저장을 사용한다. 프롬프트·이미지 생성 모델·seed는 없다. 기존 원화는 시각 기준으로만 참조했다. 사용자 아트 채택은 별도로 기록한다.
