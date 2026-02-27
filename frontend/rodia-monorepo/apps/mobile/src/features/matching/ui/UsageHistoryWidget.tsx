import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, View, type ListRenderItemInfo } from "react-native";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
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
// Stable separator — defined outside component to prevent re-mount on render
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

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ParsedUsageHistoryItem>) => <UsageHistoryCard item={item} />,
    [],
  );

  const keyExtractor = useCallback((item: ParsedUsageHistoryItem) => item.id, []);

  const emptyElement = useMemo(
    () => (
      <View style={styles.emptyWrapper}>
        <AppEmptyState
          title="이용 내역이 없어요"
          description="조건을 바꾸거나 새로운 견적을 요청해 보세요."
        />
      </View>
    ),
    [styles.emptyWrapper],
  );

  return (
    <View style={styles.container}>
      {/* ── Sticky Filter Bar ── */}
      <View style={styles.filterBar}>
        {FILTERS.map((tab) => {
          const isActive = tab.key === activeFilter;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveFilter(tab.key)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isActive
                    ? theme.colors.brandPrimary
                    : theme.colors.bgSurfaceAlt,
                },
              ]}
              android_ripple={{ color: theme.colors.stateOverlayPressed, borderless: false }}
            >
              <AppText
                variant="caption"
                weight="600"
                style={{
                  color: isActive ? theme.colors.textOnBrand : theme.colors.textMuted,
                }}
              >
                {tab.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {/* ── Scrollable List ── */}
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
// Styles
// ---------------------------------------------------------------------------
const useWidgetStyles = createThemedStyles((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgMain,
  },
  filterBar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.bgMain,
    // Subtle underline shadow communicates sticky context
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 3,
    zIndex: 10,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: theme.layout.radii.pill,
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 40,
    flexGrow: 1, // enables centering of empty state
  },
  emptyWrapper: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 32,
  },
}));
