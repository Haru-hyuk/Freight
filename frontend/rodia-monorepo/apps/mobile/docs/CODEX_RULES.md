# Codex Execution Rules (Mobile)

## Scope
- 작업 기준 경로: `c:\lce\Freight\frontend\rodia-monorepo/apps/mobile`
- 역할: 시니어 프론트엔드 개발자

## PowerShell Rules
- Windows PowerShell 기준으로 명령을 실행한다.
- `&&` 연결 명령을 사용하지 않는다.
- 명령은 한 줄씩 분리해서 실행한다.

## PR Unit Rules (Workstream / Low-PR)
### PR 단위
- 한 PR은 한 도메인/한 여정만 포함한다.
- PR 목표는 아래 2~3개 역할로만 구성한다.
  - 핵심 기능/정합성 (라우팅/데이터 파이프라인/정책)
  - 표현/UX (스트립/라벨/정렬)
  - 개발도구/문서 (debug 진입, 문서, changelog)

### 브랜치 운영
- `develop`에서 workstream 브랜치 1개를 생성한다.
- 2~3개 역할 작업을 같은 브랜치에 연속으로 쌓는다.
- 기능이 한 덩어리로 완료되면 PR 1개를 생성한다.

### 커밋 단위
- 커밋은 기본 2~3개를 목표로 한다.
- Commit 1: 핵심 정합성(라우팅/파싱/정책 파이프라인)
- Commit 2: UI/표현(스트립/정렬/라벨)
- Commit 3(선택): debug/문서/changelog
- 한 커밋으로 충분하면 1개도 허용한다.

### 늦은 PR 리스크 관리
- 하루 1회만 `develop` 반영한다.
- merge 또는 rebase 중 하나로 고정한다.
- 충돌이 커지기 전에 정리한다.

## Absolute Rules (All PRs)
- NO UI BRANCHING: `pages/**`, `widgets/**`, 훅 내부 `if (mock)` 분기를 금지한다. 분기/목업은 API 레이어에서만 처리한다.
- NO GUESSED FIELDS: mock 응답은 generated schema 기반 타입으로만 반환한다. 스키마 외 필드를 추가하지 않는다.
- STATUS 문자열 추측 금지: 상태 값은 기존 상수/맵/유틸에서 확인한 값만 사용한다.
- SSOT 원칙: 공유 데이터는 단일 스토어/모듈에서 생성·갱신한다. 분산 mock을 금지한다.
- Force push 금지: PR 진행 중인 브랜치에는 force push를 금지한다.
- 문서 기록 의무: 생성/삭제/중요 변경 시 `docs/CHANGELOG.md`에 템플릿 형식으로 기록한다.

## CHANGELOG Template Rules
- `docs/CHANGELOG.md`의 신규 항목은 반드시 `docs/CHANGELOG.template.md` 템플릿을 기준으로 작성한다.
- 신규 항목은 아래 섹션 순서를 유지한다.
  - `PR/브랜치`
  - `범주 태그`
  - `변경 요약`
  - `영향 범위`
  - `파일 변경 목록` (`수정` / `추가` / `삭제`)
  - `검증 결과`
  - `미해결 항목 (이번 PR에서 실패/포기한 작업)` (없으면 `- 없음`)
  - `후속 작업 (다음 PR 후보)`
- 템플릿 필드가 비어 있으면 생략하지 말고 `없음`으로 명시한다.
- 기존 이력은 유지하고, 이 규칙은 신규로 추가하는 CHANGELOG 엔트리부터 적용한다.

## Language Rules
### 문서 (CHANGELOG.md)
- 모든 설명은 한국어로 작성한다.
- 코드 식별자(파일명, 함수명, 경로, 브랜치명)는 영문을 유지한다.
- 영어 설명이 있으면 한국어로 재작성한다.

### UI 텍스트
- 사용자 노출 문자열(상태 라벨/안내/버튼/에러)은 한국어로 작성한다.
- 코드 내부 상수값(enum, status key)은 영문을 유지한다.

## Encoding Rules (Korean)
- 한국어 문자열이 포함된 파일은 한 번에 1~2개씩만 수정한다.
- 저장 전 UTF-8 인코딩을 확인한다.
- 각 수정 단위마다 `tsc` 또는 `eslint`를 실행해 인코딩/문자열 깨짐 여부를 확인한다.
- 오류가 발생하면 해당 파일만 즉시 원복한다.
  - `git checkout -- <파일경로>`
- 원복 후 더 작은 단위로 나누어 다시 시도한다.
- 한 번에 많은 파일에 한국어 문자열을 추가하지 않는다.

## Preflight (Mandatory)
```bash
git -C frontend/rodia-monorepo status --porcelain
pnpm -C frontend/rodia-monorepo/apps/mobile exec tsc --noEmit --incremental false
```
- dirty 파일이 이번 PR 범위 외 변경이면 되돌리거나 별도 PR로 분리한다.

## Branch Creation (Workstream)
```bash
git switch develop
git pull
git switch -c <workstream-브랜치명>
```

## Commit Message Rules
- 포맷은 `type(scope): <한국어 설명>`을 사용한다.
- `type(scope)`는 영문, 설명은 한국어로 작성한다.
- 타입은 `feat`, `refactor`, `chore`, `fix`만 사용한다.
- 예시:
  - `refactor(driver): 운행 라우팅 정합성 및 정책 소비 수렴`
  - `refactor(driver-orders): uiState 정렬/tie-break 기준 통일`
  - `chore(debug): 검증 진입점 추가 및 문서/체인지로그 정리`

## Pre-PR Verification (Mandatory)
```bash
pnpm -C frontend/rodia-monorepo/apps/mobile exec eslint .
pnpm -C frontend/rodia-monorepo/apps/mobile exec tsc --noEmit --incremental false
```
- 한글 문자열 수정 후 오류가 발생하면 해당 파일을 원복하고 1~2개 파일 단위로 재시도한다.

## Manual Test Result Rules
- 수동 테스트 결과 값은 `PASS`, `FAIL`, `NOT RUN`, `PARTIAL`만 사용한다.

## Final Output Format
1. Change Log 요약 (한국어)
2. 수정 파일 목록 (Added / Modified / Deleted)
3. 검증 결과 (eslint / tsc)
4. 수동 테스트 체크리스트 (`PASS` / `FAIL` / `NOT RUN` / `PARTIAL`)
5. Git 명령 블록 (자동 실행 금지, 사용자가 직접 실행)

```bash
# 브랜치 생성 (없을 경우만)
git switch develop
git pull
git switch -c <workstream-브랜치명>

# 커밋 (2~3개 고정)
git add -A
git commit -m "<type>(<scope>): <한국어 설명>"

# 푸시/PR 생성은 사용자가 직접
git push -u origin HEAD
```

## Git Operation Rules
- Git 명령은 기본적으로 안내를 우선한다.
- 커밋/푸시/PR/머지는 사용자 확인 후 진행한다.
- Force push는 금지한다.

## Format SSOT Rules
- 표시 포맷 함수는 `src/shared/lib/format/display.ts`를 단일 소스로 사용한다.
- 새로운 화면/모듈에서 로컬 포맷 함수를 추가하지 않는다.
- 포맷 회귀를 막기 위해 기존 표기 규칙을 유지한다.
  - 원화: `#,###원`
  - 거리: 소수 1자리 `km`
  - 날짜/시간: `M/D HH:mm`
