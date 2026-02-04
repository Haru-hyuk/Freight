import React from "react";
import { Pressable, Text, View } from "react-native";
import { createThemedStyles, useAppTheme, useAppThemeMode } from "../src/shared/theme/useAppTheme";

const useStyles = createThemedStyles((t) => ({
  screen: { flex: 1, padding: 16, backgroundColor: t.colors.bgMain },
  header: {
    gap: 8,
    padding: 16,
    borderRadius: t.layout.radii.card,
    borderWidth: 1,
    borderColor: t.colors.borderDefault,
    backgroundColor: t.colors.bgSurfaceAlt,
  },
  title: {
    color: t.colors.textMain,
    fontSize: t.typography.headingSize,
    fontWeight: t.typography.headingWeight as any,
  },
  subtitle: {
    color: t.colors.textMain,
    opacity: 0.75,
    fontSize: t.typography.bodySize,
    fontWeight: t.typography.bodyWeight as any,
  },
  row: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  btn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1 },
  btnText: { fontSize: 14, fontWeight: "900" },
  card: {
    marginTop: 16,
    padding: 16,
    borderRadius: t.layout.radii.card,
    borderWidth: 1,
    borderColor: t.colors.borderDefault,
    backgroundColor: t.colors.bgSurfaceAlt,
    gap: 10,
  },
  chip: { padding: 12, borderRadius: 12 },
  chipText: { fontWeight: "900" },
}));

export default function DebugTokens() {
  const theme = useAppTheme();
  const { mode, isDark, setMode } = useAppThemeMode();
  const s = useStyles();

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Text style={s.title}>Tokens → Theme 연결 확인</Text>
        <Text style={s.subtitle}>mode: {mode} / resolved: {isDark ? "dark" : "light"}</Text>
        <Text style={s.subtitle}>bgMain: {theme.colors.bgMain}</Text>
        <Text style={s.subtitle}>textMain: {theme.colors.textMain}</Text>

        <View style={s.row}>
          <Pressable style={[s.btn, { borderColor: theme.colors.borderDefault }]} onPress={() => setMode("system")}>
            <Text style={[s.btnText, { color: theme.colors.textMain }]}>System</Text>
          </Pressable>
          <Pressable style={[s.btn, { borderColor: theme.colors.borderDefault }]} onPress={() => setMode("light")}>
            <Text style={[s.btnText, { color: theme.colors.textMain }]}>Light</Text>
          </Pressable>
          <Pressable style={[s.btn, { borderColor: theme.colors.borderDefault }]} onPress={() => setMode("dark")}>
            <Text style={[s.btnText, { color: theme.colors.textMain }]}>Dark</Text>
          </Pressable>
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.subtitle}>Colors</Text>

        <View style={[s.chip, { backgroundColor: theme.colors.brandPrimary }]}>
          <Text style={[s.chipText, { color: theme.colors.textOnBrand }]}>brandPrimary: {theme.colors.brandPrimary}</Text>
        </View>

        <View style={[s.chip, { backgroundColor: theme.colors.semanticDanger }]}>
          <Text style={[s.chipText, { color: theme.colors.textOnBrand }]}>semanticDanger: {theme.colors.semanticDanger}</Text>
        </View>
      </View>
    </View>
  );
}
