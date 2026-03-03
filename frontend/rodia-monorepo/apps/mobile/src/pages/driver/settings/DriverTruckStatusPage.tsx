import React, { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

import type { AppTheme } from "@/shared/theme/types";
import { useAppTheme } from "@/shared/theme/useAppTheme";
import { PageScaffold } from "@/widgets/layout/PageScaffold";
import { listDriverTrucks, type DriverTruck } from "@/features/driver-profile/api/driver-profile-api";
import { AppButton } from "@/shared/ui/kit/AppButton";

const TRUCK_IMAGES = {
  DAMAS: require("../../../../assets/driver/trucks/DAMAS.png"),
  LABO: require("../../../../assets/driver/trucks/LABO.png"),
  CARGO: require("../../../../assets/driver/trucks/CARGO.png"),
  WING_BODY: require("../../../../assets/driver/trucks/WINGBODY.png"),
  TOP_CAR: require("../../../../assets/driver/trucks/TOP.png"),
} as const;

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 32,
      backgroundColor: theme.colors.bgMain,
      gap: 10,
    },
    card: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      backgroundColor: theme.colors.bgSurface,
      padding: 14,
      gap: 10,
    },
    title: {
      color: theme.colors.textMain,
      fontSize: 16,
      fontWeight: "800",
    },
    muted: {
      color: theme.colors.textMuted,
      fontSize: 13,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    rowLeft: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      flex: 1,
    },
    thumb: {
      width: 96,
      height: 96,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      backgroundColor: "#fff",
    },
    infoCol: {
      flex: 1,
      gap: 6,
    },
    vehicleMain: {
      color: theme.colors.textMain,
      fontSize: 18,
      fontWeight: "800",
      letterSpacing: -0.2,
    },
    vehicleSub: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontWeight: "600",
    },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderWidth: 1,
    },
    statusApproved: {
      backgroundColor: "#ecfdf5",
      borderColor: "#86efac",
    },
    statusPending: {
      backgroundColor: "#fffbeb",
      borderColor: "#fcd34d",
    },
    statusUnknown: {
      backgroundColor: "#f8fafc",
      borderColor: theme.colors.borderDefault,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    label: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontWeight: "600",
    },
    value: {
      color: theme.colors.textMain,
      fontSize: 14,
      fontWeight: "700",
    },
    valueStrong: {
      color: theme.colors.textMain,
      fontSize: 16,
      fontWeight: "800",
      letterSpacing: 0.2,
    },
    addButton: {
      marginTop: 6,
    },
  });
}

function toApprovedText(v: boolean | undefined) {
  if (v === true) return "승인완료";
  if (v === false) return "심사중";
  return "-";
}

function getStatusStyles(v: boolean | undefined) {
  if (v === true) {
    return { container: "statusApproved" as const, color: "#16a34a" };
  }
  if (v === false) {
    return { container: "statusPending" as const, color: "#d97706" };
  }
  return { container: "statusUnknown" as const, color: "#64748b" };
}

function toTruckImage(vehicleType?: string, vehicleBodyType?: string) {
  const body = String(vehicleBodyType ?? "").trim().toUpperCase();
  const type = String(vehicleType ?? "").trim().toUpperCase();

  if (body === "WING_BODY") return TRUCK_IMAGES.WING_BODY;
  if (body === "TOP_CAR") return TRUCK_IMAGES.TOP_CAR;
  if (type === "DAMAS") return TRUCK_IMAGES.DAMAS;
  if (type === "LABO") return TRUCK_IMAGES.LABO;
  return TRUCK_IMAGES.CARGO;
}

function toVehicleTypeText(v?: string) {
  const map: Record<string, string> = {
    DAMAS: "다마스",
    LABO: "라보",
    TON_1: "1톤",
    TON_1_4: "1.4톤",
    TON_2_5: "2.5톤",
    TON_3_5: "3.5톤",
    TON_5: "5톤",
    TON_8: "8톤",
    TON_11: "11톤",
    TON_18: "18톤",
    TON_25: "25톤",
    TON_25_PLUS: "25톤+",
  };
  const key = String(v ?? "").trim().toUpperCase();
  return map[key] ?? (v?.trim() || "-");
}

function toVehicleBodyTypeText(v?: string) {
  const map: Record<string, string> = {
    CARGO: "카고",
    WING_BODY: "윙바디",
    TOP_CAR: "탑차",
    REFRIGERATED_TOP: "냉장탑",
    REFRIGERATED_WING: "냉장윙",
    TANKER: "탱크로리",
    CONTAINER: "컨테이너",
    CAR_CARRIER: "카캐리어",
    DUMP: "덤프",
    ETC: "기타",
  };
  const key = String(v ?? "").trim().toUpperCase();
  return map[key] ?? (v?.trim() || "-");
}

function toTonnageText(v?: number) {
  if (typeof v !== "number" || !Number.isFinite(v)) return "-";
  return `${v}톤`;
}

export default function DriverTruckStatusPage() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [trucks, setTrucks] = useState<DriverTruck[] | null>(null);

  const loadTrucks = React.useCallback(async () => {
    try {
      const res = await listDriverTrucks();
      setTrucks(res);
    } catch {
      setTrucks([]);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await listDriverTrucks();
        if (mounted) setTrucks(res);
      } catch {
        if (mounted) setTrucks([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      void loadTrucks();
      return undefined;
    }, [loadTrucks])
  );

  return (
    <PageScaffold
      title="차량 정보 관리"
      backgroundColor={theme.colors.bgMain}
      contentStyle={styles.content}
      onPressBack={() => router.back()}
      backLabel="설정"
    >
      <View style={styles.card}>
        <Text style={styles.title}>내 차량 목록</Text>
        <Text style={styles.muted}>승인 상태는 서버(/api/driver/trucks) 기준으로 표시됩니다.</Text>
      </View>

      {(trucks ?? []).length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.muted}>조회된 차량이 없습니다.</Text>
        </View>
      ) : (
        (trucks ?? []).map((t, idx) => (
          <View key={`truck-${t.truckId ?? idx}`} style={styles.card}>
            <View style={styles.rowLeft}>
              <Image source={toTruckImage(t.vehicleType, t.vehicleBodyType)} style={styles.thumb} resizeMode="contain" />
              <View style={styles.infoCol}>
                <Text style={styles.vehicleMain}>{`${toTonnageText(t.tonnage)} ${toVehicleBodyTypeText(t.vehicleBodyType)}`}</Text>
                <Text style={styles.vehicleSub}>{toVehicleTypeText(t.vehicleType)}</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>차량번호</Text>
                  <Text style={styles.valueStrong}>{t.name?.trim() || "-"}</Text>
                </View>
                {(() => {
                  const statusStyle = getStatusStyles(t.approved);
                  return (
                    <View style={[styles.statusBadge, styles[statusStyle.container]]}>
                      <Text style={[styles.value, { color: statusStyle.color }]}>{toApprovedText(t.approved)}</Text>
                    </View>
                  );
                })()}
              </View>
            </View>
          </View>
        ))
      )}

      <AppButton
        title="차량 추가하기"
        variant="primary"
        style={styles.addButton}
        onPress={() => router.push("/(driver)/settings/truck-create" as never)}
      />
    </PageScaffold>
  );
}
