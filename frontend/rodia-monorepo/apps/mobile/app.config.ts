import type { ExpoConfig } from "expo/config";

// APP_ENV=production 으로 설정하지 않은 모든 빌드를 개발 환경으로 간주.
// 프로덕션 빌드 시: APP_ENV=production 환경 변수를 설정할 것.
// ※ cleartext 및 ATS 허용은 개발/스테이징 환경에서만 활성화됨.
//   적용 시 네이티브 재빌드(Dev Client rebuild) 가 필요하며, Expo Go 에는 적용되지 않음.
const isProduction = process.env.APP_ENV === "production";

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
    // 개발 환경: HTTP(평문) 로컬 서버 접속을 위한 ATS 예외.
    // 프로덕션에서는 HTTPS 서버를 사용해야 하므로 이 설정이 필요 없음.
    ...(isProduction
      ? {}
      : {
          infoPlist: {
            NSAppTransportSecurity: {
              NSAllowsArbitraryLoads: true,
            },
          },
        }),
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    softwareKeyboardLayoutMode: "resize",
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    // 개발 환경: HTTP(평문) 로컬 서버 접속 허용.
    // Android 9+ 기본값은 cleartext 차단이므로, 로컬 개발 서버(http://)에 접속하려면 필요.
    // 프로덕션에서는 반드시 HTTPS 서버를 사용하고 이 플래그를 false 로 설정할 것.
    // @ts-expect-error usesCleartextTraffic is a valid Android manifest field not in ExpoConfig types
    usesCleartextTraffic: !isProduction,
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  plugins: ["expo-router"],
};

export default config;
