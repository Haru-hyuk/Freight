// src/shared/lib/utils/format.ts
export function formatNumber(n: number) {
  return new Intl.NumberFormat("ko-KR").format(n);
}

export function formatKRW(n: number) {
  return `${formatNumber(n)}원`;
}

export function formatPercent(n: number) {
  return `${n.toFixed(1)}%`;
}
