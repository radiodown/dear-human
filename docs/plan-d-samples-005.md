# 플랜 D · 무료 외부 샘플과 헤어 반응 005

2026-11-07. 사용자 요청: 상용에서 제공하는 것들을 샘플로 여러 개 도입하고, 다른 오브젝트와의 충돌·흔들림을 추가. 사용자는 구매 제품 없이 **무료 공개 에셋부터 진행**을 선택했다.

## 후속 보정 · 정지와 보행

사용자는 계속 흔들리는 머리를 지적하고 목표를 “걸을 때 자연스러운 찰랑거림”으로 명확히 했다. 바람은 기본 OFF, 기존 긴 머리 004는 유지한다. 부모 가이드 보정의 반복 전달을 머리 기준 형태 복귀로 바꾸고 뿌리보다 끝의 복귀를 약하게 했다. 충돌 속도는 반복 투영 후 한 번만 처리한다. 정지 시 강제로 동결하지 않고 보행 관성·감쇠로 가라앉는다. [후속 기록과 필요한 확인](../art/characters/clone_01/motion/plan_d/samples_005/records/idle_001/README.md)을 따른다. 아래 최초 수치·화면은 이전 솔버의 이력이다.

## 현재 결과와 진입점

[같은 로컬 프로그램](../native/plan-d/run.command)을 실행한다. 기본은 **기존 003 몸·얼굴·21관절 + 기존 긴 머리 004 + 소품 6종의 전신 화면**이다. 사용자의 “왜 짧은머리됨” 지적 후 외부 Long을 기본으로 선택했던 설정을 되돌렸다. 외부 샘플은 N으로 비교한다. 웹 서버는 필요 없다. [변경 전 외부 Long 샘플 전신 화면](../art/characters/clone_01/motion/plan_d/samples_005/reviews/long-full-final.png), [헤어 장착 비교](../art/characters/clone_01/motion/plan_d/samples_005/reviews/hair-contact-sheet-initial.png).

기존 몸·갑옷·망토·얼굴의 생성 코드는 유지했다. 헤어 부착물을 분리해 고르는 방식이며, 이전 자체 헤어 004도 첫 슬롯으로 유지한다. 샘플의 단발/번/짧은 머리 외형은 최종 캐릭터 외형 채택이 아니다. 003 몸·얼굴의 기존 품질 문제도 해결한 것으로 보지 않는다.

## 실제 도입한 외부 파일

| 공급자 / 출처 | 런타임에 연결한 내용 | 라이선스 |
|---|---|---|
| [Quaternius Universal Base Characters](https://quaternius.com/packs/universalbasecharacters.html), [무료 Standard 배포](https://quaternius.itch.io/universal-base-characters) | Long, Buns, SimpleParted, BuzzedFemale, Buzzed 5개 glTF와 원본 base color 텍스처 2개 | 배포 ZIP의 License_Standard.txt: CC0 1.0 |
| [Kenney 공식 Starter Kit 3D Platformer](https://github.com/KenneyNL/Starter-Kit-3D-Platformer/tree/3fa8a04b1c01ab23db43123d4ce814a34c3fc7f0) | brick, coin, flag, platform, grass, cloud 6개 GLB와 colormap | 공식 README에서 3D 모델 CC0 명시. 코드 MIT 고지도 보존 |
| [cgltf](https://github.com/jkuhlmann/cgltf/tree/85cd62382dfea638278962690cf515023f33ed00) | 실제 glTF/GLB 파일 파싱·버퍼·노드 변환·정점·인덱스 로딩 | MIT, LICENSE 동봉 |

무료판 정식 배포 경로로 받았다. 유료 Hair Tool/CC/MetaHuman 패키지, Filament/TressFX/Jolt를 설치한 결과가 아니다. 원본과 라이선스·해시는 [외부 자료](../art/external/samples_005/README.md)에 보존한다. 에셋 구매비는 0이며 AI 이미지 생성도 없다.

헤어는 기존 Head 관절에 맞춰 Y-up/+Z-front를 프로젝트의 +X-front로 변환했다. 공통 두피 폭/깊이와 정수리 높이를 맞추고 번·끝단의 원본 실루엣을 유지했다. 검정색 tint를 곱하며 UV와 base color 이미지를 GPU에서 읽는다. 샘플의 노멀맵·원본 엔진 커스텀 셰이더는 이번에 연결하지 않았다. 짧은 남/여 파일 두 개는 비슷한 실루엣의 변형이다.

## 조작

| 키 | 동작 |
|---|---|
| N / Shift+N | 자체 004 → Long → Buns → Parted → Short F → Short M 순환 / 역순 |
| P | 헤어 물리 켜기/끄기. Parted·Short F·Short M은 FIXED(두피 고정) |
| U | 바람 켜기/끄기 |
| C | 헤어 접촉 및 캐릭터–벽돌 막힘 켜기/끄기 |
| B | 머리 뒤 장애물 왕복 켜기/끄기 |
| T | 장애물을 구 / 작은 벽돌 상자로 전환 |
| G | 충돌 형상 표시 |
| L | 주변 소품과 외부 장애물 표시/숨김 |
| H | 머리 전용 / 전신. 기본은 전신이며 헤어 전용 화면에는 H FULL BODY 표시 |
| 방향키 / W / Space | 좌우 이동 / 제자리 걷기 / 일시정지 |
| Q·E / F / 휠 / R | 회전 / 얼굴 확대 / 줌 / 전체 초기화 |

B를 켜면 주황색 구 또는 작은 벽돌이 뒤쪽 머리로 들어왔다 물러난다. 자체 004와 Long에서 비교하기 쉽다. 물체는 정해진 경로로 움직이는 운동학적 장애물이며 헤어가 물체를 밀어내는 양방향 강체 물리는 아니다. 바닥 벽돌은 좌우 이동을 막는다. 나머지 동전·깃발·발판·풀·구름은 외형 샘플이며 각각의 강체/천 시뮬레이션은 연결하지 않았다.

## 반응과 공통 구조

[Position Based Dynamics 원 논문](https://matthias-research.github.io/pages/publications/posBasedDyn.pdf)을 참고한 자체 소형 솔버다. 상용 물리 SDK의 직접 이식으로 보고하지 않는다.

- 120Hz 고정 업데이트, 헤어당 16 × 10 가이드 입자. 정수리/뿌리 고정, 감쇠·중력·바람·이동 관성·길이 제약·약한 원래 형태 복귀, 12회 투영.
- 머리 타원체, 몸통/팔 캡슐, 망토의 타원체 근사, 외부 구/상자와 접촉한다. 접촉 시 안쪽 속도를 없애고 미끄러짐을 감쇠한다.
- 원래 헤어 정점에 가이드 변위를 보간하고 노멀/광택 방향을 갱신한다. 긴 자체 헤어와 Quaternius Long/Buns만 유연하게 설정했다. 짧은 두피 밀착 헤어는 고정한다.
- 머리 방향이 순간 반전되거나 큰 위치 점프가 발생하면 가이드를 리셋한다. 일시정지와 읽기 전용 렌더 호출은 시뮬레이션 시간을 진행하지 않는다.
- SampleAssets / HairDynamics / SampleWorld / Simulation은 표준 C++ 코어다. SDL 입력·텍스처 업로드와 Metal/HLSL만 백엔드에 남겼다.

cgltf 도입 범위는 이번 고정 샘플의 정적 삼각형 glTF/GLB, 노드 변환, 노멀, UV0, base color/금속도/거칠기, 등록된 텍스처다. 외부 스킨/애니메이션·모프·Draco·임의 PBR 맵을 지원하는 범용 로더는 아니다. 지원하지 않는 파일은 실패로 알린다. 기존 `--export-model`/`--export-hair`는 **원본 004 정지 리그**를 내보내며 선택한 외부 헤어나 물리 변형을 저장하지 않는다.

## 필요한 확인만 수행

macOS 증분 빌드·Metal PNG 출력, 6개 헤어 장착 화면, 전신과 구/상자 접촉 화면, 짧은 코어 접촉 확인을 수행했다. 전체 프로젝트 테스트·웹 검수·문서 검사·GIF·대규모 성능 측정은 하지 않았다.

[집중 확인 기록](../art/characters/clone_01/motion/plan_d/samples_005/records/physics-check.txt):

- 5개 외부 헤어 + 기존 헤어 + 소품 6개를 로딩하고 4초 동안 유한한 출력 확인.
- 자체 004의 외부 구 관통 깊이(가이드 기준): 충돌 ON 0 / OFF 약 7.95cm. 상자 ON 0 / OFF 약 5.35cm.
- 캐릭터는 벽돌 앞 x=0.49m에서 멈춤. 충돌 OFF에서는 같은 입력으로 x=1.80m까지 이동.
- 일시정지/렌더만 호출했을 때 가이드 상태 유지.
- 유연한 헤어의 접촉 후 최대 가이드 잔여 관통은 이번 짧은 경로에서 자체 004 약 1.23mm, Long/Buns 0. FIXED 세 종류의 출력에 남은 가이드 수치는 비활성 가이드의 참고치이며 고정 헤어 충돌 통과값이 아니다.

숫자는 가이드/근사 형상의 확인이며 모든 헤어 삼각형·모든 포즈에서 관통이 없다는 의미가 아니다. 초기 비교 시트는 짧은 머리 고정 전 캡처다. 최종 전신/접촉 캡처는 고정 정책 반영 후다. 원화 수준 사실적 헤어, 모발끼리 충돌, 메시 단위 CCD, 실제 천 시뮬레이션, 자체 그림자/AO, 거리 LOD, Windows 빌드/실행은 남아 있다. 사용자 외형·움직임 검수 대기다.

변경 전은 [runtime-before.tar.gz](../art/characters/clone_01/motion/plan_d/samples_005/records/runtime-before.tar.gz)에 보존했다. 기존 003/004 기록과 A/B/C에는 덮어쓰지 않았다.
