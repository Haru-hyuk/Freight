/**
 * 차주 관리 API
 * 배송을 수행하는 운전자 (Driver) 관리
 */

export enum DriverStatus {
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  INACTIVE = "INACTIVE",
  PENDING_APPROVAL = "PENDING_APPROVAL",
}

export enum DriverRating {
  EXCELLENT = "EXCELLENT", // 4.8+
  GOOD = "GOOD", // 4.5+
  FAIR = "FAIR", // 4.0+
  POOR = "POOR", // < 4.0
}

export type VehicleInfo = {
  plateNumber: string;
  type: "TRUCK" | "VAN" | "SEDAN";
  capacity: number; // kg
  insuranceExpiredAt: string;
  registeredAt: string;
};

export type DriverStats = {
  totalMatches: number;
  completedMatches: number;
  averageRating: number;
  totalEarnings: number;
  monthlyEarnings: number;
  acceptanceRate: number; // %
  completionRate: number; // %
  onTimeRate: number; // %
};

export type Driver = {
  id: string;
  name: string;
  licenseNo: string;
  phone: string;
  birthDate: string;
  address: string;
  registeredAt: string;
  status: DriverStatus;
  rating: DriverRating;
  vehicle: VehicleInfo;
  stats: DriverStats;
  violations: Array<{
    date: string;
    type: "배송지연" | "경로이탈" | "사고" | "고객민원";
    severity: "심각" | "중대" | "경미";
  }>;
  certifications: string[]; // 위험물 운전, 특수화물 등
  bankAccount?: {
    bank: string;
    accountNo: string;
  };
  notes?: string;
};

export type DriverFilter = {
  search?: string;
  status?: DriverStatus;
  rating?: DriverRating;
  page?: number;
  size?: number;
};

export type DriverResponse = {
  items: Driver[];
  total: number;
};

export type DeliveryLog = {
  id: string;
  quoteId: string;
  shipperId: string;
  shipperName: string;
  origin: string;
  destination: string;
  weightKg: number;
  price: number;
  earnedAmount: number; // 기사가 받은 금액
  status: "대기" | "진행중" | "완료" | "취소";
  scheduledAt: string;
  completedAt?: string;
  distance: number;
  duration: number; // 예상 소요 시간 (분)
  actualDuration?: number; // 실제 소요 시간 (분)
  rating?: number; // 화주 평점 (1-5)
  review?: string;
};

// Mock 차주 데이터 생성
function generateMockDrivers(count: number): Driver[] {
  const bankNames = ["국민은행", "우리은행", "하나은행", "신한은행", "농협", "기업은행"];
  const vehicleTypes: ("TRUCK" | "VAN" | "SEDAN")[] = ["TRUCK", "VAN", "SEDAN"];

  const getRatingFromAverage = (avg: number): DriverRating => {
    if (avg >= 4.8) return DriverRating.EXCELLENT;
    if (avg >= 4.5) return DriverRating.GOOD;
    if (avg >= 4.0) return DriverRating.FAIR;
    return DriverRating.POOR;
  };

  return Array.from({ length: count }, (_, i) => {
    const totalMatches = 30 + Math.floor(Math.random() * 300);
    const completedMatches = Math.floor(totalMatches * (0.85 + Math.random() * 0.15));
    const avgRating = 3.5 + Math.random() * 1.5;
    const monthlyEarnings = 2000000 + Math.random() * 8000000;

    return {
      id: `driver_${i}`,
      name: `기사_${i}`,
      licenseNo: `20${String(i).padStart(7, "0")}`,
      phone: `010-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`,
      birthDate: `198${Math.floor(Math.random() * 10)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, "0")}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}`,
      address: `경기도 시흥시 공단로 ${i}`,
      registeredAt: new Date(Date.now() - (i + 1) * 86400000 * Math.floor(Math.random() * 365)).toISOString(),
      status: i % 25 === 0 ? DriverStatus.PENDING_APPROVAL : DriverStatus.ACTIVE,
      rating: getRatingFromAverage(avgRating),
      vehicle: {
        plateNumber: `서울 ${String(Math.floor(Math.random() * 20)).padStart(2, "0")}가 ${String(1000 + Math.floor(Math.random() * 9000)).padStart(4, "0")}`,
        type: vehicleTypes[Math.floor(Math.random() * 3)],
        capacity: 2000 + Math.floor(Math.random() * 3000),
        insuranceExpiredAt: new Date(Date.now() + Math.random() * 365 * 86400000).toISOString(),
        registeredAt: new Date(
          Date.now() - (i + 1) * 86400000 * Math.floor(Math.random() * 1825)
        ).toISOString(),
      },
      stats: {
        totalMatches,
        completedMatches,
        averageRating: avgRating,
        totalEarnings: monthlyEarnings * (3 + Math.floor(Math.random() * 9)),
        monthlyEarnings,
        acceptanceRate: 70 + Math.random() * 30,
        completionRate: (completedMatches / totalMatches) * 100,
        onTimeRate: 80 + Math.random() * 20,
      },
      violations: Array.from(
        { length: Math.floor(Math.random() * 3) },
        () => ({
          date: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
          type: ["배송지연", "경로이탈", "사고", "고객민원"][
            Math.floor(Math.random() * 4)
          ] as any,
          severity: ["심각", "중대", "경미"][Math.floor(Math.random() * 3)] as any,
        })
      ),
      certifications: Math.random() > 0.5 ? ["위험물 운전", "특수화물"] : ["일반"],
      bankAccount: {
        bank: bankNames[Math.floor(Math.random() * bankNames.length)],
        accountNo: `${String(Math.floor(Math.random() * 1000000)).padStart(7, "0")}-${String(Math.floor(Math.random() * 100)).padStart(2, "0")}`,
      },
      notes: Math.random() > 0.9 ? "안전 교육 이수" : undefined,
    };
  });
}

const ALL_DRIVERS = generateMockDrivers(150);

/**
 * 차주 목록 조회
 */
export async function fetchDrivers(filter: DriverFilter = {}): Promise<DriverResponse> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const { search, status, rating, page = 1, size = 20 } = filter;

      let filtered = ALL_DRIVERS.filter((driver) => {
        if (search) {
          const searchLower = search.toLowerCase();
          if (
            !driver.name.toLowerCase().includes(searchLower) &&
            !driver.id.includes(searchLower) &&
            !driver.phone.includes(searchLower) &&
            !driver.vehicle.plateNumber.includes(searchLower)
          ) {
            return false;
          }
        }
        if (status && driver.status !== status) return false;
        if (rating && driver.rating !== rating) return false;
        return true;
      });

      // 평점 높은순 정렬
      filtered.sort((a, b) => b.stats.averageRating - a.stats.averageRating);

      const total = filtered.length;
      const start = (page - 1) * size;
      const items = filtered.slice(start, start + size);

      resolve({ items, total });
    }, 300);
  });
}

/**
 * 차주 상세 조회
 */
export async function fetchDriver(driverId: string): Promise<Driver | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(ALL_DRIVERS.find((d) => d.id === driverId) ?? null);
    }, 200);
  });
}

/**
 * 차주 상태 변경
 */
export async function updateDriverStatus(
  driverId: string,
  status: DriverStatus
): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const driver = ALL_DRIVERS.find((d) => d.id === driverId);
      if (driver) {
        driver.status = status;
        resolve(true);
      } else {
        resolve(false);
      }
    }, 200);
  });
}

/**
 * 차주 위반 이력 조회
 */
export async function fetchDriverViolations(driverId: string) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const driver = ALL_DRIVERS.find((d) => d.id === driverId);
      if (!driver) {
        resolve(null);
        return;
      }

      resolve({
        total: driver.violations.length,
        critical: driver.violations.filter((v) => v.severity === "심각").length,
        severe: driver.violations.filter((v) => v.severity === "중대").length,
        minor: driver.violations.filter((v) => v.severity === "경미").length,
        items: driver.violations,
      });
    }, 200);
  });
}

/**
 * 차주 배송 로그 조회
 */
export async function fetchDriverDeliveries(driverId: string): Promise<DeliveryLog[]> {
  const shippers = [
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
      const driver = ALL_DRIVERS.find((d) => d.id === driverId);
      if (!driver) {
        resolve([]);
        return;
      }

      const logs: DeliveryLog[] = [];
      const statuses: Array<"대기" | "진행중" | "완료" | "취소"> = [
        "완료",
        "완료",
        "완료",
        "진행중",
        "대기",
        "취소",
      ];

      for (let i = 0; i < Math.min(driver.stats.totalMatches, 50); i++) {
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const scheduledAt = new Date(
          Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000
        ).toISOString();
        const daysToAdd = 1 + Math.floor(Math.random() * 3);
        const completedAt =
          status === "완료"
            ? new Date(new Date(scheduledAt).getTime() + daysToAdd * 24 * 60 * 60 * 1000).toISOString()
            : undefined;

        const price = 50000 + Math.floor(Math.random() * 500000);
        const earnedAmount = Math.floor(price * (0.7 + Math.random() * 0.25)); // 기사는 70-95% 수익

        logs.push({
          id: `delivery_${i}`,
          quoteId: `quote_${i}`,
          shipperId: `shipper_${Math.floor(Math.random() * 100)}`,
          shipperName: shippers[Math.floor(Math.random() * shippers.length)],
          origin: origins[Math.floor(Math.random() * origins.length)],
          destination: destinations[Math.floor(Math.random() * destinations.length)],
          weightKg: 100 + Math.floor(Math.random() * 2000),
          price,
          earnedAmount,
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
                  "화물을 안전하게 배송했습니다.",
                  "예정된 시간보다 빨리 도착했습니다.",
                  "친절하고 전문적인 배송이었습니다.",
                  "화물이 안전하게 도착했습니다.",
                  "우수한 서비스 감사합니다.",
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
