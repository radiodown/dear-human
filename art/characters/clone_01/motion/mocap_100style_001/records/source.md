# 100STYLE Neutral 참고 모션 (mocap_100style_001)

모캡 뷰어와 앞으로 할 리타겟 시험에 쓰는 **참고 원본**입니다. 아직 rig_002 파츠 리그에 연결하지 않았습니다.

- 데이터셋: [100STYLE](https://www.ianxmason.com/100style/) · Ian Mason, Sebastian Starke, Taku Komura (2022) · [Zenodo 배포본](https://zenodo.org/records/8127870)
- 라이선스: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). 배포할 때 위의 저자, 출처, 라이선스, 변경 여부를 함께 표시합니다.
- 입수: 사용자가 2026-11-06에 `100STYLE.zip`(1,468,168,639 bytes, sha256 `dbd555ef…3e4e`)을 받았습니다. 그중 `Neutral_ID`, `Neutral_FW`, `Neutral_TR1`과 `Frame_Cuts.csv`만 바이트 단위로 그대로 복사했습니다. **변경 없음**
- 형식: BVH 60fps, 단위 cm, Y가 위쪽, 정지 자세에서 Z가 앞쪽입니다. 회전 순서는 Y→X→Z입니다. 채널이 있는 관절은 23개이고 End Site가 5개이며, 손가락은 없습니다.
- 유효 구간(Frame_Cuts): ID 655–1555 · FW 327–7445 · TR1 304–6775. 0부터 세는지 1부터 세는지는 아직 확인하지 않았습니다.
- 확인 화면: `http://127.0.0.1:4173/#/samples/characters/clone_01?view=mocap&clip=FW`
- 남은 작업: rig_002 리타겟, 접지 추정 검증, 클립별 사용자 검수

파일 해시와 프레임 수는 [source.json](source.json)에 있습니다.
