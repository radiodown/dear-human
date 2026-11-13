# 리안 AR-12 · 탄창 교체 장전 011

2026-11-12 사용자 요청: 소총을 멋있게 기울여 탄창을 빼고 장착한다. 적용 대상은 **리안 AR-12만**으로 확인했다.

- [로컬 미리보기](http://127.0.0.1:4173/#/samples/characters/clone_01?plan=glb&loadout=ar12_rupture&clip=rifle_reload): 기존 리안 → 3D 모델 → AR-12 럽처 → **소총 장전 · 탄창 교체**.
- 산출물: `clone_01_ar12_rupture.glb`, 추가 클립 `rifle_reload`(3.4초, 30fps, 103표본). 끝 자세를 0.65초 유지한 뒤 미리보기에서 반복한다.
- 총을 축 방향으로 48° 기울이고 총구를 13° 들어 올린다. 오른손 손잡이 접점 유지 → 왼손으로 탄창 파지 → 아래로 분리 → 왼쪽 허리에서 탄창 교환 → 삽입 시 짧은 밀어 넣기 → 받침 손 복귀 → 견착 순서다. 작은 상체 반대 회전과 고개 내려보기를 함께 적용한다.
- 일반 탄창 교환 동작이며 빈 총 노리쇠 조작·탄약 시스템·게임 입력 연결은 포함하지 않는다. GIF가 아니라 GLB에 저장된 뼈와 탄창 노드 애니메이션이다.

## 입력과 보존

입력은 [기존 AR-12 007](../loadout_007/clone_01_ar12_rupture.glb)이다. 기존 조준 사격·연사·엄폐 조준·소총 조준 대기·소총 대기·이동 사격의 6개 애니메이션과 해당 바이너리 데이터를 그대로 보존한다. 캐릭터 메시·텍스처·스킨은 재출력하지 않는다. 원본 007과 맨손 source, 쌍권총, 아렌 및 다른 캐릭터, 플랜 F/G·스프라이트는 이번 제작 대상이 아니다.

총의 단일 메시에서 탄창 영역을 평면으로 잘라 분리한다. 교차하는 삼각형의 UV·노멀을 보간하고 절단면에 내부 마감을 더한다. 기존 탄창을 허리에 넣고 새 탄창을 꺼내는 두 노드가 있으며, 장착 시 같은 형상으로 맞바꾼다. 기존 동작으로 전환하면 기본값인 장착 탄창 1개로 복귀한다. 단순 삼각형 선택으로 생겼던 긴 절단 잔여물은 최종본에서 평면 절단으로 수정했다.

## 재현과 기록

```powershell
python tools/glb_retarget/make_rifle_reload.py art/characters/clone_01/motion/glb_model_001/loadout_007/clone_01_ar12_rupture.glb art/characters/clone_01/motion/glb_model_001/loadout_011/clone_01_ar12_rupture.glb
python tools/glb_retarget/review_rifle_reload.py
```

첫 도구는 Python·numpy로 GLB에 직접 추가한다(Blender 재출력 없음). 두 번째 도구는 로컬 4173 서버와 Python Playwright/Chromium이 필요하다. 검수 전용으로 CSP 우회와 응답 내 디버그 참조를 사용하며 제품 파일에는 삽입하지 않는다. 내장 브라우저 도구는 `sandboxPolicy` 연결 오류로 사용할 수 없어 로컬 Chromium으로 검수했다.

- 정확한 입력·산출물 SHA-256과 생성 시간: [생성 기록](clone_01_ar12_rupture.json). 유료 API 호출 없음. 전체 수작업 시간은 미측정이다.
- 변경 전 뷰어: [before](before/glb-model-lab.js). 제작·검수 도구 고정 사본은 `source_snapshot/`에 보존한다.
- 정면/측면/사선의 분리·교체·삽입·복귀 렌더: `reviews/`.
- [실제 뷰어 결과](reviews/viewer.json): 장전 탭·0.25× 재생·중간에 다른 동작으로 전환할 때 탄창 복귀 확인, 페이지 오류 없음.
- [구조 확인](reviews/structure.json): 기존 클립 보존, 새 동작의 유한 수치·발 고정·시작/끝 연결 확인.

**동작 미감은 사용자 검수 대기.** 손목 접점·팔 도달 검사는 피부/손가락 무관통 보장이 아니다. 손가락은 기존 파지 모양을 재사용하며 세밀한 압착·파우치 입구 변형·천 충돌은 구현하지 않았다.
