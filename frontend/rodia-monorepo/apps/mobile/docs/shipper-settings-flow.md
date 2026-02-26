# 화주 설정 페이지 흐름/기능/데이터 문서 (현행)

## 1) 범위와 목적
- 범위: 화주 내정보 탭에서 진입하는 설정 홈 및 하위 6개 페이지
- 목적: 현재 구현된 라우팅 흐름, 화면 종류별 기능 배치, 목업 데이터 구조를 한 문서로 정리
- 기준: `frontend/rodia-monorepo/apps/mobile` 현재 코드 상태

## 2) 라우팅 구조

### 2-1. 탭과 설정 경로 매핑
- `/(shipper)/settings/**` 경로는 하단 탭 active key를 `profile`로 처리
- 근거:
  - `app/(shipper)/_layout.tsx:21-40`
  - `app/(shipper)/_layout.tsx:151-163`

### 2-2. Expo Router 설정 라우트(wrapper)
- `/(shipper)/settings` → `app/(shipper)/settings/index.tsx` → `ShipperSettingsHomePage`
- `/(shipper)/settings/business` → `app/(shipper)/settings/business.tsx` → `ShipperBusinessInfoPage`
- `/(shipper)/settings/verification` → `app/(shipper)/settings/verification.tsx` → `ShipperVerificationManagePage`
- `/(shipper)/settings/account` → `app/(shipper)/settings/account.tsx` → `ShipperAccountEditPage`
- `/(shipper)/settings/addresses` → `app/(shipper)/settings/addresses.tsx` → `ShipperAddressBookPage`
- `/(shipper)/settings/payments` → `app/(shipper)/settings/payments.tsx` → `ShipperPaymentMethodsPage`
- `/(shipper)/settings/tax-invoices` → `app/(shipper)/settings/tax-invoices.tsx` → `ShipperTaxInvoiceHistoryPage`
- 근거:
  - `app/(shipper)/settings/index.tsx:1-7`
  - `app/(shipper)/settings/business.tsx:1-7`
  - `app/(shipper)/settings/verification.tsx:1-7`
  - `app/(shipper)/settings/account.tsx:1-7`
  - `app/(shipper)/settings/addresses.tsx:1-7`
  - `app/(shipper)/settings/payments.tsx:1-7`
  - `app/(shipper)/settings/tax-invoices.tsx:1-7`

## 3) 사용자 이동 흐름

### 3-1. 내정보 탭에서 설정 진입
- 프로필 상단 우측 설정 버튼 → `/(shipper)/settings`
- 비즈니스 관리 메뉴:
  - 설정/내 정보 관리 → `/(shipper)/settings`
  - 사업자 정보 및 인증 관리 → `/(shipper)/settings/business`
  - 상하차지 주소 관리 → `/(shipper)/settings/addresses`
  - 운임 결제 수단 관리 → `/(shipper)/settings/payments`
  - 세금계산서 발행 내역 → `/(shipper)/settings/tax-invoices`
- 근거:
  - `src/pages/shipper/profile/ShipperProfilePage.tsx:346-380`
  - `src/pages/shipper/profile/ShipperProfilePage.tsx:433-442`

### 3-2. 설정 홈에서 하위 페이지 진입
- 설정 홈의 메뉴 그룹에서 각 상세 페이지로 이동
- 메뉴 우측 trailing text로 상태/건수 표시
- 근거:
  - `src/pages/shipper/settings/ShipperSettingsHomePage.tsx:69-129`
  - `src/pages/shipper/settings/ShipperSettingsHomePage.tsx:143-157`

### 3-3. 중복 네비게이션 방지
- 프로필: `pushRouteOnce`(ref lock + 300ms unlock) 사용
- 설정 홈: `pushOnce`(ref lock + 300ms unlock) 사용
- 근거:
  - `src/pages/shipper/profile/ShipperProfilePage.tsx:298-313`
  - `src/pages/shipper/settings/ShipperSettingsHomePage.tsx:45-67`

## 4) 화면 종류별 기능 배치

### 4-1. 설정 홈 (`ShipperSettingsHomePage`)
- 역할: 설정 허브/디렉토리
- 표시: 그룹(사업자 정보&인증, 회원/주소/결제), 설명문, 건수/상태 trailing text
- 동작: 설정 하위 페이지 push, 저장성 기능 없음
- 근거: `src/pages/shipper/settings/ShipperSettingsHomePage.tsx:69-157`

### 4-2. 사업자 정보 (`ShipperBusinessInfoPage`)
- 역할: 사업자 기본정보/사업장/담당자/제출서류 확인
- 표시:
  - 인증 상태 badge(VERIFIED/PENDING/REJECTED)
  - 기본 정보(상호/대표자/사업자번호/업태/종목)
  - 사업장 정보(주소/상세주소)
  - 담당자 정보(이름/연락처/이메일)
  - 제출 서류 목록(파일명/상태/제출일)
- 동작: 조회 전용
- 근거: `src/pages/shipper/settings/ShipperBusinessInfoPage.tsx:98-175`

### 4-3. 인증관리 (`ShipperVerificationManagePage`)
- 역할: 인증 상태 및 최근 처리 이력 확인
- 표시:
  - 휴대폰 인증/사업자 인증/결제수단 등록 상태
  - 휴대폰 인증일/사업자 검토일/최근 요청일
- 동작:
  - 재인증 요청 버튼(Alert)
  - 서류 재업로드 버튼(Alert)
- 근거: `src/pages/shipper/settings/ShipperVerificationManagePage.tsx:68-95`

### 4-4. 회원정보 수정 (`ShipperAccountEditPage`)
- 역할: 표시 중심 편집 UI(입력/토글 확인)
- 표시:
  - 이름/연락처/이메일 입력
  - Push/SMS/이메일 수신 동의 Switch
- 동작:
  - 수정 저장 버튼(Alert, 입력값 요약 출력)
  - 서버 저장 없음
- 근거: `src/pages/shipper/settings/ShipperAccountEditPage.tsx:71-160`

### 4-5. 상/하차지 주소 관리 (`ShipperAddressBookPage`)
- 역할: 주소 목록/빈 목록 케이스 확인
- 표시:
  - 기본 목록/빈 목록 토글
  - 주소 카드(라벨, 기본 뱃지, 주소, 상세주소, 메모)
  - empty state 카드
- 동작:
  - 주소 추가/편집/삭제 버튼(Alert)
- 근거: `src/pages/shipper/settings/ShipperAddressBookPage.tsx:133-194`

### 4-6. 운임 결제수단 관리 (`ShipperPaymentMethodsPage`)
- 역할: 결제수단 카드 리스트 확인
- 표시:
  - 타입(카드/계좌/후불), provider, 기본 뱃지
  - 소유자, 끝자리, 등록일
- 동작:
  - 수단 추가/기본 설정/삭제 버튼(Alert)
- 근거: `src/pages/shipper/settings/ShipperPaymentMethodsPage.tsx:146-175`

### 4-7. 세금계산서 발행내역 (`ShipperTaxInvoiceHistoryPage`)
- 역할: 발행 이력 조회/필터 UI 검증
- 표시:
  - 기간 칩(전체/3개월/6개월/1년)
  - 목록 카드(발행번호, 상태, 발행일, 공급가, 부가세, 합계)
- 동작:
  - 기간 필터는 로컬 mock 필터
  - 다운로드 버튼(Alert)
- 근거: `src/pages/shipper/settings/ShipperTaxInvoiceHistoryPage.tsx:160-229`

## 5) 공통 UI 배치 (응집)
- 위치: `src/pages/shipper/settings/ui/`
- 컴포넌트:
  - `SettingSection`: 섹션 카드/헤더/우측 액션 슬롯
  - `SettingRow`: 제목/서브텍스트/트레일링/chevron 행
  - `KeyValueRow`: Label-Value 표기, 빈 값 `"-"` fallback
  - `Divider`: 공통 구분선
- 근거:
  - `src/pages/shipper/settings/ui/SettingSection.tsx:9-75`
  - `src/pages/shipper/settings/ui/SettingRow.tsx:9-101`
  - `src/pages/shipper/settings/ui/KeyValueRow.tsx:8-51`
  - `src/pages/shipper/settings/ui/Divider.tsx:7-28`

## 6) 데이터 구조 (_mock 단일 소스)
- 위치: `src/pages/shipper/settings/_mock.ts`
- 타입:
  - `VerificationStatus`, `DocumentStatus`, `PaymentMethodType`, `TaxInvoiceStatus`
  - `BusinessInfoMock`, `VerificationManageMock`, `AccountEditMock`
  - `AddressItemMock`, `PaymentMethodMock`, `TaxInvoiceItemMock`
- 데이터 루트:
  - `shipperSettingsMock.businessInfo`
  - `shipperSettingsMock.verification`
  - `shipperSettingsMock.account`
  - `shipperSettingsMock.addresses.primary / addresses.empty`
  - `shipperSettingsMock.paymentMethods`
  - `shipperSettingsMock.taxInvoices`
- 근거: `src/pages/shipper/settings/_mock.ts:1-230`

## 7) 동작 원칙 (현행)
- 본 설정 묶음은 API/ReactQuery 호출 없이 목업 데이터만 사용
- 저장/추가/삭제/다운로드/재요청은 Alert 기반 데모 동작
- 데이터 공백 표현은 공통적으로 `"-"` 사용 (`KeyValueRow`)
- 설정 경로에서도 하단 탭은 `내 정보(profile)` 컨텍스트를 유지
- 근거:
  - `src/pages/shipper/settings/ShipperSettingsHomePage.tsx:139-141`
  - `src/pages/shipper/settings/ShipperVerificationManagePage.tsx:64-66`
  - `src/pages/shipper/settings/ShipperPaymentMethodsPage.tsx:160-162`
  - `src/pages/shipper/settings/ui/KeyValueRow.tsx:37`
  - `app/(shipper)/_layout.tsx:21-40`

## 8) QA 확인 포인트
- `/(shipper)/profile`에서 설정 홈 및 4개 상세 바로가기 동작
- 설정 홈에서 6개 상세 전부 진입 가능
- 설정 하위 경로 진입 시 하단 탭 활성 상태가 `내 정보`로 유지
- Row/버튼 연타 시 중복 push 억제 동작
- 주소 페이지 빈 목록 토글 시 empty state 노출
- 세금계산서 기간 필터 변경 시 로컬 목록이 즉시 변경
