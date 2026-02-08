import * as React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  type TextProps,
  type TextStyle,
  View,
  type ViewProps,
  type ViewStyle,
} from "react-native";
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

const toArrayStyle = <T,>(style?: T | T[]) => {
  if (!style) return undefined;
  return Array.isArray(style) ? style : [style];
};

const useStyles = createThemedStyles((theme) => {
  const cardRadius = theme.components.card.radius;
  const cardPaddingSm = theme.components.card.paddingSm;
  const cardPaddingMd = theme.components.card.paddingMd;

  return StyleSheet.create({
    card: {
      borderRadius: cardRadius,
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      backgroundColor: theme.colors.bgSurface,
      ...(Platform.OS === "android" ? theme.elevation.androidCardRaised : null),
      ...(Platform.OS === "ios" ? theme.elevation.iosCardRaised : null),
    },
    header: {
      padding: cardPaddingMd,
      gap: 6,
    },
    title: {
      color: theme.colors.textMain,
      fontSize: theme.typography.scale.heading.size,
      lineHeight: theme.typography.scale.heading.lineHeight,
      letterSpacing: theme.typography.scale.heading.letterSpacing,
      fontWeight: theme.typography.scale.heading.weight as any,
      fontFamily: theme.typography.fontFamilyPrimary || undefined,
    },
    description: {
      color: theme.colors.textSub,
      fontSize: theme.typography.scale.detail.size,
      lineHeight: theme.typography.scale.detail.lineHeight,
      letterSpacing: theme.typography.scale.detail.letterSpacing,
      fontWeight: theme.typography.scale.detail.weight as any,
      fontFamily: theme.typography.fontFamilyPrimary || undefined,
    },
    content: {
      paddingHorizontal: cardPaddingMd,
      paddingBottom: cardPaddingMd,
      paddingTop: 0,
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: cardPaddingMd,
      paddingBottom: cardPaddingSm,
      paddingTop: 0,
      gap: 8,
    },
  });
});

export const AppCard = React.forwardRef<React.ElementRef<typeof View>, AppCardProps>(({ style, ...props }, ref) => {
  const s = useStyles();
  return <View ref={ref} style={[s.card, ...((toArrayStyle<ViewStyle>(style) as any) ?? [])]} {...props} />;
});
AppCard.displayName = "AppCard";

export const AppCardHeader = React.forwardRef<React.ElementRef<typeof View>, AppCardSectionProps>(
  ({ style, ...props }, ref) => {
    const s = useStyles();
    return <View ref={ref} style={[s.header, ...((toArrayStyle<ViewStyle>(style) as any) ?? [])]} {...props} />;
  }
);
AppCardHeader.displayName = "AppCardHeader";

export const AppCardTitle = React.forwardRef<React.ElementRef<typeof Text>, AppCardTextProps>(
  ({ style, ...props }, ref) => {
    const s = useStyles();
    return <Text ref={ref} style={[s.title, ...((toArrayStyle<TextStyle>(style) as any) ?? [])]} {...props} />;
  }
);
AppCardTitle.displayName = "AppCardTitle";

export const AppCardDescription = React.forwardRef<React.ElementRef<typeof Text>, AppCardTextProps>(
  ({ style, ...props }, ref) => {
    const s = useStyles();
    return <Text ref={ref} style={[s.description, ...((toArrayStyle<TextStyle>(style) as any) ?? [])]} {...props} />;
  }
);
AppCardDescription.displayName = "AppCardDescription";

export const AppCardContent = React.forwardRef<React.ElementRef<typeof View>, AppCardSectionProps>(
  ({ style, ...props }, ref) => {
    const s = useStyles();
    return <View ref={ref} style={[s.content, ...((toArrayStyle<ViewStyle>(style) as any) ?? [])]} {...props} />;
  }
);
AppCardContent.displayName = "AppCardContent";

export const AppCardFooter = React.forwardRef<React.ElementRef<typeof View>, AppCardSectionProps>(
  ({ style, ...props }, ref) => {
    const s = useStyles();
    return <View ref={ref} style={[s.footer, ...((toArrayStyle<ViewStyle>(style) as any) ?? [])]} {...props} />;
  }
);
AppCardFooter.displayName = "AppCardFooter";
