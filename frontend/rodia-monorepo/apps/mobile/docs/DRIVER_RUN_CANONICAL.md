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
