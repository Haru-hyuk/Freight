import React from "react";
import { StyleSheet, View } from "react-native";

import type { QuoteItem } from "@/entities/quote/model/quote.types";
import { safeNumber, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles } from "@/shared/theme/useAppTheme";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppText } from "@/shared/ui/kit/AppText";

type CargoDetailListProps = {
  title?: string;
  items: QuoteItem[] | undefined;
};

function toSpecText(item: QuoteItem): string {
  if (item.lengthCm > 0 && item.widthCm > 0 && item.heightCm > 0) {
    return `${item.lengthCm}×${item.widthCm}×${item.heightCm}cm`;
  }
  return "-";
}

const useStyles = createThemedStyles((theme) => {
  const s = safeNumber(theme.layout.spacing.base, 4);
  return StyleSheet.create({
    section: { gap: s * 2 },
    title: {
      color: theme.colors.textMain,
      fontSize: safeNumber(theme.typography.scale.detail.size, 14),
      lineHeight: safeNumber(theme.typography.scale.detail.lineHeight, 20),
      fontWeight: "900",
    },
    card: {
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      backgroundColor: theme.colors.bgSurface,
      padding: s * 3,
      gap: s * 2,
    },
    tableHead: {
      flexDirection: "row",
      alignItems: "center",
      gap: s,
      paddingBottom: s,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderDefault,
    },
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: s,
      paddingVertical: s,
      borderBottomWidth: 1,
      borderBottomColor: tint(theme.colors.textMain, 0.08, theme.colors.borderDefault),
    },
    rowLast: {
      borderBottomWidth: 0,
      paddingBottom: 0,
    },
    colName: { flex: 1.8 },
    colSpec: { flex: 1.6 },
    colQty: { flex: 0.9 },
    headText: {
      color: theme.colors.textMuted,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "800",
    },
    cellText: {
      color: theme.colors.textMain,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
    },
  });
});

export function CargoDetailList({ title = "화물 상세 내역", items }: CargoDetailListProps) {
  const styles = useStyles();
  const safeItems = Array.isArray(items) ? items : [];

  if (safeItems.length === 0) return null;

  return (
    <View style={styles.section}>
      <AppText style={styles.title}>{title}</AppText>
      <AppCard elevated={false} style={styles.card}>
        <View style={styles.tableHead}>
          <View style={styles.colName}>
            <AppText style={styles.headText}>품목명</AppText>
          </View>
          <View style={styles.colSpec}>
            <AppText style={styles.headText}>규격</AppText>
          </View>
          <View style={styles.colQty}>
            <AppText style={styles.headText}>수량</AppText>
          </View>
        </View>

        {safeItems.map((item, index) => {
          const isLast = index === safeItems.length - 1;
          return (
            <View key={`${item.quoteItemId}-${index}`} style={[styles.row, isLast ? styles.rowLast : null]}>
              <View style={styles.colName}>
                <AppText style={styles.cellText}>{item.itemName || `품목 ${index + 1}`}</AppText>
              </View>
              <View style={styles.colSpec}>
                <AppText style={styles.cellText}>{toSpecText(item)}</AppText>
              </View>
              <View style={styles.colQty}>
                <AppText style={styles.cellText}>{`${item.quantity}개`}</AppText>
              </View>
            </View>
          );
        })}
      </AppCard>
    </View>
  );
}
