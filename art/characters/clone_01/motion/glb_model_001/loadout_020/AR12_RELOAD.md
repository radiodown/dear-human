# 리안 AR-12 장전 020 · 옆면 파지와 두 가지 장전

2026-11-13 사용자 요청: 탄창 밑부분을 잡아 손목이 이상한 점을 수정하고, 잔탄 장전과 탄 소진 후 노리쇠 조작이 있는 장전을 구분한다.

## 파지

손바닥 접점을 탄창 옆면 중간 높이로 올렸다. 이전 손가락 방향이 아래쪽으로 향하던 손 좌표계를 다시 구성해 **손가락이 탄창 옆면을 가로질러 앞쪽을 감싸고 엄지는 위쪽에 오도록** 했다. 위치만 바꾸거나 손목을 추가로 꺾는 대신 손의 방향과 접점을 함께 바꿨다. 팔꿈치 보정·전완 회전 분담·오른손 고정·탄창 버리기는 유지한다.

## 두 동작

| 3D 탭 표시 | 클립 | 길이 | 순서 |
|---|---|---|---|
| 장전 · 잔탄 있음 | `rifle_reload` | 2.65초 | 사용한 탄창 버리기 → 허리에서 새 탄창 → 삽입 → 견착 복귀 |
| 장전 · 탄 소진 + 노리쇠 | `rifle_reload_empty` | 3.45초 | 탄창 교체 → 왼손이 노리쇠 손잡이로 이동 → 당기기 → 놓기 → 견착 복귀 |

- [잔탄 장전](http://127.0.0.1:4173/#/samples/characters/clone_01?plan=glb&loadout=ar12_rupture&clip=rifle_reload)
- [탄 소진 장전](http://127.0.0.1:4173/#/samples/characters/clone_01?plan=glb&loadout=ar12_rupture&clip=rifle_reload_empty)

탄 소진 장전은 2.14초 손잡이 접촉, 2.22~2.42초 후퇴, 2.50초 놓기, 2.58초 전진 복귀다. 기존 일체형 무기에 작은 금속 슬라이더/측면 손잡이를 별도 `ar12_reload_bolt` 메시로 추가해 실제로 움직이게 했다. 손은 당기는 동안 붙어 있고 놓은 후에는 손잡이의 빠른 전진을 따라 끌려가지 않는다. 잔탄 장전에서는 이 부품이 움직이지 않는다.

두 항목은 **GLB 미리보기에서 선택하는 동작**이다. 실제 탄약 개수·소진 판정·자동 장전 분기는 아직 연결하지 않았다. 두 동작 모두 기존 요청대로 사용한 탄창을 버리며, 잔탄을 별도로 회수하는 전술 장전은 구현하지 않는다.

## 검증 및 보존

- [공유 뷰어 검사](reviews/viewer.json): 두 항목 표시, 020 로딩·0.25× 재생·동작 전환, 페이지 오류 없음.
- [두 클립 240Hz 검사](reviews/reload_variants.json): 잔탄 637표본에서 손잡이 이동 0, 탄 소진 829표본에서 이동 0.034단위·완료 후 닫힘. 후퇴 도중 풀오토로 전환해도 원래 위치로 복귀한다. 두 클립 종료 시 장착 탄창 복원·바닥 탄창 숨김을 확인했다.
- [리그 검사](reviews/rig_checks.json): 기존 6개 동작/바이너리 보존, 발 고정, 새 옆면 파지 및 노리쇠 당김 중 손바닥 접점 확인. 두 클립 팔/손의 최대 60Hz 회전 변화는 9.8° 미만이다.
- [탄창 낙하 검사](reviews/discard_continuity.json)와 [측면 연속 자세](reviews/motion_sequence.png), [노리쇠 후퇴](reviews/bolt_back.png), 도달/해제 캡처를 보존했다. 측면 파지와 노리쇠 자세를 직접 확인했다.

손목·손가락의 외형과 노리쇠 파지 미감은 사용자 검수 대기다. 접점 검사는 피부 전체의 무관통 보장이 아니다. 손잡이는 현재 미리보기를 위한 코드 생성 형상이며 AR-12의 내부 기계 설계를 확정하지 않는다.

019와 이전 버전은 보존하고 020 파일에는 018 연사 트랙 값도 그대로 포함한다. 동시 연사 개선 `full_auto_004`가 완성된 020을 입력으로 사용해 공유 뷰어에 연결됐다. 두 장전 클립의 정의와 모든 트랙 값이 020과 일치함을 확인하고, 해당 통합 파일에서도 위 뷰어 검사를 다시 통과했다. `before/`는 변경 전 코드/뷰어, `source_snapshot/`은 최종 코드/뷰어다. [생성 기록](clone_01_ar12_rupture.json)과 [산출물 기록](record.json)에 입력/출력 해시·이벤트·생성 시간을 남긴다. Python·numpy·로컬 Chromium, 유료 호출 0회, 수작업 총 시간 미측정.

```powershell
python tools/glb_retarget/make_rifle_reload.py art/characters/clone_01/motion/glb_model_001/loadout_007/clone_01_ar12_rupture.glb art/characters/clone_01/motion/glb_model_001/loadout_020/clone_01_ar12_rupture.glb art/characters/clone_01/motion/glb_model_001/loadout_018/clone_01_ar12_rupture.glb
python tools/glb_retarget/review_rifle_reload.py loadout_020
```
