export type AppColorMode = "system" | "light" | "dark";

export type AppThemeColors = {
  bgMain: string;
  bgSurfaceAlt: string;
  textMain: string;

  textOnBrand: string;

  brandPrimary: string;
  brandSecondary: string;
  brandAccent: string;

  borderDefault: string;

  semanticDanger: string;
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
    };
  };

  typography: {
    headingSize: number;
    bodySize: number;
    headingWeight: string;
    bodyWeight: string;
  };

  elevation: {
    androidCardRaised: AndroidCardRaisedStyle;
    iosCardRaised: IOSCardRaisedStyle;
  };
};