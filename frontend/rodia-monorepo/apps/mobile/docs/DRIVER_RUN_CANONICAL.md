# Driver Run Canonical Routing Policy

## Canonical route
- Driver 운행 상세/목록 진입의 canonical 경로는 `/(driver)/run/[id]`이다.
- `id=current`는 운행 목록(`DriverMyMatchesPage`)을 의미한다.
- 숫자 `id`는 운행 상세(`DriverMatchDetailPage`)를 의미한다.

## Legacy aliases
- `/(driver)/drive`는 legacy alias이며 `/(driver)/run/[id]`로만 리다이렉트한다.
- `/(driver)/matches/me`는 legacy alias이며 `/(driver)/run/current`로 리다이렉트한다.
- `/(driver)/matches/[id]`는 legacy alias이며 `/(driver)/run/[id]`로 리다이렉트한다.

## Removal criteria for aliases
- 최근 2주간 alias 경로 관련 crash/404가 0건이다.
- 앱 코드 내 직접 이동 경로가 `/(driver)/run/*`로 모두 수렴했다.
- 외부 deep link/문서/QA 시나리오에서 alias 소비처가 제거되었다.
- 위 3개 조건 충족 시 alias route 파일 삭제 PR을 별도로 진행한다.

## Alias removal checklist
- Deep link 소비처 점검:
  - 앱 스킴/웹 링크 문서에서 `/(driver)/drive`, `/(driver)/matches/*` 참조 제거
  - QA 테스트 케이스의 진입 URL을 `/(driver)/run/*`로 갱신
  - 내부 위키/운영 문서에서 legacy 경로 표기 제거
- 로그/모니터링 점검:
  - alias route hit 수가 2주 연속 0 또는 임계치 이하인지 확인
  - `/(driver)/run/*` 진입 직후 crash/404 이벤트 급증이 없는지 확인
  - 라우팅 관련 오류 로그가 alias 제거 후보 기간 동안 0건인지 확인
- 앱 내 경로 수렴 점검:
  - Driver 하단 탭 `운행` 버튼이 `/(driver)/run/current`로만 이동
  - Driver 목록 카드 상세 이동이 `/(driver)/run/[id]`로만 이동
  - Debug 진입 도구(샘플 진입 포함)가 `/(driver)/run/*`를 사용
- QA 시나리오(최소 3개):
  - 시나리오 1: 운행 탭 진입 -> 목록 로딩 -> 상세 진입/복귀
  - 시나리오 2: legacy alias URL(`/(driver)/drive`, `/(driver)/matches/me`) 직접 진입 -> run으로 리다이렉트 확인
  - 시나리오 3: 잘못된 id(`/(driver)/run/invalid`) 진입 -> fallback 경로/에러 처리 확인
