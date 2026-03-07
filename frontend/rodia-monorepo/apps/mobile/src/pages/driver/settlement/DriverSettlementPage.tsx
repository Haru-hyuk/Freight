import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Alert, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import {
  getDriverSettlementSummaryMe,
  listDriverSettlementsMe,
  type DriverSettlementSummary,
  type DriverSettlementItem,
} from "@/features/driver-profile/api/driver-settlement-api";
import { readApiErrorMessage } from "@/shared/lib/api/readApiErrorMessage";
import { formatDateTime, formatKrw } from "@/shared/lib/format/display";
import { safeNumber, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppRequestState } from "@/shared/ui/kit/AppRequestState";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

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

function resolvePaymentDate(settlement: DriverSettlementItem): string | undefined {
  return settlement.shipperPaidAt ?? settlement.completedAt ?? settlement.createdAt;
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
      backgroundColor: tint(theme.colors.brandPrimary, 0.05, theme.colors.bgSurface),
      padding: spacing * 4,
      gap: spacing * 2,
    },
    summaryGrid: {
      flexDirection: "row",
      gap: spacing * 2,
    },
    summaryCell: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      backgroundColor: theme.colors.bgSurface,
      paddingVertical: spacing * 2,
      paddingHorizontal: spacing * 2.5,
      gap: spacing,
    },
    summaryValuePrimary: {
      color: theme.colors.brandPrimary,
    },
    listWrap: {
      gap: spacing * 2,
    },
    sectionTitle: {
      color: theme.colors.textMain,
    },
    card: {
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      backgroundColor: theme.colors.bgSurface,
      padding: spacing * 3,
      gap: spacing * 2,
    },
    cardHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing * 2,
    },
    cardMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing * 2,
    },
    cardLabel: {
      color: theme.colors.textMuted,
      flexShrink: 0,
    },
    cardValue: {
      color: theme.colors.textMain,
      textAlign: "right",
      flex: 1,
    },
    cardAmount: {
      color: theme.colors.brandPrimary,
      textAlign: "right",
      flexShrink: 0,
    },
    receiptButton: {
      minHeight: 44,
    },
    emptyCard: {
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      backgroundColor: theme.colors.bgSurface,
      padding: spacing * 4,
      gap: spacing * 2,
      alignItems: "center",
    },
  });
});

export function DriverSettlementPage() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useStyles();

  const [settlements, setSettlements] = React.useState<DriverSettlementItem[]>([]);
  const [summary, setSummary] = React.useState<DriverSettlementSummary | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [navigatingMatchId, setNavigatingMatchId] = React.useState<number | null>(null);

  const focusSyncStartedRef = React.useRef(false);
  const navigationUnlockTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadSettlements = React.useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage(null);

    try {
      const [nextSettlements, nextSummary] = await Promise.all([
        listDriverSettlementsMe(),
        getDriverSettlementSummaryMe(),
      ]);
      setSettlements(nextSettlements);
      setSummary(nextSummary);
    } catch (error) {
      setSummary(null);
      setErrorMessage(readApiErrorMessage(error, "정산 내역을 불러오지 못했습니다."));
    } finally {
      if (refresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  React.useEffect(() => {
    void loadSettlements(false);
  }, [loadSettlements]);

  React.useEffect(() => {
    return () => {
      if (navigationUnlockTimerRef.current) {
        clearTimeout(navigationUnlockTimerRef.current);
      }
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (!focusSyncStartedRef.current) {
        focusSyncStartedRef.current = true;
        return undefined;
      }
      void loadSettlements(true);
      return undefined;
    }, [loadSettlements])
  );

  const totalPayout = React.useMemo(
    () =>
      summary
        ? summary.totalPayoutAmount
        : settlements.reduce(
            (sum, settlement) => sum + (typeof settlement.driverPayout === "number" ? settlement.driverPayout : 0),
            0
          ),
    [settlements, summary]
  );

  const pendingCount = React.useMemo(
    () =>
      summary
        ? summary.pendingSettlementCount
        : settlements.filter(
            (settlement) =>
              String(settlement.settlementStatus ?? "")
                .trim()
                .toUpperCase() === "PENDING"
          ).length,
    [settlements, summary]
  );

  const isBusy = isLoading || isRefreshing || navigatingMatchId !== null;

  const handleOpenReceipt = React.useCallback(
    (item: DriverSettlementItem) => {
      if (isBusy) return;

      const safeMatchId = parsePositiveInt(item.matchId);
      if (safeMatchId <= 0) {
        Alert.alert("정산서 열기", "매칭 정보가 없어 정산서를 열 수 없습니다.");
        return;
      }

      setNavigatingMatchId(safeMatchId);
      router.push({
        pathname: "/(driver)/settlement/[matchId]",
        params: { matchId: String(safeMatchId) },
      });

      if (navigationUnlockTimerRef.current) {
        clearTimeout(navigationUnlockTimerRef.current);
      }
      navigationUnlockTimerRef.current = setTimeout(() => {
        setNavigatingMatchId(null);
        navigationUnlockTimerRef.current = null;
      }, 600);
    },
    [isBusy, router]
  );

  return (
    <PageScaffold
      title="정산"
      backgroundColor={theme.colors.bgSurfaceAlt}
      contentStyle={styles.content}
    >
      <AppRequestState
        isLoading={isLoading}
        loadingLabel="정산 내역을 불러오는 중입니다."
        errorMessage={errorMessage}
        errorTitle="정산 내역을 불러오지 못했습니다."
        retryLabel={isRefreshing ? "재시도 중..." : "다시 시도"}
        onRetry={() => {
          if (isRefreshing) return;
          void loadSettlements(true);
        }}
        fullScreen={false}
      >
        <AppCard elevated={false} style={styles.summaryCard}>
          <AppText variant="heading" weight="900" color="textMain">
            정산 요약
          </AppText>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCell}>
              <AppText variant="caption" color="textMuted">
                누적 지급액
              </AppText>
              <AppText variant="title" weight="900" style={styles.summaryValuePrimary}>
                {toMoneyText(totalPayout)}
              </AppText>
            </View>
            <View style={styles.summaryCell}>
              <AppText variant="caption" color="textMuted">
                정산 대기 건수
              </AppText>
              <AppText variant="title" weight="900" color="textMain">
                {`${pendingCount}건`}
              </AppText>
            </View>
          </View>
        </AppCard>

        <View style={styles.listWrap}>
          <AppText variant="heading" weight="900" style={styles.sectionTitle}>
            정산 내역
          </AppText>

          {settlements.length > 0 ? (
            settlements.map((item, index) => {
              const safeSettlementId = parsePositiveInt(item.settlementId);
              const cardKey = safeSettlementId > 0 ? `settlement-${safeSettlementId}` : `settlement-${index + 1}`;
              const safeMatchId = parsePositiveInt(item.matchId);
              const isNavigating = navigatingMatchId !== null;

              return (
                <AppCard key={cardKey} elevated={false} style={styles.card}>
                  <View style={styles.cardHeaderRow}>
                    <AppText variant="detail" weight="900" color="textMain">
                      {toSettlementTypeLabel(item.settlementType)}
                    </AppText>
                    <AppText variant="title" weight="900" style={styles.cardAmount}>
                      {toMoneyText(item.driverPayout)}
                    </AppText>
                  </View>

                  <View style={styles.cardMetaRow}>
                    <AppText variant="caption" style={styles.cardLabel}>
                      정산 상태
                    </AppText>
                    <AppText variant="detail" weight="700" style={styles.cardValue}>
                      {toSettlementStatusLabel(item.settlementStatus)}
                    </AppText>
                  </View>

                  <View style={styles.cardMetaRow}>
                    <AppText variant="caption" style={styles.cardLabel}>
                      화주 결제 상태
                    </AppText>
                    <AppText variant="detail" weight="700" style={styles.cardValue}>
                      {toPaymentStatusLabel(item.shipperPaymentStatus)}
                    </AppText>
                  </View>

                  <View style={styles.cardMetaRow}>
                    <AppText variant="caption" style={styles.cardLabel}>
                      지급 일자
                    </AppText>
                    <AppText variant="detail" weight="700" style={styles.cardValue}>
                      {toDateText(resolvePaymentDate(item))}
                    </AppText>
                  </View>

                  <View style={styles.cardMetaRow}>
                    <AppText variant="caption" style={styles.cardLabel}>
                      총 운임 (화주 결제 금액)
                    </AppText>
                    <AppText variant="detail" weight="700" style={styles.cardValue}>
                      {toMoneyText(item.totalFare)}
                    </AppText>
                  </View>

                  <AppButton
                    title="정산서 보기"
                    variant="primary"
                    style={styles.receiptButton}
                    left={<Ionicons name="receipt-outline" size={16} color={theme.colors.textOnBrand} />}
                    onPress={() => handleOpenReceipt(item)}
                    disabled={isBusy || safeMatchId <= 0 || isNavigating}
                    loading={isNavigating && navigatingMatchId === safeMatchId}
                  />
                </AppCard>
              );
            })
          ) : (
            <AppCard elevated={false} style={styles.emptyCard}>
              <AppText variant="detail" color="textSub">
                표시할 정산 내역이 없습니다.
              </AppText>
              <AppButton
                title={isRefreshing ? "새로고침 중..." : "새로고침"}
                variant="secondary"
                loading={isRefreshing}
                disabled={isRefreshing}
                onPress={() => void loadSettlements(true)}
              />
            </AppCard>
          )}
        </View>
      </AppRequestState>
    </PageScaffold>
  );
}

export default DriverSettlementPage;
