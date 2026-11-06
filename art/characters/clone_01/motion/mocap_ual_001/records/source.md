# Quaternius Universal Animation Library — 루트 이동 GLB (mocap_ual_001)

모캡 뷰어와 리타겟에 쓰는 **참고 원본**입니다. 아직 게임용으로 채택하지 않았습니다.

- 출처: Quaternius **Universal Animation Library [Standard]** ([애니메이션 뷰어](https://quaternius.com/animviewer.html))
- 라이선스: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)(퍼블릭 도메인). 원문은 [License.txt](../source/License.txt)에 있습니다. 표기 의무는 없지만 출처를 기록해 둡니다.
- 입수: 사용자가 2026-11-06에 `Universal Animation Library[Standard].zip`(15,904,933 bytes, sha256 `cc73fc4e…7724`)을 받았습니다. 그중 `Unreal-Godot/UAL1_Standard_RM.glb`(모든 애니메이션에 루트 이동 포함)와 License, README만 그대로 복사했습니다. **변경 없음**. 제자리 버전 GLB와 FBX는 보관하지 않았습니다.
- 형식: glTF 2.0 GLB(Blender I/O 4.5 출력), 단위 m, Y가 위쪽입니다. 관절은 65개(Unreal 마네킹식 이름)이고, 가져오면 손가락과 root를 뺀 24개가 됩니다.
- 애니메이션 43개: A_TPose, Crouch_Fwd_Loop, Crouch_Idle_Loop, Dance_Loop, Death01, Driving_Loop, Fixing_Kneeling, Hit_Chest, Hit_Head, Idle_Loop, Idle_Talking_Loop, Idle_Torch_Loop, Interact, Jog_Fwd_Loop, Jump_Land, Jump_Loop, Jump_Start, PickUp_Table, Pistol_Aim_Down, Pistol_Aim_Neutral, Pistol_Aim_Up, Pistol_Idle_Loop, Pistol_Reload, Pistol_Shoot, Punch_Cross, Punch_Jab, Push_Loop, Roll, Sitting_Enter, Sitting_Exit, Sitting_Idle_Loop, Sitting_Talking_Loop, Spell_Simple_Enter, Spell_Simple_Exit, Spell_Simple_Idle_Loop, Spell_Simple_Shoot, Sprint_Loop, Swim_Fwd_Loop, Swim_Idle_Loop, Sword_Attack, Sword_Idle, Walk_Formal_Loop, Walk_Loop
- 확인 방법: 모캡 비교 화면에서 "BVH · GLB · glTF 열기"로 `source/UAL1_Standard_RM.glb`를 고릅니다. → `http://127.0.0.1:4173/#/samples/characters/clone_01?view=mocap`
- 측정값과 남은 작업은 [source.json](source.json)에 있습니다.
