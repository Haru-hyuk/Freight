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
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: t.layout.spacing.base * 2,
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

type ResultSummaryProps = {
  title: string;
  result: VerificationResult | null;
};

function ResultSummary({ title, result }: ResultSummaryProps) {
  const s = useStyles();

  if (!result) {
    return (
      <View style={s.statusRow}>
        <AppText variant="detail" color="textSub">
          {title}
        </AppText>
        <AppText variant="detail" weight="700" color="textSub">
          미완료
        </AppText>
      </View>
    );
  }

  return (
    <>
      <View style={s.statusRow}>
        <AppText variant="detail" color="textSub">
          {title}
        </AppText>
        <AppText variant="detail" weight="700" color="semanticSuccess">
          완료
        </AppText>
      </View>

      <View style={s.resultRow}>
        <AppText variant="caption" color="textSub">
          스캔 시각
        </AppText>
        <AppText variant="caption" color="textMain">
          {formatDateTime(result?.scannedAt ?? "")}
        </AppText>
      </View>

      {(result?.fields ?? []).slice(0, 2).map((field) => (
        <View key={`${title}:${field.label}:${field.value}`} style={s.resultRow}>
          <AppText variant="caption" color="textSub">
            {field.label}
          </AppText>
          <AppText variant="caption" weight="700" color="textMain">
            {field.value}
          </AppText>
        </View>
      ))}
    </>
  );
}

export function DriverVerificationPage() {
  const router = useRouter();
  const auth = useAuth();
  const theme = useAppTheme();
  const s = useStyles();
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [licenseResult, setLicenseResult] = useState<VerificationResult | null>(null);
  const [vehicleResult, setVehicleResult] = useState<VerificationResult | null>(null);

  const verification = useVerificationRequest();

  const canSubmit = useMemo(
    () => !!licenseResult && !!vehicleResult && !verification.isLoading,
    [licenseResult, vehicleResult, verification.isLoading]
  );

  const handleLicenseScanned = useCallback(
    (result: VerificationResult) => {
      setLicenseResult(result);
      setScannerError(null);
      verification.reset();
    },
    [verification]
  );

  const handleVehicleScanned = useCallback(
    (result: VerificationResult) => {
      setVehicleResult(result);
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
    if (!licenseResult || !vehicleResult || verification.isLoading) return;

    const response = await verification.submitRequest({
      role: "driver",
      documents: [licenseResult, vehicleResult],
    });

    if (!response) return;

    await auth.completeVerification();
  }, [auth, licenseResult, vehicleResult, verification]);

  return (
    <PageScaffold title="기사 인증" backgroundColor={theme.colors.bgSurfaceAlt} contentStyle={s.content}>
      <AppCard outlined style={s.card}>
        <AppText variant="heading" weight="800" color="textMain">
          기사 인증 안내
        </AppText>
        <AppText variant="detail" color="textSub">
          안전 운송을 위해 자격증과 차량등록증 인증이 필요합니다. 두 문서를 모두 스캔한 뒤 인증 요청을 진행해 주세요.
        </AppText>
        <View style={s.bulletGroup}>
          <AppText variant="detail" color="textSub">
            - 화물운송종사자격증
          </AppText>
          <AppText variant="detail" color="textSub">
            - 차량등록증
          </AppText>
        </View>
      </AppCard>

      <OcrScanner documentType="driver_cargo_license" onScanned={handleLicenseScanned} onError={handleScannerError} />

      <OcrScanner
        documentType="driver_vehicle_registration"
        onScanned={handleVehicleScanned}
        onError={handleScannerError}
      />

      <AppCard outlined style={s.card}>
        <AppText variant="heading" weight="800" color="textMain">
          문서별 스캔 상태
        </AppText>

        <ResultSummary title="화물운송종사자격증" result={licenseResult} />
        <ResultSummary title="차량등록증" result={vehicleResult} />
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
            <AppButton title="홈으로 이동" variant="secondary" size="lg" onPress={() => router.replace("/(driver)/home")} />
          ) : null}
        </View>
      </AppCard>
    </PageScaffold>
  );
}

export default DriverVerificationPage;

