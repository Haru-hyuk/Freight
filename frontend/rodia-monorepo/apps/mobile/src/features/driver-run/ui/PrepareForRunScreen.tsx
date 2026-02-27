import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";
import type { ActiveOrder } from "@/entities/order/model/active-order.store";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { useActiveOrder } from "@/entities/order/model/active-order.store";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/shared/theme/useAppTheme";

type Props = {
  order: ActiveOrder;
};

const CHECKLIST_ITEMS = [
  "차량 일상 점검 완료",
  "상차지 정보 및 연락처 확인",
  "운행 경로 재확인",
];

export function PrepareForRunScreen({ order }: Props) {
  const theme = useAppTheme();
  const { setActiveOrder } = useActiveOrder();
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const toggleCheck = (item: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(item)) {
        next.delete(item);
      } else {
        next.add(item);
      }
      return next;
    });
  };

  const allChecked = checkedItems.size === CHECKLIST_ITEMS.length;

  const handleStartDriving = () => {
    if (!allChecked) return;
    // In a real app, this would also call an API to update the status.
    const drivingOrder = { ...order, status: "DRIVING" as const };
    setActiveOrder(drivingOrder);
  };

  return (
    <PageScaffold title="운행 준비">
      <View style={{ padding: 16 }}>
        <View style={{ marginBottom: 24 }}>
          <AppText weight="bold" style={{ fontSize: 18, marginBottom: 8 }}>
            {order.originAddress}
          </AppText>
          <AppText>
            운행을 시작하기 전, 아래 항목들을 확인해주세요.
          </AppText>
        </View>

        <View style={{ gap: 16, marginBottom: 32 }}>
          {CHECKLIST_ITEMS.map((item) => (
            <Pressable
              key={item}
              onPress={() => toggleCheck(item)}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 8 }}
            >
              <Ionicons
                name={checkedItems.has(item) ? "checkbox" : "square-outline"}
                size={24}
                color={checkedItems.has(item) ? theme.colors.brandPrimary : theme.colors.textSub}
              />
              <AppText style={{ fontSize: 16 }}>{item}</AppText>
            </Pressable>
          ))}
        </View>

        <AppButton
          title="운행 시작"
          onPress={handleStartDriving}
          disabled={!allChecked}
        />
      </View>
    </PageScaffold>
  );
}
