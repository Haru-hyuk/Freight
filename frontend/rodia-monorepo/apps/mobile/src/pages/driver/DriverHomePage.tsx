import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, View, type TextStyle, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useAuth } from "@/features/auth/model/useAuth";
import { useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppEmptyState } from "@/shared/ui/kit/AppEmptyState";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

type DriverFilter = "all" | "waiting" | "pickup" | "delivery" | "done";
type BadgeTone = "orange" | "blue" | "mint" | "gray";

type DeliveryItem = {
  id: string;
  status: Exclude<DriverFilter, "all">;
  title: string;
  fromLabel: string;
  toLabel: string;
  timeHint: string;
  ctaText: string;
  badgeTone: BadgeTone;
  badgeText: string;
  progress?: number;
};

const VIEW_PRESSED: ViewStyle = { opacity: 0.85 };

function safeString(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.trim().length > 0 ? v : fallback;
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

  const a = clamp01(opacity);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function tint(color: string, opacity: number, fallback: string): string {
  return rgbaFromHex(color, opacity) ?? fallback;
}

export function DriverHomePage() {
  const auth = useAuth();
  const router = useRouter();
  const theme = useAppTheme();

  const cText = safeString(theme?.colors?.textMain, "#111827");
  const cBg = safeString(theme?.colors?.bgSurfaceAlt, "#F3F4F6");
  const cCard = safeString(theme?.colors?.bgMain, "#FFFFFF");
  const cBorder = safeString(theme?.colors?.borderDefault, "#E5E7EB");
  const cPrimary = safeString(theme?.colors?.brandPrimary, "#FF6A00");
  const cBlue = safeString(theme?.colors?.brandSecondary, "#3B82F6");
  const cMint = safeString(theme?.colors?.brandAccent, "#00E5A8");
  const subtleText = useMemo(() => tint(cText, 0.68, "rgba(17,24,39,0.68)"), [cText]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        hero: { marginBottom: 16 },
        heroSub: { marginTop: 4 },
        accountWrap: { borderRadius: 16, overflow: "hidden", marginBottom: 14 },
        accountInner: { padding: 16, gap: 14 },
        row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
        userBox: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, marginRight: 10 },
        avatar: {
          width: 42,
          height: 42,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: tint(cBorder, 0.8, cBorder),
        },
        rolePill: {
          alignSelf: "flex-start",
          borderRadius: 10,
          paddingHorizontal: 10,
          paddingVertical: 6,
          backgroundColor: tint(cPrimary, 0.12, "rgba(255,106,0,0.12)"),
        },
        actionRow: { flexDirection: "row", gap: 8 },
        flexBtn: { flex: 1 },
        filterRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
        filterItem: {
          flex: 1,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: cBorder,
          backgroundColor: cCard,
          alignItems: "center",
          justifyContent: "center",
          minHeight: 64,
        },
        filterItemActive: {
          borderColor: cText,
          transform: [{ translateY: -1 }],
        },
        listHeader: {
          marginBottom: 10,
          paddingHorizontal: 2,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        },
        allBtn: {
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 10,
        },
        cardOuter: { borderRadius: 16, overflow: "hidden", marginBottom: 12 },
        cardInner: { padding: 16 },
        cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
        badgeWrap: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignSelf: "flex-start" },
        routeRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
        routeNode: { flex: 1 },
        routeRight: { alignItems: "flex-end" },
        routeArrow: { width: 18, alignItems: "center", justifyContent: "center", marginHorizontal: 12 },
        progressTrack: {
          height: 4,
          borderRadius: 2,
          backgroundColor: tint(cBorder, 0.55, cBorder),
          overflow: "hidden",
          marginTop: 10,
        },
        progressFill: {
          height: "100%",
          borderRadius: 2,
          backgroundColor: cMint,
        },
        actionLine: {
          marginTop: 12,
          borderTopWidth: 1,
          borderTopColor: tint("#000000", 0.06, "rgba(0,0,0,0.06)"),
          paddingTop: 10,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        },
      }),
    [cBg, cBlue, cBorder, cCard, cMint, cPrimary, cText]
  );

  const [filter, setFilter] = useState<DriverFilter>("all");

  const deliveries = useMemo<DeliveryItem[]>(
    () => [
      {
        id: "driver-1",
        status: "waiting",
        title: "배차 요청이 도착했습니다",
        fromLabel: "경기 성남",
        toLabel: "충북 청주",
        timeHint: "응답 대기",
        ctaText: "요청 확인",
        badgeTone: "orange",
        badgeText: "배차요청",
      },
      {
        id: "driver-2",
        status: "pickup",
        title: "상차 장소로 이동 중",
        fromLabel: "인천 연수구",
        toLabel: "서울 강서",
        timeHint: "ETA 14:20",
        ctaText: "상차 완료",
        badgeTone: "blue",
        badgeText: "상차 대기",
        progress: 0.35,
      },
      {
        id: "driver-3",
        status: "delivery",
        title: "배송 진행 중입니다",
        fromLabel: "서울 송파",
        toLabel: "부산 해운대",
        timeHint: "도착 예정 16:10",
        ctaText: "배송 추적",
        badgeTone: "mint",
        badgeText: "배송 중",
        progress: 0.7,
      },
      {
        id: "driver-4",
        status: "done",
        title: "운송이 완료되었습니다",
        fromLabel: "강원 원주",
        toLabel: "경기 용인",
        timeHint: "2시간 전 완료",
        ctaText: "인수증 보기",
        badgeTone: "gray",
        badgeText: "완료",
      },
    ],
    []
  );

  const counts = useMemo(() => {
    const base = { waiting: 0, pickup: 0, delivery: 0, done: 0 };
    for (const item of deliveries) base[item.status] += 1;
    return base;
  }, [deliveries]);

  const filtered = useMemo(() => {
    if (filter === "all") return deliveries;
    return deliveries.filter((item) => item.status === filter);
  }, [deliveries, filter]);

  const listTitle = useMemo(() => {
    if (filter === "waiting") return "배차 요청";
    if (filter === "pickup") return "상차 대기";
    if (filter === "delivery") return "배송 진행";
    if (filter === "done") return "완료 건";
    return "오늘 운행";
  }, [filter]);

  const name = safeString((auth.user as any)?.name, "기사님");
  const vehicle = safeString((auth.user as any)?.vehicleNumber, "차량번호 미등록");
  const role = safeString(auth.user?.role, "driver");

  const headerRight = (
    <View style={styles.avatar} accessibilityLabel="driver-profile">
      <Ionicons name="car-sport" size={18} color={subtleText} />
    </View>
  );

  return (
    <PageScaffold title="Rodia Driver" headerRight={headerRight} backgroundColor={cBg}>
      {auth.status !== "authenticated" ? (
        <AppEmptyState
          fullScreen={false}
          title="로그인이 필요합니다"
          description="기사 홈 화면은 로그인 후 사용할 수 있습니다."
          action={{ label: "로그인", onPress: () => router.push("/(auth)/login") }}
        />
      ) : (
        <>
          <View style={styles.hero}>
            <AppText variant="heading" weight="800">
              오늘 운행 현황
            </AppText>
            <View style={styles.heroSub}>
              <AppText variant="body" color={subtleText}>
                배차부터 완료까지 한 화면에서 확인하세요.
              </AppText>
            </View>
          </View>

          <View style={styles.accountWrap}>
            <AppCard>
              <View style={styles.accountInner}>
                <View style={styles.row}>
                  <View style={styles.userBox}>
                    <View style={styles.avatar}>
                      <Ionicons name="person" size={18} color={subtleText} />
                    </View>
                    <View>
                      <AppText variant="body" weight="900">
                        {name}
                      </AppText>
                      <AppText variant="caption" color={subtleText}>
                        {vehicle}
                      </AppText>
                    </View>
                  </View>
                  <View style={styles.rolePill}>
                    <AppText variant="caption" weight="900" style={{ color: cPrimary }}>
                      {`role: ${role}`}
                    </AppText>
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <AppButton title="내 정보" variant="secondary" style={styles.flexBtn} onPress={() => {}} />
                  <AppButton
                    title={auth.isBusy ? "로그아웃 중..." : "로그아웃"}
                    variant="secondary"
                    style={styles.flexBtn}
                    loading={auth.isBusy}
                    disabled={auth.isBusy}
                    onPress={() => auth.logout()}
                  />
                </View>
              </View>
            </AppCard>
          </View>

          <View style={styles.filterRow}>
            <FilterTile
              label="배차요청"
              count={counts.waiting}
              active={filter === "waiting"}
              onPress={() => setFilter("waiting")}
              styles={styles}
              numberColor={cPrimary}
              labelColor={subtleText}
            />
            <FilterTile
              label="상차대기"
              count={counts.pickup}
              active={filter === "pickup"}
              onPress={() => setFilter("pickup")}
              styles={styles}
              numberColor={cBlue}
              labelColor={subtleText}
            />
            <FilterTile
              label="배송중"
              count={counts.delivery}
              active={filter === "delivery"}
              onPress={() => setFilter("delivery")}
              styles={styles}
              numberColor={cMint}
              labelColor={subtleText}
            />
            <FilterTile
              label="완료"
              count={counts.done}
              active={filter === "done"}
              onPress={() => setFilter("done")}
              styles={styles}
              numberColor={subtleText}
              labelColor={subtleText}
            />
          </View>

          <View style={styles.listHeader}>
            <AppText variant="heading" weight="800">
              {listTitle}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="all-deliveries"
              onPress={() => setFilter("all")}
              style={({ pressed }) => [styles.allBtn, pressed ? VIEW_PRESSED : undefined]}
            >
              <AppText variant="caption" weight="800" color={subtleText}>
                전체보기
              </AppText>
            </Pressable>
          </View>

          {filtered.length === 0 ? (
            <AppEmptyState
              fullScreen={false}
              title="표시할 운행이 없습니다"
              description="필터 조건을 바꾸거나 새 배차를 확인해 주세요."
              action={{ label: "전체보기", onPress: () => setFilter("all") }}
            />
          ) : (
            filtered.map((item) => (
              <DeliveryCard
                key={item.id}
                item={item}
                styles={styles}
                cText={cText}
                cPrimary={cPrimary}
                cBlue={cBlue}
                cMint={cMint}
                cBorder={cBorder}
                subtleText={subtleText}
              />
            ))
          )}

          <View style={{ height: 120 }} />
        </>
      )}
    </PageScaffold>
  );
}

function FilterTile(props: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
  styles: ReturnType<typeof StyleSheet.create>;
  numberColor: string;
  labelColor: string;
}) {
  const { label, count, active, onPress, styles, numberColor, labelColor } = props;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.filterItem,
        active ? styles.filterItemActive : undefined,
        pressed ? VIEW_PRESSED : undefined,
      ]}
    >
      <AppText variant="heading" weight="900" color={numberColor}>
        {String(count)}
      </AppText>
      <AppText variant="caption" weight="800" color={labelColor}>
        {label}
      </AppText>
    </Pressable>
  );
}

function DeliveryCard(props: {
  item: DeliveryItem;
  styles: ReturnType<typeof StyleSheet.create>;
  cText: string;
  cPrimary: string;
  cBlue: string;
  cMint: string;
  cBorder: string;
  subtleText: string;
}) {
  const { item, styles, cText, cPrimary, cBlue, cMint, cBorder, subtleText } = props;

  const badgeBg =
    item.badgeTone === "orange"
      ? tint(cPrimary, 0.12, "rgba(255,106,0,0.12)")
      : item.badgeTone === "blue"
      ? tint(cBlue, 0.12, "rgba(59,130,246,0.12)")
      : item.badgeTone === "mint"
      ? tint(cMint, 0.12, "rgba(0,229,168,0.12)")
      : tint(cBorder, 0.55, "rgba(229,231,235,0.55)");

  const badgeFg =
    item.badgeTone === "orange"
      ? cPrimary
      : item.badgeTone === "blue"
      ? cBlue
      : item.badgeTone === "mint"
      ? tint(cMint, 0.9, cMint)
      : tint(cText, 0.68, "rgba(17,24,39,0.68)");

  const ctaColor = item.badgeTone === "orange" ? cPrimary : item.badgeTone === "blue" ? cBlue : cText;
  const badgeTextStyle: TextStyle = { color: badgeFg };

  return (
    <View style={styles.cardOuter}>
      <AppCard>
        <View style={styles.cardInner}>
          <View style={styles.cardTop}>
            <View style={[styles.badgeWrap, { backgroundColor: badgeBg }]}>
              <AppText variant="caption" weight="900" style={badgeTextStyle}>
                {item.badgeText}
              </AppText>
            </View>
            <AppText variant="caption" weight="800" color={subtleText}>
              {item.timeHint}
            </AppText>
          </View>

          <AppText variant="body" weight="900">
            {item.title}
          </AppText>

          <View style={styles.routeRow}>
            <View style={styles.routeNode}>
              <AppText variant="caption" weight="700" color={subtleText}>
                출발
              </AppText>
              <AppText variant="body" weight="800">
                {item.fromLabel}
              </AppText>
            </View>
            <View style={styles.routeArrow}>
              <AppText variant="caption" color={subtleText}>
                →
              </AppText>
            </View>
            <View style={[styles.routeNode, styles.routeRight]}>
              <AppText variant="caption" weight="700" color={subtleText}>
                도착
              </AppText>
              <AppText variant="body" weight="800">
                {item.toLabel}
              </AppText>
            </View>
          </View>

          {typeof item.progress === "number" ? (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(clamp01(item.progress) * 100)}%` }]} />
            </View>
          ) : null}

          <View style={styles.actionLine}>
            <AppText variant="detail" color={subtleText}>
              상태 확인 필요
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.ctaText}
              onPress={() => {}}
              style={({ pressed }) => [pressed ? VIEW_PRESSED : undefined]}
            >
              <AppText variant="body" weight="900" style={{ color: ctaColor }}>
                {item.ctaText} &gt;
              </AppText>
            </Pressable>
          </View>
        </View>
      </AppCard>
    </View>
  );
}

export default DriverHomePage;
