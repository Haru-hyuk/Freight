// src/shared/ui/kit/AppCard.tsx
import * as React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  type StyleProp,
  type TextProps,
  type TextStyle,
  View,
  type ViewProps,
  type ViewStyle,
} from "react-native";

import { safeNumber, safeString } from "@/shared/theme/colorUtils";
import { createThemedStyles } from "@/shared/theme/useAppTheme";

type CardTone = "default" | "actionRequired" | "paymentRequired";

type AppCardProps = Omit<ViewProps, "style"> & {
  /**
   * 기존 호환: style에 outer(레이아웃) + inner(배경/테두리) 스타일이 섞여 들어오는 케이스가 있어
   * 내부에서 안전하게 분리 적용합니다.
   */
  style?: StyleProp<ViewStyle>;
  /** shadow/elevation 적용 여부 */
  elevated?: boolean;
  /** 기본 카드(outlined) 테두리 표시 여부(기본 false) */
  outlined?: boolean;
  /** 카드 톤 */
  tone?: CardTone;

  /** outer(그림자/레이아웃) 강제 오버라이드 */
  outerStyle?: StyleProp<ViewStyle>;
  /** inner(배경/테두리/클리핑) 강제 오버라이드 */
  innerStyle?: StyleProp<ViewStyle>;
};

type AppCardSectionProps = Omit<ViewProps, "style"> & {
  style?: StyleProp<ViewStyle>;
};

type AppCardTextProps = Omit<TextProps, "style"> & {
  style?: StyleProp<TextStyle>;
};

const toArrayStyle = <T,>(style?: StyleProp<T>) => {
  if (!style) return [] as T[];
  return (Array.isArray(style) ? style : [style]) as any;
};

const clamp01Local = (n: unknown) => {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return Math.min(1, Math.max(0, v));
};

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = safeString(hex, "").trim().replace(/^#/, "");
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    if ([r, g, b].some((x) => Number.isNaN(x))) return null;
    return { r, g, b };
  }
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if ([r, g, b].some((x) => Number.isNaN(x))) return null;
    return { r, g, b };
  }
  return null;
}

function rgbToHex(rgb: { r: number; g: number; b: number }) {
  const to2 = (v: number) => {
    const n = Math.min(255, Math.max(0, Math.round(v)));
    return n.toString(16).padStart(2, "0");
  };
  return `#${to2(rgb.r)}${to2(rgb.g)}${to2(rgb.b)}`.toUpperCase();
}

/**
 * Android에서 "내부 회색 프레임(halo)"처럼 보이는 현상은
 * - elevation + radius + 1px border + 반투명(bg rgba) 조합에서 자주 발생합니다.
 * 해결: 카드 배경색을 항상 '불투명(HEX)'로 만들어 렌더링 artifacts를 제거합니다.
 */
function blendOnSolidBg(bgHex: string, fgHex: string, alpha: number, fallbackHex: string) {
  const bg = hexToRgb(bgHex);
  const fg = hexToRgb(fgHex);
  const a = clamp01Local(alpha);

  if (!bg || !fg) return safeString(fallbackHex, "#FFFFFF");

  const r = bg.r * (1 - a) + fg.r * a;
  const g = bg.g * (1 - a) + fg.g * a;
  const b = bg.b * (1 - a) + fg.b * a;

  return rgbToHex({ r, g, b });
}

function readAndroidCardRaised(input: unknown): ViewStyle {
  const source = (input ?? {}) as Record<string, unknown>;
  // 카드 shadow-sm 느낌: elevation을 낮게(너무 높으면 halo가 더 보임)
  return {
    elevation: safeNumber(source.elevation, 2),
  };
}

function readIOSCardRaised(input: unknown): ViewStyle {
  const source = (input ?? {}) as Record<string, unknown>;
  const offset = ((source.shadowOffset ?? {}) as Record<string, unknown>) ?? {};

  // 얕고 부드럽게 (shadow-sm)
  return {
    shadowColor: safeString(source.shadowColor, "#000000"),
    shadowOpacity: safeNumber(source.shadowOpacity, 0.08),
    shadowRadius: safeNumber(source.shadowRadius, 8),
    shadowOffset: {
      width: safeNumber(offset.width, 0),
      height: safeNumber(offset.height, 2),
    },
  };
}

const useStyles = createThemedStyles((theme) => {
  const cardRadius = safeNumber(theme?.components?.card?.radius, safeNumber(theme?.layout?.radii?.card, 20));
  const cardPaddingSm = safeNumber(theme?.components?.card?.paddingSm, 12);
  const cardPaddingMd = safeNumber(theme?.components?.card?.paddingMd, 16);

  const cSurface = safeString(theme?.colors?.bgSurface, "#FFFFFF");
  const cBorder = safeString(theme?.colors?.borderDefault, "#E5E7EB");
  const cPrimary = safeString(theme?.colors?.brandPrimary, "#FF6A00");
  const cSecondary = safeString(theme?.colors?.brandSecondary, "#3B82F6");

  // HTML 레퍼런스의 느낌에 맞춘 "불투명" 톤 배경
  const actionBg = blendOnSolidBg(cSurface, cPrimary, 0.04, "#FFFBF7");
  const paymentBg = blendOnSolidBg(cSurface, cSecondary, 0.035, "#F8FAFF");

  const androidRaised = readAndroidCardRaised(theme?.elevation?.androidCardRaised);
  const iosRaised = readIOSCardRaised(theme?.elevation?.iosCardRaised);

  return StyleSheet.create({
    cardOuterBase: {
      borderRadius: cardRadius,
      backgroundColor: cSurface,
    },
    cardOuterElevated: {
      ...(Platform.OS === "android" ? androidRaised : null),
      ...(Platform.OS === "ios" ? iosRaised : null),
    },

    // inner는 클리핑 + border만 담당
    cardInnerBase: {
      borderRadius: cardRadius,
      backgroundColor: cSurface,
      overflow: Platform.OS === "android" ? "hidden" : undefined,
      // Android에서 radius/clip 시 hairline 안정화
      ...(Platform.OS === "android"
        ? {
            renderToHardwareTextureAndroid: true,
            needsOffscreenAlphaCompositing: true,
          }
        : null),
    },

    // Tone backgrounds (불투명 HEX)
    toneDefaultBg: { backgroundColor: cSurface },
    toneActionBg: { backgroundColor: actionBg },
    tonePaymentBg: { backgroundColor: paymentBg },

    // Border는 "필요할 때만" borderWidth=1 적용 (transparent 1px 방지)
    borderNone: { borderWidth: 0, borderColor: "transparent" },
    borderDefault: { borderWidth: 1, borderColor: cBorder },
    borderAction: { borderWidth: 1, borderColor: cPrimary },
    borderPayment: { borderWidth: 1, borderColor: cSecondary },

    header: {
      padding: cardPaddingMd,
      gap: 6,
    },
    title: {
      color: safeString(theme?.colors?.textMain, "#111827"),
      fontSize: safeNumber(theme?.typography?.scale?.heading?.size, 18),
      lineHeight: safeNumber(theme?.typography?.scale?.heading?.lineHeight, 24),
      letterSpacing: safeNumber(theme?.typography?.scale?.heading?.letterSpacing, 0),
      fontWeight: (theme?.typography?.scale?.heading?.weight as any) ?? ("700" as any),
      fontFamily: safeString(theme?.typography?.fontFamilyPrimary, "") || undefined,
    },
    description: {
      color: safeString(theme?.colors?.textSub, "#6B7280"),
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14),
      lineHeight: safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20),
      letterSpacing: safeNumber(theme?.typography?.scale?.detail?.letterSpacing, 0),
      fontWeight: (theme?.typography?.scale?.detail?.weight as any) ?? ("400" as any),
      fontFamily: safeString(theme?.typography?.fontFamilyPrimary, "") || undefined,
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

const OUTER_KEYS: Record<string, true> = {
  margin: true,
  marginTop: true,
  marginBottom: true,
  marginLeft: true,
  marginRight: true,
  marginHorizontal: true,
  marginVertical: true,
  alignSelf: true,
  flex: true,
  flexGrow: true,
  flexShrink: true,
  flexBasis: true,
  width: true,
  height: true,
  minWidth: true,
  minHeight: true,
  maxWidth: true,
  maxHeight: true,
  position: true,
  top: true,
  bottom: true,
  left: true,
  right: true,
  zIndex: true,
  opacity: true,
  transform: true,

  // shadow/elevation
  elevation: true,
  shadowColor: true,
  shadowOpacity: true,
  shadowRadius: true,
  shadowOffset: true,
};

function splitOuterInnerStyle(style?: StyleProp<ViewStyle>) {
  const flat = (StyleSheet.flatten(style as any) ?? {}) as ViewStyle;

  const outer: ViewStyle = {};
  const inner: ViewStyle = {};

  for (const [k, v] of Object.entries(flat ?? {})) {
    if (k === "borderRadius") continue;
    if (OUTER_KEYS[k] || k.startsWith("margin")) {
      (outer as any)[k] = v as any;
    } else {
      (inner as any)[k] = v as any;
    }
  }

  const radius = (flat as any)?.borderRadius;
  if (typeof radius === "number") {
    outer.borderRadius = radius;
    inner.borderRadius = radius;
  }

  return { outer, inner };
}

type ViewRef = React.ComponentRef<typeof View>;
type TextRef = React.ComponentRef<typeof Text>;

export const AppCard = React.forwardRef<ViewRef, AppCardProps>(
  (
    {
      style,
      outerStyle,
      innerStyle,
      tone = "default",
      outlined = false,
      elevated = true,
      children,
      ...props
    },
    ref
  ) => {
    const s = useStyles();
    const { outer: outerFromStyle, inner: innerFromStyle } = splitOuterInnerStyle(style);

    const toneBgStyle =
      tone === "actionRequired" ? s.toneActionBg : tone === "paymentRequired" ? s.tonePaymentBg : s.toneDefaultBg;

    // 톤 카드(urgent/payment)는 항상 border 표시 (HTML 기준)
    const outlinedEffective = tone === "default" ? !!outlined : true;
    const borderStyle = outlinedEffective
      ? tone === "actionRequired"
        ? s.borderAction
        : tone === "paymentRequired"
        ? s.borderPayment
        : s.borderDefault
      : s.borderNone;

    // "사용자가 준 style"이 border/background를 덮어쓰면 일관성이 깨짐
    // => tone/bg/border를 가장 마지막에 적용해 고정
    const innerStack = [
      s.cardInnerBase,
      innerFromStyle,
      ...(toArrayStyle<ViewStyle>(innerStyle) as any),
      toneBgStyle,
      borderStyle,
    ];

    // outer는 Android halo 방지용으로 inner와 같은 '불투명 배경' 유지
    const resolvedInner = (StyleSheet.flatten(innerStack as any) ?? {}) as ViewStyle;
    const resolvedBg = safeString((resolvedInner?.backgroundColor as any) ?? "", safeString(safeString(undefined, ""), "#FFFFFF"));

    const outerStack = [
      s.cardOuterBase,
      elevated ? s.cardOuterElevated : undefined,
      { backgroundColor: resolvedBg } as ViewStyle,
      outerFromStyle,
      ...(toArrayStyle<ViewStyle>(outerStyle) as any),
    ];

    return (
      <View ref={ref} style={outerStack} {...props}>
        <View style={innerStack as any}>{children}</View>
      </View>
    );
  }
);
AppCard.displayName = "AppCard";

export const AppCardHeader = React.forwardRef<ViewRef, AppCardSectionProps>(({ style, ...props }, ref) => {
  const s = useStyles();
  return <View ref={ref} style={[s.header, ...(toArrayStyle<ViewStyle>(style) as any)]} {...props} />;
});
AppCardHeader.displayName = "AppCardHeader";

export const AppCardTitle = React.forwardRef<TextRef, AppCardTextProps>(({ style, ...props }, ref) => {
  const s = useStyles();
  return <Text ref={ref} style={[s.title, ...(toArrayStyle<TextStyle>(style) as any)]} {...props} />;
});
AppCardTitle.displayName = "AppCardTitle";

export const AppCardDescription = React.forwardRef<TextRef, AppCardTextProps>(({ style, ...props }, ref) => {
  const s = useStyles();
  return <Text ref={ref} style={[s.description, ...(toArrayStyle<TextStyle>(style) as any)]} {...props} />;
});
AppCardDescription.displayName = "AppCardDescription";

export const AppCardContent = React.forwardRef<ViewRef, AppCardSectionProps>(({ style, ...props }, ref) => {
  const s = useStyles();
  return <View ref={ref} style={[s.content, ...(toArrayStyle<ViewStyle>(style) as any)]} {...props} />;
});
AppCardContent.displayName = "AppCardContent";

export const AppCardFooter = React.forwardRef<ViewRef, AppCardSectionProps>(({ style, ...props }, ref) => {
  const s = useStyles();
  return <View ref={ref} style={[s.footer, ...(toArrayStyle<ViewStyle>(style) as any)]} {...props} />;
});
AppCardFooter.displayName = "AppCardFooter";

// 1) Android "회색 프레임"은 elevation+radius+1px border+반투명 배경에서 발생 확률이 높습니다.
// 2) tone 배경을 불투명 HEX로 블렌딩하고, borderWidth는 필요할 때만 적용하도록 바꿨습니다.
// 3) inner에 HW texture/오프스크린 합성을 켜서 라운드/클리핑 시 hairline artifact를 줄였습니다.
