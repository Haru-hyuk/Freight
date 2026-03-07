import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { QuoteDetailResponse } from "@/entities/quote/model/quote.types";
import { formatKrw } from "@/shared/lib/format/display";
import { safeNumber, safeString } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppText } from "@/shared/ui/kit/AppText";

type Props = {
  quote?: QuoteDetailResponse | null;
  proposedPrice?: number;
  proposedMessage?: string | null;
};

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const cTextMain = safeString(theme?.colors?.textMain, "#111827");
  const cTextSub = safeString(theme?.colors?.textSub, "#334155");
  const cTextMuted = safeString(theme?.colors?.textMuted, "#64748B");
  const cPrimary = safeString(theme?.colors?.brandPrimary, "#FF6A00");
  const cBorder = safeString(theme?.colors?.borderDefault, "#E2E8F0");
  const cBg = safeString(theme?.colors?.bgSurfaceAlt, "#F8FAFC");

  const captionSize = safeNumber(theme?.typography?.scale?.caption?.size, 12);
  const captionLine = safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16);
  const detailSize = safeNumber(theme?.typography?.scale?.detail?.size, 14);
  const detailLine = safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20);
  const headingSize = safeNumber(theme?.typography?.scale?.heading?.size, 18);
  const headingLine = safeNumber(theme?.typography?.scale?.heading?.lineHeight, 26);

  return StyleSheet.create({
    card: {
      padding: spacing * 4,
      gap: spacing * 3,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing * 2,
    },
    sectionTitle: {
      color: cTextMain,
      fontSize: headingSize,
      lineHeight: headingLine,
      fontWeight: "900",
      flex: 1,
    },
    statusChip: {
      borderRadius: 999,
      paddingHorizontal: spacing * 2 + 4,
      paddingVertical: spacing,
      backgroundColor: cBg,
      borderWidth: 1,
      borderColor: cBorder,
    },
    statusChipText: {
      color: cTextMuted,
      fontSize: captionSize,
      lineHeight: captionLine,
      fontWeight: "800",
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: cBorder,
    },
    infoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: spacing * 2,
    },
    infoLabel: {
      color: cTextMuted,
      fontSize: detailSize,
      lineHeight: detailLine,
      fontWeight: "700",
      flex: 1,
    },
    infoValue: {
      color: cTextMain,
      fontSize: detailSize,
      lineHeight: detailLine,
      fontWeight: "800",
      textAlign: "right",
    },
    infoValueHighlight: {
      color: cPrimary,
      fontSize: detailSize,
      lineHeight: detailLine,
      fontWeight: "900",
      textAlign: "right",
    },
    waitingRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing * 2,
      backgroundColor: cBg,
      borderRadius: 8,
      padding: spacing * 3,
    },
    waitingText: {
      color: cTextSub,
      fontSize: detailSize - 1,
      lineHeight: detailLine,
      fontWeight: "700",
      flex: 1,
    },
  });
});

export function DriverOrderNegotiatingCard({ proposedPrice, proposedMessage }: Props) {
  const styles = useStyles();
  const theme = useAppTheme();
  const cPrimary = safeString(theme?.colors?.brandPrimary, "#FF6A00");

  const proposed = Number(proposedPrice);
  const hasProposedPrice = Number.isFinite(proposed) && proposed > 0;
  const messageText = typeof proposedMessage === "string" ? proposedMessage.trim() : "";

  return (
    <AppCard outlined tone="actionRequired" style={styles.card}>
      <View style={styles.headerRow}>
        <AppText style={styles.sectionTitle}>운임 협의</AppText>
        <View style={styles.statusChip}>
          <AppText style={styles.statusChipText}>협의 중</AppText>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.infoRow}>
        <AppText style={styles.infoLabel}>운임 제안 금액</AppText>
        <AppText style={styles.infoValueHighlight}>{hasProposedPrice ? formatKrw(proposed) : "확인 중"}</AppText>
      </View>

      <View style={styles.infoRow}>
        <AppText style={styles.infoLabel}>제안 메시지</AppText>
        <AppText style={styles.infoValue}>{messageText || "메시지를 입력하지 않았습니다."}</AppText>
      </View>

      <View style={styles.divider} />

      <View style={styles.waitingRow}>
        <Ionicons name="information-circle-outline" size={18} color={cPrimary} />
        <AppText style={styles.waitingText}>
          {"화주의 응답을 기다리고 있습니다.\n협의가 완료되면 배차가 확정됩니다."}
        </AppText>
      </View>
    </AppCard>
  );
}
