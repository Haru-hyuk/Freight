import React, { useCallback, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

import { 
  loadDriverOrdersOverview, 
  getDriverQuoteSummaryDetail,
  type DriverOrderCard,
} from "@/features/matching/api";
import { useActiveOrder } from "@/entities/order/model/active-order.store";
import { safeString, safeNumber, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppText } from "@/shared/ui/kit/AppText";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppSpinner } from "@/shared/ui/kit/AppSpinner";
import { AppEmptyState } from "@/shared/ui/kit/AppEmptyState";
import { AppErrorState } from "@/shared/ui/kit/AppErrorState";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

export function DriverMyOrdersPage() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useStyles();
  const { setActiveOrder } = useActiveOrder();

  const [orders, setOrders] = useState<DriverOrderCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMyOrders = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const overview = await loadDriverOrdersOverview();
      setOrders(overview.myOrders);
      setError(null);
    } catch (e) {
      setError("오더 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchMyOrders("refresh");
    }, [fetchMyOrders])
  );

  const handlePrepareRun = async (card: DriverOrderCard) => {
    if (!card.quoteId) return;

    try {
      const quoteDetail = await getDriverQuoteSummaryDetail(card.quoteId);
      if (!quoteDetail) throw new Error("No detail found");

      setActiveOrder(quoteDetail);

      void fetchMyOrders("refresh").then(() => {
        router.replace("/(driver)/run");
      });
    } catch (e) {
      // API 에러 발생 시 처리 로직
    }
  };

  const renderItem = ({ item }: { item: DriverOrderCard }) => (
    <View style={styles.card}>
      <View style={styles.statusHeader}>
        <View style={styles.statusBadge}>
          <AppText style={styles.statusText}>{item.statusLabel}</AppText>
        </View>
        <AppText style={styles.dateText}>{item.requestedAtText}</AppText>
      </View>

      <AppText weight="bold" style={styles.routeText}>
        {item.originAddress} → {item.destinationAddress}
      </AppText>

      <View style={styles.specRow}>
        <AppText style={styles.specText}>{item.vehicleText}</AppText>
        <AppText style={styles.specText}> | </AppText>
        {/* weightKg가 DriverOrderCard에 정의되지 않은 경우를 대비해 타입 단언 사용 */}
        <AppText style={styles.specText}>{item.cargoText} ({(item as any).weightKg ?? "-"}kg)</AppText>
      </View>

      <AppButton
        title="운행 준비하기"
        onPress={() => handlePrepareRun(item)}
        style={styles.actionButton}
      />
    </View>
  );

  if (isLoading) return <AppSpinner label="내 오더를 확인 중입니다..." />;

  if (error) {
    return (
      <AppErrorState 
        title="오류 발생" 
        description={error} 
        onRetry={() => fetchMyOrders("initial")} 
      />
    );
  }

  return (
    <PageScaffold title="내 오더 관리" scroll={false}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.cardKey}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={() => fetchMyOrders("refresh")} 
          />
        }
        ListHeaderComponent={
          <AppText weight="bold" style={styles.headerTitle}>
            내 오더 목록 ({orders.length})
          </AppText>
        }
        ListEmptyComponent={
          <AppEmptyState 
            title="수락한 오더가 없습니다" 
            description="마켓에서 새로운 오더를 찾아보세요." 
          />
        }
      />
    </PageScaffold>
  );
}

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const cPrimary = safeString(theme?.colors?.brandPrimary, "#FF6A00");

  return StyleSheet.create({
    headerTitle: {
      fontSize: 18,
      marginBottom: spacing * 4,
    },
    listContent: {
      padding: spacing * 4,
      paddingBottom: spacing * 20,
    },
    card: {
      padding: spacing * 4,
      backgroundColor: "#FFF",
      borderWidth: 1,
      borderColor: "#EEE",
      borderRadius: 12,
      marginBottom: spacing * 3,
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 5,
      elevation: 2,
    },
    statusHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing * 2,
    },
    statusBadge: {
      backgroundColor: tint(cPrimary, 0.1, "#FFF"),
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: tint(cPrimary, 0.3, "#EEE"),
    },
    statusText: {
      color: cPrimary,
      fontSize: 12,
      fontWeight: "800",
    },
    dateText: {
      fontSize: 12,
      color: "#999",
    },
    routeText: {
      fontSize: 16,
      lineHeight: 22,
    },
    specRow: {
      flexDirection: "row",
      marginTop: spacing * 2,
    },
    specText: {
      fontSize: 14,
      color: "#666",
    },
    actionButton: {
      marginTop: spacing * 4,
    },
  });
});

export default DriverMyOrdersPage;