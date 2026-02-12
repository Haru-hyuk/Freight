import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { safeNumber, safeString, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

type QuoteStatus = "received" | "dispatching" | "negotiating" | "assigned" | "pickup" | "transit" | "dropoff";
type DetailUiState = "dispatching" | "negotiating" | "payment" | "moving" | "completed";

type StatusPresentation = {
  badgeLabel: string;
  title: string;
  description: string;
  badgeBg: string;
  badgeText: string;
};

const KNOWN_STATUSES: readonly QuoteStatus[] = [
  "received",
  "dispatching",
  "negotiating",
  "assigned",
  "pickup",
  "transit",
  "dropoff",
];

function isQuoteStatus(value: unknown): value is QuoteStatus {
  return typeof value === "string" && KNOWN_STATUSES.includes(value as QuoteStatus);
}

function mapStatusToUiState(status: QuoteStatus): DetailUiState {
  if (status === "assigned") return "payment";
  if (status === "pickup" || status === "transit") return "moving";
  if (status === "dropoff") return "completed";
  if (status === "negotiating") return "negotiating";
  return "dispatching";
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
  const cDanger = safeString(colors?.semanticDanger, cPrimary);
  const cOnBrand = safeString(colors?.textOnBrand, safeString(colors?.textInverse, cSurface));

  const cDivider = tint(cBorder, 0.6, cBorder);
  const cCardBorder = tint(cBorder, 0.78, cBorder);
  const cMapBg = tint(cBorder, 0.35, cBgAlt);
  const cCallChip = tint(cTextMain, 0.06, cBgAlt);
  const cPillBg = tint(cSurface, 0.95, cSurface);

  const radiusCard = safeNumber(theme?.components?.card?.radius, safeNumber(theme?.layout?.radii?.card, 16));
  const radiusControl = safeNumber(theme?.layout?.radii?.control, 12);
  const cardPadding = safeNumber(theme?.components?.card?.paddingMd, 20);

  return StyleSheet.create({
    pageContent: {
      paddingTop: spacing * 4,
      paddingBottom: spacing * 22,
      paddingHorizontal: spacing * 5,
      backgroundColor: cBgMain,
    },
    sectionTitle: {
      marginBottom: spacing * 2 + 2,
      color: cTextSub,
      fontWeight: "700",
    },
    statusHeader: {
      marginBottom: spacing * 5,
    },
    statusBadge: {
      alignSelf: "flex-start",
      paddingVertical: spacing,
      paddingHorizontal: spacing * 2 + 2,
      borderRadius: radiusControl - 4,
      marginBottom: spacing * 3,
    },
    statusTitle: {
      color: cTextMain,
      fontWeight: "800",
      marginBottom: spacing * 2,
      lineHeight: safeNumber(theme?.typography?.scale?.title?.lineHeight, 30),
    },
    statusDescription: {
      color: cTextSub,
      lineHeight: safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20),
    },

    cardOuter: {
      marginBottom: spacing * 4,
      borderRadius: radiusCard,
      overflow: "hidden",
    },
    card: {
      borderRadius: radiusCard,
      padding: cardPadding,
      borderWidth: 1,
      borderColor: cCardBorder,
    },
    cardAccent: {
      borderLeftWidth: 4,
      borderLeftColor: cPrimary,
    },

    rowBetween: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    infoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing * 3,
      gap: spacing * 2,
    },
    labelText: {
      color: cTextSub,
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14),
    },
    valueText: {
      color: cTextMain,
      fontWeight: "700",
      textAlign: "right",
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14),
    },
    divider: {
      height: 1,
      backgroundColor: cDivider,
      marginVertical: spacing * 3 + 2,
    },

    quoteOfferCard: {
      borderColor: cPrimary,
      backgroundColor: tint(cPrimary, 0.05, cSurface),
    },
    priceOld: {
      color: cTextMuted,
      textDecorationLine: "line-through",
      fontWeight: "600",
    },
    priceMain: {
      color: cPrimary,
      fontWeight: "900",
      fontSize: safeNumber(theme?.typography?.scale?.title?.size, 22),
    },
    noteText: {
      color: cTextSub,
      lineHeight: safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20),
    },

    routeWrap: {
      position: "relative",
      paddingLeft: spacing * 4,
    },
    routeLine: {
      position: "absolute",
      left: spacing + 1,
      top: spacing + 2,
      bottom: spacing * 6,
      width: 1,
      borderLeftWidth: 1,
      borderLeftColor: cDivider,
      borderStyle: "dashed",
    },
    routeRow: {
      marginBottom: spacing * 6,
    },
    routeRowLast: {
      marginBottom: 0,
    },
    routeDot: {
      position: "absolute",
      left: -spacing * 4,
      top: spacing + 1,
      width: spacing * 3,
      height: spacing * 3,
      borderRadius: spacing * 1.5,
      borderWidth: 3,
      borderColor: cTextMain,
      backgroundColor: cSurface,
    },
    routeDotEnd: {
      borderColor: cPrimary,
    },
    routeAddress: {
      color: cTextMain,
      fontWeight: "700",
      marginBottom: spacing,
    },
    routeMeta: {
      color: cTextSub,
    },

    mapCard: {
      padding: spacing * 3,
      backgroundColor: cMapBg,
      borderColor: cDivider,
    },
    mapMock: {
      borderRadius: radiusControl,
      backgroundColor: tint(cTextMain, 0.06, cSurface),
      height: 172,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      marginBottom: spacing * 3,
      gap: spacing,
    },
    livePill: {
      position: "absolute",
      right: spacing * 3,
      bottom: spacing * 3,
      borderRadius: radiusControl - 4,
      backgroundColor: cPillBg,
      borderWidth: 1,
      borderColor: cDivider,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing,
      paddingHorizontal: spacing * 2,
      paddingVertical: spacing,
    },
    liveDot: {
      width: spacing + 2,
      height: spacing + 2,
      borderRadius: (spacing + 2) / 2,
      backgroundColor: cDanger,
    },

    driverRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing * 3,
    },
    avatarCircle: {
      width: spacing * 12,
      height: spacing * 12,
      borderRadius: spacing * 6,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tint(cSecondary, 0.12, cBgAlt),
    },
    iconRow: {
      flexDirection: "row",
      gap: spacing * 2,
    },
    iconChip: {
      width: spacing * 9,
      height: spacing * 9,
      borderRadius: spacing * 4.5,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: cDivider,
      backgroundColor: cCallChip,
    },

    bottomBar: {
      backgroundColor: cSurface,
      borderTopWidth: 1,
      borderTopColor: cDivider,
      paddingHorizontal: spacing * 5,
      paddingTop: spacing * 3 + 2,
      flexDirection: "row",
      gap: spacing * 2 + 2,
    },
    flex1: { flex: 1 },
    flex2: { flex: 2 },
    withBottomSpace: {
      minHeight: spacing * 8,
    },

    textPrimary: { color: cPrimary },
    textSecondary: { color: cSecondary },
    textAccent: { color: cAccent },
    textMuted: { color: cTextSub },
    badgePrimaryBg: { backgroundColor: tint(cPrimary, 0.12, cBgAlt) },
    badgeSecondaryBg: { backgroundColor: tint(cSecondary, 0.12, cBgAlt) },
    badgeAccentBg: { backgroundColor: tint(cAccent, 0.12, cBgAlt) },
    badgeNeutralBg: { backgroundColor: tint(cTextMain, 0.06, cBgAlt) },

    emphasisText: {
      color: cTextMain,
      fontWeight: "800",
      fontSize: safeNumber(theme?.typography?.scale?.heading?.size, 18),
    },
    helperMuted: {
      color: cTextSub,
    },
    buttonOnBrand: { color: cOnBrand },
  });
});

export default function QuoteDetailPage() {
  const styles = useStyles();
  const theme = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[]; quoteId?: string | string[]; status?: string | string[] }>();

  const pageBg = safeString(theme?.colors?.bgMain, safeString(theme?.colors?.bgSurfaceAlt, ""));
  const cTextMain = safeString(theme?.colors?.textMain, "");
  const cTextSub = safeString(theme?.colors?.textSub, cTextMain);
  const cBgAlt = safeString(theme?.colors?.bgSurfaceAlt, pageBg);
  const cPrimary = safeString(theme?.colors?.brandPrimary, cTextMain);
  const cSecondary = safeString(theme?.colors?.brandSecondary, cTextMain);
  const cAccent = safeString(theme?.colors?.brandAccent, cPrimary);

  const statusRaw = Array.isArray(params.status) ? params.status[0] : params.status;
  const status: QuoteStatus = isQuoteStatus(statusRaw) ? statusRaw : "negotiating";
  const uiState = mapStatusToUiState(status);
  const idParam = Array.isArray(params.id) ? params.id[0] : params.id;
  const quoteIdParam = Array.isArray(params.quoteId) ? params.quoteId[0] : params.quoteId;
  const quoteId = idParam ?? quoteIdParam;

  const statusPresentation = useMemo<StatusPresentation>(() => {
    if (uiState === "negotiating") {
      return {
        badgeLabel: "제안 도착",
        title: "새로운 금액 제안이 도착했습니다",
        description: "기사님 제안 금액과 메모를 확인하고 수락 여부를 선택해 주세요.",
        badgeBg: tint(cPrimary, 0.12, cBgAlt),
        badgeText: cPrimary,
      };
    }

    if (uiState === "payment") {
      return {
        badgeLabel: "배차 확정",
        title: "운송료 결제를 진행해주세요",
        description: "결제 완료 시 배차가 최종 확정되고 운송이 시작됩니다.",
        badgeBg: tint(cSecondary, 0.12, cBgAlt),
        badgeText: cSecondary,
      };
    }

    if (uiState === "moving") {
      return {
        badgeLabel: "이동 중",
        title: "화물이 목적지로 이동 중입니다",
        description: "기사님의 현재 위치와 도착 예정 시간을 확인할 수 있습니다.",
        badgeBg: tint(cAccent, 0.12, cBgAlt),
        badgeText: cAccent,
      };
    }

    if (uiState === "completed") {
      return {
        badgeLabel: "운송 완료",
        title: "운송이 안전하게 완료되었습니다",
        description: "인수증과 결제 내역을 확인하고 동일 경로를 재주문할 수 있습니다.",
        badgeBg: tint(cTextMain, 0.06, cBgAlt),
        badgeText: cTextSub,
      };
    }

    return {
      badgeLabel: "배차 중",
      title: "주변 기사님을 찾고 있습니다",
      description: "평균 5분 내에 배차가 완료됩니다. 잠시만 기다려주세요.",
      badgeBg: tint(cTextMain, 0.06, cBgAlt),
      badgeText: cTextSub,
    };
  }, [cAccent, cBgAlt, cPrimary, cSecondary, cTextMain, cTextSub, uiState]);

  const bottomBar = (
    <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom + 12, 18) }]}>
      {uiState === "negotiating" ? (
        <>
          <AppButton title="거절" variant="secondary" style={styles.flex1} onPress={() => {}} />
          <AppButton title="제안 수락하기" style={styles.flex2} onPress={() => {}} />
        </>
      ) : null}

      {uiState === "payment" ? <AppButton title="240,000원 결제하기" style={styles.flex1} onPress={() => {}} /> : null}

      {uiState === "moving" ? (
        <>
          <AppButton title="위치 상세" variant="secondary" style={styles.flex1} onPress={() => {}} />
          <AppButton title="상차 사진 보기" style={styles.flex1} onPress={() => {}} />
        </>
      ) : null}

      {uiState === "completed" ? (
        <>
          <AppButton title="인수증 보기" variant="secondary" style={styles.flex1} onPress={() => {}} />
          <AppButton title="재주문 하기" style={styles.flex1} onPress={() => {}} />
        </>
      ) : null}

      {uiState === "dispatching" ? (
        <>
          <AppButton title="요청 취소" variant="destructive" style={styles.flex1} onPress={() => {}} />
          <AppButton title="목록으로" variant="secondary" style={styles.flex1} onPress={() => router.back()} />
        </>
      ) : null}
    </View>
  );

  return (
    <PageScaffold
      title="상세 내역"
      subtitle={quoteId ? `요청 ID ${quoteId}` : undefined}
      backgroundColor={pageBg}
      contentStyle={styles.pageContent}
      bottomBar={bottomBar}
      onPressBack={() => router.back()}
      backLabel="뒤로"
    >
      <View style={styles.statusHeader}>
        <View style={[styles.statusBadge, { backgroundColor: statusPresentation.badgeBg }]}>
          <AppText variant="caption" weight="700" color={statusPresentation.badgeText}>
            {statusPresentation.badgeLabel}
          </AppText>
        </View>
        <AppText variant="title" style={styles.statusTitle}>
          {statusPresentation.title}
        </AppText>
        <AppText variant="detail" style={styles.statusDescription}>
          {statusPresentation.description}
        </AppText>
      </View>

      {uiState === "negotiating" ? (
        <View style={styles.cardOuter}>
          <AppCard outlined style={[styles.card, styles.quoteOfferCard, styles.cardAccent]}>
            <View style={styles.infoRow}>
              <AppText variant="detail" style={styles.labelText}>
                내 희망가
              </AppText>
              <AppText variant="detail" style={styles.priceOld}>
                220,000원
              </AppText>
            </View>
            <View style={[styles.infoRow, { marginBottom: 0 }]}>
              <AppText variant="detail" style={styles.emphasisText}>
                기사님 제안가
              </AppText>
              <AppText variant="title" style={styles.priceMain}>
                240,000원
              </AppText>
            </View>
            <View style={styles.divider} />
            <AppText variant="detail" style={styles.noteText}>
              상차지 골목 진입이 어려워 수작업 비용 포함하여 제안드립니다.
            </AppText>
          </AppCard>
        </View>
      ) : null}

      {uiState === "moving" ? (
        <View style={styles.cardOuter}>
          <AppCard outlined style={[styles.card, styles.mapCard]}>
            <View style={styles.mapMock}>
              <Ionicons name="map-outline" size={32} color={cTextSub} />
              <AppText variant="detail" color={cTextSub}>
                실시간 위치를 불러오는 중입니다
              </AppText>
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <AppText variant="caption" weight="700" color={cTextMain}>
                  실시간 위치
                </AppText>
              </View>
            </View>
            <View style={styles.rowBetween}>
              <AppText variant="detail" color={cTextSub}>
                현재 위치: 천안 JC 인근
              </AppText>
              <AppText variant="detail" weight="700" color={cTextMain}>
                도착 예정 14:30
              </AppText>
            </View>
          </AppCard>
        </View>
      ) : null}

      {(uiState === "payment" || uiState === "moving" || uiState === "completed") ? (
        <View style={styles.cardOuter}>
          <AppCard outlined style={styles.card}>
            <View style={styles.driverRow}>
              <View style={styles.avatarCircle}>
                <AppText variant="detail" weight="800" color={cTextMain}>
                  김
                </AppText>
              </View>

              <View style={styles.flex1}>
                <AppText variant="body" weight="800" color={cTextMain}>
                  김기사 파트너
                </AppText>
                <AppText variant="caption" style={styles.helperMuted}>
                  현대 파비스 5톤 · 평점 4.9
                </AppText>
              </View>

              <View style={styles.iconRow}>
                <Pressable accessibilityRole="button" style={styles.iconChip}>
                  <Ionicons name="call-outline" size={16} color={cTextSub} />
                </Pressable>
                <Pressable accessibilityRole="button" style={styles.iconChip}>
                  <Ionicons name="chatbubble-outline" size={16} color={cTextSub} />
                </Pressable>
              </View>
            </View>
          </AppCard>
        </View>
      ) : null}

      <AppText variant="caption" style={styles.sectionTitle}>
        운송 경로
      </AppText>
      <View style={styles.cardOuter}>
        <AppCard outlined style={styles.card}>
          <View style={styles.routeWrap}>
            <View style={styles.routeLine} />

            <View style={styles.routeRow}>
              <View style={styles.routeDot} />
              <AppText variant="body" style={styles.routeAddress}>
                경기 성남시 분당구 판교역로
              </AppText>
              <AppText variant="caption" style={styles.routeMeta}>
                2월 9일 (월) 10:30 상차
              </AppText>
            </View>

            <View style={[styles.routeRow, styles.routeRowLast]}>
              <View style={[styles.routeDot, styles.routeDotEnd]} />
              <AppText variant="body" style={styles.routeAddress}>
                충북 청주시 흥덕구 직지대로
              </AppText>
              <AppText variant="caption" style={styles.routeMeta}>
                2월 9일 (월) 14:30 하차 예정
              </AppText>
            </View>
          </View>
        </AppCard>
      </View>

      <AppText variant="caption" style={styles.sectionTitle}>
        화물 상세
      </AppText>
      <View style={styles.cardOuter}>
        <AppCard outlined style={styles.card}>
          <View style={styles.infoRow}>
            <AppText variant="detail" style={styles.labelText}>
              차량 종류
            </AppText>
            <AppText variant="detail" style={styles.valueText}>
              5톤 윙바디
            </AppText>
          </View>

          <View style={styles.infoRow}>
            <AppText variant="detail" style={styles.labelText}>
              화물 품목
            </AppText>
            <AppText variant="detail" style={styles.valueText}>
              파렛트 12개, 박스짐
            </AppText>
          </View>

          <View style={styles.infoRow}>
            <AppText variant="detail" style={styles.labelText}>
              옵션
            </AppText>
            <AppText variant="detail" style={styles.valueText}>
              독차, 수작업 지원 (+20,000원)
            </AppText>
          </View>

          <View style={styles.divider} />
          <View style={[styles.infoRow, { marginBottom: 0, alignItems: "flex-start" }]}>
            <AppText variant="detail" style={styles.labelText}>
              기사님 요청사항
            </AppText>
            <AppText variant="detail" style={[styles.valueText, { fontWeight: "400", lineHeight: 20 }]}>
              도착 30분 전 연락주세요.{"\n"}지게차 대기 중입니다.
            </AppText>
          </View>
        </AppCard>
      </View>

      {(uiState === "payment" || uiState === "moving" || uiState === "completed") ? (
        <>
          <AppText variant="caption" style={styles.sectionTitle}>
            결제 정보
          </AppText>
          <View style={styles.cardOuter}>
            <AppCard outlined style={styles.card}>
              <View style={styles.infoRow}>
                <AppText variant="detail" style={styles.labelText}>
                  기본 운송료
                </AppText>
                <AppText variant="detail" style={styles.valueText}>
                  220,000원
                </AppText>
              </View>

              <View style={styles.infoRow}>
                <AppText variant="detail" style={styles.labelText}>
                  추가 옵션비
                </AppText>
                <AppText variant="detail" style={styles.valueText}>
                  +20,000원
                </AppText>
              </View>

              <View style={styles.divider} />
              <View style={[styles.infoRow, { marginBottom: 0 }]}>
                <AppText variant="body" style={styles.valueText}>
                  총 결제 금액
                </AppText>
                <AppText variant="title" style={styles.emphasisText}>
                  240,000원
                </AppText>
              </View>
            </AppCard>
          </View>
        </>
      ) : null}

      <View style={styles.withBottomSpace} />
    </PageScaffold>
  );
}
