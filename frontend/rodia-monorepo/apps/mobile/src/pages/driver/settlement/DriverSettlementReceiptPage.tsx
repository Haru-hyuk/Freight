import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Alert, ScrollView, Share, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { getDriverSettlementByMatch } from "@/features/driver-profile/api/driver-settlement-api";
import { SettlementPriceBreakdown } from "@/features/settlement/ui/SettlementPriceBreakdown";
import type { SettlementResponse } from "@/shared/api/generated/schemas/settlementResponse";
import { readApiErrorMessage } from "@/shared/lib/api/readApiErrorMessage";
import { formatDateTime, formatKrw } from "@/shared/lib/format/display";
import { safeNumber, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppRequestState } from "@/shared/ui/kit/AppRequestState";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

type RouteParams = {
  matchId?: string | string[];
};

function readRouteParamText(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw.trim() : "";
}

function parsePositiveInt(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function toMoneyText(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return formatKrw(value, "0원");
}

function toDateText(value: string | undefined): string {
  return formatDateTime(value, "-");
}

function toSettlementStatusLabel(value: string | undefined): string {
  const token = String(value ?? "")
    .trim()
    .toUpperCase();
  if (!token) return "상태 확인 필요";
  if (token === "COMPLETED") return "정산 완료";
  if (token === "PENDING") return "정산 대기";
  if (token === "FAILED") return "정산 실패";
  return "상태 확인 필요";
}

function toPaymentStatusLabel(value: string | undefined): string {
  const token = String(value ?? "")
    .trim()
    .toUpperCase();
  if (!token) return "상태 확인 필요";
  if (token === "PAID") return "결제 완료";
  if (token === "PENDING") return "결제 대기";
  if (token === "FAILED") return "결제 실패";
  return "상태 확인 필요";
}

function toPaymentMethodLabel(value: string | undefined): string {
  const token = String(value ?? "")
    .trim()
    .toUpperCase();
  if (!token) return "-";
  if (token === "CARD") return "카드";
  if (token === "BANK_TRANSFER") return "계좌이체";
  if (token === "VIRTUAL_ACCOUNT") return "가상계좌";
  if (token === "EASY_PAY") return "간편결제";
  if (token === "TOSS_PAY") return "토스페이";
  if (token === "CASH") return "현금";
  return "기타 결제수단";
}

function toSettlementTypeLabel(value: string | undefined): string {
  const token = String(value ?? "")
    .trim()
    .toUpperCase();
  if (!token) return "-";
  if (token === "STANDARD") return "일반 정산";
  if (token === "FAST") return "급행 정산";
  return "기타 정산";
}

function resolvePayoutDate(settlement: SettlementResponse): string | undefined {
  return settlement.shipperPaidAt ?? settlement.completedAt ?? settlement.createdAt;
}

function buildShareText(settlement: SettlementResponse): string {
  return [
    "[Rodia 기사 정산서]",
    `지급액: ${toMoneyText(settlement.driverPayout)}`,
    `정산 상태: ${toSettlementStatusLabel(settlement.settlementStatus)}`,
    `지급일: ${toDateText(resolvePayoutDate(settlement))}`,
    `정산 유형: ${toSettlementTypeLabel(settlement.settlementType)}`,
  ].join("\n");
}

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme.layout.spacing.base, 4);

  return StyleSheet.create({
    content: {
      paddingTop: spacing * 3,
      paddingBottom: spacing * 24,
      gap: spacing * 3,
    },
    summaryCard: {
      borderWidth: 1,
      borderColor: tint(theme.colors.brandPrimary, 0.24, theme.colors.borderDefault),
      backgroundColor: tint(theme.colors.brandPrimary, 0.04, theme.colors.bgSurface),
      padding: spacing * 4,
      gap: spacing * 2,
    },
    summaryAmountWrap: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderDefault,
      paddingBottom: spacing * 2,
      marginBottom: spacing * 2,
      gap: spacing * 0.5,
    },
    summaryAmount: {
      color: theme.colors.brandPrimary,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing * 2,
      minHeight: 24,
    },
    rowLabel: {
      color: theme.colors.textMuted,
      flexShrink: 0,
    },
    rowValue: {
      color: theme.colors.textMain,
      textAlign: "right",
      flex: 1,
    },
    section: {
      gap: spacing * 2,
    },
    sectionTitle: {
      color: theme.colors.textMain,
    },
    infoCard: {
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      backgroundColor: theme.colors.bgSurface,
      padding: spacing * 3,
      gap: spacing * 2,
    },
    emptyWrap: {
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      borderRadius: 12,
      backgroundColor: theme.colors.bgSurface,
      padding: spacing * 4,
      alignItems: "center",
      gap: spacing * 2,
    },
    shareButton: {
      minHeight: 48,
      marginHorizontal: spacing * 4,
      marginBottom: spacing,
    },
  });
});

export function DriverSettlementReceiptPage() {
  const params = useLocalSearchParams<RouteParams>();
  const router = useRouter();
  const styles = useStyles();
  const theme = useAppTheme();

  const matchId = React.useMemo(() => parsePositiveInt(readRouteParamText(params.matchId)), [params.matchId]);

  const [settlement, setSettlement] = React.useState<SettlementResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isSharing, setIsSharing] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const loadReceipt = React.useCallback(
    async (refresh = false) => {
      if (matchId <= 0) {
        setSettlement(null);
        setErrorMessage("유효한 매칭 정보를 찾지 못했습니다.");
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage(null);

      try {
        const next = await getDriverSettlementByMatch(matchId);
        setSettlement(next);
      } catch (error) {
        setSettlement(null);
        setErrorMessage(readApiErrorMessage(error, "정산서를 불러오지 못했습니다."));
      } finally {
        if (refresh) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [matchId]
  );

  React.useEffect(() => {
    void loadReceipt(false);
  }, [loadReceipt]);

  const handleShare = React.useCallback(async () => {
    if (!settlement || isLoading || isRefreshing || isSharing) return;

    setIsSharing(true);
    try {
      await Share.share({ message: buildShareText(settlement) });
    } catch (error) {
      Alert.alert("공유 실패", readApiErrorMessage(error, "정산서 공유에 실패했습니다."));
    } finally {
      setIsSharing(false);
    }
  }, [isLoading, isRefreshing, isSharing, settlement]);

  const payoutDateText = settlement ? toDateText(resolvePayoutDate(settlement)) : "-";

  return (
    <PageScaffold
      title="정산서"
      subtitle="지급 내역 확인"
      backgroundColor={theme.colors.bgSurfaceAlt}
      contentStyle={styles.content}
      onPressBack={() => router.back()}
      backLabel="이전"
      bottomBar={
        <AppButton
          title="정산서 공유하기"
          variant="secondary"
          left={<Ionicons name="share-outline" size={16} color={theme.colors.textMain} />}
          onPress={() => void handleShare()}
          loading={isSharing}
          disabled={!settlement || isLoading || isRefreshing || isSharing}
          style={styles.shareButton}
        />
      }
    >
      <AppRequestState
        isLoading={isLoading}
        loadingLabel="정산서를 불러오는 중입니다."
        errorMessage={errorMessage}
        errorTitle="정산서를 불러오지 못했습니다."
        retryLabel={isRefreshing ? "재시도 중..." : "다시 시도"}
        onRetry={() => {
          if (isRefreshing) return;
          void loadReceipt(true);
        }}
        fullScreen={false}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {settlement ? (
            <>
              <AppCard elevated={false} style={styles.summaryCard}>
                <View style={styles.summaryAmountWrap}>
                  <AppText variant="caption" color="textMuted">
                    이번 정산 지급액
                  </AppText>
                  <AppText variant="display" weight="900" style={styles.summaryAmount}>
                    {toMoneyText(settlement.driverPayout)}
                  </AppText>
                </View>

                <View style={styles.row}>
                  <AppText variant="caption" style={styles.rowLabel}>
                    정산 상태
                  </AppText>
                  <AppText variant="detail" weight="700" style={styles.rowValue}>
                    {toSettlementStatusLabel(settlement.settlementStatus)}
                  </AppText>
                </View>

                <View style={styles.row}>
                  <AppText variant="caption" style={styles.rowLabel}>
                    결제 상태
                  </AppText>
                  <AppText variant="detail" weight="700" style={styles.rowValue}>
                    {toPaymentStatusLabel(settlement.shipperPaymentStatus)}
                  </AppText>
                </View>

                <View style={styles.row}>
                  <AppText variant="caption" style={styles.rowLabel}>
                    지급 일자
                  </AppText>
                  <AppText variant="detail" weight="700" style={styles.rowValue}>
                    {payoutDateText}
                  </AppText>
                </View>

                <View style={styles.row}>
                  <AppText variant="caption" style={styles.rowLabel}>
                    정산 유형
                  </AppText>
                  <AppText variant="detail" weight="700" style={styles.rowValue}>
                    {toSettlementTypeLabel(settlement.settlementType)}
                  </AppText>
                </View>

                <View style={styles.row}>
                  <AppText variant="caption" style={styles.rowLabel}>
                    결제 수단
                  </AppText>
                  <AppText variant="detail" weight="700" style={styles.rowValue}>
                    {toPaymentMethodLabel(settlement.shipperPaymentMethod)}
                  </AppText>
                </View>
              </AppCard>

              <View style={styles.section}>
                <AppText variant="heading" weight="900" style={styles.sectionTitle}>
                  운행/정산 정보
                </AppText>
                <AppCard elevated={false} style={styles.infoCard}>
                  <View style={styles.row}>
                    <AppText variant="caption" style={styles.rowLabel}>
                      정산 대상
                    </AppText>
                    <AppText variant="detail" weight="700" style={styles.rowValue}>
                      운행 정산 건
                    </AppText>
                  </View>
                  <View style={styles.row}>
                    <AppText variant="caption" style={styles.rowLabel}>
                      정산 완료 시각
                    </AppText>
                    <AppText variant="detail" weight="700" style={styles.rowValue}>
                      {toDateText(settlement.completedAt)}
                    </AppText>
                  </View>
                  <View style={styles.row}>
                    <AppText variant="caption" style={styles.rowLabel}>
                      결제 기한
                    </AppText>
                    <AppText variant="detail" weight="700" style={styles.rowValue}>
                      {toDateText(settlement.dueDate)}
                    </AppText>
                  </View>
                </AppCard>
              </View>

              <SettlementPriceBreakdown title="정산 금액 내역" settlement={settlement} />
            </>
          ) : (
            <View style={styles.emptyWrap}>
              <AppText variant="detail" color="textSub">
                정산서를 확인할 수 없습니다.
              </AppText>
              <AppButton
                title={isRefreshing ? "재시도 중..." : "다시 시도"}
                variant="secondary"
                loading={isRefreshing}
                disabled={isRefreshing}
                onPress={() => void loadReceipt(true)}
              />
            </View>
          )}
        </ScrollView>
      </AppRequestState>
    </PageScaffold>
  );
}

export default DriverSettlementReceiptPage;
