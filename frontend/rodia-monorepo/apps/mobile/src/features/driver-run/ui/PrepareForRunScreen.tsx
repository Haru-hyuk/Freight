import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useActiveOrder } from "@/entities/order/model/active-order.store";
import type { ActiveRun } from "@/entities/order/model/types";
import { startDriverTransit } from "@/features/driver-run/api/driver-run-api";
import { readApiErrorMessage } from "@/shared/lib/api/readApiErrorMessage";
import { safeNumber, safeString, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

type Props = {
  activeRun: ActiveRun;
  isSyncing?: boolean;
  onRefetchRun?: () => Promise<void> | void;
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

function parsePositiveInt(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

export function PrepareForRunScreen({ activeRun, isSyncing = false, onRefetchRun }: Props) {
  const theme = useAppTheme();
  const styles = useStyles();
  const { clearActiveRun } = useActiveOrder();
  const insets = useSafeAreaInsets();
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [isStarting, setIsStarting] = useState(false);

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
  const safeMatchId = parsePositiveInt(activeRun.match.matchId);
  const originAddress = activeRun.summary?.originAddress || "-";
  const canStart = allChecked && safeMatchId > 0 && !isStarting && !isSyncing;

  const handleStartDriving = async () => {
    if (!canStart) return;

    try {
      setIsStarting(true);
      const result = await startDriverTransit(safeMatchId);
      if (!result) {
        throw new Error("운행 시작 응답이 비어 있습니다.");
      }
      if (typeof onRefetchRun === "function") {
        await onRefetchRun();
      }
      Alert.alert("운행 시작", "운행을 시작했습니다.");
    } catch (error) {
      Alert.alert("운행 시작 실패", readApiErrorMessage(error), [
        { text: "취소", style: "cancel" },
        { text: "다시 시도", onPress: () => void handleStartDriving() },
      ]);
    } finally {
      setIsStarting(false);
    }
  };

  const handleViewRunList = () => {
    if (isStarting) return;
    clearActiveRun();
  };

  return (
    <PageScaffold title="운행 준비" scroll padding={0}>
      <View style={styles.root}>
        <View style={styles.scrollInner}>
          <AppCard outlined style={styles.originCard}>
            <AppText style={styles.originLabel}>상차지</AppText>
            <AppText style={styles.originAddress}>{originAddress}</AppText>
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
                    disabled={isStarting || isSyncing}
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
            onPress={() => void handleStartDriving()}
            disabled={!canStart}
            loading={isStarting}
            style={styles.startButton}
            textStyle={{ fontSize: 16, fontWeight: "900" }}
          />
          <AppButton
            title="운행 목록 보기"
            onPress={handleViewRunList}
            variant="secondary"
            disabled={isStarting}
            style={styles.listButton}
          />
        </View>
      </View>
    </PageScaffold>
  );
}
