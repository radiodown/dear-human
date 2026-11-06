# Plan C · Three.js 도입 준비

**전체 캐릭터 렌더러 연결 전의 기술 시험**이다. 기존 앱이 이 모듈을 import하지 않으며 공통 미리보기의 기본 렌더러는 그대로다. 별도 HTML·사이트·새 캐릭터 원화는 만들지 않는다.

- `package.json` / `package-lock.json`: Three.js **0.187.0** 고정. `node_modules`는 커밋하지 않는다.
- `part-mesh.js`: 기존 아틀라스의 rect·원본 비율·피벗을 Three.js 평면 메시로 옮기는 최소 준비 코드. 기존 `partDimensions()`를 사용한다.
- `browser-probe.js`: 명시적으로 호출할 때만 기존 몸통 파츠 하나를 오프스크린 캔버스에 렌더링한다. 전체 캐릭터·보조 모션·장전 가림 검증이 아니다.

프로젝트 루트에서 실행한다.

```sh
npm --prefix game/plan-c ci --ignore-scripts
npm --prefix game/plan-c run check
```

Node 검사는 DOM·GPU를 만들지 않는다. Chrome 시험의 Python 의존성과 실행법, 비교 실패 기록, 다음 단계는 [31. 플랜 C 조사](../../docs/31-plan-c-threejs-readiness.md)에 있다.

현재 상대 `node_modules` import는 기존 Python 서버를 이용하는 **로컬 시험용**이다. 생산용 번들·배포는 준비하지 않았다. 전체 연결 단계에서 같은 앱의 빌드 경로로 옮기고 라이선스 고지를 포함한다.
