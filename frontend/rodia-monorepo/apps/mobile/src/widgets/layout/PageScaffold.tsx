import React, { useMemo } from "react";
import { Platform, StyleSheet, View, type ViewStyle } from "react-native";

import { safeString } from "@/shared/theme/colorUtils";
import { useAppTheme } from "@/shared/theme/useAppTheme";
import { AppContainer } from "@/shared/ui/kit/AppContainer";
import { PageTopBar } from "@/widgets/layout/PageTopBar";

type Props = {
  title: string;
  subtitle?: string;
  headerLeft?: React.ReactNode;
  headerRight?: React.ReactNode;
  onPressBack?: () => void;
  backLabel?: string;
  children?: React.ReactNode;
  bottomBar?: React.ReactNode;
  floating?: React.ReactNode;
  backgroundColor?: string;
  scroll?: boolean;
  padding?: number;
  contentStyle?: ViewStyle;
  headerInsetTop?: number;
};

export function PageScaffold(props: Props) {
  const theme = useAppTheme();

  const cShadow = safeString(theme?.colors?.textMain, "#000000");
  const bg = safeString(props.backgroundColor, safeString(theme?.colors?.bgSurfaceAlt, "#FAFBFC"));

  const styles = useMemo(() => createStyles(cShadow), [cShadow]);

  const scroll = props.scroll ?? true;
  const padding = typeof props.padding === "number" ? props.padding : 20;

  return (
    <View style={styles.root}>
      <AppContainer scroll={false} padding={0} backgroundColor={bg}>
        <PageTopBar
          title={props.title}
          subtitle={props.subtitle}
          headerLeft={props.headerLeft}
          headerRight={props.headerRight}
          onPressBack={props.onPressBack}
          backLabel={props.backLabel}
          headerInsetTop={props.headerInsetTop}
        />

        <AppContainer
          scroll={scroll}
          padding={padding}
          backgroundColor={bg}
          style={styles.bodyWrap}
          contentStyle={[styles.bodyContent, props.contentStyle]}
        >
          {props.children ?? null}
        </AppContainer>

        {props.floating ? <View style={styles.floatingWrap}>{props.floating}</View> : null}
        {props.bottomBar ? <View style={styles.bottomBarWrap}>{props.bottomBar}</View> : null}
      </AppContainer>
    </View>
  );
}

function createStyles(cShadow: string) {
  const bottomShadow = Platform.select<ViewStyle>({
    ios: {
      shadowColor: cShadow,
      shadowOpacity: 0.04,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: -4 },
    },
    android: { elevation: 8 },
    default: {},
  });

  return StyleSheet.create({
    root: { flex: 1 },
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

