# Docs Contribution Rules (Mobile)

## 목적
- 모바일 앱(`apps/mobile`) 변경 이력을 PR 단위로 일관되게 기록한다.
- 변경 이유/영향/검증 결과를 빠르게 추적할 수 있게 한다.

## 필수 규칙
- 코드 변경(수정/추가/삭제)이 있는 PR은 `docs/CHANGELOG.md` 업데이트가 필수다.
- 기록은 `docs/CHANGELOG.template.md` 형식을 따른다.
- 엔트리는 최신이 위(역순)로 추가한다.
- PR당 changelog 엔트리는 1회만 작성한다.

## 중요도 기준
- 중요(반드시 기록):
  - 정책 변경(`state/cta/title/badge/progress/toast/apiError`)
  - API 계약/스키마 변경
  - 라우팅/네비게이션/사용자 플로우 변경
  - Mock/Server 모드 분기 변경
  - 가격/상태 계산 규칙 변경
  - 권한 처리/403 분기 변경
- 경미(선택):
  - 단순 스타일/문구/리네이밍
  - 단, 사용자 노출 텍스트/동작에 영향이 있으면 기록 권장

## 기록 방식
- 기능/도메인 중심으로 요약한다.
- 파일 목록은 증거로서 `Modified / Added / Deleted`를 분리해 기록한다.
- “왜(의도)”와 “영향 범위(사용자/개발자 관점)”를 반드시 포함한다.
- 검증 결과(`tsc`, `eslint` 등)는 성공/실패와 원인을 함께 남긴다.

## 린트/도구 실패 기록
- 환경 이슈(예: ESLint 설정 부재)로 검증이 실패해도 changelog 검증 섹션에 사실 그대로 기록한다.
- 실패 사실을 숨기거나 생략하지 않는다.

## 권장 흐름
1. 코드 변경 완료
2. `tsc`/`eslint` 등 검증 실행
3. `CHANGELOG.template.md` 기반으로 `CHANGELOG.md` 엔트리 작성
4. PR 설명과 changelog 내용 정합성 확인
