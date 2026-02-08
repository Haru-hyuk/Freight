// apps/mobile/src/shared/ui/kit/AppContainer.tsx
import React, { useMemo } from "react";
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme, createThemedStyles } from "../../theme/useAppTheme";
import type { AppThemeColors } from "../../theme/types";

export type AppContainerProps = {
  children?: React.ReactNode;
  scroll?: boolean;
  padding?: number;
  backgroundColor?: keyof AppThemeColors | string;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  edges?: Array<"top" | "right" | "bottom" | "left">;

  /**
   * 하단 탭(고정 BottomTabBar)이 외부 레이아웃에서 이미 SafeArea를 처리하는 경우,
   * 컨텐츠 영역에서 bottom inset을 다시 적용하면 "불필요한 여백"이 생김.
   * 기본값 false로 두어 (shipper)/(driver) 탭 구조에서 여백이 생기지 않게 함.
   */
  includeBottomSafeArea?: boolean;
};

function resolveBg(themeColors: AppThemeColors, input?: keyof AppThemeColors | string) {
  const colors = (themeColors ?? ({} as any)) as AppThemeColors;

  if (!input) return (colors as any)?.bgMain ?? "#FFFFFF";

  if (typeof input === "string") {
    const key = input as keyof AppThemeColors;
    const byKey = (colors as any)?.[key];
    if (typeof byKey === "string" && byKey.length > 0) return byKey;
    return input;
  }

  return (colors as any)?.bgMain ?? "#FFFFFF";
}

export function AppContainer({
  children,
  scroll = false,
  padding = 16,
  backgroundColor,
  style,
  contentStyle,
  edges,
  includeBottomSafeArea = false,
}: AppContainerProps) {
  const theme = useAppTheme();
  const styles = useStyles();

  const bg = useMemo(
    () => resolveBg((theme?.colors ?? ({} as any)) as AppThemeColors, backgroundColor),
    [theme?.colors, backgroundColor]
  );

  const resolvedEdges = useMemo(() => {
    if (Array.isArray(edges) && edges.length > 0) return edges as AppContainerProps["edges"];
    return (includeBottomSafeArea ? ["top", "bottom"] : ["top"]) as AppContainerProps["edges"];
  }, [edges, includeBottomSafeArea]);

  const resolvedPadding = Number.isFinite(padding) ? (padding as number) : 16;

  if (scroll) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: bg }, style]} edges={resolvedEdges}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { padding: resolvedPadding }, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }, style]} edges={resolvedEdges}>
      <View style={[styles.content, { padding: resolvedPadding }, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
}

const useStyles = createThemedStyles((_theme) => {
  return StyleSheet.create({
    safe: { flex: 1 },
    content: { flex: 1 },
    scrollContent: { flexGrow: 1 },
  });
});

/*
요약(3줄)
- 탭이 외부 레이아웃에서 고정되는 구조를 기준으로 기본 SafeArea edges를 top만 적용해 하단 여백을 제거했습니다.
- 필요 시 includeBottomSafeArea=true 또는 edges 직접 전달로 화면별 bottom inset 적용을 선택할 수 있습니다.
- 테마/입력 누락에도 기본값 처리로 크래시 없이 동작합니다.
*/
