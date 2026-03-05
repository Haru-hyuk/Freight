import React from "react";
import { StyleSheet, View } from "react-native";

import { formatDateTime } from "@/shared/lib/format/display";
import { safeNumber } from "@/shared/theme/colorUtils";
import { createThemedStyles } from "@/shared/theme/useAppTheme";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppText } from "@/shared/ui/kit/AppText";

type DriverVehicleInfoProps = {
  title?: string;
  driverId?: number | null;
  truckId?: number | null;
  vehicleType?: string | null;
  vehicleBodyType?: string | null;
  vehicleNumber?: string | null;
  transportDateTime?: string | null;
};

function toVehicleTypeLabel(value: string | null | undefined): string {
  const token = String(value ?? "").trim().toUpperCase();
  if (token === "TON_1") return "1톤";
  if (token === "TON_2_5") return "2.5톤";
  if (token === "TON_5") return "5톤";
  return String(value ?? "").trim() || "-";
}

function toVehicleBodyTypeLabel(value: string | null | undefined): string {
  const token = String(value ?? "").trim().toUpperCase();
  if (token === "CARGO") return "카고";
  if (token === "WING_BODY") return "윙바디";
  if (token === "TOP_CAR") return "탑차";
  return String(value ?? "").trim() || "-";
}

function toDisplayId(value: number | null | undefined): string {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? `#${value}` : "-";
}

function toDisplayVehicleType(value: string | null | undefined, body: string | null | undefined): string {
  const ton = toVehicleTypeLabel(value);
  const carBody = toVehicleBodyTypeLabel(body);
  if (ton === "-" && carBody === "-") return "-";
  if (ton === "-") return carBody;
  if (carBody === "-") return ton;
  return `${ton} · ${carBody}`;
}

const useStyles = createThemedStyles((theme) => {
  const s = safeNumber(theme.layout.spacing.base, 4);
  return StyleSheet.create({
    section: { gap: s * 2 },
    title: {
      color: theme.colors.textMain,
      fontSize: safeNumber(theme.typography.scale.detail.size, 14),
      lineHeight: safeNumber(theme.typography.scale.detail.lineHeight, 20),
      fontWeight: "900",
    },
    card: {
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      backgroundColor: theme.colors.bgSurface,
      padding: s * 3,
      gap: s * 1.5,
    },
    row: {
      minHeight: 24,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: s * 2,
    },
    label: {
      color: theme.colors.textMuted,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
    },
    value: {
      color: theme.colors.textMain,
      fontSize: safeNumber(theme.typography.scale.detail.size, 14),
      lineHeight: safeNumber(theme.typography.scale.detail.lineHeight, 20),
      fontWeight: "800",
      textAlign: "right",
      flexShrink: 1,
    },
  });
});

export function DriverVehicleInfo({
  title = "기사/차량 정보",
  driverId,
  truckId,
  vehicleType,
  vehicleBodyType,
  vehicleNumber,
  transportDateTime,
}: DriverVehicleInfoProps) {
  const styles = useStyles();

  const driverIdText = toDisplayId(driverId);
  const truckIdText = toDisplayId(truckId);
  const vehicleText = toDisplayVehicleType(vehicleType, vehicleBodyType);
  const vehicleNumberText = String(vehicleNumber ?? "").trim() || "-";
  const transportDateText = transportDateTime ? formatDateTime(transportDateTime, "-") : "-";

  type Row = { label: string; value: string };
  const rows: Row[] = [
    driverIdText !== "-" ? { label: "담당 기사", value: driverIdText } : null,
    truckIdText !== "-" ? { label: "차량 식별", value: truckIdText } : null,
    vehicleText !== "-" ? { label: "차량 유형", value: vehicleText } : null,
    vehicleNumberText !== "-" ? { label: "차량 번호", value: vehicleNumberText } : null,
    transportDateText !== "-" ? { label: "운송 일자", value: transportDateText } : null,
  ].filter((r): r is Row => r !== null);

  if (rows.length === 0) return null;

  return (
    <View style={styles.section}>
      <AppText style={styles.title}>{title}</AppText>
      <AppCard elevated={false} style={styles.card}>
        {rows.map((row) => (
          <View key={row.label} style={styles.row}>
            <AppText style={styles.label}>{row.label}</AppText>
            <AppText style={styles.value}>{row.value}</AppText>
          </View>
        ))}
      </AppCard>
    </View>
  );
}
