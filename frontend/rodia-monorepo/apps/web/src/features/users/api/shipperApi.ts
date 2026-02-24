/**
 * 화주 관리 API
 * 배송을 요청하는 기업/개인 (Shipper) 관리
 */

export enum ShipperStatus {
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  INACTIVE = "INACTIVE",
}

export enum ShipperGrade {
  PLATINUM = "PLATINUM",
  GOLD = "GOLD",
  SILVER = "SILVER",
  BRONZE = "BRONZE",
}

export type ShipperStats = {
  totalShipments: number;
  completedShipments: number;
  totalSpent: number;
  averageRating: number;
  delayRate: number;
};

export type Shipper = {
  id: string;
  name: string;
  type: "INDIVIDUAL" | "COMPANY";
  businessNo?: string; // 사업자등록번호
  representativeName?: string;
  phone: string;
  email: string;
  address: string;
  registeredAt: string;
  status: ShipperStatus;
  grade: ShipperGrade;
  creditScore: number; // 0-100
  stats: ShipperStats;
  outstandingAmount: number; // 미정산액
  lastShipmentAt?: string;
  notes?: string;
};

export type ShipperFilter = {
  search?: string;
  type?: "INDIVIDUAL" | "COMPANY";
  status?: ShipperStatus;
  grade?: ShipperGrade;
  page?: number;
  size?: number;
};

export type ShipperResponse = {
  items: Shipper[];
  total: number;
};

export type ShipmentLog = {
  id: string;
  quoteId: string;
  driverId: string;
  driverName: string;
  origin: string;
  destination: string;
  weightKg: number;
  price: number;
  status: "대기" | "진행중" | "완료" | "취소";
  scheduledAt: string;
  completedAt?: string;
  distance: number;
  duration: number; // 예상 소요 시간 (분)
  actualDuration?: number; // 실제 소요 시간 (분)
  rating?: number; // 기사 평점 (1-5)
  review?: string;
};

// Mock 화주 데이터 생성
function generateMockShippers(count: number): Shipper[] {
  const companies = [
    "삼성전자",
    "LG전자",
    "현대차",
    "SK이노베이션",
    "포스코",
    "네이버",
    "카카오",
    "쿠팡",
    "배달의민족",
    "우아한형제들",
  ];

  const grades: ShipperGrade[] = [
    ShipperGrade.PLATINUM,
    ShipperGrade.GOLD,
    ShipperGrade.SILVER,
    ShipperGrade.BRONZE,
  ];

  return Array.from({ length: count }, (_, i) => {
    const isCompany = i % 3 !== 0;
    const grade = grades[Math.floor(Math.random() * 4)];
    const totalShipments = 50 + Math.floor(Math.random() * 500);
    const completedShipments = Math.floor(totalShipments * (0.85 + Math.random() * 0.15));

    return {
      id: `shipper_${i}`,
      name: isCompany ? companies[i % companies.length] : `화주_${i}`,
      type: isCompany ? "COMPANY" : "INDIVIDUAL",
      businessNo: isCompany ? `123-45-${String(i).padStart(5, "0")}` : undefined,
      representativeName: isCompany ? `담당자_${i}` : undefined,
      phone: `010-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`,
      email: `shipper${i}@example.com`,
      address: `서울시 강남구 테헤란로 ${i}`,
      registeredAt: new Date(Date.now() - (i + 1) * 86400000 * 30).toISOString(),
      status: i % 20 === 0 ? ShipperStatus.SUSPENDED : ShipperStatus.ACTIVE,
      grade,
      creditScore: 60 + Math.floor(Math.random() * 40),
      stats: {
        totalShipments,
        completedShipments,
        totalSpent: 1000000 + Math.random() * 50000000,
        averageRating: 3.5 + Math.random() * 1.5,
        delayRate: Math.random() * 0.1,
      },
      outstandingAmount: Math.random() > 0.7 ? Math.floor(Math.random() * 5000000) : 0,
      lastShipmentAt: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
      notes: Math.random() > 0.8 ? "VIP 고객, 우선 처리 요청함" : undefined,
    };
  });
}

const ALL_SHIPPERS = generateMockShippers(100);

/**
 * 화주 목록 조회
 */
export async function fetchShippers(filter: ShipperFilter = {}): Promise<ShipperResponse> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const { search, type, status, grade, page = 1, size = 20 } = filter;

      let filtered = ALL_SHIPPERS.filter((shipper) => {
        if (search) {
          const searchLower = search.toLowerCase();
          if (
            !shipper.name.toLowerCase().includes(searchLower) &&
            !shipper.id.includes(searchLower) &&
            !shipper.phone.includes(searchLower)
          ) {
            return false;
          }
        }
        if (type && shipper.type !== type) return false;
        if (status && shipper.status !== status) return false;
        if (grade && shipper.grade !== grade) return false;
        return true;
      });

      // 최근 거래순 정렬
      filtered.sort(
        (a, b) =>
          new Date(b.lastShipmentAt || 0).getTime() - new Date(a.lastShipmentAt || 0).getTime()
      );

      const total = filtered.length;
      const start = (page - 1) * size;
      const items = filtered.slice(start, start + size);

      resolve({ items, total });
    }, 300);
  });
}

/**
 * 화주 상세 조회
 */
export async function fetchShipper(shipperId: string): Promise<Shipper | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(ALL_SHIPPERS.find((s) => s.id === shipperId) ?? null);
    }, 200);
  });
}

/**
 * 화주 상태 변경
 */
export async function updateShipperStatus(
  shipperId: string,
  status: ShipperStatus
): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const shipper = ALL_SHIPPERS.find((s) => s.id === shipperId);
      if (shipper) {
        shipper.status = status;
        resolve(true);
      } else {
        resolve(false);
      }
    }, 200);
  });
}

/**
 * 화주 신용도 조회
 */
export async function fetchShipperCreditAnalysis(shipperId: string) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const shipper = ALL_SHIPPERS.find((s) => s.id === shipperId);
      if (!shipper) {
        resolve(null);
        return;
      }

      resolve({
        creditScore: shipper.creditScore,
        completionRate: (shipper.stats.completedShipments / shipper.stats.totalShipments) * 100,
        delayRate: shipper.stats.delayRate * 100,
        averageRating: shipper.stats.averageRating,
        outstandingAmount: shipper.outstandingAmount,
        riskLevel:
          shipper.creditScore < 70
            ? "HIGH"
            : shipper.creditScore < 85
              ? "MEDIUM"
              : "LOW",
      });
    }, 200);
  });
}

/**
 * 화주 배송 로그 조회
 */
export async function fetchShipperShipments(shipperId: string): Promise<ShipmentLog[]> {
  const drivers = [
    "김운송",
    "이배차",
    "박화물",
    "최효율",
    "정신속",
    "강안전",
    "윤정확",
    "임시간",
    "한온전",
    "김전문",
  ];

  const origins = [
    "인천 남동구",
    "부천 오류동",
    "서울 강서구",
    "경기 시흥시",
    "경기 안산시",
    "경기 고양시",
    "경기 의정부시",
    "경기 성남시",
  ];

  const destinations = [
    "서울 종로구",
    "서울 중구",
    "서울 용산구",
    "서울 강남구",
    "서울 송파구",
    "서울 강동구",
    "경기 수원시",
    "경기 평택시",
  ];

  return new Promise((resolve) => {
    setTimeout(() => {
      const shipper = ALL_SHIPPERS.find((s) => s.id === shipperId);
      if (!shipper) {
        resolve([]);
        return;
      }

      const logs: ShipmentLog[] = [];
      const statuses: Array<"대기" | "진행중" | "완료" | "취소"> = [
        "완료",
        "완료",
        "완료",
        "진행중",
        "대기",
        "취소",
      ];

      for (let i = 0; i < Math.min(shipper.stats.totalShipments, 50); i++) {
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const scheduledAt = new Date(
          Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000
        ).toISOString();
        const daysToAdd = 1 + Math.floor(Math.random() * 3);
        const completedAt =
          status === "완료"
            ? new Date(new Date(scheduledAt).getTime() + daysToAdd * 24 * 60 * 60 * 1000).toISOString()
            : undefined;

        logs.push({
          id: `shipment_${i}`,
          quoteId: `quote_${i}`,
          driverId: `driver_${Math.floor(Math.random() * 100)}`,
          driverName: drivers[Math.floor(Math.random() * drivers.length)],
          origin: origins[Math.floor(Math.random() * origins.length)],
          destination: destinations[Math.floor(Math.random() * destinations.length)],
          weightKg: 100 + Math.floor(Math.random() * 2000),
          price: 50000 + Math.floor(Math.random() * 500000),
          status,
          scheduledAt,
          completedAt,
          distance: 10 + Math.floor(Math.random() * 300),
          duration: 30 + Math.floor(Math.random() * 480),
          actualDuration:
            status === "완료"
              ? 30 + Math.floor(Math.random() * 480)
              : undefined,
          rating: status === "완료" ? 3.5 + Math.random() * 1.5 : undefined,
          review:
            status === "완료" && Math.random() > 0.5
              ? [
                  "배송이 신속하고 정확했습니다.",
                  "운전자분이 친절하셨습니다.",
                  "예상 시간보다 빨리 도착했습니다.",
                  "화물 상태가 좋았습니다.",
                  "전문적인 서비스였습니다.",
                ][Math.floor(Math.random() * 5)]
              : undefined,
        });
      }

      // 최신순 정렬
      logs.sort(
        (a, b) =>
          new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
      );

      resolve(logs);
    }, 300);
  });
}
