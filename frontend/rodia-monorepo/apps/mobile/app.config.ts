import type { ExpoConfig } from "expo/config";

// APP_ENV=production 으로 설정하지 않은 모든 빌드를 개발 환경으로 간주한다.
// 프로덕션 빌드 시: APP_ENV=production 환경 변수를 반드시 설정할 것.
//
// cleartext(Android) / ATS(iOS) 허용은 ./plugins/withDevNetworkOverrides 가 담당한다.
// ⚠️ Dev Client 재빌드 필수: 이 설정은 네이티브 Manifest/Info.plist를 수정하므로
//    OTA 업데이트로 적용되지 않는다. `expo run:android` 또는 EAS Build로 재빌드해야 한다.
//    Expo Go 환경에는 적용되지 않는다.

const config: ExpoConfig = {
  name: "mobile",
  slug: "mobile",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  scheme: "myapp",
  ios: {
    supportsTablet: true,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    softwareKeyboardLayoutMode: "resize",
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  plugins: [
    "expo-router",
    // dev/staging 환경에서 HTTP cleartext(Android) 및 ATS 예외(iOS)를 적용한다.
    // APP_ENV=production 이면 이 플러그인은 아무것도 수정하지 않는다.
    "./plugins/withDevNetworkOverrides",
  ],
};

export default config;
