import {
  withAndroidManifest,
  withInfoPlist,
  type ConfigPlugin,
} from "@expo/config-plugins";
import type { ExpoConfig, ConfigContext } from "expo/config";

// ─── 환경 식별 ────────────────────────────────────────────────────────────────
// APP_ENV 미설정 시 "development"로 간주.
// EAS Build: eas.json의 env 블록에서 주입. 로컬: .env 또는 쉘 export 로 주입.
const IS_PRODUCTION = process.env.APP_ENV === "production";

// ─── Config Plugin: withCleartextNetwork ─────────────────────────────────────
// 개발 환경에서만 HTTP 평문 통신을 허용한다.
// - Android: <application android:usesCleartextTraffic="true">
// - iOS: NSAppTransportSecurity → NSAllowsArbitraryLoads
// 운영 빌드에서는 즉시 반환하여 보안 설정을 그대로 유지한다.
const withCleartextNetwork: ConfigPlugin = (config) => {
  if (IS_PRODUCTION) return config;

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

// ─── 메인 Config ─────────────────────────────────────────────────────────────
// SSOT 원칙: app.json의 정적 값을 ...config 로 상속받고,
// 동적 · 환경별 값만 이 파일에서 추가/덮어쓴다.
export default ({ config }: ConfigContext): ExpoConfig => {
  const mergedConfig: ExpoConfig = {
    // app.json의 모든 정적 설정 상속 (name, slug, version, splash, web, plugins, extra 등)
    ...config,

    // TypeScript 에러 방지: config.slug가 undefined일 경우를 대비한 Fallback 명시
    slug: config.slug ?? "mobile",

    // 환경별 앱 표시 이름 — 스토어 등록명과 홈 화면에 보이는 이름
    name: IS_PRODUCTION ? "Rodia" : "Rodia (Dev)",

    ios: {
      // app.json의 ios 정적 설정 (supportsTablet 등) 상속
      ...config.ios,
      // 번들 식별자: 개발·운영 빌드를 기기에 동시 설치 가능하도록 분리
      bundleIdentifier: IS_PRODUCTION
        ? "com.lchae.mobile"
        : "com.lchae.mobile.dev",
    },

    android: {
      // app.json의 android 정적 설정 (adaptiveIcon, edgeToEdge 등) 상속
      ...config.android,
      // 패키지명: 동일 이유로 개발·운영 분리
      package: IS_PRODUCTION
        ? "com.lchae.mobile"
        : "com.lchae.mobile.dev",
    },

    extra: {
      // app.json의 extra (router, eas) 상속
      ...config.extra,
      // 런타임에서 Constants.expoConfig.extra.APP_ENV 로 환경 판별 가능
      APP_ENV: process.env.APP_ENV ?? "development",
    },
  };

  // Config Plugin 적용: 개발 환경 HTTP 허용 (운영에서는 no-op)
  return withCleartextNetwork(mergedConfig);
};