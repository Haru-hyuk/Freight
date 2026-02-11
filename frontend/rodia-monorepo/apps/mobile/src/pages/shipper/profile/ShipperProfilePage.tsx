import React, { useMemo } from "react";
import { Alert, Image, Pressable, StyleSheet, View, type ViewStyle } from "react-native";
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
  onPress: () => void;
  danger?: boolean;
};

const VIEW_PRESSED: ViewStyle = { opacity: 0.85, transform: [{ scale: 0.98 }] };

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const radiusCard = safeNumber(theme?.components?.card?.radius, safeNumber(theme?.layout?.radii?.card, 16));
  const radiusControl = safeNumber(theme?.layout?.radii?.control, 12);
  const buttonSm = safeNumber(theme?.components?.button?.sizes?.sm?.minHeight, 36);
  const cardPadding = safeNumber(theme?.components?.card?.paddingMd, 20);

  const cBg = safeString(theme?.colors?.bgMain, safeString(theme?.colors?.bgSurfaceAlt, safeString(theme?.colors?.bgSurface, "")));
  const cSurface = safeString(theme?.colors?.bgSurface, cBg);
  const cTextMain = safeString(theme?.colors?.textMain, safeString(theme?.colors?.textSub, safeString(theme?.colors?.textMuted, "")));
  const cTextSub = safeString(theme?.colors?.textSub, cTextMain);
  const cTextMuted = safeString(theme?.colors?.textMuted, cTextSub);
  const cBorder = safeString(theme?.colors?.borderDefault, safeString(theme?.colors?.borderStrong, cSurface));
  const cPrimary = safeString(theme?.colors?.brandPrimary, cTextMain);
  const cDanger = safeString(theme?.colors?.semanticDanger, cPrimary);

  const cPressed = safeString(theme?.colors?.stateOverlayPressed, tint(cTextMain, 0.06, cSurface));
  const cBizBadgeBg = tint(cPrimary, 0.1, cSurface);
  const cStatsAccentBg = tint(cPrimary, 0.14, cSurface);
  const cDivider = tint(cBorder, 0.65, cBorder);
  const cSectionLabel = tint(cTextSub, 0.9, cTextSub);

  return StyleSheet.create({
    pageContent: {
      paddingTop: spacing * 3,
      paddingBottom: spacing * 24,
      paddingHorizontal: spacing * 5,
      backgroundColor: cBg,
    },

    profileCard: {
      borderRadius: radiusCard,
      padding: cardPadding,
      marginBottom: spacing * 4,
    },
    profileRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing * 3,
    },
    avatar: {
      width: spacing * 15,
      height: spacing * 15,
      borderRadius: (spacing * 15) / 2,
      borderWidth: 1,
      borderColor: cDivider,
      backgroundColor: cSurface,
    },
    profileInfo: {
      flex: 1,
      minWidth: 0,
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing + 2,
      marginBottom: spacing,
    },
    bizBadge: {
      backgroundColor: cBizBadgeBg,
      borderRadius: radiusControl - 6,
      paddingHorizontal: spacing + 2,
      paddingVertical: 2,
    },
    profileEditBtn: {
      minHeight: buttonSm,
      paddingHorizontal: spacing * 3,
    },

    statsCard: {
      borderRadius: radiusCard,
      paddingVertical: spacing * 4 + 2,
      paddingHorizontal: spacing * 2,
      marginBottom: spacing * 5,
    },
    statsRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    statItem: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      minHeight: spacing * 13,
      borderRadius: radiusControl,
    },
    statPressed: {
      backgroundColor: cPressed,
    },
    statDivider: {
      width: 1,
      height: "65%",
      backgroundColor: cDivider,
      alignSelf: "center",
    },
    statNum: {
      color: cTextMain,
      fontWeight: "800",
      marginBottom: spacing,
    },
    statNumHighlight: {
      color: cPrimary,
      backgroundColor: cStatsAccentBg,
      paddingHorizontal: spacing * 2,
      paddingVertical: spacing,
      borderRadius: radiusControl - 6,
      overflow: "hidden",
    },

    sectionLabel: {
      color: cSectionLabel,
      fontWeight: "700",
      marginBottom: spacing * 2 + 2,
      marginLeft: spacing,
    },
    sectionGap: {
      marginTop: spacing * 2,
    },
    menuCard: {
      borderRadius: radiusCard,
      padding: 0,
      overflow: "hidden",
      marginBottom: spacing * 3,
    },
    menuItem: {
      minHeight: spacing * 13,
      paddingHorizontal: cardPadding,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: cDivider,
      backgroundColor: cSurface,
    },
    menuItemLast: {
      borderBottomWidth: 0,
    },
    menuItemPressed: {
      backgroundColor: cPressed,
    },

    footerActions: {
      marginTop: spacing * 4,
      gap: spacing * 2,
    },
    versionText: {
      textAlign: "center",
      color: cTextMuted,
      marginTop: spacing * 2,
    },
    textDanger: {
      color: cDanger,
    },
    textMain: {
      color: cTextMain,
    },
    textSub: {
      color: cTextSub,
    },
    textMuted: {
      color: cTextMuted,
    },
  });
});

function MenuRow({
  title,
  isLast,
  onPress,
  danger = false,
  styles,
}: {
  title: string;
  isLast: boolean;
  onPress: () => void;
  danger?: boolean;
  styles: ReturnType<typeof useStyles>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        isLast && styles.menuItemLast,
        pressed && styles.menuItemPressed,
      ]}
    >
      <AppText variant="detail" weight="600" style={danger ? styles.textDanger : styles.textMain}>
        {title}
      </AppText>
      <Ionicons name="chevron-forward" size={18} style={styles.textMuted} />
    </Pressable>
  );
}

export function ShipperProfilePage() {
  const theme = useAppTheme();
  const styles = useStyles();
  const router = useRouter();
  const auth = useAuth();

  const cBg = safeString(theme?.colors?.bgMain, safeString(theme?.colors?.bgSurfaceAlt, ""));
  const cTextMain = safeString(theme?.colors?.textMain, "");
  const cOnBrand = safeString(theme?.colors?.textOnBrand, safeString(theme?.colors?.textInverse, ""));

  const profileName = safeString((auth?.user as any)?.name, "(주) 로디아 유통");
  const email = safeString((auth?.user as any)?.email, "business@rodia.co.kr");

  const avatarBg = safeString(theme?.colors?.brandSecondary, cTextMain).replace("#", "");
  const avatarFg = cOnBrand.replace("#", "");
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(profileName)}&background=${avatarBg}&color=${avatarFg}&size=128`;

  const businessMenus = useMemo<MenuAction[]>(
    () => [
      { id: "payment", title: "결제 수단 관리", onPress: () => Alert.alert("결제 수단 관리") },
      { id: "tax", title: "세금계산서 정보", onPress: () => Alert.alert("세금계산서 정보") },
      { id: "address", title: "자주 쓰는 주소지", onPress: () => Alert.alert("주소지 관리") },
    ],
    []
  );

  const supportMenus = useMemo<MenuAction[]>(
    () => [
      { id: "notice", title: "공지사항", onPress: () => Alert.alert("공지사항") },
      { id: "support", title: "1:1 문의 / 고객센터", onPress: () => Alert.alert("고객센터") },
      { id: "terms", title: "이용약관", onPress: () => Alert.alert("이용약관") },
    ],
    []
  );

  const accountMenus = useMemo<MenuAction[]>(
    () => [
      { id: "logout", title: auth.isBusy ? "로그아웃 중..." : "로그아웃", onPress: async () => {
        try {
          await auth.logout();
          Alert.alert("로그아웃", "로그아웃되었습니다.");
        } catch (error) {
          console.error(error);
        }
      }, danger: true },
    ],
    [auth]
  );

  return (
    <PageScaffold
      title="내 정보"
      backgroundColor={cBg}
      contentStyle={styles.pageContent}
      headerRight={
        <AppButton
          size="icon"
          variant="secondary"
          accessibilityLabel="설정"
          onPress={() => Alert.alert("설정")}
        >
          <Ionicons name="settings-outline" size={18} color={cTextMain} />
        </AppButton>
      }
    >
      <AppCard outlined style={styles.profileCard}>
        <View style={styles.profileRow}>
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />

          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <AppText variant="heading" weight="800" numberOfLines={1} style={styles.textMain}>
                {profileName}
              </AppText>
              <View style={styles.bizBadge}>
                <AppText variant="caption" weight="800" style={styles.textDanger}>
                  BIZ
                </AppText>
              </View>
            </View>
            <AppText variant="caption" style={styles.textSub} numberOfLines={1}>
              {email}
            </AppText>
          </View>

          <AppButton
            title="편집"
            size="sm"
            variant="secondary"
            style={styles.profileEditBtn}
            onPress={() => Alert.alert("프로필 편집")}
          />
        </View>
      </AppCard>

      <AppCard outlined style={styles.statsCard}>
        <View style={styles.statsRow}>
          <Pressable style={({ pressed }) => [styles.statItem, pressed && styles.statPressed]} onPress={() => Alert.alert("쿠폰함")}>
            <AppText variant="heading" style={styles.statNum}>
              2
            </AppText>
            <AppText variant="caption" style={styles.textSub}>
              쿠폰함
            </AppText>
          </Pressable>

          <View style={styles.statDivider} />

          <Pressable style={({ pressed }) => [styles.statItem, pressed && styles.statPressed]} onPress={() => Alert.alert("포인트")}>
            <AppText variant="heading" style={styles.statNum}>
              2.5M
            </AppText>
            <AppText variant="caption" style={styles.textSub}>
              포인트
            </AppText>
          </Pressable>

          <View style={styles.statDivider} />

          <Pressable style={({ pressed }) => [styles.statItem, pressed && styles.statPressed]} onPress={() => router.push("/(shipper)/quotes")}>
            <AppText variant="heading" style={styles.statNum}>
              15
            </AppText>
            <AppText variant="caption" style={styles.textSub}>
              이용내역
            </AppText>
          </Pressable>
        </View>
      </AppCard>

      <View style={styles.sectionGap}>
        <AppText variant="caption" style={styles.sectionLabel}>
          비즈니스 관리
        </AppText>
        <AppCard outlined style={styles.menuCard}>
          {businessMenus.map((item, index) => (
            <MenuRow
              key={item.id}
              title={item.title}
              onPress={item.onPress}
              isLast={index === businessMenus.length - 1}
              styles={styles}
            />
          ))}
        </AppCard>
      </View>

      <View style={styles.sectionGap}>
        <AppText variant="caption" style={styles.sectionLabel}>
          고객 지원
        </AppText>
        <AppCard outlined style={styles.menuCard}>
          {supportMenus.map((item, index) => (
            <MenuRow
              key={item.id}
              title={item.title}
              onPress={item.onPress}
              isLast={index === supportMenus.length - 1}
              styles={styles}
            />
          ))}
        </AppCard>
      </View>

      <View style={styles.footerActions}>
        <AppCard outlined style={styles.menuCard}>
          {accountMenus.map((item, index) => (
            <MenuRow
              key={item.id}
              title={item.title}
              onPress={item.onPress}
              danger={item.danger}
              isLast={index === accountMenus.length - 1}
              styles={styles}
            />
          ))}
        </AppCard>
        <AppText variant="caption" style={styles.versionText}>
          현재 버전 v1.2.0
        </AppText>
      </View>
    </PageScaffold>
  );
}

export default ShipperProfilePage;
