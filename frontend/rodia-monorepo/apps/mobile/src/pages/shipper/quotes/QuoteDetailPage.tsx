// app/quote/[id].tsx (or wherever QuoteDetailPage lives)
import React from "react";
import { Alert, KeyboardAvoidingView, LayoutAnimation, Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { cancelShipperMatch, listMyShipperMatches } from "@/features/matching/api";
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
import { AppInput } from "@/shared/ui/kit/AppInput";
import { AppSpinner } from "@/shared/ui/kit/AppSpinner";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

type QuoteDetailView = ReturnType<typeof useQuoteDetail>;

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
    manageActionsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing * 2,
    },
    manageActionButton: {
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
    overviewTitle: {
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.heading.size, 18),
      lineHeight: safeNumber(theme.typography.scale.heading.lineHeight, 24),
      fontWeight: "900",
      letterSpacing: -0.3,
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

    highlightLine: {
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.detail.size, 14),
      lineHeight: safeNumber(theme.typography.scale.detail.lineHeight, 20),
      fontWeight: "700",
    },
    highlightRow: {
      minHeight: 24,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing,
    },
    highlightIcon: {
      color: c.textSub,
      fontSize: 14,
    },

    actionsContainer: {
      marginTop: spacing,
      gap: spacing * 2,
    },
    quickActionsRow: {
      flexDirection: "row",
      gap: spacing * 2,
    },
    actionButton: {
      flex: 1,
    },
    cancelInlineWrapper: {
      paddingTop: spacing * 2,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: tint(c.textMain, 0.08, c.borderDefault),
    },
    cancelInlineButton: {
      minHeight: 44,
    },
    cancelInlineIcon: {
      color: c.textSub,
      fontSize: 18,
    },
    cancelInlineText: {
      color: c.textSub,
    },
    footnote: {
      color: c.textSub,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "600",
      marginTop: spacing,
      textAlign: "center",
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
    archiveLabel: {
      width: "35%",
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

    cancelModalOverlay: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: spacing * 4,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    cancelModalSheet: {
      width: "100%",
    },
    cancelModalCard: {
      borderWidth: 0,
      backgroundColor: c.bgSurface,
      borderRadius: safeNumber(theme.layout.radii.card, 16) + 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 10,
    },
    cancelModalContent: {
      padding: spacing * 5,
      gap: spacing * 3,
    },
    cancelModalHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing * 2,
      marginBottom: spacing,
    },
    cancelModalIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: tint(c.semanticWarning, 0.1, c.bgSurface),
      alignItems: "center",
      justifyContent: "center",
    },
    cancelModalIcon: {
      color: c.semanticWarning,
      fontSize: 22,
    },
    cancelModalTitle: {
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.heading.size, 18) + 2,
      lineHeight: safeNumber(theme.typography.scale.heading.lineHeight, 24) + 4,
      fontWeight: "900",
      letterSpacing: -0.4,
    },
    cancelModalDesc: {
      color: c.textSub,
      fontSize: safeNumber(theme.typography.scale.detail.size, 14),
      lineHeight: safeNumber(theme.typography.scale.detail.lineHeight, 20),
      fontWeight: "600",
      marginBottom: spacing,
    },
    cancelModalActions: {
      flexDirection: "row",
      gap: spacing * 2,
      marginTop: spacing * 2,
    },
  });
});

function parseRouteIdentifier(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw.trim() : "";
}

function parsePositiveIntParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function resolveSpotlightIconName(type: QuoteDetailView["highlight"]["type"]): keyof typeof Ionicons.glyphMap {
  if (type === "priceCompare") return "pricetag-outline";
  if (type === "driverProfile") return "person-circle-outline";
  if (type === "miniMap") return "navigate-outline";
  if (type === "progressInfo") return "time-outline";
  if (type === "proof") return "checkmark-circle-outline";
  return "information-circle-outline";
}

function resolveQuickActionLabel(action: BottomActionId): string {
  if (action === "callDriver") return "기사님 연락";
  if (action === "viewPickupPhotos") return "상차 사진";
  if (action === "viewLiveLocation") return "실시간 위치";
  if (action === "viewPOD") return "인수증 보기";
  return "확인";
}

function runQuickAction(action: BottomActionId, view: QuoteDetailView) {
  const origin = view.actionsContext?.originAddress ?? "출발지";
  const dest = view.actionsContext?.destinationAddress ?? "도착지";

  if (action === "callDriver") {
    Alert.alert("기사님 연락", "기사님에게 연락을 시도합니다.");
    return;
  }

  if (action === "viewPickupPhotos") {
    Alert.alert("상차 사진", "상차 사진을 불러옵니다.");
    return;
  }

  if (action === "viewLiveLocation") {
    Alert.alert("실시간 위치", `${origin}에서 ${dest}까지 운송 위치를 확인합니다.`);
    return;
  }

  if (action === "viewPOD") {
    Alert.alert("인수증", "인수증을 확인합니다.");
    return;
  }

  Alert.alert("안내", "준비 중인 기능입니다.");
}

function buildWaypointText(waypoints: string[]): string {
  const list = Array.isArray(waypoints) ? waypoints.filter(Boolean) : [];
  if (list.length === 0) return "";
  if (list.length === 1) return `경유지 1곳: ${list[0]}`;
  return `경유지 ${list.length}곳: ${list[0]} 외 ${list.length - 1}곳`;
}

function resolvePriceLabel(view: QuoteDetailView): string {
  const status = view.quote?.status ?? "";
  const type = view.highlight?.type ?? "none";

  if (type === "driverProfile") return "결제 금액";
  if (type === "proof") return "최종 운임";
  if (status === "CANCELED") return "운임";
  return "운임";
}

function toWorkMethodLabel(value: unknown): string {
  const raw = String(value ?? "").trim();
  const normalized = raw.toUpperCase();
  if (normalized === "SHIPPER") return "화주";
  if (normalized === "DRIVER") return "기사";
  if (!raw) return "정보 없음";
  return raw;
}

function OverviewCard({
  view,
  showCancelButton,
  onPressCancel,
}: {
  view: QuoteDetailView;
  showCancelButton?: boolean;
  onPressCancel?: () => void;
}) {
  const styles = useStyles();
  const theme = useAppTheme();
  const palette = resolveTonePalette(theme, view.policy);
  const iconName = resolveSpotlightIconName(view.highlight?.type ?? "none");

  const quickActions = view.highlight?.quickActions ?? [];
  const waypoints = view.coreSummary?.waypointAddresses ?? [];
  const waypointText = buildWaypointText(waypoints);

  const origin = view.coreSummary?.originAddress ?? "";
  const dest = view.coreSummary?.destinationAddress ?? "";
  const distanceText = view.coreSummary?.distanceText ?? "거리 정보 없음";
  const loadMethodText = toWorkMethodLabel(view.quote?.loadMethod);
  const unloadMethodText = toWorkMethodLabel(view.quote?.unloadMethod);
  const completedAtText = (view.coreSummary?.completedAtText ?? "").trim();
  const isCompleted = (view.quote?.status ?? "") === "DROPOFF";

  const isPriceCompare = (view.highlight?.type ?? "none") === "priceCompare";
  const isCanceled = (view.quote?.status ?? "") === "CANCELED";
  const hasPriceText = Boolean((view.coreSummary?.totalPriceText ?? "").trim());
  const showPriceSummary = !isPriceCompare && !isCanceled && hasPriceText;

  const highlightLines = Array.isArray(view.highlight?.lines) ? view.highlight.lines.filter(Boolean) : [];
  const title = (view.highlight?.title ?? "").trim();
  const eyebrow = (view.highlight?.eyebrow ?? "").trim() || "운송 요약";
  const footnote = (view.highlight?.footnote ?? "").trim();
  const note = (view.coreSummary?.totalPriceNote ?? "").trim();

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
          <AppText style={[styles.eyebrow, { color: palette.badgeText }]}>{eyebrow}</AppText>
        </View>

        {title ? <AppText style={styles.overviewTitle}>{title}</AppText> : null}

        <View style={styles.routeRow}>
          <AppText style={styles.routeAddress} numberOfLines={1}>
            {origin || "출발지 정보 없음"}
          </AppText>
          <Ionicons name="arrow-forward" style={styles.routeArrow} />
          <AppText style={styles.routeAddress} numberOfLines={1}>
            {dest || "도착지 정보 없음"}
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

        {showPriceSummary ? (
          <View>
            <View style={styles.metricRow}>
              <View style={styles.metricLeft}>
                <Ionicons
                  name={isCompleted ? "wallet-outline" : "cash-outline"}
                  style={[styles.metricIcon, { color: palette.iconColor }]}
                />
                <AppText style={styles.metricLabel}>{resolvePriceLabel(view)}</AppText>
              </View>
              {isCompleted && completedAtText ? (
                <View style={styles.metricLeft}>
                  <Ionicons name="checkmark-done-circle-outline" style={[styles.metricIcon, { color: palette.iconColor }]} />
                  <AppText style={styles.metricValue}>{completedAtText}</AppText>
                </View>
              ) : (
                <AppText style={styles.metricValue}>{note || "세부 요금은 아래에서 확인할 수 있습니다."}</AppText>
              )}
            </View>
            <AppText style={[styles.priceValue, { color: palette.emphasisText }]}>{view.coreSummary?.totalPriceText ?? ""}</AppText>
          </View>
        ) : null}

        {highlightLines.length > 0
          ? highlightLines.slice(0, 4).map((line, index) => (
              <View key={`${line}-${index}`} style={styles.highlightRow}>
                <Ionicons name="information-circle-outline" style={styles.highlightIcon} />
                <AppText style={styles.highlightLine}>{line}</AppText>
              </View>
            ))
          : null}

        {/* 하단 액션 버튼 영역 (빠른 실행 및 취소 버튼 묶음 배치 개선) */}
        {(quickActions.length > 0 || showCancelButton || footnote) && (
          <View style={styles.actionsContainer}>
            {quickActions.length > 0 ? (
              <View style={styles.quickActionsRow}>
                {quickActions.map((action) => (
                  <AppButton
                    key={action}
                    title={resolveQuickActionLabel(action)}
                    variant="secondary"
                    style={styles.actionButton}
                    onPress={() => runQuickAction(action, view)}
                  />
                ))}
              </View>
            ) : null}

            {showCancelButton ? (
              <View style={[styles.cancelInlineWrapper, quickActions.length === 0 && { borderTopWidth: 0, paddingTop: 0 }]}>
                <AppButton
                  title="요청 취소"
                  variant="secondary"
                  style={styles.cancelInlineButton}
                  textStyle={styles.cancelInlineText}
                  left={<Ionicons name="trash-outline" style={styles.cancelInlineIcon} />}
                  onPress={onPressCancel}
                />
              </View>
            ) : null}

            {footnote ? <AppText style={styles.footnote}>{footnote}</AppText> : null}
          </View>
        )}
      </View>
    </AppCard>
  );
}

function SpecificationArchive({ view }: { view: QuoteDetailView }) {
  const styles = useStyles();
  const [open, setOpen] = React.useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((prev) => !prev);
  };

  const sections = Array.isArray(view.specificationArchive) ? view.specificationArchive : [];

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
          {sections.map((section, sectionIndex) => {
            const rows = Array.isArray(section.rows) ? section.rows : [];

            return (
              <AppCard key={`${section.title}-${sectionIndex}`} outlined elevated={false}>
                <View style={styles.archiveCardInner}>
                  <AppText style={styles.archiveTitle}>{section.title}</AppText>
                  {rows.map((row, rowIndex) => (
                    <View
                      key={`${section.title}-${row.label}-${rowIndex}`}
                      style={[styles.archiveRow, rowIndex === rows.length - 1 && styles.archiveRowLast]}
                    >
                      <AppText style={styles.archiveLabel}>{row.label}</AppText>
                      <AppText style={styles.archiveValue}>{row.value}</AppText>
                    </View>
                  ))}
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
  const params = useLocalSearchParams<{ id?: string | string[]; matchId?: string | string[] }>();
  const [showCancelModal, setShowCancelModal] = React.useState(false);
  const [cancelReasonInput, setCancelReasonInput] = React.useState("");
  const [cancelReasonError, setCancelReasonError] = React.useState<string | undefined>(undefined);
  const [isCancelSubmitting, setIsCancelSubmitting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const quoteIdentifier = parseRouteIdentifier(params?.id);
  const quoteId = parsePositiveIntParam(params?.id);
  const view = useQuoteDetail(quoteIdentifier);
  const isBlockedByFetchState = view.isLoading || Boolean(view.errorMessage);
  const palette = isBlockedByFetchState ? null : resolveTonePalette(theme, view.policy);
  const hasCancelAction =
    !isBlockedByFetchState &&
    (view.policy.bottomBar?.primary === "cancelRequest" || view.policy.bottomBar?.secondary === "cancelRequest");
  const bottomBarWithoutCancel = React.useMemo(() => {
    if (isBlockedByFetchState) return null;

    const original = view.policy.bottomBar;
    if (!original) return null;

    const nextPrimary = original.primary === "cancelRequest" ? undefined : original.primary;
    const nextSecondary = original.secondary === "cancelRequest" ? undefined : original.secondary;

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
  const openCancelModal = React.useCallback(() => {
    if (isBlockedByFetchState) return;
    setShowCancelModal(true);
    setCancelReasonError(undefined);
  }, [isBlockedByFetchState]);
  const closeCancelModal = React.useCallback(() => {
    if (isCancelSubmitting) return;
    setShowCancelModal(false);
    setCancelReasonError(undefined);
  }, [isCancelSubmitting]);
  const resolveDirectMatchId = React.useCallback((): number => {
    const fromRoute = parsePositiveIntParam(params?.matchId);
    if (fromRoute > 0) return fromRoute;

    const fromQuote = Number((view.quote as unknown as { matchId?: unknown })?.matchId);
    if (Number.isInteger(fromQuote) && fromQuote > 0) return fromQuote;

    const fromActions = Number((view.actionsContext as unknown as { matchId?: unknown })?.matchId);
    if (Number.isInteger(fromActions) && fromActions > 0) return fromActions;

    return 0;
  }, [params?.matchId, view.actionsContext, view.quote]);
  const submitCancelModal = React.useCallback(async () => {
    if (isBlockedByFetchState || isCancelSubmitting) return;

    const safeQuoteId =
      Number.isInteger(view.actionsContext?.quoteId) && view.actionsContext.quoteId > 0 ? view.actionsContext.quoteId : 0;
    if (safeQuoteId <= 0) {
      setCancelReasonError("유효한 견적 정보를 찾을 수 없습니다.");
      return;
    }

    const trimmed = cancelReasonInput.trim();
    if (trimmed.length < 2) {
      setCancelReasonError("취소 사유를 2자 이상 입력해주세요.");
      return;
    }

    try {
      setIsCancelSubmitting(true);
      let targetMatchId = resolveDirectMatchId();

      if (targetMatchId <= 0) {
        const matches = await listMyShipperMatches();
        const safeMatches = Array.isArray(matches) ? matches : [];
        const sameQuoteMatches = safeMatches.filter((match) => {
          const quoteIdFromMatch = Number((match as { quoteId?: unknown })?.quoteId);
          const matchIdFromMatch = Number((match as { matchId?: unknown })?.matchId);
          return Number.isInteger(quoteIdFromMatch) && quoteIdFromMatch === safeQuoteId && Number.isInteger(matchIdFromMatch) && matchIdFromMatch > 0;
        });

        const preferred = sameQuoteMatches.find((match) => Boolean(match?.cancelable)) ?? sameQuoteMatches[0];
        targetMatchId = Number(preferred?.matchId ?? 0);
      }

      if (!Number.isInteger(targetMatchId) || targetMatchId <= 0) {
        setCancelReasonError("취소할 요청을 찾을 수 없습니다.");
        return;
      }

      await cancelShipperMatch(targetMatchId);

      setShowCancelModal(false);
      setCancelReasonInput("");
      setCancelReasonError(undefined);
      Alert.alert("요청 취소", "취소 요청이 처리되었습니다.", [
        {
          text: "확인",
          onPress: () => router.replace("/(shipper)/matchings"),
        },
      ]);
    } catch (error) {
      Alert.alert("요청 취소 실패", readErrorMessage(error));
    } finally {
      setIsCancelSubmitting(false);
    }
  }, [cancelReasonInput, isBlockedByFetchState, isCancelSubmitting, readErrorMessage, resolveDirectMatchId, router, view.actionsContext]);
  const resolveActionQuoteId = React.useCallback(() => {
    const fromView = Number(view.quote?.quoteId);
    if (Number.isInteger(fromView) && fromView > 0) return fromView;
    if (Number.isInteger(quoteId) && quoteId > 0) return quoteId;
    return 0;
  }, [quoteId, view.quote?.quoteId]);
  const handlePressEdit = React.useCallback(() => {
    if (isBlockedByFetchState) return;
    const targetQuoteId = resolveActionQuoteId();
    if (targetQuoteId <= 0) {
      Alert.alert("수정 이동 실패", "유효한 견적 ID를 찾을 수 없습니다.");
      return;
    }

    router.push({ pathname: "/(shipper)/quotes/edit/[id]", params: { id: String(targetQuoteId) } });
  }, [isBlockedByFetchState, resolveActionQuoteId, router]);
  const runDelete = React.useCallback(async () => {
    if (isDeleting || isBlockedByFetchState) return;

    const targetQuoteId = resolveActionQuoteId();
    if (targetQuoteId <= 0) {
      Alert.alert("견적 삭제 실패", "유효한 견적 ID를 찾을 수 없습니다.");
      return;
    }

    try {
      setIsDeleting(true);
      await deleteShipperQuote(targetQuoteId);
      router.replace("/(shipper)/quotes");
    } catch (error) {
      Alert.alert("견적 삭제 실패", readErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  }, [isBlockedByFetchState, isDeleting, readErrorMessage, resolveActionQuoteId, router]);
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

  return (
    <PageScaffold
      title="견적 상세"
      backgroundColor={theme.colors.bgMain}
      contentStyle={styles.pageContent}
      bottomBar={
        bottomBarWithoutCancel ? (
          <BottomActionRouter
            ctx={view.actionsContext}
            bottomBar={bottomBarWithoutCancel}
            guards={view.policy.guards}
          />
        ) : null
      }
      onPressBack={() => router.back()}
      backLabel="이전"
    >
      {view.isLoading ? (
        <AppSpinner label="견적 상세를 불러오는 중입니다." />
      ) : view.errorMessage ? (
        <AppErrorState
          title="견적 상세를 불러오지 못했어요"
          description={view.errorMessage}
          retryLabel="다시 시도"
          onRetry={view.refetch}
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

            {!isBlockedByFetchState ? (
              <View style={styles.manageActionsRow}>
                <AppButton
                  title="수정"
                  variant="secondary"
                  style={styles.manageActionButton}
                  onPress={handlePressEdit}
                />
                <AppButton
                  title="삭제"
                  variant="destructive"
                  style={styles.manageActionButton}
                  onPress={handlePressDelete}
                  loading={isDeleting}
                />
              </View>
            ) : null}

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
                  <AppText style={styles.cancelSummaryValue}>{view.commandCenter.canceledAtText || "시간 정보 없음"}</AppText>
                </View>
              </View>
            ) : null}
          </View>

          <OverviewCard view={view} showCancelButton={hasCancelAction} onPressCancel={openCancelModal} />
          <SpecificationArchive view={view} />

          <Modal transparent visible={showCancelModal} animationType="fade" onRequestClose={closeCancelModal}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.cancelModalOverlay}>
              <Pressable style={StyleSheet.absoluteFill} onPress={isCancelSubmitting ? undefined : closeCancelModal} />
              <View style={styles.cancelModalSheet}>
                <AppCard outlined elevated={false} style={styles.cancelModalCard}>
                  <View style={styles.cancelModalContent}>
                    <View style={styles.cancelModalHeader}>
                      <View style={styles.cancelModalIconContainer}>
                        <Ionicons name="warning" style={styles.cancelModalIcon} />
                      </View>
                      <AppText style={styles.cancelModalTitle}>요청 취소</AppText>
                    </View>
                    <AppText style={styles.cancelModalDesc}>
                      요청을 취소하시겠습니까? 취소 사유를 입력하면 즉시 취소 상태로 변경됩니다.
                    </AppText>

                    <AppInput
                      label="취소 사유"
                      placeholder="예) 다른 운송 수단 이용, 일정 변경 등"
                      value={cancelReasonInput}
                      onChangeText={(text) => {
                        setCancelReasonInput(text);
                        if (cancelReasonError) setCancelReasonError(undefined);
                      }}
                      error={cancelReasonError}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                      maxLength={200}
                    />

                    <View style={styles.cancelModalActions}>
                      <AppButton
                        title="닫기"
                        variant="secondary"
                        style={styles.actionButton}
                        onPress={closeCancelModal}
                        disabled={isCancelSubmitting}
                      />
                      <AppButton
                        title="취소 확정"
                        variant="destructive"
                        style={styles.actionButton}
                        onPress={submitCancelModal}
                        loading={isCancelSubmitting}
                        disabled={isCancelSubmitting}
                      />
                    </View>
                  </View>
                </AppCard>
              </View>
            </KeyboardAvoidingView>
          </Modal>
        </>
      )}
    </PageScaffold>
  );
}
