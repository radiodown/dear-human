# 리안 AR-12 장전 012 · 팔 회전 보정

2026-11-12 사용자 피드백: **“팔이 회전하고 있어서 장전 모션이 이상해.”** [011](../loadout_011/AR12_RELOAD.md)은 이전 결과로 보존하고 현재 리안 AR-12 미리보기를 012로 옮긴다.

[장전 보기](http://127.0.0.1:4173/#/samples/characters/clone_01?plan=glb&loadout=ar12_rupture&clip=rifle_reload)

## 보정

- 왼손을 탄창 옆에 맞추기 위해 180° 돌리던 파지를 제거했다. 기존 소총 받침 손의 방향으로 **탄창 밑을 받쳐 잡는다**.
- 팔꿈치 방향을 고정된 아래쪽 벡터에 투영하던 방식은 손이 어깨 아래를 지날 때 불안정했다. 기존 어깨–손목 축과 팔꿈치 평면을 새 손목 방향으로 운반해 연속성을 유지한다.
- 전완 방향을 원래 전완의 기준으로 계산하고, 손목 회전의 일부를 전완에 분배한다. 단일 축을 투영하는 대신 세 축을 함께 써 삽입 중 불안정한 회전 계산을 피한다.
- 총 기울기는 48° → **35°**, 총구 들기 13°를 유지한다. 허리로 가져가는 동작과 삽입의 가감속을 늘리고, 삽입 충격은 2.19초로 맞췄다. 전체는 기존과 같은 3.4초다.

## 확인 범위

[회전 비교](reviews/arm_rotation.json)의 30fps 103표본에서 왼쪽 전완의 최대 프레임 회전은 **33.87° → 9.45°**, 왼손은 **31.97° → 9.94°**다. 팔꿈치/손목이 움직이지 않는다는 뜻이 아니라 갑작스러운 회전 변화가 줄었다는 뜻이다.

- 기존 007의 소총 6개 클립·원래 바이너리 데이터, 캐릭터 메시·텍스처·스킨 유지.
- 새 동작의 수치·시작/끝 연결·발 고정: [구조 기록](reviews/structure.json).
- 사선·정면·측면의 파지/분리/허리/삽입/복귀 렌더와 실제 공유 뷰어의 0.25× 재생·동작 전환 확인: [뷰어 기록](reviews/viewer.json), `reviews/*.png`.
- 기존 011의 사용자 지적과 구조 검수 기록은 소급 변경하지 않는다. **012의 자연스러움·손가락/의상 관통은 사용자 검수 대기**다.

## 재현

```powershell
python tools/glb_retarget/make_rifle_reload.py art/characters/clone_01/motion/glb_model_001/loadout_007/clone_01_ar12_rupture.glb art/characters/clone_01/motion/glb_model_001/loadout_012/clone_01_ar12_rupture.glb
python tools/glb_retarget/review_rifle_reload.py loadout_012
```

정확한 입력/산출물 해시와 생성 시간은 [생성 기록](clone_01_ar12_rupture.json), 고정 제작/검수 도구는 `source_snapshot/`에 있다. Python·numpy, 검수에는 로컬 4173 서버·Playwright Chromium을 사용했다. 유료 호출 없음, 전체 수작업 시간은 미측정이다. 빈 장전 노리쇠·게임 탄약 처리는 추가하지 않았다.
