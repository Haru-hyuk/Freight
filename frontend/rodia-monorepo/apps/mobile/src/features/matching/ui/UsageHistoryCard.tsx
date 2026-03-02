import React, { useCallback, useMemo } from "react";
import { Pressable, StyleSheet, View, type GestureResponderEvent } from "react-native";
import { router } from "expo-router";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppText } from "@/shared/ui/kit/AppText";
import {
  getCustomerCta,
  getCustomerStatusBadgeLabel,
  getCustomerStatusTitle,
  type BackendStatus,
  type CustomerUiState,
} from "../api/usage-history-mapper";

// ---------------------------------------------------------------------------
// Data contract — mirrors what shipper-match-parser's ACL layer provides.
// ---------------------------------------------------------------------------
export type ParsedUsageHistoryItem = {
  id: string;
  quoteId: number;
  matchId?: number;
  status: string;
  backendStatus: BackendStatus;
  uiState: CustomerUiState;
  statusTone: "primary" | "secondary" | "destructive" | "accent" | "neutral"; // 위젯 필터링
  originAddress: string;
  destinationAddress: string;
  priceText: string; // pre-formatted by formatKrw
  vehicleText: string;
  dateText: string; // pre-formatted by formatDateTime
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export type UsageHistoryCardProps = {
  item: ParsedUsageHistoryItem;
};

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

export function UsageHistoryCard({ item }: UsageHistoryCardProps) {
  const theme = useAppTheme();
  const styles = useCardStyles();

  const { uiState, badgeLabel, statusTitle, cta, badgeTokens } = useMemo(() => {
    const uiState = item.uiState;
    const badgeLabel = getCustomerStatusBadgeLabel(uiState);
    const statusTitle = getCustomerStatusTitle(uiState);
    const cta = getCustomerCta(uiState);
    const badgeTokens = getBadgeTokens(theme, uiState);
    return { uiState, badgeLabel, statusTitle, cta, badgeTokens };
  }, [item.uiState, theme]);

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

      router.push(
        {
          pathname: "/(shipper)/quotes/[id]",
          params: {
            id: String(item.quoteId),
            status: item.status,
            action: cta.id,
            matchId: item.matchId ? String(item.matchId) : undefined,
            backendStatus: item.backendStatus,
            uiState,
          },
        } as any
      );
    },
    [cta, item.backendStatus, item.matchId, item.quoteId, item.status, uiState]
  );

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      android_ripple={{ color: theme.colors.stateOverlayPressed, borderless: false }}
    >
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

      <AppText variant="detail" weight="500" color="textSub" numberOfLines={1} style={styles.statusTitle}>
        {statusTitle}
      </AppText>

      <View style={styles.routeSection}>
        <View style={styles.routeRow}>
          <View style={styles.dotCol}>
            <View style={[styles.dot, { backgroundColor: theme.colors.brandPrimary }]} />
            <View style={[styles.connectorLine, { backgroundColor: theme.colors.borderStrong }]} />
          </View>
          <AppText variant="body" weight="500" color="textMain" numberOfLines={1} style={styles.routeLabel}>
            {item.originAddress}
          </AppText>
        </View>

        <View style={styles.routeRow}>
          <View style={styles.dotCol}>
            <View style={[styles.dot, { backgroundColor: theme.colors.textMuted }]} />
          </View>
          <AppText variant="body" weight="500" color="textSub" numberOfLines={1} style={styles.routeLabel}>
            {item.destinationAddress}
          </AppText>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.colors.borderDefault }]} />

      <View style={styles.bottomRow}>
        <AppText variant="detail" color="textMuted">
          {item.vehicleText}
        </AppText>
        <AppText variant="body" weight="800" color="brandPrimary">
          {item.priceText}
        </AppText>
      </View>

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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
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
