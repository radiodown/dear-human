# 06. 웹용 PixelFX 제작과 연동

[문서 목록](../README.md) · 혈액·진액의 상세 설계는 [14](14-hit-effects.md)를 따른다.

## 1. 도구와 런타임 방식

PixelFX는 [patch-gg/pixelfx](https://github.com/patch-gg/pixelfx)를 뜻한다. 공식 저장소는 JavaScript 직접 실행과 투명 PNG 시트·Aseprite 스타일 JSON 출력 경로를 제공한다. [공식 사용법](https://github.com/patch-gg/pixelfx/blob/main/README.md).

웹 기본안은 **제작 시 사전 렌더 → Phaser에서 시트 재생**이다. 낙하 액적·잔흔은 Phaser의 작은 재사용 풀로 처리한다. PixelFX의 CPU 버퍼를 매 프레임 GPU에 올리는 직접 실행 경로는 별도 성능 비교 후 필요할 때 채택한다.

## 2. 필수 효과

| 프로젝트 ID | 역할 | 제안 길이 |
|---|---|---|
| m16_muzzle | 매 발 총구 화염 | 0.05~0.08초 |
| m16_tracer | 판정 구간의 탄도 표시 | 0.03~0.05초 |
| bullet_impact_wall | 벽 먼지·스파크 | 0.10~0.20초 |
| human_blood_hit | 플레이어 실제 피격의 붉은 분사 | 0.10~0.18초 |
| swarm_ichor_hit | 적 실제 피격의 점성 진액 분사 | 0.10~0.18초 |
| hit_tint | 대상 색상 반응 | 적 약 0.06초, 플레이어는 무적 점멸 |

탄피·긴 연기는 선택이지만 혈액·진액·피격 반동은 초기 핵심 범위다. 스침·일반·치명타별 강도·갑각 파편·폭발·사망 마무리·숫자는 [19](19-combat-feel-and-damage.md)의 결과 태그로 선택한다. 액체는 기본 Normal 블렌드로 검사하고 발광 스파크와 구분한다.

## 3. 원본 후보와 커스텀 구분

공식 카탈로그에서 muzzle-pistol, muzzle-smg, bullet-tracer, bullet-impact, hit-spark 후보를 확인했다. 큰 연기·잔해·내장 발사 주기는 축소하거나 제거한다. muzzle-smg의 자체 루프를 게임 발사 판정과 따로 실행하지 않는다. [공식 카탈로그](https://github.com/patch-gg/pixelfx/blob/main/docs/CATALOG.md).

혈액 후보 status/bleeding은 actor를 참조하는 지속 출혈 효과이므로 독립 일회 분사와 다르다. 이를 그대로 --no-actor로 출력한다고 사용 가능해지는 것은 아니다. actor 의존성을 제거한 custom/human-blood-hit와 custom/swarm-ichor-hit를 새로 작성한다. 이 ID들은 기본 제공 효과가 아니다. [bleeding 소스](https://github.com/patch-gg/pixelfx/blob/main/src/fx/status/bleeding.js).

## 4. 제작 순서

먼저 [18 통합 샘플](18-preview-library-and-reuse.md)의 같은 효과·팔레트·수명·버전을 확인한다. 기존 산출물로 충족되면 재사용하고 바뀐 효과만 수정한다. 새 렌더·생성은 대상 샘플 페이지에 버전·레시피·검수 상태를 함께 등록해야 완료다.

1. 외부 작업 폴더에 PixelFX를 준비하고 커밋을 기록한다.
2. 후보 렌더를 실제 캐릭터 크기에서 확인한다.
3. custom/m16-muzzle, custom/human-blood-hit, custom/swarm-ichor-hit를 작성한다.
4. 각 커스텀 효과가 actor·시연 지면에 의존하지 않는지 확인한다.
5. 분사 본체를 출력하고 런타임 액적과 중복되는 낙하 입자는 제외한다.
6. 투명 PNG·프레임 JSON·피벗·블렌드 정보를 웹 메타데이터로 변환한다.
7. Motion Lab에서 총구·명중·접촉 위치와 좌우 방향을 맞춘다.

## 5. 향후 출력 명령 예시

아래는 PixelFX 체크아웃에서 실행할 예시이며 현재 실행한 명령이 아니다.

```powershell
node tools/render.mjs projectiles/bullet-tracer --sheet --no-actor --fps 60 --out records-prototype
node tools/render.mjs impacts/bullet-impact --sheet --no-actor --fps 60 --out records-prototype
```

커스텀 파일을 작성하고 로더의 인식을 확인한 뒤에만 실행한다.

```powershell
node tools/render.mjs custom/m16-muzzle --sheet --no-actor --fps 60 --out records-prototype
node tools/render.mjs custom/human-blood-hit --sheet --no-actor --fps 60 --out records-prototype
node tools/render.mjs custom/swarm-ichor-hit --sheet --no-actor --fps 60 --out records-prototype
```

sheet·no-actor·fps·out 옵션은 조사한 렌더 소스에서 확인했다. 출력 명령이 원본 효과의 길이·크기를 자동으로 목표값으로 바꾸는 것은 아니다. 효과 코드를 먼저 조정한다. [render.mjs](https://github.com/patch-gg/pixelfx/blob/main/tools/render.mjs).

## 6. Phaser 가져오기

단순한 고정 격자 시트는 프레임 사각형과 시간을 읽어 재생한다. Aseprite 스타일 JSON의 모든 사용자 메타데이터를 Phaser가 자동 해석한다고 가정하지 않는다. 별도 FxAssetAdapter에서 피벗·재생 시간·수명을 정규화한다.

불균일 프레임 시간은 합산 재생 시간으로 처리하고, 원본이 루프여도 프로젝트가 일회 효과로 쓰면 종료를 명시한다. 이미지 중앙을 무조건 원점으로 삼지 않는다. 좌우 반전과 Normal/Add 블렌드, 배경색별 가장자리를 검사한다.

## 7. 이벤트·부착·풀

shot_fired는 화염·탄도, 벽 hit_confirmed는 먼지·스파크, damage_applied는 혈액·진액을 생성한다. 생물성 분사를 명중 이벤트와 피해 이벤트 양쪽에서 만들지 않는다.

현재 화염·탄도 예시는 M16 기준이다. 다른 무기는 무기 정의의 효과 ID를 사용하고, 발사 당시 weapon_id·효과 선택을 이벤트에 저장한다. 효과 처리기가 현재 장착된 무기를 다시 읽어 과거 발사의 화염·탄도를 바꾸지 않게 한다.

화염은 짧게 총구를 따라가고 탄도·분사·액적·잔흔은 생성 시 월드 좌표를 유지한다. 별도 상처 표시만 선택적으로 대상에 부착한다. 모든 효과는 표현 전용이며 피해 판정을 가지지 않는다. 폭발 그림의 피해는 FxManager가 아니라 ExplosionResolver가 반경·가림·거리로 별도 계산한다.

기본 상한은 화염 4, 탄도 8, 벽 충돌 16, 생물성 분사 16, 액적 128, 바닥 잔흔 48이다. 전투 확장 시작값은 파편 64, 폭발 본체 2, 대미지 숫자 32, 사망 표현 8이며 강한 효과가 판정·다음 발을 막지 않도록 한다. 초과 회수·입자 축소에도 피해·처치는 정상적으로 진행한다. 풀 반환 시 좌표·색·방향·스케일·수명·이벤트 참조를 초기화한다.

## 8. 검수

100발과 화염 트리거 100회가 대응하고, 실제 HP 감소 1회에 분사 1회가 대응해야 한다. 무적 중 혈액은 0회다. 총구 오차, 좌우 명중 방향, 벽 뒤 탄도, 액체의 바닥 도달·잔흔 위치, 효과 수 상한을 확인한다.

일시정지·탭 숨김에서는 모든 효과 시간을 멈추고 재시작 때 풀과 잔흔을 정리한다. 검정·회색·밝은 배경에서 불투명 사각형·시연용 인물·지면이 남지 않아야 한다.
