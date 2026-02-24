'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, AlertTriangle } from 'lucide-react';
import { fetchDrivers, DriverStatus, DriverRating, Driver, DriverFilter } from '@/features/users/api/driverApi';
import { DriverDetailModal } from '@/features/users/ui/DriverDetailModal';
import { Button } from '@/shared/ui/shadcn/button';
import { FormField } from '@/shared/ui/common/FormField';
import { Alert } from '@/shared/ui/common/Alert';
import { StatusBadge } from '@/shared/ui/common/StatusBadge';

const STATUS_COLORS: Record<DriverStatus, string> = {
  [DriverStatus.ACTIVE]: 'bg-success/10 text-success border-success/20',
  [DriverStatus.SUSPENDED]: 'bg-warning/10 text-warning border-warning/20',
  [DriverStatus.INACTIVE]: 'bg-error/10 text-error border-error/20',
  [DriverStatus.PENDING_APPROVAL]: 'bg-info/10 text-info border-info/20',
};

const RATING_DISPLAY: Record<DriverRating, { label: string; color: string }> = {
  [DriverRating.EXCELLENT]: { label: '최우수', color: 'text-success' },
  [DriverRating.GOOD]: { label: '우수', color: 'text-info' },
  [DriverRating.FAIR]: { label: '보통', color: 'text-content-secondary' },
  [DriverRating.POOR]: { label: '부진', color: 'text-error' },
};

const RATING_SORT_ORDER: Record<DriverRating, number> = {
  [DriverRating.EXCELLENT]: 0,
  [DriverRating.GOOD]: 1,
  [DriverRating.FAIR]: 2,
  [DriverRating.POOR]: 3,
};

function RatingBadge({ rating }: { rating: DriverRating }) {
  const display = RATING_DISPLAY[rating];
  const stars = {
    [DriverRating.EXCELLENT]: '⭐⭐⭐⭐⭐',
    [DriverRating.GOOD]: '⭐⭐⭐⭐',
    [DriverRating.FAIR]: '⭐⭐⭐',
    [DriverRating.POOR]: '⭐⭐',
  };

  return (
    <span className={`font-semibold text-sm ${display.color}`}>
      {stars[rating]} {display.label}
    </span>
  );
}

function ViolationIndicator({ count }: { count: number }) {
  if (count === 0) {
    return <span className="text-success text-sm font-medium">없음</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-error/20 text-error border border-error/30">
      <AlertTriangle className="w-3 h-3" />
      {count}건
    </span>
  );
}

export default function DriverListPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<DriverStatus | 'ALL'>('ALL');
  const [selectedRating, setSelectedRating] = useState<DriverRating | 'ALL'>('ALL');
  
  // Pagination
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // Load data
  useEffect(() => {
    const loadDrivers = async () => {
      try {
        setLoading(true);
        const filter: DriverFilter = {
          status: selectedStatus === 'ALL' ? undefined : selectedStatus,
          rating: selectedRating === 'ALL' ? undefined : selectedRating,
        };
        const data = await fetchDrivers(filter);
        setDrivers(data.items);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : '차주 데이터 로드 실패');
      } finally {
        setLoading(false);
      }
    };

    loadDrivers();
  }, [selectedStatus, selectedRating]);

  // Apply search
  useEffect(() => {
    const query = searchQuery.toLowerCase();
    const filtered = drivers.filter(
      (driver) =>
        driver.name.toLowerCase().includes(query) ||
        driver.phone?.toLowerCase().includes(query) ||
        driver.id.toLowerCase().includes(query) ||
        driver.vehicle.plateNumber.toLowerCase().includes(query)
    );
    setFilteredDrivers(filtered);
    setPage(1);
  }, [drivers, searchQuery]);

  // Sorted by rating (EXCELLENT first)
  const displayDrivers = useMemo(() => {
    return filteredDrivers.sort(
      (a, b) => RATING_SORT_ORDER[a.rating] - RATING_SORT_ORDER[b.rating]
    );
  }, [filteredDrivers]);

  // Pagination
  const paginatedDrivers = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return displayDrivers.slice(start, start + itemsPerPage);
  }, [displayDrivers, page]);

  const totalPages = Math.ceil(displayDrivers.length / itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-content-primary">차주 관리</h1>
        <p className="mt-1 text-sm text-content-secondary">차주 계정을 조회하고 성과를 관리합니다.</p>
      </div>

      {error && <Alert variant="error" title="오류" message={error} />}

      {/* Controls */}
      <div className="space-y-4 bg-surface-container rounded-lg p-4 border border-outline">
        <FormField
          label="검색"
          input={
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-secondary" />
              <input
                type="text"
                placeholder="이름, 전화번호, 차량번호로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-surface border border-outline rounded-lg text-content-primary placeholder:text-content-tertiary focus:outline-none focus:border-primary"
              />
            </div>
          }
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="상태"
            input={
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as DriverStatus | 'ALL')}
                className="w-full px-3 py-2 bg-surface border border-outline rounded-lg text-content-primary focus:outline-none focus:border-primary"
              >
                <option value="ALL">전체</option>
                <option value={DriverStatus.ACTIVE}>활성</option>
                <option value={DriverStatus.PENDING_APPROVAL}>승인대기</option>
                <option value={DriverStatus.SUSPENDED}>정지</option>
                <option value={DriverStatus.INACTIVE}>비활성</option>
              </select>
            }
          />

          <FormField
            label="평점"
            input={
              <select
                value={selectedRating}
                onChange={(e) => setSelectedRating(e.target.value as DriverRating | 'ALL')}
                className="w-full px-3 py-2 bg-surface border border-outline rounded-lg text-content-primary focus:outline-none focus:border-primary"
              >
                <option value="ALL">전체</option>
                <option value={DriverRating.EXCELLENT}>최우수</option>
                <option value={DriverRating.GOOD}>우수</option>
                <option value={DriverRating.FAIR}>보통</option>
                <option value={DriverRating.POOR}>부진</option>
              </select>
            }
          />
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-content-secondary">
        총 {displayDrivers.length}명 (페이지 {page}/{totalPages})
      </div>

      {/* Table */}
      <div className="bg-surface-container rounded-lg border border-outline overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-dim border-b border-outline">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-content-primary">이름</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-content-primary">차량</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-content-primary">평점</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-content-primary">월수익</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-content-primary">완료율</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-content-primary">위반</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-content-primary">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-content-secondary">
                    데이터 로드 중...
                  </td>
                </tr>
              ) : paginatedDrivers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-content-secondary">
                    결과가 없습니다.
                  </td>
                </tr>
              ) : (
                paginatedDrivers.map((driver) => (
                  <tr
                    key={driver.id}
                    onClick={() => setSelectedDriver(driver)}
                    className="hover:bg-surface-dim transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-content-primary">{driver.name}</td>
                    <td className="px-6 py-4 text-sm text-content-secondary">
                      <div>{driver.vehicle.type}</div>
                      <div className="text-xs text-content-tertiary">{driver.vehicle.plateNumber}</div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <RatingBadge rating={driver.rating} />
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-content-primary">
                      ₩{(driver.stats.monthlyEarnings / 10000).toFixed(0)}만
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-surface rounded-full overflow-hidden">
                          <div
                            className="h-full bg-success transition-all"
                            style={{ width: `${driver.stats.completionRate}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-content-secondary">
                          {driver.stats.completionRate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <ViolationIndicator count={driver.violations.length} />
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <StatusBadge
                        status={driver.status}
                        className={STATUS_COLORS[driver.status]}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(Math.max(1, page - 1))}
          >
            이전
          </Button>
          <span className="text-sm text-content-secondary">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage(Math.min(totalPages, page + 1))}
          >
            다음
          </Button>
        </div>
      )}

      {/* Detail Modal */}
      {selectedDriver && (
        <DriverDetailModal
          driver={selectedDriver}
          onClose={() => setSelectedDriver(null)}
        />
      )}
    </div>
  );
}
