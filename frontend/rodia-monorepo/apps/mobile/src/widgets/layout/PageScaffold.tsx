// apps/mobile/src/widgets/layout/PageScaffold.tsx
import React, { useMemo } from "react";
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
import { AppContainer } from "@/shared/ui/kit/AppContainer";
import { AppText } from "@/shared/ui/kit/AppText";

type Props = {
  title: string;
  subtitle?: string;

  /** ✅ TopBar slots */
  headerLeft?: React.ReactNode;
  headerRight?: React.ReactNode;

  /** ✅ Optional Back button (if provided, will show when headerLeft is not set) */
  onPressBack?: () => void;
  backLabel?: string;

  children?: React.ReactNode;
  bottomBar?: React.ReactNode;
  floating?: React.ReactNode;
  backgroundColor?: string;

  /** ✅ Layout */
  scroll?: boolean;
  padding?: number;
  contentStyle?: ViewStyle;

  /**
   * ✅ Status bar / notch safe area padding for the header content.
   * - default: auto (safe-area top + android StatusBar height fallback)
   * - set 0 if your AppContainer already applies top inset and you see double padding
   */
  headerInsetTop?: number;
};

export function PageScaffold(props: Props) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  const cCard = safeString(theme?.colors?.bgMain, "#FFFFFF");
  const cText = safeString(theme?.colors?.textMain, "#111827");
  const cSub = safeString(theme?.colors?.textSub, safeString(theme?.colors?.textMuted, "#6B7280"));
  const cBorder = safeString(theme?.colors?.borderDefault, "rgba(0,0,0,0.08)");
  const cShadow = safeString(theme?.colors?.textMain, "#000000");

  const bg = safeString(props.backgroundColor, safeString(theme?.colors?.bgSurfaceAlt, "#FAFBFC"));

  const styles = useMemo(() => createStyles({ cCard, cBorder, cShadow }), [cCard, cBorder, cShadow]);

  const scroll = props.scroll ?? true;
  const padding = typeof props.padding === "number" ? props.padding : 20;

  const shouldShowBack = !props.headerLeft && typeof props.onPressBack === "function";
  const backLabel = safeString(props.backLabel, "뒤로");

  // ✅ [수정] 안전한 상단 여백 계산 (Safe Area Logic)
  // 1. 기기의 물리적 안전 영역 (노치, 상태바 등) 가져오기
  const safeAreaTop = insets.top > 0 
    ? insets.top 
    : (Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0);

  // 2. 사용자가 강제로 값을 넘겼으면 그 값 사용, 아니면 자동 계산 값 사용
  const baseTop = typeof props.headerInsetTop === "number" 
    ? Math.max(0, props.headerInsetTop) 
    : safeAreaTop;

  const contentSpacing = 18;

  const headerPaddingTop = baseTop + contentSpacing;
  const headerPaddingBottom = 20; // 하단 여백도 살짝 주어 균형 맞춤

  const headerSideSlotBounds = { top: headerPaddingTop, bottom: headerPaddingBottom };

  return (
    <View style={styles.root}>
      <AppContainer scroll={false} padding={0} backgroundColor={bg}>
        {/* TopBar */}
        <View 
          style={[
            styles.header, 
            { 
              paddingTop: headerPaddingTop, 
              paddingBottom: headerPaddingBottom,
              height: undefined // 높이를 자동으로 늘려 패딩을 수용
            }
          ]}
        >
          <View style={[styles.headerLeft, headerSideSlotBounds]}>
            {props.headerLeft ? (
              props.headerLeft
            ) : shouldShowBack ? (
              <TouchableOpacity
                onPress={props.onPressBack}
                activeOpacity={0.3}
                style={styles.backBtn}
                accessibilityRole="button"
                accessibilityLabel={backLabel}
              >
                <AppText variant="detail" weight="800" color={cText}>
                  ←
                </AppText>
                <AppText variant="detail" weight="700" color={cText} style={styles.backLabel}>
                  {backLabel}
                </AppText>
              </TouchableOpacity>
            ) : (
              <View style={styles.headerSlotPlaceholder} />
            )}
          </View>

          <View style={styles.headerCenter}>
            <AppText variant="heading" weight="900" color={cText} numberOfLines={1}>
              {props.title}
            </AppText>
            {props.subtitle ? (
              <AppText variant="caption" weight="600" color={cSub} numberOfLines={1} style={styles.subtitle}>
                {props.subtitle}
              </AppText>
            ) : null}
          </View>

          <View style={[styles.headerRight, headerSideSlotBounds]}>
            {props.headerRight ? props.headerRight : <View style={styles.headerSlotPlaceholder} />}
          </View>
        </View>

        {/* ✅ Body */}
        <AppContainer
          scroll={scroll}
          padding={padding}
          backgroundColor={bg}
          style={styles.bodyWrap}
          contentStyle={[styles.bodyContent, props.contentStyle]}
        >
          {props.children ?? null}
        </AppContainer>

        {/* ✅ floating */}
        {props.floating ? <View style={styles.floatingWrap}>{props.floating}</View> : null}

        {/* ✅ bottomBar */}
        {props.bottomBar ? <View style={styles.bottomBarWrap}>{props.bottomBar}</View> : null}
      </AppContainer>
    </View>
  );
}

function createStyles(input: { cCard: string; cBorder: string; cShadow: string }) {
  const headerShadow = Platform.select<ViewStyle>({
    ios: {
      shadowColor: input.cShadow,
      shadowOpacity: 0.1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
    },
    android: { elevation: 2 },
    default: {},
  });

  const bottomShadow = Platform.select<ViewStyle>({
    ios: {
      shadowColor: input.cShadow,
      shadowOpacity: 0.04,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: -4 },
    },
    android: { elevation: 8 },
    default: {},
  });

  const headerBg = input.cCard;
  const headerBorder = tint(input.cBorder, 0.9, input.cBorder);

  return StyleSheet.create({
    root: { flex: 1 },

    header: {
      backgroundColor: headerBg,
      paddingHorizontal: 20,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: headerBorder,
      flexDirection: "row",
      alignItems: "center",
      zIndex: 15,
      ...headerShadow,
    },

    headerLeft: {
      position: "absolute",
      left: 20,
      zIndex: 10,
      justifyContent: "center",
    },

    headerCenter: {
      flex: 1,
      alignItems: "flex-start",
      justifyContent: "center",
      paddingHorizontal: 0,
      paddingLeft: 0,
    },

    headerRight: {
      position: "absolute",
      right: 20,
      zIndex: 10,
      justifyContent: "center",
    },

    headerSlotPlaceholder: {
      minWidth: 36,
      minHeight: 36,
    },

    backBtn: {
      minHeight: 36,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
    },

    backLabel: {
      marginLeft: 8,
    },

    subtitle: {
      marginTop: 2,
    },

    bodyWrap: { flex: 1 },
    bodyContent: {
      flexGrow: 1,
      paddingTop: 0,
    },

    floatingWrap: {
      position: "absolute",
      right: 20,
      bottom: 10,
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
