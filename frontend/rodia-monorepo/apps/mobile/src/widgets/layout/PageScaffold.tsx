// apps/mobile/src/widgets/layout/PageScaffold.tsx
import React, { useMemo } from "react";
import { Platform, StyleSheet, View, type ViewStyle } from "react-native";

import { useAppTheme } from "../../shared/theme/useAppTheme";
import { AppContainer } from "../../shared/ui/kit/AppContainer";
import { AppText } from "../../shared/ui/kit/AppText";

function safeString(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.trim().length > 0 ? v : fallback;
}

function rgbaFromHex(hex: string, opacity: number): string | null {
  const s = safeString(hex).trim();
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s)) return null;

  const raw = s.replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;

  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((x) => Number.isNaN(x))) return null;

  const a = Math.max(0, Math.min(1, opacity));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function tint(color: string, opacity: number, fallback: string): string {
  return rgbaFromHex(color, opacity) ?? fallback;
}

export function PageScaffold(props: {
  title: string;
  headerRight?: React.ReactNode;
  children?: React.ReactNode;
  bottomBar?: React.ReactNode;
  floating?: React.ReactNode;
  backgroundColor?: string;
}) {
  const theme = useAppTheme();

  const cCard = safeString(theme?.colors?.bgMain, "#FFFFFF");
  const cText = safeString(theme?.colors?.textMain, "#111827");
  const bg = safeString(props.backgroundColor, safeString(theme?.colors?.bgSurfaceAlt, "#F3F4F6"));

  const styles = useMemo(() => createStyles({ cCard }), [cCard]);

  return (
    <View style={styles.root}>
      {/* ✅ SafeArea: 상/하단 모두 AppContainer(SafeAreaView)로 처리 */}
      <AppContainer scroll={false} padding={0} backgroundColor={bg}>
        {/* ✅ 헤더: SafeArea 상단 inset 포함 */}
        <View style={styles.header}>
          <AppText variant="heading" weight="900" color={cText}>
            {props.title}
          </AppText>

          <View style={styles.headerRight}>{props.headerRight ?? null}</View>
        </View>

        {/* ✅ 본문: bottom bar 높이만큼 paddingBottom 확보 (iOS safe-bottom은 AppContainer가 포함) */}
        <AppContainer
          scroll
          padding={20}
          backgroundColor={bg}
          style={styles.bodyWrap}
          contentStyle={styles.bodyContent}
        >
          {props.children ?? null}
        </AppContainer>

        {/* ✅ floating: bottom bar + safe-bottom 고려한 위치 */}
        {props.floating ? <View style={styles.floatingWrap}>{props.floating}</View> : null}

        {/* ✅ bottomBar: SafeArea 하단은 이미 AppContainer가 처리하므로, 바 자체 높이는 고정 + paddingBottom은 bar 내부에서 처리 */}
        {props.bottomBar ? <View style={styles.bottomBarWrap}>{props.bottomBar}</View> : null}
      </AppContainer>
    </View>
  );
}

function createStyles(input: { cCard: string }) {
  const headerShadow = Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#000000",
      shadowOpacity: 0.06,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
    },
    android: { elevation: 4 },
    default: {},
  });

  const bottomShadow = Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#000000",
      shadowOpacity: 0.05,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: -6 },
    },
    android: { elevation: 10 },
    default: {},
  });

  return StyleSheet.create({
    root: { flex: 1 },

    header: {
      backgroundColor: tint(input.cCard, 0.92, input.cCard),
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: tint("#000000", 0.05, "rgba(0,0,0,0.05)"),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      ...(headerShadow ?? {}),
    },

    headerRight: { minHeight: 36, alignItems: "flex-end", justifyContent: "center" },

    bodyWrap: { flex: 1 },
    bodyContent: {
      flexGrow: 1,
      // ✅ 바텀 탭이 콘텐츠를 가리지 않도록 기본 공간 확보
      paddingBottom: 120,
    },

    floatingWrap: {
      position: "absolute",
      right: 20,
      // ✅ 탭 바 높이(64) + 여유(16) 기반. safe-bottom은 AppContainer(SafeArea)로 포함됨.
      bottom: 64 + 16,
      zIndex: 30,
    },

    bottomBarWrap: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 20,
      ...(bottomShadow ?? {}),
    },
  });
}

/*
요약(3줄)
- AppContainer(SafeAreaView)를 사용해 iOS/Android 상·하단 inset을 기본으로 처리합니다.
- 본문은 paddingBottom을 확보해 하단 탭이 스크롤 콘텐츠를 가리지 않게 했습니다.
- FAB는 탭 바 높이를 기준으로 배치해 기기별 safe-bottom 영향을 최소화했습니다.
*/
