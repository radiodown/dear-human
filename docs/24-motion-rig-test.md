# 24. 채택 외형의 파츠 모션 시험

[문서 목록](../README.md) · 기준 외형은 [02](02-world-and-art.md), 채택·정리 기록은 [23](23-character-appearance-review.md)이다. 이 문서는 실제 구현한 첫 시험과 남은 검수를 구분한다.

## 1. 현재 결과

사용자가 채택한 검은 장발·전술 갑옷·3D 렌더 질감으로 **분리 파츠와 자체 WebGL 리그의 첫 모션 샘플**을 만들었다. 원화 한 장을 통째로 흔드는 방식이 아니다. 16칸 캐릭터 아틀라스에서 각 파츠의 UV 영역을 읽고, 몸통·팔·다리·머리·망토를 따로 배치한다. M16 본체·탄창은 독립 이미지다.

채택한 전신 기준화는 그대로 보존했다. 이전 분홍 머리 제복과 중단된 시험의 원본·프롬프트·기록은 사용자 요청으로 삭제했다. 새 파츠는 생성 초안이며 원화의 얼굴·재질·비례를 완벽히 옮겼다는 판정은 아니다.

## 2. 같은 사이트에서 확인

프로젝트 루트에서 실행한다.

```powershell
python tools/preview_server.py --port 4173
```

- [캐릭터 모션](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=idle)
- [이동 사격](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=walk_fire)
- [빈 탄창 장전 0.75초 정지 장면](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=reload_empty&time=0.75&paused=1&debug=1)
- [M16 장착 샘플](http://127.0.0.1:4173/#/samples/weapons/m16_basic?motion=idle)

대기 호흡·제자리 보행·사격·이동 사격, 단발/누르고 연사, 좌우 반전, 일반/빈 탄창 장전 초안, 피격 보조 반응을 제공한다. Space 연사·A/D 이동 자세·R 장전도 지원한다. 아직 실제 스테이지의 횡이동·적·피해 판정을 연결하지 않았다.

일시정지·1프레임·느린 재생, 64/128px 기준 비교, 반동/고개/머리카락/안쪽 천/망토 on/off, 뼈대·손잡이·총구·메시 표시, 분리 파츠 보기와 다른 길이의 진단 도형을 제공한다. 진단 도형은 두 번째 완성 무기가 아니다. 캔버스의 화면 맞춤 배율이 추가되므로 64/128 옵션은 논리 크기 비교이며 정확한 물리 화면 픽셀 검증은 별도다.

URL의 motion은 idle/walk/fire/walk_fire/reload/reload_empty, time은 최대 10초의 재현 시점, paused=1은 정지 상태다. debug=1, mesh=1, face=left, weapon=diagnostic도 시험 입력으로 쓴다. 실제 버튼을 클릭한 검수와 URL로 재현한 정지 장면 검수를 구분한다.

## 3. 실제 처리 구조

공통 코드는 [리그 시뮬레이션](../game/animation/rig-core.js), [무기별 데이터](../game/animation/weapon-profiles.js), [WebGL 표시기](../game/animation/webgl-character.js)다. [기존 앱의 시험 화면](../game/rig-lab.js)이 이 모듈을 사용하며 향후 게임 씬에서도 같은 모듈을 불러오는 구조다. 아직 Phaser·Spine 런타임으로 이식하거나 실제 게임 씬에서 재사용한 것은 아니다.

1. 보행 키포즈·몸통의 대기 호흡을 평가한다.
2. 무기 장착점·반동을 정하고 같은 변환에서 두 손잡이·총구·탄창 소켓을 계산한다.
3. 두 팔의 2본 IK를 손잡이 목표에 맞춘다. 무기가 손을 추적하는 순환을 만들지 않는다.
4. 장전 위상은 보조 손을 탄창/조작부 목표로 이동시키고 기본 파지로 복귀시킨다.
5. 머리·머리카락·안쪽 천·망토에 각기 다른 감쇠 스프링을 적용한다. 머리카락·망토는 뿌리를 고정한 국소 메시로 변형한다.
6. 최종 표시에서 좌우를 한 번 반전하고 동일 총구에 진단 화염·발사선을 표시한다.

시뮬레이션은 고정 120Hz이며 큰 프레임 간격은 한 번에 0.1초까지만 처리한다. 탭 숨김·모드 이탈 때 누른 사격 입력과 누적 시간을 해제한다. 흉갑은 rigid, 다리 장갑은 분절 파츠다. 안쪽 천 변형은 흉갑에 가려지므로 겉판에 바스트 모핑이 나타나지 않는 것이 의도한 동작이다.

M16은 30발, 0.1초 발사 간격, 일반 장전 2.2초·빈 탄창 2.8초다. 장전 중 발사를 막고 완료 때 한 번만 보충한다. 탄창은 별도 파츠이며 손·탄창 교체 동작은 초안이다. 실제 조작부 애니메이션·여러 손 모양·장전 소리는 후속이다.

## 4. 산출물과 제작 비용

- [캐릭터 아틀라스](../art/characters/clone_01/motion/rig_002/source/parts_atlas.png): 실제 출력 1254×1254, 16칸. 요청 프롬프트의 2048과 실제 출력 크기를 구분한다.
- [파츠 UV·재질 정의](../art/characters/clone_01/motion/rig_002/rig/parts.json): 각 파츠의 원본 영역과 한계를 기록한다. 이미지를 수정·잘라 저장하지 않고 원본 UV를 사용한다.
- [캐릭터 영어 JSON 프롬프트 MD](../art/characters/clone_01/motion/rig_002/records/prompt.md), [제작 기록](../art/characters/clone_01/motion/rig_002/records/generation.json).
- [M16 아틀라스](../art/weapons/m16_basic/rig_002/source/weapon_atlas.png): 1536×1024. 본체·탄창을 따로 읽는다. [무기 프롬프트 MD](../art/weapons/m16_basic/rig_002/records/prompt.md), [제작 기록](../art/weapons/m16_basic/rig_002/records/generation.json).

내장 image_gen.imagegen으로 두 이미지를 생성했다. 생성 대기는 각각 52.026초·82.966초이며 병렬 요청이므로 합계를 총 작업 시간으로 해석하지 않는다. 코딩·리깅·검수 시간은 따로 측정하지 않았다. 모델 ID·seed·결제 비용은 제공되지 않아 null이다. 페이지 방문이나 모션 변경에서 생성 호출을 하지 않는다.

## 5. 검사 결과

```powershell
npm --prefix game run check
npm --prefix game test
python -m unittest discover -s tools/tests -v
python tools/agent_pipeline.py --root . docs-check
python tools/agent_pipeline.py --root . catalog-check
```

[시뮬레이션 검사](../tools/tests/rig-core.test.mjs) 7개와 기존 파이프라인 검사 14개를 사용한다. 실제 수치는 [측정 JSON](../art/characters/clone_01/motion/rig_002/tests/simulation-metrics.json)에 기록한다.

| 항목 | 확인한 범위 |
|---|---|
| 30/60/120Hz | 동일한 2초 입력에서 20발·잔탄 10발, 스프링 상태 일치 |
| 손잡이 IK | 보행·사격·장전·좌우·진단 무기 조합에서 수학적 목표점 오차 검사. 실제 손바닥 그림 접점 판정과 다름 |
| 반동·보조 반응 | 발사당 한 번 입력, 연사 중 상한 유지, 입력 중단 0.4초 뒤 안정 확인 |
| 장전 | 발사 차단·중복 시작 차단·2.2/2.8초 완료·한 번 보충 |
| 무기 재사용 | 100회 교체 후 캐릭터 기준화·아틀라스·리그 정의·공통 코드 해시 불변 |
| 웹 표시 | 로컬 Chrome 정지 캡처로 파츠 조립, 이동 사격·진단 화염, 장전 0.75초, 500px 폭 화면을 시각 확인 |

내장 브라우저는 환경 오류가 있었고 원격 제어 브라우저 실행도 자동 검토에서 거부됐다. 원격 제어 없이 로컬 Chrome의 단일 화면 출력으로 확인했다. **실제 버튼·키보드·포인터·탭 전환을 자동 조작한 검수는 미완료**이며 GPU 성능·FPS·다수 적 부하도 측정하지 않았다. 캡처는 [대기](../art/characters/clone_01/motion/rig_002/previews/idle-desktop.png), [이동 사격·디버그](../art/characters/clone_01/motion/rig_002/previews/moving-fire-desktop.png), [장전](../art/characters/clone_01/motion/rig_002/previews/reload-desktop.png), [500px 폭](../art/characters/clone_01/motion/rig_002/previews/narrow-500.png)에 보관한다.

## 6. 판단과 남은 작업

**분리 파츠·외부 무기·IK·국소 메시로 웹 샘플을 만드는 구조는 첫 시험에서 성립했다. 제작 도구의 최종 채택은 보류한다.** 이번에는 자체 JavaScript/WebGL만 사용했고 Spine 편집기·공식 런타임·2dimg2motion·PixelFX를 실제 시험하지 않았다. 따라서 Spine과의 제작 시간·품질·비용 비교가 완료됐다고 결론 내리지 않는다.

현재 파츠는 완전한 90도 측면보다 3/4에 가깝다. 앞/뒤 팔다리를 같은 그림과 명암으로 재사용했고 주 손/보조 손도 같은 주먹 파츠다. 생성된 팔에는 약한 굽힘·장갑 연결 형태가 남아 있어 최종 어깨·팔꿈치·손목 가림, 목·머리 연결, 원화 대비 비례와 얼굴 일치도를 보정해야 한다. 머리카락/망토의 메시 움직임은 확인했지만 극단 자세·모든 위상에서 경계가 깨끗하다는 판정은 아니다.

다음 판단은 실제 재생에서 보행 접지·장전 파지·반동 속도감·원화 일치도를 평가한 뒤 한다. 파츠 보정 비용이 크거나 편집 제어가 부족하면 같은 파츠를 입력으로 Spine에서 비교한다. 갑옷 교체 100회, 실제 피격 혈액/진액·치명타·폭발·소리, 전투 판정·스토리·1스테이지는 후속 범위다. 현재 삼각 화염·발사선은 PixelFX 결과가 아닌 진단 표시다.
