# clone_01 · 추가 손·어깨·장전 전완 010

기존 [캐릭터 페이지](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=fire)의 rig_005에 연결한 추가 원화다. 새 사이트나 전신 캐릭터를 만들지 않았다. 상태는 **개발 연결 완료·사용자 검수 대기**다.

| 원화 | 적용 |
|---|---|
| [총열 받침 손 v2](source/support_hand_foregrip_v2.png) | 새 파지 손. 투명한 파지 공간과 손목·파지 접점을 등록했다. 사격/대기에서 사용한다. |
| [측면 어깨·상완](source/near_upper_arm_profile.png) | 가까운 상완의 기존 그림을 대체한 측면 판·문양 시점. |
| [장전용 전완](source/far_forearm_reload.png) | 장전 시 몸통 옆으로 들어가는 비스듬한 시점. 원본 안의 두 관절 좌표로 배치한다. |
| [받침 손 v1](source/support_hand_foregrip.png) | 열린 손바닥처럼 나와 파지 공간이 부족했다. 보존하되 런타임에서 사용하지 않는다. |

영어 JSON 프롬프트와 정확한 제출문 MD:

- [받침 손 v1 JSON](records/prompt_support_hand_foregrip.json) · [MD](records/prompt_support_hand_foregrip.md)
- [받침 손 v2 JSON](records/prompt_support_hand_foregrip_v2.json) · [MD](records/prompt_support_hand_foregrip_v2.md)
- [측면 상완 JSON](records/prompt_near_upper_arm_profile.json) · [MD](records/prompt_near_upper_arm_profile.md)
- [장전 전완 JSON](records/prompt_far_forearm_reload.json) · [MD](records/prompt_far_forearm_reload.md)
- [탄창 파지 손 JSON](records/prompt_support_hand_magazine.json) · [MD](records/prompt_support_hand_magazine.md): 이미지 도구가 `violence` 사유로 거부해 산출물이 없다.

[실제 생성 기록](records/generation.json) · [파츠 등록](rig/parts.json) · [허리와 런타임 변경](../../../../../docs/31-waist-axis-and-new-parts.md)

기본 내장 image_gen을 사용했다. 이미지 원본은 생성 폴더에서 프로젝트로 복사했으며 PNG 픽셀을 후처리하지 않았다. 과거 원본과 프롬프트는 보존한다. 장전용 놓기·탄창 파지·조작부 손은 아직 미제작이며 이전 받침 손이 임시로 남아 있다. 사용자가 검증을 맡겠다고 지시한 뒤에는 추가 검사·브라우저 캡처를 실행하지 않았다.
