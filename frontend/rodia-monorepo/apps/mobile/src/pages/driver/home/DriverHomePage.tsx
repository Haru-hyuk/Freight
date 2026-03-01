import React, { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useAuth } from "@/features/auth/model/useAuth";
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

const QUICK_ACTIONS: Array<{ icon: React.ComponentProps<typeof Ionicons>["name"]; label: string }> = [
  { icon: "document-text-outline", label: "정산서 발행" },
  { icon: "receipt-outline", label: "인수증 관리" },
  { icon: "notifications-outline", label: "공지사항" },
  { icon: "headset-outline", label: "고객센터" },
];

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
  const auth = useAuth();
  const theme = useAppTheme();
  const styles = useStyles();

  const [isOnDuty, setIsOnDuty] = useState(true);
  const isVerificationBlocked = auth.pendingVerificationRole === "driver";

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
            2월 예상 매출
          </AppText>
          <View style={styles.heroBadge}>
            <AppText variant="caption" weight="800" color={cOnBrand}>
              +12%
            </AppText>
          </View>
        </View>

        <AppText variant="title" size={32} weight="900" style={styles.heroAmount} color={cOnBrand}>
          4,250,000원
        </AppText>

        <View style={styles.heroStats}>
          <View style={styles.statItemDark}>
            <AppText variant="caption" color={tint(cOnBrand, 0.7, cOnBrand)}>
              이번 주 완료
            </AppText>
            <AppText variant="detail" weight="800" color={cOnBrand}>
              8건
            </AppText>
          </View>
          <View style={styles.statItemDark}>
            <AppText variant="caption" color={tint(cOnBrand, 0.7, cOnBrand)}>
              입금 예정
            </AppText>
            <AppText variant="detail" weight="800" color={cOnBrand}>
              850,000원
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

      <View style={styles.sectionHeader}>
        <AppText variant="heading" weight="800" color={cText}>
          오늘 업무 현황
        </AppText>
      </View>
      <AppCard outlined style={styles.dashboardCard}>
        <View style={styles.dashboardContainer}>
          <Pressable style={styles.dashboardItem}>
            <AppText variant="title" weight="900" color={cText}>
              0
            </AppText>
            <AppText variant="caption" weight="700" color={cMuted}>
              배정중
            </AppText>
          </Pressable>
          <View style={styles.dashboardDivider} />
          <Pressable style={styles.dashboardItem}>
            <AppText variant="title" weight="900" color={cText}>
              1
            </AppText>
            <AppText variant="caption" weight="700" color={cMuted}>
              결제대기
            </AppText>
          </Pressable>
          <View style={styles.dashboardDivider} />
          <Pressable style={styles.dashboardItem}>
            <AppText variant="title" weight="900" color={cBrand}>
              2
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
            <Pressable key={item.label} style={styles.quickItem}>
              <View style={styles.quickIconCircle}>
                <Ionicons name={item.icon} size={20} color={cBrand} />
              </View>
              <AppText variant="caption" weight="700" color={cSub}>
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
        <AppText variant="caption" weight="700" color={cSub}>
          전체보기
        </AppText>
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

        <View style={styles.noticeCard}>
          <View style={[styles.noticeIconWrap, { backgroundColor: tint(cWarn, 0.12, cSurface) }]}> 
            <Ionicons name="time-outline" size={20} color={cWarn} />
          </View>
          <View style={styles.noticeContent}>
            <View style={styles.noticeHeader}>
              <AppText variant="detail" weight="800" color={cText}>
                결제 대기
              </AppText>
              <AppText variant="caption" weight="700" color={cMuted}>
                방금
              </AppText>
            </View>
            <AppText variant="detail" color={cSub}>
              화주가 결제를 진행 중인 오더가 있습니다.
            </AppText>
          </View>
        </View>

        <View style={styles.noticeCard}>
          <View style={[styles.noticeIconWrap, { backgroundColor: tint(cInfo, 0.12, cSurface) }]}> 
            <Ionicons name="information-circle-outline" size={20} color={cInfo} />
          </View>
          <View style={styles.noticeContent}>
            <View style={styles.noticeHeader}>
              <AppText variant="detail" weight="800" color={cText}>
                요청 응답 대기
              </AppText>
              <AppText variant="caption" weight="700" color={cMuted}>
                10분 전
              </AppText>
            </View>
            <AppText variant="detail" color={cSub}>
              제안한 금액에 대한 화주 응답을 기다리고 있습니다.
            </AppText>
          </View>
        </View>
      </View>
    </PageScaffold>
  );
}

export default DriverHomePage;
