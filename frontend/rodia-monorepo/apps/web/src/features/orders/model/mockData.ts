import type { CancellationRequestRow, OrderMonitoringRow } from "@/features/orders/model/types";

const BASE_ORDER_CANCELLATION_REQUEST_MOCK_ROWS: CancellationRequestRow[] = [
  {
    requestId: "CR-20260302-001",
    quoteId: "Q-5104",
    matchId: "M-8801",
    requestedByRole: "SHIPPER",
    requestedByName: "블루 리테일",
    shipperId: "S-120",
    shipperName: "블루 리테일",
    driverId: "D-778",
    driverName: "기사 778",
    originAddress: "인천 허브 A",
    destinationAddress: "서울 냉동창고 5",
    cargoName: "냉동 수산물",
    cancelReason: "기사 수락 후 하차지 일정이 변경되었습니다.",
    requestedAt: "2026-03-02 09:15",
    approvalStatus: "PENDING",
  },
  {
    requestId: "CR-20260302-002",
    quoteId: "Q-5097",
    matchId: "M-8792",
    requestedByRole: "DRIVER",
    requestedByName: "기사 701",
    shipperId: "S-211",
    shipperName: "에코마트 로지스틱스",
    driverId: "D-701",
    driverName: "기사 701",
    originAddress: "청주 크로스도크",
    destinationAddress: "용인 물류센터",
    cargoName: "포장재",
    cancelReason: "상차지 안전 이슈로 진입이 일시 제한되었습니다.",
    requestedAt: "2026-03-02 11:40",
    approvalStatus: "PENDING",
  },
  {
    requestId: "CR-20260301-004",
    quoteId: "Q-5072",
    matchId: "M-8748",
    requestedByRole: "SHIPPER",
    requestedByName: "다림푸드",
    shipperId: "S-118",
    shipperName: "다림푸드",
    driverId: "D-644",
    driverName: "기사 644",
    originAddress: "김포 공장",
    destinationAddress: "부산 프레시 터미널",
    cargoName: "가공 식품",
    cancelReason: "최종 발주 취소로 운송을 진행할 수 없습니다.",
    requestedAt: "2026-03-01 08:05",
    approvalStatus: "APPROVED",
    reviewedAt: "2026-03-01 08:45",
    reviewedBy: "admin.ops",
    reviewMemo: "상차 진행 전으로 운송 리스크가 없어 승인합니다.",
  },
  {
    requestId: "CR-20260301-007",
    quoteId: "Q-5068",
    matchId: "M-8739",
    requestedByRole: "DRIVER",
    requestedByName: "기사 632",
    shipperId: "S-406",
    shipperName: "코어 제조",
    driverId: "D-632",
    driverName: "기사 632",
    originAddress: "대전 공장",
    destinationAddress: "대구 조립 현장",
    cargoName: "기계 부품",
    cancelReason: "상차 확인 후 화주 요청으로 취소를 요청합니다.",
    requestedAt: "2026-03-01 10:15",
    approvalStatus: "REJECTED",
    reviewedAt: "2026-03-01 10:55",
    reviewedBy: "admin.risk",
    reviewMemo:
      "픽업 확정 후 취소 요청이므로 제재 검토가 선행되어야 합니다.",
  },
];

const GENERATED_CANCELLATION_REASONS = [
  "화주 납품 시간이 변경되어 상차를 보류했습니다.",
  "기사 차량 정비 이슈로 운행 시작이 불가합니다.",
  "상차지 안전 통제로 출입이 제한되어 취소 요청합니다.",
  "최종 발주 수량 감소로 운송 계약을 재조정합니다.",
  "하차지 야간 반입 제한으로 배차 취소가 필요합니다.",
  "화물 포장 상태 미비로 재출고가 필요합니다.",
  "운송 경로 기상 악화로 배차 취소를 요청합니다.",
  "기사 교체가 필요하여 기존 매칭을 취소합니다.",
];

const GENERATED_SHIPPER_NAMES = [
  "동부 콜드체인",
  "한빛 물류",
  "에버그린 트레이딩",
  "온누리 유통",
  "프라임 패키징",
  "메가푸드 코리아",
  "중앙 물산",
  "세림 로지스",
];

const GENERATED_CARGO_NAMES = [
  "냉장 식자재",
  "전자 부품",
  "포장 자재",
  "의류 완제품",
  "생활용품",
  "공업용 자재",
  "수출 화물",
  "의약품",
];

const GENERATED_ORIGINS = [
  "인천 남항 물류단지",
  "평택 통합 터미널",
  "김포 냉동창고",
  "청주 크로스도크",
  "천안 산업단지",
  "대전 중앙 허브",
  "울산 공업 물류센터",
  "광주 복합 야드",
];

const GENERATED_DESTINATIONS = [
  "서울 동북권 센터",
  "성남 스마트 물류센터",
  "수원 디스트리뷰션 센터",
  "용인 통합 창고",
  "대구 서부 터미널",
  "부산 신항 배후단지",
  "창원 공단 물류센터",
  "전주 내륙 컨테이너기지",
];

const GENERATED_ORDER_CANCELLATION_REQUEST_MOCK_ROWS: CancellationRequestRow[] = Array.from(
  { length: 18 },
  (_, index) => {
    const seq = index + 10;
    const requestNo = String(seq).padStart(3, "0");
    const quoteNo = 5200 + index;
    const matchNo = 8900 + index;
    const shipperNo = 300 + (index % 70);
    const driverNo = 600 + (index % 90);
    const requestedByRole = index % 2 === 0 ? "SHIPPER" : "DRIVER";
    const requestedByName =
      requestedByRole === "SHIPPER"
        ? GENERATED_SHIPPER_NAMES[index % GENERATED_SHIPPER_NAMES.length]
        : `기사 ${driverNo}`;
    const requestedDay = 3 + Math.floor(index / 6);
    const requestedHour = 8 + (index % 10);
    const requestedMinute = (index * 7) % 60;

    const approvalStatus =
      index % 6 === 0 ? "REJECTED" : index % 5 === 0 ? "APPROVED" : "PENDING";
    const reviewedAt =
      approvalStatus === "PENDING"
        ? undefined
        : `2026-03-${String(requestedDay).padStart(2, "0")} ${String(
            Math.min(requestedHour + 1, 23),
          ).padStart(2, "0")}:${String((requestedMinute + 20) % 60).padStart(2, "0")}`;
    const reviewedBy =
      approvalStatus === "PENDING"
        ? undefined
        : approvalStatus === "APPROVED"
          ? "admin.ops"
          : "admin.risk";
    const reviewMemo =
      approvalStatus === "PENDING"
        ? undefined
        : approvalStatus === "APPROVED"
          ? "상차 전 취소 요청으로 운영 리스크가 낮아 승인합니다."
          : "매칭 확정 이후 취소 요청으로 패널티 검토가 필요합니다.";

    return {
      requestId: `CR-202603${String(requestedDay).padStart(2, "0")}-${requestNo}`,
      quoteId: `Q-${quoteNo}`,
      matchId: `M-${matchNo}`,
      requestedByRole,
      requestedByName,
      shipperId: `S-${shipperNo}`,
      shipperName: GENERATED_SHIPPER_NAMES[index % GENERATED_SHIPPER_NAMES.length],
      driverId: `D-${driverNo}`,
      driverName: `기사 ${driverNo}`,
      originAddress: GENERATED_ORIGINS[index % GENERATED_ORIGINS.length],
      destinationAddress: GENERATED_DESTINATIONS[index % GENERATED_DESTINATIONS.length],
      cargoName: GENERATED_CARGO_NAMES[index % GENERATED_CARGO_NAMES.length],
      cancelReason:
        GENERATED_CANCELLATION_REASONS[index % GENERATED_CANCELLATION_REASONS.length],
      requestedAt: `2026-03-${String(requestedDay).padStart(2, "0")} ${String(
        requestedHour,
      ).padStart(2, "0")}:${String(requestedMinute).padStart(2, "0")}`,
      approvalStatus,
      reviewedAt,
      reviewedBy,
      reviewMemo,
    } satisfies CancellationRequestRow;
  },
);

export const ORDER_CANCELLATION_REQUEST_MOCK_ROWS: CancellationRequestRow[] = [
  ...BASE_ORDER_CANCELLATION_REQUEST_MOCK_ROWS,
  ...GENERATED_ORDER_CANCELLATION_REQUEST_MOCK_ROWS,
];

export const ORDER_MONITORING_MOCK_ROWS: OrderMonitoringRow[] = [
  {
    quoteId: "Q-5104",
    matchId: "M-8801",
    quoteStatus: "MATCHED",
    matchStatus: "READY",
    paymentStatus: "PENDING",
    settlementStatus: "PENDING",
    shipperName: "블루 리테일",
    driverName: "기사 778",
    originAddress: "인천 허브 A",
    destinationAddress: "서울 냉동창고 5",
    cargoName: "냉동 수산물",
    requestedAt: "2026-03-02 09:15",
    totalFare: 620000,
    riskState: "WATCH",
  },
  {
    quoteId: "Q-5097",
    matchId: "M-8792",
    quoteStatus: "MATCHED",
    matchStatus: "IN_TRANSIT",
    paymentStatus: "COMPLETED",
    settlementStatus: "PROCESSING",
    shipperName: "에코마트 로지스틱스",
    driverName: "기사 701",
    originAddress: "청주 크로스도크",
    destinationAddress: "용인 물류센터",
    cargoName: "포장재",
    requestedAt: "2026-03-02 11:40",
    totalFare: 480000,
    riskState: "NORMAL",
  },
  {
    quoteId: "Q-5088",
    matchId: "-",
    quoteStatus: "OPEN",
    matchStatus: "UNMATCHED",
    paymentStatus: "UNKNOWN",
    settlementStatus: "UNKNOWN",
    shipperName: "카파 트레이딩",
    driverName: "-",
    originAddress: "광주 야드",
    destinationAddress: "수원 디포",
    cargoName: "사무 용품",
    requestedAt: "2026-03-01 14:20",
    totalFare: 330000,
    riskState: "WATCH",
  },
  {
    quoteId: "Q-5072",
    matchId: "M-8748",
    quoteStatus: "CANCELLED",
    matchStatus: "CANCELLED",
    paymentStatus: "FAILED",
    settlementStatus: "FAILED",
    shipperName: "다림푸드",
    driverName: "기사 644",
    originAddress: "김포 공장",
    destinationAddress: "부산 프레시 터미널",
    cargoName: "가공 식품",
    requestedAt: "2026-03-01 08:05",
    totalFare: 590000,
    riskState: "NORMAL",
  },
  {
    quoteId: "Q-5068",
    matchId: "M-8739",
    quoteStatus: "MATCHED",
    matchStatus: "READY",
    paymentStatus: "PENDING",
    settlementStatus: "PENDING",
    shipperName: "코어 제조",
    driverName: "기사 632",
    originAddress: "대전 공장",
    destinationAddress: "대구 조립 현장",
    cargoName: "기계 부품",
    requestedAt: "2026-03-01 10:15",
    totalFare: 710000,
    riskState: "ACTION_REQUIRED",
  },
];

