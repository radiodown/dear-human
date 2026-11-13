# 리안 AR-12 풀오토 004 · 총구 안정화

2026-11-13 사용자 피드백: 연사 때 총구가 너무 위로 들려 조준이 불안정해 보인다.

[수정된 빠른 연사 보기](http://127.0.0.1:4173/#/samples/characters/clone_01?plan=glb&loadout=ar12_rupture&clip=rifle_full_auto)

## 수정

`rifle_full_auto`의 총 회전 변화만 기존의 **12%**로 줄이고, 오른손 파지점을 기준으로 조준 방향을 따라 최대 **0.0035단위 후퇴**하도록 바꿨다. 총 메시 중심을 기준으로 돌리지 않으므로 손잡이 위치가 회전 때문에 함께 흔들리지 않는다. 양팔 IK로 양손 접점을 다시 맞춘다.

[동일 표본 비교](reviews/aim_comparison.json)에서 총구 고각 최대는 **3.00° → 0.36°**, 상하 각도 변화 폭은 **3.52° → 0.42°**다. 골반·척추·목/머리·양어깨 반동과 중간의 주춤·뒷발 후퇴/버티기/회복, 앞발 지지, 750 RPM·40ms 화염은 유지한다. 이것은 애니메이션 조준 안정화이며 실제 명중률/탄착 로직 변경은 아니다.

입력은 동시 작업의 **장전 020**이다. 잔탄 장전 `rifle_reload`와 빈 총 장전 `rifle_reload_empty`를 포함한 **나머지 8개 클립과 입력 바이너리**를 보존했다. 같은 `loadout_020` 경로가 장전 제작에서 갱신되어 이전 풀오토 주춤 파일을 대체했으므로, 이 결과는 충돌하지 않는 **`full_auto_004`**에 따로 저장한다. 주춤 동작은 보존한 제작 코드로 다시 포함했다. 이전 기록을 이 결과의 검증으로 소급 변경하지 않는다.

## 확인

[실제 Chromium 공유 뷰어](reviews/viewer.json), 250Hz·800표본에서 다음을 확인했다.

- 발사 40회, 총구 고각 −0.051~+0.357°·좌우 변화 폭 약 0.201°.
- 손 접점 최대 오차 약 0.0000256단위, 앞발 지지 약 0.00000970·뒷발 지지 약 0.00000810단위.
- 뒷발 후퇴 약 0.04000·들림 약 0.01198단위, 루프 경계 오차 0.
- 1×/0.25×·정지·효과 on/off·장전→풀오토·기존 연사 전환, 페이지 오류 0.

[측면](reviews/full_auto_side.png)과 [후퇴 자세](reviews/stance_retreat.png)를 직접 확인했다. 세부 미감·접촉은 사용자 검수 대기다. 기존 연사 `gunplay_auto`는 비교용으로 유지한다.

## 재현과 기록

```powershell
python tools/glb_retarget/make_rifle_full_auto.py art/characters/clone_01/motion/glb_model_001/loadout_020/clone_01_ar12_rupture.glb art/characters/clone_01/motion/glb_model_001/full_auto_004/clone_01_ar12_rupture.glb
python tools/glb_retarget/review_rifle_full_auto.py
```

변경 전 소스는 `before/`, 실행 소스와 공통 도우미는 `source_snapshot/`에 보존한다. [생성 기록](clone_01_ar12_rupture.json)·[해시 기록](record.json)을 남겼다. 유료 API 0회, 생성 약 14.2초, 전체 수작업 시간 미측정.
