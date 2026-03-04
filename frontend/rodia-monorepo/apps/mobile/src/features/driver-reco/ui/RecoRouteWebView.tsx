import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, StyleSheet, View } from "react-native";
import WebView from "react-native-webview";

import { safeNumber, safeString } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppText } from "@/shared/ui/kit/AppText";

type RecoRouteWebViewProps = {
  /** Must be a non-null URL — caller is responsible for not rendering when unavailable. */
  url: string;
  /** Shows ActivityIndicator overlay while true. */
  loading: boolean;
};

const MAP_HEIGHT = 240;

const useStyles = createThemedStyles((theme) => {
  const cBorder = safeString(theme?.colors?.borderDefault, "#E2E8F0");
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  return StyleSheet.create({
    frame: {
      height: MAP_HEIGHT,
      borderRadius: 10,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: cBorder,
      backgroundColor: theme.colors.bgSurface,
    },
    webView: {
      flex: 1,
      backgroundColor: theme.colors.bgSurface,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.bgSurface,
      gap: spacing,
    },
    externalLink: {
      color: theme.colors.brandPrimary,
      textDecorationLine: "underline" as const,
    },
  });
});

export function RecoRouteWebView({ url, loading }: RecoRouteWebViewProps) {
  const theme = useAppTheme();
  const styles = useStyles();
  const [webViewFailed, setWebViewFailed] = useState(false);

  useEffect(() => {
    setWebViewFailed(false);
  }, [url]);

  const handleWebViewError = useCallback(() => {
    setWebViewFailed(true);
  }, []);

  const handleOpenExternal = useCallback(() => {
    Linking.openURL(url).catch(() => {});
  }, [url]);

  return (
    <View style={styles.frame}>
      {webViewFailed ? (
        <View style={styles.overlay}>
          <AppText variant="caption" color="textMuted">
            지도를 표시할 수 없습니다.
          </AppText>
          <AppText variant="caption" style={styles.externalLink} onPress={handleOpenExternal}>
            외부에서 열기
          </AppText>
        </View>
      ) : (
        <WebView source={{ uri: url }} style={styles.webView} onError={handleWebViewError} />
      )}

      {loading ? (
        <View style={styles.overlay}>
          <ActivityIndicator color={theme.colors.brandPrimary} />
        </View>
      ) : null}
    </View>
  );
}

export default RecoRouteWebView;
