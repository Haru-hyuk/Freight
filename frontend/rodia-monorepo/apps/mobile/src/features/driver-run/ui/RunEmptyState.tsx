import React from "react";
import { useRouter } from "expo-router";
import { AppEmptyState } from "@/shared/ui/kit/AppEmptyState";
import { AppButton } from "@/shared/ui/kit/AppButton";

export function RunEmptyState() {
  const router = useRouter();

  const goToOrders = () => {
    router.push("/(driver)/quotes");
  };

  return (
    <AppEmptyState
      title="운행 정보 없음"
      message="현재 운행 중인 오더가 없습니다."
    >
      <AppButton
        title="오더 보러가기"
        onPress={goToOrders}
        style={{ marginTop: 24, minWidth: 180 }}
      />
    </AppEmptyState>
  );
}
