// src/pages/shipper/ShipperHomePage.tsx
import React from "react";
import {
  Pressable,
  StyleSheet,
  View,
  Image,
  Alert,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { safeNumber, safeString, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

// --- Mock Data ---
const RECENT_ROUTES = [
  {
    id: "route-1",
    from: "성남 분당",
    to: "청주 흥덕",
    vehicle: "5톤 윙바디",
    date: "2월 5일 완료",
  },
  {
    id: "route-2",
    from: "서울 마포",
    to: "경기 고양",
    vehicle: "1톤 카고",
    date: "1월 28일 완료",
  },
];

const VIEW_PRESSED: ViewStyle = { opacity: 0.85, transform: [{ scale: 0.98 }] };

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const radiusCard = safeNumber(theme?.components?.card?.radius, safeNumber(theme?.layout?.radii?.card, 16));
  const radiusControl = safeNumber(theme?.layout?.radii?.control, 12);
  const buttonLg = safeNumber(theme?.components?.button?.sizes?.lg?.minHeight, 52);
  const buttonMd = safeNumber(theme?.components?.button?.sizes?.md?.minHeight, 44);

  const cText = safeString(theme?.colors?.textMain, "#111827");
  const cMuted = safeString(theme?.colors?.textMuted, "#64748B");
  const cBorder = safeString(theme?.colors?.borderDefault, "#E2E8F0");
  const cSurface = safeString(theme?.colors?.bgSurface, "#FFFFFF");
  const cSurfaceAlt = safeString(theme?.colors?.bgSurfaceAlt, "#F5F7FA");
  const cPrimary = safeString(theme?.colors?.brandPrimary, "#FF6A00");
  const cPressed = safeString(theme?.colors?.stateOverlayPressed, tint(cText, 0.06, cSurfaceAlt));

  const cInputBg = tint(cBorder, 0.2, cSurfaceAlt);
  const cGuideDeco = tint(cPrimary, 0.14, cSurfaceAlt);
  const cConnector = tint(cBorder, 0.95, cBorder);

  return StyleSheet.create({
    logoText: {
      fontSize: 22,
      fontWeight: "800",
      letterSpacing: -0.5,
    },
    profileBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: cBorder,
      backgroundColor: cSurface,
    },
    profileImg: {
      width: "100%",
      height: "100%",
    },

    // Hero Section
    heroSection: {
      marginTop: spacing * 4,
      marginBottom: spacing * 5,
    },
    pageContent: {
      paddingTop: 0,
    },
    heroTitle: {
      fontSize: safeNumber(theme?.typography?.scale?.title?.size, 22) + 4,
      fontWeight: "800",
      lineHeight: safeNumber(theme?.typography?.scale?.title?.lineHeight, 30) + 5,
    },

    // Quote Card (Main Request)
    quoteCard: {
      borderRadius: radiusCard,
      padding: safeNumber(theme?.components?.card?.paddingMd, 20) + spacing,
      marginBottom: spacing * 7,
    },
    inputGroup: {
      marginBottom: spacing * 6,
      position: "relative",
    },
    connectorLine: {
      position: "absolute",
      left: spacing * 5,
      top: spacing * 6,
      bottom: spacing * 6,
      width: 1,
      borderLeftWidth: 2,
      borderLeftColor: cConnector,
      borderStyle: "dashed",
      zIndex: 1,
    },
    inputRow: {
      position: "relative",
      zIndex: 2,
      marginBottom: spacing * 3,
    },
    inputRowLast: {
      marginBottom: 0,
    },
    inputIcon: {
      position: "absolute",
      left: spacing * 3 + 2,
      top: spacing * 5 - 1,
      width: 12,
      height: 12,
      borderRadius: 6,
      zIndex: 3,
    },
    inputField: {
      width: "100%",
      height: buttonLg,
      backgroundColor: cInputBg,
      borderRadius: radiusControl,
      justifyContent: "center",
      paddingLeft: spacing * 10 + 2,
      paddingRight: spacing * 4,
      borderWidth: 1,
      borderColor: "transparent",
    },
    placeholderText: {
      fontSize: 16,
      fontWeight: "600",
      color: cMuted,
    },
    quoteActionButton: {
      width: "100%",
      minHeight: buttonLg,
    },

    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing * 3 + 2,
      marginTop: spacing * 2,
    },

    recentList: {
      gap: spacing * 3,
      marginBottom: spacing * 8,
    },
    recentItemPressable: {
      borderRadius: radiusCard,
      overflow: "hidden",
    },
    recentItemCard: {
      borderRadius: radiusCard,
    },
    recentItemPressed: {
      backgroundColor: cPressed,
      borderColor: cPrimary,
    },
    recentItemContent: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: safeNumber(theme?.components?.card?.paddingMd, 20),
    },
    routePathRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing,
    },
    routeArrow: {
      marginHorizontal: spacing * 2,
      marginTop: 1,
    },
    routeMetaRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    dotSeparator: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: cMuted,
      marginHorizontal: spacing + 2,
    },
    reorderBtn: {
      width: buttonMd - 4,
      height: buttonMd - 4,
      borderRadius: radiusControl - 2,
      backgroundColor: cInputBg,
      alignItems: "center",
      justifyContent: "center",
    },

    guideGrid: {
      flexDirection: "row",
      gap: spacing * 3,
      marginBottom: spacing * 5,
    },
    guideCard: {
      flex: 1,
      height: 130,
      backgroundColor: cSurface,
      borderRadius: radiusCard,
      padding: safeNumber(theme?.components?.card?.paddingSm, 16) + 2,
      borderWidth: 1,
      borderColor: cBorder,
      justifyContent: "space-between",
      overflow: "hidden",
    },
    guideIconBox: {
      width: buttonMd - 4,
      height: buttonMd - 4,
      borderRadius: (buttonMd - 4) / 2,
      backgroundColor: cInputBg,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "flex-end",
      zIndex: 2,
    },
    guideDeco: {
      position: "absolute",
      bottom: -15,
      right: -15,
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: cGuideDeco,
      opacity: 0.6,
      zIndex: 1,
    },
    bottomSpacer: {
      minHeight: spacing * 5,
    },
  });
});

export function ShipperHomePage() {
  const theme = useAppTheme();
  const styles = useStyles();

  // Colors
  const cText = safeString(theme?.colors?.textMain, "#111827");
  const cSub = safeString(theme?.colors?.textSub, "#334155");
  const cMuted = safeString(theme?.colors?.textMuted, "#64748B");
  const cPrimary = safeString(theme?.colors?.brandPrimary, "#FF6A00");
  const cSurface = safeString(theme?.colors?.bgSurface, "#FFFFFF");
  const cSurfaceAlt = safeString(theme?.colors?.bgSurfaceAlt, "#F5F7FA");
  const cOnBrand = safeString(theme?.colors?.textOnBrand, "#FFFFFF");

  const avatarBg = safeString(theme?.colors?.brandSecondary, cText).replace("#", "");
  const avatarFg = cOnBrand.replace("#", "");

  // Handlers (Mock)
  const goToRequest = () => {
    // navigation.navigate('Request');
    console.log("Navigate to Request");
  };

  const goToHistory = () => {
    // navigation.navigate('History');
    console.log("Navigate to History");
  };

  return (
    <PageScaffold
      title=""
      headerLeft={
        <AppText style={styles.logoText} color={cText}>
          Rodia
        </AppText>
      }
      headerRight={
        <Pressable style={styles.profileBtn} onPress={() => Alert.alert("마이페이지")}>
          <Image
            source={{
              uri: `https://ui-avatars.com/api/?name=HwaJu&background=${avatarBg}&color=${avatarFg}&size=128`,
            }}
            style={styles.profileImg}
          />
        </Pressable>
      }
      backgroundColor={cSurfaceAlt}
      scroll={true}
     contentStyle={styles.pageContent}
    >
      {/* 1. Hero Section */}
      <View style={styles.heroSection}>
        <AppText style={styles.heroTitle} color={cText}>
          <AppText style={styles.heroTitle} color={cPrimary}>
            안전한 화물,{"\n"}
          </AppText>
          어디로 보낼까요?
        </AppText>
      </View>

      {/* 2. Quote Card (Main Action) */}
      <AppCard style={styles.quoteCard} elevated={true} outlined={true}>
        <View style={styles.inputGroup}>
          {/* Dashed Line */}
          <View style={styles.connectorLine} />

          {/* Start Input */}
          <View style={styles.inputRow}>
            <View
              style={[
                styles.inputIcon,
                { backgroundColor: cText }, // Start Icon: Black Dot
              ]}
            />
            <Pressable
              style={({ pressed }) => [
                styles.inputField,
                pressed && { borderColor: cPrimary, backgroundColor: cSurface },
              ]}
              onPress={goToRequest}
            >
              <AppText style={styles.placeholderText}>출발지 (상차지)</AppText>
            </Pressable>
          </View>

          {/* End Input */}
          <View style={[styles.inputRow, styles.inputRowLast]}>
            <View
              style={[
                styles.inputIcon,
                {
                  backgroundColor: cSurface,
                  borderWidth: 3,
                  borderColor: cPrimary,
                }, // End Icon: Hollow Orange Dot
              ]}
            />
            <Pressable
              style={({ pressed }) => [
                styles.inputField,
                pressed && { borderColor: cPrimary, backgroundColor: cSurface },
              ]}
              onPress={goToRequest}
            >
              <AppText style={styles.placeholderText}>도착지 (하차지)</AppText>
            </Pressable>
          </View>
        </View>

        {/* Action Button */}
        <AppButton title="운임 조회하기" size="lg" style={styles.quoteActionButton} onPress={goToRequest} />
      </AppCard>

      {/* 3. Recent Routes */}
      <View style={styles.sectionHeader}>
        <AppText variant="heading" size={18} weight="700" color={cText}>
          최근 이용 경로
        </AppText>
        <Pressable onPress={goToHistory}>
          <AppText variant="caption" size={13} weight="500" color={cSub}>
            전체보기
          </AppText>
        </Pressable>
      </View>

      <View style={styles.recentList}>
        {RECENT_ROUTES.map((route) => (
          <Pressable
            key={route.id}
            style={({ pressed }) => [styles.recentItemPressable, pressed && VIEW_PRESSED]}
            onPress={goToRequest}
          >
            {({ pressed }) => (
              <AppCard
                style={[styles.recentItemCard, pressed && styles.recentItemPressed]}
                elevated={true}
                outlined={true}
              >
                <View style={styles.recentItemContent}>
                  <View>
                    <View style={styles.routePathRow}>
                      <AppText variant="body" size={16} weight="700" color={cText}>
                        {route.from}
                      </AppText>
                      <Ionicons name="arrow-forward" size={12} color={cMuted} style={styles.routeArrow} />
                      <AppText variant="body" size={16} weight="700" color={cText}>
                        {route.to}
                      </AppText>
                    </View>
                    <View style={styles.routeMetaRow}>
                      <AppText variant="caption" size={13} color={cSub}>
                        {route.vehicle}
                      </AppText>
                      <View style={styles.dotSeparator} />
                      <AppText variant="caption" size={13} color={cSub}>
                        {route.date}
                      </AppText>
                    </View>
                  </View>

                  <View style={styles.reorderBtn}>
                    <Ionicons name="refresh" size={18} color={cText} />
                  </View>
                </View>
              </AppCard>
            )}
          </Pressable>
        ))}
      </View>

      {/* 4. Guide Section */}
      <View style={styles.sectionHeader}>
        <AppText variant="heading" size={18} weight="700" color={cText}>
          알아두면 좋은 팁
        </AppText>
      </View>

      <View style={styles.guideGrid}>
        {/* Card 1: 차량 찾기 */}
        <Pressable
          style={({ pressed }) => [styles.guideCard, pressed && VIEW_PRESSED]}
          onPress={() => Alert.alert("차량 가이드")}
        >
          <View style={{ zIndex: 2 }}>
            <AppText variant="body" size={15} weight="700" color={cText} style={{ lineHeight: 21 }}>
              내 짐에 맞는{"\n"}차량 찾기
            </AppText>
            <AppText variant="caption" size={12} color={cSub} style={{ marginTop: 6 }}>
              화물 크기별 추천
            </AppText>
          </View>
          <View style={styles.guideIconBox}>
            <Ionicons name="cube-outline" size={20} color={cPrimary} />
          </View>
          <View style={styles.guideDeco} />
        </Pressable>

        {/* Card 2: 운임표 */}
        <Pressable
          style={({ pressed }) => [styles.guideCard, pressed && VIEW_PRESSED]}
          onPress={() => Alert.alert("요금 안내")}
        >
          <View style={{ zIndex: 2 }}>
            <AppText variant="body" size={15} weight="700" color={cText} style={{ lineHeight: 21 }}>
              거리별{"\n"}표준 운임표
            </AppText>
            <AppText variant="caption" size={12} color={cSub} style={{ marginTop: 6 }}>
              투명한 요금 확인
            </AppText>
          </View>
          <View style={styles.guideIconBox}>
            <Ionicons name="pricetag-outline" size={20} color={cPrimary} />
          </View>
          <View style={styles.guideDeco} />
        </Pressable>
      </View>
    </PageScaffold>
  );
}

export default ShipperHomePage;
