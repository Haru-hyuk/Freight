// app/quote/[id].tsx (or wherever QuoteDetailPage lives)
import React from "react";
import { Alert, LayoutAnimation, Pressable, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { resolveTonePalette, type BottomActionId } from "@/features/quote/model/quoteActionMatrix";
import { useQuoteDetail } from "@/features/quote/model/useQuoteDetail";
import { BottomActionRouter } from "@/features/quote/ui/actions/BottomActionRouter";
import { initLayoutAnimationForAndroid } from "@/shared/lib/ui/layoutAnimationInit";
import { safeNumber, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
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

    quickActionsRow: {
      marginTop: spacing,
      flexDirection: "row",
      gap: spacing * 2,
    },
    actionButton: {
      flex: 1,
    },
    footnote: {
      color: c.textSub,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "600",
      marginTop: spacing,
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
  });
});

function parseQuoteId(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 301;
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

function OverviewCard({ view }: { view: QuoteDetailView }) {
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
          <AppText style={styles.metricLabel}>운송 거리</AppText>
          <AppText style={styles.metricValue}>{distanceText}</AppText>
        </View>

        {showPriceSummary ? (
          <View>
            <View style={styles.metricRow}>
              <AppText style={styles.metricLabel}>{resolvePriceLabel(view)}</AppText>
              <AppText style={styles.metricValue}>{note || "세부 요금은 아래에서 확인할 수 있습니다."}</AppText>
            </View>
            <AppText style={[styles.priceValue, { color: palette.emphasisText }]}>{view.coreSummary?.totalPriceText ?? ""}</AppText>
          </View>
        ) : null}

        {highlightLines.length > 0
          ? highlightLines.slice(0, 4).map((line, index) => (
              <AppText key={`${line}-${index}`} style={styles.highlightLine}>
                {line}
              </AppText>
            ))
          : null}

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

        {footnote ? <AppText style={styles.footnote}>{footnote}</AppText> : null}
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
          {sections.map((section, sectionIndex) => (
            <AppCard key={`${section.title}-${sectionIndex}`} outlined elevated={false}>
              <View style={styles.archiveCardInner}>
                <AppText style={styles.archiveTitle}>{section.title}</AppText>
                {section.rows.map((row, rowIndex) => (
                  <View
                    key={`${section.title}-${row.label}-${rowIndex}`}
                    style={[styles.archiveRow, rowIndex === section.rows.length - 1 && styles.archiveRowLast]}
                  >
                    <AppText style={styles.archiveLabel}>{row.label}</AppText>
                    <AppText style={styles.archiveValue}>{row.value}</AppText>
                  </View>
                ))}
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
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();

  const quoteId = parseQuoteId(params?.id);
  const view = useQuoteDetail(quoteId);
  const palette = resolveTonePalette(theme, view.policy);

  React.useEffect(() => {
    initLayoutAnimationForAndroid();
  }, []);

  return (
    <PageScaffold
      title="견적 상세"
      backgroundColor={theme.colors.bgMain}
      contentStyle={styles.pageContent}
      bottomBar={<BottomActionRouter ctx={view.actionsContext} bottomBar={view.policy.bottomBar} guards={view.policy.guards} />}
      onPressBack={() => router.back()}
      backLabel="이전"
    >
      <View style={styles.commandCenter}>
        <View style={styles.statusRow}>
          <View style={styles.statusLeft}>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: palette.badgeBg,
                  borderColor: palette.badgeBorder,
                },
              ]}
            >
              <AppText style={[styles.statusText, { color: palette.badgeText }]} numberOfLines={1}>
                {view.commandCenter?.statusLabel ?? "진행 상태"}
              </AppText>
            </View>
          </View>

          <AppText style={styles.metaText} numberOfLines={1}>
            {view.commandCenter?.metaText ?? `#${view.quote?.quoteId ?? quoteId}`}
          </AppText>
        </View>
      </View>

      <OverviewCard view={view} />
      <SpecificationArchive view={view} />
    </PageScaffold>
  );
}