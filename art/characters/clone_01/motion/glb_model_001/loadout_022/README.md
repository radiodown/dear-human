# 리안 통합 무장 022

충돌 해결 시 원격 통합 015의 구조에 최신 소총 동작을 보존하기 위해 소총 **021**과 쌍권총 **011**을 새 파일로 병합했다. 기존 파일은 보존한다.

- 소총 9개: 기존 6개, 잔탄 장전, 탄 소진/노리쇠 장전, full_auto_005 기반 빠른 연사.
- 쌍권총 6개: 대기 2종, 사격, 앉아 사격, 걷기, 달리기.
- 사용하지 않는 무장과 장전 중 버린 탄창을 숨긴다. 기존 소총/쌍권총 주소도 같은 GLB의 해당 동작을 연다.
- 같은 파일을 재사용할 때도 주소에 지정된 동작으로 전환한다. 유나 방패/권총 008과 총구 효과의 원격 변경을 함께 보존했다.

## 재현

프로젝트 루트에서 실행한다.

```powershell
python tools/glb_retarget/merge_loadout_glbs.py art/characters/clone_01/motion/glb_model_001/loadout_021/clone_01_ar12_rupture.glb art/characters/clone_01/motion/glb_model_001/loadout_011/clone_01_hp14t_gemini.glb art/characters/clone_01/motion/glb_model_001/loadout_022/clone_01_ar12_hp14t.glb --base-rename weapon=weapon_rifle --add-rename weapon=weapon_pistol_r weapon_l=weapon_pistol_l
python tools/glb_retarget/review_merged_loadout.py
```

검사 도구는 공통 미리보기 서버 `127.0.0.1:4173`을 사용한다. [결과](reviews/merge.json): 원본 3,051트랙의 시간·값·보간법과 소총 바이너리 보존, 15클립, Chromium에서 노리쇠/탄창 상태·장전→쌍권총→풀오토·활성 무장 총구 효과·이전 주소·유나 방패 008을 확인했다. 페이지 오류 0건. JS 구문 검사도 통과했다. 새 동작 미감·정밀 표면 접촉을 승인하는 검사는 아니다.

유료 API 호출 0회. 입력/출력 해시는 [record.json](record.json), 병합 및 뷰어 소스는 `source_snapshot/`에 보존한다. 미감은 사용자 검수 대기다.
