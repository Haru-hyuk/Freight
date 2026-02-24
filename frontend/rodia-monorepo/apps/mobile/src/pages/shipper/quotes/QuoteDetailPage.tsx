// app/quote/[id].tsx
import React from "react";
import { Alert, InteractionManager, LayoutAnimation, Pressable, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { cancelShipperMatch, createShipperMatch, listMyShipperMatches, type ShipperMatchItem } from "@/features/matching/api";
import { resolveTonePalette } from "@/features/quote/model/quoteActionMatrix";
import { useQuoteDetail } from "@/features/quote/model/useQuoteDetail";
import { formatWorkMethodLabel } from "@/features/quote/model/workMethod";
import { deleteShipperQuote } from "@/features/quote/api";
import { readApiErrorMessage } from "@/shared/lib/api/readApiErrorMessage";
import { initLayoutAnimationForAndroid } from "@/shared/lib/ui/layoutAnimationInit";
import { safeNumber, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppRequestState } from "@/shared/ui/kit/AppRequestState";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

type QuoteDetailView = ReturnType<typeof useQuoteDetail>;
type MatchSnapshot = {
  cancelableMatch: ShipperMatchItem | null;
  nonCanceledMatch: ShipperMatchItem | null;
};
type QuoteDetailQuote = QuoteDetailView["quote"];
type RouteFlowNode = {
  key: string;
  title: string;
  address: string;
  contactName: string;
  contactPhone: string;
  kind: "origin" | "stop" | "destination";
};

const EMPTY_MATCH_SNAPSHOT: MatchSnapshot = {
  cancelableMatch: null,
  nonCanceledMatch: null,
};

const useStyles = createThemedStyles((theme) => {
  const c = theme.colors;
  const spacing = safeNumber(theme.layout.spacing.base, 4);

  return StyleSheet.create({
    pageContent: {
      paddingTop: spacing * 2,
      paddingHorizontal: spacing * 5,
      paddingBottom: spacing * 8,
      backgroundColor: c.bgMain,
    },

    commandCenter: {
      marginTop: spacing,
      marginBottom: spacing * 3,
      gap: spacing,
    },
    manageCard: {
      marginBottom: spacing * 3,
    },
    manageInner: {
      padding: spacing * 4,
      gap: spacing * 2,
    },
    manageTitle: {
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.detail.size, 14),
      lineHeight: safeNumber(theme.typography.scale.detail.lineHeight, 20),
      fontWeight: "900",
    },
    manageDesc: {
      color: c.textMuted,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "600",
    },
    manageActionsRow: {
      flexDirection: "row",
      gap: spacing * 2,
    },
    manageEditButton: {
      flex: 1,
      minHeight: 42,
    },
    manageDeleteButton: {
      flex: 1,
      minHeight: 42,
    },
    statusRow: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing * 2,
    },
    statusLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing,
      flex: 1,
    },
    statusBadge: {
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: spacing * 2,
      paddingVertical: spacing,
      maxWidth: "60%",
    },
    statusText: {
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "900",
      letterSpacing: -0.2,
    },
    metaText: {
      color: c.textMuted,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
    },
    cancelSummaryBox: {
      borderWidth: 1,
      borderColor: c.borderDefault,
      backgroundColor: c.bgSurface,
      borderRadius: safeNumber(theme.layout.radii.card, 16),
      paddingHorizontal: spacing * 3,
      paddingVertical: spacing * 2,
      gap: spacing + 2,
    },
    cancelSummaryRow: {
      minHeight: 24,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing,
    },
    cancelSummaryIcon: {
      color: c.semanticWarning,
      fontSize: 16,
    },
    cancelSummaryLabel: {
      color: c.textMuted,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
      width: 56,
    },
    cancelSummaryValue: {
      flex: 1,
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.detail.size, 14),
      lineHeight: safeNumber(theme.typography.scale.detail.lineHeight, 20),
      fontWeight: "700",
    },

    overviewCard: {
      marginBottom: spacing * 3,
      borderWidth: 1,
    },
    overviewInner: {
      padding: spacing * 4,
      gap: spacing * 2,
    },
    overviewTop: {
      minHeight: 24,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing + 2,
    },
    iconChip: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    icon: {
      fontSize: 14,
    },
    eyebrow: {
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "900",
    },
    divider: {
      height: 1,
      backgroundColor: tint(c.textMain, 0.06, c.borderDefault),
    },

    metricRow: {
      minHeight: 40,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing,
    },
    metricLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing,
      flex: 1,
    },
    metricIcon: {
      color: c.textSub,
      fontSize: 14,
    },
    metricLabel: {
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.detail.size, 14),
      lineHeight: safeNumber(theme.typography.scale.detail.lineHeight, 20),
      fontWeight: "900",
    },
    metricValue: {
      color: c.textSub,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
    },
    priceValue: {
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.display.size, 30),
      lineHeight: safeNumber(theme.typography.scale.display.lineHeight, 38),
      fontWeight: "900",
      marginTop: spacing,
      letterSpacing: -0.7,
    },
    note: {
      color: c.textMuted,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "600",
      marginTop: spacing,
    },
    overviewActionRow: {
      marginTop: spacing * 2,
    },
    overviewActionButton: {
      minHeight: 44,
    },
    routeFlowSection: {
      marginBottom: spacing * 3,
      gap: spacing * 2,
    },
    routeFlowTitle: {
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.detail.size, 14),
      lineHeight: safeNumber(theme.typography.scale.detail.lineHeight, 20),
      fontWeight: "900",
    },
    routeFlowCardInner: {
      padding: spacing * 4,
      gap: spacing,
    },
    routeFlowRow: {
      flexDirection: "row",
      alignItems: "stretch",
      gap: spacing,
    },
    routeFlowRail: {
      width: 20,
      alignItems: "center",
    },
    routeFlowDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: c.borderStrong,
      marginTop: 6,
    },
    routeFlowDotOrigin: {
      backgroundColor: c.textMain,
    },
    routeFlowDotStop: {
      backgroundColor: c.brandPrimary,
    },
    routeFlowDotDestination: {
      backgroundColor: c.semanticSuccess,
    },
    routeFlowLine: {
      width: 2,
      flex: 1,
      marginTop: 4,
      backgroundColor: tint(c.textMain, 0.14, c.borderDefault),
    },
    routeFlowBody: {
      flex: 1,
      paddingBottom: spacing * 2,
    },
    routeFlowHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing,
    },
    routeFlowNodeTitle: {
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.detail.size, 14),
      lineHeight: safeNumber(theme.typography.scale.detail.lineHeight, 20),
      fontWeight: "800",
    },
    routeFlowContact: {
      color: c.textSub,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
      maxWidth: "58%",
      textAlign: "right",
    },
    routeFlowAddress: {
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "600",
      marginTop: 2,
    },
    accordionHeader: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: spacing * 3,
      borderTopWidth: 1,
      borderTopColor: c.borderDefault,
    },
    accordionTitle: {
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.detail.size, 14),
      lineHeight: safeNumber(theme.typography.scale.detail.lineHeight, 20),
      fontWeight: "900",
    },
    accordionRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing / 2,
    },
    accordionState: {
      color: c.textMuted,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
    },
    accordionChevron: {
      color: c.textMuted,
      fontSize: 16,
    },
    accordionBody: {
      paddingBottom: spacing * 4,
      gap: spacing * 2,
    },

    archiveCardInner: {
      padding: spacing * 4,
    },
    archiveTitle: {
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.detail.size, 14),
      lineHeight: safeNumber(theme.typography.scale.detail.lineHeight, 20),
      fontWeight: "900",
      marginBottom: spacing,
    },
    archiveRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: spacing * 2,
      paddingVertical: spacing,
      borderBottomWidth: 1,
      borderBottomColor: tint(c.textMain, 0.06, c.borderDefault),
    },
    archiveRowLast: {
      borderBottomWidth: 0,
    },
    archiveLabelGroup: {
      width: "35%",
      flexDirection: "row",
      alignItems: "center",
      gap: spacing,
    },
    archiveLabelIcon: {
      color: c.textSub,
      fontSize: 14,
    },
    archiveLabel: {
      flex: 1,
      color: c.textMuted,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
    },
    archiveValue: {
      flex: 1,
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.detail.size, 14),
      lineHeight: safeNumber(theme.typography.scale.detail.lineHeight, 20),
      fontWeight: "700",
      textAlign: "right",
    },
  });
});

function readRouteParamText(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw.trim() : "";
}

function parseRouteIdentifier(value: string | string[] | undefined): string {
  return readRouteParamText(value);
}

function parsePositiveInt(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function parsePositiveIntParam(value: string | string[] | undefined): number {
  return parsePositiveInt(readRouteParamText(value));
}

function toTrimmedText(value: unknown): string {
  return String(value ?? "").trim();
}

function formatContactLine(name: unknown, phone: unknown): string {
  const safeName = toTrimmedText(name);
  const safePhone = toTrimmedText(phone);
  if (safeName && safePhone) return `${safeName} · ${safePhone}`;
  if (safeName) return safeName;
  if (safePhone) return safePhone;
  return "-";
}

function buildRouteFlowNodes(quote: QuoteDetailQuote): RouteFlowNode[] {
  const originAddress = toTrimmedText(quote?.originAddress);
  const destinationAddress = toTrimmedText(quote?.destinationAddress);

  const nodes: RouteFlowNode[] = [
    {
      key: "origin",
      title: "출발지 · 발송인",
      address: originAddress || "-",
      contactName: toTrimmedText(quote?.senderName),
      contactPhone: toTrimmedText(quote?.senderPhone),
      kind: "origin",
    },
  ];

  const stops = Array.isArray(quote?.stops)
    ? quote.stops
        .slice()
        .sort((a, b) => parsePositiveInt(a?.seq) - parsePositiveInt(b?.seq))
    : [];

  const stopNodes: RouteFlowNode[] = stops
    .map((stop, index) => {
      const seq = Math.max(1, parsePositiveInt(stop?.seq) || index + 1);
      const address = toTrimmedText(stop?.address);
      if (!address) return null;

      return {
        key: `stop-${seq}`,
        title: `경유지 ${seq}`,
        address,
        contactName: toTrimmedText(stop?.contactName),
        contactPhone: toTrimmedText(stop?.contactPhone),
        kind: "stop",
      } as RouteFlowNode;
    })
    .filter((item): item is RouteFlowNode => Boolean(item));

  nodes.push(...stopNodes);

  nodes.push({
    key: "destination",
    title: "도착지 · 도착 관리자",
    address: destinationAddress || "-",
    contactName: toTrimmedText(quote?.receiverName),
    contactPhone: toTrimmedText(quote?.receiverPhone),
    kind: "destination",
  });

  if (nodes.length > 0) return nodes;

  return [
    {
      key: "route-fallback",
      title: "경로",
      address: "-",
      contactName: "",
      contactPhone: "",
      kind: "destination",
    },
  ];
}

function formatPriceText(value: unknown): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return "-";
  return `${Math.trunc(parsed).toLocaleString("ko-KR")}원`;
}

function toDisplayDash(value: unknown): string {
  return toTrimmedText(value) || "-";
}

function toPositiveAmount(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.trunc(parsed);
}

function formatDistanceText(value: unknown): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return "-";
  return `${parsed.toFixed(1)}km`;
}

function normalizeMatchStatus(value: unknown): string {
  const normalized = toTrimmedText(value).toUpperCase();
  if (!normalized) return "";
  if (normalized === "CANCELLED") return "CANCELED";
  return normalized;
}

function isCanceledMatchStatus(value: unknown): boolean {
  return normalizeMatchStatus(value) === "CANCELED";
}

function toUpdatedAtTime(value: unknown): number {
  const raw = toTrimmedText(value);
  if (!raw) return 0;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveMatchSnapshotForQuote(matches: unknown, quoteId: number): MatchSnapshot {
  const safeQuoteId = parsePositiveInt(quoteId);
  if (safeQuoteId <= 0) return EMPTY_MATCH_SNAPSHOT;

  const safeMatches = Array.isArray(matches) ? matches : [];
  let cancelableMatch: ShipperMatchItem | null = null;
  let cancelableUpdatedAt = -1;
  let nonCanceledMatch: ShipperMatchItem | null = null;
  let nonCanceledUpdatedAt = -1;

  for (const match of safeMatches as ShipperMatchItem[]) {
    const quoteIdFromMatch = parsePositiveInt((match as { quoteId?: unknown })?.quoteId);
    if (quoteIdFromMatch !== safeQuoteId) continue;

    const updatedAt = toUpdatedAtTime((match as { updatedAt?: unknown })?.updatedAt);
    const canceled = isCanceledMatchStatus((match as { status?: unknown })?.status);
    const isCancelable = (match as { cancelable?: unknown })?.cancelable === true;
    if (!canceled && isCancelable && updatedAt >= cancelableUpdatedAt) {
      cancelableMatch = match;
      cancelableUpdatedAt = updatedAt;
    }

    if (!canceled && updatedAt >= nonCanceledUpdatedAt) {
      nonCanceledMatch = match;
      nonCanceledUpdatedAt = updatedAt;
    }
  }

  return {
    cancelableMatch,
    nonCanceledMatch,
  };
}

function normalizeArchiveRowValue(value: unknown): string {
  return toDisplayDash(value);
}

function resolveArchiveRowIconName(
  sectionTitle: string,
  rowLabel: string
): keyof typeof Ionicons.glyphMap | null {
  const normalizedSectionTitle = toTrimmedText(sectionTitle);
  const normalizedLabel = toTrimmedText(rowLabel);
  const vehicleCargoSection =
    normalizedSectionTitle === "차량/화물" ||
    normalizedSectionTitle === "차량 정보" ||
    normalizedSectionTitle === "화물 정보";
  if (!vehicleCargoSection) return null;

  if (normalizedLabel === "화물") return "cube-outline";
  if (normalizedLabel === "차량") return "bus-outline";
  if (normalizedLabel === "차종") return "car-sport-outline";
  if (normalizedLabel === "차량 번호") return "car-outline";
  if (normalizedLabel === "화물 설명") return "document-text-outline";
  if (normalizedLabel === "중량") return "git-network-outline";
  if (normalizedLabel === "부피") return "layers-outline";
  if (normalizedLabel === "하차 위치") return "navigate-outline";
  return null;
}

type OverviewMatchAction = {
  title: string;
  variant: "primary" | "destructive";
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
};

function OverviewCard({ view, matchAction }: { view: QuoteDetailView; matchAction?: OverviewMatchAction | null }) {
  const styles = useStyles();
  const theme = useAppTheme();
  const palette = resolveTonePalette(theme, view.policy);
  const iconName: keyof typeof Ionicons.glyphMap = "information-circle-outline";
  const distanceText = formatDistanceText(view.quote?.distanceKm);
  const loadMethodText = formatWorkMethodLabel(view.quote?.loadMethod);
  const unloadMethodText = formatWorkMethodLabel(view.quote?.unloadMethod);
  const completedAtText = (view.coreSummary?.completedAtText ?? "").trim();
  const isCompleted = (view.quote?.status ?? "") === "DROPOFF";

  const priceSummary = React.useMemo(() => {
    const desiredAmount = toPositiveAmount(view.quote?.desiredPrice);
    const estimatedAmount = toPositiveAmount(view.quote?.finalPrice);
    const completed = (view.quote?.status ?? "") === "DROPOFF";

    if (completed && estimatedAmount > 0) {
      const secondaryText = desiredAmount > 0 ? `희망 운임: ${formatPriceText(desiredAmount)}` : "";
      return {
        primaryLabel: "정산 금액",
        primaryText: formatPriceText(estimatedAmount),
        secondaryText,
      };
    }

    if (desiredAmount > 0) {
      const secondaryText = estimatedAmount > 0 ? `예상 금액: ${formatPriceText(estimatedAmount)}` : "";
      return {
        primaryLabel: "희망 운임",
        primaryText: formatPriceText(desiredAmount),
        secondaryText,
      };
    }

    return {
      primaryLabel: "예상 금액",
      primaryText: formatPriceText(estimatedAmount),
      secondaryText: "",
    };
  }, [view.quote?.desiredPrice, view.quote?.finalPrice, view.quote?.status]);
  const supportText = !priceSummary.secondaryText && isCompleted && completedAtText ? `정산 완료: ${completedAtText}` : "";

  return (
    <AppCard
      outlined
      elevated={false}
      style={[
        styles.overviewCard,
        {
          borderColor: palette.spotlightBorder,
          backgroundColor: palette.spotlightBg,
        },
      ]}
    >
      <View style={styles.overviewInner}>
        <View style={styles.overviewTop}>
          <View
            style={[
              styles.iconChip,
              {
                backgroundColor: palette.iconChipBg,
                borderColor: palette.iconChipBorder,
              },
            ]}
          >
            <Ionicons name={iconName} style={[styles.icon, { color: palette.iconColor }]} />
          </View>
          <AppText style={[styles.eyebrow, { color: palette.badgeText }]}>운송 요약</AppText>
        </View>

        <View style={styles.metricRow}>
          <View style={styles.metricLeft}>
            <Ionicons name="git-network-outline" style={styles.metricIcon} />
            <AppText style={styles.metricLabel}>운송 거리</AppText>
          </View>
          <AppText style={styles.metricValue}>{distanceText}</AppText>
        </View>

        <View style={styles.metricRow}>
          <View style={styles.metricLeft}>
            <Ionicons name="cube-outline" style={styles.metricIcon} />
            <AppText style={styles.metricLabel}>상차 방식</AppText>
          </View>
          <AppText style={styles.metricValue}>{loadMethodText}</AppText>
        </View>

        <View style={styles.metricRow}>
          <View style={styles.metricLeft}>
            <Ionicons name="exit-outline" style={styles.metricIcon} />
            <AppText style={styles.metricLabel}>하차 방식</AppText>
          </View>
          <AppText style={styles.metricValue}>{unloadMethodText}</AppText>
        </View>

        <View>
          <View style={styles.metricRow}>
            <View style={styles.metricLeft}>
              <Ionicons name="cash-outline" style={[styles.metricIcon, { color: palette.iconColor }]} />
              <AppText style={styles.metricLabel}>{priceSummary.primaryLabel}</AppText>
            </View>
            {priceSummary.secondaryText ? <AppText style={styles.metricValue}>{priceSummary.secondaryText}</AppText> : null}
          </View>

          <AppText style={[styles.priceValue, { color: palette.emphasisText }]}>{priceSummary.primaryText}</AppText>

          {supportText ? <AppText style={styles.note}>{supportText}</AppText> : null}
        </View>

        {matchAction ? (
          <View style={styles.overviewActionRow}>
            <AppButton
              title={matchAction.title}
              variant={matchAction.variant}
              style={styles.overviewActionButton}
              onPress={matchAction.onPress}
              loading={matchAction.loading}
              disabled={matchAction.disabled}
            />
          </View>
        ) : null}
      </View>
    </AppCard>
  );
}

function ShipperManagementCard({
  disabled,
  isDeleting,
  onPressEdit,
  onPressDelete,
}: {
  disabled: boolean;
  isDeleting: boolean;
  onPressEdit: () => void;
  onPressDelete: () => void;
}) {
  const styles = useStyles();

  return (
    <AppCard outlined elevated={false} style={styles.manageCard}>
      <View style={styles.manageInner}>
        <AppText style={styles.manageTitle}>견적 관리</AppText>
        <AppText style={styles.manageDesc}>수정 또는 삭제를 바로 실행할 수 있습니다.</AppText>
        <View style={styles.manageActionsRow}>
          <AppButton
            title="견적 수정"
            variant="secondary"
            style={styles.manageEditButton}
            onPress={onPressEdit}
            disabled={disabled || isDeleting}
          />
          <AppButton
            title="견적 삭제"
            variant="destructive"
            style={styles.manageDeleteButton}
            onPress={onPressDelete}
            disabled={disabled}
            loading={isDeleting}
          />
        </View>
      </View>
    </AppCard>
  );
}

function RouteFlowCard({ quote }: { quote: QuoteDetailQuote }) {
  const styles = useStyles();
  const nodes = React.useMemo(() => buildRouteFlowNodes(quote), [quote]);

  return (
    <View style={styles.routeFlowSection}>
      <AppText style={styles.routeFlowTitle}>운송 경로</AppText>
      <AppCard outlined elevated={false}>
        <View style={styles.routeFlowCardInner}>
          {nodes.map((node, index) => {
            const isLast = index === nodes.length - 1;
            const contactLine = formatContactLine(node.contactName, node.contactPhone);
            return (
              <View key={node.key} style={styles.routeFlowRow}>
                <View style={styles.routeFlowRail}>
                  <View
                    style={[
                      styles.routeFlowDot,
                      node.kind === "origin" && styles.routeFlowDotOrigin,
                      node.kind === "stop" && styles.routeFlowDotStop,
                      node.kind === "destination" && styles.routeFlowDotDestination,
                    ]}
                  />
                  {!isLast ? <View style={styles.routeFlowLine} /> : null}
                </View>
                <View style={styles.routeFlowBody}>
                  <View style={styles.routeFlowHeader}>
                    <AppText style={styles.routeFlowNodeTitle}>{node.title}</AppText>
                    <AppText style={styles.routeFlowContact} numberOfLines={1}>
                      {contactLine}
                    </AppText>
                  </View>
                  <AppText style={styles.routeFlowAddress}>{toDisplayDash(node.address)}</AppText>
                </View>
              </View>
            );
          })}
        </View>
      </AppCard>
    </View>
  );
}

function SpecificationArchive({ view }: { view: QuoteDetailView }) {
  const styles = useStyles();
  const [open, setOpen] = React.useState(false);
  type ArchiveRowItem = { label: string; value: string };
  type ArchiveSectionItem = { key: string; title: string; rows: ArchiveRowItem[] };

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((prev) => !prev);
  };

  const groupedSections = React.useMemo<ArchiveSectionItem[]>(() => {
    const sections = Array.isArray(view.specificationArchive) ? view.specificationArchive : [];
    return sections.map((section, sectionIndex) => {
      const title = toDisplayDash((section as { title?: unknown })?.title);
      const rows = Array.isArray((section as { rows?: unknown })?.rows) ? ((section as { rows?: unknown[] }).rows ?? []) : [];
      const normalizedRows = rows.map((row) => ({
        label: toDisplayDash((row as { label?: unknown })?.label),
        value: normalizeArchiveRowValue((row as { value?: unknown })?.value),
      }));

      return {
        key: `${title}-${sectionIndex}`,
        title,
        rows: normalizedRows,
      };
    });
  }, [view.specificationArchive]);

  return (
    <View>
      <Pressable onPress={toggle} style={styles.accordionHeader}>
        <AppText style={styles.accordionTitle}>요청 상세 정보 보기</AppText>
        <View style={styles.accordionRight}>
          <AppText style={styles.accordionState}>{open ? "접기" : "보기"}</AppText>
          <Ionicons name={open ? "chevron-up" : "chevron-down"} style={styles.accordionChevron} />
        </View>
      </Pressable>

      {open ? (
        <View style={styles.accordionBody}>
          {groupedSections.map((section) => {
            return (
              <AppCard key={section.key} outlined elevated={false}>
                <View style={styles.archiveCardInner}>
                  <AppText style={styles.archiveTitle}>{section.title}</AppText>
                  {section.rows.map((row, rowIndex) => {
                    const iconName = resolveArchiveRowIconName(section.title, row.label);
                    return (
                      <View
                        key={`${section.key}-${row.label}-${rowIndex}`}
                        style={[styles.archiveRow, rowIndex === section.rows.length - 1 && styles.archiveRowLast]}
                      >
                        <View style={styles.archiveLabelGroup}>
                          {iconName ? <Ionicons name={iconName} style={styles.archiveLabelIcon} /> : null}
                          <AppText style={styles.archiveLabel}>{row.label}</AppText>
                        </View>
                        <AppText style={styles.archiveValue}>{row.value}</AppText>
                      </View>
                    );
                  })}
                </View>
              </AppCard>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

export default function QuoteDetailPage() {
  const styles = useStyles();
  const theme = useAppTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [matchSnapshot, setMatchSnapshot] = React.useState<MatchSnapshot>(EMPTY_MATCH_SNAPSHOT);
  const [isMatchSubmitting, setIsMatchSubmitting] = React.useState(false);
  const [matchHydrated, setMatchHydrated] = React.useState(false);
  const matchLoadTokenRef = React.useRef(0);

  const quoteIdentifier = parseRouteIdentifier(params?.id);
  const quoteId = parsePositiveIntParam(params?.id);
  const view = useQuoteDetail(quoteIdentifier);
  const actionQuoteId = React.useMemo(() => {
    const fromView = parsePositiveInt(view.quote?.quoteId);
    if (fromView > 0) return fromView;
    return parsePositiveInt(quoteId);
  }, [quoteId, view.quote?.quoteId]);
  const isBlockedByFetchState = view.isLoading || Boolean(view.errorMessage);
  const palette = isBlockedByFetchState ? null : resolveTonePalette(theme, view.policy);
  const loadMatchSnapshot = React.useCallback(async (targetQuoteId: number): Promise<MatchSnapshot> => {
    const safeQuoteId = parsePositiveInt(targetQuoteId);
    if (safeQuoteId <= 0) {
      setMatchSnapshot(EMPTY_MATCH_SNAPSHOT);
      return EMPTY_MATCH_SNAPSHOT;
    }

    try {
      const matches = await listMyShipperMatches();
      const snapshot = resolveMatchSnapshotForQuote(matches, safeQuoteId);
      setMatchSnapshot(snapshot);
      return snapshot;
    } catch {
      setMatchSnapshot(EMPTY_MATCH_SNAPSHOT);
      return EMPTY_MATCH_SNAPSHOT;
    }
  }, []);

  const refreshQuoteAndMatchData = React.useCallback(async () => {
    const tasks: Array<Promise<unknown>> = [view.refetch()];
    if (actionQuoteId > 0) {
      tasks.push(loadMatchSnapshot(actionQuoteId));
    }
    await Promise.all(tasks);
  }, [actionQuoteId, loadMatchSnapshot, view.refetch]);

  React.useEffect(() => {
    const safeQuoteId = parsePositiveInt(actionQuoteId);
    matchLoadTokenRef.current += 1;
    const token = matchLoadTokenRef.current;
    let canceled = false;

    if (safeQuoteId <= 0) {
      setMatchSnapshot(EMPTY_MATCH_SNAPSHOT);
      setMatchHydrated(true);
      return;
    }

    setMatchHydrated(false);
    const task = InteractionManager.runAfterInteractions(() => {
      if (canceled || matchLoadTokenRef.current !== token) return;
      void loadMatchSnapshot(safeQuoteId).finally(() => {
        if (canceled || matchLoadTokenRef.current !== token) return;
        setMatchHydrated(true);
      });
    });
    return () => {
      canceled = true;
      task.cancel();
    };
  }, [actionQuoteId, loadMatchSnapshot]);

  const activeQuoteMatch = React.useMemo(
    () => matchSnapshot.cancelableMatch ?? matchSnapshot.nonCanceledMatch ?? null,
    [matchSnapshot.cancelableMatch, matchSnapshot.nonCanceledMatch]
  );
  const hasActiveQuoteMatch = Boolean(activeQuoteMatch);
  const cancelTargetMatchId = React.useMemo(() => parsePositiveInt(activeQuoteMatch?.matchId), [activeQuoteMatch?.matchId]);

  const handleCreateMatch = React.useCallback(async () => {
    if (isMatchSubmitting) return;

    if (actionQuoteId <= 0) {
      Alert.alert("배차 요청 실패", "유효한 견적 정보를 찾을 수 없습니다.");
      return;
    }

    try {
      setIsMatchSubmitting(true);
      await createShipperMatch(actionQuoteId);
      await refreshQuoteAndMatchData();
      Alert.alert("배차 요청", "배차 요청이 생성되었습니다.");
    } catch (error) {
      Alert.alert("배차 요청 실패", readApiErrorMessage(error));
    } finally {
      setIsMatchSubmitting(false);
    }
  }, [actionQuoteId, isMatchSubmitting, refreshQuoteAndMatchData]);

  const handleCancelMatchDirect = React.useCallback(async () => {
    if (isMatchSubmitting) return;
    if (cancelTargetMatchId <= 0) {
      Alert.alert("배차 취소 실패", "취소할 배차 요청을 찾을 수 없습니다.");
      return;
    }

    try {
      setIsMatchSubmitting(true);
      await cancelShipperMatch(cancelTargetMatchId);
      await refreshQuoteAndMatchData();
      Alert.alert("배차 취소", "배차 요청을 취소했습니다.");
    } catch (error) {
      Alert.alert("배차 취소 실패", readApiErrorMessage(error));
    } finally {
      setIsMatchSubmitting(false);
    }
  }, [cancelTargetMatchId, isMatchSubmitting, refreshQuoteAndMatchData]);
  const shouldRenderOverviewMatchAction = matchHydrated && actionQuoteId > 0;
  const overviewMatchAction = React.useMemo<OverviewMatchAction | null>(() => {
    if (!shouldRenderOverviewMatchAction) return null;
    return {
      title: hasActiveQuoteMatch ? "요청 취소" : "배차 요청",
      variant: hasActiveQuoteMatch ? "destructive" : "primary",
      loading: isMatchSubmitting,
      disabled: isMatchSubmitting || (hasActiveQuoteMatch && cancelTargetMatchId <= 0),
      onPress: () => {
        if (hasActiveQuoteMatch) {
          void handleCancelMatchDirect();
          return;
        }
        void handleCreateMatch();
      },
    };
  }, [
    cancelTargetMatchId,
    handleCancelMatchDirect,
    handleCreateMatch,
    hasActiveQuoteMatch,
    isMatchSubmitting,
    shouldRenderOverviewMatchAction,
  ]);

  const handlePressEdit = React.useCallback(() => {
    if (isBlockedByFetchState) return;
    const preferredIdentifier = String(view.quote?.quotePublicId ?? quoteIdentifier ?? "").trim();
    const routeIdentifier = preferredIdentifier || (actionQuoteId > 0 ? String(actionQuoteId) : "");

    if (!routeIdentifier) {
      Alert.alert("수정 이동 실패", "유효한 견적 ID를 찾을 수 없습니다.");
      return;
    }

    router.push({ pathname: "/(shipper)/quotes/edit/[id]", params: { id: routeIdentifier } });
  }, [actionQuoteId, isBlockedByFetchState, quoteIdentifier, router, view.quote?.quotePublicId]);
  const runDelete = React.useCallback(async () => {
    if (isDeleting || isBlockedByFetchState) return;

    if (actionQuoteId <= 0) {
      Alert.alert("견적 삭제 실패", "유효한 견적 ID를 찾을 수 없습니다.");
      return;
    }

    try {
      setIsDeleting(true);
      await deleteShipperQuote(actionQuoteId);
      router.replace("/(shipper)/quotes");
    } catch (error) {
      Alert.alert("견적 삭제 실패", readApiErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  }, [actionQuoteId, isBlockedByFetchState, isDeleting, router]);
  const handlePressDelete = React.useCallback(() => {
    if (isBlockedByFetchState || isDeleting) return;

    Alert.alert("견적 삭제", "해당 견적을 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () => {
          void runDelete();
        },
      },
    ]);
  }, [isBlockedByFetchState, isDeleting, runDelete]);

  React.useEffect(() => {
    initLayoutAnimationForAndroid();
  }, []);

  const handleDetailErrorRetry = React.useCallback(() => {
    if (view.isSessionExpired) {
      router.replace("/(auth)/login");
      return;
    }
    void view.refetch();
  }, [router, view.isSessionExpired, view.refetch]);

  return (
    <PageScaffold
      title="견적 상세"
      backgroundColor={theme.colors.bgMain}
      contentStyle={styles.pageContent}
      onPressBack={() => router.back()}
      backLabel="이전"
    >
      <AppRequestState
        isLoading={view.isLoading}
        loadingLabel="견적 상세를 불러오는 중입니다."
        errorMessage={view.isSessionExpired ? "세션이 만료되었습니다. 다시 로그인해 주세요." : view.errorMessage}
        errorTitle={view.isSessionExpired ? "세션이 만료되었습니다" : "견적 상세를 불러오지 못했어요"}
        retryLabel={view.isSessionExpired ? "로그인으로 이동" : "다시 시도"}
        onRetry={handleDetailErrorRetry}
        fullScreen={false}
      >
        <>
          <View style={styles.commandCenter}>
            <View style={styles.statusRow}>
              <View style={styles.statusLeft}>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: palette?.badgeBg ?? theme.colors.bgSurface,
                      borderColor: palette?.badgeBorder ?? theme.colors.borderDefault,
                    },
                  ]}
                >
                  <AppText style={[styles.statusText, { color: palette?.badgeText ?? theme.colors.textMain }]} numberOfLines={1}>
                    {view.commandCenter?.statusLabel ?? "진행 상태"}
                  </AppText>
                </View>
              </View>

              <AppText style={styles.metaText} numberOfLines={1}>
                {view.commandCenter?.metaText ?? `#${view.quote?.quoteId ?? quoteId}`}
              </AppText>
            </View>

            {view.commandCenter?.cancelReasonText ? (
              <View style={styles.cancelSummaryBox}>
                <View style={styles.cancelSummaryRow}>
                  <Ionicons name="alert-circle" style={styles.cancelSummaryIcon} />
                  <AppText style={styles.cancelSummaryLabel}>취소 사유</AppText>
                  <AppText style={styles.cancelSummaryValue}>{view.commandCenter.cancelReasonText}</AppText>
                </View>
                <View style={styles.cancelSummaryRow}>
                  <Ionicons name="time-outline" style={styles.cancelSummaryIcon} />
                  <AppText style={styles.cancelSummaryLabel}>취소 시간</AppText>
                  <AppText style={styles.cancelSummaryValue}>{view.commandCenter.canceledAtText || "-"}</AppText>
                </View>
              </View>
            ) : null}
          </View>

          <OverviewCard view={view} matchAction={overviewMatchAction} />

          <ShipperManagementCard
            disabled={isBlockedByFetchState}
            isDeleting={isDeleting}
            onPressEdit={handlePressEdit}
            onPressDelete={handlePressDelete}
          />

          <RouteFlowCard quote={view.quote} />

          <SpecificationArchive view={view} />
        </>
      </AppRequestState>
    </PageScaffold>
  );
}
