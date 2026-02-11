import React, { useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Platform,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { safeString, tint } from "@/shared/theme/colorUtils";
import { useAppTheme } from "@/shared/theme/useAppTheme";
import { AppText } from "@/shared/ui/kit/AppText";

export type PageTopBarProps = {
  title: string;
  subtitle?: string;
  headerLeft?: React.ReactNode;
  headerRight?: React.ReactNode;
  onPressBack?: () => void;
  backLabel?: string;
  headerInsetTop?: number;
  showBackLabel?: boolean;
};

export function PageTopBar(props: PageTopBarProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  const cBg = safeString(theme?.colors?.bgSurface, "#FFFFFF");
  const cTextMain = safeString(theme?.colors?.textMain, "#0F172A");
  const cTextSub = safeString(theme?.colors?.textSub, "#475569");
  const cBorder = safeString(theme?.colors?.borderDefault, "#E2E8F0");
  const cShadow = safeString(theme?.colors?.textMain, "#000000");

  const styles = useMemo(
    () => createStyles({ cBg, cTextSub, cBorder, cShadow }),
    [cBg, cTextSub, cBorder, cShadow]
  );

  const shouldShowBack = !props.headerLeft && typeof props.onPressBack === "function";
  const backLabel = safeString(props.backLabel, "뒤로");

  const androidStatusBar = Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;
  const safeTop = Math.max(0, insets?.top ?? 0, androidStatusBar);
  const baseTop = typeof props.headerInsetTop === "number" ? Math.max(0, props.headerInsetTop) : safeTop;

  return (
    <View style={[styles.header, { paddingTop: baseTop + 8, paddingBottom: 12 }]}>
      <View style={styles.leftSlot}>
        {props.headerLeft ? (
          props.headerLeft
        ) : shouldShowBack ? (
          <TouchableOpacity
            onPress={props.onPressBack}
            activeOpacity={0.7}
            style={styles.backButton}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            accessibilityRole="button"
            accessibilityLabel={backLabel}
          >
            <Ionicons name="chevron-back" size={22} color={cTextMain} />
            {props.showBackLabel ? (
              <AppText variant="detail" weight="700" color={cTextMain} style={styles.backLabel}>
                {backLabel}
              </AppText>
            ) : null}
          </TouchableOpacity>
        ) : (
          <View style={styles.sidePlaceholder} />
        )}
      </View>

      <View style={styles.centerSlot}>
        <AppText variant="heading" weight="900" color={cTextMain} numberOfLines={1}>
          {props.title}
        </AppText>
        {props.subtitle ? (
          <AppText variant="caption" weight="600" color={cTextSub} numberOfLines={1}>
            {props.subtitle}
          </AppText>
        ) : null}
      </View>

      <View style={styles.rightSlot}>
        {props.headerRight ? props.headerRight : <View style={styles.sidePlaceholder} />}
      </View>
    </View>
  );
}

function createStyles(input: { cBg: string; cTextSub: string; cBorder: string; cShadow: string }) {
  const headerShadow = Platform.select<ViewStyle>({
    ios: {
      shadowColor: input.cShadow,
      shadowOpacity: 0.04,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 2 },
    default: {},
  });

  return StyleSheet.create({
    header: {
      backgroundColor: input.cBg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: tint(input.cBorder, 0.95, input.cBorder),
      paddingHorizontal: 20,
      flexDirection: "row",
      alignItems: "center",
      ...headerShadow,
    },
    leftSlot: {
      width: 92,
      alignItems: "flex-start",
      justifyContent: "center",
    },
    centerSlot: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 36,
    },
    rightSlot: {
      width: 92,
      alignItems: "flex-end",
      justifyContent: "center",
    },
    sidePlaceholder: {
      width: 36,
      height: 36,
    },
    backButton: {
      minHeight: 36,
      flexDirection: "row",
      alignItems: "center",
    },
    backLabel: {
      marginLeft: 4,
    },
  });
}

