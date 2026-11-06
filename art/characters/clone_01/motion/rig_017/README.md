# 앉아쏴 · 정답 이미지 보정 017

사용자가 채택한 [앉아쏴 이미지](../../concepts/kneeling_fire_001/source/kneeling_fire.png)를 현재 파츠 모션으로 옮기는 개발 버전이다. [적용 기록](../../../../../docs/kneeling-image-application-017.md)과 [같은 앉아쏴 페이지](http://127.0.0.1:4173/#/samples/characters/clone_01?motion=kneel_fire)를 따른다.

- [전용 부착물 정의](rig/kneeling_parts.json): 독립 무릎 장갑·정강이·무릎 안쪽 천, 골반 벨트·앞/뒤 스커트 패널.
- [작성 레시피](recipe/build_kneeling_parts.py): 원본 UV 재사용·현재 rig_005 연결. 원본 PNG 수정·래스터 생성 없음.
- [모션 레시피](../rig_005/records/kneeling_image_017/recipe.json) · [개발 인계](../rig_005/records/kneeling_image_017/handoff.json).

상태는 **untested·사용자 검수 대기**다. 기존 015 흉갑/허리 메시와 014 손·M16을 재사용한다. 깊은 주름·사선 이면의 전용 새 원화나 실제 3D 모델은 생성하지 않았다. 사용자 지시로 테스트·구문/문서/목록 검사·브라우저 검수는 실행하지 않았다.
