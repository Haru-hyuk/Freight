import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DRIVER_CTA_ID, type DriverCtaConfig } from "@/shared/lib/policy/types";
import { safeNumber, safeString } from "@/shared/theme/colorUtils";
import { createThemedStyles } from "@/shared/theme/useAppTheme";
import { AppButton, type AppButtonVariant } from "@/shared/ui/kit/AppButton";

type SecondaryCta = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};

type Props = {
  cta?: Partial<DriverCtaConfig> | null;
  onPress?: () => void;
  primaryLoading?: boolean;
  /** Optional secondary CTA rendered beside the primary (e.g. 운임 제안). */
  secondaryCta?: SecondaryCta;
};

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const cSurface = safeString(theme?.colors?.bgSurface, "#FFFFFF");
  const cBorder = safeString(theme?.colors?.borderDefault, "#E2E8F0");

  return StyleSheet.create({
    container: {
      borderTopWidth: 1,
      borderTopColor: cBorder,
      backgroundColor: cSurface,
      paddingHorizontal: spacing * 5,
      paddingTop: spacing * 3,
    },
    buttonRow: {
      flexDirection: "row",
      gap: spacing * 2,
    },
    button: {
      flex: 1,
      minHeight: 56,
    },
    buttonSingle: {
      minHeight: 56,
    },
  });
});

function toButtonVariant(variant: string): AppButtonVariant {
  if (variant === "primary") return "primary";
  if (variant === "destructive") return "destructive";
  return "secondary";
}

export function DriverOrderActionBar({ cta, onPress, primaryLoading = false, secondaryCta }: Props) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const safeCta: DriverCtaConfig = {
    id: cta?.id ?? DRIVER_CTA_ID.VIEW_RESULT,
    label: typeof cta?.label === "string" && cta.label.trim() ? cta.label : "상세 보기",
    variant: typeof cta?.variant === "string" ? cta.variant : "secondary",
    enabled: typeof cta?.enabled === "boolean" ? cta.enabled : false,
  };

  // START_DRIVE is handled by the workflow card body — never show an action bar for it.
  if (safeCta.id === DRIVER_CTA_ID.START_DRIVE) return null;

  const buttonVariant = toButtonVariant(safeCta.variant);
  const hasDual =
    Boolean(secondaryCta) &&
    typeof secondaryCta?.label === "string" &&
    secondaryCta.label.trim().length > 0 &&
    typeof secondaryCta?.onPress === "function";
  const isPrimaryDisabled = !safeCta.enabled || primaryLoading;
  const isSecondaryDisabled =
    secondaryCta?.disabled === true || secondaryCta?.loading === true || primaryLoading;
  const primaryOnPress = isPrimaryDisabled ? undefined : onPress;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 8 }]}>
      {hasDual ? (
        <View style={styles.buttonRow}>
          {/* Secondary action (운임 제안) on the left */}
          <AppButton
            title={secondaryCta!.label}
            variant="secondary"
            style={styles.button}
            loading={secondaryCta?.loading === true}
            disabled={isSecondaryDisabled}
            textStyle={{ fontSize: 15, fontWeight: "800" }}
            onPress={isSecondaryDisabled ? undefined : secondaryCta!.onPress}
          />
          {/* Primary action (배차 수락) on the right */}
          <AppButton
            title={safeCta.label}
            variant={buttonVariant}
            loading={primaryLoading}
            disabled={isPrimaryDisabled}
            style={styles.button}
            textStyle={{ fontSize: 15, fontWeight: "900" }}
            onPress={primaryOnPress}
          />
        </View>
      ) : (
        <AppButton
          title={safeCta.label}
          variant={buttonVariant}
          loading={primaryLoading}
          disabled={isPrimaryDisabled}
          style={styles.buttonSingle}
          textStyle={{ fontSize: 16, fontWeight: "900" }}
          onPress={primaryOnPress}
        />
      )}
    </View>
  );
}
