import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { listMyShipperSettlements, type SettlementItem } from "@/features/shipper-settings/api/shipper-settlement-api";
import { formatKrw } from "@/shared/lib/format/display";
import type { AppTheme } from "@/shared/theme/types";
import { useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

import Divider from "./ui/Divider";
import KeyValueRow from "./ui/KeyValueRow";
import SettingSection from "./ui/SettingSection";

type RangeKey = "ALL" | "3M" | "6M" | "12M";

function toDisplayDate(input: string | undefined): string {
  if (!input) return "-";
  const ts = Date.parse(input);
  if (!Number.isFinite(ts)) return "-";
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
}

function toSettlementStatusLabel(status: string): string {
  if (status === "COMPLETED") return "정산완료";
  if (status === "PENDING") return "정산대기";
  if (status === "FAILED") return "실패";
  return "상태 확인 필요";
}

function toPaymentStatusLabel(status: string): string {
  const token = status.trim().toUpperCase();
  if (token === "PAID" || token === "COMPLETED") return "결제완료";
  if (token === "PENDING") return "결제대기";
  if (token === "FAILED") return "결제실패";
  if (token === "REFUNDED") return "환불완료";
  return "상태 확인 필요";
}

function filterByRange(items: SettlementItem[], range: RangeKey): SettlementItem[] {
  if (range === "ALL") return items;
  const now = new Date();
  const from = new Date(now.getTime());
  if (range === "3M") {
    from.setMonth(from.getMonth() - 3);
  } else if (range === "6M") {
    from.setMonth(from.getMonth() - 6);
  } else {
    from.setFullYear(from.getFullYear() - 1);
  }
  const fromTs = from.getTime();
  return items.filter((item) => {
    const ts = Date.parse(item.createdAt ?? "");
    return Number.isFinite(ts) && ts >= fromTs;
  });
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 32,
      backgroundColor: theme.colors.bgMain,
    },
    loadingWrap: {
      alignItems: "center",
      paddingVertical: 32,
    },
    rangeRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 10,
    },
    rangeChip: {
      minHeight: 34,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.bgSurface,
      borderColor: theme.colors.borderDefault,
    },
    rangeChipActive: {
      borderColor: theme.colors.brandPrimary,
      backgroundColor: "#FFF7ED",
    },
    rangeChipText: {
      color: theme.colors.textSub,
    },
    rangeChipTextActive: {
      color: theme.colors.brandPrimary,
    },
    cardWrap: {
      gap: 10,
    },
    settlementCard: {
      borderRadius: 14,
      padding: 14,
      gap: 10,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    settlementTitle: {
      color: theme.colors.textMain,
      flex: 1,
    },
    statusBadge: {
      color: theme.colors.textSub,
      minWidth: 70,
      textAlign: "right",
    },
    emptyText: {
      color: theme.colors.textMuted,
      textAlign: "center",
      paddingVertical: 8,
    },
    disabledHint: {
      color: theme.colors.textMuted,
    },
  });
}

function SettlementCard({ item }: { item: SettlementItem }) {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navLockRef = React.useRef(false);
  const unlockTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (unlockTimerRef.current) {
        clearTimeout(unlockTimerRef.current);
      }
    };
  }, []);

  const handlePressReceipt = () => {
    if (navLockRef.current) return;
    if (item.matchId <= 0) return;

    navLockRef.current = true;
    router.push({
      pathname: "/(shipper)/settings/tax-invoices/[matchId]",
      params: { matchId: String(item.matchId) },
    } as never);

    if (unlockTimerRef.current) {
      clearTimeout(unlockTimerRef.current);
    }
    unlockTimerRef.current = setTimeout(() => {
      navLockRef.current = false;
      unlockTimerRef.current = null;
    }, 300);
  };

  return (
    <AppCard outlined elevated={false} style={styles.settlementCard}>
      <View style={styles.topRow}>
        <AppText variant="detail" weight="800" style={styles.settlementTitle}>
          정산 #{item.settlementId}
        </AppText>
        <AppText variant="caption" weight="800" style={styles.statusBadge}>
          {toSettlementStatusLabel(item.settlementStatus)}
        </AppText>
      </View>

      <KeyValueRow label="정산일" value={toDisplayDate(item.createdAt)} />
      <KeyValueRow label="총 결제 금액" value={formatKrw(item.totalFare, "0원")} />
      <KeyValueRow label="결제 상태" value={toPaymentStatusLabel(item.shipperPaymentStatus)} />
      <KeyValueRow label="결제일" value={toDisplayDate(item.shipperPaidAt)} />
      {item.dueDate ? <KeyValueRow label="결제 기한" value={toDisplayDate(item.dueDate)} /> : null}

      <Divider />
      {item.matchId <= 0 ? (
        <AppText variant="caption" style={styles.disabledHint}>
          매칭 정보가 없어 영수증을 열 수 없습니다.
        </AppText>
      ) : null}

      <AppButton
        title={item.matchId > 0 ? "영수증 보기" : "영수증 정보 없음"}
        size="sm"
        variant="secondary"
        disabled={item.matchId <= 0}
        onPress={handlePressReceipt}
      />
    </AppCard>
  );
}

export default function ShipperTaxInvoiceHistoryPage() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [activeRange, setActiveRange] = useState<RangeKey>("ALL");
  const [settlements, setSettlements] = useState<SettlementItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let canceled = false;
    setIsLoading(true);
    listMyShipperSettlements()
      .then((data) => {
        if (!canceled) setSettlements(data);
      })
      .catch(() => {
        if (!canceled) setSettlements([]);
      })
      .finally(() => {
        if (!canceled) setIsLoading(false);
      });
    return () => {
      canceled = true;
    };
  }, []);

  const rangeItems = useMemo(
    () => [
      { key: "ALL", label: "전체" },
      { key: "3M", label: "3개월" },
      { key: "6M", label: "6개월" },
      { key: "12M", label: "1년" },
    ] as Array<{ key: RangeKey; label: string }>,
    []
  );

  const filteredSettlements = useMemo(
    () => filterByRange(settlements, activeRange),
    [settlements, activeRange]
  );

  return (
    <PageScaffold
      title="정산 내역"
      backgroundColor={theme.colors.bgMain}
      contentStyle={styles.content}
      onPressBack={() => router.back()}
      backLabel="설정"
    >
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={theme.colors.brandPrimary} />
        </View>
      ) : (
        <SettingSection title="정산 이력">
          <View style={styles.rangeRow}>
            {rangeItems.map((range) => {
              const active = range.key === activeRange;
              return (
                <Pressable
                  key={range.key}
                  onPress={() => setActiveRange(range.key)}
                  style={[styles.rangeChip, active && styles.rangeChipActive]}
                >
                  <AppText
                    variant="caption"
                    weight="800"
                    style={[styles.rangeChipText, active && styles.rangeChipTextActive]}
                  >
                    {range.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          {filteredSettlements.length > 0 ? (
            <View style={styles.cardWrap}>
              {filteredSettlements.map((item) => (
                <SettlementCard key={item.settlementId} item={item} />
              ))}
            </View>
          ) : (
            <AppText variant="detail" style={styles.emptyText}>
              {settlements.length === 0 ? "정산 내역이 없습니다." : "선택한 기간의 정산 내역이 없습니다."}
            </AppText>
          )}
        </SettingSection>
      )}
    </PageScaffold>
  );
}
