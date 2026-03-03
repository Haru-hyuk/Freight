import React, { useCallback, useMemo } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Pressable } from "react-native";
import { router } from "expo-router";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppText } from "@/shared/ui/kit/AppText";
import {
  getCustomerCta,
  getCustomerStatusBadgeLabel,
  getCustomerStatusTitle,
  type BackendStatus,
  type CustomerCtaConfig,
  type CustomerUiState,
} from "../api/usage-history-mapper";
import { useMatchingActions } from "../model/useMatchingActions";

// ---------------------------------------------------------------------------
// Data contract
// ---------------------------------------------------------------------------
export type ParsedUsageHistoryItem = {
  id: string;
  quoteId: number;
  matchId?: number;
  /** 역제안(PROPOSED) 상태일 때 수락/거절 API에 필요한 counterOfferId */
  counterOfferId?: number;
  status: string;
  backendStatus: BackendStatus;
  uiState: CustomerUiState;
  statusTone: "primary" | "secondary" | "destructive" | "accent" | "neutral";
  originAddress: string;
  destinationAddress: string;
  priceText: string;
  vehicleText: string;
  dateText: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export type UsageHistoryCardProps = {
  item: ParsedUsageHistoryItem;
};

type BadgeTokens = { bg: string; border: string; text: string };

function getBadgeTokens(theme: ReturnType<typeof useAppTheme>, uiState: CustomerUiState): BadgeTokens {
  switch (uiState) {
    case "PROPOSED":
    case "PAYMENT_REQUIRED":
      return { bg: theme.colors.stateOverlayPressed, border: theme.colors.brandPrimary, text: theme.colors.brandPrimary };
    case "PICKUP_IN_PROGRESS":
    case "TRANSIT_IN_PROGRESS":
      return { bg: theme.colors.stateOverlayPressed, border: theme.colors.borderDefault, text: theme.colors.brandPrimary };
    case "COMPLETED":
      return { bg: theme.colors.bgSurface, border: theme.colors.borderStrong, text: theme.colors.textMain };
    case "CANCELED":
      return { bg: theme.colors.bgSurface, border: theme.colors.borderDefault, text: theme.colors.textMuted };
    case "REQUESTED":
    default:
      return { bg: theme.colors.bgSurface, border: theme.colors.borderDefault, text: theme.colors.textMuted };
  }
}

export function UsageHistoryCard({ item }: UsageHistoryCardProps) {
  const theme = useAppTheme();
  const styles = useCardStyles();
  const actions = useMatchingActions();

  const { uiState, badgeLabel, statusTitle, ctas, badgeTokens } = useMemo(() => {
    const uiState = item.uiState;
    return {
      uiState,
      badgeLabel: getCustomerStatusBadgeLabel(uiState),
      statusTitle: getCustomerStatusTitle(uiState),
      ctas: getCustomerCta(uiState) ?? [],
      badgeTokens: getBadgeTokens(theme, uiState),
    };
  }, [item.uiState, theme]);

  // 카드 전체 탭 → 상세 페이지
  const handlePress = useCallback(() => {
    router.push({
      pathname: "/(shipper)/quotes/[id]",
      params: { id: String(item.quoteId), status: item.status },
    } as any);
  }, [item.quoteId, item.status]);

  // CTA 버튼별 액션 분기
  const handleCtaAction = useCallback(
    (ctaConfig: CustomerCtaConfig) => {
      const detailParams = {
        id: String(item.quoteId),
        status: item.status,
        matchId: item.matchId ? String(item.matchId) : undefined,
        backendStatus: item.backendStatus,
        uiState,
      } as const;

      switch (ctaConfig.id) {
        case "ACCEPT":
          // Alert 확인 → API 호출 → 성공 시 결제 페이지로 이동
          actions.acceptProposal(item.counterOfferId ?? 0, () => {
            actions.initiatePayment({
              quoteId: item.quoteId,
              matchId: item.matchId,
              status: item.status,
              backendStatus: item.backendStatus,
              uiState,
            });
          });
          break;

        case "REJECT":
          // Alert 확인 → API 호출 → 성공 시 완료 알림
          actions.rejectProposal(item.counterOfferId ?? 0, () => {
            Alert.alert("거절 완료", "기사님의 제안을 거절했습니다.\n새로운 배차를 기다려 주세요.");
          });
          break;

        case "PAY":
          actions.initiatePayment({
            quoteId: item.quoteId,
            matchId: item.matchId,
            status: item.status,
            backendStatus: item.backendStatus,
            uiState,
          });
          break;

        default:
          // TRACK, RECEIPT, RE_REQUEST → 상세 페이지에서 처리
          router.push({
            pathname: "/(shipper)/quotes/[id]",
            params: { ...detailParams, action: ctaConfig.id },
          } as any);
      }
    },
    [actions, item, uiState]
  );

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      android_ripple={{ color: theme.colors.stateOverlayPressed, borderless: false }}
    >
      {/* 상단: 상태 배지 + 날짜 */}
      <View style={styles.topRow}>
        <View style={[styles.statusBadge, { backgroundColor: badgeTokens.bg, borderColor: badgeTokens.border }]}>
          <AppText variant="caption" weight="600" style={{ color: badgeTokens.text }}>
            {badgeLabel}
          </AppText>
        </View>
        <AppText variant="caption" color="textMuted">
          {item.dateText}
        </AppText>
      </View>

      {/* 상태 설명 */}
      <AppText variant="detail" weight="500" color="textSub" numberOfLines={1} style={styles.statusTitle}>
        {statusTitle}
      </AppText>

      {/* 경로 */}
      <View style={styles.routeSection}>
        <View style={styles.routeRow}>
          <View style={styles.dotCol}>
            <View style={[styles.dot, { backgroundColor: theme.colors.brandPrimary }]} />
            <View style={[styles.connectorLine, { backgroundColor: theme.colors.borderStrong }]} />
          </View>
          <AppText variant="body" weight="500" color="textMain" numberOfLines={1} style={styles.routeLabel}>
            {item.originAddress}
          </AppText>
        </View>

        <View style={styles.routeRow}>
          <View style={styles.dotCol}>
            <View style={[styles.dot, { backgroundColor: theme.colors.textMuted }]} />
          </View>
          <AppText variant="body" weight="500" color="textSub" numberOfLines={1} style={styles.routeLabel}>
            {item.destinationAddress}
          </AppText>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.colors.borderDefault }]} />

      {/* 하단: 차량 정보 + 금액 */}
      <View style={styles.bottomRow}>
        <AppText variant="detail" color="textMuted">
          {item.vehicleText}
        </AppText>
        <AppText variant="body" weight="800" color="brandPrimary">
          {item.priceText}
        </AppText>
      </View>

      {/* CTA 버튼 영역 */}
      {ctas.length > 0 && (
        <View style={[styles.ctaWrap, ctas.length > 1 ? styles.ctaRow : undefined]}>
          {ctas.map((ctaConfig) => {
            // 버튼별 로딩 상태: ACCEPT는 isAccepting, REJECT는 isRejecting
            const isCtaLoading =
              (ctaConfig.id === "ACCEPT" && actions.isAccepting) ||
              (ctaConfig.id === "REJECT" && actions.isRejecting);

            return (
              <AppButton
                key={ctaConfig.id}
                title={ctaConfig.label}
                variant={ctaConfig.variant}
                size="md"
                loading={isCtaLoading}
                // 어느 한 버튼이 진행 중이면 양쪽 모두 비활성화 (멱등성 보장)
                disabled={actions.isLoading || !ctaConfig.enabled}
                style={[styles.ctaButton, ctas.length > 1 ? styles.ctaFlex : undefined]}
                // 카드 전체 onPress 이벤트 전파 차단
                onPressIn={(e) => e.stopPropagation?.()}
                onPress={() => handleCtaAction(ctaConfig)}
              />
            );
          })}
        </View>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const useCardStyles = createThemedStyles((theme) => ({
  card: {
    backgroundColor: theme.colors.bgSurface,
    borderRadius: theme.layout.radii.card,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.88,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.layout.radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusTitle: {
    marginBottom: 14,
  },
  routeSection: {
    marginBottom: 16,
    gap: 0,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  dotCol: {
    width: 8,
    alignItems: "center",
    paddingTop: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectorLine: {
    width: 1.5,
    height: 20,
    marginTop: 4,
  },
  routeLabel: {
    flex: 1,
    paddingBottom: 18,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 14,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ctaWrap: {
    marginTop: 14,
  },
  ctaRow: {
    flexDirection: "row",
    gap: 8,
  },
  ctaFlex: {
    flex: 1,
  },
  ctaButton: {
    borderRadius: theme.layout.radii.pill,
  },
}));
