# Mobile Changelog Entry Template

## YYYY-MM-DD
- PR/브랜치: `feature/xxx`
- 범주 태그: `[policy] [ui] [api] [mock] [routing] [schema] [infra]`
- 변경 요약:
  - (핵심 변경 1)
  - (핵심 변경 2)
  - (핵심 변경 3)
- 영향 범위:
  - 사용자 관점: (화면/동작 영향)
  - 개발자 관점: (구조/유지보수 영향)
- 파일 변경 목록:
  - Modified:
    - `path/to/file-a`
    - `path/to/file-b`
  - Added:
    - `path/to/new-file-a`
  - Deleted:
    - `path/to/deleted-file-a`
- 검증 결과:
  - `pnpm -C frontend/rodia-monorepo/apps/mobile exec tsc --noEmit --incremental false`: (성공/실패 + 원인)
  - `pnpm -C frontend/rodia-monorepo/apps/mobile exec eslint .`: (성공/실패 + 원인)
- 미해결 항목 (이번 PR에서 실패/포기한 작업):
  - `(실패한 작업 1)` — 원인: (왜 실패했는지) / 다음 PR에서 해결 필요
  - `(실패한 작업 2)` — 원인: (왜 실패했는지) / 다음 PR에서 해결 필요
- 후속 작업 (다음 PR 후보):
  - [ ] (미해결 항목에서 이월된 작업)
  - [ ] (신규 후속 후보 1)
  - [ ] (신규 후속 후보 2)