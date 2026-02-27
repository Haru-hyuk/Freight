import { formatKrw, formatDateTime } from "@/shared/lib/format/display";
import { BACKEND_STATUS, normalizeStatus } from "@/shared/lib/policy";
import type { ParsedUsageHistoryItem } from "../ui/UsageHistoryCard";
import type { ShipperMatchItem } from "./shipper-match-api";
import type { QuoteDetailResponse } from "@/entities/quote/model/quote.types";

function resolveStatusTone(status: string): ParsedUsageHistoryItem["statusTone"] {
  const normalized = normalizeStatus(status);
  if (normalized === BACKEND_STATUS.CANCELED) return "destructive";
  if (normalized === BACKEND_STATUS.DROPOFF) return "secondary";
  if (normalized === BACKEND_STATUS.OPEN || normalized === BACKEND_STATUS.READY) return "neutral";
  if (normalized === BACKEND_STATUS.ASSIGNED) return "accent";
  return "primary";
}

function resolveStatusLabel(status: string): string {
  const normalized = normalizeStatus(status);
  if (normalized === BACKEND_STATUS.READY || normalized === BACKEND_STATUS.OPEN) return "요청 접수";
  if (normalized === BACKEND_STATUS.NEGOTIATING) return "매칭 협의";
  if (normalized === BACKEND_STATUS.ASSIGNED) return "배차 완료";
  if (normalized === BACKEND_STATUS.PICKUP) return "상차 진행";
  if (normalized === BACKEND_STATUS.TRANSIT) return "운송 중";
  if (normalized === BACKEND_STATUS.DROPOFF) return "운송 완료";
  if (normalized === BACKEND_STATUS.CANCELED) return "취소됨";
  return "상태 확인";
}

export function mapToUsageHistoryItem(
  match: ShipperMatchItem,
  quote: QuoteDetailResponse | null
): ParsedUsageHistoryItem {
  const origin = quote?.originAddress?.trim() || "출발지 미상";
  const dest = quote?.destinationAddress?.trim() || "도착지 미상";
  const price = quote?.finalPrice || quote?.basePrice || quote?.desiredPrice || 0;
  
  const vehicleTon = quote?.vehicleType === "TON_1" ? "1톤" : 
                     quote?.vehicleType === "TON_2_5" ? "2.5톤" : 
                     quote?.vehicleType === "TON_5" ? "5톤" : quote?.vehicleType || "";
  const vehicleBody = quote?.vehicleBodyType === "CARGO" ? "카고" :
                      quote?.vehicleBodyType === "WING_BODY" ? "윙바디" : 
                      quote?.vehicleBodyType === "TOP_CAR" ? "탑차" : quote?.vehicleBodyType || "";
  
  return {
    id: `history-${match.matchId}-${quote?.quoteId || 0}`,
    quoteId: match.quoteId || quote?.quoteId || 0,
    matchId: match.matchId,
    statusTone: resolveStatusTone(match.status ?? "OPEN"),
    statusLabel: resolveStatusLabel(match.status ?? "OPEN"),
    originAddress: origin,
    destinationAddress: dest,
    priceText: formatKrw(price, ""), // SSOT 포맷팅
    vehicleText: `${vehicleTon} ${vehicleBody}`.trim() || "차량 정보 없음",
    dateText: formatDateTime(match.createdAt || quote?.createdAt, "날짜 없음"),
  };
}