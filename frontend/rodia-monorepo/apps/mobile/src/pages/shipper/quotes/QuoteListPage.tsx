import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View, type TextStyle, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { safeNumber, safeString, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppEmptyState } from "@/shared/ui/kit/AppEmptyState";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

type QuoteStatus = "received" | "dispatching" | "negotiating" | "assigned" | "pickup" | "transit" | "dropoff";
type TabType = "ongoing" | "completed";
type CardVariant = "urgent" | "payment" | "moving" | "default";

type QuoteItem = {
  id: string;
  requestId?: string;
  updatedAt?: string;
  fromLabel: string;
  toLabel: string;
  cargoHint?: string;
  rightHint?: string;
  ctaLabel?: string;
  price?: string;
  status: QuoteStatus;
};

const SAMPLE_QUOTES: QuoteItem[] = [
  {
    id: "q-1",
    updatedAt: "2026-02-10T15:20:00Z",
    fromLabel: "경기 성남",
    toLabel: "충북 청주",
    cargoHint: "5톤 윙바디 · 독차",
    rightHint: "방금 전",
    ctaLabel: "제안 확인하기 >",
    status: "negotiating",
  },
  {
    id: "q-2",
    updatedAt: "2026-02-10T14:00:00Z",
    fromLabel: "인천 남동구",
    toLabel: "대전 유성",
    cargoHint: "5톤 윙 · 합짐",
    rightHint: "결제 대기",
    ctaLabel: "결제하기 >",
    status: "assigned",
  },
  {
    id: "q-3",
    updatedAt: "2026-02-10T11:00:00Z",
    fromLabel: "서울 강남",
    toLabel: "부산 해운대",
    cargoHint: "11톤 윙바디",
    rightHint: "14:00 도착 예정",
    ctaLabel: "위치 보기 >",
    status: "transit",
  },
  {
    id: "q-4",
    updatedAt: "2026-02-05T09:00:00Z",
    fromLabel: "강원 원주",
    toLabel: "서울 송파",
    cargoHint: "5톤 플러스",
    rightHint: "2월 5일",
    price: "220,000원",
    status: "dropoff",
  },
  {
    id: "q-5",
    updatedAt: "2026-01-28T18:00:00Z",
    fromLabel: "경기 평택",
    toLabel: "전남 여수",
    cargoHint: "컨테이너 40ft",
    rightHint: "1월 28일",
    price: "450,000원",
    status: "dropoff",
  },
];

const CARD_PRESS: ViewStyle = { opacity: 0.85, transform: [{ scale: 0.98 }] };

function getCardVariant(status: QuoteStatus, isCompletedTab: boolean): CardVariant {
  if (isCompletedTab) return "default";
  if (status === "negotiating") return "urgent";
  if (status === "assigned") return "payment";
  if (status === "pickup" || status === "transit") return "moving";
  return "default";
}

function getBadgeLabel(status: QuoteStatus, isCompletedTab: boolean): string {
  if (isCompletedTab) return "운송 완료";
  if (status === "negotiating") return "금액 제안 도착";
  if (status === "assigned") return "배차 확정";
  if (status === "transit") return "이동 중";
  if (status === "pickup") return "상차 중";
  return "접수";
}

const useStyles = createThemedStyles((theme) => {
  const colors = theme?.colors;
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);

  const cBgMain = safeString(colors?.bgMain, safeString(colors?.bgSurfaceAlt, safeString(colors?.bgSurface, "")));
  const cBgAlt = safeString(colors?.bgSurfaceAlt, cBgMain);
  const cSurface = safeString(colors?.bgSurface, cBgMain);
  const cTextMain = safeString(colors?.textMain, safeString(colors?.textSub, safeString(colors?.textMuted, "")));
  const cTextSub = safeString(colors?.textSub, cTextMain);
  const cTextMuted = safeString(colors?.textMuted, cTextSub);
  const cBorder = safeString(colors?.borderDefault, safeString(colors?.borderStrong, cBgAlt));
  const cPrimary = safeString(colors?.brandPrimary, cTextMain);
  const cSecondary = safeString(colors?.brandSecondary, cTextMain);
  const cAccent = safeString(colors?.brandAccent, cPrimary);
  const cOnBrand = safeString(colors?.textOnBrand, safeString(colors?.textInverse, cSurface));

  const cTrack = tint(cTextMain, 0.08, cBgAlt);
  const cTabCount = tint(cTextMain, 0.08, cBgAlt);
  const cCardBorder = tint(cBorder, 0.75, cBorder);
  const cCardDivider = tint(cBorder, 0.5, cBorder);
  const cArrow = tint(cTextMuted, 0.9, cTextMuted);
  const cBadgeUrgentBg = tint(cPrimary, 0.12, cBgAlt);
  const cBadgePaymentBg = tint(cSecondary, 0.1, cBgAlt);
  const cBadgeMovingBg = tint(cAccent, 0.12, cBgAlt);
  const cBadgeDoneBg = tint(cTextMain, 0.06, cBgAlt);

  const radiusCard = safeNumber(theme?.components?.card?.radius, safeNumber(theme?.layout?.radii?.card, 16));
  const radiusControl = safeNumber(theme?.layout?.radii?.control, 12);
  const cardPadding = safeNumber(theme?.components?.card?.paddingMd, 20);
  const fabSize = safeNumber(theme?.components?.button?.sizes?.lg?.minHeight, 52) + spacing;

  return StyleSheet.create({
    pageContent: {
      paddingTop: 0,
      paddingHorizontal: 0,
      paddingBottom: spacing * 20,
    },
    tabContainer: {
      paddingHorizontal: spacing * 5,
      paddingTop: spacing * 2,
      paddingBottom: spacing * 2,
      backgroundColor: cBgMain,
    },
    tabTrack: {
      flexDirection: "row",
      backgroundColor: cTrack,
      borderRadius: radiusControl,
      padding: spacing,
      gap: spacing,
    },
    tabItem: {
      flex: 1,
      minHeight: safeNumber(theme?.components?.button?.sizes?.sm?.minHeight, 36),
      borderRadius: radiusControl - Math.max(2, spacing / 2),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing + 2,
    },
    tabItemActive: {
      backgroundColor: cSurface,
      borderWidth: 1,
      borderColor: cCardBorder,
    },
    tabText: {
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14),
      fontWeight: "600",
      color: cTextSub,
    },
    tabTextActive: {
      fontWeight: "700",
      color: cTextMain,
    },
    tabCount: {
      backgroundColor: cTabCount,
      minWidth: spacing * 6,
      height: spacing * 6,
      paddingHorizontal: spacing + 2,
      borderRadius: (spacing * 6) / 2,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: cCardBorder,
      overflow: "hidden",
    },
    tabCountActive: {
      backgroundColor: cPrimary,
      borderColor: cPrimary,
    },
    tabCountText: {
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12) - 1,
      fontWeight: "700",
      color: cTextSub,
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16),
    },
    tabCountTextActive: {
      color: cOnBrand,
    },

    sectionList: {
      paddingHorizontal: spacing * 5,
      paddingTop: spacing * 2,
    },
    sectionLabelRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing * 3,
      marginTop: spacing * 5,
    },
    sectionLabel: {
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14),
      fontWeight: "700",
      color: cTextMain,
    },
    sectionCount: {
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14),
      fontWeight: "700",
      color: cPrimary,
    },

    cardPressable: {
      borderRadius: radiusCard,
      overflow: "hidden",
      marginBottom: spacing * 3,
    },
    card: {
      borderRadius: radiusCard,
      padding: cardPadding,
      borderWidth: 1,
      borderColor: cCardBorder,
    },
    cardUrgent: { borderLeftWidth: 4, borderLeftColor: cPrimary },
    cardPayment: { borderLeftWidth: 4, borderLeftColor: cSecondary },
    cardMoving: { borderLeftWidth: 4, borderLeftColor: cAccent },

    cardTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing * 3,
    },
    badge: {
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12) - 1,
      fontWeight: "700",
      paddingVertical: spacing,
      paddingHorizontal: spacing * 2,
      borderRadius: radiusControl - 6,
      overflow: "hidden",
    },
    timeText: {
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12),
      fontWeight: "500",
      color: cTextMuted,
    },

    routeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing * 2 + 2,
      marginBottom: spacing * 3 + 2,
    },
    location: {
      fontSize: safeNumber(theme?.typography?.scale?.body?.size, 16) + 1,
      fontWeight: "700",
      color: cTextMain,
    },
    routeArrowIcon: {
      color: cArrow,
    },

    cardBtm: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: spacing * 3 + 2,
      borderTopWidth: 1,
      borderTopColor: cCardDivider,
    },
    infoText: {
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14) - 1,
      fontWeight: "500",
      color: cTextSub,
    },
    actionLink: {
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14) - 1,
      fontWeight: "700",
    },

    textUrgent: { color: cPrimary },
    textPayment: { color: cTextMain },
    textMoving: { color: cTextMain, opacity: 0.6 },
    textCompleted: { color: cTextMain },

    bgUrgent: { backgroundColor: cBadgeUrgentBg, color: cPrimary },
    bgPayment: { backgroundColor: cBadgePaymentBg, color: cSecondary },
    bgMoving: { backgroundColor: cBadgeMovingBg, color: cAccent },
    bgCompleted: { backgroundColor: cBadgeDoneBg, color: cTextSub },

    fab: {
      width: fabSize,
      height: fabSize,
      borderRadius: radiusControl + spacing,
    },
  });
});

export default function QuoteListPage() {
  const styles = useStyles();
  const theme = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cardNavLockedRef = useRef(false);
  const cardNavUnlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pageBg = safeString(theme?.colors?.bgMain, safeString(theme?.colors?.bgSurfaceAlt, ""));
  const onBrand = safeString(theme?.colors?.textOnBrand, safeString(theme?.colors?.textInverse, ""));

  const [activeTab, setActiveTab] = useState<TabType>("ongoing");

  const { ongoingList, completedList, actionRequiredList, movingList } = useMemo(() => {
    const ongoing = SAMPLE_QUOTES.filter((q) => q.status !== "dropoff");
    const completed = SAMPLE_QUOTES.filter((q) => q.status === "dropoff");
    const action = ongoing.filter((q) => ["negotiating", "assigned"].includes(q.status));
    const moving = ongoing.filter((q) => !["negotiating", "assigned"].includes(q.status));
    return { ongoingList: ongoing, completedList: completed, actionRequiredList: action, movingList: moving };
  }, []);

  useEffect(() => {
    return () => {
      if (cardNavUnlockTimerRef.current) {
        clearTimeout(cardNavUnlockTimerRef.current);
      }
    };
  }, []);

  const onPressCard = useCallback(
    (item: QuoteItem) => {
      if (cardNavLockedRef.current) return;
      cardNavLockedRef.current = true;

      if (cardNavUnlockTimerRef.current) {
        clearTimeout(cardNavUnlockTimerRef.current);
      }

      router.push({
        pathname: "/(shipper)/quotes/[id]",
        params: {
          id: item.id,
          status: item.status,
        },
      });

      cardNavUnlockTimerRef.current = setTimeout(() => {
        cardNavLockedRef.current = false;
        cardNavUnlockTimerRef.current = null;
      }, 900);
    },
    [router]
  );

  const onPressCreate = useCallback(() => {
    router.push("/(shipper)/quotes/create");
  }, [router]);

  const renderCard = (item: QuoteItem, isCompletedTab: boolean = false) => {
    const variant = getCardVariant(item.status, isCompletedTab);
    const badgeLabel = getBadgeLabel(item.status, isCompletedTab);

    let cardStatusStyle: ViewStyle | undefined;
    let badgeStyle: TextStyle = styles.bgCompleted;
    let actionTextStyle: TextStyle = styles.textCompleted;

    if (variant === "urgent") {
      cardStatusStyle = styles.cardUrgent;
      badgeStyle = styles.bgUrgent;
      actionTextStyle = styles.textUrgent;
    } else if (variant === "payment") {
      cardStatusStyle = styles.cardPayment;
      badgeStyle = styles.bgPayment;
      actionTextStyle = styles.textPayment;
    } else if (variant === "moving") {
      cardStatusStyle = styles.cardMoving;
      badgeStyle = styles.bgMoving;
      actionTextStyle = styles.textMoving;
    }

    const routeOpacity = isCompletedTab ? 0.5 : 1;

    return (
      <Pressable
        key={item.id}
        onPress={() => onPressCard(item)}
        style={({ pressed }) => [styles.cardPressable, pressed && CARD_PRESS]}
      >
        <AppCard outlined style={[styles.card, cardStatusStyle]}>
          <View style={styles.cardTop}>
            <AppText style={[styles.badge, badgeStyle]}>{badgeLabel}</AppText>
            <AppText style={styles.timeText}>{item.rightHint}</AppText>
          </View>

          <View style={[styles.routeRow, { opacity: routeOpacity }]}>
            <AppText style={styles.location}>{item.fromLabel}</AppText>
            <Ionicons name="arrow-forward" size={16} style={styles.routeArrowIcon} />
            <AppText style={styles.location}>{item.toLabel}</AppText>
          </View>

          <View style={styles.cardBtm}>
            <AppText style={styles.infoText}>{item.cargoHint}</AppText>
            {isCompletedTab ? (
              <AppText style={[styles.actionLink, styles.textCompleted]}>{item.price}</AppText>
            ) : (
              <AppText style={[styles.actionLink, actionTextStyle]}>{item.ctaLabel}</AppText>
            )}
          </View>
        </AppCard>
      </Pressable>
    );
  };

  return (
    <PageScaffold
      title="이용 내역"
      backgroundColor={pageBg}
      contentStyle={styles.pageContent}
      floating={
        <AppButton
          size="icon"
          style={[styles.fab, { marginBottom: Math.max(0, (insets?.bottom ?? 0) - 10) }]}
          onPress={onPressCreate}
          accessibilityLabel="견적 요청 생성"
        >
          <Ionicons name="add" size={28} color={onBrand} />
        </AppButton>
      }
    >
      <View style={styles.tabContainer}>
        <View style={styles.tabTrack}>
          <Pressable
            style={[styles.tabItem, activeTab === "ongoing" && styles.tabItemActive]}
            onPress={() => setActiveTab("ongoing")}
          >
            <AppText style={[styles.tabText, activeTab === "ongoing" && styles.tabTextActive]}>진행 중</AppText>
            <View style={[styles.tabCount, activeTab === "ongoing" && styles.tabCountActive]}>
              <AppText style={[styles.tabCountText, activeTab === "ongoing" && styles.tabCountTextActive]}>
                {ongoingList.length}
              </AppText>
            </View>
          </Pressable>

          <Pressable
            style={[styles.tabItem, activeTab === "completed" && styles.tabItemActive]}
            onPress={() => setActiveTab("completed")}
          >
            <AppText style={[styles.tabText, activeTab === "completed" && styles.tabTextActive]}>완료</AppText>
            <View style={[styles.tabCount, activeTab === "completed" && styles.tabCountActive]}>
              <AppText style={[styles.tabCountText, activeTab === "completed" && styles.tabCountTextActive]}>
                {completedList.length}
              </AppText>
            </View>
          </Pressable>
        </View>
      </View>

      <View style={styles.sectionList}>
        {activeTab === "ongoing" && (
          <>
            {actionRequiredList.length > 0 && (
              <>
                <View style={[styles.sectionLabelRow, { marginTop: 0 }]}>
                  <AppText style={styles.sectionLabel}>확인 필요</AppText>
                  <AppText style={styles.sectionCount}>{actionRequiredList.length}건</AppText>
                </View>
                {actionRequiredList.map((item) => renderCard(item))}
              </>
            )}

            {movingList.length > 0 && (
              <>
                <View style={[styles.sectionLabelRow, actionRequiredList.length === 0 && { marginTop: 0 }]}>
                  <AppText style={styles.sectionLabel}>운송 현황</AppText>
                </View>
                {movingList.map((item) => renderCard(item))}
              </>
            )}

            {ongoingList.length === 0 && (
              <AppEmptyState title="진행 중인 요청이 없어요" description="새로운 운송을 요청해보세요." />
            )}
          </>
        )}

        {activeTab === "completed" && (
          <>
            <View style={[styles.sectionLabelRow, { marginTop: 0 }]}>
              <AppText style={styles.sectionLabel}>최근 3개월</AppText>
            </View>
            {completedList.map((item) => renderCard(item, true))}

            {completedList.length === 0 && (
              <AppEmptyState title="완료된 내역이 없어요" description="운송이 완료되면 내역이 표시됩니다." />
            )}
          </>
        )}
      </View>
    </PageScaffold>
  );
}
