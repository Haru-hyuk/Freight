import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Alert, Image, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useAuth } from "@/features/auth/model/useAuth";
import { safeNumber, safeString, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

type MenuAction = {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  danger?: boolean;
};

type SummaryStat = {
  id: string;
  label: string;
  value: string;
  accent?: boolean;
  onPress: () => void;
};

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const radiusCard = safeNumber(theme?.components?.card?.radius, 20);
  const radiusControl = safeNumber(theme?.layout?.radii?.control, 12);
  const radiusPill = safeNumber(theme?.layout?.radii?.pill, 999);

  const cSurface = safeString(theme?.colors?.bgSurface, "#FFFFFF");
  const cSurfaceAlt = safeString(theme?.colors?.bgSurfaceAlt, "#F8FAFC");
  const cBorder = safeString(theme?.colors?.borderDefault, "#E2E8F0");
  const cText = safeString(theme?.colors?.textMain, "#111827");
  const cSub = safeString(theme?.colors?.textSub, "#334155");
  const cMuted = safeString(theme?.colors?.textMuted, "#64748B");
  const cBrand = safeString(theme?.colors?.brandPrimary, "#FF6A00");
  const cOnBrand = safeString(theme?.colors?.textOnBrand, "#FFFFFF");
  const cDanger = safeString(theme?.colors?.semanticDanger, "#EF4444");
  const cPressed = safeString(theme?.colors?.stateOverlayPressed, tint(cText, 0.04, cSurface));

  return StyleSheet.create({
    pageContent: {
      paddingTop: spacing * 4,
      paddingBottom: spacing * 28,
      backgroundColor: cSurfaceAlt,
      paddingHorizontal: spacing * 5,
    },
    
    // --- Profile Section ---
    profileCard: {
      borderRadius: radiusCard,
      marginBottom: spacing * 4,
      padding: spacing * 5,
      backgroundColor: cSurface,
    },
    profileRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing * 4,
    },
    avatar: {
      width: spacing * 15,
      height: spacing * 15,
      borderRadius: radiusPill,
      backgroundColor: cSurfaceAlt,
      borderWidth: 1,
      borderColor: cBorder,
    },
    profileInfo: {
      flex: 1,
      minWidth: 0,
      justifyContent: "center",
      gap: spacing,
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing * 2,
    },
    bizBadge: {
      paddingHorizontal: spacing * 2,
      paddingVertical: 2,
      borderRadius: radiusPill,
      backgroundColor: tint(cBrand, 0.1, cSurface),
    },
    bizBadgeText: {
      color: cBrand,
    },
    verificationWrap: {
      marginTop: spacing,
      alignSelf: "flex-start",
    },

    // --- Stats Section ---
    statsCard: {
      borderRadius: radiusCard,
      marginBottom: spacing * 6,
      paddingVertical: spacing * 4,
      paddingHorizontal: spacing * 2,
      backgroundColor: cSurface,
    },
    statsRow: {
      flexDirection: "row",
      alignItems: "stretch",
    },
    statItem: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      minHeight: spacing * 14,
      borderRadius: radiusControl,
      gap: spacing * 1.5,
    },
    statItemPressed: {
      backgroundColor: cPressed,
    },
    statDivider: {
      width: 1,
      marginVertical: spacing * 3,
      backgroundColor: cBorder,
    },
    statValue: {
      color: cText,
      fontWeight: "800",
      fontSize: 22,
      letterSpacing: -0.2,
    },
    statValueAccentWrap: {
      borderRadius: radiusPill,
      backgroundColor: tint(cBrand, 0.1, cSurface),
      paddingHorizontal: spacing * 4,
      paddingVertical: spacing + 2,
    },
    statValueAccent: {
      color: cBrand,
      fontWeight: "800",
      fontSize: 20,
      letterSpacing: -0.2,
    },

    // --- Menu Section ---
    sectionHeader: {
      marginBottom: spacing * 3,
      marginLeft: spacing,
    },
    sectionCard: {
      borderRadius: radiusCard,
      marginBottom: spacing * 6,
      padding: 0,
      overflow: "hidden",
      backgroundColor: cSurface,
    },
    menuItem: {
      minHeight: 56,
      paddingHorizontal: spacing * 5,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing * 3,
      backgroundColor: cSurface,
    },
    menuItemPressed: {
      backgroundColor: cPressed,
    },
    menuIconWrap: {
      width: 24,
      alignItems: "center",
    },
    menuDivider: {
      height: 1,
      backgroundColor: cBorder,
      marginLeft: spacing * 5,
    },
    
    // --- Utilities ---
    textDanger: {
      color: cDanger,
    },
    textBrand: {
      color: cBrand,
    },
    textMain: {
      color: cText,
    },
    textSub: {
      color: cSub,
    },
    textMuted: {
      color: cMuted,
    },
    versionText: {
      textAlign: "center",
      marginTop: spacing * 2,
      color: cMuted,
    },
  });
});

function SummaryRow({
  stat,
  isLast,
  styles,
}: {
  stat: SummaryStat;
  isLast: boolean;
  styles: ReturnType<typeof useStyles>;
}) {
  return (
    <>
      <Pressable
        onPress={stat.onPress}
        style={({ pressed }) => [styles.statItem, pressed && styles.statItemPressed]}
      >
        {stat.accent ? (
          <View style={styles.statValueAccentWrap}>
            <AppText style={styles.statValueAccent}>{stat.value}</AppText>
          </View>
        ) : (
          <AppText style={styles.statValue}>{stat.value}</AppText>
        )}
        <AppText variant="caption" weight="600" style={styles.textSub}>
          {stat.label}
        </AppText>
      </Pressable>
      {!isLast ? <View style={styles.statDivider} /> : null}
    </>
  );
}

function MenuRow({
  item,
  isLast,
  styles,
}: {
  item: MenuAction;
  isLast: boolean;
  styles: ReturnType<typeof useStyles>;
}) {
  return (
    <>
      <Pressable 
        onPress={item.onPress} 
        style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
      >
        <View style={styles.menuIconWrap}>
          <Ionicons
            name={item.icon}
            size={20}
            color={item.danger ? styles.textDanger.color : styles.textSub.color}
          />
        </View>
        <AppText
          variant="body"
          weight="600"
          style={item.danger ? styles.textDanger : styles.textMain}
        >
          {item.title}
        </AppText>
        <View style={{ flex: 1 }} />
        <Ionicons name="chevron-forward" size={18} color={styles.textMuted.color} />
      </Pressable>
      {!isLast ? <View style={styles.menuDivider} /> : null}
    </>
  );
}

export function ShipperProfilePage() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useStyles();
  const auth = useAuth();
  const navLockRef = useRef(false);
  const navUnlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cBg = safeString(theme?.colors?.bgSurfaceAlt, "#F8FAFC");
  const cText = safeString(theme?.colors?.textMain, "#111827");
  const cBrand = safeString(theme?.colors?.brandPrimary, "#FF6A00");
  const cOnBrand = safeString(theme?.colors?.textOnBrand, "#FFFFFF");

  const user = auth.user as { name?: string; email?: string } | null;
  const profileName = safeString(user?.name, "로디아 화주");
  const email = safeString(user?.email, "shipper@rodia.co.kr");
  const isVerified = auth.pendingVerificationRole !== "shipper";

  useEffect(() => {
    return () => {
      if (navUnlockTimerRef.current) {
        clearTimeout(navUnlockTimerRef.current);
      }
    };
  }, []);

  const pushRouteOnce = useCallback((path: string) => {
    if (navLockRef.current) return;
    navLockRef.current = true;
    router.push(path as never);
    if (navUnlockTimerRef.current) {
      clearTimeout(navUnlockTimerRef.current);
    }
    navUnlockTimerRef.current = setTimeout(() => {
      navLockRef.current = false;
      navUnlockTimerRef.current = null;
    }, 300);
  }, [router]);

  const pushSettingsOnce = useCallback(() => {
    pushRouteOnce("/(shipper)/settings");
  }, [pushRouteOnce]);

  const avatarBg = cBrand.replace("#", "");
  const avatarFg = cOnBrand.replace("#", "");
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    profileName
  )}&background=${avatarBg}&color=${avatarFg}&size=128&bold=true`;

  const stats = useMemo<SummaryStat[]>(
    () => [
      {
        id: "in-progress",
        label: "진행중",
        value: "3",
        accent: true,
        onPress: () => router.push("/(shipper)/matchings"),
      },
      {
        id: "request-history",
        label: "견적요청",
        value: "15",
        onPress: () => router.push("/(shipper)/quotes"),
      },
      {
        id: "settlement-wait",
        label: "정산대기",
        value: "1",
        onPress: () => Alert.alert("정산 내역", "정산 상세 화면을 준비 중입니다."),
      },
    ],
    [router]
  );

  const businessMenus = useMemo<MenuAction[]>(
    () => [
      {
        id: "settings-home",
        title: "설정/내 정보 관리",
        icon: "settings-outline",
        onPress: pushSettingsOnce,
      },
      {
        id: "biz-verification",
        title: "사업자 정보 및 인증 관리",
        icon: "business-outline",
        onPress: () => pushRouteOnce("/(shipper)/settings/business"),
      },
      {
        id: "addresses",
        title: "상하차지 주소 관리",
        icon: "map-outline",
        onPress: () => pushRouteOnce("/(shipper)/settings/addresses"),
      },
      {
        id: "payment",
        title: "운임 결제 수단 관리",
        icon: "card-outline",
        onPress: () => pushRouteOnce("/(shipper)/settings/payments"),
      },
      {
        id: "tax-invoice",
        title: "세금계산서 발행 내역",
        icon: "receipt-outline",
        onPress: () => pushRouteOnce("/(shipper)/settings/tax-invoices"),
      },
    ],
    [pushRouteOnce, pushSettingsOnce]
  );

  const supportMenus = useMemo<MenuAction[]>(
    () => [
      {
        id: "notice",
        title: "공지사항",
        icon: "megaphone-outline",
        onPress: () => Alert.alert("공지사항", "공지사항 화면을 준비 중입니다."),
      },
      {
        id: "help",
        title: "1:1 문의 / 고객센터",
        icon: "chatbubbles-outline",
        onPress: () => Alert.alert("고객센터", "고객센터 화면을 준비 중입니다."),
      },
      {
        id: "terms",
        title: "이용약관",
        icon: "document-text-outline",
        onPress: () => Alert.alert("이용약관", "약관 화면을 준비 중입니다."),
      },
    ],
    []
  );

  const accountMenus = useMemo<MenuAction[]>(
    () => [
      {
        id: "logout",
        title: auth.isBusy ? "로그아웃 중..." : "로그아웃",
        icon: "log-out-outline",
        danger: true,
        onPress: async () => {
          if (auth.isBusy) return;
          try {
            await auth.logout();
          } catch (error) {
            console.error(error);
            Alert.alert("오류", "로그아웃 처리 중 문제가 발생했습니다.");
          }
        },
      },
    ],
    [auth]
  );

  return (
    <PageScaffold
      title="내 정보"
      backgroundColor={cBg}
      scroll={true}
      contentStyle={styles.pageContent}
      headerRight={
        <AppButton
          size="icon"
          variant="secondary"
          accessibilityLabel="설정"
          onPress={pushSettingsOnce}
        >
          <Ionicons name="settings-outline" size={24} color={cText} />
        </AppButton>
      }
    >
      {/* 프로필 요약 카드 */}
      <AppCard outlined elevated={false} style={styles.profileCard}>
        <View style={styles.profileRow}>
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <AppText variant="title" weight="800" numberOfLines={1} style={styles.textMain}>
                {profileName}
              </AppText>
              <View style={styles.bizBadge}>
                <AppText variant="caption" weight="800" style={styles.bizBadgeText}>
                  BIZ
                </AppText>
              </View>
            </View>
            <AppText variant="detail" numberOfLines={1} style={styles.textMuted}>
              {email}
            </AppText>
            
            {/* 인증 상태를 이름/이메일 하단에 깔끔하게 배치 */}
            <View style={styles.verificationWrap}>
              <AppText 
                variant="caption" 
                weight="700" 
                style={isVerified ? styles.textBrand : styles.textDanger}
              >
                {isVerified ? "✓ 사업자 인증 완료" : "⚠ 사업자 인증 필요"}
              </AppText>
            </View>
          </View>
          
          <AppButton
            size="icon"
            variant="secondary"
            onPress={() => Alert.alert("프로필 관리", "프로필 수정 화면을 준비 중입니다.")}
          >
            <Ionicons name="chevron-forward" size={18} color={cText} />
          </AppButton>
        </View>
      </AppCard>

      {/* 통계 카드 */}
      <AppCard outlined elevated={false} style={styles.statsCard}>
        <View style={styles.statsRow}>
          {stats.map((stat, index) => (
            <SummaryRow key={stat.id} stat={stat} isLast={index === stats.length - 1} styles={styles} />
          ))}
        </View>
      </AppCard>

      {/* 비즈니스 관리 메뉴 */}
      <View style={styles.sectionHeader}>
        <AppText variant="caption" weight="700" style={styles.textMuted}>
          비즈니스 관리
        </AppText>
      </View>
      <AppCard outlined elevated={false} style={styles.sectionCard}>
        {businessMenus.map((item, index) => (
          <MenuRow key={item.id} item={item} isLast={index === businessMenus.length - 1} styles={styles} />
        ))}
      </AppCard>

      {/* 고객 지원 메뉴 */}
      <View style={styles.sectionHeader}>
        <AppText variant="caption" weight="700" style={styles.textMuted}>
          고객 지원
        </AppText>
      </View>
      <AppCard outlined elevated={false} style={styles.sectionCard}>
        {supportMenus.map((item, index) => (
          <MenuRow key={item.id} item={item} isLast={index === supportMenus.length - 1} styles={styles} />
        ))}
      </AppCard>

      {/* 계정 (로그아웃 등) */}
      <AppCard outlined elevated={false} style={styles.sectionCard}>
        {accountMenus.map((item, index) => (
          <MenuRow key={item.id} item={item} isLast={index === accountMenus.length - 1} styles={styles} />
        ))}
      </AppCard>

      <AppText variant="caption" style={styles.versionText}>
        현재 버전 v1.2.0
      </AppText>
    </PageScaffold>
  );
}

export default ShipperProfilePage;
