import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import type { VerificationDocumentType, VerificationResult } from "@/entities/verification/types";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppText } from "@/shared/ui/kit/AppText";

declare const require: ((name: string) => unknown) | undefined;

type PickerPermissionResponse = {
  granted?: boolean;
};

type PickerAsset = {
  uri?: string | null;
  fileName?: string | null;
};

type PickerResult = {
  canceled?: boolean;
  assets?: PickerAsset[];
};

type ImagePickerModule = {
  MediaTypeOptions?: {
    Images?: unknown;
  };
  requestMediaLibraryPermissionsAsync?: () => Promise<PickerPermissionResponse>;
  launchImageLibraryAsync?: (options: Record<string, unknown>) => Promise<PickerResult>;
};

type OcrScannerProps = {
  documentType: VerificationDocumentType;
  onScanned: (result: VerificationResult) => void;
  onError?: (message: string) => void;
};

const DOCUMENT_LABELS: Record<VerificationDocumentType, string> = {
  shipper_business_registration: "사업자등록증",
  driver_cargo_license: "화물운송종사자격증",
  driver_vehicle_registration: "차량등록증",
};

const useStyles = createThemedStyles((t) =>
  StyleSheet.create({
    card: {
      padding: t.components.card.paddingMd,
      borderRadius: t.components.card.radius,
      gap: t.layout.spacing.base * 2,
    },
    actionRow: {
      flexDirection: "row",
      gap: t.layout.spacing.base * 2,
    },
    actionButton: {
      flex: 1,
    },
    resultBox: {
      borderWidth: 1,
      borderColor: t.colors.borderDefault,
      borderRadius: t.layout.radii.control,
      backgroundColor: t.colors.bgSurfaceAlt,
      paddingHorizontal: t.layout.spacing.base * 3,
      paddingVertical: t.layout.spacing.base * 2,
      gap: t.layout.spacing.base,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: t.layout.spacing.base * 2,
    },
  })
);

function loadImagePickerModule(): ImagePickerModule | null {
  if (typeof require !== "function") return null;

  try {
    return require("expo-image-picker") as ImagePickerModule;
  } catch {
    return null;
  }
}

function readFileName(uri: string) {
  const raw = (uri ?? "").trim();
  if (!raw) return "unknown.jpg";

  const part = raw.split("/").pop() ?? "unknown.jpg";
  try {
    return decodeURIComponent(part);
  } catch {
    return part;
  }
}

function toSeed(input: string) {
  const text = (input ?? "").trim() || "seed";
  return Array.from(text).reduce((acc, char, idx) => {
    return acc + char.charCodeAt(0) * (idx + 1);
  }, 0);
}

function formatWithHyphen(value: string, chunks: number[]) {
  const digits = value.replace(/\D/g, "");
  let cursor = 0;
  const parts: string[] = [];

  chunks.forEach((size) => {
    const next = digits.slice(cursor, cursor + size);
    if (next) parts.push(next);
    cursor += size;
  });

  if (cursor < digits.length) {
    parts.push(digits.slice(cursor));
  }

  return parts.join("-");
}

function buildFields(documentType: VerificationDocumentType, serial: string, fileName: string) {
  if (documentType === "shipper_business_registration") {
    return [
      { label: "문서종류", value: "사업자등록증" },
      { label: "사업자번호", value: formatWithHyphen(serial, [3, 2, 5]) },
      { label: "상호", value: "Rodia Logistics" },
      { label: "파일", value: fileName },
    ];
  }

  if (documentType === "driver_cargo_license") {
    return [
      { label: "문서종류", value: "화물운송종사자격증" },
      { label: "자격번호", value: `DRV-${serial.slice(0, 6)}` },
      { label: "성명", value: "홍길동" },
      { label: "파일", value: fileName },
    ];
  }

  return [
    { label: "문서종류", value: "차량등록증" },
    { label: "차량번호", value: `${serial.slice(0, 2)}가${serial.slice(2, 6)}` },
    { label: "차종", value: "5톤 윙바디" },
    { label: "파일", value: fileName },
  ];
}

function buildDummyResult(documentType: VerificationDocumentType, imageUri: string): VerificationResult {
  const scannedAt = new Date().toISOString();
  const fileName = readFileName(imageUri);
  const seed = toSeed(`${documentType}:${fileName}:${scannedAt}`);
  const digits = String(1_000_000_000 + (seed % 9_000_000_000));
  const confidence = Math.min(0.99, 0.88 + (seed % 10) * 0.01);

  return {
    documentType,
    imageUri,
    scannedAt,
    source: imageUri.startsWith("mock://") ? "mock" : "gallery",
    confidence,
    fields: buildFields(documentType, digits, fileName),
  };
}

function formatScannedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

export function OcrScanner({ documentType, onScanned, onError }: OcrScannerProps) {
  const theme = useAppTheme();
  const s = useStyles();
  const [isPicking, setIsPicking] = useState(false);
  const [lastResult, setLastResult] = useState<VerificationResult | null>(null);

  const label = useMemo(() => DOCUMENT_LABELS[documentType] ?? "인증 문서", [documentType]);

  const emitScannedResult = useCallback(
    (imageUri: string) => {
      const safeUri = (imageUri ?? "").trim();
      if (!safeUri) {
        onError?.("선택한 이미지 URI를 읽을 수 없습니다.");
        return;
      }

      const result = buildDummyResult(documentType, safeUri);
      setLastResult(result);
      onScanned(result);
    },
    [documentType, onError, onScanned]
  );

  const handlePickFromGallery = useCallback(async () => {
    if (isPicking) return;
    setIsPicking(true);

    try {
      const picker = loadImagePickerModule();

      if (!picker?.launchImageLibraryAsync || !picker?.requestMediaLibraryPermissionsAsync) {
        onError?.("expo-image-picker가 없어 목업 이미지로 대체합니다.");
        emitScannedResult(`mock://gallery/${documentType}/${Date.now()}.jpg`);
        return;
      }

      const permission = await picker.requestMediaLibraryPermissionsAsync();
      if (!permission?.granted) {
        onError?.("갤러리 접근 권한이 필요합니다.");
        return;
      }

      const result = await picker.launchImageLibraryAsync({
        mediaTypes: picker?.MediaTypeOptions?.Images,
        allowsEditing: false,
        quality: 0.9,
      });

      if (result?.canceled) return;

      const selectedUri = (result?.assets?.[0]?.uri ?? "").trim();
      if (!selectedUri) {
        onError?.("이미지를 선택하지 못했습니다.");
        return;
      }

      emitScannedResult(selectedUri);
    } catch {
      onError?.("이미지 선택 중 오류가 발생했습니다.");
    } finally {
      setIsPicking(false);
    }
  }, [documentType, emitScannedResult, isPicking, onError]);

  return (
    <AppCard outlined style={s.card}>
      <AppText variant="heading" weight="800" color="textMain">
        {label} 스캔
      </AppText>
      <AppText variant="detail" color="textSub">
        갤러리에서 문서 이미지를 선택하면 더미 OCR 결과를 생성합니다.
      </AppText>

      <View style={s.actionRow}>
        <AppButton
          title={isPicking ? "이미지 불러오는 중..." : "갤러리에서 선택"}
          size="md"
          disabled={isPicking}
          loading={isPicking}
          onPress={handlePickFromGallery}
          style={s.actionButton}
        />
      </View>

      {lastResult ? (
        <View style={s.resultBox}>
          <View style={s.row}>
            <AppText variant="caption" weight="700" color="textMain">
              최근 스캔
            </AppText>
            <AppText variant="caption" color="textSub">
              {formatScannedAt(lastResult.scannedAt)}
            </AppText>
          </View>

          {(lastResult?.fields ?? []).slice(0, 3).map((field) => (
            <View key={`${field.label}:${field.value}`} style={s.row}>
              <AppText variant="detail" color="textSub">
                {field.label}
              </AppText>
              <AppText variant="detail" weight="700" color="textMain">
                {field.value}
              </AppText>
            </View>
          ))}

          <View style={s.row}>
            <AppText variant="caption" color="textSub">
              OCR 신뢰도
            </AppText>
            <AppText variant="caption" weight="700" color={theme.colors.brandPrimary}>
              {Math.round((lastResult?.confidence ?? 0) * 100)}%
            </AppText>
          </View>
        </View>
      ) : null}
    </AppCard>
  );
}

export default OcrScanner;

