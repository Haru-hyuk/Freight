/**
 * 이상징후 API
 * 배송 중 발생한 이상 징후 및 민원 관리
 */

export enum DeviationType {
  LATE_DELIVERY = "LATE_DELIVERY",
  ROUTE_DEVIATION = "ROUTE_DEVIATION",
  VEHICLE_CONDITION = "VEHICLE_CONDITION",
  SAFETY_VIOLATION = "SAFETY_VIOLATION",
  CUSTOMER_COMPLAINT = "CUSTOMER_COMPLAINT",
}

export enum DeviationSeverity {
  CRITICAL = "CRITICAL",
  SEVERE = "SEVERE",
  MODERATE = "MODERATE",
  MINOR = "MINOR",
}

export enum DeviationStatus {
  OPEN = "OPEN",
  INVESTIGATING = "INVESTIGATING",
  RESOLVED = "RESOLVED",
  DISMISSED = "DISMISSED",
}

export type Deviation = {
  id: string;
  caseNo: string;
  type: DeviationType;
  severity: DeviationSeverity;
  driverId: string;
  driverName: string;
  orderId: string;
  description: string;
  evidence?: string;
  status: DeviationStatus;
  detectedAt: string;
  resolvedAt?: string;
};

export type DeviationFilter = {
  search?: string;
  severity?: DeviationSeverity;
  type?: DeviationType;
  status?: DeviationStatus;
  page?: number;
  size?: number;
};

export type DeviationResponse = {
  items: Deviation[];
  total: number;
  page: number;
  size: number;
};

export type DeviationAction = {
  caseId: string;
  action: "START_INVESTIGATION" | "RESOLVE" | "DISMISS";
  memo?: string;
};

// Mock 데이터 생성 함수
function generateMockDeviations(count: number): Deviation[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `dev_${i}`,
    caseNo: `DV${String(i).padStart(8, "0")}`,
    type: [
      DeviationType.LATE_DELIVERY,
      DeviationType.ROUTE_DEVIATION,
      DeviationType.VEHICLE_CONDITION,
      DeviationType.SAFETY_VIOLATION,
      DeviationType.CUSTOMER_COMPLAINT,
    ][(i * 3) % 5],
    severity: [
      DeviationSeverity.CRITICAL,
      DeviationSeverity.SEVERE,
      DeviationSeverity.MODERATE,
      DeviationSeverity.MINOR,
    ][(i * 7) % 4],
    driverId: `drv_${i}`,
    driverName: `기사_${i}`,
    orderId: `ORD${String(i).padStart(8, "0")}`,
    description: [
      "배송 예정 시간 2시간 초과",
      "GPS 추적 경로에서 벗어남",
      "차량 외부 손상 발견",
      "신호 위반 적발",
      "고객 배송 거부",
    ][(i * 3) % 5],
    evidence: Math.random() > 0.5 ? "GPS_HISTORY" : undefined,
    status: [
      DeviationStatus.OPEN,
      DeviationStatus.INVESTIGATING,
      DeviationStatus.RESOLVED,
      DeviationStatus.DISMISSED,
    ][(i * 5) % 4],
    detectedAt: new Date(Date.now() - (i + 1) * 3600000).toISOString(),
    resolvedAt:
      i % 3 === 0 ? new Date(Date.now() - (i + 1) * 3600000 + 1800000).toISOString() : undefined,
  }));
}

const ALL_DEVIATIONS = generateMockDeviations(50);

/**
 * 이상징후 목록 조회
 * @param filter 필터 조건
 * @returns 이상징후 목록
 */
export async function fetchDeviations(filter: DeviationFilter = {}): Promise<DeviationResponse> {
  return new Promise((resolve) => {
    // 실제 API 호출 시간 시뮬레이션
    setTimeout(() => {
      const {
        search,
        severity,
        type,
        status,
        page = 1,
        size = 20,
      } = filter;

      // 필터링
      let filtered = ALL_DEVIATIONS.filter((deviation) => {
        if (search) {
          const searchLower = search.toLowerCase();
          const matchSearch =
            deviation.caseNo.includes(searchLower) ||
            deviation.driverName.includes(searchLower) ||
            deviation.orderId.includes(searchLower) ||
            deviation.description.includes(searchLower);
          if (!matchSearch) return false;
        }

        if (severity && deviation.severity !== severity) return false;
        if (type && deviation.type !== type) return false;
        if (status && deviation.status !== status) return false;

        return true;
      });

      // 정렬 (최신순)
      filtered.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());

      // 페이지네이션
      const total = filtered.length;
      const start = (page - 1) * size;
      const end = start + size;
      const items = filtered.slice(start, end);

      resolve({ items, total, page, size });
    }, 300);
  });
}

/**
 * 이상징후 상세 조회
 * @param caseId 사건 ID
 */
export async function fetchDeviation(caseId: string): Promise<Deviation | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const deviation = ALL_DEVIATIONS.find((d) => d.id === caseId);
      resolve(deviation ?? null);
    }, 200);
  });
}

/**
 * 이상징후 상태 변경
 * @param action 액션 정보
 */
export async function executeDeviationAction(action: DeviationAction): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const deviation = ALL_DEVIATIONS.find((d) => d.id === action.caseId);
      if (!deviation) {
        resolve(false);
        return;
      }

      // 상태 업데이트 시뮬레이션
      switch (action.action) {
        case "START_INVESTIGATION":
          deviation.status = DeviationStatus.INVESTIGATING;
          break;
        case "RESOLVE":
          deviation.status = DeviationStatus.RESOLVED;
          deviation.resolvedAt = new Date().toISOString();
          break;
        case "DISMISS":
          deviation.status = DeviationStatus.DISMISSED;
          deviation.resolvedAt = new Date().toISOString();
          break;
      }

      resolve(true);
    }, 300);
  });
}

/**
 * 이상징후 통계
 */
export async function fetchDeviationStats() {
  return new Promise((resolve) => {
    setTimeout(() => {
      const critical = ALL_DEVIATIONS.filter(
        (d) => d.severity === DeviationSeverity.CRITICAL || d.severity === DeviationSeverity.SEVERE
      ).length;
      const open = ALL_DEVIATIONS.filter((d) => d.status === DeviationStatus.OPEN).length;
      const investigating = ALL_DEVIATIONS.filter(
        (d) => d.status === DeviationStatus.INVESTIGATING
      ).length;

      resolve({ critical, open, investigating, total: ALL_DEVIATIONS.length });
    }, 200);
  });
}
