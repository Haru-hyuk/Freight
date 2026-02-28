import React, { useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { useActiveOrder } from "@/entities/order/model/active-order.store";
import { AppSpinner } from "@/shared/ui/kit/AppSpinner";

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default function DriverDriveRoute() {
  const router = useRouter();
  const { activeOrder } = useActiveOrder();
  const lastNavigateTargetRef = useRef<string | null>(null);
  const targetPath = useMemo(() => (activeOrder ? "/(driver)/run" : "/(driver)/quotes"), [activeOrder]);
  const loadingLabel = activeOrder ? "운행 화면으로 이동 중입니다." : "오더 화면으로 이동 중입니다.";

  useEffect(() => {
    if (lastNavigateTargetRef.current === targetPath) return;
    lastNavigateTargetRef.current = targetPath;
    router.replace(targetPath);
  }, [router, targetPath]);

  return (
    <View style={styles.root}>
      <AppSpinner label={loadingLabel} />
    </View>
  );
}
