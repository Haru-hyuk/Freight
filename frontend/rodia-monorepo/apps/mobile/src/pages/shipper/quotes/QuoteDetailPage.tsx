import React from "react";
import { Alert, InteractionManager, LayoutAnimation, Pressable, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cancelShipperMatch, createShipperMatch, listMyShipperMatches, type ShipperMatchItem } from "@/features/matching/api";
import {
  acceptShipperCounterOffer,
  isCounterOfferPending,
  listShipperCounterOffers,
  rejectShipperCounterOffer,
  type CounterOfferItem,
} from "@/features/counter-offer/api";
import { deleteShipperQuote } from "@/features/quote/api";
import { getQuoteActionPolicy, resolveTonePalette, type DecisionActionId } from "@/features/quote/model/quoteActionMatrix";
import { useQuoteDetail, type QuoteActionsContext } from "@/features/quote/model/useQuoteDetail";
import { formatWorkMethodLabel } from "@/features/quote/model/workMethod";
import { BottomActionRouter } from "@/features/quote/ui/actions/BottomActionRouter";
import { readApiErrorMessage } from "@/shared/lib/api/readApiErrorMessage";
import { formatDistance, formatKrw } from "@/shared/lib/format/display";
import {
  BACKEND_STATUS,
  CUSTOMER_UI_STATE,
  getCustomerUiStateFromBackendStatus,
  normalizeStatus,
  type CustomerUiState,
} from "@/shared/lib/policy";
import { initLayoutAnimationForAndroid } from "@/shared/lib/ui/layoutAnimationInit";
import { safeNumber, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppRequestState } from "@/shared/ui/kit/AppRequestState";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

type QuoteDetailView = ReturnType<typeof useQuoteDetail>;
type QuoteDetailQuote = QuoteDetailView["quote"];
type QuoteDetailCoreSummary = QuoteDetailView["coreSummary"];
type MatchSnapshot = { cancelableMatch: ShipperMatchItem | null; nonCanceledMatch: ShipperMatchItem | null };
type RouteNode = { key: string; title: string; address: string; kind: "origin" | "waypoint" | "destination" };
type ArchiveRow = { label: string; value: string };
type ArchiveSection = { key: string; title: string; rows: ArchiveRow[] };
type PriceSummary = { primaryLabel: string; primaryText: string; secondaryText: string };
type QuoteDecisionAction = Exclude<DecisionActionId, "cancelRequest">;

const POLICY_ACTION_UI_STATES: ReadonlySet<CustomerUiState> = new Set([
  CUSTOMER_UI_STATE.NEGOTIATION_REQUIRED,
  CUSTOMER_UI_STATE.PAYMENT_REQUIRED,
  CUSTOMER_UI_STATE.COMPLETED,
  CUSTOMER_UI_STATE.CANCELED,
]);
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
const FOCUS_REFETCH_THROTTLE_MS = 1500;

const EMPTY_MATCH_SNAPSHOT: MatchSnapshot = { cancelableMatch: null, nonCanceledMatch: null };
const VEHICLE_SECTION_TITLES = new Set(["차량/화물", "차량 정보", "화물 정보"]);
const VEHICLE_ROW_LABELS = new Set(["톤수", "차량", "차종", "차량 번호"]);

const useStyles = createThemedStyles((theme) => {
  const c = theme.colors;
  const s = safeNumber(theme.layout.spacing.base, 4);
  return StyleSheet.create({
    pageContent: { paddingTop: s * 2, paddingHorizontal: s * 5, paddingBottom: s * 6, backgroundColor: c.bgMain },
    sectionTitle: {
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.detail.size, 14),
      lineHeight: safeNumber(theme.typography.scale.detail.lineHeight, 20),
      fontWeight: "900",
    },

    statusSection: { marginTop: s, marginBottom: s * 3, gap: s * 2 },
    statusRow: { minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: s * 2 },
    statusBadge: { borderRadius: 999, borderWidth: 1, paddingHorizontal: s * 2, paddingVertical: s, maxWidth: "62%" },
    statusText: {
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "900",
      letterSpacing: -0.2,
    },
    statusMeta: {
      flex: 1,
      textAlign: "right",
      color: c.textMuted,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
    },
    cancelBox: { backgroundColor: c.bgSurface, borderRadius: safeNumber(theme.layout.radii.card, 16), padding: s * 3, gap: s + 2 },
    cancelRow: { minHeight: 22, flexDirection: "row", alignItems: "center", gap: s },
    cancelIcon: { color: c.semanticWarning, fontSize: 16 },
    cancelLabel: {
      width: 56,
      color: c.textMuted,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
    },
    cancelValue: {
      flex: 1,
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.detail.size, 14),
      lineHeight: safeNumber(theme.typography.scale.detail.lineHeight, 20),
      fontWeight: "700",
    },

    counterOfferSection: { marginBottom: s * 3 },
    counterOfferCard: {
      backgroundColor: c.bgSurface,
      borderRadius: safeNumber(theme.layout.radii.card, 16),
      borderWidth: 1,
      borderColor: c.brandPrimary,
      padding: s * 4,
      gap: s * 2,
    },
    counterOfferHeader: { flexDirection: "row", alignItems: "center", gap: s * 2 },
    counterOfferBadge: {
      borderRadius: 999,
      paddingHorizontal: s * 2,
      paddingVertical: s,
      backgroundColor: c.brandPrimary,
    },
    counterOfferBadgeText: {
      color: c.textOnBrand,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      fontWeight: "900",
    },
    counterOfferTitle: {
      flex: 1,
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.detail.size, 14),
      fontWeight: "900",
    },
    counterOfferPrice: {
      color: c.brandPrimary,
      fontSize: safeNumber(theme.typography.scale.display.size, 30),
      lineHeight: safeNumber(theme.typography.scale.display.lineHeight, 38),
      fontWeight: "900",
      letterSpacing: -0.6,
    },
    counterOfferPriceLabel: {
      color: c.textMuted,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      fontWeight: "700",
      marginBottom: s / 2,
    },
    counterOfferDivider: { height: 1, backgroundColor: c.borderDefault },
    counterOfferMessageLabel: {
      color: c.textMuted,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      fontWeight: "700",
    },
    counterOfferMessage: {
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.detail.size, 14),
      fontWeight: "700",
      lineHeight: safeNumber(theme.typography.scale.detail.lineHeight, 20),
    },

    routeSection: { marginBottom: s * 3, gap: s * 2 },
    routeCard: { backgroundColor: c.bgSurface },
    routeInner: { padding: s * 4, gap: s },
    routeRow: { flexDirection: "row", alignItems: "stretch", gap: s },
    routeRail: { width: 20, alignItems: "center" },
    routeDot: { width: 10, height: 10, borderRadius: 5, marginTop: 6, backgroundColor: c.borderStrong },
    routeDotOrigin: { backgroundColor: c.textMain },
    routeDotWaypoint: { backgroundColor: c.brandPrimary },
    routeDotDestination: { backgroundColor: c.semanticSuccess },
    routeLine: { width: 2, flex: 1, marginTop: 4, backgroundColor: tint(c.textMain, 0.12, c.borderDefault) },
    routeBody: { flex: 1, paddingBottom: s * 2 },
    routeNodeTitle: {
      color: c.textMuted,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "800",
    },
    routeAddress: { color: c.textMain, fontSize: 17, lineHeight: 24, fontWeight: "900", marginTop: 2 },
    routeWaypointCaption: {
      color: c.textSub,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
      marginTop: 2,
    },

    summarySection: { marginBottom: s * 3, gap: s * 2 },
    summaryCard: { borderWidth: 1 },
    summaryInner: { padding: s * 4, gap: s * 2 },
    summaryTop: { minHeight: 24, flexDirection: "row", alignItems: "center", gap: s + 2 },
    summaryChip: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
    summaryEyebrow: {
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "900",
    },
    summaryRow: { minHeight: 40, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: s },
    summaryLeft: { flexDirection: "row", alignItems: "center", gap: s, flex: 1 },
    summaryIcon: { color: c.textSub, fontSize: 14 },
    summaryLabel: {
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.detail.size, 14),
      lineHeight: safeNumber(theme.typography.scale.detail.lineHeight, 20),
      fontWeight: "900",
    },
    summaryValue: {
      color: c.textSub,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
    },
    summaryDivider: { height: 1, backgroundColor: tint(c.textMain, 0.06, c.borderDefault) },
    priceWrap: { marginTop: s, gap: s },
    priceLabel: {
      color: c.textMuted,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
    },
    priceMain: {
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.display.size, 30),
      lineHeight: safeNumber(theme.typography.scale.display.lineHeight, 38),
      fontWeight: "900",
      letterSpacing: -0.6,
    },
    priceSecondary: {
      color: c.textSub,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
    },

    detailSection: { marginBottom: s * 3 },
    accordionHeader: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: s * 3,
      borderTopWidth: 1,
      borderTopColor: c.borderDefault,
    },
    accordionTitle: {
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.detail.size, 14),
      lineHeight: safeNumber(theme.typography.scale.detail.lineHeight, 20),
      fontWeight: "900",
    },
    accordionRight: { flexDirection: "row", alignItems: "center", gap: s / 2 },
    accordionState: {
      color: c.textMuted,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
    },
    accordionChevron: { color: c.textMuted, fontSize: 16 },
    accordionBody: { paddingBottom: s * 2, gap: s * 2 },
    archiveCard: { backgroundColor: c.bgSurface },
    archiveInner: { padding: s * 4 },
    archiveTitle: {
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.detail.size, 14),
      lineHeight: safeNumber(theme.typography.scale.detail.lineHeight, 20),
      fontWeight: "900",
      marginBottom: s,
    },
    archiveRow: {
      minHeight: 38,
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: s * 2,
      paddingVertical: s,
      borderBottomWidth: 1,
      borderBottomColor: tint(c.textMain, 0.06, c.borderDefault),
    },
    archiveRowLast: { borderBottomWidth: 0, paddingBottom: 0 },
    archiveLabelWrap: { width: "38%", flexDirection: "row", alignItems: "center", gap: s },
    archiveLabelIcon: { color: c.textSub, fontSize: 14 },
    archiveLabel: {
      flex: 1,
      color: c.textMuted,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
    },
    archiveValue: {
      flex: 1,
      textAlign: "right",
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.detail.size, 14),
      lineHeight: safeNumber(theme.typography.scale.detail.lineHeight, 20),
      fontWeight: "700",
    },

    bottomBar: {
      backgroundColor: c.bgSurface,
      paddingHorizontal: s * 5,
      paddingTop: s * 2,
      borderTopLeftRadius: safeNumber(theme.layout.radii.card, 16),
      borderTopRightRadius: safeNumber(theme.layout.radii.card, 16),
      shadowColor: c.textMain,
      shadowOffset: { width: 0, height: -3 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
      elevation: 14,
    },
    bottomPlaceholder: {
      minHeight: 46,
      borderRadius: safeNumber(theme.layout.radii.card, 12),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tint(c.textMain, 0.04, c.bgMain),
    },
    bottomPlaceholderText: {
      color: c.textMuted,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
    },
    bottomButton: { minHeight: 48 },
  });
});

function readRouteParamText(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw.trim() : "";
}

function parsePositiveInt(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function parsePositiveIntParam(value: string | string[] | undefined): number {
  return parsePositiveInt(readRouteParamText(value));
}

function toText(value: unknown): string {
  return String(value ?? "").trim();
}

function toDisplayText(value: unknown): string {
  const text = toText(value);
  return text || "-";
}

function toPositiveAmount(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.trunc(parsed);
}

function resolvePriceSummary(quote: QuoteDetailQuote): PriceSummary {
  const uiState = getCustomerUiStateFromBackendStatus(toText(quote.status));
  const desired = toPositiveAmount(quote.desiredPrice);
  const finalPrice = toPositiveAmount(quote.finalPrice);
  const estimated = toPositiveAmount(quote.basePrice) + toPositiveAmount(quote.distancePrice) + toPositiveAmount(quote.extraPrice);
  // 결제 금액(source of truth)과 화면 금액을 일치시킨다.
  const estimatedAmount = finalPrice > 0 ? finalPrice : estimated;
  const isCompleted = uiState === CUSTOMER_UI_STATE.COMPLETED;

  if (isCompleted && finalPrice > 0) {
    return {
      primaryLabel: "정산 금액",
      primaryText: formatKrw(finalPrice),
      secondaryText: desired > 0 ? `희망 운임 ${formatKrw(desired)}` : "",
    };
  }

  if (desired > 0) {
    return {
      primaryLabel: "희망 운임",
      primaryText: formatKrw(desired),
      secondaryText: estimatedAmount > 0 ? `예상 금액 ${formatKrw(estimatedAmount)}` : "",
    };
  }

  return {
    primaryLabel: "예상 금액",
    primaryText: formatKrw(estimatedAmount),
    secondaryText: "",
  };
}

function normalizeMatchStatus(value: unknown): string {
  const text = toText(value);
  if (!text) return "";
  const normalized = normalizeStatus(text);
  return normalized === BACKEND_STATUS.UNKNOWN ? "" : normalized;
}

function resolveEffectiveQuoteStatus(quoteStatus: unknown, matchStatus: unknown, matchAccepted?: unknown): string {
  const quoteText = toText(quoteStatus);
  const quoteNormalized = normalizeStatus(quoteText);
  const normalizedMatchStatus = normalizeMatchStatus(matchStatus);
  if (!normalizedMatchStatus) return quoteText;

  // READY는 배차요청 직후(accepted=false)와 배차수락 후(accepted=true)를 구분해야 한다.
  if (normalizedMatchStatus === BACKEND_STATUS.READY && matchAccepted !== true) {
    return quoteText || normalizedMatchStatus;
  }

  if (STATUS_PROMOTION_SOURCE_STATES.has(quoteNormalized) && STATUS_PROMOTION_TARGET_STATES.has(normalizedMatchStatus)) {
    return normalizedMatchStatus;
  }

  return quoteText || normalizedMatchStatus;
}

function isCanceledMatchStatus(value: unknown): boolean {
  return normalizeMatchStatus(value) === BACKEND_STATUS.CANCELLED;
}

function toUpdatedAtTime(value: unknown): number {
  const raw = toText(value);
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
    const matchQuoteId = parsePositiveInt((match as { quoteId?: unknown }).quoteId);
    if (matchQuoteId !== safeQuoteId) continue;
    const updatedAt = toUpdatedAtTime((match as { updatedAt?: unknown }).updatedAt);
    const canceled = isCanceledMatchStatus((match as { status?: unknown }).status);
    const cancelable = (match as { cancelable?: unknown }).cancelable === true;
    if (!canceled && cancelable && updatedAt >= cancelableUpdatedAt) {
      cancelableMatch = match;
      cancelableUpdatedAt = updatedAt;
    }
    if (!canceled && updatedAt >= nonCanceledUpdatedAt) {
      nonCanceledMatch = match;
      nonCanceledUpdatedAt = updatedAt;
    }
  }
  return { cancelableMatch, nonCanceledMatch };
}

function normalizeArchiveSections(input: QuoteDetailView["specificationArchive"]): ArchiveSection[] {
  const out: ArchiveSection[] = [];
  input.forEach((section, idx) => {
    const title = toDisplayText(section.title);
    const rows = section.rows.map((row) => ({ label: toDisplayText(row.label), value: toDisplayText(row.value) }));
    if (!VEHICLE_SECTION_TITLES.has(title)) {
      out.push({ key: `${title}-${idx}`, title, rows: rows.length ? rows : [{ label: "정보", value: "-" }] });
      return;
    }
    const vehicleRows = rows.filter((row) => VEHICLE_ROW_LABELS.has(row.label));
    const cargoRows = rows.filter((row) => !VEHICLE_ROW_LABELS.has(row.label));
    if (vehicleRows.length) out.push({ key: `vehicle-${idx}`, title: "차량 정보", rows: vehicleRows });
    if (cargoRows.length) out.push({ key: `cargo-${idx}`, title: "화물 정보", rows: cargoRows });
  });
  return out;
}

function resolveArchiveIcon(sectionTitle: string, rowLabel: string): keyof typeof Ionicons.glyphMap | null {
  if (!VEHICLE_SECTION_TITLES.has(sectionTitle)) return null;
  if (rowLabel === "화물") return "cube-outline";
  if (rowLabel === "차량") return "bus-outline";
  if (rowLabel === "차종") return "car-sport-outline";
  if (rowLabel === "차량 번호") return "car-outline";
  if (rowLabel === "화물 설명") return "document-text-outline";
  if (rowLabel === "중량") return "git-network-outline";
  if (rowLabel === "부피") return "layers-outline";
  if (rowLabel === "톤수") return "speedometer-outline";
  return null;
}

function buildRouteNodes(core: QuoteDetailCoreSummary): RouteNode[] {
  const nodes: RouteNode[] = [{ key: "origin", title: "출발지", address: toDisplayText(core.originAddress), kind: "origin" }];
  const waypointCount = core.waypointAddresses.filter((address) => toText(address).length > 0).length;
  if (waypointCount > 0) nodes.push({ key: "waypoint", title: `경유지 ${waypointCount}곳`, address: "", kind: "waypoint" });
  nodes.push({ key: "destination", title: "도착지", address: toDisplayText(core.destinationAddress), kind: "destination" });
  return nodes;
}

function CounterOfferCard({ offer }: { offer: CounterOfferItem }) {
  const styles = useStyles();
  return (
    <View style={styles.counterOfferSection}>
      <AppCard elevated={false} style={styles.counterOfferCard}>
        <View style={styles.counterOfferHeader}>
          <View style={styles.counterOfferBadge}>
            <AppText style={styles.counterOfferBadgeText}>기사 역제안</AppText>
          </View>
          <AppText style={styles.counterOfferTitle}>기사가 운임을 제안했습니다</AppText>
        </View>
        <View>
          <AppText style={styles.counterOfferPriceLabel}>제안 금액</AppText>
          <AppText style={styles.counterOfferPrice}>{formatKrw(offer.proposedPrice)}</AppText>
        </View>
        {offer.message ? (
          <>
            <View style={styles.counterOfferDivider} />
            <View>
              <AppText style={styles.counterOfferMessageLabel}>제안 사유</AppText>
              <AppText style={styles.counterOfferMessage}>{offer.message}</AppText>
            </View>
          </>
        ) : null}
      </AppCard>
    </View>
  );
}

function RouteFlowCard({ coreSummary }: { coreSummary: QuoteDetailCoreSummary }) {
  const styles = useStyles();
  const nodes = React.useMemo(() => buildRouteNodes(coreSummary), [coreSummary]);
  return (
    <View style={styles.routeSection}>
      <AppText style={styles.sectionTitle}>운송 경로</AppText>
      <AppCard elevated={false} style={styles.routeCard}>
        <View style={styles.routeInner}>
          {nodes.map((node, index) => {
            const isLast = index === nodes.length - 1;
            const isWaypoint = node.kind === "waypoint";
            return (
              <View key={node.key} style={styles.routeRow}>
                <View style={styles.routeRail}>
                  <View
                    style={[
                      styles.routeDot,
                      node.kind === "origin" && styles.routeDotOrigin,
                      node.kind === "waypoint" && styles.routeDotWaypoint,
                      node.kind === "destination" && styles.routeDotDestination,
                    ]}
                  />
                  {!isLast ? <View style={styles.routeLine} /> : null}
                </View>
                <View style={styles.routeBody}>
                  <AppText style={styles.routeNodeTitle}>{node.title}</AppText>
                  {isWaypoint ? <AppText style={styles.routeWaypointCaption}>중간 경유지를 포함한 운송입니다.</AppText> : null}
                  {!isWaypoint ? <AppText style={styles.routeAddress}>{node.address}</AppText> : null}
                </View>
              </View>
            );
          })}
        </View>
      </AppCard>
    </View>
  );
}

function SummaryCard({ view }: { view: QuoteDetailView }) {
  const styles = useStyles();
  const theme = useAppTheme();
  const palette = resolveTonePalette(theme, view.policy);
  const distanceText = formatDistance(view.quote.distanceKm);
  const loadText = toDisplayText(formatWorkMethodLabel(view.quote.loadMethod));
  const unloadText = toDisplayText(formatWorkMethodLabel(view.quote.unloadMethod));
  const price = React.useMemo(
    () => resolvePriceSummary(view.quote),
    [view.quote.basePrice, view.quote.desiredPrice, view.quote.distancePrice, view.quote.extraPrice, view.quote.finalPrice, view.quote.status]
  );
  return (
    <View style={styles.summarySection}>
      <AppCard elevated={false} style={[styles.summaryCard, { borderColor: palette.spotlightBorder, backgroundColor: palette.spotlightBg }]}>
        <View style={styles.summaryInner}>
          <View style={styles.summaryTop}>
            <View style={[styles.summaryChip, { backgroundColor: palette.iconChipBg, borderColor: palette.iconChipBorder }]}>
              <Ionicons name="information-circle-outline" style={[styles.summaryIcon, { color: palette.iconColor }]} />
            </View>
            <AppText style={[styles.summaryEyebrow, { color: palette.badgeText }]}>운송 요약</AppText>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryLeft}>
              <Ionicons name="git-network-outline" style={styles.summaryIcon} />
              <AppText style={styles.summaryLabel}>운송 거리</AppText>
            </View>
            <AppText style={styles.summaryValue}>{distanceText}</AppText>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryLeft}>
              <Ionicons name="cube-outline" style={styles.summaryIcon} />
              <AppText style={styles.summaryLabel}>상차 방식</AppText>
            </View>
            <AppText style={styles.summaryValue}>{loadText}</AppText>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryLeft}>
              <Ionicons name="exit-outline" style={styles.summaryIcon} />
              <AppText style={styles.summaryLabel}>하차 방식</AppText>
            </View>
            <AppText style={styles.summaryValue}>{unloadText}</AppText>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.priceWrap}>
            {price.primaryLabel ? <AppText style={styles.priceLabel}>{price.primaryLabel}</AppText> : null}
            <AppText style={[styles.priceMain, { color: palette.emphasisText }]}>{price.primaryText}</AppText>
            {price.secondaryText ? <AppText style={styles.priceSecondary}>{price.secondaryText}</AppText> : null}
          </View>
        </View>
      </AppCard>
    </View>
  );
}

function SpecificationArchive({ view }: { view: QuoteDetailView }) {
  const styles = useStyles();
  const [open, setOpen] = React.useState(false);
  const sections = React.useMemo(() => normalizeArchiveSections(view.specificationArchive), [view.specificationArchive]);
  const toggle = React.useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((prev) => !prev);
  }, []);
  return (
    <View style={styles.detailSection}>
      <Pressable onPress={toggle} style={styles.accordionHeader}>
        <AppText style={styles.accordionTitle}>요청 상세 정보</AppText>
        <View style={styles.accordionRight}>
          <AppText style={styles.accordionState}>{open ? "접기" : "보기"}</AppText>
          <Ionicons name={open ? "chevron-up" : "chevron-down"} style={styles.accordionChevron} />
        </View>
      </Pressable>
      {open ? (
        <View style={styles.accordionBody}>
          {sections.map((section) => (
            <AppCard key={section.key} elevated={false} style={styles.archiveCard}>
              <View style={styles.archiveInner}>
                <AppText style={styles.archiveTitle}>{section.title}</AppText>
                {section.rows.map((row, rowIndex) => {
                  const iconName = resolveArchiveIcon(section.title, row.label);
                  return (
                    <View key={`${section.key}-${row.label}-${rowIndex}`} style={[styles.archiveRow, rowIndex === section.rows.length - 1 && styles.archiveRowLast]}>
                      <View style={styles.archiveLabelWrap}>
                        {iconName ? <Ionicons name={iconName} style={styles.archiveLabelIcon} /> : null}
                        <AppText style={styles.archiveLabel}>{row.label}</AppText>
                      </View>
                      <AppText style={styles.archiveValue}>{row.value}</AppText>
                    </View>
                  );
                })}
              </View>
            </AppCard>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function QuoteDetailPage() {
  const styles = useStyles();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[]; status?: string | string[] }>();

  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isMatchSubmitting, setIsMatchSubmitting] = React.useState(false);
  const [matchSnapshot, setMatchSnapshot] = React.useState<MatchSnapshot>(EMPTY_MATCH_SNAPSHOT);
  const [matchHydrated, setMatchHydrated] = React.useState(false);
  const [bottomBarHeight, setBottomBarHeight] = React.useState(140);
  const [pendingCounterOffer, setPendingCounterOffer] = React.useState<CounterOfferItem | null>(null);
  const matchLoadTokenRef = React.useRef(0);
  const focusRefetchMetaRef = React.useRef({ hasFocusedOnce: false, lastRefetchAt: 0 });
  const refreshInFlightRef = React.useRef<Promise<void> | null>(null);

  const quoteIdentifier = readRouteParamText(params.id);
  const routeQuoteId = parsePositiveIntParam(params.id);
  const view = useQuoteDetail(quoteIdentifier);
  const actionQuoteId = React.useMemo(() => {
    const fromView = parsePositiveInt(view.quote.quoteId);
    return fromView > 0 ? fromView : routeQuoteId;
  }, [routeQuoteId, view.quote.quoteId]);

  const isBlockedByFetchState = view.isLoading || Boolean(view.errorMessage);
  const activeQuoteMatch = React.useMemo(
    () => matchSnapshot.cancelableMatch ?? matchSnapshot.nonCanceledMatch ?? null,
    [matchSnapshot.cancelableMatch, matchSnapshot.nonCanceledMatch]
  );
  const hasActiveQuoteMatch = Boolean(activeQuoteMatch);
  const cancelTargetMatchId = React.useMemo(() => parsePositiveInt(activeQuoteMatch?.matchId), [activeQuoteMatch?.matchId]);
  const isCancelIdInvalid = hasActiveQuoteMatch && cancelTargetMatchId <= 0;
  const routeStatus = readRouteParamText(params.status);

  const effectiveQuoteStatus = React.useMemo(
    () => {
      const base = routeStatus || (matchHydrated ? view.quote.status : BACKEND_STATUS.UNKNOWN);
      const matchStatus = matchHydrated ? activeQuoteMatch?.status : null;
      const matchAccepted = matchHydrated ? activeQuoteMatch?.accepted : null;
      return resolveEffectiveQuoteStatus(base, matchStatus, matchAccepted);
    },
    [activeQuoteMatch?.accepted, activeQuoteMatch?.status, matchHydrated, routeStatus, view.quote.status]
  );
  const effectivePolicy = React.useMemo(() => getQuoteActionPolicy(effectiveQuoteStatus), [effectiveQuoteStatus]);
  const effectiveActionsContext = React.useMemo(
    () => ({ ...view.actionsContext, status: effectiveQuoteStatus }),
    [effectiveQuoteStatus, view.actionsContext]
  );
  const quoteUiState = React.useMemo(
    () => getCustomerUiStateFromBackendStatus(effectiveQuoteStatus),
    [effectiveQuoteStatus]
  );
  const palette = resolveTonePalette(theme, effectivePolicy);
  const effectiveStatusLabel = effectivePolicy.badgeLabel || view.commandCenter.statusLabel;

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

  const loadPendingCounterOffer = React.useCallback(async (targetQuoteId: number) => {
    const safeQuoteId = parsePositiveInt(targetQuoteId);
    if (safeQuoteId <= 0) {
      setPendingCounterOffer(null);
      return;
    }
    try {
      const offers = await listShipperCounterOffers(safeQuoteId);
      const pending = offers.find((o) => isCounterOfferPending(o.status)) ?? null;
      setPendingCounterOffer(pending);
    } catch {
      setPendingCounterOffer(null);
    }
  }, []);

  const refreshQuoteAndMatchData = React.useCallback(async () => {
    if (refreshInFlightRef.current) {
      await refreshInFlightRef.current;
      return;
    }

    const task = (async () => {
      const tasks: Array<Promise<unknown>> = [view.refetch()];
      if (actionQuoteId > 0) {
        tasks.push(loadMatchSnapshot(actionQuoteId));
        tasks.push(loadPendingCounterOffer(actionQuoteId));
      }
      await Promise.all(tasks);
    })();

    refreshInFlightRef.current = task;
    try {
      await task;
    } finally {
      if (refreshInFlightRef.current === task) {
        refreshInFlightRef.current = null;
      }
    }
  }, [actionQuoteId, loadMatchSnapshot, loadPendingCounterOffer, view.refetch]);

  React.useEffect(() => {
    if (actionQuoteId > 0) {
      void loadPendingCounterOffer(actionQuoteId);
    } else {
      setPendingCounterOffer(null);
    }
  }, [actionQuoteId, loadPendingCounterOffer]);

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

  useFocusEffect(
    React.useCallback(() => {
      if (actionQuoteId <= 0) return undefined;

      const focusMeta = focusRefetchMetaRef.current;
      if (!focusMeta.hasFocusedOnce) {
        focusMeta.hasFocusedOnce = true;
        return undefined;
      }

      const now = Date.now();
      if (now - focusMeta.lastRefetchAt < FOCUS_REFETCH_THROTTLE_MS) return undefined;
      focusMeta.lastRefetchAt = now;

      void refreshQuoteAndMatchData();
      return undefined;
    }, [actionQuoteId, refreshQuoteAndMatchData])
  );

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

  const handleCancelMatch = React.useCallback(async () => {
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

  const resolvePendingCounterOfferId = React.useCallback(async () => {
    if (actionQuoteId <= 0) return 0;
    const offers = await listShipperCounterOffers(actionQuoteId);
    const pendingOffer = offers.find((offer) => isCounterOfferPending(offer.status));
    return parsePositiveInt(pendingOffer?.counterOfferId);
  }, [actionQuoteId]);

  const runPolicyAction = React.useCallback(
    async (action: QuoteDecisionAction, _ctx: QuoteActionsContext) => {
      if (isMatchSubmitting) return;

      if (action === "acceptOffer") {
        try {
          setIsMatchSubmitting(true);
          const offerId = await resolvePendingCounterOfferId();
          if (offerId <= 0) {
            Alert.alert("협상 제안 수락", "대기 중인 역제안을 찾을 수 없습니다.");
            return;
          }
          await acceptShipperCounterOffer(offerId);
          await refreshQuoteAndMatchData();
          Alert.alert("협상 제안 수락", "역제안을 수락했습니다.");
        } catch (error) {
          Alert.alert("협상 제안 수락 실패", readApiErrorMessage(error));
        } finally {
          setIsMatchSubmitting(false);
        }
        return;
      }

      if (action === "rejectOffer") {
        try {
          setIsMatchSubmitting(true);
          const offerId = await resolvePendingCounterOfferId();
          if (offerId <= 0) {
            Alert.alert("협상 제안 거절", "대기 중인 역제안을 찾을 수 없습니다.");
            return;
          }
          await rejectShipperCounterOffer(offerId);
          await refreshQuoteAndMatchData();
          Alert.alert("협상 제안 거절", "역제안을 거절했습니다.");
        } catch (error) {
          Alert.alert("협상 제안 거절 실패", readApiErrorMessage(error));
        } finally {
          setIsMatchSubmitting(false);
        }
        return;
      }

      if (action === "reRequestRoute") {
        router.push("/(shipper)/quotes/create");
        return;
      }

      if (action === "pay") {
        Alert.alert("결제", "결제 플로우는 다음 단계에서 연결됩니다.");
      }
    },
    [isMatchSubmitting, refreshQuoteAndMatchData, resolvePendingCounterOfferId, router]
  );

  const handlePolicyCancelRequest = React.useCallback(
    (_payload: { quoteId: number; reason: string }) => {
      void handleCancelMatch();
    },
    [handleCancelMatch]
  );

  const handlePressEdit = React.useCallback(() => {
    if (isBlockedByFetchState) return;
    const preferredIdentifier = toText(view.quote.quotePublicId || quoteIdentifier);
    const routeIdentifier = preferredIdentifier || (actionQuoteId > 0 ? String(actionQuoteId) : "");
    if (!routeIdentifier) {
      Alert.alert("수정 이동 실패", "유효한 견적 ID를 찾을 수 없습니다.");
      return;
    }
    router.push({ pathname: "/(shipper)/quotes/edit/[id]", params: { id: routeIdentifier } });
  }, [actionQuoteId, isBlockedByFetchState, quoteIdentifier, router, view.quote.quotePublicId]);

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
      { text: "삭제", style: "destructive", onPress: () => void runDelete() },
    ]);
  }, [isBlockedByFetchState, isDeleting, runDelete]);

  const handleOpenManageMenu = React.useCallback(() => {
    if (isBlockedByFetchState || isDeleting) return;
    Alert.alert("견적 관리", "작업을 선택해 주세요.", [
      { text: "취소", style: "cancel" },
      { text: "수정", onPress: handlePressEdit },
      { text: "삭제", style: "destructive", onPress: handlePressDelete },
    ]);
  }, [handlePressDelete, handlePressEdit, isBlockedByFetchState, isDeleting]);

  const handleDetailErrorRetry = React.useCallback(() => {
    if (view.isSessionExpired) {
      router.replace("/(auth)/login");
      return;
    }
    void view.refetch();
  }, [router, view.isSessionExpired, view.refetch]);

  React.useEffect(() => {
    initLayoutAnimationForAndroid();
  }, []);

  const spacing = safeNumber(theme.layout.spacing.base, 4);
  const shouldUsePolicyActionBar = POLICY_ACTION_UI_STATES.has(quoteUiState) && Boolean(effectivePolicy.bottomBar);
  const isDriveInProgress =
    quoteUiState === CUSTOMER_UI_STATE.PICKUP_IN_PROGRESS || quoteUiState === CUSTOMER_UI_STATE.TRANSIT_IN_PROGRESS;
  const bottomTitle = hasActiveQuoteMatch ? "배차 요청 취소" : "배차 요청";
  const bottomVariant = React.useMemo(() => {
    if (hasActiveQuoteMatch) return "destructive";
    if (quoteUiState === CUSTOMER_UI_STATE.UNKNOWN) return "secondary";
    return "primary";
  }, [hasActiveQuoteMatch, quoteUiState]);
  const handlePressBottomAction = React.useCallback(() => {
    if (hasActiveQuoteMatch) {
      void handleCancelMatch();
      return;
    }
    void handleCreateMatch();
  }, [handleCancelMatch, handleCreateMatch, hasActiveQuoteMatch]);

  const bottomBar = !isBlockedByFetchState ? (
    <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing * 2 }]} onLayout={(e) => {
      const nextHeight = e?.nativeEvent?.layout?.height;
      if (!nextHeight) return;
      setBottomBarHeight((prev) => Math.max(prev, nextHeight));
    }}>
{!matchHydrated ? (
        <AppButton
          title="배차 상태 확인 중..."
          variant="secondary"
          style={styles.bottomButton}
          disabled
        />
      ) : shouldUsePolicyActionBar ? (
        <BottomActionRouter
          ctx={effectiveActionsContext}
          bottomBar={effectivePolicy.bottomBar}
          guards={effectivePolicy.guards}
          onCancelRequest={handlePolicyCancelRequest}
          onRunAction={(action, ctx) => runPolicyAction(action, ctx)}
        />
      ) : (
        <AppButton
          title={isDriveInProgress ? (quoteUiState === CUSTOMER_UI_STATE.PICKUP_IN_PROGRESS ? "상차 진행 중..." : "운송 진행 중...") : bottomTitle}
          variant={isDriveInProgress ? "secondary" : bottomVariant}
          style={styles.bottomButton}
          onPress={handlePressBottomAction}
          loading={isMatchSubmitting}
          disabled={isDriveInProgress || isMatchSubmitting || (hasActiveQuoteMatch && isCancelIdInvalid) || actionQuoteId <= 0}
        />
      )}
    </View>
  ) : null;

  return (
    <PageScaffold
      title="견적 상세"
      backgroundColor={theme.colors.bgMain}
      contentStyle={StyleSheet.flatten([styles.pageContent, { paddingBottom: bottomBarHeight + spacing * 3 }])}
      onPressBack={() => router.back()}
      backLabel="이전"
      headerRight={
        <AppButton size="icon" variant="secondary" accessibilityLabel="견적 관리 메뉴" onPress={handleOpenManageMenu} disabled={isBlockedByFetchState || isDeleting}>
          <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.textMain} />
        </AppButton>
      }
      bottomBar={bottomBar}
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
          <View style={styles.statusSection}>
            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, { backgroundColor: palette.badgeBg, borderColor: palette.badgeBorder }]}>
                <AppText style={[styles.statusText, { color: palette.badgeText }]} numberOfLines={1}>
                  {effectiveStatusLabel}
                </AppText>
              </View>
              <AppText style={styles.statusMeta} numberOfLines={1}>
                {view.commandCenter.metaText || `#${view.quote.quoteId || routeQuoteId}`}
              </AppText>
            </View>
            {view.commandCenter.cancelReasonText ? (
              <View style={styles.cancelBox}>
                <View style={styles.cancelRow}>
                  <Ionicons name="alert-circle" style={styles.cancelIcon} />
                  <AppText style={styles.cancelLabel}>취소 사유</AppText>
                  <AppText style={styles.cancelValue}>{view.commandCenter.cancelReasonText}</AppText>
                </View>
                <View style={styles.cancelRow}>
                  <Ionicons name="time-outline" style={styles.cancelIcon} />
                  <AppText style={styles.cancelLabel}>취소 시간</AppText>
                  <AppText style={styles.cancelValue}>{toDisplayText(view.commandCenter.canceledAtText)}</AppText>
                </View>
              </View>
            ) : null}
          </View>
          {pendingCounterOffer ? <CounterOfferCard offer={pendingCounterOffer} /> : null}
          <RouteFlowCard coreSummary={view.coreSummary} />
          <SummaryCard view={view} />
          <SpecificationArchive view={view} />
        </>
      </AppRequestState>
    </PageScaffold>
  );
}
