import React from "react";
import { Linking, Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import WebView from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/shared/ui/kit/AppText";

const DEFAULT_REDIRECT_ORIGIN = "https://example.com";

export type TossPaymentRequest = {
  clientKey: string;
  orderId: string;
  orderName: string;
  amount: number;

  /**
   * TossPayments requestPayment()는 successUrl/failUrl이 "결제창을 호출한 페이지의 origin"과 같아야 정상 동작하는 케이스가 있습니다.
   * (WebView source baseUrl과 같은 origin으로 맞추기 위한 값)
   */
  redirectOrigin?: string;
};

type TossPaymentSuccessPayload = {
  paymentKey: string;
  orderId: string;
  amount: number;
};

type TossPaymentFailPayload = {
  code?: string;
  message?: string;
};

type Props = {
  visible: boolean;
  request: TossPaymentRequest | null;
  onClose: () => void;
  onSuccess: (payload: TossPaymentSuccessPayload) => void;
  onFail: (payload: TossPaymentFailPayload) => void;
};

function escapeJsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\r?\n/g, " ");
}

function normalizeOrigin(origin: string): string {
  const trimmed = (origin || "").trim();
  return trimmed.replace(/\/+$/, "");
}

function isLikelyExternalScheme(url: string): boolean {
  return (
    !!url &&
    !url.startsWith("https://") &&
    !url.startsWith("http://") &&
    !url.startsWith("about:") &&
    !url.startsWith("file:") &&
    !url.startsWith("data:")
  );
}

function parseIntentFallbackUrl(intentUrl: string): { fallbackUrl?: string; marketUrl?: string } {
  // intent://...#Intent;...;S.browser_fallback_url=...;package=...;end
  const fallbackMatch = intentUrl.match(/S\.browser_fallback_url=([^;]+)/);
  const pkgMatch = intentUrl.match(/package=([^;]+)/);

  const fallbackUrl = fallbackMatch?.[1] ? decodeURIComponent(fallbackMatch[1]) : undefined;
  const pkg = pkgMatch?.[1] ? pkgMatch[1] : undefined;
  const marketUrl = pkg ? `market://details?id=${pkg}` : undefined;

  return { fallbackUrl, marketUrl };
}

export function TossPaymentModal({ visible, request, onClose, onSuccess, onFail }: Props) {
  const redirectOrigin = React.useMemo(() => {
    return normalizeOrigin(request?.redirectOrigin || DEFAULT_REDIRECT_ORIGIN) || DEFAULT_REDIRECT_ORIGIN;
  }, [request?.redirectOrigin]);

  const successPrefix = React.useMemo(() => `${redirectOrigin}/freight/toss/success`, [redirectOrigin]);
  const failPrefix = React.useMemo(() => `${redirectOrigin}/freight/toss/fail`, [redirectOrigin]);

  const html = React.useMemo(() => {
    if (!request) return "";

    const clientKey = escapeJsText(request.clientKey);
    const orderId = escapeJsText(request.orderId);
    const orderName = escapeJsText(request.orderName || "Freight payment");
    const amount = Number.isFinite(request.amount) ? Math.max(100, Math.trunc(request.amount)) : 100;

    return `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
        <script src="https://js.tosspayments.com/v1/payment"></script>
        <style>
          body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; color: #111; }
          .wrap { padding: 20px; }
          .title { font-size: 18px; font-weight: 700; margin-bottom: 8px; }
          .desc { font-size: 14px; color: #555; margin-bottom: 16px; }
          .btn { width: 100%; border: 0; border-radius: 10px; padding: 14px; background: #0064ff; color: #fff; font-size: 16px; font-weight: 700; }
          .log { margin-top: 14px; font-size: 12px; color: #666; white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="title">토스 테스트 결제</div>
          <div class="desc">아래 버튼을 눌러 결제를 진행하세요.</div>
          <button id="payButton" class="btn">결제 진행</button>
          <div id="log" class="log">initialized</div>
        </div>
        <script>
          (function run() {
            // TossPayments는 redirect(successUrl/failUrl)가 "현재 페이지 origin"과 같아야 정상 동작하는 케이스가 있습니다.
            // WebView baseUrl을 redirectOrigin으로 맞추고, 여기서는 window.location.origin을 사용합니다.
            var origin = window.location.origin;
            var successUrl = origin + "/freight/toss/success";
            var failUrl = origin + "/freight/toss/fail";

            var logEl = document.getElementById("log");
            function setLog(msg) {
              if (logEl) logEl.innerText = msg;
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: "LOG", message: msg }));
            }

            window.open = function(url) {
              if (url) window.location.href = String(url);
              return null;
            };

            var button = document.getElementById("payButton");
            if (!button) {
              setLog("payButton not found");
              return;
            }

            button.addEventListener("click", function() {
              try {
                if (typeof TossPayments !== "function") {
                  throw new Error("TossPayments sdk not loaded");
                }
                setLog("requestPayment start");
                var tossPayments = TossPayments('${clientKey}');
                var result = tossPayments.requestPayment('카드', {
                  amount: ${amount},
                  orderId: '${orderId}',
                  orderName: '${orderName}',
                  successUrl: successUrl,
                  failUrl: failUrl
                });

                Promise.resolve(result)
                  .then(function() {
                    setLog("requestPayment resolved");
                  })
                  .catch(function(e) {
                    var msg = e && e.message ? e.message : "requestPayment rejected";
                    setLog("reject: " + msg);
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: "SCRIPT_ERROR",
                      message: msg
                    }));
                  });
              } catch (e) {
                var msg = e && e.message ? e.message : 'Toss SDK error';
                setLog("error: " + msg);
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'SCRIPT_ERROR',
                  message: msg
                }));
              }
            });

            setLog("ready");
          })();
        </script>
      </body>
      </html>
    `;
  }, [request]);

  const openExternal = React.useCallback(
    (url: string) => {
      if (!url) return;

      Linking.openURL(url).catch(() => {
        if (url.startsWith("intent:")) {
          const { fallbackUrl, marketUrl } = parseIntentFallbackUrl(url);
          if (fallbackUrl) {
            Linking.openURL(fallbackUrl).catch(() => onFail({ message: "결제 앱을 열 수 없습니다." }));
            return;
          }
          if (marketUrl) {
            Linking.openURL(marketUrl).catch(() => onFail({ message: "결제 앱을 열 수 없습니다." }));
            return;
          }
        }

        onFail({ message: "결제 앱을 열 수 없습니다." });
      });
    },
    [onFail]
  );

  const handleShouldStartLoadWithRequest = React.useCallback(
    (url: string) => {
      if (!url) return false;

      // 외부 결제앱/인증앱 호출 (간헐적으로 '결제창이 안 뜸'처럼 보이는 주요 케이스)
      if (isLikelyExternalScheme(url)) {
        openExternal(url);
        return false;
      }

      if (Platform.OS === "android" && url.startsWith("https://play.google.com/store/")) {
        openExternal(url);
        return false;
      }

      if (url.startsWith(successPrefix)) {
        const parsed = new URL(url);
        const paymentKey = parsed.searchParams.get("paymentKey") || "";
        const orderId = parsed.searchParams.get("orderId") || "";
        const amount = Number(parsed.searchParams.get("amount") || "0");
        onSuccess({ paymentKey, orderId, amount: Number.isFinite(amount) ? amount : 0 });
        return false;
      }

      if (url.startsWith(failPrefix)) {
        const parsed = new URL(url);
        onFail({
          code: parsed.searchParams.get("code") || undefined,
          message: parsed.searchParams.get("message") || undefined,
        });
        return false;
      }

      return true;
    },
    [failPrefix, onFail, onSuccess, openExternal, successPrefix]
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <AppText style={styles.title}>결제 진행</AppText>
          <Pressable onPress={onClose} hitSlop={15} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color="#333" />
          </Pressable>
        </View>

        {request ? (
          <WebView
            originWhitelist={["*"]}
            source={{ html, baseUrl: `${redirectOrigin}/` }}
            javaScriptEnabled
            javaScriptCanOpenWindowsAutomatically
            setSupportMultipleWindows={false}
            domStorageEnabled
            mixedContentMode="always"
            onShouldStartLoadWithRequest={(navState) => handleShouldStartLoadWithRequest(navState.url)}
            onMessage={(event) => {
              try {
                const payload = JSON.parse(event.nativeEvent.data) as { type?: string; message?: string };
                if (payload?.type === "LOG") return;
                if (payload?.type === "SCRIPT_ERROR") {
                  onFail({ message: payload.message || "결제창 초기화에 실패했습니다." });
                }
              } catch {
                onFail({ message: "결제창 초기화에 실패했습니다." });
              }
            }}
            onError={() => onFail({ message: "결제창 로드에 실패했습니다." })}
            onHttpError={(event) => onFail({ message: `결제창 HTTP 오류(${event.nativeEvent.statusCode})가 발생했습니다.` })}
            style={styles.webview}
          />
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
    position: "relative",
  },
  title: { fontSize: 18, fontWeight: "700" },
  closeBtn: {
    position: "absolute",
    right: 16,
    height: "100%",
    justifyContent: "center",
  },
  webview: { flex: 1, backgroundColor: "#fff" },
});