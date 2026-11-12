# 플랜 G · Saltline Side 001

Saltline 원본을 직접 분리·개조한 횡스크롤 이동 시안이다. 공통 미리보기에서 리안 → **Saltline 횡스크롤 / 플랜 G**를 선택한다. 주소는 `/#/samples/characters/clone_01?plan=g`, 넓은 화면은 `/plan-g/index.html`이다.

## 구현

- 원본 Three.js r180, GPU 생성 재질, 항구·컨테이너·크레인·하늘, 젖은 바닥, 후처리, 효과와 합성 소리를 사용한다.
- 항구 앞 Z=36의 58m 이동 구간을 추가했다. A/D·방향키 좌우 이동, Shift 달리기, Space 점프, C 누르는 동안 앉기, J/마우스 사격, R 장전, Esc 정지/재개다. 화면 버튼도 제공한다.
- 원본 플레이어 가속·점프·충돌 코드를 측면 이동에 연결한다. 깊이 이동과 마우스 시점 회전을 끄고 이동 방향으로 총을 돌린다. 원본 PAC-9 모델·손·반동·탄약·장전·탄피·총구 효과를 사용한다.
- 원본에는 전신 플레이어가 없으므로 임시 항구 전투원 몸체·다리 보행을 추가했다. 리안의 채택 외형이 아니며, 양팔 연결·발 접촉·앉기·총기 간섭은 추가 미감 작업이 필요하다.
- 카메라는 약간 내려다보는 측면 추적 방식이다. 원본 조준 좌표용 카메라와 화면 카메라를 분리해 총알이 화면 안쪽으로 나가지 않도록 했다.
- 탭을 벗어나면 iframe을 제거해 GPU·오디오를 해제한다. 돌아오면 처음부터 로딩한다. 창 포커스가 사라지면 입력을 지우고 정지한다.

## 파일 책임

`index.html`은 화면 골격·CSS·스크립트 로드 순서만 가진다. `saltline.css`는 원본 UI 스타일, `styles.css`는 G의 메뉴·조작 화면이다.

| 파일 | 책임 |
|---|---|
| `saltline/engine.js` | 원본에 포함된 Three.js r180 |
| `saltline/core.js` | 설정·이벤트·난수·폴백 |
| `saltline/renderer.js`, `materials.js` | 렌더러·후처리·GPU 재질 생성 |
| `saltline/physics.js`, `props.js`, `level.js` | 충돌·생성 소품·원본 레벨 |
| `saltline/backdrop.js`, `ground.js` | 원경·하늘·젖은 바닥 |
| `saltline/effects.js`, `audio.js` | 효과·합성 소리 |
| `saltline/input.js`, `player.js`, `combat.js`, `weapon.js` | 원본 입력·이동·판정·총기 |
| `saltline/enemies.js`, `hud.js`, `game.js` | 원본 적·HUD·임무 코드 보존 |
| `saltline/bootstrap.js` | 원본 초기화·루프에 G 연결 |
| `side-input.js` | G 키보드·포인터 입력 |
| `side-actor.js` | 임시 전신과 보행 |
| `side-camera.js` | 이동 평면·원본 플레이어 연결·별도 조준/보기 좌표 |
| `side-game.js` | G 시작·정지·재시작·화면 조작 |
| `../plan-g-lab.js` | 공통 탭의 iframe 생명주기 |

첫 분리는 원본의 최상위 구문 경계 기준이다. 원본의 축약 식별자를 보존하고 **순서가 있는 defer 클래식 스크립트가 하나의 iframe 전역 범위를 공유**한다. 독립 ES 모듈/API 분리까지 끝낸 상태는 아니다. 라이브러리·재질·맵·무기 책임별 파일은 나뉘었으므로 후속 변경은 해당 파일에서 진행한다. F의 Three.js r187과 실행 범위를 섞지 않는다.

## 범위와 검증

원본 3D 임무·릴레이·적 배치는 횡스크롤로 개조되지 않았다. 해당 소스는 보존하되 현재 G에서는 적/임무를 활성화하지 않고 이동·총기 시안으로 실행한다. 새 캐릭터 원화·GLB·외부 텍스처·외부 모션은 사용하지 않았다.

23개 런타임 스크립트와 공통 연결 파일의 구문만 확인했다. 브라우저 도구가 `sandboxPolicy` 누락으로 연결되지 않아 실제 부팅·셰이더·입력·외형·성능은 **untested / 검수 대기**다. 구문 통과를 실제 게임 실행 통과로 간주하지 않는다.

## 출처

기존 로컬 `game/plan-f/reference/saltline-fable-5.2/index.html`을 사용했다. 해당 저장본의 기준 커밋은 `09c51774cd77aad750bd2d6c42af2b1020cb668d`다. 파일 SHA-256은 `provenance.json`, 원본과 원본 README 사본은 `art/characters/clone_01/motion/plan_g/saltline_side_001/source/`에 보존한다. Saltline 저작·크레딧은 원작자에게 있으며, 함께 보존한 upstream README의 출처 정보를 따른다. 기존 A~F·원본·작업 중인 변경은 유지했다.
