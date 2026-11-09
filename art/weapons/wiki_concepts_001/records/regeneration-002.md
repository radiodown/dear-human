# 미반영 무기 원화 재생성 002

2026-11-09 사용자 요청: 미반영된 이미지들의 재생성을 다시 시도한다.

내장 `image_gen.imagegen` 6회 호출에서 원화 3개를 얻었고 3회는 입력 단계의 `moderation_blocked / violence` 거부로 이미지가 없다. API·CLI·다른 모델로 전환하지 않았다. 모델명과 실제 비용은 도구가 제공하지 않았다. 정확한 시작·종료 UTC와 해시는 각 `generation.json`에 기록한다.

| 대상 | 현재 결과 | 원본 | 정확한 영어 입력 |
|---|---|---|---|
| 바스티온 006 | 적당한 총열 비례·짧은 컴펜세이터·소형 조준장치 | [PNG](../hp14-bastion_006/source/illustration.png) | [MD](../hp14-bastion_006/records/prompt.md) · [JSON](../hp14-bastion_006/records/prompt.json) |
| 브리처 007 | 택티컬 몸통·원통형 소음기 | [PNG](../sg23-breacher_007/source/illustration.png) | [MD](../sg23-breacher_007/records/prompt.md) · [JSON](../sg23-breacher_007/records/prompt.json) |
| 뮬 007 | 드럼 부분 외피·겹친 패널·통합 광학계 | [PNG](../ml70-mule_007/source/illustration.png) | [MD](../ml70-mule_007/records/prompt.md) · [JSON](../ml70-mule_007/records/prompt.json) |
| AR-12 003 | 새 생성 거부 · 이미지 없음 | — | [MD](../ar12-rupture_003/records/prompt.md) |
| AR-12 004 | 기존 001 참조 재구성 거부 · 이미지 없음 | — | [MD](../ar12-rupture_004/records/prompt.md) |
| 뮬 006 | 새 생성 거부 · 이미지 없음 | — | [MD](../ml70-mule_006/records/prompt.md) |

현재 표시 이미지들은 `wiki/public/assets/weapons/`에 원본과 동일한 바이트로 복사했다. 위키 무기고·각 개별 무기 문서·유나 장비 갤러리에서 해당 세 장만 교체했다. 이전 그림과 실패 기록은 보존하며 기존 게임·M16·인물 원화에는 연결하지 않았다.

바스티온은 002의 과도한 총열 길이를 줄이고 별도 컴펜세이터가 읽히도록 생성했다. 브리처는 003의 일체형 장갑 외피를 줄이고 소음기를 반영했다. 뮬은 003을 참고해 외피와 광학계의 근미래 외형을 보완했다. 세 장의 비례·미감·세부 형태는 사용자 검수 전이며 확정 원화로 채택한 것은 아니다. AR-12는 새 총구 외형 미반영 상태를 유지한다.

직접 진입: http://127.0.0.1:4174/#/article/clone-special-weapons

전체 호출 결과는 [regeneration-002-result.json](regeneration-002-result.json), 검증 결과는 `regeneration-002-verification.json`에 기록한다.

위키 내용 검사와 정적 빌드는 통과했다. 새 이미지 3개의 HTTP 응답·원본 해시, 무기고와 관련 5개 문서의 현재 이미지 연결을 확인했다. 데스크톱 바스티온 문서 캡처에서 실제 표시를 확인했다. 첫 모바일 캡처는 이미지 표시 전에 찍혀 통과로 취급하지 않았고, 추가 캡처를 위한 프로세스 실행이 자동 승인 검토에서 `blocked by policy`로 거부돼 모바일 시각 검수는 미완료다. 거부의 세부 사유는 도구가 제공하지 않았다.
