import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import type { VerificationResult } from "@/entities/verification/types";
import { useAuth } from "@/features/auth/model/useAuth";
import { useVerificationRequest } from "@/features/verification/model/useVerificationRequest";
import { OcrScanner } from "@/features/verification/ui/OcrScanner";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

const useStyles = createThemedStyles((t) =>
  StyleSheet.create({
    content: {
      paddingTop: t.layout.spacing.base * 2,
      paddingBottom: t.layout.spacing.base * 18,
      gap: t.layout.spacing.base * 3,
    },
    card: {
      padding: t.components.card.paddingMd,
      borderRadius: t.components.card.radius,
      gap: t.layout.spacing.base * 2,
    },
    bulletGroup: {
      gap: t.layout.spacing.base,
    },
    resultRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: t.layout.spacing.base * 2,
    },
    actions: {
      gap: t.layout.spacing.base * 2,
    },
  })
);

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

export function ShipperVerificationPage() {
  const router = useRouter();
  const auth = useAuth();
  const theme = useAppTheme();
  const s = useStyles();
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);

  const verification = useVerificationRequest();

  const canSubmit = useMemo(() => !!result && !verification.isLoading, [result, verification.isLoading]);

  const handleScanned = useCallback(
    (next: VerificationResult) => {
      setResult(next);
      setScannerError(null);
      verification.reset();
    },
    [verification]
  );

  const handleScannerError = useCallback((message: string) => {
    const safeMessage = (message ?? "").trim();
    setScannerError(safeMessage || "문서 이미지를 가져오지 못했습니다.");
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!result || verification.isLoading) return;

    const response = await verification.submitRequest({
      role: "shipper",
      documents: [result],
    });

    if (!response) return;

    await auth.completeVerification();
  }, [auth, result, verification]);

  return (
    <PageScaffold title="화주 인증" backgroundColor={theme.colors.bgSurfaceAlt} contentStyle={s.content}>
      <AppCard outlined style={s.card}>
        <AppText variant="heading" weight="800" color="textMain">
          사업자등록증 인증 안내
        </AppText>
        <AppText variant="detail" color="textSub">
          안전한 배차를 위해 사업자등록증 인증이 필요합니다. 문서를 스캔한 뒤 인증 요청을 진행해 주세요.
        </AppText>
        <View style={s.bulletGroup}>
          <AppText variant="detail" color="textSub">
            - 등록번호와 상호가 모두 보이게 촬영해 주세요.
          </AppText>
          <AppText variant="detail" color="textSub">
            - 현재 OCR은 목업 결과를 반환합니다.
          </AppText>
        </View>
      </AppCard>

      <OcrScanner
        documentType="shipper_business_registration"
        onScanned={handleScanned}
        onError={handleScannerError}
      />

      <AppCard outlined style={s.card}>
        <AppText variant="heading" weight="800" color="textMain">
          스캔 결과 요약
        </AppText>

        {result ? (
          <>
            <View style={s.resultRow}>
              <AppText variant="detail" color="textSub">
                스캔 시각
              </AppText>
              <AppText variant="detail" weight="700" color="textMain">
                {formatDateTime(result.scannedAt)}
              </AppText>
            </View>
            {(result?.fields ?? []).map((field) => (
              <View key={`${field.label}:${field.value}`} style={s.resultRow}>
                <AppText variant="detail" color="textSub">
                  {field.label}
                </AppText>
                <AppText variant="detail" weight="700" color="textMain">
                  {field.value}
                </AppText>
              </View>
            ))}
            <View style={s.resultRow}>
              <AppText variant="detail" color="textSub">
                OCR 신뢰도
              </AppText>
              <AppText variant="detail" weight="700" color="brandPrimary">
                {Math.round((result?.confidence ?? 0) * 100)}%
              </AppText>
            </View>
          </>
        ) : (
          <AppText variant="detail" color="textSub">
            아직 스캔된 문서가 없습니다.
          </AppText>
        )}
      </AppCard>

      <AppCard outlined style={s.card}>
        <View style={s.actions}>
          <AppButton
            title={verification.isLoading ? "요청 처리 중..." : "인증 요청"}
            size="lg"
            loading={verification.isLoading}
            disabled={!canSubmit}
            onPress={handleSubmit}
          />

          {verification.status === "approved" ? (
            <AppText variant="detail" color={theme.colors.semanticSuccess}>
              인증 요청이 접수되었습니다. 요청번호: {verification.response?.requestId ?? "-"}
            </AppText>
          ) : null}

          {verification.status === "rejected" ? (
            <AppText variant="detail" color={theme.colors.semanticDanger}>
              {verification.errorMessage ?? "인증 요청에 실패했습니다."}
            </AppText>
          ) : null}

          {scannerError ? (
            <AppText variant="detail" color={theme.colors.semanticWarning}>
              {scannerError}
            </AppText>
          ) : null}

          {verification.status === "approved" ? (
            <AppButton title="홈으로 이동" variant="secondary" size="lg" onPress={() => router.replace("/(shipper)/home")} />
          ) : null}
        </View>
      </AppCard>
    </PageScaffold>
  );
}

export default ShipperVerificationPage;

