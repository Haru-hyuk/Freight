// src/pages/shipper/ShipperHomePage.tsx
import React, { useCallback, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  Image,
  Alert,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@/features/auth/model/useAuth";
import { listShipperQuotes } from "@/features/quote/api";
import type { QuoteListItem } from "@/entities/quote/model/quote.types";
import { formatDateTime } from "@/shared/lib/format/display";
import { CUSTOMER_UI_STATE, getCustomerUiStateFromBackendStatus } from "@/shared/lib/policy";

import { safeNumber, safeString, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";
import { RequestQuoteFab } from "@/widgets/shipper/RequestQuoteFab";

type RecentRouteItem = {
  id: string;
  from: string;
  to: string;
  vehicle: string;
  date: string;
  startAddr: string;
  endAddr: string;
};

const VEHICLE_TYPE_LABEL: Record<string, string> = {
  DAMAS: "다마스",
  LABO: "라보",
  TON_1: "1톤",
  TON_1_4: "1.4톤",
  TON_2_5: "2.5톤",
  TON_3_5: "3.5톤",
  TON_5: "5톤",
  TON_5_AXLE: "5톤축",
  TON_8: "8톤",
  TON_11: "11톤",
  TON_14: "14톤",
  TON_15: "15톤",
  TON_18: "18톤",
  TON_25: "25톤",
};

const VEHICLE_BODY_LABEL: Record<string, string> = {
  CARGO: "카고",
  WING_BODY: "윙바디",
  TOP_CAR: "탑차",
};

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
  const cSurfaceAlt = safeString(theme?.colors?.bgSurfaceAlt, "#F8FAFC");
  const cPrimary = safeString(theme?.colors?.brandPrimary, "#FF6A00");
  const cPressed = safeString(theme?.colors?.stateOverlayPressed, tint(cText, 0.04, cSurface));

  const cInputBg = tint(cText, 0.03, cSurface);
  const cGuideDeco = tint(cPrimary, 0.09, cSurfaceAlt);
  const cConnector = tint(cBorder, 0.72, cBorder);

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
      borderColor: tint(cPrimary, 0.28, cBorder),
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
      backgroundColor: tint(cPrimary, 0.08, cSurface),
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
    verificationModalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: spacing * 5,
    },
    verificationModalCard: {
      width: "100%",
      maxWidth: 380,
      borderRadius: radiusCard,
      padding: safeNumber(theme?.components?.card?.paddingMd, 20),
      gap: spacing * 3,
      backgroundColor: cSurface,
      borderWidth: 1,
      borderColor: cBorder,
    },
    verificationModalActions: {
      gap: spacing * 2,
    },
  });
});

export function ShipperHomePage() {
  const auth = useAuth();
  const theme = useAppTheme();
  const styles = useStyles();
  const router = useRouter();
  const isNavigating = useRef(false);
  const isVerificationBlocked = auth.pendingVerificationRole === "shipper";
  const [recentRoutes, setRecentRoutes] = useState<RecentRouteItem[]>([]);

  // Colors
  const cText = safeString(theme?.colors?.textMain, "#111827");
  const cSub = safeString(theme?.colors?.textSub, "#334155");
  const cMuted = safeString(theme?.colors?.textMuted, "#64748B");
  const cPrimary = safeString(theme?.colors?.brandPrimary, "#FF6A00");
  const cSurface = safeString(theme?.colors?.bgSurface, "#FFFFFF");
  const cSurfaceAlt = safeString(theme?.colors?.bgSurfaceAlt, "#F8FAFC");
  const cOnBrand = safeString(theme?.colors?.textOnBrand, "#FFFFFF");
  const cPrimarySoft = tint(cPrimary, 0.86, cPrimary);

  const avatarBg = safeString(theme?.colors?.brandSecondary, cText).replace("#", "");
  const avatarFg = cOnBrand.replace("#", "");

  const toRecentRouteItems = useCallback((quotes: QuoteListItem[]): RecentRouteItem[] => {
    return (Array.isArray(quotes) ? quotes : [])
      .filter((quote) => getCustomerUiStateFromBackendStatus(String(quote?.status ?? "")) === CUSTOMER_UI_STATE.COMPLETED)
      .sort((a, b) => {
        const at = Date.parse(String(a?.createdAt ?? ""));
        const bt = Date.parse(String(b?.createdAt ?? ""));
        const av = Number.isFinite(at) ? at : 0;
        const bv = Number.isFinite(bt) ? bt : 0;
        return bv - av;
      })
      .slice(0, 2)
      .map((quote, index) => {
        const vehicleTypeRaw = String(quote?.vehicleType ?? "").trim();
        const vehicleBodyRaw = String(quote?.vehicleBodyType ?? "").trim();
        const vehicleType = VEHICLE_TYPE_LABEL[vehicleTypeRaw] ?? vehicleTypeRaw;
        const vehicleBody = VEHICLE_BODY_LABEL[vehicleBodyRaw] ?? vehicleBodyRaw;
        const vehicle = [vehicleType, vehicleBody].filter(Boolean).join(" ").trim() || "차량 정보 없음";
        const date = `${formatDateTime(String(quote?.createdAt ?? ""), "-")} 완료`;
        const startAddr = String(quote?.originAddress ?? "").trim();
        const endAddr = String(quote?.destinationAddress ?? "").trim();

        return {
          id: `recent-${String(quote?.quoteId ?? index)}`,
          from: startAddr || "출발지 미입력",
          to: endAddr || "도착지 미입력",
          vehicle,
          date,
          startAddr,
          endAddr,
        };
      });
  }, []);

  const loadRecentRoutes = useCallback(async () => {
    try {
      const quotes = await listShipperQuotes();
      setRecentRoutes(toRecentRouteItems(quotes));
    } catch {
      setRecentRoutes([]);
    }
  }, [toRecentRouteItems]);

  useFocusEffect(
    useCallback(() => {
      void loadRecentRoutes();
    }, [loadRecentRoutes])
  );

  // Handlers
  const goToRequest = () => {
    if (isNavigating.current) return;

    // 즉시 잠금
    isNavigating.current = true;
    router.push("/(shipper)/quotes/create");
    setTimeout(() => {
      isNavigating.current = false;
    }, 1000);
  };

  const goToRequestWithRoute = (route: { startAddr?: string; endAddr?: string }) => {
    if (isNavigating.current) return;

    const startAddr = String(route?.startAddr ?? "").trim();
    const endAddr = String(route?.endAddr ?? "").trim();

    isNavigating.current = true;
    router.push({
      pathname: "/(shipper)/quotes/create",
      params: {
        prefillStartAddr: startAddr,
        prefillEndAddr: endAddr,
      },
    });
    setTimeout(() => {
      isNavigating.current = false;
    }, 1000);
  };

  const goToHistory = () => {
    router.push("/(shipper)/quotes");
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
        <Pressable style={styles.profileBtn} onPress={() => router.push("/(shipper)/profile")}>
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
      floating={<RequestQuoteFab onPress={goToRequest} accessibilityLabel="요청 등록" />}
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
        {recentRoutes.length > 0 ? (
          recentRoutes.map((route) => (
            <Pressable
              key={route.id}
              style={({ pressed }) => [styles.recentItemPressable, pressed && VIEW_PRESSED]}
              onPress={() => goToRequestWithRoute(route)}
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
          ))
        ) : (
          <AppCard style={styles.recentItemCard} elevated={true} outlined={true}>
            <View style={styles.recentItemContent}>
              <AppText variant="detail" color={cSub}>
                완료된 견적 내역이 없습니다.
              </AppText>
            </View>
          </AppCard>
        )}
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
            <Ionicons name="cube-outline" size={20} color={cPrimarySoft} />
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
            <Ionicons name="pricetag-outline" size={20} color={cPrimarySoft} />
          </View>
          <View style={styles.guideDeco} />
        </Pressable>
      </View>

      <View style={styles.bottomSpacer} />

      <Modal visible={isVerificationBlocked} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.verificationModalOverlay}>
          <View style={styles.verificationModalCard}>
            <AppText variant="heading" weight="800" color={cText}>
              계정 인증이 필요합니다
            </AppText>
            <AppText variant="detail" color={cSub}>
              화주 인증이 완료되어야 견적 생성과 주요 기능을 사용할 수 있습니다.
            </AppText>
            <View style={styles.verificationModalActions}>
              <AppButton title="인증하러 가기" size="lg" onPress={() => router.push("/(shipper)/verification")} />
            </View>
          </View>
        </View>
      </Modal>
    </PageScaffold>
  );
}

export default ShipperHomePage;
