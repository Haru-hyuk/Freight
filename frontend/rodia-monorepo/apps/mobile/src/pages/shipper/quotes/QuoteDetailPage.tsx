// app/quote/[id].tsx
import React from "react";
import { Alert, InteractionManager, LayoutAnimation, Pressable, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cancelShipperMatch, createShipperMatch, listMyShipperMatches, type ShipperMatchItem } from "@/features/matching/api";
import { resolveTonePalette, type BottomActionId } from "@/features/quote/model/quoteActionMatrix";
import { useQuoteDetail } from "@/features/quote/model/useQuoteDetail";
import { deleteShipperQuote } from "@/features/quote/api";
import { BottomActionRouter } from "@/features/quote/ui/actions/BottomActionRouter";
import { initLayoutAnimationForAndroid } from "@/shared/lib/ui/layoutAnimationInit";
import { safeNumber, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppErrorState } from "@/shared/ui/kit/AppErrorState";
import { AppSpinner } from "@/shared/ui/kit/AppSpinner";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

type QuoteDetailView = ReturnType<typeof useQuoteDetail>;
type MatchSnapshot = {
  cancelableMatch: ShipperMatchItem | null;
  nonCanceledMatch: ShipperMatchItem | null;
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
      paddingBottom: spacing * 28,
      backgroundColor: c.bgMain,
    },

    commandCenter: {
      marginTop: spacing,
      marginBottom: spacing * 3,
      gap: spacing,
    },
    headerActionButton: {
      minHeight: 36,
      width: 36,
      borderRadius: 10,
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
    routeRow: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing + 2,
    },
    routeAddress: {
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
    waypointRow: {
      minHeight: 24,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing,
    },
    waypointIcon: {
      color: c.textSub,
      fontSize: 14,
    },
    waypointText: {
      flex: 1,
      color: c.textSub,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
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
    matchBottomWrap: {
      backgroundColor: c.bgSurface,
      borderTopWidth: 1,
      borderTopColor: c.borderDefault,
      paddingHorizontal: spacing * 5,
      paddingTop: spacing * 3,
    },
    matchBottomButton: {
      minHeight: 44,
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

function buildWaypointText(waypoints: string[]): string {
  const list = Array.isArray(waypoints) ? waypoints.filter(Boolean) : [];
  if (list.length === 0) return "";
  if (list.length === 1) return `경유지 1곳: ${list[0]}`;
  return `경유지 ${list.length}곳: ${list[0]} 외 ${list.length - 1}곳`;
}

function toTrimmedText(value: unknown): string {
  return String(value ?? "").trim();
}

function toWorkMethodLabel(value: unknown): string {
  const raw = toTrimmedText(value);
  const normalized = raw.toUpperCase();
  if (normalized === "SHIPPER") return "화주";
  if (normalized === "DRIVER") return "기사";
  if (!raw) return "-";
  return raw;
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

function isSupportedBottomAction(action?: BottomActionId): action is BottomActionId {
  return action === "pay" || action === "reRequestRoute";
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

function normalizeArchiveKey(value: unknown): string {
  return toTrimmedText(value).replace(/\s+/g, "").replace(/[·•]/g, "/");
}

const VEHICLE_CARGO_TITLE_SET = new Set(["차량/화물", "차량,화물", "차량화물", "차량/화물정보"]);
const CARGO_INFO_LABEL_SET = new Set(["화물", "화물명", "화물구분", "화물설명", "중량", "부피", "하차위치", "적재방식", "품목"]);
const CARGO_INFO_KEYWORD_SET = new Set(["화물", "중량", "부피", "하차", "적재", "품목"]);

function isVehicleCargoCombinedSectionTitle(title: unknown): boolean {
  const normalized = normalizeArchiveKey(title);
  if (!normalized) return false;
  if (VEHICLE_CARGO_TITLE_SET.has(normalized)) return true;
  return normalized.includes("차량") && normalized.includes("화물");
}

function isCargoInfoLabel(label: unknown): boolean {
  const normalized = normalizeArchiveKey(label);
  if (!normalized) return false;
  if (CARGO_INFO_LABEL_SET.has(normalized)) return true;
  for (const keyword of CARGO_INFO_KEYWORD_SET) {
    if (normalized.includes(keyword)) return true;
  }
  return false;
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

  if (normalizedLabel === "차량") return "bus-outline";
  if (normalizedLabel === "차종") return "car-sport-outline";
  if (normalizedLabel === "차량 번호") return "car-outline";
  if (normalizedLabel === "화물명") return "cube-outline";
  if (normalizedLabel === "화물 구분") return "pricetag-outline";
  if (normalizedLabel === "화물 설명") return "document-text-outline";
  if (normalizedLabel === "중량") return "git-network-outline";
  if (normalizedLabel === "부피") return "layers-outline";
  if (normalizedLabel === "하차 위치") return "navigate-outline";
  return null;
}

function OverviewCard({ view }: { view: QuoteDetailView }) {
  const styles = useStyles();
  const theme = useAppTheme();
  const palette = resolveTonePalette(theme, view.policy);
  const iconName: keyof typeof Ionicons.glyphMap = "information-circle-outline";
  const waypoints = view.coreSummary?.waypointAddresses ?? [];
  const waypointText = buildWaypointText(waypoints);

  const origin = view.coreSummary?.originAddress ?? "";
  const dest = view.coreSummary?.destinationAddress ?? "";
  const distanceText = formatDistanceText(view.quote?.distanceKm);
  const loadMethodText = toWorkMethodLabel(view.quote?.loadMethod);
  const unloadMethodText = toWorkMethodLabel(view.quote?.unloadMethod);
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

        <View style={styles.routeRow}>
          <AppText style={styles.routeAddress} numberOfLines={1}>
            {toDisplayDash(origin)}
          </AppText>
          <Ionicons name="arrow-forward" style={styles.routeArrow} />
          <AppText style={styles.routeAddress} numberOfLines={1}>
            {toDisplayDash(dest)}
          </AppText>
        </View>

        {waypointText ? (
          <View style={styles.waypointRow}>
            <Ionicons name="navigate-outline" style={styles.waypointIcon} />
            <AppText style={styles.waypointText} numberOfLines={1}>
              {waypointText}
            </AppText>
          </View>
        ) : null}

        <View style={styles.divider} />

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

      </View>
    </AppCard>
  );
}

function SpecificationArchive({ view }: { view: QuoteDetailView }) {
  const styles = useStyles();
  const [open, setOpen] = React.useState(true);
  type ArchiveRowItem = { label: string; value: string };
  type ArchiveSectionItem = { key: string; title: string; rows: ArchiveRowItem[] };

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((prev) => !prev);
  };

  const groupedSections = React.useMemo<ArchiveSectionItem[]>(() => {
    const sections = Array.isArray(view.specificationArchive) ? view.specificationArchive : [];
    const next: ArchiveSectionItem[] = [];

    sections.forEach((section, sectionIndex) => {
      const title = toDisplayDash((section as { title?: unknown })?.title);
      const rows = Array.isArray((section as { rows?: unknown })?.rows) ? ((section as { rows?: unknown[] }).rows ?? []) : [];
      const normalizedRows = rows.map((row) => ({
        label: toDisplayDash((row as { label?: unknown })?.label),
        value: normalizeArchiveRowValue((row as { value?: unknown })?.value),
      }));

      if (!isVehicleCargoCombinedSectionTitle(title)) {
        next.push({
          key: `${title}-${sectionIndex}`,
          title,
          rows: normalizedRows,
        });
        return;
      }

      const vehicleRows: ArchiveRowItem[] = [];
      const cargoRows: ArchiveRowItem[] = [];
      normalizedRows.forEach((row) => {
        if (isCargoInfoLabel(row.label)) {
          cargoRows.push(row);
          return;
        }
        vehicleRows.push(row);
      });

      if (vehicleRows.length > 0) {
        next.push({
          key: `vehicle-${sectionIndex}`,
          title: "차량 정보",
          rows: vehicleRows,
        });
      }

      if (cargoRows.length > 0) {
        next.push({
          key: `cargo-${sectionIndex}`,
          title: "화물 정보",
          rows: cargoRows,
        });
      }
    });

    return next;
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
  const insets = useSafeAreaInsets();
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
  const bottomBarWithoutCancel = React.useMemo(() => {
    if (isBlockedByFetchState) return null;

    const original = view.policy.bottomBar;
    if (!original) return null;

    const nextPrimary = isSupportedBottomAction(original.primary) ? original.primary : undefined;
    const nextSecondary = isSupportedBottomAction(original.secondary) ? original.secondary : undefined;

    if (!nextPrimary && !nextSecondary) return null;
    if (!nextPrimary && nextSecondary) return { primary: nextSecondary, secondary: undefined };
    return { primary: nextPrimary, secondary: nextSecondary };
  }, [view.policy.bottomBar, isBlockedByFetchState]);
  const readErrorMessage = React.useCallback((error: unknown) => {
    const fallback = "네트워크 또는 요청 값을 확인해주세요.";
    if (!error || typeof error !== "object") return fallback;

    const e = error as {
      response?: { data?: { message?: string; error?: string } };
      message?: string;
    };

    const serverMessage = e.response?.data?.message ?? e.response?.data?.error;
    if (typeof serverMessage === "string" && serverMessage.trim()) return serverMessage.trim();
    if (typeof e.message === "string" && e.message.trim()) return e.message.trim();
    return fallback;
  }, []);
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
      Alert.alert("배차 요청 실패", readErrorMessage(error));
    } finally {
      setIsMatchSubmitting(false);
    }
  }, [actionQuoteId, isMatchSubmitting, readErrorMessage, refreshQuoteAndMatchData]);

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
      Alert.alert("배차 취소 실패", readErrorMessage(error));
    } finally {
      setIsMatchSubmitting(false);
    }
  }, [cancelTargetMatchId, isMatchSubmitting, readErrorMessage, refreshQuoteAndMatchData]);

  const handleBottomAction = React.useCallback(
    async (action: BottomActionId) => {
      if (action === "pay") {
        const amount = Number.isFinite(view.actionsContext?.finalPrice) ? view.actionsContext.finalPrice : 0;
        Alert.alert("결제 진행", `${Math.max(0, Math.trunc(amount)).toLocaleString("ko-KR")}원 결제를 진행합니다.`);
        return;
      }

      if (action === "reRequestRoute") {
        router.push("/(shipper)/quotes/create");
        return;
      }

      Alert.alert("안내", "준비 중인 기능입니다.");
    },
    [router, view.actionsContext?.finalPrice]
  );
  const handlePressMatchBottomCta = React.useCallback(() => {
    if (hasActiveQuoteMatch) {
      void handleCancelMatchDirect();
      return;
    }
    void handleCreateMatch();
  }, [handleCancelMatchDirect, handleCreateMatch, hasActiveQuoteMatch]);
  const matchBottomPadding = React.useMemo(() => {
    const spacing = safeNumber(theme.layout.spacing.base, 4);
    if (bottomBarWithoutCancel) return spacing * 3;
    return Math.max(safeNumber(insets.bottom, 0) + 12, 18);
  }, [bottomBarWithoutCancel, insets.bottom, theme.layout.spacing.base]);
  const shouldRenderMatchBottomCta = matchHydrated && actionQuoteId > 0;
  const isMatchBottomLoading = isMatchSubmitting;
  const isMatchBottomDisabled = isMatchSubmitting || (hasActiveQuoteMatch && cancelTargetMatchId <= 0);
  const matchBottomTitle = hasActiveQuoteMatch ? "배차 취소" : "배차 요청";
  const matchBottomVariant = hasActiveQuoteMatch ? "destructive" : "primary";
  const matchBottomWrapStyle = React.useMemo(
    () => [styles.matchBottomWrap, { paddingBottom: matchBottomPadding }],
    [matchBottomPadding, styles.matchBottomWrap]
  );
  const bottomBarContent = React.useMemo(() => {
    if (isBlockedByFetchState) return null;
    if (!shouldRenderMatchBottomCta && !bottomBarWithoutCancel) return null;
    return (
      <View>
        {shouldRenderMatchBottomCta ? (
          <View style={matchBottomWrapStyle}>
            <AppButton
              title={matchBottomTitle}
              variant={matchBottomVariant}
              style={styles.matchBottomButton}
              onPress={handlePressMatchBottomCta}
              loading={isMatchBottomLoading}
              disabled={isMatchBottomDisabled}
            />
          </View>
        ) : null}

        {bottomBarWithoutCancel ? (
          <BottomActionRouter
            ctx={view.actionsContext}
            bottomBar={bottomBarWithoutCancel}
            guards={view.policy.guards}
            onRunAction={handleBottomAction}
          />
        ) : null}
      </View>
    );
  }, [
    bottomBarWithoutCancel,
    handleBottomAction,
    handlePressMatchBottomCta,
    isBlockedByFetchState,
    isMatchBottomDisabled,
    isMatchBottomLoading,
    matchBottomTitle,
    matchBottomVariant,
    matchBottomWrapStyle,
    shouldRenderMatchBottomCta,
    styles.matchBottomButton,
    view.actionsContext,
    view.policy.guards,
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
      Alert.alert("견적 삭제 실패", readErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  }, [actionQuoteId, isBlockedByFetchState, isDeleting, readErrorMessage, router]);
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
  const handlePressHeaderActions = React.useCallback(() => {
    if (isBlockedByFetchState || isDeleting) return;

    Alert.alert("견적 관리", "원하는 작업을 선택하세요.", [
      {
        text: "수정",
        onPress: handlePressEdit,
      },
      {
        text: "삭제",
        style: "destructive",
        onPress: handlePressDelete,
      },
      {
        text: "취소",
        style: "cancel",
      },
    ]);
  }, [handlePressDelete, handlePressEdit, isBlockedByFetchState, isDeleting]);

  React.useEffect(() => {
    initLayoutAnimationForAndroid();
  }, []);

  const handleDetailErrorRetry = React.useCallback(() => {
    if (view.isSessionExpired) {
      router.replace("/(auth)/login");
      return;
    }
    view.refetch();
  }, [router, view.isSessionExpired, view.refetch]);

  return (
    <PageScaffold
      title="견적 상세"
      backgroundColor={theme.colors.bgMain}
      contentStyle={styles.pageContent}
      bottomBar={bottomBarContent}
      onPressBack={() => router.back()}
      backLabel="이전"
      headerRight={
        !isBlockedByFetchState ? (
          <AppButton
            size="icon"
            variant="secondary"
            style={styles.headerActionButton}
            accessibilityLabel="견적 관리 액션 열기"
            onPress={handlePressHeaderActions}
            loading={isDeleting}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={theme?.colors?.textMain ?? "#0F172A"} />
          </AppButton>
        ) : undefined
      }
    >
      {view.isLoading ? (
        <AppSpinner label="견적 상세를 불러오는 중입니다." />
      ) : view.errorMessage ? (
        <AppErrorState
          title={view.isSessionExpired ? "세션이 만료되었습니다" : "견적 상세를 불러오지 못했어요"}
          description={view.isSessionExpired ? "세션이 만료되었습니다. 다시 로그인해 주세요." : view.errorMessage}
          retryLabel={view.isSessionExpired ? "로그인으로 이동" : "다시 시도"}
          onRetry={handleDetailErrorRetry}
          fullScreen={false}
        />
      ) : (
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

          <OverviewCard view={view} />

          <SpecificationArchive view={view} />
        </>
      )}
    </PageScaffold>
  );
}
