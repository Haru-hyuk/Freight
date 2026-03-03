# 정책 감사 화면

## 목적
- 정책 내부 일관성 확인용 화면입니다.
- 백엔드 상태값(enum/union) 감사의 대체가 아닙니다.

## 사용 방법
- 앱에서 `/(driver)/(stack)/policy-audit` 경로로 직접 진입합니다.
- `rawStatus`를 입력하고 `계산`을 눌러 결과를 확인합니다.

## 정책 체인
- Driver: `normalizeStatus → getDriverUiStateFromBackendStatus → getDriverBadge / getDriverStatusTitle / getDriverCta`
- Customer: `normalizeStatus → getCustomerUiStateFromBackendStatus → getCustomerBadge / getCustomerStatusTitle / getCustomerCta`

## RunActiveDetails 변경 요약
- 하드코딩(status 문자열 매핑) 제거
- 상위에서 계산된 정책 결과를 props로 주입하여 렌더만 수행
