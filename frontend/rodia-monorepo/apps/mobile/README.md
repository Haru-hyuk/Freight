# Mobile 개발 환경 설정 가이드

## 1) 레포 기준 현재 동작(실제 파일 기준)

### 스크립트 (`apps/mobile/package.json`)
- `pnpm start`: Expo 실행
- `pnpm dev`: `pnpm start` 실행
- `pnpm sync:api`: 현재 PC의 LAN IPv4를 찾아 `.env.local`의 `EXPO_PUBLIC_API_BASE_URL` 갱신
- `pnpm sync:api:with-orval`: `sync:api` + `.env.local`의 `ORVAL_OPENAPI_SOURCE`, `OPENAPI_SOURCE`도 갱신
- `pnpm orval:fetch`: `scripts/orval/fix-openapi-pathparams.mjs` 실행
- `pnpm orval:gen`: `orval:fetch` 후 `orval --config ./orval.config.js`

`pnpm start` 전에 `prestart`가 자동으로 실행되어 `sync:api`가 먼저 동작합니다.

### OpenAPI source 결정 (`scripts/orval/fix-openapi-pathparams.mjs`)
- `.env.local` 먼저 로드 후 `.env` 로드
- OpenAPI source 우선순위:
  - `ORVAL_OPENAPI_SOURCE`
  - `OPENAPI_SOURCE`
  - `http://localhost:8080/api-docs`

### ignore 규칙
- 루트 `.gitignore`: `.env`, `.env.*`
- `apps/mobile/.gitignore`: `.env*.local`, `!.env.example`

즉, `.env.local`은 커밋되지 않는 것이 정상입니다.

## 2) 핵심 원칙/우선순위

- 개인 개발 환경(IP/네트워크)은 `.env.local`에서 관리합니다.
- 공용 예시는 `.env.example`에 둡니다.
- Expo 런타임 API URL 표준:
  - `EXPO_PUBLIC_API_BASE_URL`를 `.env.local`에서 관리
- Orval OpenAPI URL 표준:
  - `ORVAL_OPENAPI_SOURCE > OPENAPI_SOURCE > http://localhost:8080/api-docs`

## 3) Quick Start (10분)

### Step 1. `apps/mobile`로 이동
```bash
cd apps/mobile
```

### Step 2. `.env.example`를 `.env.local`로 복사
PowerShell:
```powershell
Copy-Item .env.example .env.local
```

Bash:
```bash
cp .env.example .env.local
```

### Step 3. 환경값 수정
- 기본 권장값: `EXPO_PUBLIC_API_BASE_URL=http://localhost:8080`
- Android Emulator면 `http://10.0.2.2:8080` 사용
- 실기기면 `http://192.168.x.x:8080` 사용

### Step 4. 실행
```bash
pnpm start
```

OpenAPI를 갱신하려면:
```bash
pnpm orval:fetch
pnpm orval:gen
```

Orval URL까지 자동 동기화하려면:
```bash
pnpm sync:api:with-orval
```

## 4) ".env.local 파일이 없어요(사라졌어요)"가 정상인 이유

- `.env.local`은 gitignore 대상이라 클론 직후 파일이 없는 것이 정상입니다.
- 없으면 직접 만들어야 합니다. 표준 절차는 아래와 같습니다.
  - `apps/mobile/.env.example` 복사
  - 복사본 이름을 `.env.local`로 변경
  - 개인 환경(IP/서버 주소)에 맞게 값 수정
- `.env.local`에는 개인 서버 주소/토큰이 들어갈 수 있으므로 커밋 금지입니다.

## 5) 환경별 설정 예시

| 환경 | `EXPO_PUBLIC_API_BASE_URL` | `ORVAL_OPENAPI_SOURCE` | 자주 겪는 함정 |
|---|---|---|---|
| 로컬 서버(권장) | `http://localhost:8080` | `http://localhost:8080/api-docs` | 백엔드가 실제로 8080에서 실행 중인지 확인 |
| Android Emulator | `http://10.0.2.2:8080` | `http://10.0.2.2:8080/api-docs` | `localhost`로 두면 에뮬레이터 내부 localhost를 가리켜 실패 |
| iOS Simulator | `http://localhost:8080`(일반적) | `http://localhost:8080/api-docs` | 호스트/시뮬레이터 네트워크 정책에 따라 접근 확인 필요 |
| 실기기(같은 Wi-Fi) | `http://192.168.x.x:8080` | `http://192.168.x.x:8080/api-docs` | PC/기기 동일 네트워크, 방화벽/포트 허용 필요 |
| 외부 서버 | `http://15.x.x.x:8080` | `http://15.x.x.x:8080/api-docs` | 사내망/VPN/보안 정책으로 차단될 수 있음 |

## 6) Expo(API base url)와 Orval(OpenAPI)는 분리해서 생각

- Expo 런타임:
  - 앱 실행 중 API 호출 기준 URL은 `EXPO_PUBLIC_API_BASE_URL`
- Orval 코드생성:
  - OpenAPI 문서 다운로드 URL은 `ORVAL_OPENAPI_SOURCE`(또는 `OPENAPI_SOURCE`)

런타임 URL과 코드생성 URL이 달라도 동작할 수 있습니다. 문제 상황별로 각각 확인해야 합니다.

## 7) 트러블슈팅 FAQ

### Q1. Android 에뮬레이터에서만 API 연결이 안 됩니다.
- `EXPO_PUBLIC_API_BASE_URL`이 `localhost`면 실패할 수 있습니다.
- Android Emulator는 호스트 PC의 localhost에 `10.0.2.2`로 접근합니다.

### Q2. 실기기에서 PC 서버에 접근이 안 됩니다.
- PC와 휴대폰이 같은 Wi-Fi인지 확인
- 백엔드가 `0.0.0.0` 또는 외부 접근 가능한 바인딩인지 확인
- OS 방화벽에서 8080 포트 허용 여부 확인

### Q3. `.env.local`을 바꿨는데 반영이 안 됩니다.
- 실행 중인 Expo를 종료 후 다시 시작
- 필요 시 캐시 제거 후 재실행:
```bash
pnpm start -- --clear
```

### Q4. `orval:fetch`가 의도와 다른 URL을 봅니다.
- `pnpm -C apps/mobile orval:fetch` 또는 `apps/mobile` 디렉터리에서 실행
- 해당 스크립트는 `process.cwd()` 기준으로 `.env.local/.env`를 읽음
- 실행 로그의 `[orval:fetch] source=...` 값으로 실제 적용 URL 확인

## 8) 보안/협업 규칙

- `.env.local`은 절대 커밋하지 않습니다.
- 토큰/시크릿은 `EXPO_PUBLIC_*`에 넣지 않습니다.
  - `EXPO_PUBLIC_*` 값은 번들에 포함되어 노출될 수 있습니다.
- 운영/배포 환경의 민감 정보는 팀의 배포 환경변수 체계(EAS env/secrets 등)로 관리합니다.

