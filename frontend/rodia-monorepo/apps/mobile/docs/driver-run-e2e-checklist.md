# Driver Run E2E Checklist (2026-03-05)

Scope: `apps/mobile/**`
Contract SoT: `apps/mobile/src/shared/api/generated/**`

## 공통 사전 점검

- 앱 빌드에 `expo-location`이 포함되어 있어야 한다.
- 기사 계정으로 로그인되어 있어야 한다.
- 테스트 대상 매칭(`matchId`)이 서버에 존재해야 한다.
- 네트워크 오류 재현 시 복구용으로 "다시 시도" 버튼 동작을 함께 확인한다.

## 1) 결제 완료 후 기사 운행 탭 상태 자동 반영

### Preconditions
- 기사 앱 운행 탭(`DriverRunPage`) 또는 운행 보드 assigned 탭(`DriverOrdersBoard assignedOnly`) 진입 상태.
- 대상 오더가 `ASSIGNED`/`READY`/`NEGOTIATING` 등 변동 가능한 상태.
- 화주 측에서 결제 완료로 서버 `match.status`가 상향 전이되는 케이스 준비.

### Steps
- 기사 앱을 포그라운드 유지한 채 운행 탭을 열어둔다.
- 화주 측에서 결제를 완료한다.
- 10~15초 이내(현재 12초 주기) 자동 동기화 반영 여부 확인.

### Expected UI
- 운행 카드/상세의 상태 배지 및 CTA가 새 상태에 맞게 자동 변경된다.
- 수동 새로고침 없이 상태가 자연스럽게 갱신된다.

### Expected API
- `driver-match-controller.getDriverMatches` 또는 `driver-match-controller.getDriverMatch` 재호출.
- 상태 해석은 `getDriverUiStateFromStatusPayload` 단일 경로를 사용.

### Recovery
- 자동 반영 실패 시 "상태 새로고침" 버튼으로 재시도.
- 네트워크 오류 시 에러 메시지 노출 후 재시도 가능.

## 2) 운행 시작(startTransit) 전이

### Preconditions
- `PrepareForRunScreen`에 진입한 `activeRun.match.matchId` 유효 상태.
- 체크리스트 3개 항목을 모두 체크 가능.

### Steps
- 체크리스트를 모두 선택한다.
- "운행 시작" 버튼을 누른다.

### Expected UI
- 버튼은 요청 중 `loading/disabled` 상태가 된다.
- 성공 시 상태가 `ASSIGNED`에서 다음 단계(`PICKUP_IN_PROGRESS` 계열)로 반영된다.

### Expected API
- `driver-match-controller.startTransit(matchId)` 1회 호출.
- 성공 후 run 동기화 리패치 + `RUN_STATUS_UPDATED` 이벤트 발행.
- DEV 로그 포인트: `[driver-run][startTransit:success]`.

### Recovery
- 실패 Alert에 원인 메시지가 표시된다.
- "다시 시도"로 동일 액션 재실행 가능.
- DEV 로그 포인트: `[driver-run][startTransit:failed]`.

## 3) 하차 완료(completeTransit) 전이

### Preconditions
- 운행 상세(`RunActiveDetails`) 진입 상태.
- UI 정책상 기본 CTA가 "하차 완료"로 활성화된 상태.

### Steps
- "하차 완료" 버튼을 누른다.

### Expected UI
- 중복 클릭이 차단되고 버튼은 로딩 상태가 된다.
- 성공 시 상태 배지/문구가 완료 계열로 전환된다.

### Expected API
- `driver-match-controller.completeTransit(matchId)` 1회 호출.
- 성공 후 run refetch + 사진 목록 동기화 + `RUN_STATUS_UPDATED` 이벤트 발행.
- DEV 로그 포인트: `[driver-run][completeTransit:success]`.

### Recovery
- 실패 Alert에 원인 메시지와 재시도 버튼이 표시된다.
- DEV 로그 포인트: `[driver-run][completeTransit:failed]`.

## 4) GPS 수동 업데이트 + 위치공유 토글

### Preconditions
- 운행 상세에서 유효한 `matchId` 보유.
- 디바이스 위치 권한 상태를 테스트 가능(허용/거절 케이스).

### Steps
- "위치 업데이트" 버튼을 누른다.
- 권한 미허용 상태라면 권한 요청 플로우를 수행한다.
- 위치 공유 스위치를 ON/OFF로 각각 변경한다.

### Expected UI
- 위치 업데이트 버튼은 요청 중 로딩/비활성화된다.
- 권한 거절 시 버튼 비활성화 + 사유 메시지 표시.
- 위치 공유 토글 성공 시 변경 시각 텍스트가 갱신된다.
- GPS 성공 시 "현재 위치를 전송했습니다." 안내(토스트/안내).

### Expected API
- `tracking-controller.submitDriverGps(matchId, { lat, lng, speedKmh?, bearing? })`.
- `tracking-controller.updateTrackingSharing(matchId, { enabled })`.
- 성공 후 run refetch.
- DEV 로그 포인트:
  - `[driver-run][submitGps:success|failed]`
  - `[driver-run][trackingSharing:success|failed]`

### Recovery
- GPS/토글 실패 시 Alert에 원인 메시지 + "다시 시도" 제공.
- 권한 거절 시 OS 설정에서 권한 허용 후 재진입.

## 5) 사진 업로드/프리뷰 + 협의중 표시

### Preconditions
- 운행 탭에 `NEGOTIATING` 상태 오더가 존재.
- 운행 상세에서 상차/하차 사진 업로드 가능 상태.

### Steps
- 운행 탭에서 협의중 카드 노출 여부 확인.
- 카드에서 제안 금액/사유 노출 확인.
- 운행 상세에서 상차/하차 사진을 각각 1장 이상 업로드한다.

### Expected UI
- 운행 탭 필터/카드에 "협의중"이 표시된다.
- 제안 금액/제안 사유/견적 요약 정보가 카드에 유지된다.
- 업로드된 사진 썸네일/시간 프리뷰가 즉시 반영된다.
- photo gate 정책 상태에 따라 CTA 활성/비활성 변경.

### Expected API
- `delivery-photo-controller.getDriverMatchPhotos(matchId)`.
- `delivery-photo-controller.uploadDriverPhoto(matchId, body, params(type=PICKUP|DELIVERY,...))`.
- DEV 로그 포인트: `[driver-run][uploadPhoto:success|failed]`.

### Recovery
- 업로드 실패 시 원인 메시지 + 재시도 가능.
- 권한 거절 시 갤러리 권한 허용 후 재시도.
