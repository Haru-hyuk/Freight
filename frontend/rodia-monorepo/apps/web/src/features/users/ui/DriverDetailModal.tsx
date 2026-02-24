'use client';

import { useEffect, useState } from 'react';
import { X, Phone, MapPin, Calendar, TrendingUp, AlertTriangle, Truck, Loader2 } from 'lucide-react';
import { fetchDriverDeliveries, DeliveryLog, Driver } from '@/features/users/api/driverApi';
import { Button } from '@/shared/ui/shadcn/button';
import { Alert } from '@/shared/ui/common/Alert';

interface DriverDetailModalProps {
  driver: Driver;
  onClose: () => void;
}

export function DriverDetailModal({ driver, onClose }: DriverDetailModalProps) {
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'deliveries'>('profile');

  useEffect(() => {
    const loadDeliveries = async () => {
      try {
        setLoading(true);
        const data = await fetchDriverDeliveries(driver.id);
        setLogs(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : '배송 로그 로드 실패');
      } finally {
        setLoading(false);
      }
    };

    loadDeliveries();
  }, [driver.id]);

  const completionRate = (driver.stats.completedMatches / driver.stats.totalMatches) * 100;

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-outline">
          <h2 className="text-xl font-bold text-content-primary">{driver.name}</h2>
          <button
            onClick={onClose}
            className="text-content-secondary hover:text-content-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-outline">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'profile'
                ? 'border-b-2 border-primary text-primary'
                : 'text-content-secondary hover:text-content-primary'
            }`}
          >
            프로필
          </button>
          <button
            onClick={() => setActiveTab('deliveries')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'deliveries'
                ? 'border-b-2 border-primary text-primary'
                : 'text-content-secondary hover:text-content-primary'
            }`}
          >
            배송 기록 ({logs.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'profile' ? (
            <div className="space-y-6">
              {/* 기본 정보 */}
              <div>
                <h3 className="text-sm font-semibold text-content-secondary mb-4">기본 정보</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-content-secondary min-w-20">면허번호:</span>
                    <span className="text-sm text-content-primary font-mono">{driver.licenseNo}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-content-secondary" />
                    <span className="text-sm text-content-primary">{driver.phone}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-content-secondary mt-0.5" />
                    <span className="text-sm text-content-primary">{driver.address}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-content-secondary" />
                    <span className="text-sm text-content-primary">
                      생년월일: {driver.birthDate}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-content-secondary" />
                    <span className="text-sm text-content-primary">
                      가입일: {new Date(driver.registeredAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </div>
              </div>

              {/* 차량 정보 */}
              <div>
                <h3 className="text-sm font-semibold text-content-secondary mb-4 flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  차량 정보
                </h3>
                <div className="bg-surface p-4 rounded-lg border border-outline space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-content-secondary">차량번호</span>
                    <span className="text-sm font-medium text-content-primary">{driver.vehicle.plateNumber}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-content-secondary">차종</span>
                    <span className="text-sm font-medium text-content-primary">
                      {driver.vehicle.type === 'TRUCK' ? '트럭' :
                       driver.vehicle.type === 'VAN' ? '밴' : '세단'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-content-secondary">적재용량</span>
                    <span className="text-sm font-medium text-content-primary">{driver.vehicle.capacity}kg</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-content-secondary">보험만료</span>
                    <span className="text-sm font-medium text-content-primary">
                      {new Date(driver.vehicle.insuranceExpiredAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </div>
              </div>

              {/* 상태 및 평점 */}
              <div>
                <h3 className="text-sm font-semibold text-content-secondary mb-4">상태 및 평점</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-surface p-4 rounded-lg border border-outline">
                    <div className="text-xs text-content-secondary mb-1">상태</div>
                    <div className={`text-sm font-medium ${
                      driver.status === 'ACTIVE' ? 'text-success' :
                      driver.status === 'PENDING_APPROVAL' ? 'text-info' :
                      driver.status === 'SUSPENDED' ? 'text-warning' :
                      'text-error'
                    }`}>
                      {driver.status === 'ACTIVE' ? '활성' :
                       driver.status === 'PENDING_APPROVAL' ? '승인대기' :
                       driver.status === 'SUSPENDED' ? '정지' : '비활성'}
                    </div>
                  </div>
                  <div className="bg-surface p-4 rounded-lg border border-outline">
                    <div className="text-xs text-content-secondary mb-1">평점</div>
                    <div className="text-warning font-bold">⭐ {driver.stats.averageRating.toFixed(1)}</div>
                    <div className="text-xs text-content-secondary mt-1">
                      {driver.rating === 'EXCELLENT' ? '최우수' :
                       driver.rating === 'GOOD' ? '우수' :
                       driver.rating === 'FAIR' ? '보통' : '부진'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 성과 통계 */}
              <div>
                <h3 className="text-sm font-semibold text-content-secondary mb-4">성과 통계</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-surface p-4 rounded-lg border border-outline">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-content-secondary">총 배송</span>
                      <TrendingUp className="w-4 h-4 text-info" />
                    </div>
                    <div className="text-lg font-bold text-content-primary">
                      {driver.stats.totalMatches}건
                    </div>
                    <div className="text-xs text-content-secondary mt-1">
                      완료: {driver.stats.completedMatches}건
                    </div>
                  </div>
                  <div className="bg-surface p-4 rounded-lg border border-outline">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-content-secondary">완료율</span>
                    </div>
                    <div className="text-lg font-bold text-content-primary">
                      {completionRate.toFixed(1)}%
                    </div>
                    <div className="w-full h-2 bg-surface-dim rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full bg-success transition-all"
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                  </div>
                  <div className="bg-surface p-4 rounded-lg border border-outline">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-content-secondary">수락율</span>
                    </div>
                    <div className="text-lg font-bold text-content-primary">
                      {driver.stats.acceptanceRate.toFixed(1)}%
                    </div>
                  </div>
                  <div className="bg-surface p-4 rounded-lg border border-outline">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-content-secondary">정시율</span>
                    </div>
                    <div className="text-lg font-bold text-content-primary">
                      {driver.stats.onTimeRate.toFixed(1)}%
                    </div>
                  </div>
                  <div className="bg-surface p-4 rounded-lg border border-outline col-span-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-content-secondary">총 수익</span>
                    </div>
                    <div className="text-lg font-bold text-success">
                      ₩{(driver.stats.totalEarnings / 1000000).toFixed(1)}M
                    </div>
                  </div>
                  <div className="bg-surface p-4 rounded-lg border border-outline col-span-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-content-secondary">월수익</span>
                    </div>
                    <div className="text-lg font-bold text-content-primary">
                      ₩{(driver.stats.monthlyEarnings / 10000).toFixed(0)}만
                    </div>
                  </div>
                </div>
              </div>

              {/* 자격 및 위반 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-content-secondary mb-3">자격</h3>
                  <div className="flex flex-wrap gap-2">
                    {driver.certifications.map((cert) => (
                      <span
                        key={cert}
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-info/10 text-info border border-info/20"
                      >
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-content-secondary mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    위반 이력
                  </h3>
                  {driver.violations.length > 0 ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-error/10 text-error border border-error/20">
                      {driver.violations.length}건
                    </span>
                  ) : (
                    <span className="text-xs text-success font-medium">없음</span>
                  )}
                </div>
              </div>

              {driver.notes && (
                <Alert variant="info" title="비고" message={driver.notes} />
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {error && <Alert variant="error" title="오류" message={error} />}

              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-content-secondary">배송 기록이 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {logs.map((log) => (
                    <div key={log.id} className="bg-surface p-4 rounded-lg border border-outline">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-medium text-content-primary text-sm">
                            {log.origin} → {log.destination}
                          </div>
                          <div className="text-xs text-content-secondary mt-1">
                            {log.shipperName}
                          </div>
                        </div>
                        <div className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${
                          log.status === '완료' ? 'bg-success/10 text-success border-success/20' :
                          log.status === '진행중' ? 'bg-info/10 text-info border-info/20' :
                          log.status === '대기' ? 'bg-warning/10 text-warning border-warning/20' :
                          'bg-error/10 text-error border-error/20'
                        }`}>
                          {log.status === '완료' ? '완료' :
                           log.status === '진행중' ? '진행중' :
                           log.status === '대기' ? '대기' : '취소'}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                        <div>
                          <span className="text-content-secondary">날짜:</span>
                          <div className="text-content-primary font-medium">
                            {new Date(log.scheduledAt).toLocaleDateString('ko-KR')}
                          </div>
                        </div>
                        <div>
                          <span className="text-content-secondary">수익:</span>
                          <div className="text-success font-medium">
                            ₩{(log.earnedAmount / 10000).toFixed(0)}만
                          </div>
                        </div>
                        <div>
                          <span className="text-content-secondary">무게:</span>
                          <div className="text-content-primary font-medium">
                            {log.weightKg}kg
                          </div>
                        </div>
                        <div>
                          <span className="text-content-secondary">거리:</span>
                          <div className="text-content-primary font-medium">
                            {log.distance}km
                          </div>
                        </div>
                      </div>

                      {log.status === '완료' && log.rating && (
                        <div className="pt-2 border-t border-outline/50">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-content-secondary">화주 평점</span>
                            <span className="text-warning font-medium">★ {log.rating.toFixed(1)}</span>
                          </div>
                          {log.review && (
                            <p className="text-xs text-content-secondary italic">&quot;{log.review}&quot;</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-outline p-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
        </div>
      </div>
    </div>
  );
}
