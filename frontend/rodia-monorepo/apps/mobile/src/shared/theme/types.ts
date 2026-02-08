export type AppColorMode = "system" | "light" | "dark";

export type AppThemeColors = {
  bgMain: string;
  bgSurface: string;
  bgSurfaceAlt: string;

  textMain: string;
  textSub: string;
  textMuted: string;
  textInverse: string;

  textOnBrand: string;

  brandPrimary: string;
  brandSecondary: string;
  brandAccent: string;

  borderDefault: string;
  borderStrong: string;

  stateBrandPressed: string;
  stateOverlayPressed: string;
  stateDisabledBg: string;
  stateDisabledText: string;
  stateDisabledBorder: string;

  semanticDanger: string;
  semanticSuccess: string;
  semanticWarning: string;
  semanticInfo: string;
};

export type AndroidCardRaisedStyle = { elevation: number } & Record<string, unknown>;

export type IOSCardRaisedStyle = {
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  shadowOffset: { width: number; height: number };
} & Record<string, unknown>;

export type AppTheme = {
  mode: AppColorMode;
  isDark: boolean;

  colors: AppThemeColors;

  layout: {
    radii: {
      card: number;
      control: number;
      pill: number;
    };
    spacing: {
      base: number;
      steps: number[];
    };
  };

  typography: {
    headingSize: number;
    bodySize: number;
    headingWeight: string;
    bodyWeight: string;
    fontFamilyPrimary: string;
    scale: {
      display: {
        size: number;
        lineHeight: number;
        weight: string;
        letterSpacing: number;
      };
      title: {
        size: number;
        lineHeight: number;
        weight: string;
        letterSpacing: number;
      };
      heading: {
        size: number;
        lineHeight: number;
        weight: string;
        letterSpacing: number;
      };
      body: {
        size: number;
        lineHeight: number;
        weight: string;
        letterSpacing: number;
      };
      detail: {
        size: number;
        lineHeight: number;
        weight: string;
        letterSpacing: number;
      };
      caption: {
        size: number;
        lineHeight: number;
        weight: string;
        letterSpacing: number;
      };
    };
  };

  elevation: {
    androidCardRaised: AndroidCardRaisedStyle;
    iosCardRaised: IOSCardRaisedStyle;
  };

  components: {
    button: {
      sizes: {
        sm: { minHeight: number; paddingX: number; paddingY: number; radius: number };
        md: { minHeight: number; paddingX: number; paddingY: number; radius: number };
        lg: { minHeight: number; paddingX: number; paddingY: number; radius: number };
      };
    };
    card: {
      radius: number;
      paddingSm: number;
      paddingMd: number;
    };
  };
};
