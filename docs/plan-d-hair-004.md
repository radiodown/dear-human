# 플랜 D · 머리카락 분리와 조사 기반 카드 도입 004

기존 `clone_model_003`의 모델링 품질에 대한 사용자 반려 후 머리카락부터 분리했다. 최초 직접 조형 보정 중 사용자가 선행 조사를 요청했고, 논문·상용 엔진 제작 문서·공개 소스/라이선스를 확인한 뒤 **가이드 곡선 + 헤어 카드 + 가닥 coverage atlas**로 방향을 바꿨다. [조사·후보별 선택 근거](../art/characters/clone_01/motion/plan_d/hair_004/research/decision.md).

현재 상태는 **기법 도입·네이티브 표시 확인 / 외형 사용자 검수 대기**다. 원화 수준의 모델링 완성이나 TressFX·Unity 라이브러리 통합으로 보고하지 않는다.

## 보기

[머리카락 전용 실행](../native/plan-d/review-hair.command)을 더블클릭한다. 같은 네이티브 뷰어에서 `H`로 머리만/전체, `F`로 얼굴 확대, `Q/E`로 회전, 휠로 확대한다. Mac/Windows 공통 코어를 유지하며 현재 실행 확인은 Mac Metal에 한정한다.

- [정면 확대](../art/characters/clone_01/motion/plan_d/hair_004/reviews/front.png)
- [옆면 전체 길이](../art/characters/clone_01/motion/plan_d/hair_004/reviews/side.png)
- [뒤쪽](../art/characters/clone_01/motion/plan_d/hair_004/reviews/back.png)
- [기존 얼굴/몸과의 사선 결합](../art/characters/clone_01/motion/plan_d/hair_004/reviews/three-quarter.png)

## 구현과 산출물

`HairModel.cpp`에서 정수리·앞머리·옆머리·뒷머리·땋은 머리·잔머리를 별도 함수/Part로 구성한다. 기존 굵은 원통 대신 가이드를 따라 휘어진 여러 겹의 3D 카드와 두피 받침 곡면을 사용한다. 카드는 카메라를 향해 돌아가는 빌보드가 아니다. 가닥 하나마다 입체 메시를 만든 방식과도 구분한다.

`tools/build_hair_atlas.py`는 고정 seed의 822개 2D 모발 곡선에서 1024×1024 RGBA atlas를 생성한다. RGB는 가닥 명암, A는 coverage이며 8개 구역에 밀도를 나눴다. 원화 PNG를 자르거나 생성형 모델로 새 외형을 만들지 않았다. 곡선 레시피는 `source/hair-atlas.curves.json`에 저장했다. 빌드/실행에서는 생성기를 자동 호출하지 않고 저장된 PNG를 복사/읽는다.

네이티브는 같은 UV/atlas에 깊이 쓰기·4× MSAA alpha-to-coverage를 사용한다. 모발 접선으로 이동한 두 반사 성분과 보조광은 MSL/HLSL에 함께 작성했다. Marschner의 완전한 물리 산란·TressFX 가림/물리·미분 최적화를 구현한 것이 아니다. 표준 셰이더는 유지하고 모발 분기만 추가했다. MSAA는 공통 렌더 타깃에도 적용된다.

| 산출물 | 저장 정점 | 삼각형 |
| --- | ---: | ---: |
| [머리카락 단독 GLB](../art/characters/clone_01/motion/plan_d/hair_004/source/hair.glb) | 21,025 | 30,256 |
| [clone_01 전체 GLB](../art/characters/clone_01/motion/plan_d/hair_004/source/clone_01.glb) | 45,835 | 69,680 |

기존 얼굴/몸의 형상은 003을 재사용한다. 머리카락은 Head 관절에 고정되며 별도 물리 관절은 없다. GLB 프리미티브의 `extras.part`로 파트를 구분하고 UV·PNG·MASK 재질을 포함한다. 머리카락 파일도 공통 21관절과 16재질 테이블을 유지하므로 사용하지 않는 재질 정보가 남는다. GLB 뷰어에서는 표준 PBR 대체 조명을 사용하므로 네이티브와 동일한 하이라이트를 보장하지 않는다. 네이티브는 여전히 같은 C++ 데이터 생성 경로이며 GLB importer는 없다.

## 확인과 남은 문제

필요한 증분 빌드, 실제 Metal 정지 화면 피드백, 두 GLB의 Khronos 형식 검사만 수행했다. GLB는 오류 0·경고 0이며 미사용 재질 정보가 있다. 전체 프로젝트 테스트·웹 검사·성능 벤치마크·Windows 실행은 하지 않았다. 헤어 카드 도입 직전 고밀도 시도에서 GPU 버퍼 한도 오류가 있어 정점/인덱스 예산을 16/8MiB로 늘렸다. 최종 카드는 그 시도보다 분할 수를 줄였다.

정면에서 이전 굵은 원통 끝이 가는 모발 coverage로 바뀌고 뒤쪽 두피 노출을 보정한 것을 확인했다. 하지만 정수리의 헬멧 같은 덩어리감, 반복되는 빗질 패턴, 측면의 카드 경계와 확대 시 coverage 입자가 남는다. 자체 그림자·실제 AO·깊이/방향 텍스처·mipmap/거리별 LOD·동적 충돌/물리는 없다. 특히 움직임과 원거리에서의 깜빡임은 아직 검수하지 않았다. 얼굴 닮음과 몸의 모델링 품질은 이번 작업 범위 밖이며 그대로 미완료다.

조사 전 `attempt-*`, 도입 첫 화면 `cards-*`, 최종 지정 화면을 구분한다. `attempt-002-face.png`는 당시 실제 키 입력이 들어가 마네킹으로 바뀐 잘못된 캡처이며 머리 검수 근거가 아니다. 이후 고정 프레임 CLI 캡처에서는 사용자 조작 입력을 무시하도록 수정했다. 대화형 실행은 그대로 입력을 받는다.

이전 003 산출물과 작업 전 스냅샷을 보존했다. 외부 생성 서비스 호출·유료 에셋 구매는 없고 코드/절차적 데이터 제작만 수행했다. 원본 A/B/C·모션·채택 원화는 변경하지 않았다.
