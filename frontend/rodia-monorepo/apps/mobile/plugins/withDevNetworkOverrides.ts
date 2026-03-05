/**
 * Expo Config Plugin: withDevNetworkOverrides
 *
 * 개발/스테이징 환경에서 HTTP(평문) 로컬 서버 접속을 허용한다.
 * - Android: AndroidManifest.xml에 android:usesCleartextTraffic="true" 주입
 * - iOS: Info.plist에 NSAppTransportSecurity.NSAllowsArbitraryLoads=true 주입
 *
 * 적용 조건: APP_ENV !== "production"
 *   - 프로덕션 빌드 시 반드시 APP_ENV=production 환경변수를 설정할 것.
 *   - 이 플러그인은 idempotent(중복 실행 시 동일 결과).
 *
 * ⚠️ Dev Client 재빌드 필수:
 *   이 설정은 네이티브 AndroidManifest/Info.plist를 수정하므로,
 *   OTA 업데이트로는 적용되지 않는다.
 *   `expo run:android` 또는 `eas build --profile development`로 재빌드해야 한다.
 *   Expo Go에는 적용되지 않는다.
 */
import { withAndroidManifest, withInfoPlist, type ConfigPlugin } from "@expo/config-plugins";

const withDevNetworkOverrides: ConfigPlugin = (config) => {
  if (process.env.APP_ENV === "production") {
    // production 빌드에서는 cleartext/ATS 허용을 절대 추가하지 않는다.
    return config;
  }

  // Android: AndroidManifest.xml에 usesCleartextTraffic 주입
  config = withAndroidManifest(config, (androidConfig) => {
    const app = androidConfig.modResults.manifest.application;
    if (Array.isArray(app) && app.length > 0 && app[0].$) {
      app[0].$["android:usesCleartextTraffic"] = "true";
    }
    return androidConfig;
  });

  // iOS: Info.plist에 ATS 예외 주입
  config = withInfoPlist(config, (iosConfig) => {
    iosConfig.modResults.NSAppTransportSecurity = {
      ...((iosConfig.modResults.NSAppTransportSecurity as Record<string, unknown>) ?? {}),
      NSAllowsArbitraryLoads: true,
    };
    return iosConfig;
  });

  return config;
};

export default withDevNetworkOverrides;
