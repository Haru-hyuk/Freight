import React from "react";
import { View } from "react-native";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";
import type { ActiveOrder } from "@/entities/order/model/active-order.store";

type Props = {
  order: ActiveOrder;
};

export function RunActiveDetails({ order }: Props) {
  return (
    <PageScaffold title="운행정보">
      <View style={{ padding: 16 }}>
        <AppText>현재 활성화된 오더 ID: {order.quoteId}</AppText>
        <AppText>추후 이곳에 상세 운행 정보가 표시됩니다.</AppText>
      </View>
    </PageScaffold>
  );
}
