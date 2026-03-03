import React, { useMemo } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import type { PaymentMethodMock, PaymentMethodType } from "@/features/shipper-settings/api/shipper-settings-mock";
import { shipperSettingsMock } from "@/features/shipper-settings/api/shipper-settings-mock";
import { isMockMode } from "@/shared/lib/config/env";
import type { AppTheme } from "@/shared/theme/types";
import { useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

import Divider from "./ui/Divider";
import KeyValueRow from "./ui/KeyValueRow";
import SettingSection from "./ui/SettingSection";

function toTypeLabel(type: PaymentMethodType): string {
  if (type === "CARD") return "카드";
  if (type === "BANK") return "계좌";
  return "후불";
}

function toDisplayDate(input: string): string {
  const ts = Date.parse(input);
  if (!Number.isFinite(ts)) return "-";
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
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
    cardWrap: {
      gap: 10,
    },
    methodCard: {
      borderRadius: 14,
      padding: 14,
      gap: 10,
    },
    methodTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    methodTitleWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flex: 1,
      minWidth: 0,
    },
    methodTitle: {
      color: theme.colors.textMain,
      flex: 1,
    },
    defaultBadge: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.semanticSuccess,
      backgroundColor: "#ECFDF3",
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    defaultBadgeText: {
      color: theme.colors.semanticSuccess,
    },
    actionRow: {
      flexDirection: "row",
      gap: 8,
    },
    actionButton: {
      flex: 1,
    },
  });
}

function PaymentMethodCard({ item }: { item: PaymentMethodMock }) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <AppCard outlined elevated={false} style={styles.methodCard}>
      <View style={styles.methodTop}>
        <View style={styles.methodTitleWrap}>
          <Ionicons
            name={item.type === "CARD" ? "card-outline" : item.type === "BANK" ? "business-outline" : "receipt-outline"}
            size={18}
            color={theme.colors.textSub}
          />
          <AppText variant="detail" weight="800" style={styles.methodTitle}>
            {toTypeLabel(item.type)} · {item.provider || "-"}
          </AppText>
        </View>
        {item.isDefault ? (
          <View style={styles.defaultBadge}>
            <AppText variant="caption" weight="800" style={styles.defaultBadgeText}>
              기본
            </AppText>
          </View>
        ) : null}
      </View>

      <KeyValueRow label="예금주/소유자" value={item.holderName} />
      <KeyValueRow label="끝자리" value={item.last4} />
      <KeyValueRow label="등록일" value={toDisplayDate(item.registeredAt)} />

      <Divider />

      <View style={styles.actionRow}>
        <AppButton
          title="기본 설정"
          variant="secondary"
          size="sm"
          style={styles.actionButton}
          onPress={() => Alert.alert("결제수단", "기본 결제수단 변경은 목업 동작입니다.")}
        />
        <AppButton
          title="삭제"
          variant="destructive"
          size="sm"
          style={styles.actionButton}
          onPress={() => Alert.alert("결제수단 삭제", `${item.provider} 삭제는 목업 동작입니다.`)}
        />
      </View>
    </AppCard>
  );
}

export default function ShipperPaymentMethodsPage() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const methods: PaymentMethodMock[] = isMockMode() ? shipperSettingsMock.paymentMethods : [];

  return (
    <PageScaffold
      title="운임 결제수단 관리"
      backgroundColor={theme.colors.bgMain}
      contentStyle={styles.content}
      onPressBack={() => router.back()}
      backLabel="설정"
    >
      <AppText variant="detail" style={styles.helperText}>
        결제수단 등록/삭제/기본설정은 데모 모드이며 서버 반영은 없습니다.
      </AppText>

      <SettingSection
        title="등록 결제수단"
        description="카드/계좌/후불 수단"
        right={<AppButton title="수단 추가" size="sm" onPress={() => Alert.alert("결제수단 추가", "추가 화면은 목업입니다.")} />}
      >
        <View style={styles.cardWrap}>
          {methods.map((item) => (
            <PaymentMethodCard key={item.id} item={item} />
          ))}
        </View>
      </SettingSection>
    </PageScaffold>
  );
}
