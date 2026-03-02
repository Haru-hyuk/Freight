import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import type { QuoteListItem, QuoteStatusApi } from "@/entities/quote/model/quote.types";
import { listShipperQuotes } from "@/features/quote/api";
import { listMyShipperMatches, type ShipperMatchItem } from "@/features/matching/api";
import {
  getQuoteActionPolicy,
  resolveTonePalette,
  type QuoteActionPolicy,
  type QuoteTonePaletteKey,
} from "@/features/quote/model/quoteActionMatrix";
import { formatDateTime, formatDistance, formatKrw } from "@/shared/lib/format/display";
import { BACKEND_STATUS, CUSTOMER_UI_STATE, getCustomerUiStateFromBackendStatus, normalizeStatus, type CustomerUiState } from "@/shared/lib/policy";
import { safeNumber, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppEmptyState } from "@/shared/ui/kit/AppEmptyState";
import { AppErrorState } from "@/shared/ui/kit/AppErrorState";
import { AppSpinner } from "@/shared/ui/kit/AppSpinner";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";
import { RequestQuoteFab } from "@/widgets/shipper/RequestQuoteFab";

type QuoteListTab = "ALL" | "IN_PROGRESS" | "COMPLETED" | "CANCELED";
type QuoteListSort = "LATEST" | "PRICE";

type QuoteListViewItem = {
  quote: QuoteListItem;
  uiState: CustomerUiState;
  policy: QuoteActionPolicy;
  statusLabel: string;
  ctaText: string;
  isPriceCta: boolean;
  priceText: string;
  createdAtLabel: string;
  cargoText: string;
  priceValue: number;
  recencyValue: number;
};

type QuoteListResult = {
  inProgressList: QuoteListViewItem[];
  completedList: QuoteListViewItem[];
  canceledList: QuoteListViewItem[];
  filteredList: QuoteListViewItem[];
  counts: {
    all: number;
    inProgress: number;
    completed: number;
    canceled: number;
  };
};

type ToneStyleGroup = {
  badge: object;
  badgeText: object;
  ctaText: object;
  ctaChip: object;
  ctaIcon: object;
};

type SectionHeaderProps = {
  iconName: keyof typeof Ionicons.glyphMap;
  title: string;
  count: number;
  tone: QuoteTonePaletteKey;
};

type QuoteListCardProps = {
  item: QuoteListViewItem;
  onPress: (quoteId: number, quotePublicId: string | undefined, status: QuoteStatusApi) => void;
};

type QuoteListSectionProps = {
  title: string;
  iconName: keyof typeof Ionicons.glyphMap;
  tone: QuoteTonePaletteKey;
  items: QuoteListViewItem[];
  onPressCard: QuoteListCardProps["onPress"];
};

const COMPLETED_UI_STATES = new Set<CustomerUiState>([CUSTOMER_UI_STATE.COMPLETED]);
const CANCELED_UI_STATES = new Set<CustomerUiState>([CUSTOMER_UI_STATE.CANCELED]);

const TAB_OPTIONS: Array<{ key: QuoteListTab; label: string }> = [
  { key: "ALL", label: "전체" },
  { key: "IN_PROGRESS", label: "진행중" },
  { key: "COMPLETED", label: "완료됨" },
  { key: "CANCELED", label: "취소됨" },
];

const SORT_OPTIONS: Array<{ key: QuoteListSort; label: string }> = [
  { key: "LATEST", label: "최신순" },
  { key: "PRICE", label: "금액순" },
];
const FOCUS_REFETCH_THROTTLE_MS = 1500;

const STATUS_PROMOTION_SOURCE_STATES: ReadonlySet<string> = new Set([
  BACKEND_STATUS.READY,
  BACKEND_STATUS.OPEN,
  BACKEND_STATUS.UNKNOWN,
]);

const STATUS_PROMOTION_TARGET_STATES: ReadonlySet<string> = new Set([
  BACKEND_STATUS.MATCHED,
  BACKEND_STATUS.IN_TRANSIT,
  BACKEND_STATUS.DELIVERED,
  BACKEND_STATUS.READY,
  BACKEND_STATUS.COMPLETED,
  BACKEND_STATUS.CANCELLED,
]);

function normalizeMatchStatus(value: unknown): string {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const normalized = normalizeStatus(text);
  return normalized === BACKEND_STATUS.UNKNOWN ? "" : normalized;
}

function resolveEffectiveQuoteStatus(quoteStatus: unknown, matchStatus: unknown): string {
  const quoteText = String(quoteStatus ?? "").trim();
  const quoteNormalized = normalizeStatus(quoteText);
  const normalizedMatchStatus = normalizeMatchStatus(matchStatus);
  if (!normalizedMatchStatus) return quoteText;

  if (STATUS_PROMOTION_SOURCE_STATES.has(quoteNormalized) && STATUS_PROMOTION_TARGET_STATES.has(normalizedMatchStatus)) {
    return normalizedMatchStatus;
  }

  return quoteText || normalizedMatchStatus;
}


const useStyles = createThemedStyles((theme) => {
  const c = theme.colors;
  const spacing = safeNumber(theme.layout.spacing.base, 4);
  const controlRadius = safeNumber(theme.layout.radii.control, 10);
  const radiusCard = safeNumber(theme.layout.radii.card, 16);

  return StyleSheet.create({
    pageContent: {
      paddingTop: 0,
      paddingHorizontal: 0,
      paddingBottom: spacing * 26,
      backgroundColor: c.bgMain,
    },
    tabContainer: {
      flexDirection: "row",
      backgroundColor: c.bgMain,
      borderBottomWidth: 1,
      borderBottomColor: tint(c.textMain, 0.05, c.borderDefault),
    },
    tabButton: {
      minHeight: 44,
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing * 2,
      position: "relative",
    },
    tabText: {
      color: c.textMuted,
      fontSize: safeNumber(theme.typography.scale.detail.size, 14) + 1,
      lineHeight: safeNumber(theme.typography.scale.detail.lineHeight, 20),
      fontWeight: "700",
    },
    tabTextActive: {
      color: c.textMain,
      fontWeight: "900",
    },
    tabIndicator: {
      position: "absolute",
      bottom: -1,
      left: "25%",
      width: "50%",
      height: 3,
      borderRadius: 2,
      backgroundColor: c.textMain,
    },
    tabCountText: {
      color: c.textMuted,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
      marginTop: spacing / 2,
    },

    controlRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      paddingHorizontal: spacing * 5,
      paddingTop: spacing * 3,
      paddingBottom: spacing * 2,
    },

    sortSegment: {
      minHeight: 36,
      borderRadius: controlRadius,
      borderWidth: 1,
      borderColor: c.borderDefault,
      backgroundColor: c.bgSurface,
      flexDirection: "row",
      overflow: "hidden",
      alignSelf: "flex-end",
    },
    sortButtonBase: {
      minWidth: 62,
      minHeight: 36,
      paddingHorizontal: spacing * 2,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: spacing / 2,
    },
    sortButtonActive: {
      backgroundColor: tint(c.textMain, 0.06, c.bgSurfaceAlt),
    },
    sortButtonText: {
      color: c.textSub,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
    },
    sortButtonTextActive: {
      color: c.textMain,
      fontWeight: "900",
    },
    sortIcon: {
      color: c.textSub,
      fontSize: 12,
    },
    sortIconActive: {
      color: c.textMain,
    },

    listContainer: {
      paddingHorizontal: spacing * 5,
      paddingTop: spacing * 2,
    },
    section: {
      marginBottom: spacing * 7,
    },
    sectionHead: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing * 3,
    },
    sectionLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing + 2,
      flex: 1,
    },
    sectionIconChipBase: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    sectionIcon: {
      fontSize: 14,
    },
    sectionTitle: {
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.heading.size, 18),
      lineHeight: safeNumber(theme.typography.scale.heading.lineHeight, 24),
      fontWeight: "900",
      letterSpacing: -0.3,
    },
    sectionCount: {
      color: c.textMuted,
      fontSize: safeNumber(theme.typography.scale.detail.size, 14),
      lineHeight: safeNumber(theme.typography.scale.detail.lineHeight, 20),
      fontWeight: "700",
    },
    cardWrapper: {
      marginBottom: spacing * 3,
    },

    toneAttentionChip: {
      backgroundColor: tint(c.brandPrimary, 0.1, c.bgSurfaceAlt),
      borderColor: tint(c.brandPrimary, 0.24, c.borderDefault),
    },
    toneAttentionIcon: { color: c.brandPrimary },

    toneProgressChip: {
      backgroundColor: tint(c.brandAccent, 0.14, c.bgSurfaceAlt),
      borderColor: tint(c.brandAccent, 0.3, c.borderDefault),
    },
    toneProgressIcon: { color: c.brandAccent },

    toneClosedChip: {
      backgroundColor: tint(c.textMain, 0.05, c.bgSurfaceAlt),
      borderColor: tint(c.textMain, 0.14, c.borderDefault),
    },
    toneClosedIcon: { color: c.textSub },

    pressable: {
      borderRadius: radiusCard,
      overflow: "hidden",
    },
    pressed: {
      opacity: 0.72,
    },
    closedCard: {
      opacity: 0.78,
    },
    cardInner: {
      padding: spacing * 4,
    },

    topRow: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing * 2,
      gap: spacing * 2,
    },
    badgeBase: {
      borderWidth: 1,
      borderRadius: safeNumber(theme.layout.radii.control, 10),
      paddingHorizontal: spacing * 2,
      paddingVertical: spacing,
    },
    badgeTextBase: {
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "800",
      letterSpacing: -0.2,
    },
    dateWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing,
      flexShrink: 1,
    },
    dateIcon: {
      color: c.textMuted,
      fontSize: 13,
    },
    dateText: {
      color: c.textMuted,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
      flexShrink: 1,
    },

    routeRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing,
      gap: spacing + 2,
    },
    routeText: {
      flex: 1,
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.detail.size, 14) + 1,
      lineHeight: safeNumber(theme.typography.scale.detail.lineHeight, 20) + 1,
      fontWeight: "900",
      letterSpacing: -0.2,
    },
    routeArrow: {
      color: c.borderStrong,
      fontSize: 14,
    },

    bottomRow: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing * 2,
      marginTop: spacing,
    },
    cargoWrap: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing,
      paddingRight: spacing,
    },
    cargoIcon: {
      color: c.textSub,
      fontSize: 14,
    },
    cargoText: {
      flex: 1,
      color: c.textSub,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12) + 1,
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16) + 2,
      fontWeight: "700",
    },
    ctaWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing,
      flexShrink: 0,
    },
    ctaTextBase: {
      fontSize: safeNumber(theme.typography.scale.detail.size, 14),
      lineHeight: safeNumber(theme.typography.scale.detail.lineHeight, 20),
      fontWeight: "900",
      letterSpacing: -0.2,
    },
    ctaChipBase: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    ctaIconBase: {
      fontSize: 13,
    },
    priceText: {
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.heading.size, 18),
      lineHeight: safeNumber(theme.typography.scale.heading.lineHeight, 24),
      fontWeight: "900",
      letterSpacing: -0.4,
    },

    badgeAttention: {
      backgroundColor: tint(c.brandPrimary, 0.1, c.bgSurfaceAlt),
      borderColor: tint(c.brandPrimary, 0.24, c.borderDefault),
    },
    badgeProgress: {
      backgroundColor: tint(c.brandAccent, 0.14, c.bgSurfaceAlt),
      borderColor: tint(c.brandAccent, 0.3, c.borderDefault),
    },
    badgeClosed: {
      backgroundColor: tint(c.textMain, 0.05, c.bgSurfaceAlt),
      borderColor: tint(c.textMain, 0.14, c.borderDefault),
    },
    badgeNeutral: {
      backgroundColor: tint(c.semanticInfo, 0.08, c.bgSurfaceAlt),
      borderColor: tint(c.semanticInfo, 0.2, c.borderDefault),
    },

    badgeTextAttention: { color: c.brandPrimary },
    badgeTextProgress: { color: c.brandAccent },
    badgeTextClosed: { color: c.textSub },
    badgeTextNeutral: { color: c.semanticInfo },

    ctaTextAttention: { color: c.brandPrimary },
    ctaTextProgress: { color: c.textMain },
    ctaTextClosed: { color: c.textSub },
    ctaTextNeutral: { color: c.textMain },

    ctaChipAttention: {
      backgroundColor: tint(c.brandPrimary, 0.1, c.bgSurface),
      borderColor: tint(c.brandPrimary, 0.2, c.borderDefault),
    },
    ctaChipProgress: {
      backgroundColor: tint(c.brandAccent, 0.1, c.bgSurface),
      borderColor: tint(c.brandAccent, 0.22, c.borderDefault),
    },
    ctaChipClosed: {
      backgroundColor: tint(c.textMain, 0.04, c.bgSurface),
      borderColor: tint(c.textMain, 0.12, c.borderDefault),
    },
    ctaChipNeutral: {
      backgroundColor: tint(c.semanticInfo, 0.08, c.bgSurface),
      borderColor: tint(c.semanticInfo, 0.18, c.borderDefault),
    },

    ctaIconAttention: { color: c.brandPrimary },
    ctaIconProgress: { color: c.brandAccent },
    ctaIconClosed: { color: c.textSub },
    ctaIconNeutral: { color: c.semanticInfo },
  });
});

function toSafeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toDateValue(iso: string): number {
  const value = new Date(iso).getTime();
  return Number.isFinite(value) ? value : 0;
}

function getPriceValue(quote: QuoteListItem): number {
  const finalPrice = toSafeNumber(quote.finalPrice);
  const desiredPrice = toSafeNumber(quote.desiredPrice);
  return finalPrice > 0 ? finalPrice : desiredPrice;
}

function toViewItem(quote: QuoteListItem): QuoteListViewItem {
  const uiState = getCustomerUiStateFromBackendStatus(quote.status);
  const policy = getQuoteActionPolicy(quote.status);
  const priceValue = getPriceValue(quote);

  return {
    quote,
    uiState,
    policy,
    statusLabel: policy.badgeLabel,
    ctaText: policy.ctaLabel,
    isPriceCta: policy.listCtaKind === "price",
    priceText: formatKrw(priceValue, "0원"),
    createdAtLabel: formatDateTime(quote.createdAt, "시간 정보 없음"),
    cargoText: `${quote.vehicleType} ${quote.vehicleBodyType} · ${quote.cargoName}`,
    priceValue,
    recencyValue: toDateValue(quote.createdAt),
  };
}

function isCompletedUiState(uiState: CustomerUiState): boolean {
  return COMPLETED_UI_STATES.has(uiState);
}

function isCanceledUiState(uiState: CustomerUiState): boolean {
  return CANCELED_UI_STATES.has(uiState);
}

function sortLatest(a: QuoteListViewItem, b: QuoteListViewItem): number {
  return b.recencyValue - a.recencyValue;
}

function sortPrice(a: QuoteListViewItem, b: QuoteListViewItem): number {
  if (b.priceValue !== a.priceValue) return b.priceValue - a.priceValue;
  return b.recencyValue - a.recencyValue;
}

function sortInProgressLatest(a: QuoteListViewItem, b: QuoteListViewItem): number {
  if (a.policy.stageOrder !== b.policy.stageOrder) return a.policy.stageOrder - b.policy.stageOrder;
  return sortLatest(a, b);
}

function sortInProgressPrice(a: QuoteListViewItem, b: QuoteListViewItem): number {
  if (a.policy.stageOrder !== b.policy.stageOrder) return a.policy.stageOrder - b.policy.stageOrder;
  return sortPrice(a, b);
}

function useQuoteList(quotes: QuoteListItem[], activeTab: QuoteListTab, activeSort: QuoteListSort): QuoteListResult {
  const allItems = useMemo(() => quotes.map(toViewItem), [quotes]);

  const groupedSorted = useMemo(() => {
    const inProgress = allItems.filter(
      (item) => !isCompletedUiState(item.uiState) && !isCanceledUiState(item.uiState)
    );
    const completed = allItems.filter((item) => isCompletedUiState(item.uiState));
    const canceled = allItems.filter((item) => isCanceledUiState(item.uiState));

    if (activeSort === "PRICE") {
      return {
        inProgressList: [...inProgress].sort(sortInProgressPrice),
        completedList: [...completed].sort(sortPrice),
        canceledList: [...canceled].sort(sortPrice),
      };
    }

    return {
      inProgressList: [...inProgress].sort(sortInProgressLatest),
      completedList: [...completed].sort(sortLatest),
      canceledList: [...canceled].sort(sortLatest),
    };
  }, [activeSort, allItems]);

  const filteredList = useMemo(() => {
    if (activeTab === "IN_PROGRESS") return groupedSorted.inProgressList;
    if (activeTab === "COMPLETED") return groupedSorted.completedList;
    if (activeTab === "CANCELED") return groupedSorted.canceledList;
    return [...groupedSorted.inProgressList, ...groupedSorted.completedList, ...groupedSorted.canceledList];
  }, [activeTab, groupedSorted.canceledList, groupedSorted.completedList, groupedSorted.inProgressList]);

  return {
    inProgressList: groupedSorted.inProgressList,
    completedList: groupedSorted.completedList,
    canceledList: groupedSorted.canceledList,
    filteredList,
    counts: {
      all: groupedSorted.inProgressList.length + groupedSorted.completedList.length + groupedSorted.canceledList.length,
      inProgress: groupedSorted.inProgressList.length,
      completed: groupedSorted.completedList.length,
      canceled: groupedSorted.canceledList.length,
    },
  };
}

function resolveSectionToneStyles(
  tone: QuoteTonePaletteKey,
  styles: ReturnType<typeof useStyles>
): { chip: object; icon: object } {
  if (tone === "attention") return { chip: styles.toneAttentionChip, icon: styles.toneAttentionIcon };
  if (tone === "progress") return { chip: styles.toneProgressChip, icon: styles.toneProgressIcon };
  return { chip: styles.toneClosedChip, icon: styles.toneClosedIcon };
}

function getToneStyles(key: QuoteTonePaletteKey, styles: ReturnType<typeof useStyles>): ToneStyleGroup {
  if (key === "attention") {
    return {
      badge: styles.badgeAttention,
      badgeText: styles.badgeTextAttention,
      ctaText: styles.ctaTextAttention,
      ctaChip: styles.ctaChipAttention,
      ctaIcon: styles.ctaIconAttention,
    };
  }

  if (key === "progress") {
    return {
      badge: styles.badgeProgress,
      badgeText: styles.badgeTextProgress,
      ctaText: styles.ctaTextProgress,
      ctaChip: styles.ctaChipProgress,
      ctaIcon: styles.ctaIconProgress,
    };
  }

  if (key === "closed") {
    return {
      badge: styles.badgeClosed,
      badgeText: styles.badgeTextClosed,
      ctaText: styles.ctaTextClosed,
      ctaChip: styles.ctaChipClosed,
      ctaIcon: styles.ctaIconClosed,
    };
  }

  return {
    badge: styles.badgeNeutral,
    badgeText: styles.badgeTextNeutral,
    ctaText: styles.ctaTextNeutral,
    ctaChip: styles.ctaChipNeutral,
    ctaIcon: styles.ctaIconNeutral,
  };
}

function SectionHeader({ iconName, title, count, tone }: SectionHeaderProps) {
  const styles = useStyles();
  const toneStyle = resolveSectionToneStyles(tone, styles);

  return (
    <View style={styles.sectionHead}>
      <View style={styles.sectionLeft}>
        <View style={[styles.sectionIconChipBase, toneStyle.chip]}>
          <Ionicons name={iconName} style={[styles.sectionIcon, toneStyle.icon]} />
        </View>
        <AppText style={styles.sectionTitle}>{title}</AppText>
      </View>
      <AppText style={styles.sectionCount}>{`${count}건`}</AppText>
    </View>
  );
}

function QuoteListCardBase({ item, onPress }: QuoteListCardProps) {
  const styles = useStyles();
  const theme = useAppTheme();
  const toneKey = resolveTonePalette(theme, item.policy).key;
  const toneStyles = useMemo(() => getToneStyles(toneKey, styles), [toneKey, styles]);
  const isClosed = item.policy.category === "closed";
  const safeDistanceText = formatDistance(item.quote.distanceKm, "0.0km", 1);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(item.quote.quoteId, item.quote.quotePublicId, item.quote.status)}
      style={({ pressed }) => [styles.pressable, isClosed && styles.closedCard, pressed && styles.pressed]}
    >
      <AppCard outlined elevated={false}>
        <View style={styles.cardInner}>
          <View style={styles.topRow}>
            <View style={[styles.badgeBase, toneStyles.badge]}>
              <AppText style={[styles.badgeTextBase, toneStyles.badgeText]}>{item.statusLabel}</AppText>
            </View>
            <View style={styles.dateWrap}>
              <Ionicons name="time-outline" style={styles.dateIcon} />
              <AppText style={styles.dateText} numberOfLines={1}>
                {item.createdAtLabel}
              </AppText>
            </View>
          </View>

          <View style={styles.routeRow}>
            <AppText style={styles.routeText} numberOfLines={1}>
              {item.quote.originAddress}
            </AppText>
            <Ionicons name="arrow-forward" style={styles.routeArrow} />
            <AppText style={styles.routeText} numberOfLines={1}>
              {item.quote.destinationAddress}
            </AppText>
          </View>

          <View style={styles.bottomRow}>
            <View style={styles.cargoWrap}>
              <Ionicons name="cube-outline" style={styles.cargoIcon} />
              <AppText style={styles.cargoText} numberOfLines={1}>
                {`${item.cargoText} · ${safeDistanceText}`}
              </AppText>
            </View>

            {item.isPriceCta ? (
              <AppText style={styles.priceText}>{item.priceText}</AppText>
            ) : (
              <View style={styles.ctaWrap}>
                <AppText style={[styles.ctaTextBase, toneStyles.ctaText]} numberOfLines={1}>
                  {item.ctaText}
                </AppText>
                <View style={[styles.ctaChipBase, toneStyles.ctaChip]}>
                  <Ionicons name="chevron-forward" style={[styles.ctaIconBase, toneStyles.ctaIcon]} />
                </View>
              </View>
            )}
          </View>
        </View>
      </AppCard>
    </Pressable>
  );
}

function areEqual(prev: QuoteListCardProps, next: QuoteListCardProps) {
  return (
    prev.onPress === next.onPress &&
    prev.item.quote.quoteId === next.item.quote.quoteId &&
    prev.item.quote.status === next.item.quote.status &&
    prev.item.quote.finalPrice === next.item.quote.finalPrice &&
    prev.item.createdAtLabel === next.item.createdAtLabel &&
    prev.item.policy.tone === next.item.policy.tone
  );
}

const QuoteListCard = React.memo(QuoteListCardBase, areEqual);

function getStableKey(item: QuoteListViewItem, index: number): string {
  const safeId = Number.isInteger(item.quote.quoteId) && item.quote.quoteId > 0 ? String(item.quote.quoteId) : "na";
  const safeCreatedAt =
    typeof item.quote.createdAt === "string" && item.quote.createdAt.length > 0 ? item.quote.createdAt : "na";
  return `${safeId}-${safeCreatedAt}-${index}`;
}

function QuoteListSection({ title, iconName, tone, items, onPressCard }: QuoteListSectionProps) {
  const styles = useStyles();

  if (items.length <= 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader iconName={iconName} title={title} count={items.length} tone={tone} />
      {items.map((item, index) => (
        <View key={getStableKey(item, index)} style={styles.cardWrapper}>
          <QuoteListCard item={item} onPress={onPressCard} />
        </View>
      ))}
    </View>
  );
}

export default function QuoteListPage() {
  const styles = useStyles();
  const theme = useAppTheme();
  const router = useRouter();
  const isMountedRef = useRef(true);
  const focusRefetchMetaRef = useRef({ hasFocusedOnce: false, inFlight: false, lastRefetchAt: 0 });

  const [activeTab, setActiveTab] = useState<QuoteListTab>("ALL");

  const routeParams = useLocalSearchParams<{ tab?: string }>();

  useEffect(() => {
    const raw = String(routeParams?.tab ?? "").trim().toUpperCase();
    if (!raw) return;

    const next =
      raw === "IN_PROGRESS" || raw === "INPROGRESS" || raw === "PROGRESS"
        ? "IN_PROGRESS"
        : raw === "COMPLETED"
          ? "COMPLETED"
          : raw === "CANCELED" || raw === "CANCELLED"
            ? "CANCELED"
            : raw === "ALL"
              ? "ALL"
              : null;

    if (!next) return;
    if (next === activeTab) return;
    setActiveTab(next as any);
  }, [activeTab, routeParams?.tab]);
  const [activeSort, setActiveSort] = useState<QuoteListSort>("LATEST");
  const [quotes, setQuotes] = useState<QuoteListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadQuoteList = useCallback(async (mode: "initial" | "focus" | "manual" = "initial") => {
    if (!isMountedRef.current) return;

    const shouldShowBlockingLoader = mode === "initial" || mode === "manual";
    if (shouldShowBlockingLoader) {
      setIsLoading(true);
      setErrorMessage(null);
    }

    try {
      
      const [quoteResponse, matchResponse] = await Promise.all([
        listShipperQuotes(),
        listMyShipperMatches().catch(() => []),
      ]);

      if (!isMountedRef.current) return;

      const rawQuotes = Array.isArray(quoteResponse) ? quoteResponse : [];
      const matches = Array.isArray(matchResponse) ? matchResponse : [];

      const matchByQuoteId = new Map<number, { status: string; updatedAt: string }>();
      for (const m of matches as ShipperMatchItem[]) {
        const quoteId = typeof (m as any)?.quoteId === "number" ? (m as any).quoteId : 0;
        if (quoteId <= 0) continue;

        const status = typeof (m as any)?.status === "string" ? (m as any).status : "";
        if (normalizeMatchStatus(status) === BACKEND_STATUS.CANCELLED) continue;

        const updatedAt = typeof (m as any)?.updatedAt === "string" ? (m as any).updatedAt : "";
        const prev = matchByQuoteId.get(quoteId);
        const prevTs = prev?.updatedAt ? Date.parse(prev.updatedAt) : 0;
        const nextTs = updatedAt ? Date.parse(updatedAt) : 0;

        if (!prev || (Number.isFinite(nextTs) && nextTs >= (Number.isFinite(prevTs) ? prevTs : 0))) {
          matchByQuoteId.set(quoteId, { status, updatedAt });
        }
      }

      const effectiveQuotes = rawQuotes.map((q) => {
        const match = matchByQuoteId.get(q.quoteId);
        const effectiveStatus = resolveEffectiveQuoteStatus(q.status, match?.status);
        return effectiveStatus && effectiveStatus !== q.status ? { ...q, status: effectiveStatus as QuoteStatusApi } : q;
      });

      setQuotes(effectiveQuotes);
} catch (error) {
      if (!isMountedRef.current) return;

      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message.trim()
          : "견적 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";

      if (shouldShowBlockingLoader) {
        setQuotes([]);
      }
      setErrorMessage(message);
    } finally {
      if (isMountedRef.current && shouldShowBlockingLoader) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    void loadQuoteList("initial");

    return () => {
      isMountedRef.current = false;
    };
  }, [loadQuoteList]);

  useFocusEffect(
    useCallback(() => {
      const focusMeta = focusRefetchMetaRef.current;
      if (!focusMeta.hasFocusedOnce) {
        focusMeta.hasFocusedOnce = true;
        return undefined;
      }

      const now = Date.now();
      if (focusMeta.inFlight || now - focusMeta.lastRefetchAt < FOCUS_REFETCH_THROTTLE_MS) {
        return undefined;
      }

      focusMeta.inFlight = true;
      focusMeta.lastRefetchAt = now;
      void loadQuoteList("focus").finally(() => {
        focusMeta.inFlight = false;
      });

      return undefined;
    }, [loadQuoteList])
  );

  const { inProgressList, completedList, canceledList, filteredList, counts } = useQuoteList(quotes, activeTab, activeSort);
  const isFilteredEmpty = filteredList.length === 0;

  const emptyDescription = useMemo(() => {
    if (activeTab === "IN_PROGRESS") return "현재 진행 중인 운송 내역이 없습니다.";
    if (activeTab === "COMPLETED") return "완료된 운송 내역이 없습니다.";
    if (activeTab === "CANCELED") return "취소된 운송 내역이 없습니다.";
    return "운송 요청을 시작하면 견적 내역을 확인할 수 있습니다.";
  }, [activeTab]);

  const handlePressCard = useCallback(
    (quoteId: number, quotePublicId: string | undefined, status: QuoteStatusApi) => {
      const safePublicId = String(quotePublicId ?? "").trim();
      const hasNumericQuoteId = Number.isInteger(quoteId) && quoteId > 0;
      if (!safePublicId && !hasNumericQuoteId) return;
      const routeIdentifier = safePublicId || String(quoteId);
      router.push({ pathname: "/(shipper)/quotes/[id]", params: { id: routeIdentifier, status } });
    },
    [router]
  );

  return (
    <PageScaffold
      title="견적 내역"
      backgroundColor={theme.colors.bgMain}
      contentStyle={styles.pageContent}
      floating={
        <RequestQuoteFab
          onPress={() => router.push("/(shipper)/quotes/create")}
          accessibilityLabel="견적 요청 생성"
        />
      }
    >
      <View style={styles.tabContainer}>
        {TAB_OPTIONS.map((tab) => {
          const isActive = activeTab === tab.key;
          const count =
            tab.key === "ALL"
              ? counts.all
              : tab.key === "IN_PROGRESS"
                ? counts.inProgress
                : tab.key === "COMPLETED"
                  ? counts.completed
                  : counts.canceled;

          return (
            <Pressable key={tab.key} style={styles.tabButton} onPress={() => setActiveTab(tab.key)}>
              <AppText style={isActive ? styles.tabTextActive : styles.tabText}>{tab.label}</AppText>
              <AppText style={styles.tabCountText}>{`${count}건`}</AppText>
              {isActive ? <View style={styles.tabIndicator} /> : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.controlRow}>
        <View style={styles.sortSegment}>
          {SORT_OPTIONS.map((option) => {
            const isActive = activeSort === option.key;

            return (
              <Pressable
                key={option.key}
                onPress={() => setActiveSort(option.key)}
                style={[styles.sortButtonBase, isActive && styles.sortButtonActive]}
              >
                <Ionicons name="swap-vertical-outline" style={[styles.sortIcon, isActive && styles.sortIconActive]} />
                <AppText style={[styles.sortButtonText, isActive && styles.sortButtonTextActive]}>{option.label}</AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.listContainer}>
        {isLoading ? (
          <AppSpinner label="견적 목록을 불러오는 중입니다." />
        ) : errorMessage ? (
          <AppErrorState
            title="견적 목록을 불러오지 못했어요"
            description={errorMessage}
            retryLabel="다시 시도"
            onRetry={() => {
              void loadQuoteList("manual");
            }}
            fullScreen={false}
          />
        ) : isFilteredEmpty ? (
          <AppEmptyState
            title="조건에 맞는 견적 내역이 없어요"
            description={emptyDescription}
            action={{ label: "견적 요청하기", onPress: () => router.push("/(shipper)/quotes/create") }}
          />
        ) : activeTab === "ALL" ? (
          <>
            <QuoteListSection
              title="진행 중"
              iconName="car-outline"
              tone="progress"
              items={inProgressList}
              onPressCard={handlePressCard}
            />
            <QuoteListSection
              title="완료됨"
              iconName="checkmark-circle-outline"
              tone="closed"
              items={completedList}
              onPressCard={handlePressCard}
            />
            <QuoteListSection
              title="취소됨"
              iconName="close-circle-outline"
              tone="closed"
              items={canceledList}
              onPressCard={handlePressCard}
            />
          </>
        ) : (
          <QuoteListSection
            title={
              activeTab === "IN_PROGRESS" ? "진행 중" : activeTab === "COMPLETED" ? "완료됨" : "취소됨"
            }
            iconName={
              activeTab === "IN_PROGRESS"
                ? "car-outline"
                : activeTab === "COMPLETED"
                  ? "checkmark-circle-outline"
                  : "close-circle-outline"
            }
            tone={activeTab === "IN_PROGRESS" ? "progress" : "closed"}
            items={filteredList}
            onPressCard={handlePressCard}
          />
        )}
      </View>
    </PageScaffold>
  );
}
