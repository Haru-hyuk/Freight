# API Spec Change Audit (2026-02-25)

- 날짜: 2026-02-25
- 범위: `apps/mobile` (orval 재생성 이후 타입 오류 9건 분석)
- 원본 레포: `C:\lce\Freight\frontend\rodia-monorepo`
- 제약: 코드 수정/커밋/PR 없이 분석 문서만 작성

## 요약

현재 타입 에러 9건은 아래 2가지 원인으로 수렴한다.

1. `generated` 컨트롤러의 path param 타입이 `string -> number`로 변경되었는데, 앱 호출부가 여전히 `String(...)`으로 전달함  
   - 영향 에러: `counter-offer-api.ts` 4건, `shipper-match-api.ts` 4건
2. `QuoteCreateRequest`에서 `basePrice` 등 필드가 required로 강화되었는데, 앱의 생성 payload 매핑에는 `basePrice`가 없음  
   - 영향 에러: `quote-api.ts` 1건 (`toMockQuoteCreateRequest` 반환 타입 불일치)

추가로, generated 변경 25개 파일 중 다수에서 required 필드 강화/신규 스키마 export가 확인되어, 현재 에러 9건 외에도 런타임 검증 포인트가 늘어난 상태다.

## 상세 분석

## 1) Counter-offer: string -> number 변경

### 1-1. generated 시그니처 변경 근거

`apps/mobile/src/shared/api/generated/shipper-counter-offer-controller/shipper-counter-offer-controller.ts`

- `rejectCounterOffer(offerId: number)` (line 11-13)
- `acceptCounterOffer(offerId: number)` (line 19-21)
- `getCounterOffers(quoteId: number)` (line 27-29)

`apps/mobile/src/shared/api/generated/driver-counter-offer-controller/driver-counter-offer-controller.ts`

- `createCounterOffer(quoteId: number, counterOfferCreateRequest: ...)` (line 15-18)

Git diff 근거:

```diff
- offerId: string
+ offerId: number

- quoteId: string
+ quoteId: number
```

### 1-2. 깨진 호출부(에러 라인)와 전달값 성격

파일: `apps/mobile/src/features/counter-offer/api/counter-offer-api.ts`

- line 149: `getShipperCounterOffersGenerated(String(safeQuoteId))`
- line 163: `acceptShipperCounterOfferGenerated(String(safeOfferId))`
- line 176: `rejectShipperCounterOfferGenerated(String(safeOfferId))`
- line 200: `createDriverCounterOfferGenerated(String(safeQuoteId), payload)`

전달값 성격:

- `safeQuoteId`, `safeOfferId`는 `toPositiveInt`(line 50-53)로 이미 숫자 정규화됨
- `<= 0`은 조기 리턴됨 (line 142, 155, 168, 184)
- 즉, 실제 런타임 값은 "숫자 문자열"로 변환된 값이며, 타입만 어긋난 상태

### 1-3. 값의 출처와 UI 영향 범위

- `listShipperCounterOffers(actionQuoteId)` 호출: `QuoteDetailPage.tsx` line 664
- `acceptShipperCounterOffer(offerId)` 호출: `QuoteDetailPage.tsx` line 681
- `rejectShipperCounterOffer(offerId)` 호출: `QuoteDetailPage.tsx` line 700

`actionQuoteId`는 `QuoteDetailPage`에서 route param(`id`)을 `parsePositiveIntParam`으로 파싱해 number로 관리한다.

- 파싱: `QuoteDetailPage.tsx` line 275-277
- route 값 사용: line 557-563

따라서 변환 실패(`NaN`)는 현재 로직에서 0으로 정규화되고 조기 리턴되어, 즉시 크래시는 낮지만 요청이 무시되는 UX 이슈(버튼 동작 안 함) 가능성은 남는다.

### 1-4. 최소 수정 방안 (코드 제안만, 미적용)

- 옵션 A (권장 1순위, 저위험): 호출부의 `String(...)` 제거 후 number 그대로 전달
  - 장점: 변경 범위 최소, 의도 명확, 즉시 타입 에러 해소
  - 단점: 유사 패턴이 다른 파일에 남아있으면 재발 가능
- 옵션 B (권장 2순위, 중위험): API 경계 타입을 number 중심으로 일괄 상향/정리
  - 장점: 도메인 타입 일관성 강화
  - 단점: 영향 범위가 넓어 리그레션 가능
- 옵션 C (권장 3순위, 중위험): 화면 진입부(route parsing)에서 숫자 파싱을 강제하고 downstream엔 number만 전달
  - 장점: 문자열 ID 유입 지점을 초기 차단
  - 단점: 기존 라우팅/딥링크 처리와 함께 검증 필요

## 2) Matching: string -> number 변경

### 2-1. generated 시그니처 변경 근거

필수 확인 대상 파일:

`apps/mobile/src/shared/api/generated/shipper-match-controller/shipper-match-controller.ts`

- `getMatch(matchId: number)` (line 26-28)
- `cancelMatch(matchId: number)` (line 35-37)

Git diff 근거:

```diff
- matchId: string
+ matchId: number
```

참고(에러 4건 설명을 위한 추가 근거):

`driver-match-controller`도 동일하게 `matchId: number`로 변경됨 (`getMatch1`, `acceptMatch`, `cancelMatch1`).

### 2-2. 깨진 호출부(에러 라인)와 전달값 성격

파일: `apps/mobile/src/features/matching/api/shipper-match-api.ts`

- line 159: `cancelShipperMatchGenerated(String(safeMatchId))`
- line 210: `getDriverMatchGenerated(String(safeMatchId))`
- line 223: `acceptDriverMatchGenerated(String(safeMatchId))`
- line 257: `cancelDriverMatchGenerated(String(safeMatchId))`

전달값 성격:

- `safeMatchId`는 `parseMatchPositiveInt`로 number 정규화 (line 150, 202, 216, 248)
- `<= 0`은 조기 리턴
- 현재도 런타임 값은 숫자 문자열이며, 타입 불일치가 핵심

### 2-3. 값의 출처와 UI 영향 범위

- Shipper 매칭 취소:
  - `MatchingListPage.tsx` line 230 (`cancelShipperMatch(safeMatchId)`)
  - `QuoteDetailPage.tsx` line 652 (`cancelShipperMatch(cancelTargetMatchId)`)
- Driver 상세 조회/수락:
  - `useMatchDetail.ts` line 86 (`getDriverMatch(safeMatchId)`)
  - `DriverMatchDetailPage.tsx` line 620 (`acceptDriverMatch(matchId)`)

route 파라미터는 `parseMatchDetailRouteParams`에서 number 변환 후 전달:

- `app/(driver)/run/[id].tsx` line 13, 23
- `matchDetailRouteSnapshot.ts` line 89-91

즉, 문자열 원천이 route에서 남아 있어도 현재 경계에서 대부분 number로 정규화되고 있어 NaN 크래시보다는 "요청 취소/수락이 동작하지 않는" UX 이슈가 실질 리스크다.

### 2-4. 최소 수정 방안 (코드 제안만, 미적용)

- 옵션 A (권장 1순위, 저위험): `String(safeMatchId)` 제거
- 옵션 B (권장 2순위, 중위험): match 관련 API 함수 시그니처/모델을 number-only로 재점검
- 옵션 C (권장 3순위, 중위험): route 진입부 파싱 실패 시 화면 진입 차단 정책 강화(현재도 일부 적용)

## 3) QuoteCreateRequest: required 변경

### 3-1. required 필드 목록 (현재 generated 기준)

파일: `apps/mobile/src/shared/api/generated/schemas/quoteCreateRequest.ts` (line 11-70)

`?` 없는 필드(필수):

- `originAddress`
- `destinationAddress`
- `originLat`
- `originLng`
- `destinationLat`
- `destinationLng`
- `distanceKm`
- `weightKg`
- `vehicleType`
- `vehicleBodyType`
- `cargoName`
- `cargoType`
- `basePrice`
- `loadMethod`
- `unloadMethod`

### 3-2. 이전 대비 required화된 필드

`git diff --unified=0` 기준:

- `originAddress?: string -> originAddress: string`
- `destinationAddress?: string -> destinationAddress: string`
- `originLat?: number -> originLat: number`
- `originLng?: number -> originLng: number`
- `destinationLat?: number -> destinationLat: number`
- `destinationLng?: number -> destinationLng: number`
- `distanceKm?: number -> distanceKm: number`
- `weightKg?: number -> weightKg: number`
- `vehicleType?: string -> vehicleType: string`
- `vehicleBodyType?: string -> vehicleBodyType: string`
- `cargoName?: string -> cargoName: string`
- `cargoType?: string -> cargoType: string`
- `basePrice?: number -> basePrice: number`
- `loadMethod?: string -> loadMethod: string`
- `unloadMethod?: string -> unloadMethod: string`

### 3-3. 깨진 앱 코드 지점과 누락 필드

파일: `apps/mobile/src/features/quote/api/quote-api.ts`

- 에러 라인: line 352 (`toMockQuoteCreateRequest` 반환 객체)
- 반환 객체: `{ ...payload, stops }` (line 352-355)
- `payload` 타입: `QuoteCreateRequestDto`
- `QuoteCreateRequestDto` 정의(`entities/quote/dto.ts`)에는 `basePrice` 필드 자체가 없음 (line 45-67)

즉, 현재 컴파일 에러는 `basePrice` 누락이 직접 원인이다.

### 3-4. 원인 분류: UI 입력값 없음 vs 매핑 누락

결론: **주원인은 매핑 누락**.

근거:

- Step3 UI는 `computeQuotePricing`으로 `basePrice`를 계산 중 (`QuoteCreateStep3.tsx` line 177, `quoteCreateDraft.ts` line 232-249)
- 하지만 `buildQuoteCreateRequest`는 `desiredPrice`는 넣고 `basePrice`는 넣지 않음 (`quoteCreateRequestMapper.ts` line 132-158)
- Create/Edit 모두 동일 매퍼를 사용
  - `QuoteCreatePage.tsx` line 238, 254
  - `QuoteEditPage.tsx` line 362, 406

### 3-5. 최소 수정 방안 (코드 제안만, 미적용)

- 옵션 A: UI 입력 필드로 `basePrice`를 직접 받음
  - 장점: 스펙 요구를 명시적으로 충족
  - 단점: UX/기획 영향 큼, 사용자 입력 신뢰성 이슈
  - 위험도: 높음
- 옵션 B (권장): 기존 계산값(`computeQuotePricing().basePrice`)을 매퍼에서 채워 전송
  - 장점: 현재 UI/도메인 로직 재사용, 변경 범위 작음
  - 단점: 계산 규칙이 서버와 어긋나면 값 불일치 가능
  - 위험도: 중간
- 옵션 C: 서버 기본값 전제를 유지하고 OpenAPI 스펙을 optional로 정정
  - 장점: 클라이언트 변경 최소
  - 단점: 백엔드/스펙 정합성 이슈 해결 필요, 즉시 대응 어려움
  - 위험도: 중간~높음

## generated 변경 요약 (25 files)

### 분류

- controllers: 10
- schemas: 12
- types/barrels: 3
- total: 25

### Breaking 가능 패턴 요약

- path param 타입 변화 (명확한 브레이킹)
  - 다수 컨트롤러에서 `string -> number`
- required/optional 변화 (명확한 브레이킹)
  - `quoteCreateRequest`, `driverSignupRequest`, `shipperSignupRequest`, `truckCreateRequest`, `loginRequest` 등에서 required 강화
- enum 변경
  - 이번 25개 변경 파일(diff 기준)에서는 명시적 enum 값 변경은 확인되지 않음
  - 다만 `schemas/index.ts`에서 신규 스키마/타입 export가 대량 증가하여 간접 영향 가능
- response shape 변경 가능성
  - `quoteCreateResponse`, `quoteDetailResponse`, `matchResponse`, `tokenResponse`, `truckResponse`에 optional 필드 추가(대부분 additive)

## UI 영향 가능 플로우 (페이지 단위)

1. `QuoteDetailPage`
- 영향: 역제안 조회/수락/거절, 배차 취소
- 근거: line 664, 681, 700, 652

2. `MatchingListPage`
- 영향: 매칭 취소
- 근거: line 230

3. `DriverMatchDetailPage` + `useMatchDetail`
- 영향: 매칭 상세 조회/수락/카운터오퍼 전송
- 근거: `DriverMatchDetailPage.tsx` line 620, 642 / `useMatchDetail.ts` line 86

4. `QuoteCreatePage`
- 영향: 견적 생성 payload 전송
- 근거: line 238, 254

5. `QuoteEditPage`
- 영향: 견적 수정 payload 전송
- 근거: line 362, 406

## 권장 수정 우선순위 (가장 안전한 순서)

1. string->number 에러 8건 먼저 정리  
- `String(safeId)` 제거로 컴파일 블로커 해소, 회귀 위험 낮음

2. `basePrice` 누락 정책 확정  
- 권장: 옵션 B(계산값 매핑)로 우선 정합성 확보
- 병행: 백엔드/스펙 팀과 required 정책 확인

3. required 강화된 다른 요청 DTO 점검  
- signup/truck/login 관련 호출부에서 hidden 런타임 400 가능성 점검

4. 화면 smoke 테스트  
- Shipper: 견적 상세(역제안/취소), 매칭 목록 취소
- Driver: 매칭 상세 조회/수락/제안

## 재검증 명령 (커밋 없이)

```bash
pnpm -C apps/mobile api:gen
pnpm -C apps/mobile exec tsc --noEmit
git diff --name-only -- apps/mobile/src/shared/api/generated
git diff --unified=0 -- apps/mobile/src/shared/api/generated
rg -n "String\\(safe.*Id\\)" apps/mobile/src/features
rg -n "basePrice" apps/mobile/src/features/quote
```

