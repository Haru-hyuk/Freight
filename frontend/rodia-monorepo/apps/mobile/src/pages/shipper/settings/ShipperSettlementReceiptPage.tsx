import React from "react";
import { Alert, Share, StyleSheet, View, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import type { QuoteDetailResponse } from "@/entities/quote/model/quote.types";
import { getShipperQuoteDetailByIdentifier } from "@/features/quote/api";
import { CargoDetailList } from "@/features/quote/ui/CargoDetailList";
import { SettlementPriceBreakdown } from "@/features/settlement/ui/SettlementPriceBreakdown";
import { getShipperSettlementByMatch, type SettlementResponse } from "@/features/settlement/api/shipper-settlement-api";
import { readApiErrorMessage } from "@/shared/lib/api/readApiErrorMessage";
import { formatDateTime, formatKrw } from "@/shared/lib/format/display";
import { safeNumber, safeString, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppRequestState } from "@/shared/ui/kit/AppRequestState";
import { AppText } from "@/shared/ui/kit/AppText";

type RouteParams = {
  matchId?: string | string[];
  quoteId?: string | string[];
};

function readRouteParamText(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw.trim() : "";
}

function parsePositiveInt(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function toDisplayDateTime(value: string | undefined): string {
  return formatDateTime(value, "-");
}

function toMoneyText(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return formatKrw(value, "0원");
}

function toPaymentStatusLabel(status: string | undefined): string {
  if (status === "PAID") return "결제 완료";
  if (status === "PENDING") return "결제 대기";
  if (status === "FAILED") return "결제 실패";
  return "결제 상태 확인 필요";
}

function toSettlementStatusLabel(status: string | undefined): string {
  if (status === "COMPLETED") return "정산 완료";
  if (status === "PENDING") return "정산 대기";
  if (status === "FAILED") return "정산 실패";
  return "정산 상태 확인 필요";
}

function toPaymentMethodLabel(method: string | undefined): string {
  const token = method?.trim().toUpperCase() ?? "";
  if (!token) return "-";
  if (token === "CARD") return "카드";
  if (token === "BANK_TRANSFER") return "계좌이체";
  if (token === "VIRTUAL_ACCOUNT") return "가상계좌";
  if (token === "EASY_PAY") return "간편결제";
  if (token === "TOSS_PAY") return "토스페이";
  if (token === "CASH") return "현금";
  return "기타 결제수단";
}

function toSettlementTypeLabel(type: string | undefined): string {
  const token = type?.trim().toUpperCase() ?? "";
  if (!token) return "-";
  if (token === "STANDARD") return "일반 정산";
  if (token === "FAST") return "급행 정산";
  return "기타 정산 유형";
}

function resolvePaidAt(settlement: SettlementResponse): string | undefined {
  return settlement.shipperPaidAt ?? settlement.completedAt ?? settlement.createdAt;
}

function buildShareText(settlement: SettlementResponse, quote: QuoteDetailResponse | null): string {
  const routeText =
    quote?.originAddress && quote?.destinationAddress ? `${quote.originAddress} -> ${quote.destinationAddress}` : "";

  const lines = [
    "[Rodia 운송 결제 영수증]",
    `총 결제 금액: ${toMoneyText(settlement.totalFare)}`,
    `결제 상태: ${toPaymentStatusLabel(settlement.shipperPaymentStatus)}`,
    `결제 일자: ${toDisplayDateTime(resolvePaidAt(settlement))}`,
    `결제 수단: ${toPaymentMethodLabel(settlement.shipperPaymentMethod)}`,
  ];

  if (routeText) {
    lines.push(`운송 구간: ${routeText}`);
  }

  return lines.join("\n");
}

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme.layout.spacing.base, 4);
  const cBorder = safeString(theme.colors.borderDefault, "#E2E8F0");

  return StyleSheet.create({
    modalRoot: {
      flex: 1,
      backgroundColor: tint("#000000", 0.26, theme.colors.bgMain),
      justifyContent: "flex-end",
    },
    sheet: {
      height: "92%",
      backgroundColor: theme.colors.bgSurface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      overflow: "hidden",
    },
    handleWrap: {
      alignItems: "center",
      paddingTop: spacing * 2,
      paddingBottom: spacing * 1.5,
    },
    handleBar: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: tint(theme.colors.textMain, 0.24, cBorder),
    },
    sheetHeader: {
      minHeight: 48,
      paddingHorizontal: spacing * 4,
      paddingBottom: spacing * 2,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing * 2,
    },
    sheetHeaderSpacer: {
      width: 36,
      height: 32,
    },
    sheetTitle: {
      flex: 1,
      textAlign: "center",
      color: theme.colors.textMain,
    },
    sheetHeaderActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing,
    },
    closeButton: {
      minWidth: 32,
      minHeight: 32,
    },
    headerIconButton: {
      minWidth: 32,
      minHeight: 32,
    },
    sheetBody: {
      flex: 1,
    },
    content: {
      paddingHorizontal: spacing * 4,
      paddingTop: spacing * 3,
      paddingBottom: spacing * 4,
      gap: spacing * 3,
    },
    summaryCard: {
      borderWidth: 1,
      borderColor: tint(theme.colors.brandPrimary, 0.22, cBorder),
      backgroundColor: tint(theme.colors.brandPrimary, 0.04, theme.colors.bgSurface),
      padding: spacing * 4,
      gap: spacing * 2,
    },
    summaryAmountWrap: {
      borderBottomWidth: 1,
      borderBottomColor: cBorder,
      paddingBottom: spacing * 2,
      marginBottom: spacing * 2,
      gap: spacing * 0.5,
    },
    summaryAmount: {
      color: theme.colors.brandPrimary,
    },
    summaryMetaWrap: {
      gap: spacing * 1.5,
    },
    keyValueRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: 24,
      gap: spacing * 2,
    },
    keyLabel: {
      color: theme.colors.textMuted,
    },
    keyValue: {
      color: theme.colors.textMain,
      textAlign: "right",
      flexShrink: 1,
    },
    sectionWrap: {
      gap: spacing * 2,
    },
    emptyWrap: {
      borderWidth: 1,
      borderColor: cBorder,
      borderRadius: 12,
      backgroundColor: theme.colors.bgSurface,
      padding: spacing * 4,
      alignItems: "center",
      gap: spacing * 2,
    },
  });
});

export default function ShipperSettlementReceiptPage() {
  const params = useLocalSearchParams<RouteParams>();
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useStyles();

  const matchId = React.useMemo(() => parsePositiveInt(readRouteParamText(params.matchId)), [params.matchId]);
  const quoteId = React.useMemo(() => parsePositiveInt(readRouteParamText(params.quoteId)), [params.quoteId]);

  const [settlement, setSettlement] = React.useState<SettlementResponse | null>(null);
  const [quoteDetail, setQuoteDetail] = React.useState<QuoteDetailResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isSharing, setIsSharing] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const loadSettlement = React.useCallback(
    async (refresh = false) => {
      if (matchId <= 0) {
        setSettlement(null);
        setQuoteDetail(null);
        setErrorMessage("유효한 매칭 ID를 찾지 못했습니다.");
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
        const settlementData = await getShipperSettlementByMatch({ matchId });
        setSettlement(settlementData);

        if (quoteId > 0) {
          try {
            const quoteData = await getShipperQuoteDetailByIdentifier(String(quoteId));
            setQuoteDetail(quoteData);
          } catch {
            setQuoteDetail(null);
          }
        } else {
          setQuoteDetail(null);
        }
      } catch (error) {
        setSettlement(null);
        setQuoteDetail(null);
        setErrorMessage(readApiErrorMessage(error, "정산 영수증을 불러오지 못했습니다."));
      } finally {
        if (refresh) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [matchId, quoteId]
  );

  React.useEffect(() => {
    void loadSettlement(false);
  }, [loadSettlement]);

  const handleClose = React.useCallback(() => {
    const dismiss = (router as { dismiss?: () => void }).dismiss;
    if (typeof dismiss === "function") {
      dismiss();
      return;
    }
    router.back();
  }, [router]);

  const handleShare = React.useCallback(async () => {
    if (!settlement || isLoading || isRefreshing || isSharing) return;
    setIsSharing(true);
    try {
      await Share.share({ message: buildShareText(settlement, quoteDetail) });
    } catch (error) {
      Alert.alert("공유 실패", readApiErrorMessage(error, "영수증 공유에 실패했습니다."));
    } finally {
      setIsSharing(false);
    }
  }, [isLoading, isRefreshing, isSharing, quoteDetail, settlement]);

  const paidAtText = settlement ? toDisplayDateTime(resolvePaidAt(settlement)) : "-";

  return (
    <View style={styles.modalRoot}>
      <View style={styles.sheet}>
        <View style={styles.handleWrap}>
          <View style={styles.handleBar} />
        </View>

        <View style={styles.sheetHeader}>
          <View style={styles.sheetHeaderSpacer} />
          <AppText variant="detail" weight="900" style={styles.sheetTitle}>
            영수증 상세
          </AppText>
          <View style={styles.sheetHeaderActions}>
            <AppButton
              size="icon"
              variant="secondary"
              style={styles.headerIconButton}
              loading={isSharing}
              disabled={!settlement || isLoading || isRefreshing || isSharing}
              accessibilityLabel="영수증 공유"
              onPress={() => void handleShare()}
            >
              <Ionicons name="share-outline" size={16} color={theme.colors.textMain} />
            </AppButton>
            <AppButton
              size="icon"
              variant="secondary"
              style={styles.closeButton}
              accessibilityLabel="영수증 닫기"
              onPress={handleClose}
            >
              <Ionicons name="close" size={18} color={theme.colors.textMain} />
            </AppButton>
          </View>
        </View>

        <View style={styles.sheetBody}>
          <AppRequestState
            isLoading={isLoading}
            loadingLabel="영수증 정보를 불러오는 중입니다."
            errorMessage={errorMessage}
            errorTitle="영수증을 불러오지 못했습니다."
            retryLabel={isRefreshing ? "재시도 중..." : "다시 시도"}
            onRetry={() => {
              if (isRefreshing) return;
              void loadSettlement(true);
            }}
            fullScreen={false}
          >
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              {settlement ? (
                <>
                  <AppCard elevated={false} style={styles.summaryCard}>
                    <View style={styles.summaryAmountWrap}>
                      <AppText variant="caption" color="textMuted">
                        총 결제 금액
                      </AppText>
                      <AppText variant="display" weight="900" style={styles.summaryAmount}>
                        {toMoneyText(settlement.totalFare)}
                      </AppText>
                    </View>

                    <View style={styles.summaryMetaWrap}>
                      <View style={styles.keyValueRow}>
                        <AppText variant="caption" style={styles.keyLabel}>
                          결제 상태
                        </AppText>
                        <AppText variant="detail" weight="700" style={styles.keyValue}>
                          {toPaymentStatusLabel(settlement.shipperPaymentStatus)}
                        </AppText>
                      </View>
                      <View style={styles.keyValueRow}>
                        <AppText variant="caption" style={styles.keyLabel}>
                          결제 수단
                        </AppText>
                        <AppText variant="detail" weight="700" style={styles.keyValue}>
                          {toPaymentMethodLabel(settlement.shipperPaymentMethod)}
                        </AppText>
                      </View>
                      <View style={styles.keyValueRow}>
                        <AppText variant="caption" style={styles.keyLabel}>
                          결제 일자
                        </AppText>
                        <AppText variant="detail" weight="700" style={styles.keyValue}>
                          {paidAtText}
                        </AppText>
                      </View>
                      <View style={styles.keyValueRow}>
                        <AppText variant="caption" style={styles.keyLabel}>
                          정산 상태/유형
                        </AppText>
                        <AppText variant="detail" weight="700" style={styles.keyValue}>
                          {`${toSettlementStatusLabel(settlement.settlementStatus)} · ${toSettlementTypeLabel(settlement.settlementType)}`}
                        </AppText>
                      </View>
                    </View>
                  </AppCard>

                  {quoteDetail && quoteDetail.quoteItems && quoteDetail.quoteItems.length > 0 ? (
                    <CargoDetailList title="화물 상세 내역" items={quoteDetail.quoteItems} />
                  ) : null}

                  <SettlementPriceBreakdown settlement={settlement} />
                </>
              ) : (
                <View style={styles.emptyWrap}>
                  <AppText variant="detail" color="textSub">
                    영수증 정보가 없습니다.
                  </AppText>
                  <AppButton
                    title={isRefreshing ? "재시도 중..." : "다시 시도"}
                    variant="secondary"
                    loading={isRefreshing}
                    disabled={isRefreshing}
                    onPress={() => void loadSettlement(true)}
                  />
                </View>
              )}
            </ScrollView>
          </AppRequestState>
        </View>
      </View>
    </View>
  );
}
