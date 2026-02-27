import React from "react";
import { View } from "react-native";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";
import type { ActiveOrder } from "@/entities/order/model/active-order.store";
import { useActiveOrder } from "@/entities/order/model/active-order.store";
import { AppButton } from "@/shared/ui/kit/AppButton";

type Props = {
  order: ActiveOrder;
};

export function RunActiveDetails({ order }: Props) {
  const { clearActiveOrder } = useActiveOrder();

  const handleViewRunList = () => {
    clearActiveOrder();
  };

  return (
    <PageScaffold title="운행정보">
      <View style={{ padding: 16, flex: 1, justifyContent: "space-between" }}>
        <View>
          <AppText>현재 활성화된 오더 ID: {order.quoteId}</AppText>
          <AppText>추후 이곳에 상세 운행 정보가 표시됩니다.</AppText>
        </View>
        <AppButton title="운행 목록 보기" onPress={handleViewRunList} />
      </View>
    </PageScaffold>
  );
}
