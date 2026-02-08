// apps/mobile/src/widgets/layout/BottomTabBar.tsx
import React, { useMemo } from "react";
import { Platform, StyleSheet, View, type ViewStyle } from "react-native";

import { useAppTheme } from "@/shared/theme/useAppTheme";
import { BottomNavButton } from "@/shared/ui/kit/BottomNavButton";

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

export type BottomTabItem<K extends string> = {
  key: K;
  label: string;
  iconActive: Parameters<typeof BottomNavButton>[0]["iconActive"];
  iconInactive: Parameters<typeof BottomNavButton>[0]["iconInactive"];
};

export function BottomTabBar<K extends string>(props: {
  activeKey: K;
  onChange: (key: K) => void;
  items: Array<BottomTabItem<K>>;
}) {
  const theme = useAppTheme();

  const cCard = safeString(theme?.colors?.bgMain, "#FFFFFF");
  const cText = safeString(theme?.colors?.textMain, "#111827");
  const cPrimary = safeString(theme?.colors?.brandPrimary, "#FF6A00");

  const inactive = useMemo(() => tint(cText, 0.55, "rgba(17,24,39,0.55)"), [cText]);

  const styles = useMemo(() => createStyles({ cCard }), [cCard]);

  return (
    <View style={styles.root}>
      {props.items.map((it) => (
        <BottomNavButton
          key={it.key}
          label={it.label}
          active={props.activeKey === it.key}
          iconActive={it.iconActive}
          iconInactive={it.iconInactive}
          onPress={() => props.onChange(it.key)}
          activeIconColor={cPrimary}
          inactiveIconColor={inactive}
          activeTextColor={cText}
          inactiveTextColor={inactive}
          accessibilityLabel={`${it.label} 탭`}
        />
      ))}
    </View>
  );
}

function createStyles(input: { cCard: string }) {
  const shadow = Platform.select<ViewStyle>({
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
    // ✅ SafeArea 하단 inset은 PageScaffold의 AppContainer가 처리하므로 여기서는 고정 높이만 둠
    root: {
      height: 64,
      backgroundColor: tint(input.cCard, 0.96, input.cCard),
      borderTopWidth: 1,
      borderTopColor: tint("#000000", 0.05, "rgba(0,0,0,0.05)"),
      flexDirection: "row",
      ...(shadow ?? {}),
    },
  });
}

/*
요약(3줄)
- 하단 탭 바는 “높이 64”로 통일하고, safe-bottom은 상위 SafeArea(AppContainer)가 책임집니다.
- iOS/Android 그림자는 Platform.select로 분기했습니다.
- 버튼은 UI Kit 컴포넌트로 통일해 페이지가 가벼워집니다.
*/
