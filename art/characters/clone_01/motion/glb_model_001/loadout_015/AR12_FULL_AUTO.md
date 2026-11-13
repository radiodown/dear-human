# 리안 AR-12 풀오토 015

2026-11-13 사용자 요청: 기존 GLB AR-12 사격보다 빠른 full auto 동작을 별도로 구현한다.

[풀오토 보기](http://127.0.0.1:4173/#/samples/characters/clone_01?plan=glb&loadout=ar12_rupture&clip=rifle_full_auto)

공통 미리보기 → 리안 → **3D 모델 · GLB → AR-12 럽처 → 풀오토 · 빠른 연사 (750 RPM)**.

## 제작

- 새 GLB 클립 `rifle_full_auto`: **750 RPM·0.08초 간격**, 1.6초에 20발을 반복한다. 기존 `gunplay_auto`는 0.25초에 1발(240 RPM)로 그대로 남긴다.
- 기존 연사의 첫 견착 자세를 사용하고, 골반·다리를 고정한다. 어깨 기준 최대 약 1.87° 들림과 0.0045단위 후퇴, 10ms 충격·60ms 복귀로 반동을 새로 작성했다. 척추·머리에 각각 15/30ms 지연을 두고 양팔 IK로 손의 총 로컬 접점을 유지한다.
- 200Hz·321표본으로 저장하고 첫/끝 자세를 일치시킨다. 기존 파일을 재출력하지 않고 애니메이션과 데이터만 덧붙여 기존 **7개 클립·바이너리·모델·텍스처·014 장전**을 보존한다.
- 같은 발사 시각에 공통 총구 효과를 연결한다. 이 클립에서만 화염을 40ms로 줄여 발사 사이의 어두운 구간을 만든다. 기존 사격 화염 85ms와 불티·잔연기는 유지한다. 사운드·게임 탄약 시스템은 추가하지 않았다.
- 제작 원본은 `loadout_014/clone_01_ar12_rupture.glb`, 결과는 이 폴더의 `clone_01_ar12_rupture.glb`다. 동시 진행된 장전 작업의 **016이 이 풀오토를 병합하고 현재 뷰어에 연결**되어 있으므로, 검증 기록의 실제 로딩 소스는 016이다. 015는 독립 제작 기록으로 보존한다.

## 확인

[실제 Chromium/Three.js 검사](reviews/viewer.json): 250Hz·800표본(3.2초)에서 발사 효과 40회, 손 접점 최대 오차 약 0.0000311단위, 발 위치 오차 약 3.1×10⁻¹⁶, 루프 변환 오차 약 5.2×10⁻⁸. 탄창 공백·중복 0, 잔연기 최대 47개·불티 묶음 최대 2개. 1×/0.25×·정지·효과 on/off·기존 연사·장전→풀오토 전환, 페이지 오류 없음까지 확인했다.

[측면](reviews/full_auto_side.png)·[사선](reviews/full_auto_angle.png) 렌더를 직접 확인했다. 빠른 연사감·미세 손가락/의상 접촉의 미감은 사용자 검수 대기다. 다른 기기의 성능까지 검증한 결과는 아니다.

## 재현·보존

```powershell
python tools/glb_retarget/make_rifle_full_auto.py art/characters/clone_01/motion/glb_model_001/loadout_014/clone_01_ar12_rupture.glb art/characters/clone_01/motion/glb_model_001/loadout_015/clone_01_ar12_rupture.glb
python tools/glb_retarget/review_rifle_full_auto.py
```

`before/`는 변경 전 뷰어·효과, `source_snapshot/`은 제작·검수 도구와 의존 도구 및 최종 연결 소스다. 제작 당시 공통 GLB 수학/입출력 도우미는 014 소스 사본으로 보존한다. 재현 시 같은 폴더의 `make_rifle_full_auto.py`와 `make_rifle_reload.py`를 사용하면 된다. [생성 기록](clone_01_ar12_rupture.json)·[파일 해시](record.json)를 함께 남긴다. 유료 API 0회, 생성 약 7초, 전체 수작업 시간 미측정.
