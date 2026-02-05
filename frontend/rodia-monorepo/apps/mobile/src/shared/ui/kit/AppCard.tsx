// apps/mobile/src/shared/ui/kit/AppCard.tsx
import * as React from "react";
import { Platform, StyleSheet, Text, type TextProps, type TextStyle, View, type ViewProps, type ViewStyle } from "react-native";
import { createThemedStyles } from "@/shared/theme/useAppTheme";

type AppCardProps = ViewProps & {
  style?: ViewStyle | ViewStyle[];
};

type AppCardSectionProps = ViewProps & {
  style?: ViewStyle | ViewStyle[];
};

type AppCardTextProps = TextProps & {
  style?: TextStyle | TextStyle[];
};

const CARD_PADDING = 24;
const HEADER_GAP = 6;

const useStyles = createThemedStyles((t) =>
  StyleSheet.create({
    card: {
      borderRadius: t.layout.radii.card,
      borderWidth: 1,
      borderColor: t.colors.borderDefault,
      backgroundColor: t.colors.bgSurfaceAlt,
      ...(Platform.OS === "android" ? t.elevation.androidCardRaised : null),
      ...(Platform.OS === "ios" ? t.elevation.iosCardRaised : null),
    },
    header: {
      padding: CARD_PADDING,
      gap: HEADER_GAP,
    },
    title: {
      color: t.colors.textMain,
      fontSize: t.typography.headingSize,
      fontWeight: (t.typography.headingWeight ?? "700") as any,
      lineHeight: Math.round((t.typography.headingSize ?? 18) * 1.2),
    },
    description: {
      color: t.colors.textMain,
      fontSize: Math.max(12, Math.round((t.typography.bodySize ?? 14) * 0.9)),
      fontWeight: (t.typography.bodyWeight ?? "400") as any,
      opacity: 0.7,
      lineHeight: Math.round(Math.max(12, Math.round((t.typography.bodySize ?? 14) * 0.9)) * 1.35),
    },
    content: {
      paddingHorizontal: CARD_PADDING,
      paddingBottom: CARD_PADDING,
      paddingTop: 0,
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: CARD_PADDING,
      paddingBottom: CARD_PADDING,
      paddingTop: 0,
      gap: 8,
    },
  })
);

const toArrayStyle = <T,>(style?: T | T[]) => {
  if (!style) return undefined;
  return Array.isArray(style) ? style : [style];
};

export const AppCard = React.forwardRef<React.ElementRef<typeof View>, AppCardProps>(({ style, ...props }, ref) => {
  const s = useStyles();
  return <View ref={ref} style={[s.card, ...((toArrayStyle<ViewStyle>(style) as any) ?? [])]} {...props} />;
});
AppCard.displayName = "AppCard";

export const AppCardHeader = React.forwardRef<React.ElementRef<typeof View>, AppCardSectionProps>(({ style, ...props }, ref) => {
  const s = useStyles();
  return <View ref={ref} style={[s.header, ...((toArrayStyle<ViewStyle>(style) as any) ?? [])]} {...props} />;
});
AppCardHeader.displayName = "AppCardHeader";

export const AppCardTitle = React.forwardRef<React.ElementRef<typeof Text>, AppCardTextProps>(({ style, ...props }, ref) => {
  const s = useStyles();
  return <Text ref={ref} style={[s.title, ...((toArrayStyle<TextStyle>(style) as any) ?? [])]} {...props} />;
});
AppCardTitle.displayName = "AppCardTitle";

export const AppCardDescription = React.forwardRef<React.ElementRef<typeof Text>, AppCardTextProps>(({ style, ...props }, ref) => {
  const s = useStyles();
  return <Text ref={ref} style={[s.description, ...((toArrayStyle<TextStyle>(style) as any) ?? [])]} {...props} />;
});
AppCardDescription.displayName = "AppCardDescription";

export const AppCardContent = React.forwardRef<React.ElementRef<typeof View>, AppCardSectionProps>(({ style, ...props }, ref) => {
  const s = useStyles();
  return <View ref={ref} style={[s.content, ...((toArrayStyle<ViewStyle>(style) as any) ?? [])]} {...props} />;
});
AppCardContent.displayName = "AppCardContent";

export const AppCardFooter = React.forwardRef<React.ElementRef<typeof View>, AppCardSectionProps>(({ style, ...props }, ref) => {
  const s = useStyles();
  return <View ref={ref} style={[s.footer, ...((toArrayStyle<ViewStyle>(style) as any) ?? [])]} {...props} />;
});
AppCardFooter.displayName = "AppCardFooter";