# Mobile 개발 환경 가이드

## 1) Quick Start
1. `apps/mobile`로 이동
```bash
cd apps/mobile
```
2. `.env.example`를 `.env.local`로 복사
```powershell
Copy-Item .env.example .env.local
```
3. `.env.local`에서 아래 값 확인/수정
- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_API_MODE`
- `EXPO_PUBLIC_MOCK_AUTH`
4. 앱 실행
```bash
pnpm start
```

참고: `pnpm start` 전 `prestart`에서 `pnpm sync:api`가 자동 실행되어 `.env.local`의 `EXPO_PUBLIC_API_BASE_URL`이 현재 LAN IP 기준으로 갱신됩니다.

## 2) 핵심 환경변수
| 키 | 용도 | 기본/권장 |
|---|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | 앱 런타임 API Base URL | `http://localhost:8080` |
| `EXPO_PUBLIC_API_MODE` | API 모드 (`server`/`mock`) | `server` |
| `EXPO_PUBLIC_MOCK_AUTH` | 인증(Auth)만 목업 강제 (`0`/`1`) | `0` |
| `EXPO_PUBLIC_AUTH_REFRESH_PATH` | 토큰 재발급 경로 오버라이드 | 비우면 `/api/auth/refresh` |
| `EXPO_PUBLIC_AUTH_DEBUG_LOGS` | 인증 디버그 로그 | `0` 또는 `1` |
| `EXPO_PUBLIC_API_DEBUG_LOGS` | API 디버그 로그 | `0` 또는 `1` |
| `ORVAL_OPENAPI_SOURCE` | OpenAPI 소스 URL(우선) | 선택 |
| `OPENAPI_SOURCE` | OpenAPI 소스 URL(차선) | 선택 |

## 3) 모드 조합
| 목적 | 설정 |
|---|---|
| 실서버 기본 | `EXPO_PUBLIC_API_MODE=server`, `EXPO_PUBLIC_MOCK_AUTH=0` |
| 인증만 목업 | `EXPO_PUBLIC_API_MODE=server`, `EXPO_PUBLIC_MOCK_AUTH=1` |
| 전체 개발 목업 권장 | `EXPO_PUBLIC_API_MODE=mock`, `EXPO_PUBLIC_MOCK_AUTH=1` |
| 혼합(권장하지 않음) | `EXPO_PUBLIC_API_MODE=mock`, `EXPO_PUBLIC_MOCK_AUTH=0` |

- `EXPO_PUBLIC_API_MODE=mock`이면 화주/기사 모두 mock-flow 데이터를 사용합니다.

## 4) 주요 스크립트
- `pnpm start`: Expo 실행 (`prestart`로 `sync:api` 자동 실행)
- `pnpm dev`: `pnpm start` 별칭
- `pnpm sync:api`: `.env.local`의 `EXPO_PUBLIC_API_BASE_URL` 갱신
- `pnpm sync:api:with-orval`: `sync:api` + `ORVAL_OPENAPI_SOURCE`/`OPENAPI_SOURCE` 갱신
- `pnpm orval:fetch`: OpenAPI 스펙 fetch/정리
- `pnpm orval:gen`: `orval:fetch` 후 타입/클라이언트 생성
- `pnpm api:gen`: `pnpm orval:gen` 별칭

## 5) OpenAPI/생성 코드 규칙
- OpenAPI source 우선순위: `ORVAL_OPENAPI_SOURCE > OPENAPI_SOURCE > http://localhost:8080/api-docs`
- 생성 코드는 `src/shared/api/generated/**`에 위치
- 생성 코드 수동 편집 금지, 스펙 변경 시 `pnpm -C apps/mobile api:gen` 후 함께 반영

## 6) 환경별 URL 가이드
| 환경 | `EXPO_PUBLIC_API_BASE_URL` |
|---|---|
| 로컬 서버(웹/iOS 시뮬레이터) | `http://localhost:8080` |
| Android 에뮬레이터 | `http://10.0.2.2:8080` |
| 실기기(동일 Wi-Fi) | `http://192.168.x.x:8080` |

## 7) 자주 발생하는 문제
- Android 에뮬레이터에서 `localhost`는 호스트 PC가 아님: `10.0.2.2` 사용
- `.env.local` 변경 후 반영 안 됨: Expo 재시작 (`pnpm start -- --clear`)
- `orval:fetch` URL이 다름: `apps/mobile`에서 실행 후 로그의 `source=...` 확인

## 8) 보안/협업
- `.env.local`은 gitignore 대상이며 커밋하지 않음
- `EXPO_PUBLIC_*` 값은 앱 번들에 포함될 수 있으므로 비밀값 저장 금지
- 원격 빌드(EAS)에서는 로컬 `.env.local` 대신 배포 환경변수로 주입
