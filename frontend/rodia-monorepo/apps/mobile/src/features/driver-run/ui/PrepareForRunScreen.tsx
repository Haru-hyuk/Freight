import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { safeNumber, safeString, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";
import type { ActiveOrder } from "@/entities/order/model/active-order.store";
import { useActiveOrder } from "@/entities/order/model/active-order.store";

type Props = {
  order: ActiveOrder;
};

const CHECKLIST_ITEMS = [
  "차량 일상 점검 완료",
  "상차지 정보 및 연락처 확인",
  "운행 경로 재확인",
];

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const cSurfaceAlt = safeString(theme?.colors?.bgSurfaceAlt, "#F8FAFC");
  const cSurface = safeString(theme?.colors?.bgSurface, "#FFFFFF");
  const cTextMain = safeString(theme?.colors?.textMain, "#111827");
  const cTextSub = safeString(theme?.colors?.textSub, "#334155");
  const cTextMuted = safeString(theme?.colors?.textMuted, "#64748B");
  const cBorder = safeString(theme?.colors?.borderDefault, "#E2E8F0");
  const cSuccess = safeString(theme?.colors?.semanticSuccess, "#10B981");

  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: cSurfaceAlt,
    },
    scrollInner: {
      paddingHorizontal: spacing * 5,
      paddingTop: spacing * 4,
      gap: spacing * 4,
    },
    originCard: {
      borderRadius: 16,
      padding: spacing * 4,
      gap: spacing * 2,
    },
    originLabel: {
      color: cTextMuted,
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12),
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16),
      fontWeight: "800",
    },
    originAddress: {
      color: cTextMain,
      fontSize: safeNumber(theme?.typography?.scale?.heading?.size, 18),
      lineHeight: safeNumber(theme?.typography?.scale?.heading?.lineHeight, 26),
      fontWeight: "900",
    },
    subText: {
      color: cTextMuted,
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14),
      lineHeight: safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20),
      fontWeight: "500",
    },
    sectionTitle: {
      color: cTextMain,
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14) + 1,
      lineHeight: safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20) + 2,
      fontWeight: "900",
      marginBottom: spacing,
    },
    checklistWrap: {
      gap: spacing * 2,
    },
    checkRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing * 3,
      minHeight: 52,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: cBorder,
      backgroundColor: cSurface,
      paddingHorizontal: spacing * 3,
    },
    checkRowChecked: {
      borderColor: tint(cSuccess, 0.4, cBorder),
      backgroundColor: tint(cSuccess, 0.07, cSurface),
    },
    checkLabel: {
      flex: 1,
      color: cTextSub,
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14) + 1,
      lineHeight: safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20) + 2,
      fontWeight: "700",
    },
    checkLabelChecked: {
      color: cSuccess,
      fontWeight: "800",
    },
    bottomBar: {
      paddingHorizontal: spacing * 5,
      paddingTop: spacing * 3,
      gap: spacing * 2,
      borderTopWidth: 1,
      borderTopColor: cBorder,
      backgroundColor: cSurface,
    },
    startButton: {
      minHeight: 56,
    },
    listButton: {
      minHeight: 48,
    },
  });
});

export function PrepareForRunScreen({ order }: Props) {
  const theme = useAppTheme();
  const styles = useStyles();
  const { setActiveOrder, clearActiveOrder } = useActiveOrder();
  const insets = useSafeAreaInsets();
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const toggleCheck = (item: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(item)) {
        next.delete(item);
      } else {
        next.add(item);
      }
      return next;
    });
  };

  const allChecked = checkedItems.size === CHECKLIST_ITEMS.length;

  const handleStartDriving = () => {
    if (!allChecked) return;
    const drivingOrder = { ...order, status: "DRIVING" as const };
    setActiveOrder(drivingOrder);
  };

  const handleViewRunList = () => {
    clearActiveOrder();
  };

  return (
    <PageScaffold title="운행 준비" scroll padding={0}>
      <View style={styles.root}>
        <View style={styles.scrollInner}>
          <AppCard outlined style={styles.originCard}>
            <AppText style={styles.originLabel}>상차지</AppText>
            <AppText style={styles.originAddress}>{order.originAddress}</AppText>
            <AppText style={styles.subText}>운행을 시작하기 전, 아래 항목을 모두 확인해 주세요.</AppText>
          </AppCard>

          <View>
            <AppText style={styles.sectionTitle}>출발 전 체크리스트</AppText>
            <View style={styles.checklistWrap}>
              {CHECKLIST_ITEMS.map((item) => {
                const checked = checkedItems.has(item);
                return (
                  <Pressable
                    key={item}
                    onPress={() => toggleCheck(item)}
                    style={[styles.checkRow, checked ? styles.checkRowChecked : null]}
                  >
                    <Ionicons
                      name={checked ? "checkbox" : "square-outline"}
                      size={24}
                      color={checked ? theme.colors.semanticSuccess : theme.colors.textSub}
                    />
                    <AppText style={[styles.checkLabel, checked ? styles.checkLabelChecked : null]}>
                      {item}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <AppButton
            title="운행 시작"
            onPress={handleStartDriving}
            disabled={!allChecked}
            style={styles.startButton}
            textStyle={{ fontSize: 16, fontWeight: "900" }}
          />
          <AppButton
            title="운행 목록 보기"
            onPress={handleViewRunList}
            variant="secondary"
            style={styles.listButton}
          />
        </View>
      </View>
    </PageScaffold>
  );
}
