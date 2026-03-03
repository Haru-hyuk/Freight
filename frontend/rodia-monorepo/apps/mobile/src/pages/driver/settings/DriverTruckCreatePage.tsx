import React, { useMemo, useState } from "react";
import { Alert, Image, Modal, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import type { AppTheme } from "@/shared/theme/types";
import { useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppInput } from "@/shared/ui/kit/AppInput";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";
import {
  createDriverTruck,
  listTruckSpecCatalog,
  type TruckSpecReference,
} from "@/features/driver-profile/api/driver-profile-api";

const TONNAGE_OPTIONS = ["1톤", "1.4톤", "2.5톤", "3.5톤", "5톤", "11톤"] as const;
const VEHICLE_TYPE_OPTIONS = [
  { key: "DAMAS", label: "다마스", image: require("../../../../assets/driver/trucks/DAMAS.png") },
  { key: "LABO", label: "라보", image: require("../../../../assets/driver/trucks/LABO.png") },
  { key: "CARGO", label: "카고", image: require("../../../../assets/driver/trucks/CARGO.png") },
  { key: "WING_BODY", label: "윙바디", image: require("../../../../assets/driver/trucks/WINGBODY.png") },
  { key: "TOP_CAR", label: "탑차", image: require("../../../../assets/driver/trucks/TOP.png") },
] as const;
const TONNAGE_TOKEN_BY_LABEL: Readonly<Record<string, string>> = {
  "1톤": "TON_1",
  "1.4톤": "TON_1_4",
  "2.5톤": "TON_2_5",
  "3.5톤": "TON_3_5",
  "5톤": "TON_5",
  "11톤": "TON_11",
};
const TONNAGE_VALUE_BY_LABEL: Readonly<Record<string, number>> = {
  "1톤": 1,
  "1.4톤": 1.4,
  "2.5톤": 2.5,
  "3.5톤": 3.5,
  "5톤": 5,
  "11톤": 11,
};

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toUpperToken(value: unknown): string {
  return toText(value).toUpperCase();
}

function toFiniteNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function findBestTruckSpec(
  specs: TruckSpecReference[],
  vehicleTypeToken: string,
  vehicleBodyTypeToken: string,
  tonnageValue?: number
): TruckSpecReference | null {
  const byType = specs.filter((s) => toUpperToken(s.vehicleType) === vehicleTypeToken);
  if (!byType.length) return null;

  const byBody = byType.filter((s) => toUpperToken(s.vehicleBodyType) === vehicleBodyTypeToken);
  const scoped = byBody.length ? byBody : byType;
  if (!scoped.length) return null;
  if (typeof tonnageValue !== "number" || !Number.isFinite(tonnageValue) || tonnageValue <= 0) return scoped[0] ?? null;

  let best: TruckSpecReference | null = null;
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const item of scoped) {
    const specTonnage = toFiniteNumber(item.tonnage);
    if (specTonnage <= 0) continue;
    const diff = Math.abs(specTonnage - tonnageValue);
    if (diff < bestDiff) {
      best = item;
      bestDiff = diff;
    }
  }
  return best ?? scoped[0] ?? null;
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 32,
      backgroundColor: theme.colors.bgMain,
      gap: 12,
    },
    card: {
      padding: 14,
      gap: 14,
    },
    sectionLabel: {
      color: theme.colors.textSub,
      fontSize: 13,
      fontWeight: "800",
      marginBottom: 2,
    },
    optionWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    optionCard: {
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      borderRadius: 12,
      width: "31.5%",
      minHeight: 118,
      padding: 10,
      backgroundColor: theme.colors.bgSurface,
      alignItems: "center",
      justifyContent: "space-between",
    },
    optionCardActive: {
      borderColor: theme.colors.brandPrimary,
      backgroundColor: theme.colors.stateOverlayPressed,
    },
    optionImageWrap: {
      width: "100%",
      aspectRatio: 1.6,
      borderRadius: 8,
      overflow: "hidden",
      backgroundColor: theme.colors.bgSurfaceAlt,
      justifyContent: "center",
      alignItems: "center",
    },
    optionImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },
    optionText: {
      color: theme.colors.textMain,
      fontSize: 13,
      fontWeight: "700",
      marginTop: 8,
    },
    optionTextActive: {
      color: theme.colors.brandPrimary,
    },
    actionRow: {
      marginTop: 4,
      gap: 8,
    },
    dropdownTrigger: {
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      borderRadius: 10,
      minHeight: 44,
      paddingHorizontal: 12,
      justifyContent: "center",
      backgroundColor: theme.colors.bgSurface,
    },
    dropdownTriggerText: {
      color: theme.colors.textMain,
      fontSize: 14,
      fontWeight: "700",
    },
    dropdownPlaceholder: {
      color: theme.colors.textMuted,
      fontSize: 14,
      fontWeight: "600",
    },
    truckNumberShell: {
      minHeight: 56,
      borderRadius: 12,
      paddingHorizontal: 14,
    },
    truckNumberInput: {
      fontSize: 17,
      fontWeight: "800",
      letterSpacing: 0.2,
      paddingVertical: 12,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.35)",
      justifyContent: "center",
      paddingHorizontal: 20,
    },
    modalCard: {
      borderRadius: 12,
      backgroundColor: theme.colors.bgSurface,
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      overflow: "hidden",
    },
    modalItem: {
      minHeight: 46,
      justifyContent: "center",
      paddingHorizontal: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderDefault,
    },
    modalItemText: {
      color: theme.colors.textMain,
      fontSize: 14,
      fontWeight: "700",
    },
  });
}

export default function DriverTruckCreatePage() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [truckNumber, setTruckNumber] = useState("");
  const [vehicleType, setVehicleType] = useState<string>("");
  const [tonnage, setTonnage] = useState<string>("");
  const [insurance, setInsurance] = useState("");
  const [specCatalog, setSpecCatalog] = useState<TruckSpecReference[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [tonnageModalOpen, setTonnageModalOpen] = useState(false);
  const requiresTonnage = vehicleType !== "DAMAS" && vehicleType !== "LABO";

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setIsCatalogLoading(true);
        const specs = await listTruckSpecCatalog();
        if (mounted) setSpecCatalog(specs);
      } catch {
        if (mounted) setSpecCatalog([]);
      } finally {
        if (mounted) setIsCatalogLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const resolvedVehicleTypeToken = React.useMemo(() => {
    if (!vehicleType) return "";
    if (vehicleType === "DAMAS" || vehicleType === "LABO") return vehicleType;
    return TONNAGE_TOKEN_BY_LABEL[tonnage] ?? "";
  }, [tonnage, vehicleType]);
  const resolvedVehicleBodyTypeToken = React.useMemo(() => {
    if (vehicleType === "DAMAS" || vehicleType === "LABO") {
      const fromSpec = findBestTruckSpec(specCatalog, vehicleType, "", 0);
      return toUpperToken(fromSpec?.vehicleBodyType) || "CARGO";
    }
    return toUpperToken(vehicleType);
  }, [specCatalog, vehicleType]);
  const resolvedTonnageValue = React.useMemo(() => {
    if (vehicleType === "DAMAS") return 0.5;
    if (vehicleType === "LABO") return 1;
    return TONNAGE_VALUE_BY_LABEL[tonnage] ?? 0;
  }, [tonnage, vehicleType]);
  const resolvedSpec = React.useMemo(
    () =>
      findBestTruckSpec(
        specCatalog,
        toUpperToken(resolvedVehicleTypeToken),
        toUpperToken(resolvedVehicleBodyTypeToken),
        resolvedTonnageValue
      ),
    [resolvedTonnageValue, resolvedVehicleBodyTypeToken, resolvedVehicleTypeToken, specCatalog]
  );
  const resolvedMaxWeight = React.useMemo(() => {
    const weight = toFiniteNumber(resolvedSpec?.maxWeight);
    return weight > 0 ? weight : 0;
  }, [resolvedSpec?.maxWeight]);
  const resolvedMaxWeightDisplay = React.useMemo(() => {
    if (toText(resolvedSpec?.maxWeightDisplay)) return toText(resolvedSpec?.maxWeightDisplay);
    if (resolvedMaxWeight > 0) return `${resolvedMaxWeight.toLocaleString("ko-KR")}kg`;
    return "-";
  }, [resolvedMaxWeight, resolvedSpec?.maxWeightDisplay]);

  const isFormValid =
    truckNumber.trim().length > 0 &&
    vehicleType.length > 0 &&
    (!requiresTonnage || tonnage.length > 0) &&
    insurance.trim().length > 0 &&
    resolvedMaxWeight > 0 &&
    resolvedVehicleTypeToken.length > 0;

  const onSubmit = async () => {
    if (!isFormValid) {
      Alert.alert("입력 확인", "차량번호/차량종류/보험정보를 입력하고, 해당되는 경우 톤수를 선택해 주세요.");
      return;
    }
    try {
      setIsSubmitting(true);
      await createDriverTruck({
        vehicleType: resolvedVehicleTypeToken,
        vehicleBodyType: resolvedVehicleBodyTypeToken,
        tonnage: resolvedTonnageValue,
        maxWeight: resolvedMaxWeight,
        name: truckNumber,
        insurance,
        approved: false,
      });
      Alert.alert("차량 등록", "차량이 등록되었습니다.");
      router.back();
    } catch (error) {
      const message = toText((error as { response?: { data?: { message?: unknown; error?: unknown } } })?.response?.data?.message)
        || toText((error as { response?: { data?: { message?: unknown; error?: unknown } } })?.response?.data?.error)
        || "차량 등록에 실패했습니다.";
      Alert.alert("등록 실패", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageScaffold
      title="차량 등록"
      backgroundColor={theme.colors.bgMain}
      contentStyle={styles.content}
      onPressBack={() => router.back()}
      backLabel="차량 관리"
    >
      <AppCard outlined elevated={false} style={styles.card}>
        <AppInput
          label="차량번호"
          placeholder="예: 12가3456"
          value={truckNumber}
          onChangeText={setTruckNumber}
          maxLength={20}
          autoCapitalize="characters"
          shellStyle={styles.truckNumberShell}
          inputStyle={styles.truckNumberInput}
        />

        <View>
          <AppText style={styles.sectionLabel}>차량 종류</AppText>
          <View style={styles.optionWrap}>
            {VEHICLE_TYPE_OPTIONS.map((item) => {
              const active = vehicleType === item.key;
              return (
                <Pressable
                  key={item.key}
                  style={[styles.optionCard, active && styles.optionCardActive]}
                  onPress={() => {
                    setVehicleType(item.key);
                    if (item.key === "DAMAS" || item.key === "LABO") setTonnage("");
                  }}
                >
                  <View style={styles.optionImageWrap}>
                    <Image source={item.image} style={styles.optionImage} />
                  </View>
                  <AppText style={[styles.optionText, active && styles.optionTextActive]}>{item.label}</AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {requiresTonnage ? (
          <View>
            <AppText style={styles.sectionLabel}>톤수</AppText>
            <Pressable style={styles.dropdownTrigger} onPress={() => setTonnageModalOpen(true)}>
              <AppText style={tonnage ? styles.dropdownTriggerText : styles.dropdownPlaceholder}>
                {tonnage || "톤수를 선택해 주세요"}
              </AppText>
            </Pressable>
          </View>
        ) : null}

        <AppInput
          label="보험 정보"
          placeholder="예: 삼성화재 / 2026-12-31 만료"
          value={insurance}
          onChangeText={setInsurance}
          maxLength={60}
        />

      </AppCard>

      <View style={styles.actionRow}>
        <AppButton title="등록하기" variant="primary" onPress={() => void onSubmit()} disabled={!isFormValid || isSubmitting} loading={isSubmitting} />
        <AppButton title="취소" variant="secondary" onPress={() => router.back()} disabled={isSubmitting} />
      </View>

      <Modal transparent visible={tonnageModalOpen} animationType="fade" onRequestClose={() => setTonnageModalOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setTonnageModalOpen(false)}>
          <View style={styles.modalCard}>
            {TONNAGE_OPTIONS.map((item, index) => (
              <Pressable
                key={item}
                style={[styles.modalItem, index === TONNAGE_OPTIONS.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => {
                  setTonnage(item);
                  setTonnageModalOpen(false);
                }}
              >
                <AppText style={styles.modalItemText}>{item}</AppText>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </PageScaffold>
  );
}
