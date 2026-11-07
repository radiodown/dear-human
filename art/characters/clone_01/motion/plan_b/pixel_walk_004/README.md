# 플랜 B · 도트 걷기 004

[걷기 재생](http://127.0.0.1:4173/#/samples/characters/clone_01?plan=b&study=pixel_004&motion=walk) · [제작 기록](../../../../../../docs/plan-b-pixel-walk-004.md)

도트 003 기준 외형을 사용하는 14프레임 제자리 걷기 초안이다. 기존 샘플 사이트의 ‘플랜 B · 도트 걷기’에서 자동 재생하며 일시정지·한 프레임·속도·배경을 조절한다. 예제 서버는 프로젝트 루트에서 `./run.sh`로 실행한다.

- `source/baseline.png`: 기존 도트 003 기준 PNG 그대로 복사.
- `source/*_edit_board.png`: 위치·크기 고정을 위한 입력 보드. 새 포즈를 코드로 그린 것이 아니다.
- `source/keyposes.png`, `source/inbetweens_a.png`, `source/inbetweens_b.png`: 내장 image_gen 세 호출의 원본 생성 시트.
- `output/fullframe/`: 14장 RGBA, 512×512. 00/13은 기준 PNG 그대로다.
- `output/keyframe/`: 02/05/08/11, 전체 프레임과 동일.
- `output/spritesheet.png`, `output/contact-sheet.png`, `output/manifest.json`: 공통 atlas와 PNG 재생 데이터.
- `records/*_prompt.json`, `records/*_prompt.md`: 정확한 영어 제출 내용.
- `records/generation.json`, `records/packing.json`: 도구·시간·원본·공통 배율·alpha 잡음 정리 기록.
- `reviews/`: 기준 크기 대조·PNG 계약·Chrome 실제 재생 캡처.
- `recipe/pack.py`: 동일 셀 분리·공통 표준화·alpha≤8 정리·패킹만 수행하며 포즈를 생성하거나 보간하지 않는다.

재생은 확인했지만 외형/모션 채택은 사용자 검수 대기다. 발의 불투명 외곽 하단은 약 3px 변하며 망토·윤곽선·다리 하이라이트와 루프 연결의 추가 검토가 필요하다. 발 높이를 개별 정렬하지 않았다. 공식 발 기준선 완전 일치·GIF 납품 통과가 아니며, GIF는 사용자 지시로 생성하지 않았다. 무기 교체·실제 뼈대·천/모발 충돌·고정 팔레트 최종 도트는 지원하지 않는다.
