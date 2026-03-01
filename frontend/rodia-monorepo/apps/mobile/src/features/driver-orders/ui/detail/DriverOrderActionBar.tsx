import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DRIVER_CTA_ID, type DriverCtaConfig } from "@/shared/lib/policy/types";
import { safeNumber, safeString } from "@/shared/theme/colorUtils";
import { createThemedStyles } from "@/shared/theme/useAppTheme";
import { AppButton, type AppButtonVariant } from "@/shared/ui/kit/AppButton";

type Props = {
  cta: DriverCtaConfig;
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
    button: {
      minHeight: 56,
    },
  });
});

function toButtonVariant(variant: string): AppButtonVariant {
  if (variant === "primary") return "primary";
  if (variant === "destructive") return "destructive";
  return "secondary";
}

export function DriverOrderActionBar({ cta }: Props) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  // Step 1 constraint: do not render CTA for START_DRIVE
  if (cta.id === DRIVER_CTA_ID.START_DRIVE) return null;

  const buttonVariant = toButtonVariant(cta.variant);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 8 }]}>
      <AppButton
        title={cta.label}
        variant={buttonVariant}
        disabled={!cta.enabled}
        style={styles.button}
        textStyle={{ fontSize: 16, fontWeight: "900" }}
      />
    </View>
  );
}
