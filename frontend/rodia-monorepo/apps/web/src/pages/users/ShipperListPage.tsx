'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { fetchShippers, ShipperStatus, ShipperGrade, Shipper, ShipperFilter } from '@/features/users/api/shipperApi';import { ShipperDetailModal } from '@/features/users/ui/ShipperDetailModal';import { Button } from '@/shared/ui/shadcn/button';
import { FormField } from '@/shared/ui/common/FormField';
import { Alert } from '@/shared/ui/common/Alert';
import { StatusBadge } from '@/shared/ui/common/StatusBadge';

const STATUS_COLORS: Record<ShipperStatus, string> = {
  [ShipperStatus.ACTIVE]: 'bg-success/10 text-success border-success/20',
  [ShipperStatus.SUSPENDED]: 'bg-warning/10 text-warning border-warning/20',
  [ShipperStatus.INACTIVE]: 'bg-error/10 text-error border-error/20',
};

const GRADE_DISPLAY: Record<ShipperGrade, { label: string; color: string }> = {
  [ShipperGrade.PLATINUM]: { label: 'PLATINUM', color: 'text-slate-300' },
  [ShipperGrade.GOLD]: { label: 'GOLD', color: 'text-amber-500' },
  [ShipperGrade.SILVER]: { label: 'SILVER', color: 'text-slate-400' },
  [ShipperGrade.BRONZE]: { label: 'BRONZE', color: 'text-amber-700' },
};

const GRADE_SORT_ORDER: Record<ShipperGrade, number> = {
  [ShipperGrade.PLATINUM]: 0,
  [ShipperGrade.GOLD]: 1,
  [ShipperGrade.SILVER]: 2,
  [ShipperGrade.BRONZE]: 3,
};

function CreditScoreBadge({ score }: { score: number }) {
  const getColor = () => {
    if (score >= 85) return 'bg-success/20 text-success border-success/30';
    if (score >= 70) return 'bg-warning/20 text-warning border-warning/30';
    return 'bg-error/20 text-error border-error/30';
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getColor()}`}>
      {score}점
    </span>
  );
}

function GradeBadge({ grade }: { grade: ShipperGrade }) {
  const display = GRADE_DISPLAY[grade];
  return <span className={`font-bold text-sm ${display.color}`}>★ {display.label}</span>;
}

export default function ShipperListPage() {
  const [shippers, setShippers] = useState<Shipper[]>([]);
  const [filteredShippers, setFilteredShippers] = useState<Shipper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedShipper, setSelectedShipper] = useState<Shipper | null>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ShipperStatus | 'ALL'>('ALL');
  const [selectedGrade, setSelectedGrade] = useState<ShipperGrade | 'ALL'>('ALL');
  const [selectedType, setSelectedType] = useState<'ALL' | 'INDIVIDUAL' | 'COMPANY'>('ALL');
  
  // Pagination
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // Load data
  useEffect(() => {
    const loadShippers = async () => {
      try {
        setLoading(true);
        const filter: ShipperFilter = {
          status: selectedStatus === 'ALL' ? undefined : selectedStatus,
          grade: selectedGrade === 'ALL' ? undefined : selectedGrade,
          type: selectedType === 'ALL' ? undefined : selectedType,
        };
        const data = await fetchShippers(filter);
        setShippers(data.items);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : '화주 데이터 로드 실패');
      } finally {
        setLoading(false);
      }
    };

    loadShippers();
  }, [selectedStatus, selectedGrade, selectedType]);

  // Apply search
  useEffect(() => {
    const query = searchQuery.toLowerCase();
    const filtered = shippers.filter(
      (shipper) =>
        shipper.name.toLowerCase().includes(query) ||
        (shipper.phone?.toLowerCase().includes(query)) ||
        shipper.id.toLowerCase().includes(query)
    );
    setFilteredShippers(filtered);
    setPage(1);
  }, [shippers, searchQuery]);

  // Sorted by grade (VIP first)
  const displayShippers = useMemo(() => {
    return filteredShippers.sort(
      (a, b) => GRADE_SORT_ORDER[a.grade] - GRADE_SORT_ORDER[b.grade]
    );
  }, [filteredShippers]);

  // Pagination
  const paginatedShippers = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return displayShippers.slice(start, start + itemsPerPage);
  }, [displayShippers, page]);

  const totalPages = Math.ceil(displayShippers.length / itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-content-primary">화주 관리</h1>
        <p className="mt-1 text-sm text-content-secondary">화주 계정을 조회하고 상태를 관리합니다.</p>
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
                placeholder="이름, 전화번호, ID로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-surface border border-outline rounded-lg text-content-primary placeholder:text-content-tertiary focus:outline-none focus:border-primary"
              />
            </div>
          }
        />

        <div className="grid grid-cols-3 gap-4">
          <FormField
            label="상태"
            input={
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as ShipperStatus | 'ALL')}
                className="w-full px-3 py-2 bg-surface border border-outline rounded-lg text-content-primary focus:outline-none focus:border-primary"
              >
                <option value="ALL">전체</option>
                <option value={ShipperStatus.ACTIVE}>활성</option>
                <option value={ShipperStatus.SUSPENDED}>정지</option>
                <option value={ShipperStatus.INACTIVE}>비활성</option>
              </select>
            }
          />

          <FormField
            label="VIP 등급"
            input={
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value as ShipperGrade | 'ALL')}
                className="w-full px-3 py-2 bg-surface border border-outline rounded-lg text-content-primary focus:outline-none focus:border-primary"
              >
                <option value="ALL">전체</option>
                <option value={ShipperGrade.PLATINUM}>PLATINUM</option>
                <option value={ShipperGrade.GOLD}>GOLD</option>
                <option value={ShipperGrade.SILVER}>SILVER</option>
                <option value={ShipperGrade.BRONZE}>BRONZE</option>
              </select>
            }
          />

          <FormField
            label="유형"
            input={
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as 'ALL' | 'INDIVIDUAL' | 'COMPANY')}
                className="w-full px-3 py-2 bg-surface border border-outline rounded-lg text-content-primary focus:outline-none focus:border-primary"
              >
                <option value="ALL">전체</option>
                <option value="INDIVIDUAL">개인</option>
                <option value="COMPANY">법인</option>
              </select>
            }
          />
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-content-secondary">
        총 {displayShippers.length}명 (페이지 {page}/{totalPages})
      </div>

      {/* Table */}
      <div className="bg-surface-container rounded-lg border border-outline overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-dim border-b border-outline">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-content-primary">이름</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-content-primary">유형</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-content-primary">등급</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-content-primary">신용도</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-content-primary">거래액</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-content-primary">평점</th>
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
              ) : paginatedShippers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-content-secondary">
                    결과가 없습니다.
                  </td>
                </tr>
              ) : (
                paginatedShippers.map((shipper) => (
                  <tr
                    key={shipper.id}
                    onClick={() => setSelectedShipper(shipper)}
                    className="hover:bg-surface-dim transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-content-primary">{shipper.name}</td>
                    <td className="px-6 py-4 text-sm text-content-secondary">
                      {shipper.type === 'INDIVIDUAL' ? '개인' : '법인'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <GradeBadge grade={shipper.grade} />
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <CreditScoreBadge score={shipper.creditScore} />
                    </td>
                    <td className="px-6 py-4 text-sm text-content-secondary">
                      ₩{(shipper.stats.totalSpent / 1000000).toFixed(1)}M
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="text-warning">★</span> {shipper.stats.averageRating.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <StatusBadge
                        status={shipper.status}
                        className={STATUS_COLORS[shipper.status]}
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
      {selectedShipper && (
        <ShipperDetailModal
          shipper={selectedShipper}
          onClose={() => setSelectedShipper(null)}
        />
      )}
    </div>
  );
}
