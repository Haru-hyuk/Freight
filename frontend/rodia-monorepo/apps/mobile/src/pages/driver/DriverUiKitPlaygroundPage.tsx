import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useAuth } from "@/features/auth/model/useAuth";
import { createThemedStyles, useAppTheme, useAppThemeMode } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import {
  AppCard,
  AppCardContent,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
} from "@/shared/ui/kit/AppCard";
import { AppContainer } from "@/shared/ui/kit/AppContainer";
import { AppInput } from "@/shared/ui/kit/AppInput";
import { AppSpinner } from "@/shared/ui/kit/AppSpinner";
import { AppText } from "@/shared/ui/kit/AppText";

type ColorRow = { key: string; value: string };

function nextMode(mode: "system" | "light" | "dark") {
  if (mode === "system") return "light";
  if (mode === "light") return "dark";
  return "system";
}

export function DriverUiKitPlaygroundPage() {
  const auth = useAuth();
  const theme = useAppTheme();
  const { mode, isDark, setMode } = useAppThemeMode();
  const styles = useStyles();

  const [name, setName] = useState("");
  const [note, setNote] = useState("");

  const colorRows = useMemo<ColorRow[]>(
    () => [
      { key: "bgMain", value: theme.colors.bgMain },
      { key: "bgSurface", value: theme.colors.bgSurface },
      { key: "textMain", value: theme.colors.textMain },
      { key: "textSub", value: theme.colors.textSub },
      { key: "brandPrimary", value: theme.colors.brandPrimary },
      { key: "stateBrandPressed", value: theme.colors.stateBrandPressed },
      { key: "stateDisabledBg", value: theme.colors.stateDisabledBg },
      { key: "borderDefault", value: theme.colors.borderDefault },
    ],
    [theme.colors]
  );

  return (
    <AppContainer scroll padding={16} backgroundColor="bgMain">
      <View style={styles.root}>
        <AppCard>
          <AppCardHeader>
            <AppCardTitle>Driver Home - UI Kit Test</AppCardTitle>
            <AppCardDescription>Expanded JSON token values are now applied in mobile theme + kit.</AppCardDescription>
          </AppCardHeader>
          <AppCardContent style={styles.sectionContent}>
            <AppText variant="detail" color="textSub">
              role: {auth.user?.role ?? "unknown"} / userId: {auth.user?.id ?? "unknown"}
            </AppText>
            <AppText variant="detail" color="textSub">
              mode: {mode} ({isDark ? "dark" : "light"})
            </AppText>

            <View style={styles.row}>
              <AppButton
                title={`Theme: ${nextMode(mode)}`}
                variant="secondary"
                onPress={() => setMode(nextMode(mode))}
                style={styles.flexButton}
              />
              <AppButton title="Logout" variant="secondary" onPress={() => auth.logout()} style={styles.flexButton} />
            </View>
          </AppCardContent>
        </AppCard>

        <AppCard>
          <AppCardHeader>
            <AppCardTitle>Color Tokens</AppCardTitle>
            <AppCardDescription>Quick check for extended color tokens from JSON.</AppCardDescription>
          </AppCardHeader>
          <AppCardContent style={styles.sectionContent}>
            {colorRows.map((row) => (
              <View key={row.key} style={styles.colorRow}>
                <View style={[styles.swatch, { backgroundColor: row.value }]} />
                <AppText variant="detail" style={styles.colorLabel}>
                  {row.key}
                </AppText>
                <AppText variant="caption" color="textMuted">
                  {row.value}
                </AppText>
              </View>
            ))}
          </AppCardContent>
        </AppCard>

        <AppCard>
          <AppCardHeader>
            <AppCardTitle>Typography Scale</AppCardTitle>
            <AppCardDescription>display/title/heading/body/detail/caption token preview.</AppCardDescription>
          </AppCardHeader>
          <AppCardContent style={styles.sectionContent}>
            <AppText variant="display">Display Text</AppText>
            <AppText variant="title">Title Text</AppText>
            <AppText variant="heading">Heading Text</AppText>
            <AppText variant="body">Body Text</AppText>
            <AppText variant="detail" color="textSub">
              Detail Text
            </AppText>
            <AppText variant="caption" color="textMuted">
              Caption Text
            </AppText>
          </AppCardContent>
        </AppCard>

        <AppCard>
          <AppCardHeader>
            <AppCardTitle>Buttons</AppCardTitle>
            <AppCardDescription>Size, variant, pressed, and disabled state tokens.</AppCardDescription>
          </AppCardHeader>
          <AppCardContent style={styles.sectionContent}>
            <View style={styles.row}>
              <AppButton title="Primary md" variant="primary" style={styles.flexButton} />
              <AppButton title="Secondary md" variant="secondary" style={styles.flexButton} />
            </View>
            <View style={styles.row}>
              <AppButton title="Primary sm" variant="primary" size="sm" style={styles.flexButton} />
              <AppButton title="Destructive sm" variant="destructive" size="sm" style={styles.flexButton} />
            </View>
            <View style={styles.row}>
              <AppButton title="Primary lg" variant="primary" size="lg" style={styles.flexButton} />
              <AppButton title="Disabled lg" variant="primary" size="lg" disabled style={styles.flexButton} />
            </View>
            <View style={styles.row}>
              <AppButton title="Loading" loading style={styles.flexButton} />
              <AppButton title="Input Action" variant="secondary" style={styles.flexButton} />
            </View>
          </AppCardContent>
        </AppCard>

        <AppCard>
          <AppCardHeader>
            <AppCardTitle>Inputs</AppCardTitle>
            <AppCardDescription>Focus, helper, error, and disabled states.</AppCardDescription>
          </AppCardHeader>
          <AppCardContent style={styles.sectionContent}>
            <AppInput
              label="Driver name"
              placeholder="Enter name"
              value={name}
              onChangeText={setName}
              helperText="Uses bg.surface + control radius token"
            />
            <AppInput
              label="Memo"
              placeholder="Type memo"
              value={note}
              onChangeText={setNote}
              error={note.length > 0 && note.length < 4 ? "At least 4 chars" : undefined}
            />
            <AppInput label="Disabled input" placeholder="Disabled state token" editable={false} value="locked" />
          </AppCardContent>
        </AppCard>

        <AppCard>
          <AppCardHeader>
            <AppCardTitle>Spinner</AppCardTitle>
            <AppCardDescription>Simple async/loading token check.</AppCardDescription>
          </AppCardHeader>
          <AppCardContent style={styles.sectionContent}>
            <AppSpinner mode="inline" size="sm" label="Loading sample" />
          </AppCardContent>
        </AppCard>
      </View>
    </AppContainer>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    root: {
      gap: 12,
    },
    sectionContent: {
      gap: 10,
    },
    row: {
      flexDirection: "row",
      gap: 8,
    },
    flexButton: {
      flex: 1,
    },
    colorRow: {
      minHeight: 28,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    swatch: {
      width: 18,
      height: 18,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
    },
    colorLabel: {
      minWidth: 120,
    },
  })
);
