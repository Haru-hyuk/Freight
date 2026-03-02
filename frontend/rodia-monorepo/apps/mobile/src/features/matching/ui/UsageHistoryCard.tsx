// apps/mobile/src/features/matching/ui/UsageHistoryCard.tsx
import React, { useCallback, useMemo } from "react";
import { Pressable, StyleSheet, View, type GestureResponderEvent } from "react-native";
import { router } from "expo-router";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppText } from "@/shared/ui/kit/AppText";

// ---------------------------------------------------------------------------
// Data contract — mirrors what shipper-match-parser's ACL layer provides.
// ---------------------------------------------------------------------------
export type ParsedUsageHistoryItem = {
  id: string;
  quoteId: number;
  matchId?: number;
  status: string;
  originAddress: string;
  destinationAddress: string;
  priceText: string; // pre-formatted by formatKrw
  vehicleText: string;
  dateText: string; // pre-formatted by formatDateTime
};

// ---------------------------------------------------------------------------
// Domain mapping (Raw -> BackendStatus -> CustomerUiState)
// - Backend 근거: Quote.status = OPEN/MATCHED/IN_TRANSIT/DELIVERED/CANCELLED
//               Match.Status = READY/IN_TRANSIT/COMPLETED/CANCELLED
// ---------------------------------------------------------------------------
type BackendStatus =
  | "OPEN"
  | "MATCHED"
  | "READY"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "UNKNOWN";

type CustomerUiState =
  | "REQUESTED"
  | "PICKUP_IN_PROGRESS"
  | "PAYMENT_REQUIRED"
  | "TRANSIT_IN_PROGRESS"
  | "COMPLETED"
  | "CANCELED"
  | "UNKNOWN";

type CustomerCtaId = "PAY" | "TRACK" | "RECEIPT" | "RE_REQUEST";

type CustomerCtaConfig = {
  id: CustomerCtaId;
  label: string;
  variant: "primary" | "secondary";
  enabled: boolean;
};

function sanitizeToken(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Step 1) Backend Raw -> BackendStatus
 * - READY와 MATCHED를 반드시 분리 인식(READY 우선)
 */
function normalizeStatus(raw?: string | null): BackendStatus {
  if (!raw) return "UNKNOWN";

  const v = sanitizeToken(raw);
  if (!v) return "UNKNOWN";

  if (v.includes("CANCEL")) return "CANCELLED";

  if (v.includes("DELIVER")) return "DELIVERED";
  if (v === "COMPLETED" || v.includes("COMPLETE")) return "COMPLETED";

  if (v.includes("IN_TRANSIT") || v.includes("INTRANSIT")) return "IN_TRANSIT";
  if (v.includes("TRANSIT") && (v.includes("IN") || v.startsWith("IN_"))) return "IN_TRANSIT";

  // READY 우선 처리(READY가 MATCHED로 뭉개지는 문제 방지)
  if (v.includes("READY")) return "READY";

  if (v.includes("MATCH")) return "MATCHED";
  if (v.includes("OPEN") || v.includes("REQUEST")) return "OPEN";

  return "UNKNOWN";
}

/**
 * Step 2) BackendStatus -> CustomerUiState
 */
function mapBackendStatusToCustomerUiState(status: BackendStatus): CustomerUiState {
  switch (status) {
    case "OPEN":
      return "REQUESTED";
    case "MATCHED":
      return "PICKUP_IN_PROGRESS";
    case "READY":
      return "PAYMENT_REQUIRED";
    case "IN_TRANSIT":
      return "TRANSIT_IN_PROGRESS";
    case "DELIVERED":
    case "COMPLETED":
      return "COMPLETED";
    case "CANCELLED":
      return "CANCELED";
    default:
      return "UNKNOWN";
  }
}

function getCustomerStatusBadgeLabel(uiState: CustomerUiState): string {
  switch (uiState) {
    case "REQUESTED":
      return "요청됨";
    case "PICKUP_IN_PROGRESS":
      return "배차완료";
    case "PAYMENT_REQUIRED":
      return "결제대기";
    case "TRANSIT_IN_PROGRESS":
      return "운송중";
    case "COMPLETED":
      return "완료";
    case "CANCELED":
      return "취소";
    default:
      return "상태확인";
  }
}

function getCustomerStatusTitle(uiState: CustomerUiState): string {
  switch (uiState) {
    case "REQUESTED":
      return "기사 배정을 기다리고 있습니다";
    case "PICKUP_IN_PROGRESS":
      return "기사님이 상차지로 이동하고 있습니다";
    case "PAYMENT_REQUIRED":
      return "결제를 진행하면 운송이 시작됩니다";
    case "TRANSIT_IN_PROGRESS":
      return "상차를 완료하고 목적지로 이동하고 있습니다";
    case "COMPLETED":
      return "운송이 완료되었습니다";
    case "CANCELED":
      return "요청이 취소되었습니다";
    default:
      return "상태를 확인하고 있습니다";
  }
}

function getCustomerCta(uiState: CustomerUiState): CustomerCtaConfig | null {
  switch (uiState) {
    case "PAYMENT_REQUIRED":
      return { id: "PAY", label: "즉시 결제하기", variant: "primary", enabled: true };
    case "TRANSIT_IN_PROGRESS":
      return { id: "TRACK", label: "실시간 위치 확인", variant: "secondary", enabled: true };
    case "COMPLETED":
      return { id: "RECEIPT", label: "인수증 확인", variant: "secondary", enabled: true };
    case "CANCELED":
      return { id: "RE_REQUEST", label: "다시 요청", variant: "primary", enabled: true };
    default:
      return null;
  }
}

function stopEvent(e?: GestureResponderEvent) {
  e?.stopPropagation?.();
}

type BadgeTokens = { bg: string; border: string; text: string };

function getBadgeTokens(theme: ReturnType<typeof useAppTheme>, uiState: CustomerUiState): BadgeTokens {
  switch (uiState) {
    case "PAYMENT_REQUIRED":
      return { bg: theme.colors.stateOverlayPressed, border: theme.colors.brandPrimary, text: theme.colors.brandPrimary };
    case "PICKUP_IN_PROGRESS":
    case "TRANSIT_IN_PROGRESS":
      return { bg: theme.colors.stateOverlayPressed, border: theme.colors.borderDefault, text: theme.colors.brandPrimary };
    case "COMPLETED":
      return { bg: theme.colors.bgSurface, border: theme.colors.borderStrong, text: theme.colors.textMain };
    case "CANCELED":
      return { bg: theme.colors.bgSurface, border: theme.colors.borderDefault, text: theme.colors.textMuted };
    case "REQUESTED":
    default:
      return { bg: theme.colors.bgSurface, border: theme.colors.borderDefault, text: theme.colors.textMuted };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export type UsageHistoryCardProps = {
  item: ParsedUsageHistoryItem;
};

export function UsageHistoryCard({ item }: UsageHistoryCardProps) {
  const theme = useAppTheme();
  const styles = useCardStyles();

  const { backendStatus, uiState, badgeLabel, statusTitle, cta, badgeTokens } = useMemo(() => {
    const backendStatus = normalizeStatus(item.status);
    const uiState = mapBackendStatusToCustomerUiState(backendStatus);
    return {
      backendStatus,
      uiState,
      badgeLabel: getCustomerStatusBadgeLabel(uiState),
      statusTitle: getCustomerStatusTitle(uiState),
      cta: getCustomerCta(uiState),
      badgeTokens: getBadgeTokens(theme, uiState),
    };
  }, [item.status, theme]);

  const handlePress = useCallback(() => {
    router.push(
      {
        pathname: "/(shipper)/quotes/[id]",
        params: { id: String(item.quoteId), status: item.status },
      } as any
    );
  }, [item.quoteId, item.status]);

  const handleCtaPress = useCallback(
    (e?: GestureResponderEvent) => {
      stopEvent(e);

      if (!cta?.enabled) return;

      // 상세 페이지가 action 파라미터를 활용할 수 있게 전달(서버 연동/확장 대비)
      router.push(
        {
          pathname: "/(shipper)/quotes/[id]",
          params: {
            id: String(item.quoteId),
            status: item.status,
            action: cta.id,
            matchId: item.matchId ? String(item.matchId) : undefined,
            backendStatus,
            uiState,
          },
        } as any
      );
    },
    [backendStatus, cta, item.matchId, item.quoteId, item.status, uiState]
  );

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      android_ripple={{ color: theme.colors.stateOverlayPressed, borderless: false }}
    >
      {/* ── Top row: Status badge ← → Date ── */}
      <View style={styles.topRow}>
        <View style={[styles.statusBadge, { backgroundColor: badgeTokens.bg, borderColor: badgeTokens.border }]}>
          <AppText variant="caption" weight="600" style={{ color: badgeTokens.text }}>
            {badgeLabel}
          </AppText>
        </View>
        <AppText variant="caption" color="textMuted">
          {item.dateText}
        </AppText>
      </View>

      {/* ── Status microcopy ── */}
      <AppText variant="detail" weight="500" color="textSub" numberOfLines={1} style={styles.statusTitle}>
        {statusTitle}
      </AppText>

      {/* ── Route: Origin ↕ Destination ── */}
      <View style={styles.routeSection}>
        {/* Origin */}
        <View style={styles.routeRow}>
          <View style={styles.dotCol}>
            <View style={[styles.dot, { backgroundColor: theme.colors.brandPrimary }]} />
            <View style={[styles.connectorLine, { backgroundColor: theme.colors.borderStrong }]} />
          </View>
          <AppText variant="body" weight="500" color="textMain" numberOfLines={1} style={styles.routeLabel}>
            {item.originAddress}
          </AppText>
        </View>

        {/* Destination */}
        <View style={styles.routeRow}>
          <View style={styles.dotCol}>
            <View style={[styles.dot, { backgroundColor: theme.colors.textMuted }]} />
          </View>
          <AppText variant="body" weight="500" color="textSub" numberOfLines={1} style={styles.routeLabel}>
            {item.destinationAddress}
          </AppText>
        </View>
      </View>

      {/* ── Divider ── */}
      <View style={[styles.divider, { backgroundColor: theme.colors.borderDefault }]} />

      {/* ── Bottom row: Vehicle ← → Price ── */}
      <View style={styles.bottomRow}>
        <AppText variant="detail" color="textMuted">
          {item.vehicleText}
        </AppText>
        <AppText variant="body" weight="800" color="brandPrimary">
          {item.priceText}
        </AppText>
      </View>

      {/* ── CTA (conditional) ── */}
      {cta?.enabled ? (
        <View style={styles.ctaWrap}>
          <Pressable
            onPressIn={stopEvent}
            onPress={handleCtaPress}
            style={({ pressed }) => [
              styles.ctaButton,
              cta.variant === "primary" ? styles.ctaPrimary : styles.ctaSecondary,
              pressed && styles.ctaPressed,
            ]}
            android_ripple={{ color: theme.colors.stateOverlayPressed, borderless: false }}
          >
            <AppText
              variant="body"
              weight="700"
              style={{
                color: cta.variant === "primary" ? theme.colors.bgSurface : theme.colors.brandPrimary,
              }}
            >
              {cta.label}
            </AppText>
          </Pressable>
        </View>
      ) : null}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const useCardStyles = createThemedStyles((theme) => ({
  card: {
    backgroundColor: theme.colors.bgSurface,
    borderRadius: theme.layout.radii.card,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    // iOS shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    // Android elevation
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.88,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.layout.radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusTitle: {
    marginBottom: 14,
  },
  routeSection: {
    marginBottom: 16,
    gap: 0,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  dotCol: {
    width: 8,
    alignItems: "center",
    paddingTop: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectorLine: {
    width: 1.5,
    height: 20,
    marginTop: 4,
  },
  routeLabel: {
    flex: 1,
    paddingBottom: 18,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 14,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ctaWrap: {
    marginTop: 14,
  },
  ctaButton: {
    borderRadius: theme.layout.radii.pill,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  ctaPrimary: {
    backgroundColor: theme.colors.brandPrimary,
    borderColor: theme.colors.brandPrimary,
  },
  ctaSecondary: {
    backgroundColor: theme.colors.bgSurface,
    borderColor: theme.colors.brandPrimary,
  },
  ctaPressed: {
    opacity: 0.9,
  },
}));