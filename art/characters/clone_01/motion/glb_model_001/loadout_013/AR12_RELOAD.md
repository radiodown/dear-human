# 리안 AR-12 장전 013 · 탄창 순간이동 보정

2026-11-12 사용자 피드백: **“장전 도중 탄창이 순간이동하는 듯한 느낌.”** 이전 [012](../loadout_012/AR12_RELOAD.md)를 보존하고 현재 소총 미리보기를 013으로 바꾼다.

[장전 보기](http://127.0.0.1:4173/#/samples/characters/clone_01?plan=glb&loadout=ar12_rupture&clip=rifle_reload)

## 원인과 수정

012는 기존 탄창을 숨기는 키에서 위치도 허리 → 총으로 바꿨다. 위치 트랙은 LINEAR, 크기/표시 트랙은 STEP이므로 **앞선 1/30초 동안 보이는 탄창이 총으로 날아간 뒤 숨겨졌다**. 이어 새 탄창이 나타날 때까지 약 0.1초의 빈 구간도 있었다.

- 기존 탄창은 허리 위치에 멈춘 상태로 1.5초까지 유지한다.
- 1.5초에 기존/새 탄창을 **같은 위치·회전·크기**에서 서로 바꾼다. 두 표시 트랙은 상보적인 STEP 값이므로 빈 프레임이나 중복이 없다.
- 숨긴 기존 탄창은 1.60~1.90초에만 총 위치로 복귀한다. 보이는 새 탄창은 손과 함께 삽입 경로를 따른다.
- 삽입 충격을 끝낸 뒤 2.30초부터 두 탄창의 장착 위치를 정확히 맞추고, 70/30초에 장착 메시를 교대한다.
- 모델의 손/팔 보정·총 기울기 35°·3.4초 길이와 기존 소총 6개 동작을 유지한다. 기존 총구 효과도 유지한다.

이 교체 표현은 동일한 외형의 탄창 노드를 같은 자세에서 바꾸는 방식이다. 별도의 손가락 놓기·파우치 입구 변형·탄약 시뮬레이션을 추가하지 않았다.

## 확인

Python 샘플러도 glTF의 STEP 보간을 정확히 따르도록 고쳤다. 최종 확인은 Python 계산뿐 아니라 **Chromium에서 실제 GLTFLoader·AnimationMixer**를 사용했다.

[연속성 확인](reviews/magazine_continuity.json): 240Hz, 817표본.

| 항목 | 012 | 013 |
|---|---:|---:|
| 탄창이 없는 표본 | 24 | 0 |
| 동시에 두 탄창이 보이는 표본 | 0 | 0 |
| 최대 1/240초 위치 변화(캐릭터 좌표) | 0.02714 | 0.00355 |
| 1.5초 두 탄창 중심 차이 | 0.21721 | 5.2×10⁻¹⁰ |

교체/장착 전후의 렌더를 `reviews/exchange_*.png`, `reviews/seat_*.png`에 남겼다. 실제 공유 뷰어의 013 파일 로딩·0.25× 재생·동작 변경 시 장착 탄창 복귀를 확인했고 페이지 오류는 없었다([뷰어 기록](reviews/viewer.json)). 전체 기기 회귀나 피부/의상 무관통 검사는 수행하지 않았다. 자연스러움은 사용자 검수 대기다.

## 재현과 보존

```powershell
python tools/glb_retarget/make_rifle_reload.py art/characters/clone_01/motion/glb_model_001/loadout_007/clone_01_ar12_rupture.glb art/characters/clone_01/motion/glb_model_001/loadout_013/clone_01_ar12_rupture.glb
python tools/glb_retarget/review_rifle_reload.py loadout_013
```

[생성 기록](clone_01_ar12_rupture.json)에 원본/산출물 SHA-256·생성 시간을, `source_snapshot/`에 제작/확인 도구를 고정 보존한다. 변경 전 뷰어는 [before](before/glb-model-lab.js)에 있다. Python·numpy와 로컬 4173 서버·Playwright Chromium을 사용했으며 유료 호출은 없다. 전체 수작업 시간은 미측정이다.
