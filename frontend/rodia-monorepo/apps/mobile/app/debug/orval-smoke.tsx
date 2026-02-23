import React from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { listShipperQuotes } from "@/features/quote/api/quote-api";
import { debugLogStore, type DebugLogGroup } from "@/shared/lib/debug/debugLogStore";
import { tokenStorage } from "@/shared/lib/storage/tokenStorage";
import { useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

function maskToken(token: string): string {
  const v = (token ?? "").trim();
  if (!v) return "(empty)";
  if (v.length <= 12) return `${v.slice(0, 2)}...${v.slice(-2)}`;
  return `${v.slice(0, 6)}...${v.slice(-4)}`;
}

function extractAuthorizationInfo(group: DebugLogGroup | undefined): {
  exists: boolean;
  valuePreview: string;
} {
  const request = (group?.requestEntry?.request ?? {}) as {
    headers?: Record<string, unknown>;
  };
  const headers = request.headers ?? {};
  const direct = headers.Authorization ?? headers.authorization;
  if (typeof direct === "string" && direct.trim()) {
    return { exists: true, valuePreview: direct };
  }

  const authKey = Object.keys(headers).find((k) => k.toLowerCase() === "authorization");
  if (!authKey) return { exists: false, valuePreview: "(none)" };

  const value = headers[authKey];
  if (typeof value === "string" && value.trim()) {
    return { exists: true, valuePreview: value };
  }
  return { exists: true, valuePreview: "[present-non-string]" };
}

function findLatestQuoteGroup(): DebugLogGroup | undefined {
  const groups = debugLogStore.getGroupSnapshot();
  return groups.find((group) => {
    if (group.tag !== "QUOTE") return false;
    const path = String(group.path ?? "");
    return path.includes("/api/shipper/quotes");
  });
}

export default function OrvalSmokeDebugRoute() {
  const router = useRouter();
  const theme = useAppTheme();

  const [isCalling, setIsCalling] = React.useState(false);
  const [tokenState, setTokenState] = React.useState("Not checked yet.");
  const [callState, setCallState] = React.useState("No request yet.");
  const [authState, setAuthState] = React.useState("Authorization not checked.");

  const onShowToken = React.useCallback(async () => {
    try {
      const token = (await tokenStorage.getAccessToken()) ?? "";
      const trimmed = token.trim();
      if (!trimmed) {
        setTokenState("accessToken: missing");
        return;
      }
      setTokenState(`accessToken: exists (len=${trimmed.length}, preview=${maskToken(trimmed)})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setTokenState(`accessToken read failed: ${message}`);
    }
  }, []);

  const onCallQuotes = React.useCallback(async () => {
    if (isCalling) return;
    setIsCalling(true);
    setCallState("Calling /api/shipper/quotes ...");

    try {
      const list = await listShipperQuotes();
      setCallState(`quotes list success (count=${Array.isArray(list) ? list.length : 0})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setCallState(`quotes list failed: ${message}`);
    } finally {
      const latest = findLatestQuoteGroup();
      const auth = extractAuthorizationInfo(latest);
      const statusText = typeof latest?.status === "number" ? String(latest.status) : String(latest?.status ?? "-");
      setAuthState(
        [
          `Authorization: ${auth.exists ? "present" : "missing"}`,
          `headerValue: ${auth.valuePreview}`,
          `path: ${latest?.path ?? "-"}`,
          `status: ${statusText}`,
          `requestId: ${latest?.requestId ?? "-"}`,
        ].join("\n")
      );
      setIsCalling(false);
    }
  }, [isCalling]);

  return (
    <PageScaffold title="Orval Smoke" onPressBack={() => router.back()} backLabel="Back" backgroundColor={theme.colors.bgMain}>
      <View style={styles.wrap}>
        <AppCard outlined>
          <View style={styles.cardInner}>
            <AppText weight="700">1) Token check</AppText>
            <AppButton title="Show token" onPress={onShowToken} />
            <AppText>{tokenState}</AppText>
          </View>
        </AppCard>

        <AppCard outlined>
          <View style={styles.cardInner}>
            <AppText weight="700">2) Quotes + Authorization check</AppText>
            <AppButton title="Call quotes list" onPress={onCallQuotes} loading={isCalling} />
            <AppText>{callState}</AppText>
            <AppText>{authState}</AppText>
          </View>
        </AppCard>
      </View>
    </PageScaffold>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
    paddingTop: 8,
    paddingBottom: 40,
  },
  cardInner: {
    gap: 10,
    padding: 12,
  },
});
