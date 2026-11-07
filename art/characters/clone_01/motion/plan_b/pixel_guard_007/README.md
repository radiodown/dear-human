# 플랜 B · 경계 보행007

[걷기 재생](http://127.0.0.1:4173/#/samples/characters/clone_01?plan=b&study=guard_007&motion=walk) · [이동 사격](http://127.0.0.1:4173/#/samples/characters/clone_01?plan=b&study=guard_007&motion=walk_fire) · [변경 기록](../../../../../../docs/plan-b-guard-007.md)

사용자 요청에 따라 골반에서 상체를 더 앞으로 숙이고 무릎을 낮춘 경계 보행을 새 버전으로 제작했다. 고개는 전방을 보고 M16은 거의 수평으로 유지한다. 기존005의 밝은 전경 다리A/어두운 후경 다리B가 서로 교차하고 지지 역할을 바꾸는 규칙을 재사용한다. 같은 자세의 이동 사격도 포함한다.

- [이전005·경계007 기준 자세 비교](reviews/posture-before-after.png)
- 걷기: [PNG 모음](walk/output/contact-sheet.png) · [manifest](walk/output/manifest.json) · [키포즈 대조](walk/reviews/key-size-comparison.png)
- 이동 사격: [PNG 모음](walk_fire/output/contact-sheet.png) · [manifest](walk_fire/output/manifest.json) · [키포즈 대조](walk_fire/reviews/key-size-comparison.png)
- [공통 기준 생성 프롬프트](records/baseline_prompt.md), 걷기 [키포즈](walk/records/keyposes_prompt.md)·[중간A](walk/records/inbetweens_a_prompt.md)·[중간B](walk/records/inbetweens_b_prompt.md), 이동 사격 [키포즈](walk_fire/records/keyposes_prompt.md)·[중간A](walk_fire/records/inbetweens_a_prompt.md)·[중간B](walk_fire/records/inbetweens_b_prompt.md)

내장 image_gen으로 기준1회·키포즈2회·중간 프레임4회를 생성했다. 정확한 영어 JSON/MD와 원본은 각 records/source에 보존한다. 모델 ID·seed·실제 비용은 도구가 제공하지 않아 null이다. [실제 호출 기록](records/generation.json)에 입력/출력 해시와 관측 시간을 기록한다.

각 동작은512×512 RGBA14장이고 00/13은 동일한 새 기준 이미지다. 실제 재생은01~12의12개 움직이는 포즈만 반복한다. 걷기는 프레임당95ms, 이동 사격은02/08 발사광45ms와 뒤따르는 반동/복귀의 시간차를 사용한다. 숙임20~25°는 생성 목표이며 정확한 관절 각도를 측정한 결과는 아니다.

Python/Pillow는 입력 보드, 전체 원본의 공통 표준화, 같은 크기 셀 분리, 미세 alpha≤8 정리와 패킹에만 사용했다. 새 기준의 캔버스 전체에 한 번의 표준화/수직2px 이동을 적용한 후 모든 포즈를 생성했다. 원본 왼쪽 위의 고립된 작은 흰 조각도 기록한32×32 모서리 영역에서 제거했으며 원본은 그대로 보존한다. 개별 프레임의 크기/중심/발 정렬이나 포즈 변형·보간은 없다.

공통 [Chrome 확인](reviews/browser.json), 동작별 reviews의PNG 계약/시각 기록으로 검증 범위를 구분한다. 실제 재생과 교차/발사 정지 비교·한 프레임 이동·500px 걷기 표시·이전 버전 선택·새 기본 진입을 짧게 확인했고 페이지 오류는 없었다. [걷기 표시](walk/reviews/browser-action.png)와 [경계 사격](walk_fire/reviews/browser-pose-02.png)을 보존한다. 최종 외형·자연스러움은 사용자 검수 대기다. 불투명 발 외곽 높이는 걷기4px·이동 사격5px 변하고 망토/윤곽 변화가 남으며 실제 물리 접촉은 없다. 총/발사광은 전신 PNG에 포함되며 탄약·명중 판정은 연결하지 않았다. 전체 공식 발 기준선 일치·GIF 납품 통과로 보고하지 않는다. GIF는 만들지 않았다.
