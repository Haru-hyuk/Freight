import React, { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import type { TaxInvoiceItemMock, TaxInvoiceStatus } from "@/pages/shipper/settings/_mock";
import type { AppTheme } from "@/shared/theme/types";
import { useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

import { shipperSettingsMock } from "./_mock";
import Divider from "./ui/Divider";
import KeyValueRow from "./ui/KeyValueRow";
import SettingSection from "./ui/SettingSection";

type RangeKey = "ALL" | "3M" | "6M" | "12M";

function toDisplayDate(input: string): string {
  const ts = Date.parse(input);
  if (!Number.isFinite(ts)) return "-";
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
}

function formatKrw(amount: number): string {
  const value = Number.isFinite(amount) ? Math.max(0, Math.trunc(amount)) : 0;
  return `${value.toLocaleString("ko-KR")}원`;
}

function toStatusLabel(status: TaxInvoiceStatus): string {
  if (status === "ISSUED") return "발행완료";
  if (status === "PENDING") return "대기";
  return "실패";
}

function filterByRange(items: TaxInvoiceItemMock[], range: RangeKey): TaxInvoiceItemMock[] {
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
    const ts = Date.parse(item.issuedAt);
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
    helperText: {
      color: theme.colors.textMuted,
      marginBottom: 14,
      paddingHorizontal: 4,
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
    invoiceCard: {
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
    invoiceNo: {
      color: theme.colors.textMain,
      flex: 1,
    },
    status: {
      color: theme.colors.textSub,
      minWidth: 70,
      textAlign: "right",
    },
    emptyText: {
      color: theme.colors.textMuted,
      textAlign: "center",
      paddingVertical: 8,
    },
  });
}

function TaxInvoiceCard({ item }: { item: TaxInvoiceItemMock }) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <AppCard outlined elevated={false} style={styles.invoiceCard}>
      <View style={styles.topRow}>
        <AppText variant="detail" weight="800" style={styles.invoiceNo}>
          {item.invoiceNumber}
        </AppText>
        <AppText variant="caption" weight="800" style={styles.status}>
          {toStatusLabel(item.status)}
        </AppText>
      </View>

      <KeyValueRow label="발행일" value={toDisplayDate(item.issuedAt)} />
      <KeyValueRow label="공급가" value={formatKrw(item.supplyAmount)} />
      <KeyValueRow label="부가세" value={formatKrw(item.vatAmount)} />
      <KeyValueRow label="합계" value={formatKrw(item.totalAmount)} />

      <Divider />

      <AppButton
        title="다운로드"
        size="sm"
        variant="secondary"
        onPress={() => Alert.alert("세금계산서 다운로드", `${item.invoiceNumber} 다운로드는 목업 동작입니다.`)}
      />
    </AppCard>
  );
}

export default function ShipperTaxInvoiceHistoryPage() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [activeRange, setActiveRange] = useState<RangeKey>("ALL");

  const rangeItems = useMemo(
    () => [
      { key: "ALL", label: "전체" },
      { key: "3M", label: "3개월" },
      { key: "6M", label: "6개월" },
      { key: "12M", label: "1년" },
    ] as Array<{ key: RangeKey; label: string }>,
    []
  );

  const filteredInvoices = useMemo(
    () => filterByRange(shipperSettingsMock.taxInvoices, activeRange),
    [activeRange]
  );

  return (
    <PageScaffold
      title="세금계산서 발행내역"
      backgroundColor={theme.colors.bgMain}
      contentStyle={styles.content}
      onPressBack={() => router.back()}
      backLabel="설정"
    >
      <AppText variant="detail" style={styles.helperText}>
        기간 필터는 로컬 목업 데이터 기준으로만 동작합니다.
      </AppText>

      <SettingSection title="발행 이력" description="필터/조회/다운로드는 데모 동작입니다.">
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

        {filteredInvoices.length > 0 ? (
          <View style={styles.cardWrap}>
            {filteredInvoices.map((item) => (
              <TaxInvoiceCard key={item.id} item={item} />
            ))}
          </View>
        ) : (
          <AppText variant="detail" style={styles.emptyText}>
            선택한 기간의 발행내역이 없습니다.
          </AppText>
        )}
      </SettingSection>
    </PageScaffold>
  );
}

