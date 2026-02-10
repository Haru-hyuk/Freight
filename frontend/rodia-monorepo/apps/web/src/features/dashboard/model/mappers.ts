// src/features/dashboard/model/mappers.ts
import type { ApiDeviationEvent, DeviationFeedItem, DeviationSeverity, ApiDeviationSeverity } from "./types";

function mapSeverity(sev: ApiDeviationSeverity): DeviationSeverity {
  if (sev === "HIGH") return "SEVERE";
  if (sev === "MEDIUM") return "MODERATE";
  return "MINOR";
}

export function toDeviationFeedItem(ev: ApiDeviationEvent): DeviationFeedItem {
  return {
    deviationId: ev.id,
    matchId: ev.matchId ?? "-",
    severity: mapSeverity(ev.severity),
    deviationPercent: 0, // 서버에 없으니 우선 0. (추후 서버에서 주면 연결)
    adjusted: ev.adjusted,
    createdAt: ev.occurredAt,
    quoteSummary: ev.title || ev.summary || "-",
    driverName: ev.driverName ?? "-",
  };
}
