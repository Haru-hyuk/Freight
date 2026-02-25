# Codex Execution Rules (Mobile)

## PowerShell Rules
- Windows PowerShell 기준으로 명령을 실행한다.
- `&&` 연결 명령을 사용하지 않는다.
- 명령은 한 줄씩 분리해서 실행한다.

## Encoding Rules (Korean)
- 한국어 문자열이 포함된 파일은 한 번에 1~2개씩만 수정한다.
- 각 수정 단위마다 `tsc`를 먼저 실행해 인코딩/문자열 깨짐 여부를 확인한다.
- 오류가 발생하면 해당 파일만 즉시 원복한다.
  - `git checkout -- <파일경로>`
- 원복 후 더 작은 단위로 나누어 다시 시도한다.

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
