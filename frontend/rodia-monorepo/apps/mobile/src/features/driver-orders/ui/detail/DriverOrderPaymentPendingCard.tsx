import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { formatKrw } from "@/shared/lib/format/display";
import { safeNumber, safeString } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppText } from "@/shared/ui/kit/AppText";

type Props = {
  proposedPrice?: number;
  proposedMessage?: string | null;
};

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const cTextMain = safeString(theme?.colors?.textMain, "#111827");
  const cTextSub = safeString(theme?.colors?.textSub, "#334155");
  const cTextMuted = safeString(theme?.colors?.textMuted, "#64748B");
  const cSecondary = safeString(theme?.colors?.brandSecondary, "#3B82F6");
  const cBg = safeString(theme?.colors?.bgSurfaceAlt, "#F8FAFF");
  const cBorder = safeString(theme?.colors?.borderDefault, "#E2E8F0");

  const detailSize = safeNumber(theme?.typography?.scale?.detail?.size, 14);
  const detailLine = safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20);
  const headingSize = safeNumber(theme?.typography?.scale?.heading?.size, 18);
  const headingLine = safeNumber(theme?.typography?.scale?.heading?.lineHeight, 26);

  return StyleSheet.create({
    card: {
      padding: spacing * 5,
      gap: spacing * 4,
      alignItems: "stretch",
    },
    iconWrap: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: cBg,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: cSecondary,
    },
    title: {
      color: cTextMain,
      fontSize: headingSize,
      lineHeight: headingLine,
      fontWeight: "900",
      textAlign: "center",
    },
    desc: {
      color: cTextSub,
      fontSize: detailSize,
      lineHeight: detailLine + 2,
      fontWeight: "600",
      textAlign: "center",
    },
    infoWrap: {
      gap: spacing * 2,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing * 2,
    },
    infoLabel: {
      flex: 1,
      color: cTextMuted,
      fontSize: detailSize - 1,
      lineHeight: detailLine,
      fontWeight: "700",
    },
    infoValue: {
      flex: 1,
      color: cTextMain,
      fontSize: detailSize,
      lineHeight: detailLine,
      fontWeight: "800",
      textAlign: "right",
    },
    infoValuePrimary: {
      flex: 1,
      color: cSecondary,
      fontSize: detailSize,
      lineHeight: detailLine,
      fontWeight: "900",
      textAlign: "right",
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: cBorder,
      width: "100%",
    },
  });
});

export function DriverOrderPaymentPendingCard({ proposedPrice, proposedMessage }: Props) {
  const styles = useStyles();
  const theme = useAppTheme();
  const cSecondary = safeString(theme?.colors?.brandSecondary, "#3B82F6");
  const amount = Number(proposedPrice);
  const hasAmount = Number.isFinite(amount) && amount > 0;
  const messageText = typeof proposedMessage === "string" ? proposedMessage.trim() : "";

  return (
    <AppCard outlined tone="paymentRequired" style={styles.card}>
      <View style={[styles.iconWrap, { alignSelf: "center" }]}>
        <Ionicons name="time-outline" size={32} color={cSecondary} />
      </View>

      <AppText style={styles.title}>화주가 결제를 진행 중입니다</AppText>

      <AppText style={styles.desc}>
        {"결제가 완료되면 상세 주소와 연락처가\n공개됩니다. 잠시만 기다려주세요."}
      </AppText>

      <View style={styles.divider} />

      <View style={styles.infoWrap}>
        <View style={styles.infoRow}>
          <AppText style={styles.infoLabel}>운임 제안 금액</AppText>
          <AppText style={styles.infoValuePrimary}>{hasAmount ? formatKrw(amount) : "확인 중"}</AppText>
        </View>
        <View style={styles.infoRow}>
          <AppText style={styles.infoLabel}>제안 메시지</AppText>
          <AppText style={styles.infoValue}>{messageText || "메시지를 입력하지 않았습니다."}</AppText>
        </View>
      </View>
    </AppCard>
  );
}
