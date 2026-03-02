import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import type { AppTheme } from "@/shared/theme/types";
import { useAppTheme } from "@/shared/theme/useAppTheme";
import { PageScaffold } from "@/widgets/layout/PageScaffold";
import { listDriverTrucks, type DriverTruck } from "@/features/driver-profile/api/driver-profile-api";

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
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.bgCard,
      padding: 14,
      gap: 8,
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
    value: {
      color: theme.colors.textMain,
      fontSize: 14,
      fontWeight: "700",
    },
  });
}

function toApprovedText(v: boolean | undefined) {
  if (v === true) return "승인완료";
  if (v === false) return "심사중";
  return "-";
}

export default function DriverTruckStatusPage() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [trucks, setTrucks] = useState<DriverTruck[] | null>(null);

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

  return (
    <PageScaffold
      title="차량 승인 상태"
      backgroundColor={theme.colors.bgMain}
      contentStyle={styles.content}
      onPressBack={() => router.back()}
      backLabel="설정"
    >
      <View style={styles.card}>
        <Text style={styles.title}>내 차량 목록</Text>
        <Text style={styles.muted}>승인 상태는 서버(/api/driver/trucks) 기준으로 표시됩니다.</Text>
      </View>

      <ScrollView contentContainerStyle={{ gap: 10 }}>
        {(trucks ?? []).length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.muted}>조회된 차량이 없습니다.</Text>
          </View>
        ) : (
          (trucks ?? []).map((t, idx) => (
            <View key={`truck-${idx}`} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.title}>{`차량 ${idx + 1}`}</Text>
                <Text style={styles.value}>{toApprovedText(t.approved)}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </PageScaffold>
  );
}
