import React from "react";
import { StyleSheet, View } from "react-native";

import { formatDateTime, formatKrw } from "@/shared/lib/format/display";
import { safeNumber, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles } from "@/shared/theme/useAppTheme";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppText } from "@/shared/ui/kit/AppText";

export type SettlementPriceBreakdownData = {
  driverPayout?: number;
  totalFare?: number;
  platformFee?: number;
  fastFee?: number;
  dueDate?: string;
  paymentStatus?: string;
  paidAt?: string;
};

type SettlementPriceBreakdownMode = "driver" | "shipper";

type SettlementPriceBreakdownProps = {
  title?: string;
  settlement: SettlementPriceBreakdownData;
  mode?: SettlementPriceBreakdownMode;
};

type BreakdownRow = {
  key: "driverPayout" | "totalFare" | "platformFee" | "fastFee" | "dueDate";
  label: string;
  value: string;
  valueVariant?: "title" | "detail";
};

function toMoneyText(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return formatKrw(value, "0원");
}

function toDateTimeText(value: string | undefined): string {
  return formatDateTime(value, "-");
}

function toStatusToken(value: string | undefined): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

function isCompletedPayment(settlement: SettlementPriceBreakdownData): boolean {
  if (typeof settlement.paidAt === "string" && settlement.paidAt.trim().length > 0) return true;
  const token = toStatusToken(settlement.paymentStatus);
  return token === "COMPLETED" || token === "PAID" || token === "REFUNDED";
}

function buildRows(settlement: SettlementPriceBreakdownData, mode: SettlementPriceBreakdownMode): BreakdownRow[] {
  if (mode === "shipper") {
    const shipperRows: BreakdownRow[] = [
      {
        key: "totalFare",
        label: "총 결제 금액",
        value: toMoneyText(settlement.totalFare),
        valueVariant: "title",
      },
    ];

    if (!isCompletedPayment(settlement) && settlement.dueDate) {
      shipperRows.push({
        key: "dueDate",
        label: "결제 예정일",
        value: toDateTimeText(settlement.dueDate),
        valueVariant: "detail",
      });
    }

    return shipperRows;
  }

  const rows: BreakdownRow[] = [
    {
      key: "driverPayout",
      label: "실수령액",
      value: toMoneyText(settlement.driverPayout),
      valueVariant: "title",
    },
    {
      key: "totalFare",
      label: "총 운임 (화주 결제 금액)",
      value: toMoneyText(settlement.totalFare),
      valueVariant: "detail",
    },
    {
      key: "platformFee",
      label: "플랫폼 수수료 (공제)",
      value: toMoneyText(settlement.platformFee),
      valueVariant: "title",
    },
  ];

  if (typeof settlement.fastFee === "number" && settlement.fastFee > 0) {
    rows.splice(3, 0, {
      key: "fastFee",
      label: "빠른 정산 수수료 (공제)",
      value: toMoneyText(settlement.fastFee),
      valueVariant: "title",
    });
  }

  if (settlement.dueDate) {
    rows.push({
      key: "dueDate",
      label: "정산 예정일",
      value: toDateTimeText(settlement.dueDate),
      valueVariant: "detail",
    });
  }

  return rows;
}

const useStyles = createThemedStyles((theme) => {
  const s = safeNumber(theme.layout.spacing.base, 4);
  return StyleSheet.create({
    section: { gap: s * 2 },
    title: {
      color: theme.colors.textMain,
      fontSize: safeNumber(theme.typography.scale.heading.size, 18),
      lineHeight: safeNumber(theme.typography.scale.heading.lineHeight, 24),
      fontWeight: "900",
    },
    card: {
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      backgroundColor: theme.colors.bgSurface,
      padding: s * 3,
      gap: s * 2,
    },
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: s * 2,
      paddingVertical: s,
      borderBottomWidth: 1,
      borderBottomColor: tint(theme.colors.textMain, 0.08, theme.colors.borderDefault),
    },
    rowLast: {
      borderBottomWidth: 0,
      paddingBottom: 0,
    },
    rowLabel: {
      color: theme.colors.textMain,
      flex: 1,
    },
    rowValue: {
      color: theme.colors.textMain,
      textAlign: "right",
      flexShrink: 0,
    },
  });
});

export function SettlementPriceBreakdown({
  title = "정산 금액 내역",
  settlement,
  mode = "driver",
}: SettlementPriceBreakdownProps) {
  const styles = useStyles();
  const rows = React.useMemo(() => buildRows(settlement, mode), [mode, settlement]);

  return (
    <View style={styles.section}>
      <AppText variant="heading" weight="900" style={styles.title}>
        {title}
      </AppText>
      <AppCard elevated={false} style={styles.card}>
        {rows.map((row, index) => {
          const isLast = index === rows.length - 1;
          return (
            <View key={row.key} style={[styles.row, isLast ? styles.rowLast : null]}>
              <AppText variant="detail" weight="800" style={styles.rowLabel}>
                {row.label}
              </AppText>
              <AppText
                variant={row.valueVariant ?? "title"}
                weight="900"
                style={styles.rowValue}
              >
                {row.value}
              </AppText>
            </View>
          );
        })}
      </AppCard>
    </View>
  );
}
