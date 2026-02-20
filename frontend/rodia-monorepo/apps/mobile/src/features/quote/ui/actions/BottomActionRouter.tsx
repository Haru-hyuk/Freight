import React from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { DecisionActionId, QuoteActionPolicy } from "@/features/quote/model/quoteActionMatrix";
import type { QuoteActionsContext } from "@/features/quote/model/useQuoteDetail";
import { safeNumber } from "@/shared/theme/colorUtils";
import { createThemedStyles } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";

type BottomActionRouterProps = {
  ctx: QuoteActionsContext;
  bottomBar: QuoteActionPolicy["bottomBar"];
  guards?: QuoteActionPolicy["guards"];
};

const ACTION_LABEL: Record<DecisionActionId, string> = {
  acceptOffer: "제안 수락",
  rejectOffer: "제안 거절",
  pay: "결제하기",
  cancelRequest: "요청 취소",
  reRequestRoute: "같은 경로 재요청",
};

const CONFIRM_MESSAGE: Record<DecisionActionId, string> = {
  acceptOffer: "이 제안을 수락하시겠습니까?",
  rejectOffer: "이 제안을 거절하시겠습니까?",
  pay: "결제를 진행하시겠습니까?",
  cancelRequest: "요청을 취소하시겠습니까?",
  reRequestRoute: "같은 경로로 다시 요청하시겠습니까?",
};

const useStyles = createThemedStyles((theme) => {
  const c = theme.colors;
  const spacing = safeNumber(theme.layout.spacing.base, 4);

  return StyleSheet.create({
    bottomBar: {
      backgroundColor: c.bgSurface,
      borderTopWidth: 1,
      borderTopColor: c.borderDefault,
      paddingHorizontal: spacing * 5,
      paddingTop: spacing * 3,
      flexDirection: "row",
      gap: spacing * 2,
    },
    flex1: {
      flex: 1,
    },
  });
});

function resolveVariant(action: DecisionActionId, role: "primary" | "secondary") {
  if (action === "rejectOffer" || action === "cancelRequest") {
    return "destructive" as const;
  }
  if (role === "secondary") {
    return "secondary" as const;
  }
  return "primary" as const;
}

function resolveTitle(action: DecisionActionId, ctx: QuoteActionsContext, hasCompanionButton: boolean) {
  if (action !== "pay") return ACTION_LABEL[action];

  if (hasCompanionButton) return ACTION_LABEL[action];
  const amount = Number.isFinite(ctx.finalPrice) ? ctx.finalPrice : 0;
  return `${amount.toLocaleString("ko-KR")}원 결제하기`;
}

export function BottomActionRouter({ ctx, bottomBar, guards }: BottomActionRouterProps) {
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const paddingBottom = Math.max(safeNumber(insets.bottom, 0) + 12, 18);

  const primaryAction = bottomBar?.primary;
  const secondaryAction = bottomBar?.secondary;
  const hasCompanionButton = Boolean(primaryAction && secondaryAction);

  if (!primaryAction && !secondaryAction) {
    return null;
  }

  const runAction = (action: DecisionActionId) => {
    if (action === "acceptOffer") {
      Alert.alert("제안 수락", `${ctx.quoteId}번 견적을 수락했습니다.`);
      return;
    }

    if (action === "rejectOffer") {
      Alert.alert("제안 거절", `${ctx.quoteId}번 견적을 거절했습니다.`);
      return;
    }

    if (action === "pay") {
      const amount = Number.isFinite(ctx.finalPrice) ? ctx.finalPrice : 0;
      Alert.alert("결제 진행", `${amount.toLocaleString("ko-KR")}원 결제를 진행합니다.`);
      return;
    }

    if (action === "cancelRequest") {
      Alert.alert("요청 취소", `${ctx.quoteId}번 요청을 취소했습니다.`);
      return;
    }

    Alert.alert("재요청", "같은 경로로 재요청 화면으로 이동합니다.");
    router.push("/(shipper)/quotes/create");
  };

  const requestAction = (action: DecisionActionId, needConfirm: boolean) => {
    if (!needConfirm) {
      runAction(action);
      return;
    }

    Alert.alert("확인", CONFIRM_MESSAGE[action], [
      { text: "취소", style: "cancel" },
      { text: "확인", onPress: () => runAction(action) },
    ]);
  };

  return (
    <View style={[styles.bottomBar, { paddingBottom }]}>
      {secondaryAction ? (
        <AppButton
          title={resolveTitle(secondaryAction, ctx, hasCompanionButton)}
          variant={resolveVariant(secondaryAction, "secondary")}
          style={styles.flex1}
          onPress={() => requestAction(secondaryAction, guards?.confirmSecondary === true)}
        />
      ) : null}

      {primaryAction ? (
        <AppButton
          title={resolveTitle(primaryAction, ctx, hasCompanionButton)}
          variant={resolveVariant(primaryAction, "primary")}
          style={styles.flex1}
          onPress={() => requestAction(primaryAction, guards?.confirmPrimary === true)}
        />
      ) : null}
    </View>
  );
}

export default BottomActionRouter;