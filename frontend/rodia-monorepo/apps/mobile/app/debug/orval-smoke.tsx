import React from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { listMyShipperMatches } from "@/features/matching/api";
import { getShipperQuoteDetailByIdentifier, listShipperQuotes } from "@/features/quote/api";
import { debugLogStore, type DebugLogGroup } from "@/shared/lib/debug/debugLogStore";
import { tokenStorage } from "@/shared/lib/storage/tokenStorage";
import { useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppInput } from "@/shared/ui/kit/AppInput";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

function normalizeRouteParam(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw.trim() : "";
}

function maskFirst6(token: string): string {
  const v = token.trim();
  if (!v) return "(empty)";
  const count = Math.min(6, v.length);
  const masked = "*".repeat(count);
  return v.length > 6 ? `${masked}...` : masked;
}

function isAuthorizationPresent(group: DebugLogGroup | undefined): boolean {
  const request = (group?.requestEntry?.request ?? {}) as { headers?: Record<string, unknown> };
  const headers = request.headers ?? {};
  const direct = headers.Authorization ?? headers.authorization;
  if (typeof direct === "string") return direct.trim().length > 0;

  const authKey = Object.keys(headers).find((k) => k.toLowerCase() === "authorization");
  if (!authKey) return false;
  const value = headers[authKey];
  if (typeof value === "string") return value.trim().length > 0;
  return value !== undefined && value !== null;
}

function findLatestQuoteDetailGroup(): DebugLogGroup | undefined {
  const groups = debugLogStore.getGroupSnapshot();
  return groups.find((group) => {
    if (group.tag !== "QUOTE") return false;
    const path = String(group.path ?? "");
    return path.includes("/api/shipper/quotes/");
  });
}

function findLatestMatchesMeGroup(): DebugLogGroup | undefined {
  const groups = debugLogStore.getGroupSnapshot();
  return groups.find((group) => {
    const path = String(group.path ?? "");
    return path.includes("/api/shipper/matches/me");
  });
}

function toMaskedText(input: unknown): string {
  const raw = String(input ?? "").trim();
  if (!raw) return "-";
  if (raw.length <= 8) return `${raw.slice(0, 2)}***`;
  return `${raw.slice(0, 4)}***${raw.slice(-2)}`;
}

function buildClaimsPreview(group: DebugLogGroup | undefined): string {
  const request = (group?.requestEntry?.request ?? {}) as { headers?: Record<string, unknown> };
  const headers = request.headers ?? {};
  const claims = (headers.AuthorizationClaims ?? headers.authorizationClaims) as Record<string, unknown> | undefined;
  if (!claims || typeof claims !== "object") return "present: false";

  const role = String(claims.role ?? "-");
  const expIso = String(claims.expIso ?? "-");
  const sub = toMaskedText(claims.sub);
  return `present: true | role: ${role} | sub: ${sub} | expIso: ${expIso}`;
}

async function pickQuotePublicIdFromList(): Promise<string> {
  const list = await listShipperQuotes();
  const safeList = Array.isArray(list) ? list : [];
  const first = safeList.find((item) => String(item?.quotePublicId ?? "").trim().length > 0);
  return String(first?.quotePublicId ?? "").trim();
}

export default function OrvalSmokeDebugRoute() {
  const router = useRouter();
  const theme = useAppTheme();
  const params = useLocalSearchParams<{ id?: string | string[] }>();

  const [isCallingQuote, setIsCallingQuote] = React.useState(false);
  const [isCallingMatch, setIsCallingMatch] = React.useState(false);
  const [tokenState, setTokenState] = React.useState("present: false");
  const [identifierInput, setIdentifierInput] = React.useState(() => normalizeRouteParam(params?.id));
  const [callState, setCallState] = React.useState("No quote detail call yet.");
  const [requestPath, setRequestPath] = React.useState("-");
  const [requestStatus, setRequestStatus] = React.useState("-");
  const [authorizationPresent, setAuthorizationPresent] = React.useState(false);
  const [matchesCallState, setMatchesCallState] = React.useState("No matches/me call yet.");
  const [matchesPath, setMatchesPath] = React.useState("-");
  const [matchesStatus, setMatchesStatus] = React.useState("-");
  const [matchesAuthPresent, setMatchesAuthPresent] = React.useState(false);
  const [matchesClaimsPreview, setMatchesClaimsPreview] = React.useState("present: false");

  const onShowToken = React.useCallback(async () => {
    try {
      const token = String((await tokenStorage.getAccessToken()) ?? "").trim();
      const present = token.length > 0;
      const length = token.length;
      const preview = present ? maskFirst6(token) : "(empty)";
      setTokenState(`present: ${present} | length: ${length} | first6Masked: ${preview}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setTokenState(`present: false | error: ${message}`);
    }
  }, []);

  const onCallQuoteDetail = React.useCallback(async () => {
    if (isCallingQuote) return;
    setIsCallingQuote(true);

    try {
      let targetIdentifier = String(identifierInput ?? "").trim();
      if (!targetIdentifier) {
        targetIdentifier = await pickQuotePublicIdFromList();
        if (targetIdentifier) setIdentifierInput(targetIdentifier);
      }

      if (!targetIdentifier) {
        setCallState("identifier missing: quotePublicId not found");
        return;
      }

      const detail = await getShipperQuoteDetailByIdentifier(targetIdentifier);
      const safeQuoteId = Number(detail?.quoteId ?? 0);
      setCallState(`quote detail success (identifier=${targetIdentifier}, quoteId=${Number.isFinite(safeQuoteId) ? safeQuoteId : 0})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setCallState(`quote detail failed: ${message}`);
    } finally {
      const latest = findLatestQuoteDetailGroup();
      setRequestPath(String(latest?.path ?? "-"));
      setRequestStatus(String(latest?.status ?? "-"));
      setAuthorizationPresent(isAuthorizationPresent(latest));
      setIsCallingQuote(false);
    }
  }, [identifierInput, isCallingQuote]);

  const onCallMatchesMe = React.useCallback(async () => {
    if (isCallingMatch) return;
    setIsCallingMatch(true);
    setMatchesCallState("Calling /api/shipper/matches/me ...");

    try {
      const list = await listMyShipperMatches();
      const count = Array.isArray(list) ? list.length : 0;
      setMatchesCallState(`matches/me success (count=${count})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setMatchesCallState(`matches/me failed: ${message}`);
    } finally {
      const latest = findLatestMatchesMeGroup();
      setMatchesPath(String(latest?.path ?? "-"));
      setMatchesStatus(String(latest?.status ?? "-"));
      setMatchesAuthPresent(isAuthorizationPresent(latest));
      setMatchesClaimsPreview(buildClaimsPreview(latest));
      setIsCallingMatch(false);
    }
  }, [isCallingMatch]);

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
            <AppText weight="700">2) Quote detail + auth header check</AppText>
            <AppInput
              label="quoteIdentifier"
              placeholder="quotePublicId (UUID)"
              value={identifierInput}
              onChangeText={setIdentifierInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <AppButton title="Call quote detail (identifier)" onPress={onCallQuoteDetail} loading={isCallingQuote} />
            <AppText>{callState}</AppText>
            <AppText>{`lastRequest.path: ${requestPath}`}</AppText>
            <AppText>{`lastRequest.status: ${requestStatus}`}</AppText>
            <AppText>{`Authorization present: ${authorizationPresent}`}</AppText>
          </View>
        </AppCard>

        <AppCard outlined>
          <View style={styles.cardInner}>
            <AppText weight="700">3) Matches/me + claims check</AppText>
            <AppButton title="Call matches/me" onPress={onCallMatchesMe} loading={isCallingMatch} />
            <AppText>{matchesCallState}</AppText>
            <AppText>{`lastRequest.path: ${matchesPath}`}</AppText>
            <AppText>{`lastRequest.status: ${matchesStatus}`}</AppText>
            <AppText>{`Authorization present: ${matchesAuthPresent}`}</AppText>
            <AppText>{`AuthorizationClaims: ${matchesClaimsPreview}`}</AppText>
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
