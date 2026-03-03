import React from "react";
import { StyleSheet, View } from "react-native";

import type { DriverMatchItem } from "@/features/matching/api";
import type { QuoteDetailResponse } from "@/entities/quote/model/quote.types";
import { getDriverBadge, getDriverStatusTitle } from "@/shared/lib/policy";
import { type DriverUiState } from "@/shared/lib/policy/types";
import { formatDateTime, formatDistance, formatKrw } from "@/shared/lib/format/display";
import { safeNumber, safeString, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles } from "@/shared/theme/useAppTheme";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppText } from "@/shared/ui/kit/AppText";

type Props = {
  match: DriverMatchItem | null;
  quote: QuoteDetailResponse | null;
  uiState: DriverUiState;
};

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const cSurface = safeString(theme?.colors?.bgSurface, "#FFFFFF");
  const cBorder = safeString(theme?.colors?.borderDefault, "#E2E8F0");
  const cTextMain = safeString(theme?.colors?.textMain, "#111827");
  const cTextMuted = safeString(theme?.colors?.textMuted, "#64748B");
  const cPrimary = safeString(theme?.colors?.brandPrimary, "#FF6A00");

  const captionSize = safeNumber(theme?.typography?.scale?.caption?.size, 12);
  const captionLine = safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16);
  const detailSize = safeNumber(theme?.typography?.scale?.detail?.size, 14);
  const detailLine = safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20);
  const headingSize = safeNumber(theme?.typography?.scale?.heading?.size, 18);
  const headingLine = safeNumber(theme?.typography?.scale?.heading?.lineHeight, 26);
  const displaySize = safeNumber(theme?.typography?.scale?.display?.size, 28);
  const displayLine = safeNumber(theme?.typography?.scale?.display?.lineHeight, 36);

  return StyleSheet.create({
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing * 2,
    },
    badge: {
      borderRadius: 999,
      paddingHorizontal: spacing * 3,
      paddingVertical: spacing + 2,
      borderWidth: 1,
      borderColor: tint(cPrimary, 0.3, cBorder),
      backgroundColor: tint(cPrimary, 0.08, cSurface),
    },
    badgeText: {
      color: cPrimary,
      fontSize: captionSize + 1,
      lineHeight: captionLine + 1,
      fontWeight: "900",
    },
    requestedAt: {
      color: cTextMuted,
      fontSize: captionSize + 1,
      lineHeight: captionLine + 1,
      fontWeight: "700",
    },
    stateTitle: {
      color: cTextMain,
      fontSize: headingSize,
      lineHeight: headingLine,
      fontWeight: "900",
      marginBottom: spacing * 2,
    },
    summaryCard: {
      padding: spacing * 4,
      gap: spacing * 3,
    },
    summaryRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: spacing * 2,
    },
    priceWrap: {
      flex: 1,
      gap: 4,
    },
    priceLabel: {
      color: cTextMuted,
      fontSize: detailSize,
      lineHeight: detailLine,
      fontWeight: "700",
    },
    price: {
      color: cTextMain,
      fontSize: displaySize,
      lineHeight: displayLine,
      fontWeight: "900",
      letterSpacing: -0.4,
    },
    distanceChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: tint(cPrimary, 0.3, cBorder),
      backgroundColor: tint(cPrimary, 0.08, cSurface),
      paddingHorizontal: spacing * 3,
      paddingVertical: spacing + 2,
      alignItems: "center",
      justifyContent: "center",
    },
    distanceChipText: {
      color: cPrimary,
      fontSize: detailSize,
      lineHeight: detailLine,
      fontWeight: "900",
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: cBorder,
    },
    timelineItem: {
      flexDirection: "row",
      alignItems: "stretch",
      gap: spacing * 2,
    },
    timelineRail: {
      width: 18,
      alignItems: "center",
    },
    timelineDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginTop: 7,
      backgroundColor: cPrimary,
    },
    timelineLine: {
      width: 2,
      flex: 1,
      marginTop: 4,
      backgroundColor: cBorder,
    },
    timelineBody: {
      flex: 1,
      gap: 4,
      paddingBottom: spacing * 2,
    },
    timelineLabel: {
      color: cTextMuted,
      fontSize: captionSize + 1,
      lineHeight: captionLine + 1,
      fontWeight: "800",
    },
    timelineAddress: {
      color: cTextMain,
      fontSize: detailSize + 1,
      lineHeight: detailLine + 1,
      fontWeight: "900",
    },
  });
});

function resolvePrice(quote: QuoteDetailResponse | null): number {
  if (!quote) return 0;
  const final = Number(quote.finalPrice);
  const desired = Number(quote.desiredPrice);
  if (Number.isFinite(final) && final > 0) return final;
  if (Number.isFinite(desired) && desired > 0) return desired;
  return 0;
}

function toDisplayText(value: unknown, fallback = "-"): string {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
}

export function DriverOrderDetailHeader({ match, quote, uiState }: Props) {
  const styles = useStyles();
  const badge = getDriverBadge(uiState);
  const stateTitle = getDriverStatusTitle(uiState);
  const requestedAt = formatDateTime(match?.createdAt);
  const price = resolvePrice(quote);
  const distanceText = formatDistance(quote?.distanceKm);

  return (
    <View>
      <View style={styles.statusRow}>
        <View style={styles.badge}>
          <AppText style={styles.badgeText}>{badge.label}</AppText>
        </View>
        {requestedAt ? (
          <AppText style={styles.requestedAt}>{`요청 ${requestedAt}`}</AppText>
        ) : null}
      </View>

      <AppText style={styles.stateTitle}>{stateTitle}</AppText>

      <AppCard outlined style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.priceWrap}>
            <AppText style={styles.priceLabel}>제안 운임</AppText>
            <AppText style={styles.price}>{formatKrw(price)}</AppText>
          </View>
          {distanceText ? (
            <View style={styles.distanceChip}>
              <AppText style={styles.distanceChipText}>{distanceText}</AppText>
            </View>
          ) : null}
        </View>

        <View style={styles.divider} />

        <View style={styles.timelineItem}>
          <View style={styles.timelineRail}>
            <View style={styles.timelineDot} />
            <View style={styles.timelineLine} />
          </View>
          <View style={styles.timelineBody}>
            <AppText style={styles.timelineLabel}>출발지</AppText>
            <AppText style={styles.timelineAddress}>
              {toDisplayText(quote?.originAddress)}
            </AppText>
          </View>
        </View>

        <View style={styles.timelineItem}>
          <View style={styles.timelineRail}>
            <View style={styles.timelineDot} />
          </View>
          <View style={styles.timelineBody}>
            <AppText style={styles.timelineLabel}>도착지</AppText>
            <AppText style={styles.timelineAddress}>
              {toDisplayText(quote?.destinationAddress)}
            </AppText>
          </View>
        </View>
      </AppCard>
    </View>
  );
}
