// apps/mobile/src/pages/shipper/home/ShipperHomePage.tsx
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, View, type TextStyle, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "@/shared/theme/useAppTheme";
import { AppText } from "@/shared/ui/kit/AppText";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppEmptyState } from "@/shared/ui/kit/AppEmptyState";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

type HomeFilter = "all" | "pending" | "payment" | "moving" | "completed";
type BottomTabKey = "home" | "quotes" | "matchings" | "profile";

type BadgeTone = "orange" | "blue" | "mint" | "gray";
type CardTone = "default" | "actionRequired" | "paymentRequired";

type FeedItem = {
  id: string;
  status: Exclude<HomeFilter, "all">;
  badgeTone: BadgeTone;
  badgeText: string;
  rightHint: string;
  title: string;
  fromLabel: string;
  toLabel: string;
  statusText: string;
  ctaText: string;
  progress?: number; // 0~1
  cardTone?: CardTone;
  metaHint?: string;
};

const VIEW_PRESSED: ViewStyle = { opacity: 0.85 };
const FAB_PRESSED: ViewStyle = { transform: [{ scale: 0.96 }] };

function safeString(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.trim().length > 0 ? v : fallback;
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function rgbaFromHex(hex: string, opacity: number): string | null {
  const s = safeString(hex).trim();
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s)) return null;

  const raw = s.replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;

  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((x) => Number.isNaN(x))) return null;

  return `rgba(${r}, ${g}, ${b}, ${clamp01(opacity)})`;
}

function tint(color: string, opacity: number, fallback: string): string {
  return rgbaFromHex(color, opacity) ?? fallback;
}

export function ShipperHomePage() {
  const theme = useAppTheme();

  const cText = safeString(theme?.colors?.textMain, "#111827");
  const cTextOnBrand = safeString((theme as any)?.colors?.textOnBrand, "#FFFFFF");
  const cBgBase = safeString(theme?.colors?.bgSurfaceAlt, "#F3F4F6");
  const cCard = safeString(theme?.colors?.bgMain, "#FFFFFF");
  const cBorder = safeString(theme?.colors?.borderDefault, "#E5E7EB");

  const cPrimary = safeString(theme?.colors?.brandPrimary, "#FF6A00");
  const cMint = safeString(theme?.colors?.brandAccent, "#00E5A8");
  const cBlue = safeString(theme?.colors?.brandSecondary, "#3B82F6");

  const radiusCard = safeNumber(theme?.layout?.radii?.card, 20);

  const subtleText = useMemo(() => tint(cText, 0.7, "rgba(17,24,39,0.7)"), [cText]);
  const inactiveHint = useMemo(() => tint(cText, 0.55, "rgba(17,24,39,0.55)"), [cText]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        profileCircle: {
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: tint(cBorder, 0.9, cBorder),
          borderWidth: 2,
          borderColor: cCard,
        },
        fab: {
          width: 56,
          height: 56,
          borderRadius: 20,
          backgroundColor: cPrimary,
          alignItems: "center",
          justifyContent: "center",
        },
        hero: { marginBottom: 16 },
        heroSub: { marginTop: 4 },

        balanceCard: {
          backgroundColor: safeString(rgbaFromHex(cText, 0.95), "#0F172A"),
          borderRadius: radiusCard,
          padding: 18,
          marginBottom: 18,
        },
        balanceTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
        balanceLeft: { flex: 1, marginRight: 10 },
        balanceBtn: {
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 18,
          backgroundColor: tint(cTextOnBrand, 0.18, "rgba(255,255,255,0.18)"),
          alignItems: "center",
          justifyContent: "center",
        },

        statRow: { flexDirection: "row", marginBottom: 18 },
        statItem: {
          flex: 1,
          backgroundColor: cCard,
          borderRadius: 12,
          paddingVertical: 12,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: "transparent",
          marginRight: 8,
        },
        statItemLast: { marginRight: 0 },
        statItemActive: { transform: [{ translateY: -2 }], borderColor: cText },

        listHeader: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
          paddingHorizontal: 4,
        },
        allBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },

        cardOuter: { borderRadius: 16, overflow: "hidden", marginBottom: 12 },
        cardInner: { padding: 16 },
        cardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },

        routeRow: { flexDirection: "row", alignItems: "center", marginTop: 12, marginBottom: 12 },
        routeNode: { flex: 1 },
        routeNodeRight: { alignItems: "flex-end" },
        routeArrow: { width: 18, alignItems: "center", justifyContent: "center", marginHorizontal: 12 },

        progressTrack: {
          height: 4,
          borderRadius: 2,
          backgroundColor: tint(cBorder, 0.55, cBorder),
          overflow: "hidden",
          marginTop: 12,
        },
        progressFill: { height: "100%", borderRadius: 2 },

        cardActions: {
          borderTopWidth: 1,
          borderTopColor: tint("#000000", 0.06, "rgba(0,0,0,0.06)"),
          paddingTop: 10,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 12,
        },
        ctaBtn: { paddingVertical: 6, paddingHorizontal: 6, borderRadius: 10 },

        badgeWrap: {
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 10,
          alignSelf: "flex-start",
        },
      }),
    [cBorder, cCard, cPrimary, cText, cTextOnBrand, radiusCard]
  );

  const [tab, setTab] = useState<BottomTabKey>("home");
  const [filter, setFilter] = useState<HomeFilter>("all");

  const feed: FeedItem[] = useMemo(
    () => [
      {
        id: "it-1",
        status: "pending",
        badgeTone: "orange",
        badgeText: "금액 제안",
        rightHint: "응답 필요",
        title: "240,000원 금액 제안이 도착했어요",
        fromLabel: "경기 성남",
        toLabel: "충북 청주",
        statusText: "기사님 대기 중",
        ctaText: "제안 보기",
        cardTone: "actionRequired",
      },
      {
        id: "it-2",
        status: "payment",
        badgeTone: "blue",
        badgeText: "배차 확정",
        rightHint: "결제 대기",
        title: "배차가 확정됐어요",
        fromLabel: "인천 남동구",
        toLabel: "대전 유성",
        statusText: "5톤 윙바디",
        ctaText: "결제하기",
        cardTone: "paymentRequired",
      },
      {
        id: "it-3",
        status: "moving",
        badgeTone: "mint",
        badgeText: "상차 진행",
        rightHint: "기사님 도착",
        title: "상차 진행 중입니다",
        fromLabel: "서울 강남",
        toLabel: "부산 해운대",
        statusText: "상차 작업 확인",
        ctaText: "상차 사진 보기",
        progress: 0.2,
      },
      {
        id: "it-4",
        status: "moving",
        badgeTone: "mint",
        badgeText: "이동 중",
        rightHint: "도착 예정 14:30",
        title: "이동 중입니다",
        fromLabel: "경기 평택",
        toLabel: "전남 여수",
        statusText: "실시간 관제 중",
        ctaText: "위치 보기",
        progress: 0.65,
      },
      {
        id: "it-5",
        status: "pending",
        badgeTone: "orange",
        badgeText: "배차 중",
        rightHint: "자동 매칭",
        title: "배차 중입니다",
        fromLabel: "서울 마포",
        toLabel: "경기 고양",
        statusText: "기사님들에게 요청 전송됨",
        ctaText: "현황 보기",
        metaHint: "진행 상황은 실시간으로 갱신됩니다",
      },
      {
        id: "it-6",
        status: "completed",
        badgeTone: "gray",
        badgeText: "운송 완료",
        rightHint: "2월 5일 도착",
        title: "운송이 완료됐어요",
        fromLabel: "강원 원주",
        toLabel: "서울 송파",
        statusText: "최종 확인 필요",
        ctaText: "인수증 보기",
      },
    ],
    []
  );

  const counts = useMemo(() => {
    const base = { pending: 0, payment: 0, moving: 0, completed: 0 };
    for (const it of feed) base[it.status] += 1;
    return base;
  }, [feed]);

  const filteredFeed = useMemo(() => {
    if (filter === "all") return feed;
    return feed.filter((it) => it.status === filter);
  }, [feed, filter]);

  const listTitle = useMemo(() => {
    const titles: Record<HomeFilter, string> = {
      all: "최근 현황",
      pending: "배차/제안 목록",
      payment: "결제 대기 목록",
      moving: "운송 중 목록",
      completed: "완료된 목록",
    };
    return titles[filter] ?? "최근 현황";
  }, [filter]);

  const headerRight = (
    <View style={styles.profileCircle} accessibilityLabel="프로필">
      <Ionicons name="person" size={18} color={subtleText} />
    </View>
  );

  const floating = (
    <Pressable
      style={({ pressed }) => [styles.fab, pressed ? FAB_PRESSED : undefined]}
      accessibilityRole="button"
      accessibilityLabel="새 요청 만들기"
      onPress={() => {}}
    >
      <Ionicons name="add" size={26} color={cTextOnBrand} />
    </Pressable>
  );

  return (
    <PageScaffold title="Rodia" headerRight={headerRight} floating={floating} backgroundColor={cBgBase}>
      {tab !== "home" ? (
        <View style={{ paddingTop: 12 }}>
          <AppEmptyState
            fullScreen={false}
            title={`${tab === "quotes" ? "견적" : tab === "matchings" ? "매칭" : "내 정보"} 탭(예시)`}
            description="현재는 홈 + 바텀 탭 UI 검증만 포함합니다."
            action={{ label: "홈으로", onPress: () => setTab("home") }}
          />
          <View style={{ height: 12 }} />
          <AppButton title="홈으로" variant="secondary" onPress={() => setTab("home")} />
        </View>
      ) : (
        <>
          <View style={styles.hero}>
            <AppText variant="heading" weight="800">
              반가워요, 화주님 👋
            </AppText>
            <View style={styles.heroSub}>
              <AppText variant="body" color={subtleText}>
                오늘의 물류 현황을 확인하세요.
              </AppText>
            </View>
          </View>

          <View style={styles.balanceCard}>
            <View style={styles.balanceTop}>
              <View style={styles.balanceLeft}>
                <AppText variant="caption" color={tint(cTextOnBrand, 0.85, "rgba(255,255,255,0.85)")}>
                  예치금 잔액
                </AppText>
                <AppText variant="heading" weight="800" color={cTextOnBrand}>
                  2,500,000 P
                </AppText>
              </View>

              <Pressable
                onPress={() => {}}
                accessibilityRole="button"
                accessibilityLabel="충전"
                style={({ pressed }) => [styles.balanceBtn, pressed ? VIEW_PRESSED : undefined]}
              >
                <AppText variant="caption" weight="900" color={cTextOnBrand}>
                  + 충전
                </AppText>
              </Pressable>
            </View>
          </View>

          <View style={styles.statRow}>
            <StatTile
              active={filter === "pending"}
              number={counts.pending}
              numberColor={cPrimary}
              label="배차/제안"
              onPress={() => setFilter("pending")}
              styles={styles}
              labelColor={subtleText}
              isLast={false}
            />
            <StatTile
              active={filter === "payment"}
              number={counts.payment}
              numberColor={cBlue}
              label="결제대기"
              onPress={() => setFilter("payment")}
              styles={styles}
              labelColor={subtleText}
              isLast={false}
            />
            <StatTile
              active={filter === "moving"}
              number={counts.moving}
              numberColor={cMint}
              label="운송중"
              onPress={() => setFilter("moving")}
              styles={styles}
              labelColor={subtleText}
              isLast={false}
            />
            <StatTile
              active={filter === "completed"}
              number={counts.completed}
              numberColor={subtleText}
              label="완료/인수"
              onPress={() => setFilter("completed")}
              styles={styles}
              labelColor={subtleText}
              isLast={true}
            />
          </View>

          <View style={styles.listHeader}>
            <AppText variant="heading" weight="800">
              {listTitle}
            </AppText>

            <Pressable
              onPress={() => setFilter("all")}
              accessibilityRole="button"
              accessibilityLabel="전체보기"
              style={({ pressed }) => [styles.allBtn, pressed ? VIEW_PRESSED : undefined]}
            >
              <AppText variant="caption" weight="800" color={subtleText}>
                전체보기
              </AppText>
            </Pressable>
          </View>

          {filteredFeed.length === 0 ? (
            <AppEmptyState
              fullScreen={false}
              title="표시할 항목이 없어요"
              description="필터 조건에 해당하는 현황이 없습니다."
              action={{ label: "전체보기", onPress: () => setFilter("all") }}
            />
          ) : (
            filteredFeed.map((it) => (
              <FeedCard
                key={it.id}
                item={it}
                styles={styles}
                cText={cText}
                cPrimary={cPrimary}
                cBlue={cBlue}
                cMint={cMint}
                cBorder={cBorder}
                subtleText={subtleText}
                inactiveHint={inactiveHint}
                cardBg={cCard}
              />
            ))
          )}

          <View style={{ height: 120 }} />
        </>
      )}
    </PageScaffold>
  );
}

function StatTile(props: {
  active: boolean;
  number: number;
  numberColor: string;
  label: string;
  labelColor: string;
  onPress: () => void;
  styles: ReturnType<typeof StyleSheet.create>;
  isLast: boolean;
}) {
  const { active, number, numberColor, label, onPress, styles, labelColor, isLast } = props;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        (styles as any).statItem,
        isLast ? (styles as any).statItemLast : undefined,
        active ? (styles as any).statItemActive : undefined,
        pressed ? VIEW_PRESSED : undefined,
      ]}
    >
      <AppText variant="heading" weight="900" color={numberColor}>
        {Number.isFinite(number) ? String(number) : "0"}
      </AppText>
      <AppText variant="caption" weight="800" color={labelColor}>
        {label}
      </AppText>
    </Pressable>
  );
}

function FeedCard(props: {
  item: FeedItem;
  styles: any;
  cText: string;
  cPrimary: string;
  cBlue: string;
  cMint: string;
  cBorder: string;
  subtleText: string;
  inactiveHint: string;
  cardBg: string;
}) {
  const { item, styles, cText, cPrimary, cBlue, cMint, cBorder, subtleText, inactiveHint, cardBg } = props;

  const wrapStyle = getCardToneStyle(item.cardTone ?? "default", { cPrimary, cBlue, cardBg });

  const hintColor =
    item.badgeTone === "orange" ? cPrimary : item.badgeTone === "blue" ? cBlue : item.badgeTone === "mint" ? cMint : subtleText;

  const ctaColor = item.badgeTone === "orange" ? cPrimary : item.badgeTone === "blue" ? cBlue : cText;

  return (
    <View style={[styles.cardOuter, wrapStyle]}>
      <AppCard>
        <View style={styles.cardInner}>
          <View style={styles.cardTopRow}>
            <Badge tone={item.badgeTone} text={item.badgeText} styles={styles} cPrimary={cPrimary} cBlue={cBlue} cMint={cMint} cBorder={cBorder} cText={cText} />
            <AppText variant="caption" weight="800" color={hintColor}>
              {item.rightHint}
            </AppText>
          </View>

          <AppText variant="body" weight="900">
            {item.title}
          </AppText>

          <View style={styles.routeRow}>
            <View style={styles.routeNode}>
              <AppText variant="caption" weight="700" color={inactiveHint}>
                출발
              </AppText>
              <AppText variant="body" weight="800">
                {item.fromLabel}
              </AppText>
            </View>

            <View style={styles.routeArrow}>
              <AppText variant="caption" weight="700" color={inactiveHint}>
                ➝
              </AppText>
            </View>

            <View style={[styles.routeNode, styles.routeNodeRight]}>
              <AppText variant="caption" weight="700" color={inactiveHint}>
                도착
              </AppText>
              <AppText variant="body" weight="800">
                {item.toLabel}
              </AppText>
            </View>
          </View>

          {typeof item.progress === "number" ? (
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.round(clamp01(item.progress) * 100)}%`,
                    backgroundColor: cMint,
                  },
                ]}
              />
            </View>
          ) : null}

          {safeString(item.metaHint).trim() ? (
            <View style={{ marginTop: 12 }}>
              <AppText variant="caption" color={subtleText}>
                {item.metaHint}
              </AppText>
            </View>
          ) : null}

          <View style={styles.cardActions}>
            <AppText variant="body" color={subtleText}>
              {item.statusText}
            </AppText>

            <Pressable
              onPress={() => {}}
              accessibilityRole="button"
              accessibilityLabel={item.ctaText}
              style={({ pressed }) => [styles.ctaBtn, pressed ? VIEW_PRESSED : undefined]}
            >
              <AppText variant="body" weight="900" color={ctaColor}>
                {item.ctaText} &gt;
              </AppText>
            </Pressable>
          </View>
        </View>
      </AppCard>
    </View>
  );
}

function Badge(props: {
  tone: BadgeTone;
  text: string;
  styles: any;
  cPrimary: string;
  cBlue: string;
  cMint: string;
  cBorder: string;
  cText: string;
}) {
  const { tone, text, styles, cPrimary, cBlue, cMint, cBorder, cText } = props;

  const bg =
    tone === "orange"
      ? tint(cPrimary, 0.12, "rgba(255,106,0,0.12)")
      : tone === "blue"
      ? tint(cBlue, 0.12, "rgba(59,130,246,0.12)")
      : tone === "mint"
      ? tint(cMint, 0.12, "rgba(0,229,168,0.12)")
      : tint(cBorder, 0.55, "rgba(229,231,235,0.55)");

  const fg =
    tone === "orange"
      ? cPrimary
      : tone === "blue"
      ? cBlue
      : tone === "mint"
      ? tint(cMint, 0.85, cMint)
      : tint(cText, 0.7, "rgba(17,24,39,0.7)");

  const textStyle: TextStyle = { color: fg };

  return (
    <View style={[styles.badgeWrap, { backgroundColor: bg }]}>
      <AppText variant="caption" weight="900" style={textStyle}>
        {text}
      </AppText>
    </View>
  );
}

function getCardToneStyle(
  tone: CardTone,
  colors: { cPrimary: string; cBlue: string; cardBg: string }
): ViewStyle {
  if (tone === "actionRequired") {
    return {
      borderWidth: 1,
      borderColor: colors.cPrimary,
      backgroundColor: tint(colors.cPrimary, 0.06, colors.cardBg),
      borderRadius: 16,
    };
  }
  if (tone === "paymentRequired") {
    return {
      borderWidth: 1,
      borderColor: colors.cBlue,
      backgroundColor: tint(colors.cBlue, 0.05, colors.cardBg),
      borderRadius: 16,
    };
  }
  return {
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: "transparent",
    borderRadius: 16,
  };
}
