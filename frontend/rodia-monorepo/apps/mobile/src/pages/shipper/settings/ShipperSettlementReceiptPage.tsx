import React from "react";
import { Alert, Share, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getShipperSettlementByMatch } from "@/features/shipper-settings/api/shipper-settlement-api";
import type { SettlementResponse } from "@/shared/api/generated/schemas/settlementResponse";
import { readApiErrorMessage } from "@/shared/lib/api/readApiErrorMessage";
import { formatDateTime, formatKrw } from "@/shared/lib/format/display";
import { safeNumber, safeString, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppRequestState } from "@/shared/ui/kit/AppRequestState";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

type RouteParams = {
  matchId?: string | string[];
};

type SettlementLineItem = {
  key: string;
  label: string;
  amount: number;
};

function readRouteParamText(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw.trim() : "";
}

function parsePositiveInt(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function toDisplayText(value: string | undefined): string {
  const text = value?.trim() ?? "";
  return text || "-";
}

function toDisplayDateTime(value: string | undefined): string {
  return formatDateTime(value, "-");
}

function toPaymentStatusLabel(status: string | undefined): string {
  const token = status?.trim().toUpperCase() ?? "";
  if (token === "PAID" || token === "COMPLETED") return "결제완료";
  if (token === "PENDING") return "결제대기";
  if (token === "FAILED") return "결제실패";
  return toDisplayText(status);
}

function toSettlementStatusLabel(status: string | undefined): string {
  const token = status?.trim().toUpperCase() ?? "";
  if (token === "COMPLETED") return "정산완료";
  if (token === "PENDING") return "정산대기";
  if (token === "FAILED") return "정산실패";
  return toDisplayText(status);
}

function resolvePaidAt(settlement: SettlementResponse): string | undefined {
  return settlement.shipperPaidAt ?? settlement.completedAt ?? settlement.createdAt;
}

function buildSettlementLineItems(settlement: SettlementResponse): SettlementLineItem[] {
  const items: SettlementLineItem[] = [
    {
      key: "platformFee",
      label: "플랫폼 수수료",
      amount: settlement.platformFee ?? 0,
    },
    {
      key: "driverPayout",
      label: "기사 지급액",
      amount: settlement.driverPayout ?? 0,
    },
  ];

  const fastFee = settlement.fastFee ?? 0;
  if (fastFee > 0) {
    items.splice(1, 0, { key: "fastFee", label: "급행 수수료", amount: fastFee });
  }

  return items;
}

function buildShareMessage(settlement: SettlementResponse): string {
  const settlementId = settlement.settlementId ?? "-";
  const totalFareText = formatKrw(settlement.totalFare, "0원");
  const paymentStatusText = toPaymentStatusLabel(settlement.shipperPaymentStatus);
  const paidAtText = toDisplayDateTime(resolvePaidAt(settlement));
  return [
    `정산 #${settlementId}`,
    `총 결제 금액: ${totalFareText}`,
    `결제 상태: ${paymentStatusText}`,
    `결제 일자: ${paidAtText}`,
  ].join("\n");
}

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme.layout.spacing.base, 4);
  const cBorder = safeString(theme.colors.borderDefault, "#E2E8F0");

  return StyleSheet.create({
    content: {
      paddingHorizontal: spacing * 4,
      paddingTop: spacing * 3,
      paddingBottom: spacing * 24,
      gap: spacing * 3,
      backgroundColor: theme.colors.bgMain,
    },
    summaryCard: {
      padding: spacing * 4,
      gap: spacing * 2,
      borderWidth: 1,
      borderColor: tint(theme.colors.brandPrimary, 0.22, cBorder),
      backgroundColor: tint(theme.colors.brandPrimary, 0.04, theme.colors.bgSurface),
    },
    summaryAmount: {
      marginTop: spacing * 0.5,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing * 2,
      minHeight: 24,
    },
    infoLabel: {
      color: theme.colors.textMuted,
    },
    infoValue: {
      color: theme.colors.textMain,
      textAlign: "right",
      flexShrink: 1,
    },
    sectionWrap: {
      gap: spacing * 2,
    },
    lineItemCard: {
      padding: spacing * 3,
      gap: spacing * 2,
      borderWidth: 1,
      borderColor: cBorder,
      backgroundColor: theme.colors.bgSurface,
    },
    lineItemTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing * 2,
    },
    lineAmount: {
      color: theme.colors.textMain,
    },
    statusMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing * 2,
      paddingHorizontal: spacing * 1,
    },
    emptyWrap: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: cBorder,
      backgroundColor: theme.colors.bgSurface,
      padding: spacing * 4,
      alignItems: "center",
      gap: spacing * 2,
    },
    bottomBar: {
      borderTopWidth: 1,
      borderTopColor: cBorder,
      backgroundColor: theme.colors.bgSurface,
      paddingHorizontal: spacing * 4,
      paddingTop: spacing * 2,
    },
    shareButton: {
      minHeight: 48,
    },
  });
});

export default function ShipperSettlementReceiptPage() {
  const params = useLocalSearchParams<RouteParams>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useStyles();

  const matchId = React.useMemo(() => parsePositiveInt(readRouteParamText(params.matchId)), [params.matchId]);
  const [settlement, setSettlement] = React.useState<SettlementResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isSharing, setIsSharing] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const loadSettlement = React.useCallback(
    async (refresh = false) => {
      if (matchId <= 0) {
        setSettlement(null);
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
        const receipt = await getShipperSettlementByMatch(matchId);
        setSettlement(receipt);
      } catch (error) {
        setSettlement(null);
        setErrorMessage(readApiErrorMessage(error, "정산 영수증을 불러오지 못했습니다."));
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
    void loadSettlement(false);
  }, [loadSettlement]);

  const lineItems = React.useMemo(
    () => (settlement ? buildSettlementLineItems(settlement) : []),
    [settlement]
  );

  const handleShare = React.useCallback(async () => {
    if (!settlement || isLoading || isRefreshing || isSharing) return;
    setIsSharing(true);
    try {
      await Share.share({ message: buildShareMessage(settlement) });
    } catch (error) {
      Alert.alert("공유 실패", readApiErrorMessage(error, "영수증 공유에 실패했습니다."));
    } finally {
      setIsSharing(false);
    }
  }, [isLoading, isRefreshing, isSharing, settlement]);

  const bottomBar = (
    <View style={[styles.bottomBar, { paddingBottom: (insets.bottom ?? 0) + 10 }]}>
      <AppButton
        title="공유"
        variant="secondary"
        style={styles.shareButton}
        loading={isSharing}
        disabled={!settlement || isLoading || isRefreshing || isSharing}
        onPress={() => void handleShare()}
      />
    </View>
  );

  const paidAtText = settlement ? toDisplayDateTime(resolvePaidAt(settlement)) : "-";

  return (
    <PageScaffold
      title="영수증 상세"
      backgroundColor={theme.colors.bgMain}
      contentStyle={styles.content}
      onPressBack={() => router.back()}
      backLabel="정산 내역"
      bottomBar={bottomBar}
    >
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
        {settlement ? (
          <>
            <AppCard elevated={false} style={styles.summaryCard}>
              <AppText variant="caption" color="textMuted">
                총 결제 금액
              </AppText>
              <AppText variant="display" weight="900" style={styles.summaryAmount}>
                {formatKrw(settlement.totalFare, "0원")}
              </AppText>
              <View style={styles.infoRow}>
                <AppText variant="caption" style={styles.infoLabel}>
                  결제수단
                </AppText>
                <AppText variant="detail" weight="700" style={styles.infoValue}>
                  {toDisplayText(settlement.shipperPaymentMethod)}
                </AppText>
              </View>
              <View style={styles.infoRow}>
                <AppText variant="caption" style={styles.infoLabel}>
                  결제 일자
                </AppText>
                <AppText variant="detail" weight="700" style={styles.infoValue}>
                  {paidAtText}
                </AppText>
              </View>
              <View style={styles.infoRow}>
                <AppText variant="caption" style={styles.infoLabel}>
                  결제 상태
                </AppText>
                <AppText variant="detail" weight="700" style={styles.infoValue}>
                  {toPaymentStatusLabel(settlement.shipperPaymentStatus)}
                </AppText>
              </View>
            </AppCard>

            <View style={styles.sectionWrap}>
              <AppText variant="heading" weight="900" color="textMain">
                거래 상세 내역
              </AppText>
              {lineItems.map((item) => (
                <AppCard key={item.key} elevated={false} style={styles.lineItemCard}>
                  <View style={styles.lineItemTop}>
                    <AppText variant="detail" weight="800" color="textMain">
                      {item.label}
                    </AppText>
                    <AppText variant="title" weight="900" style={styles.lineAmount}>
                      {formatKrw(item.amount, "0원")}
                    </AppText>
                  </View>
                </AppCard>
              ))}
              <View style={styles.statusMetaRow}>
                <AppText variant="caption" color="textMuted">
                  정산 상태: {toSettlementStatusLabel(settlement.settlementStatus)}
                </AppText>
                <AppText variant="caption" color="textMuted">
                  정산 유형: {toDisplayText(settlement.settlementType)}
                </AppText>
              </View>
            </View>
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
      </AppRequestState>
    </PageScaffold>
  );
}
