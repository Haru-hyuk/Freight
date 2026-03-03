import React, { useState, useMemo, useCallback } from "react";
import { View, FlatList, Pressable, type ListRenderItemInfo } from "react-native";
import { useAppTheme, createThemedStyles } from "@/shared/theme/useAppTheme";
import { AppText } from "@/shared/ui/kit/AppText";
import { AppEmptyState } from "@/shared/ui/kit/AppEmptyState";
import { UsageHistoryCard } from "./UsageHistoryCard";
import type { ParsedUsageHistoryItem } from "./UsageHistoryCard";

// ---------------------------------------------------------------------------
// Filter definitions
// ---------------------------------------------------------------------------
type FilterKey = "all" | "inprogress" | "done" | "cancelled";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "inprogress", label: "진행중" },
  { key: "done", label: "완료" },
  { key: "cancelled", label: "취소" },
];

function applyFilter(items: ParsedUsageHistoryItem[], filter: FilterKey): ParsedUsageHistoryItem[] {
  switch (filter) {
    case "inprogress":
      return items.filter(
        ({ statusTone }) =>
          statusTone === "primary" || statusTone === "accent" || statusTone === "neutral",
      );
    case "done":
      return items.filter(({ statusTone }) => statusTone === "secondary");
    case "cancelled":
      return items.filter(({ statusTone }) => statusTone === "destructive");
    default:
      return items;
  }
}

// ---------------------------------------------------------------------------
// Stable separator
// ---------------------------------------------------------------------------
const ITEM_SEPARATOR_STYLE = { height: 10 };
function ItemSeparator() {
  return <View style={ITEM_SEPARATOR_STYLE} />;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export type UsageHistoryWidgetProps = {
  items: ParsedUsageHistoryItem[];
};

export function UsageHistoryWidget({ items }: UsageHistoryWidgetProps) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const theme = useAppTheme();
  const styles = useWidgetStyles();

  const filtered = useMemo(() => applyFilter(items, activeFilter), [items, activeFilter]);

  const tabCounts = useMemo<Record<FilterKey, number>>(
    () => ({
      all: items.length,
      inprogress: applyFilter(items, "inprogress").length,
      done: applyFilter(items, "done").length,
      cancelled: applyFilter(items, "cancelled").length,
    }),
    [items],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ParsedUsageHistoryItem>) => <UsageHistoryCard item={item} />,
    [],
  );

  const keyExtractor = useCallback((item: ParsedUsageHistoryItem) => item.id, []);

  const emptyElement = useMemo(
    () => (
      <View style={styles.emptyWrapper}>
        <AppEmptyState
          title="견적 내역이 없어요"
          description="조건을 바꾸거나 새로운 견적을 요청해 보세요."
        />
      </View>
    ),
    [styles.emptyWrapper],
  );

  return (
    <View style={styles.container}>
      {/* ── 고정형 세그먼트 탭 바 (개선된 구조) ── */}
      <View style={styles.tabBar}>
        {FILTERS.map((tab) => {
          const isActive = tab.key === activeFilter;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveFilter(tab.key)}
              style={styles.tabItem}
              android_ripple={{ color: theme.colors.stateOverlayPressed, borderless: true }}
            >
              <AppText
                variant="detail"
                weight={isActive ? "700" : "500"}
                style={{
                  color: isActive ? theme.colors.textMain : theme.colors.textMuted,
                }}
              >
                {tab.label}
              </AppText>
              <AppText
                variant="caption"
                weight={isActive ? "700" : "400"}
                style={{
                  color: theme.colors.textMuted,
                  marginTop: 2,
                }}
              >
                {tabCounts[tab.key]}건
              </AppText>
              {/* 하단 활성화 인디케이터 */}
              {isActive && <View style={styles.activeIndicator} />}
            </Pressable>
          );
        })}
      </View>

      {/* ── 스크롤 리스트 ── */}
      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ItemSeparatorComponent={ItemSeparator}
        ListEmptyComponent={emptyElement}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles (에러 해결: tabBar, tabItem, activeIndicator 정의)
// ---------------------------------------------------------------------------
const useWidgetStyles = createThemedStyles((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgMain,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: theme.colors.bgSurface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderDefault,
    height: 64,
    zIndex: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  activeIndicator: {
    position: "absolute",
    bottom: 0,
    width: "60%",
    height: 3,
    backgroundColor: theme.colors.brandPrimary,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  listContent: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  emptyWrapper: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 32,
  },
}));