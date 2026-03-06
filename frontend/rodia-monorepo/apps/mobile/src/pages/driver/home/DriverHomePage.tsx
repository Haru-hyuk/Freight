import React, { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useDriverHomeSummary } from "@/features/driver-home/model/useDriverHomeSummary";
import { formatDateTime, formatKrw } from "@/shared/lib/format/display";
import { safeNumber, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

type RestrictionLevel = "danger" | "warn";

type RestrictionInfo = {
  level: RestrictionLevel;
  topMsg: string;
  heroTitle: string;
  heroDesc: string;
  btnText: string;
  btnHref: `/(driver)/${string}`;
  notiTitle: string;
  notiDesc: string;
};

type QuickAction = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  href?: `/(driver)/${string}`;
  disabled?: boolean;
};

const QUICK_ACTIONS: QuickAction[] = [
  { icon: "document-text-outline", label: "정산서 발행", href: "/(driver)/settlement" },
  { icon: "receipt-outline", label: "인수증 관리", href: "/(driver)/settlement" },
  { icon: "notifications-outline", label: "공지사항", disabled: true },
  { icon: "headset-outline", label: "고객센터", href: "/(driver)/inquiries" },
];

type HomeNoticeCard = {
  id: string;
  title: string;
  body: string;
  timeText: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  tone: "warn" | "info";
  route?:
    | `/(driver)/${string}`
    | {
        pathname: `/(driver)/${string}`;
        params?: Record<string, string>;
      };
};

function formatNoticeTimeText(value?: string): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "지금";

  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) return raw;

  const diffMinutes = Math.floor(Math.max(0, Date.now() - parsed) / 60000);
  if (diffMinutes < 1) return "방금";
  if (diffMinutes < 60) return `${diffMinutes}분 전`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;

  return formatDateTime(raw, raw);
}

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);

  const cBg = theme.colors.bgSurfaceAlt;
  const cSurface = theme.colors.bgSurface;
  const cBorder = theme.colors.borderDefault;
  const cText = theme.colors.textMain;
  const cSub = theme.colors.textSub;
  const cMuted = theme.colors.textMuted;
  const cBrand = theme.colors.brandPrimary;
  const cDanger = theme.colors.semanticDanger;
  const cWarn = theme.colors.semanticWarning;
  const cOnBrand = theme.colors.textOnBrand;
  const cHero = theme.colors.brandSecondary;

  return StyleSheet.create({
    pageContent: {
      paddingTop: spacing * 2,
      paddingBottom: spacing * 30,
      backgroundColor: cBg,
    },
    logo: {
      fontSize: 22,
      fontWeight: "900",
      letterSpacing: -0.5,
    },
    dutyToggle: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.bgSurfaceAlt,
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: 99,
      gap: 6,
      borderWidth: 1,
      borderColor: tint(cText, 0.08, cBorder),
      ...Platform.select({
        ios: {
          shadowColor: cBrand,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        android: { elevation: 1 },
      }),
    },
    dutyToggleOn: {
      backgroundColor: cBrand,
      borderColor: tint(cBrand, 0.25, cBorder),
    },
    dutyDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: cMuted,
    },
    dutyDotOn: {
      backgroundColor: cOnBrand,
    },
    dutyText: {
      fontSize: 13,
      fontWeight: "800",
      color: cSub,
      letterSpacing: -0.2,
    },
    dutyTextOn: {
      color: cOnBrand,
    },

    topAlert: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing * 2,
      paddingVertical: spacing * 3,
      paddingHorizontal: spacing * 3,
      marginBottom: spacing * 4,
      borderWidth: 1,
      borderRadius: 12,
    },
    topAlertDanger: {
      backgroundColor: tint(cDanger, 0.08, cSurface),
      borderColor: tint(cDanger, 0.22, cBorder),
    },
    topAlertWarn: {
      backgroundColor: tint(cWarn, 0.1, cSurface),
      borderColor: tint(cWarn, 0.22, cBorder),
    },
    topAlertText: {
      flex: 1,
    },

    heroCard: {
      backgroundColor: cHero,
      borderRadius: 20,
      padding: spacing * 6,
      marginBottom: spacing * 5,
      overflow: "hidden",
    },
    heroTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing,
    },
    heroBadge: {
      backgroundColor: tint(cOnBrand, 0.2, cHero),
      paddingHorizontal: spacing * 2,
      paddingVertical: 2,
      borderRadius: 99,
    },
    heroAmount: {
      marginBottom: spacing * 5,
      letterSpacing: -0.6,
    },
    heroStats: {
      flexDirection: "row",
      gap: spacing * 3,
    },
    statItemDark: {
      flex: 1,
      backgroundColor: tint(cOnBrand, 0.1, cHero),
      padding: spacing * 3,
      borderRadius: 12,
    },
    heroLock: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: tint(cHero, 0.82, cHero),
      zIndex: 2,
      justifyContent: "center",
      alignItems: "center",
      padding: spacing * 5,
      gap: spacing * 2,
    },
    heroLockTitle: {
      marginBottom: spacing,
    },
    heroLockDesc: {
      textAlign: "center",
      marginBottom: spacing * 2,
    },
    heroLockBtn: {
      minWidth: 160,
    },
    noTruckCard: {
      borderRadius: 16,
      marginTop: -8,
      marginBottom: spacing * 5,
      padding: spacing * 4,
      borderWidth: 1,
      borderColor: tint(cWarn, 0.22, cBorder),
      backgroundColor: tint(cWarn, 0.08, cSurface),
      gap: spacing * 3,
    },
    noTruckRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing * 2,
    },
    noTruckTextWrap: {
      flex: 1,
      gap: 2,
    },
    noTruckBtn: {
      alignSelf: "flex-start",
    },
    summaryMetaText: {
      marginTop: -8,
      marginBottom: spacing * 4,
      paddingHorizontal: spacing,
    },

    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
      marginBottom: spacing * 3,
      paddingHorizontal: spacing,
    },

    dashboardCard: {
      borderRadius: 20,
      marginBottom: spacing * 6,
      padding: spacing * 4,
    },
    dashboardContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    dashboardItem: {
      flex: 1,
      alignItems: "center",
    },
    dashboardDivider: {
      width: 1,
      alignSelf: "stretch",
      backgroundColor: tint(cBorder, 0.75, cBorder),
      marginVertical: spacing,
    },

    quickGridCard: {
      borderRadius: 20,
      marginBottom: spacing * 6,
      padding: spacing * 4,
    },
    quickGrid: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    quickItem: {
      alignItems: "center",
      gap: spacing * 2,
      flex: 1,
    },
    quickItemDisabled: {
      opacity: 0.45,
    },
    quickIconCircle: {
      width: 48,
      height: 48,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      backgroundColor: tint(cBrand, 0.08, cSurface),
      borderColor: tint(cBrand, 0.22, cBorder),
    },
    quickIconCircleDisabled: {
      backgroundColor: tint(cMuted, 0.08, cSurface),
      borderColor: tint(cMuted, 0.22, cBorder),
    },

    noticeList: {
      gap: spacing * 2 + 2,
    },
    noticeCard: {
      flexDirection: "row",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: cBorder,
      padding: spacing * 4,
      gap: spacing * 3,
      backgroundColor: cSurface,
    },
    noticeIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    noticeContent: {
      flex: 1,
      gap: spacing,
    },
    noticeHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
  });
});

export function DriverHomePage() {
  const router = useRouter();
  const { data: homeSummary, isLoading, errorMessage } = useDriverHomeSummary();
  const theme = useAppTheme();
  const styles = useStyles();

  const [isOnDuty, setIsOnDuty] = useState(true);
  const isVerificationBlocked = homeSummary.restriction.isVerificationBlocked;
  const truckCount = homeSummary.truckCount;

  const cBrand = theme.colors.brandPrimary;
  const cText = theme.colors.textMain;
  const cSub = theme.colors.textSub;
  const cMuted = theme.colors.textMuted;
  const cOnBrand = theme.colors.textOnBrand;
  const cDanger = theme.colors.semanticDanger;
  const cWarn = theme.colors.semanticWarning;
  const cInfo = theme.colors.semanticInfo;
  const cSurface = theme.colors.bgSurface;

  const restrictionInfo = useMemo<RestrictionInfo | null>(() => {
    if (!isVerificationBlocked) return null;

    return {
      level: "danger",
      topMsg: "화물운송자격 인증이 필요합니다.",
      heroTitle: "운행 자격 미인증",
      heroDesc: "인증을 완료해야 매출 확인이 가능합니다.",
      btnText: "인증하러 가기",
      btnHref: "/(driver)/verification",
      notiTitle: "서비스 이용 제한",
      notiDesc: "자격 미인증 상태입니다. 인증 전에는 오더 수락/운행 기능이 제한됩니다.",
    };
  }, [isVerificationBlocked]);

  const restrictionLevel: RestrictionLevel = restrictionInfo?.level ?? "danger";
  const hasMockHint =
    homeSummary.mockInfo.isSettlementMockPossible || homeSummary.mockInfo.isMatchMockPossible;
  const hasAnnouncementListRoute = false;
  const noticeCards = useMemo<HomeNoticeCard[]>(() => {
    if (homeSummary.announcements.length > 0) {
      return homeSummary.announcements.map((announcement) => ({
        id: announcement.id,
        title: announcement.title,
        body: announcement.body ?? "",
        timeText: formatNoticeTimeText(announcement.publishedAt),
        icon: "notifications-outline",
        tone: "info",
      }));
    }

    if (homeSummary.dashboard.pendingResponses > 0) {
      return [
        {
          id: "pending-response",
          title: "응답 대기",
          body: `화주 응답 대기 중인 제안이 ${homeSummary.dashboard.pendingResponses}건 있습니다.`,
          timeText: "지금",
          icon: "time-outline",
          tone: "warn",
          route: { pathname: "/(driver)/run", params: { status: "NEGOTIATING" } },
        },
      ];
    }

    return [
      {
        id: "notice-empty",
        title: "새로운 중요 알림이 없습니다",
        body: "업무 관련 알림이 생기면 여기에 표시됩니다.",
        timeText: "지금",
        icon: "information-circle-outline",
        tone: "info",
      },
    ];
  }, [homeSummary.announcements, homeSummary.dashboard.pendingResponses]);

  return (
    <PageScaffold
      title=""
      headerLeft={
        <AppText style={styles.logo} color={cBrand}>
          Rodia
        </AppText>
      }
      headerRight={
        <Pressable style={[styles.dutyToggle, isOnDuty && styles.dutyToggleOn]} onPress={() => setIsOnDuty((prev) => !prev)}>
          <View style={[styles.dutyDot, isOnDuty && styles.dutyDotOn]} />
          <AppText variant="caption" weight="800" style={[styles.dutyText, isOnDuty && styles.dutyTextOn]}>
            {isOnDuty ? "운행중 ON" : "퇴근 OFF"}
          </AppText>
        </Pressable>
      }
      backgroundColor={theme.colors.bgSurfaceAlt}
      scroll={true}
      contentStyle={styles.pageContent}
    >
      {restrictionInfo ? (
        <View style={[styles.topAlert, restrictionLevel === "warn" ? styles.topAlertWarn : styles.topAlertDanger]}>
          <Ionicons
            name={restrictionLevel === "warn" ? "warning-outline" : "alert-circle-outline"}
            size={18}
            color={restrictionLevel === "warn" ? cWarn : cDanger}
          />
          <AppText
            variant="detail"
            weight="700"
            style={styles.topAlertText}
            color={restrictionLevel === "warn" ? cWarn : cDanger}
          >
            {restrictionInfo.topMsg}
          </AppText>
        </View>
      ) : null}

      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <AppText variant="caption" color={tint(cOnBrand, 0.82, cOnBrand)}>
            이번 달 정산 합계
          </AppText>
        </View>

        <AppText variant="title" size={32} weight="900" style={styles.heroAmount} color={cOnBrand}>
          {formatKrw(homeSummary.hero.monthPayout, "0원")}
        </AppText>

        <View style={styles.heroStats}>
          <View style={styles.statItemDark}>
            <AppText variant="caption" color={tint(cOnBrand, 0.7, cOnBrand)}>
              이번 주 완료
            </AppText>
            <AppText variant="detail" weight="800" color={cOnBrand}>
              {`${homeSummary.hero.weeklyCompletedCount}건`}
            </AppText>
          </View>
          <View style={styles.statItemDark}>
            <AppText variant="caption" color={tint(cOnBrand, 0.7, cOnBrand)}>
              입금 예정
            </AppText>
            <AppText variant="detail" weight="800" color={cOnBrand}>
              {formatKrw(homeSummary.hero.pendingPayout, "0원")}
            </AppText>
          </View>
        </View>

        {restrictionInfo ? (
          <View style={styles.heroLock}>
            <AppText variant="heading" weight="800" color={cOnBrand} style={styles.heroLockTitle}>
              {restrictionInfo.heroTitle}
            </AppText>
            <AppText variant="detail" weight="600" color={tint(cOnBrand, 0.86, cOnBrand)} style={styles.heroLockDesc}>
              {restrictionInfo.heroDesc}
            </AppText>
            <AppButton
              title={restrictionInfo.btnText}
              size="md"
              onPress={() => router.push(restrictionInfo.btnHref)}
              style={styles.heroLockBtn}
            />
          </View>
        ) : null}
      </View>
      {hasMockHint ? (
        <AppText variant="caption" weight="600" color={cSub} style={styles.summaryMetaText}>
          테스트 모드에서는 일부 지표가 모의 데이터일 수 있습니다.
        </AppText>
      ) : null}
      {isLoading ? (
        <AppText variant="caption" weight="600" color={cSub} style={styles.summaryMetaText}>
          홈 데이터를 불러오는 중입니다.
        </AppText>
      ) : null}
      {errorMessage ? (
        <AppText variant="caption" weight="600" color={cWarn} style={styles.summaryMetaText}>
          {errorMessage}
        </AppText>
      ) : null}
      {truckCount === 0 ? (
        <AppCard outlined style={styles.noTruckCard}>
          <View style={styles.noTruckRow}>
            <Ionicons name="alert-circle-outline" size={18} color={cWarn} />
            <View style={styles.noTruckTextWrap}>
              <AppText variant="detail" weight="800" color={cText}>
                등록된 차량이 없네요
              </AppText>
              <AppText variant="caption" weight="600" color={cSub}>
                우선 차량을 등록해보세요.
              </AppText>
            </View>
          </View>
          <AppButton
            title="차량 등록하러 가기"
            size="sm"
            onPress={() => router.push("/(driver)/settings/truck-create" as never)}
            style={styles.noTruckBtn}
          />
        </AppCard>
      ) : null}

      <View style={styles.sectionHeader}>
        <AppText variant="heading" weight="800" color={cText}>
          오늘 업무 현황
        </AppText>
      </View>
      <AppCard outlined style={styles.dashboardCard}>
        <View style={styles.dashboardContainer}>
          <Pressable style={styles.dashboardItem} onPress={() => router.push("/(driver)/quotes")}>
            <AppText variant="title" weight="900" color={cText}>
              {homeSummary.dashboard.openMatches}
            </AppText>
            <AppText variant="caption" weight="700" color={cMuted}>
              수락 가능 오더
            </AppText>
          </Pressable>
          <View style={styles.dashboardDivider} />
          <Pressable
            style={styles.dashboardItem}
            onPress={() => router.push({ pathname: "/(driver)/run", params: { status: "NEGOTIATING" } })}
          >
            <AppText variant="title" weight="900" color={cText}>
              {homeSummary.dashboard.pendingResponses}
            </AppText>
            <AppText variant="caption" weight="700" color={cMuted}>
              응답 대기
            </AppText>
          </Pressable>
          <View style={styles.dashboardDivider} />
          <Pressable
            style={styles.dashboardItem}
            onPress={() => router.push({ pathname: "/(driver)/run", params: { status: "TRANSIT" } })}
          >
            <AppText variant="title" weight="900" color={cBrand}>
              {homeSummary.dashboard.inTransit}
            </AppText>
            <AppText variant="caption" weight="700" color={cBrand}>
              운행중
            </AppText>
          </Pressable>
        </View>
      </AppCard>

      <View style={styles.sectionHeader}>
        <AppText variant="heading" weight="800" color={cText}>
          빠른 실행
        </AppText>
      </View>
      <AppCard outlined style={styles.quickGridCard}>
        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map((item) => (
            <Pressable
              key={item.label}
              style={[styles.quickItem, item.disabled && styles.quickItemDisabled]}
              onPress={() => {
                if (item.disabled || !item.href) return;
                router.push(item.href);
              }}
              disabled={item.disabled || !item.href}
            >
              <View style={[styles.quickIconCircle, item.disabled && styles.quickIconCircleDisabled]}>
                <Ionicons name={item.icon} size={20} color={item.disabled ? cMuted : cBrand} />
              </View>
              <AppText variant="caption" weight="700" color={item.disabled ? cMuted : cSub}>
                {item.label}
              </AppText>
            </Pressable>
          ))}
        </View>
      </AppCard>

      <View style={styles.sectionHeader}>
        <AppText variant="heading" weight="800" color={cText}>
          중요 알림
        </AppText>
        {hasAnnouncementListRoute ? (
          <AppText variant="caption" weight="700" color={cSub}>
            전체보기
          </AppText>
        ) : null}
      </View>
      <View style={styles.noticeList}>
        {restrictionInfo ? (
          <View style={styles.noticeCard}>
            <View
              style={[
                styles.noticeIconWrap,
                { backgroundColor: tint(restrictionLevel === "warn" ? cWarn : cInfo, 0.12, cSurface) },
              ]}
            >
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={restrictionLevel === "warn" ? cWarn : cInfo}
              />
            </View>
            <View style={styles.noticeContent}>
              <View style={styles.noticeHeader}>
                <AppText variant="detail" weight="800" color={cText}>
                  {restrictionInfo.notiTitle}
                </AppText>
                <AppText variant="caption" weight="700" color={cMuted}>
                  지금
                </AppText>
              </View>
              <AppText variant="detail" color={cSub}>
                {restrictionInfo.notiDesc}
              </AppText>
            </View>
          </View>
        ) : null}

        {noticeCards.map((notice) => {
          const content = (
            <>
              <View
                style={[
                  styles.noticeIconWrap,
                  { backgroundColor: tint(notice.tone === "warn" ? cWarn : cInfo, 0.12, cSurface) },
                ]}
              >
                <Ionicons name={notice.icon} size={20} color={notice.tone === "warn" ? cWarn : cInfo} />
              </View>
              <View style={styles.noticeContent}>
                <View style={styles.noticeHeader}>
                  <AppText variant="detail" weight="800" color={cText}>
                    {notice.title}
                  </AppText>
                  <AppText variant="caption" weight="700" color={cMuted}>
                    {notice.timeText}
                  </AppText>
                </View>
                <AppText variant="detail" color={cSub}>
                  {notice.body}
                </AppText>
              </View>
            </>
          );

          if (!notice.route) {
            return (
              <View key={notice.id} style={styles.noticeCard}>
                {content}
              </View>
            );
          }

          return (
            <Pressable key={notice.id} style={styles.noticeCard} onPress={() => router.push(notice.route as never)}>
              {content}
            </Pressable>
          );
        })}
      </View>
    </PageScaffold>
  );
}

export default DriverHomePage;
