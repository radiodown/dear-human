# 헤어 선행 조사와 도입 결정 · 2026-11-07

사용자 요청: 기존 절차적 머리 형상의 반복 보정보다 논문·상용 공개 구현·오픈소스의 해결책을 먼저 조사하고 가능성 있는 요소를 도입한다. `pre-research-attempt.tar.gz`와 attempt-001~003은 조사 전 시도이며 채택 결과가 아니다.

## 근거와 선택

| 자료 | 확인한 내용 | 현재 프로젝트 결정 |
| --- | --- | --- |
| [Scheuermann, SIGGRAPH 2004](https://history.siggraph.org/wp-content/uploads/2022/12/2004-Talks-Scheuermann_Practical-Real-Time-Hair-Rendering-and-Shading.pdf) | 겹친 폴리곤 패치·opacity·접선 방향으로 이동한 두 반사 성분, 별도 가림 처리 | 곡면 카드·coverage와 두 반사 성분 채택. 논문의 4-pass 투명 렌더는 그대로 구현하지 않고 깊이 쓰기 + 4× MSAA alpha-to-coverage로 시작(GLB는 MASK) |
| [Marschner et al., SIGGRAPH 2003](https://aperture.stanford.edu/papers/hair/) | 단순 Kajiya–Kay가 설명하지 못하는 다중 하이라이트와 섬유 내부 산란 | 광택 방향 근거. 완전한 R/TT/TRT 산란 모델을 구현했다고 보고하지 않음 |
| [Epic Hair Card Generator](https://dev.epicgames.com/documentation/en-us/unreal-engine/hair-card-generator-for-grooms-in-unreal-engine) | 가이드/가닥 묶음·카드·atlas, 그룹별 조절과 여러 카드로 볼륨 표현 | 정수리/앞/옆/뒤/잔머리 그룹과 atlas 기반 카드 적용. Unreal 플러그인/에디터를 이식한 것은 아님 |
| [SideFX Hair Cards](https://www.sidefx.com/docs/houdini/fur/haircards.html) | 가이드에서 직접 카드 생성 가능. 형상과 카드 텍스처 제작 분리 | C++ 가이드와 오프라인 atlas 생성기를 분리. Houdini 설치·코드 복사 없음 |
| [AMD TressFX](https://github.com/GPUOpen-Effects/TressFX) | MIT, DX12/Vulkan 엔진 인터페이스, compute 물리·가림/coverage. `TressFXLighting.hlsl`, `TressFXRendering.hlsl` 확인 | 물리·strand 렌더 후보로 보류. Metal/SDL GPU 이식과 투명도/그림자 리소스가 필요. 현재 라이브러리 연결 없음 |
| [Unity Demo Team Hair](https://github.com/Unity-Technologies/com.unity.demoteam.hair), [라이선스](https://raw.githubusercontent.com/Unity-Technologies/com.unity.demoteam.hair/master/LICENSE.md) | 가이드/클러스터·LOD·GPU solver의 공개 구현, Unity Companion License for Unity-dependent projects | 설계 참고만. 독립 C++ 엔진에 소스 복사하지 않음 |
| [Blender Hair Interpolation](https://docs.blender.org/manual/en/5.1/modeling/geometry_nodes/hair/generation/interpolate_hair_curves.html) | 적은 가이드로 다수 모발을 보간하고 표면 UV에 부착 | 향후 DCC 편집 경로의 후보. 현재 Blender 플러그인이나 보간 노드를 실행하지 않음 |
| [Zheng et al., 2025 v2](https://arxiv.org/html/2505.18805v2) | 가닥 군집→카드 프레임/방향→곡선 기반 텍스처→최적화. 원본 groom을 입력으로 요구 | 곡선 데이터와 raster atlas를 분리하고 프레임을 연속 유지하는 구조 참고. 미분 최적화·자동 groom 복원 미도입. 공개 실행 코드/라이선스를 확보했다고 주장하지 않음 |

TressFX 조회 시 master tree SHA: `ba0bdacdfb964e38522fda812bf23169bc5fa603`. 라이선스 원문: <https://raw.githubusercontent.com/GPUOpen-Effects/TressFX/master/license.txt>. 확인한 웹 문서의 버전은 조회 당시 버전이며 설치된 엔진 버전이 아니다.

## 실제 도입 범위

1. 큰 원통/고밀도 주름 메시를 모발 가이드와 낮은 분할수의 휘어진 카드로 교체한다.
2. 카드에 UV와 별도 HairCards 재질을 두고, 가닥별 끝 길이·간격이 있는 RGBA atlas를 오프라인 생성한다. 원화 사진을 잘라 붙이지 않는다.
3. 네이티브 GPU에 같은 atlas를 올리고 4× MSAA alpha-to-coverage와 깊이 쓰기로 가림을 처리한다. 정렬이 필요한 반투명 합성·TAA·OIT 구현으로 확대 해석하지 않는다.
4. 두피 볼륨을 유지하면서 앞머리 끝·가르마·긴 옆/뒤 카드의 겹침을 조정한다. 머리카락 접선의 두 반사 성분은 MSL/HLSL에 같은 식으로 둔다.
5. 원본 곡선/atlas 생성기·PNG·GLB·네이티브 캡처를 버전 경로에 남긴다. GLB는 표준 alpha mask/PBR 대체 표현이며 네이티브 헤어 셰이더와 완전히 같은 조명이 아니다.

## 선택 이유와 한계

문제는 폴리곤 수만이 아니다. 현재 모델에는 가닥 사이의 빈틈·부드러운 끝·정수리에서 흘러가는 방향·겹침에 따른 가림이 부족하다. 먼저 카드/coverage로 이 표현을 확보하는 편이 현재 C++20·SDL GPU·Metal/D3D12 구조에 맞는다는 것이 이번 조사에 따른 구현 판단이다.

가이드의 헤어스타일 자체는 여전히 제작해야 한다. 이 기술을 연결했다고 원화 닮음·상용 완성도·자동 모델링이 확보되는 것은 아니다. 두상/얼굴은 003을 유지하고, 모발 물리·실제 자체 그림자·고품질 샘플링·거리별 LOD는 후속 범위다. 필요한 빌드와 시각 피드백만 확인한다.
