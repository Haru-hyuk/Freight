import { LIVE_DELIVERY_DETAIL_MOCK_BY_MATCH_ID, LIVE_DELIVERY_MOCK_ROWS } from "@/features/delivery/model/liveMockData";
import type { KakaoAlertPayload, LiveDeliveryDetail, LiveDeliveryRow } from "@/features/delivery/model/liveTypes";
import { apiClient } from "@/shared/lib/api/client";
import { appendActivityLog } from "@/shared/lib/activity-log";
import { isMockModeEnabled } from "@/shared/lib/mock-mode";

export async function fetchLiveDeliveryRows(): Promise<LiveDeliveryRow[]> {
  if (isMockModeEnabled()) return [...LIVE_DELIVERY_MOCK_ROWS];

  try {
    const response = await apiClient.get<LiveDeliveryRow[]>("/admin/delivery/live");
    return response.data;
  } catch {
    return [];
  }
}

export async function fetchLiveDeliveryDetail(matchId: string): Promise<LiveDeliveryDetail | null> {
  if (isMockModeEnabled()) return LIVE_DELIVERY_DETAIL_MOCK_BY_MATCH_ID[matchId] ?? null;

  try {
    const response = await apiClient.get<LiveDeliveryDetail>(`/admin/delivery/live/${matchId}`);
    return response.data;
  } catch {
    return null;
  }
}

export async function sendKakaoLiveAlert(payload: KakaoAlertPayload): Promise<void> {
  if (isMockModeEnabled()) {
    appendActivityLog({
      action: "LIVE_ALERT_SENT",
      targetId: payload.matchId,
      mode: "MOCK",
      message: `실시간 알림(${payload.templateCode})을 발송했습니다.`,
    });
    return;
  }

  try {
    await apiClient.post("/admin/notifications/kakao/live-alert", payload);
    appendActivityLog({
      action: "LIVE_ALERT_SENT",
      targetId: payload.matchId,
      mode: "REAL",
      message: `실시간 알림(${payload.templateCode})을 발송했습니다.`,
    });
  } catch {
    // no-op
  }
}

