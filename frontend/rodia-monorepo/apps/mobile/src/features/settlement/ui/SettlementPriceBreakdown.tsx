import React from "react";
import { StyleSheet, View } from "react-native";

import type { SettlementResponse } from "@/shared/api/generated/schemas/settlementResponse";
import { formatDateTime, formatKrw } from "@/shared/lib/format/display";
import { safeNumber, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles } from "@/shared/theme/useAppTheme";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppText } from "@/shared/ui/kit/AppText";

type SettlementPriceBreakdownProps = {
  title?: string;
  settlement: SettlementResponse;
};

type BreakdownRow = {
  key: "driverPayout" | "platformFee" | "fastFee" | "dueDate";
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

function buildRows(settlement: SettlementResponse): BreakdownRow[] {
  const rows: BreakdownRow[] = [
    {
      key: "driverPayout",
      label: "기사 지급액",
      value: toMoneyText(settlement.driverPayout),
      valueVariant: "title",
    },
    {
      key: "platformFee",
      label: "플랫폼 수수료",
      value: toMoneyText(settlement.platformFee),
      valueVariant: "title",
    },
  ];

  if (typeof settlement.fastFee === "number" && settlement.fastFee > 0) {
    rows.splice(1, 0, {
      key: "fastFee",
      label: "급행 수수료",
      value: toMoneyText(settlement.fastFee),
      valueVariant: "title",
    });
  }

  if (settlement.dueDate) {
    rows.push({
      key: "dueDate",
      label: "결제 기한",
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
    totalWrap: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderDefault,
      marginTop: s,
      paddingTop: s * 2,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: s * 2,
    },
    totalLabel: {
      color: theme.colors.textMuted,
    },
    totalValue: {
      color: theme.colors.brandPrimary,
      textAlign: "right",
    },
  });
});

export function SettlementPriceBreakdown({ title = "정산 금액 내역", settlement }: SettlementPriceBreakdownProps) {
  const styles = useStyles();
  const rows = React.useMemo(() => buildRows(settlement), [settlement]);

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
        <View style={styles.totalWrap}>
          <AppText variant="caption" weight="700" style={styles.totalLabel}>
            합계
          </AppText>
          <AppText variant="title" weight="900" style={styles.totalValue}>
            {toMoneyText(settlement.totalFare)}
          </AppText>
        </View>
      </AppCard>
    </View>
  );
}
