import React, { memo, useMemo } from "react";
import { Link } from "expo-router";
import { Pressable, Text, View, StyleSheet, Platform, type ViewStyle, type TextStyle } from "react-native";
import { createThemedStyles, useAppTheme } from "../src/shared/theme/useAppTheme";

type ThemedStyles = {
  screen: ViewStyle;
  card: ViewStyle;
  title: TextStyle;
  body: TextStyle;
  btn: ViewStyle;
  btnText: TextStyle;
};

const useStyles = createThemedStyles((t): ThemedStyles => ({
  screen: { flex: 1, padding: 16, backgroundColor: t.colors.bgMain },
  card: {
    padding: 16,
    borderRadius: t.layout.radii.card,
    borderWidth: 1,
    borderColor: t.colors.borderDefault,
    backgroundColor: t.colors.bgSurfaceAlt,
    gap: 10,
  },
  title: {
    color: t.colors.textMain,
    fontSize: t.typography.headingSize,
    fontWeight: (t.typography.headingWeight ?? "700") as any,
  },
  body: {
    color: t.colors.textMain,
    fontSize: t.typography.bodySize,
    fontWeight: (t.typography.bodyWeight ?? "400") as any,
    opacity: 0.85,
  },
  btn: { marginTop: 8, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1 },
  btnText: { fontSize: 14, fontWeight: "900" },
}));

function Index() {
  const t = useAppTheme();
  const s = useStyles();

  const btnStyle = useMemo(
    () =>
      StyleSheet.flatten([
        s.btn,
        {
          backgroundColor: t?.colors?.brandPrimary ?? "#FF6A00",
          borderColor: t?.colors?.borderDefault ?? "#E2E8F0",
        },
      ]) as ViewStyle,
    [s.btn, t?.colors?.brandPrimary, t?.colors?.borderDefault],
  );

  const btnTextStyle = useMemo(
    () =>
      StyleSheet.flatten([
        s.btnText,
        { color: t?.colors?.textOnBrand ?? "#FFFFFF" },
      ]) as TextStyle,
    [s.btnText, t?.colors?.textOnBrand],
  );

  // web에서 Link(<a>)로 style 배열이 새는 케이스 방지: Link에는 style 절대 전달하지 않고, asChild + Pressable에서만 스타일 처리
  // 또한 혹시 모를 web 변환 이슈 최소화를 위해 Pressable을 View 기반으로 안전하게 유지
  const PressableComponent: any = Platform.OS === "web" ? View : Pressable;

  return (
    <View style={s.screen}>
      <View style={s.card}>
        <Text style={s.title}>Mobile(tokens) 연결 상태</Text>
        <Text style={s.body}>/debug-tokens에서 다크모드 전환 + fallback(앱 다운 없음) 확인</Text>

        <Link href="/debug-tokens" asChild>
          <PressableComponent {...(Platform.OS === "web" ? {} : { onPress: () => {} })} style={btnStyle}>
            <Text style={btnTextStyle}>/debug-tokens 열기</Text>
          </PressableComponent>
        </Link>
      </View>
    </View>
  );
}

export default memo(Index);

const _styles = StyleSheet.create({});

/**
 * 1) Link(<a>)로 style 배열이 전달되며 web에서 터지는 케이스 방지: StyleSheet.flatten으로 객체화 + Link에는 style 미전달.
 * 2) theme/null 대비: t?.colors?.* 기본값 처리로 앱 다운 방지.
 * 3) web 변환 안전성 강화: 필요 시 web에서는 View로 렌더(스타일/링크는 Link가 처리).
 */