// src/pages/shipper/ShipperHomePage.tsx
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, View, type TextStyle, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { clamp01, safeNumber, safeString, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppEmptyState } from "@/shared/ui/kit/AppEmptyState";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

type HomeFilter = "all" | "pending" | "payment" | "moving" | "completed";
type BadgeTone = "orange" | "blue" | "mint" | "gray";
type CardTone = "default" | "actionRequired" | "paymentRequired";

type FeedItem = {
  id: string;
  status: Exclude<HomeFilter, "all">;
  badgeTone: BadgeTone;
  cardTone: CardTone;
  badge: string;
  hint: string;
  title: string;
  from: string;
  to: string;
  statusText: string;
  cta: string;
  progress?: number;
  metaHint?: string;
};

const VIEW_PRESSED: ViewStyle = { opacity: 0.84 };
const FAB_PRESSED: ViewStyle = { transform: [{ scale: 0.95 }] };

const SAMPLE_ITEMS: FeedItem[] = [
  {
    id: "pending-offer",
    status: "pending",
    badgeTone: "orange",
    cardTone: "actionRequired",
    badge: "금액 제안",
    hint: "응답 필요",
    title: "240,000원 금액 제안이 도착했어요",
    from: "경기 성남",
    to: "충북 청주",
    statusText: "기사님 대기 중",
    cta: "제안 보기",
  },
  {
    id: "payment-confirmed",
    status: "payment",
    badgeTone: "blue",
    cardTone: "paymentRequired",
    badge: "배차 확정",
    hint: "결제 대기",
    title: "배차가 확정됐어요",
    from: "인천 남동구",
    to: "대전 유성",
    statusText: "5톤 윙바디",
    cta: "결제하기",
  },
  {
    id: "moving-loading",
    status: "moving",
    badgeTone: "mint",
    cardTone: "default",
    badge: "상차 진행",
    hint: "기사님 도착",
    title: "상차 진행 중입니다",
    from: "서울 강남",
    to: "부산 해운대",
    statusText: "상차 작업 확인",
    cta: "상차 사진 보기",
    progress: 0.2,
  },
  {
    id: "moving-onroute",
    status: "moving",
    badgeTone: "mint",
    cardTone: "default",
    badge: "이동 중",
    hint: "도착 예정 14:30",
    title: "이동 중입니다",
    from: "경기 평택",
    to: "전남 여수",
    statusText: "실시간 관제 중",
    cta: "위치 보기",
    progress: 0.65,
  },
  {
    id: "pending-matching",
    status: "pending",
    badgeTone: "orange",
    cardTone: "default",
    badge: "배차 중",
    hint: "자동 매칭",
    title: "배차 중입니다",
    from: "서울 마포",
    to: "경기 고양",
    statusText: "기사님들에게 요청 전송됨",
    cta: "현황 보기",
    metaHint: "진행 상황은 실시간으로 갱신됩니다",
  },
  {
    id: "completed-finish",
    status: "completed",
    badgeTone: "gray",
    cardTone: "default",
    badge: "운송 완료",
    hint: "2월 5일 도착",
    title: "운송이 완료됐어요",
    from: "강원 원주",
    to: "서울 송파",
    statusText: "최종 확인 필요",
    cta: "인수증 보기",
  },
];

const FILTER_TITLES: Record<HomeFilter, string> = {
  all: "최근 현황",
  pending: "배차/제안 목록",
  payment: "결제 대기 목록",
  moving: "운송 중 목록",
  completed: "완료된 목록",
};

const useStyles = createThemedStyles((theme) => {
  const border = safeString(theme?.colors?.borderDefault, "#E5E7EB");
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const controlRadius = safeNumber(theme?.layout?.radii?.control, 12);
  const pillRadius = safeNumber(theme?.layout?.radii?.pill, 999);

  const cardPadding = safeNumber(theme?.components?.card?.paddingMd, 20);
  const cardPaddingLg = safeNumber((theme?.components?.card as any)?.paddingLg, 24);
  const cardRadius = safeNumber(theme?.components?.card?.radius, safeNumber(theme?.layout?.radii?.card, 20));

  return StyleSheet.create({
    heroBlock: {
      marginTop: spacing * 2,
      marginBottom: spacing * 4,
    },
    heroSubtitle: {
      marginTop: spacing,
    },

    balanceCard: {
      borderRadius: cardRadius,
      padding: cardPaddingLg,
      marginBottom: spacing * 4,
      overflow: "hidden",
    },
    balanceOverlayPrimary: {
      ...StyleSheet.absoluteFillObject,
      opacity: 0.15,
      borderRadius: cardRadius,
    },
    balanceOverlaySecondary: {
      position: "absolute",
      width: 180,
      height: 180,
      borderRadius: 90,
      top: -82,
      right: -58,
      opacity: 0.16,
    },
    balanceRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    balanceLeft: {
      flex: 1,
      marginRight: spacing * 3,
    },
    balanceValue: {
      marginTop: spacing,
    },
    chargeButton: {
      paddingHorizontal: spacing * 3,
      paddingVertical: spacing * 2,
      borderRadius: pillRadius,
      alignItems: "center",
      justifyContent: "center",
    },

    statGrid: {
      flexDirection: "row",
      marginBottom: spacing * 4,
    },
    statTile: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "transparent",
      borderRadius: controlRadius,
      paddingVertical: spacing * 3,
      marginRight: spacing * 2,
    },
    statTileLast: { marginRight: 0 },
    statTileActive: { transform: [{ translateY: -2 }] },
    statCount: { marginBottom: 2 },

    listHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing * 3,
      paddingHorizontal: 2,
    },
    listHeaderButton: {
      paddingHorizontal: spacing * 2,
      paddingVertical: spacing + 1,
      borderRadius: controlRadius,
    },

    // AppCard가 외형(배경/테두리/섀도우)을 담당 -> 여기선 spacing만
    feedCard: {
      marginBottom: spacing * 3,
    },
    feedInner: {
      padding: cardPadding,
    },

    feedTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing * 3,
    },
    badgeWrap: {
      paddingHorizontal: spacing * 2,
      paddingVertical: spacing + 1,
      borderRadius: 8,
    },

    routeRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: spacing * 3,
    },
    routeCol: { flex: 1 },
    routeColRight: { alignItems: "flex-end" },
    routeArrow: {
      width: 24,
      alignItems: "center",
      justifyContent: "center",
      marginHorizontal: spacing * 2,
    },

    progressTrack: {
      marginTop: spacing * 3,
      height: 4,
      borderRadius: 2,
      overflow: "hidden",
      backgroundColor: tint(border, 0.35, "rgba(229,231,235,0.35)"),
    },
    progressFill: { height: "100%", borderRadius: 2 },

    metaHint: { marginTop: spacing * 3 },

    footerRow: {
      marginTop: spacing * 3,
      paddingTop: spacing * 3,
      borderTopWidth: 1,
      borderTopColor: tint(border, 0.1, "rgba(0,0,0,0.06)"),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    ctaButton: {
      paddingVertical: spacing,
      paddingHorizontal: spacing,
      borderRadius: 10,
    },

    bottomSpacer: { height: spacing * 4 },
    fab: {
      width: 56,
      height: 56,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
  });
});

export function ShipperHomePage() {
  const theme = useAppTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  const cText = safeString(theme?.colors?.textMain, "#111827");
  const cSub = safeString(theme?.colors?.textSub, "#6B7280");
  const cMuted = safeString(theme?.colors?.textMuted, "#9CA3AF");
  const cOnBrand = safeString(theme?.colors?.textOnBrand, "#FFFFFF");

  const cSurface = safeString(theme?.colors?.bgSurface, "#FFFFFF");
  const cSurfaceAlt = safeString(theme?.colors?.bgSurfaceAlt, "#F3F4F6");
  const cBorder = safeString(theme?.colors?.borderDefault, "#E5E7EB");

  const cPrimary = safeString(theme?.colors?.brandPrimary, "#FF6A00");
  const cPayment = safeString(theme?.colors?.brandSecondary, "#3B82F6");
  const cMint = safeString(theme?.colors?.brandAccent, "#00E5A8");
  const cCharcoal = safeString(theme?.colors?.textMain, "#111827");

  const hintColor = useMemo(() => tint(cText, 0.62, "rgba(17,24,39,0.62)"), [cText]);
  const subtitleColor = useMemo(() => tint(cSub, 0.98, cSub), [cSub]);

  const [filter, setFilter] = useState<HomeFilter>("all");

  const counts = useMemo(() => {
    const map: Record<Exclude<HomeFilter, "all">, number> = {
      pending: 0,
      payment: 0,
      moving: 0,
      completed: 0,
    };

    for (const item of SAMPLE_ITEMS ?? []) {
      const key = item?.status;
      if (key && key in map) map[key] += 1;
    }

    return map;
  }, []);

  const filteredItems = useMemo(() => {
    if (filter === "all") return SAMPLE_ITEMS ?? [];
    return (SAMPLE_ITEMS ?? []).filter((item) => item?.status === filter);
  }, [filter]);

  const listTitle = FILTER_TITLES?.[filter] ?? "최근 현황";
  const bottomInset = Math.max(0, safeNumber(insets?.bottom, 0));

  const floating = (
    <Pressable
      onPress={() => {}}
      accessibilityRole="button"
      accessibilityLabel="새 요청 만들기"
      style={({ pressed }) => [
        styles.fab,
        {
          backgroundColor: cPrimary,
          marginBottom: Math.max(0, bottomInset - 8),
        },
        pressed ? FAB_PRESSED : undefined,
      ]}
    >
      <Ionicons name="add" size={26} color={cOnBrand} />
    </Pressable>
  );

  return (
    <PageScaffold title="Rodia" floating={floating} backgroundColor={cSurfaceAlt}>
      <View style={styles.heroBlock}>
        <AppText variant="title" weight="800">
          반가워요, 화주님 👋
        </AppText>
        <View style={styles.heroSubtitle}>
          <AppText variant="detail" color={subtitleColor}>
            오늘의 물류 현황을 확인하세요.
          </AppText>
        </View>
      </View>

      <View style={[styles.balanceCard, { backgroundColor: tint(cCharcoal, 0.95, "#0F172A") }]}>
        <View style={[styles.balanceOverlayPrimary, { backgroundColor: cPayment }]} />
        <View style={[styles.balanceOverlaySecondary, { backgroundColor: cMint }]} />

        <View style={styles.balanceRow}>
          <View style={styles.balanceLeft}>
            <AppText variant="caption" color={tint(cOnBrand, 0.85, "rgba(255,255,255,0.85)")}>
              예치금 잔액
            </AppText>
            <View style={styles.balanceValue}>
              <AppText variant="title" weight="800" color={cOnBrand}>
                2,500,000 P
              </AppText>
            </View>
          </View>

          <Pressable
            onPress={() => {}}
            accessibilityRole="button"
            accessibilityLabel="충전"
            style={({ pressed }) => [
              styles.chargeButton,
              { backgroundColor: tint(cOnBrand, 0.2, "rgba(255,255,255,0.2)") },
              pressed ? VIEW_PRESSED : undefined,
            ]}
          >
            <AppText variant="caption" weight="800" color={cOnBrand}>
              + 충전
            </AppText>
          </Pressable>
        </View>
      </View>

      <View style={styles.statGrid}>
        <StatTile
          label="배차/제안"
          value={counts?.pending}
          active={filter === "pending"}
          numberColor={cPrimary}
          labelColor={cMuted}
          backgroundColor={cSurface}
          borderColor={cText}
          onPress={() => setFilter("pending")}
          styles={styles}
        />
        <StatTile
          label="결제대기"
          value={counts?.payment}
          active={filter === "payment"}
          numberColor={cPayment}
          labelColor={cMuted}
          backgroundColor={cSurface}
          borderColor={cText}
          onPress={() => setFilter("payment")}
          styles={styles}
        />
        <StatTile
          label="운송중"
          value={counts?.moving}
          active={filter === "moving"}
          numberColor={cMint}
          labelColor={cMuted}
          backgroundColor={cSurface}
          borderColor={cText}
          onPress={() => setFilter("moving")}
          styles={styles}
        />
        <StatTile
          label="완료/인수"
          value={counts?.completed}
          active={filter === "completed"}
          numberColor={tint(cText, 0.8, cText)}
          labelColor={cMuted}
          backgroundColor={cSurface}
          borderColor={cText}
          onPress={() => setFilter("completed")}
          styles={styles}
          isLast
        />
      </View>

      <View style={styles.listHeader}>
        <AppText variant="heading" weight="800">
          {listTitle}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="전체보기"
          onPress={() => setFilter("all")}
          style={({ pressed }) => [styles.listHeaderButton, pressed ? VIEW_PRESSED : undefined]}
        >
          <AppText variant="caption" weight="800" color={hintColor}>
            전체보기
          </AppText>
        </Pressable>
      </View>

      {filteredItems?.length ? (
        filteredItems.map((item, idx) => (
          <FeedCard
            key={safeString(item?.id, `item-${idx}`)}
            item={item}
            styles={styles}
            palette={{
              text: cText,
              hint: hintColor,
              border: cBorder,
              pending: cPrimary,
              payment: cPayment,
              moving: cMint,
            }}
          />
        ))
      ) : (
        <AppEmptyState
          fullScreen={false}
          title="표시할 현황이 없어요"
          description="선택한 조건에 맞는 운송 건이 없습니다."
          action={{ label: "전체보기", onPress: () => setFilter("all") }}
        />
      )}

      <View style={styles.bottomSpacer} />
    </PageScaffold>
  );
}

function StatTile(props: {
  label: string;
  value: number;
  active: boolean;
  numberColor: string;
  labelColor: string;
  backgroundColor: string;
  borderColor: string;
  onPress: () => void;
  styles: ReturnType<typeof useStyles>;
  isLast?: boolean;
}) {
  const { label, value, active, numberColor, labelColor, backgroundColor, borderColor, onPress, styles, isLast } = props;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.statTile,
        isLast ? styles.statTileLast : undefined,
        { backgroundColor, borderColor: active ? borderColor : "transparent" },
        active ? styles.statTileActive : undefined,
        pressed ? VIEW_PRESSED : undefined,
      ]}
    >
      <AppText variant="heading" size={20} weight="800" color={numberColor} style={styles.statCount}>
        {String(Math.max(0, safeNumber(value, 0)))}
      </AppText>
      <AppText variant="caption" size={11} weight="700" color={labelColor}>
        {label}
      </AppText>
    </Pressable>
  );
}

function FeedCard(props: {
  item: FeedItem;
  styles: ReturnType<typeof useStyles>;
  palette: {
    text: string;
    hint: string;
    border: string;
    pending: string;
    payment: string;
    moving: string;
  };
}) {
  const { item, styles, palette } = props;

  const badgeToneColor =
    item?.badgeTone === "orange"
      ? palette.pending
      : item?.badgeTone === "blue"
      ? palette.payment
      : item?.badgeTone === "mint"
      ? palette.moving
      : tint(palette.text, 0.75, palette.text);

  const badgeBg =
    item?.badgeTone === "orange"
      ? tint(palette.pending, 0.12, "rgba(255,106,0,0.12)")
      : item?.badgeTone === "blue"
      ? tint(palette.payment, 0.11, "rgba(59,130,246,0.11)")
      : item?.badgeTone === "mint"
      ? tint(palette.moving, 0.12, "rgba(0,229,168,0.12)")
      : tint(palette.border, 0.45, "rgba(229,231,235,0.45)");

  const ctaColor =
    item?.status === "pending"
      ? palette.pending
      : item?.status === "payment"
      ? palette.payment
      : item?.status === "moving"
      ? palette.text
      : tint(palette.text, 0.75, palette.text);

  const progressValue = clamp01(safeNumber(item?.progress, 0));
  const tone: CardTone = (item?.cardTone ?? "default") as CardTone;

  return (
    <AppCard tone={tone} elevated outlined={false} style={styles.feedCard}>
      <View style={styles.feedInner}>
        <View style={styles.feedTopRow}>
          <View style={[styles.badgeWrap, { backgroundColor: badgeBg }]}>
            <AppText variant="caption" weight="800" style={{ color: badgeToneColor } as TextStyle}>
              {safeString(item?.badge, "-")}
            </AppText>
          </View>

          <AppText variant="caption" weight="800" color={badgeToneColor}>
            {safeString(item?.hint, "")}
          </AppText>
        </View>

        <AppText variant="heading" size={16} weight="800" color={palette.text}>
          {safeString(item?.title, "")}
        </AppText>

        <View style={styles.routeRow}>
          <View style={styles.routeCol}>
            <AppText variant="caption" color={palette.hint}>
              출발
            </AppText>
            <AppText variant="body" weight="800" color={palette.text}>
              {safeString(item?.from, "")}
            </AppText>
          </View>

          <View style={styles.routeArrow}>
            <Ionicons name="arrow-forward" size={14} color={palette.hint} />
          </View>

          <View style={[styles.routeCol, styles.routeColRight]}>
            <AppText variant="caption" color={palette.hint}>
              도착
            </AppText>
            <AppText variant="body" weight="800" color={palette.text}>
              {safeString(item?.to, "")}
            </AppText>
          </View>
        </View>

        {typeof item?.progress === "number" ? (
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.round(progressValue * 100)}%`,
                  backgroundColor: palette.moving,
                },
              ]}
            />
          </View>
        ) : null}

        {safeString(item?.metaHint, "").length > 0 ? (
          <View style={styles.metaHint}>
            <AppText variant="caption" color={palette.hint}>
              {safeString(item?.metaHint, "")}
            </AppText>
          </View>
        ) : null}

        <View style={styles.footerRow}>
          <AppText variant="detail" color={palette.hint}>
            {safeString(item?.statusText, "")}
          </AppText>

          <Pressable
            onPress={() => {}}
            accessibilityRole="button"
            accessibilityLabel={safeString(item?.cta, "")}
            style={({ pressed }) => [styles.ctaButton, pressed ? VIEW_PRESSED : undefined]}
          >
            <AppText variant="detail" weight="800" color={ctaColor}>
              {safeString(item?.cta, "")}
            </AppText>
          </Pressable>
        </View>
      </View>
    </AppCard>
  );
}

export default ShipperHomePage;

// 1) 목록 카드의 "내부 회색 프레임"은 Android 렌더링 artifact(반투명 배경 + elevation + 1px border) 케이스가 많습니다.
// 2) AppCard에서 tone 배경을 불투명 HEX로 블렌딩하고, borderWidth는 필요할 때만 적용하도록 변경했습니다.
// 3) 스타일 덮어쓰기 순서를 고정해(톤/bg/border을 마지막 적용) 카드 일관성과 재발 가능성을 낮췄습니다.
