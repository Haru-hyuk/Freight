import React, { memo, useCallback, useMemo, useState } from "react";
import { Link } from "expo-router";
import { View, StyleSheet, type ViewStyle } from "react-native";
import { createThemedStyles, useAppTheme, useAppThemeMode } from "../src/shared/theme/useAppTheme";
import { AppContainer } from "../src/shared/ui/kit/AppContainer";
import { AppText } from "../src/shared/ui/kit/AppText";
import { AppButton } from "../src/shared/ui/kit/AppButton";
import { AppInput } from "../src/shared/ui/kit/AppInput";

type ThemedStyles = {
  stack: ViewStyle;
  section: ViewStyle;
  sectionHeader: ViewStyle;
  row: ViewStyle;
  rowWrap: ViewStyle;
  chip: ViewStyle;
  divider: ViewStyle;
};

const useStyles = createThemedStyles((t): ThemedStyles => ({
  stack: { gap: 14 },
  section: {
    padding: 16,
    borderRadius: t.layout.radii.card,
    borderWidth: 1,
    borderColor: t.colors.borderDefault,
    backgroundColor: t.colors.bgSurfaceAlt,
    gap: 12,
  },
  sectionHeader: { gap: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowWrap: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: t.colors.borderDefault,
    backgroundColor: t.colors.bgMain,
  },
  divider: { height: 1, backgroundColor: t.colors.borderDefault, opacity: 0.7 },
}));

function Index() {
  const t = useAppTheme();
  const s = useStyles();
  const { mode, isDark, setMode } = useAppThemeMode();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  const nameError = useMemo(() => {
    if (!showErrors) return undefined;
    return name.trim().length === 0 ? "이름을 입력하세요." : undefined;
  }, [name, showErrors]);

  const emailError = useMemo(() => {
    if (!showErrors) return undefined;
    const v = email.trim();
    if (v.length === 0) return "이메일을 입력하세요.";
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    return ok ? undefined : "이메일 형식이 올바르지 않습니다.";
  }, [email, showErrors]);

  const toggleErrors = useCallback(() => setShowErrors((v) => !v), []);
  const clearForm = useCallback(() => {
    setName("");
    setEmail("");
    setShowErrors(false);
  }, []);

  return (
    <AppContainer scroll padding={16} backgroundColor="bgMain">
      <View style={s.stack}>
        {/* Header */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <AppText variant="heading">Mobile UI Kit 확인 페이지</AppText>
            <AppText variant="caption" color="borderDefault">
              AppContainer / AppText / AppButton / AppInput 동작과 테마 반영을 한 화면에서 검증합니다.
            </AppText>
          </View>

          <View style={s.divider} />

          <View style={s.rowWrap}>
            <View style={s.chip}>
              <AppText variant="caption" weight="700">
                mode: {mode}
              </AppText>
            </View>
            <View style={s.chip}>
              <AppText variant="caption" weight="700">
                isDark: {String(isDark)}
              </AppText>
            </View>
            <View style={s.chip}>
              <AppText variant="caption" weight="700">
                brandPrimary: {t.colors.brandPrimary}
              </AppText>
            </View>
          </View>

          <View style={s.rowWrap}>
            <AppButton title="System" variant="secondary" size="sm" onPress={() => setMode("system")} />
            <AppButton title="Light" variant="secondary" size="sm" onPress={() => setMode("light")} />
            <AppButton title="Dark" variant="secondary" size="sm" onPress={() => setMode("dark")} />
            <AppButton title={showErrors ? "에러 숨기기" : "에러 보기"} variant="secondary" size="sm" onPress={toggleErrors} />
            <AppButton title="초기화" variant="secondary" size="sm" onPress={clearForm} />
          </View>
        </View>

        {/* AppText */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <AppText variant="heading">AppText</AppText>
            <AppText variant="caption" color="borderDefault">
              variant/size/weight/color 조합 확인
            </AppText>
          </View>

          <AppText variant="heading">Heading (theme headingSize/Weight)</AppText>
          <AppText variant="body">Body (theme bodySize/Weight)</AppText>
          <AppText variant="caption" color="borderDefault">
            Caption (작은 텍스트, 보조 색상)
          </AppText>

          <View style={s.rowWrap}>
            <AppText variant="body" weight="400">
              400
            </AppText>
            <AppText variant="body" weight="700">
              700
            </AppText>
            <AppText variant="body" weight="900">
              900
            </AppText>
            <AppText variant="body" color="brandPrimary">
              brandPrimary
            </AppText>
            <AppText variant="body" color="semanticDanger">
              semanticDanger
            </AppText>
          </View>
        </View>

        {/* AppButton */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <AppText variant="heading">AppButton</AppText>
            <AppText variant="caption" color="borderDefault">
              variant/size/disabled/loading 확인
            </AppText>
          </View>

          <View style={s.rowWrap}>
            <AppButton title="Primary" variant="primary" onPress={() => {}} />
            <AppButton title="Secondary" variant="secondary" onPress={() => {}} />
            <AppButton title="Destructive" variant="destructive" onPress={() => {}} />
          </View>

          <View style={s.rowWrap}>
            <AppButton title="sm" variant="primary" size="sm" onPress={() => {}} />
            <AppButton title="md" variant="primary" size="md" onPress={() => {}} />
            <AppButton title="lg" variant="primary" size="lg" onPress={() => {}} />
            <AppButton variant="secondary" size="icon" onPress={() => {}}>
              <AppText variant="caption" weight="900" color="textMain">
                🔍
              </AppText>
            </AppButton>
          </View>

          <View style={s.rowWrap}>
            <AppButton title="Loading" variant="primary" loading onPress={() => {}} />
            <AppButton title="Disabled" variant="primary" disabled onPress={() => {}} />
            <AppButton title="Disabled (Secondary)" variant="secondary" disabled onPress={() => {}} />
          </View>
        </View>

        {/* AppInput */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <AppText variant="heading">AppInput</AppText>
            <AppText variant="caption" color="borderDefault">
              label/helper/error/focus/disabled 확인 (상단에서 에러 보기 토글)
            </AppText>
          </View>

          <AppInput
            label="이름"
            placeholder="홍길동"
            value={name}
            onChangeText={setName}
            error={nameError}
            helperText={nameError ? undefined : "필수 입력입니다."}
            left={<AppText variant="caption">👤</AppText>}
          />

          <AppInput
            label="이메일"
            placeholder="name@company.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            error={emailError}
            helperText={emailError ? undefined : "예: user@rodia.com"}
            left={<AppText variant="caption">✉️</AppText>}
            right={
              email.trim().length > 0 ? (
                <AppButton variant="secondary" size="sm" title="지우기" onPress={() => setEmail("")} />
              ) : null
            }
          />

          <AppInput
            label="비활성 입력"
            placeholder="disabled"
            value="변경 불가"
            editable={false}
            helperText="editable=false 상태 확인"
          />
        </View>

        {/* Navigation */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <AppText variant="heading">네비게이션</AppText>
            <AppText variant="caption" color="borderDefault">
              expo-router Link + AppButton 조합 확인
            </AppText>
          </View>

          <Link href="/debug-tokens" asChild>
            <AppButton title="/debug-tokens 열기" variant="primary" />
          </Link>

          <AppText variant="caption" color="borderDefault">
            이동 후 다크모드/토큰/폴백이 정상 작동하면 UI Kit + Theme 연결이 정상입니다.
          </AppText>
        </View>
      </View>
    </AppContainer>
  );
}

export default memo(Index);

/**
 * 1) UI Kit 4종(AppContainer/AppText/AppButton/AppInput)을 한 화면에서 상태별로 검증하도록 구성.
 * 2) 모든 스타일은 useAppTheme 기반(createThemedStyles)이며, 모드 전환 버튼으로 라이트/다크 반영 확인.
 * 3) Link(asChild)+AppButton 조합으로 라우팅까지 함께 점검 가능.
 */
