import {
  withAndroidManifest,
  withInfoPlist,
  type ConfigPlugin,
} from "@expo/config-plugins";
import type { ExpoConfig, ConfigContext } from "expo/config";

/**
 * Expo Config Plugin: withDevNetworkOverrides
 * 개발 환경에서 HTTP 통신을 허용한다.
 */
const withDevNetworkOverrides: ConfigPlugin = (config) => {
  if (process.env.APP_ENV === "production") return config;

  config = withAndroidManifest(config, (androidConfig) => {
    const app = androidConfig.modResults.manifest.application;
    if (Array.isArray(app) && app.length > 0 && app[0].$) {
      app[0].$["android:usesCleartextTraffic"] = "true";
    }
    return androidConfig;
  });

  config = withInfoPlist(config, (iosConfig) => {
    iosConfig.modResults.NSAppTransportSecurity = {
      ...((iosConfig.modResults.NSAppTransportSecurity as Record<string, unknown>) ?? {}),
      NSAllowsArbitraryLoads: true,
    };
    return iosConfig;
  });

  return config;
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const baseConfig: ExpoConfig = {
    ...config,
    name: "mobile",
    slug: "mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    scheme: "myapp",
    ios: {
      supportsTablet: true,
      // iOS 식별자 추가
      bundleIdentifier: "com.lchae.mobile",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      // Android 패키지명 추가 (안내된 값)
      package: "com.lchae.mobile",
      softwareKeyboardLayoutMode: "resize",
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    plugins: ["expo-router"],
  };

  return withDevNetworkOverrides(baseConfig);
};