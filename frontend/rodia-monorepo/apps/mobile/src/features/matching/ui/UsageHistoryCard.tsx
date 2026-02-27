import React, { useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppText } from "@/shared/ui/kit/AppText";
import type { AppThemeColors } from "@/shared/theme/types";

// ---------------------------------------------------------------------------
// Data contract — mirrors what shipper-match-parser's ACL layer provides.
// ---------------------------------------------------------------------------
export type ParsedUsageHistoryItem = {
  id: string;
  quoteId: number;
  matchId?: number;
  statusTone: "primary" | "secondary" | "neutral" | "destructive" | "accent";
  statusLabel: string;
  originAddress: string;
  destinationAddress: string;
  priceText: string; // pre-formatted by formatKrw
  vehicleText: string;
  dateText: string; // pre-formatted by formatDateTime
};

// ---------------------------------------------------------------------------
// Badge color resolution — no hardcoded hex; built from theme tokens.
// ---------------------------------------------------------------------------
type BadgeColors = { bg: string; text: string };

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.trim().replace(/^#/, "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return hex;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function resolveBadgeColors(colors: AppThemeColors, tone: ParsedUsageHistoryItem["statusTone"]): BadgeColors {
  switch (tone) {
    case "primary":
      return { bg: hexToRgba(colors.brandPrimary, 0.12), text: colors.brandPrimary };
    case "accent":
      return { bg: hexToRgba(colors.brandAccent, 0.14), text: colors.semanticSuccess };
    case "secondary":
      return { bg: hexToRgba(colors.brandSecondary, 0.07), text: colors.brandSecondary };
    case "destructive":
      return { bg: hexToRgba(colors.semanticDanger, 0.12), text: colors.semanticDanger };
    case "neutral":
    default:
      return { bg: colors.bgSurfaceAlt, text: colors.textMuted };
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
  const badge = resolveBadgeColors(theme.colors, item.statusTone);

  const handlePress = useCallback(() => {
    router.push(`/(shipper)/quotes/${item.quoteId}` as any);
  }, [item.quoteId]);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      android_ripple={{ color: theme.colors.stateOverlayPressed, borderless: false }}
    >
      {/* ── Top row: Status badge ← → Date ── */}
      <View style={styles.topRow}>
        <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
          <AppText variant="caption" weight="600" style={{ color: badge.text }}>
            {item.statusLabel}
          </AppText>
        </View>
        <AppText variant="caption" color="textMuted">
          {item.dateText}
        </AppText>
      </View>

      {/* ── Route: Origin ↕ Destination ── */}
      <View style={styles.routeSection}>
        {/* Origin */}
        <View style={styles.routeRow}>
          <View style={styles.dotCol}>
            <View style={[styles.dot, { backgroundColor: theme.colors.brandPrimary }]} />
            <View style={[styles.connectorLine, { backgroundColor: theme.colors.borderStrong }]} />
          </View>
          <AppText
            variant="body"
            weight="500"
            color="textMain"
            numberOfLines={1}
            style={styles.routeLabel}
          >
            {item.originAddress}
          </AppText>
        </View>

        {/* Destination */}
        <View style={styles.routeRow}>
          <View style={styles.dotCol}>
            <View style={[styles.dot, { backgroundColor: theme.colors.textMuted }]} />
          </View>
          <AppText
            variant="body"
            weight="500"
            color="textSub"
            numberOfLines={1}
            style={styles.routeLabel}
          >
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
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.layout.radii.pill,
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
    paddingTop: 5, // vertically align dot with first text line
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
    paddingBottom: 18, // breathing room between origin and destination rows
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
}));
