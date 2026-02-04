import React, { useMemo, useState } from "react";
import { View } from "react-native";
import { AppContainer } from "../src/shared/ui/kit/AppContainer";
import { AppText } from "../src/shared/ui/kit/AppText";
import { AppButton } from "../src/shared/ui/kit/AppButton";
import { AppInput } from "../src/shared/ui/kit/AppInput";
import { createThemedStyles, useAppTheme, useAppThemeMode } from "../src/shared/theme/useAppTheme";

type Chip = {
  key: string;
  label: string;
  value: string;
  bg: string;
  fg: string;
};

const useStyles = createThemedStyles((t) => ({
  headerCard: {
    gap: 10,
    padding: 16,
    borderRadius: t.layout.radii.card,
    borderWidth: 1,
    borderColor: t.colors.borderDefault,
    backgroundColor: t.colors.bgSurfaceAlt,
  },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sectionCard: {
    gap: 12,
    padding: 16,
    borderRadius: t.layout.radii.card,
    borderWidth: 1,
    borderColor: t.colors.borderDefault,
    backgroundColor: t.colors.bgSurfaceAlt,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
}));

export default function DebugTokens() {
  const theme = useAppTheme();
  const { mode, isDark, setMode } = useAppThemeMode();
  const s = useStyles();

  const [input, setInput] = useState("");

  const chips = useMemo<Chip[]>(
    () => [
      {
        key: "brandPrimary",
        label: "brandPrimary",
        value: theme?.colors?.brandPrimary ?? "",
        bg: theme?.colors?.brandPrimary ?? "#FF6A00",
        fg: theme?.colors?.textOnBrand ?? "#FFFFFF",
      },
      {
        key: "semanticDanger",
        label: "semanticDanger",
        value: theme?.colors?.semanticDanger ?? "",
        bg: theme?.colors?.semanticDanger ?? "#EF4444",
        fg: theme?.colors?.textOnBrand ?? "#FFFFFF",
      },
      {
        key: "bgMain",
        label: "bgMain",
        value: theme?.colors?.bgMain ?? "",
        bg: theme?.colors?.bgMain ?? "#F8FAFC",
        fg: theme?.colors?.textMain ?? "#0F172A",
      },
      {
        key: "textMain",
        label: "textMain",
        value: theme?.colors?.textMain ?? "",
        bg: theme?.colors?.bgSurfaceAlt ?? "#F1F5F9",
        fg: theme?.colors?.textMain ?? "#0F172A",
      },
    ],
    [theme?.colors]
  );

  return (
    <AppContainer scroll padding={16} backgroundColor="bgMain">
      <View style={{ gap: 14 }}>
        <View style={s.headerCard}>
          <AppText variant="heading">Tokens → Theme 연결 확인</AppText>
          <AppText variant="body" color="borderDefault">
            mode: {mode} / resolved: {isDark ? "dark" : "light"}
          </AppText>

          <View style={s.rowWrap}>
            <AppButton title="System" variant="secondary" size="sm" onPress={() => setMode("system")} />
            <AppButton title="Light" variant="secondary" size="sm" onPress={() => setMode("light")} />
            <AppButton title="Dark" variant="secondary" size="sm" onPress={() => setMode("dark")} />
          </View>

          <AppInput
            label="입력 테스트"
            placeholder="포커스/보더/텍스트 색 확인"
            value={input}
            onChangeText={setInput}
            helperText="AppInput 기본/포커스 상태 확인"
          />
        </View>

        <View style={s.sectionCard}>
          <AppText variant="heading">Colors</AppText>
          <AppText variant="caption" color="borderDefault">
            아래 칩은 현재 테마 색상을 그대로 표시합니다.
          </AppText>

          <View style={{ gap: 10 }}>
            {chips.map((c) => (
              <View key={c.key} style={[s.chip, { backgroundColor: c.bg }]}>
                <AppText variant="body" weight="900" color={c.fg}>
                  {c.label}: {c.value}
                </AppText>
              </View>
            ))}
          </View>
        </View>
      </View>
    </AppContainer>
  );
}

/**
 * 1) View/Text/Pressable 직접 사용 대신 AppContainer/AppText/AppButton/AppInput로 구성.
 * 2) 모드 전환(System/Light/Dark) + 색상 칩으로 토큰→테마 반영을 즉시 확인 가능.
 * 3) 입력 테스트를 추가해 AppInput의 포커스/헬퍼 처리까지 한 화면에서 검증.
 */
