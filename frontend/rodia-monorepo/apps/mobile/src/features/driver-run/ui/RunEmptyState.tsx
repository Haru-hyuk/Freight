import React from "react";
import { useRouter } from "expo-router";
import { AppEmptyState } from "@/shared/ui/kit/AppEmptyState";

export function RunEmptyState() {
  const router = useRouter();

  const goToOrders = () => {
    router.push("/(driver)/quotes");
  };

  return (
    <AppEmptyState
      title="운행 정보 없음"
      description="현재 운행 중인 오더가 없습니다."
      action={{ label: "오더 보러가기", onPress: goToOrders }}
    />
  );
}