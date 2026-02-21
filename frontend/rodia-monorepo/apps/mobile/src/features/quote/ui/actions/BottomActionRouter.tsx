import React from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { DecisionActionId, QuoteActionPolicy } from "@/features/quote/model/quoteActionMatrix";
import type { QuoteActionsContext } from "@/features/quote/model/useQuoteDetail";
import { safeNumber, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppInput } from "@/shared/ui/kit/AppInput";
import { AppText } from "@/shared/ui/kit/AppText";

type CancelPayload = {
  quoteId: number;
  reason: string;
};

type BottomActionRouterProps = {
  ctx: QuoteActionsContext;
  bottomBar: QuoteActionPolicy["bottomBar"];
  guards?: QuoteActionPolicy["guards"];
  onCancelRequest?: (payload: CancelPayload) => void;
};

type ActionRole = "primary" | "secondary";
type NonCancelAction = Exclude<DecisionActionId, "cancelRequest">;

const ACTION_LABEL: Record<DecisionActionId, string> = {
  acceptOffer: "제안 수락",
  rejectOffer: "제안 거절",
  pay: "결제하기",
  cancelRequest: "요청 취소",
  reRequestRoute: "같은 경로 재요청",
};

const CONFIRM_MESSAGE: Record<NonCancelAction, string> = {
  acceptOffer: "이 제안을 수락하시겠습니까?",
  rejectOffer: "이 제안을 거절하시겠습니까?",
  pay: "결제를 진행하시겠습니까?",
  reRequestRoute: "같은 경로로 다시 요청하시겠습니까?",
};

const useStyles = createThemedStyles((theme) => {
  const c = theme.colors;
  const spacing = safeNumber(theme.layout.spacing.base, 4);

  return StyleSheet.create({
    bottomWrap: {
      backgroundColor: c.bgSurface,
      borderTopWidth: 1,
      borderTopColor: c.borderDefault,
      paddingHorizontal: spacing * 5,
      paddingTop: spacing * 3,
      gap: spacing * 2,
    },
    actionRow: {
      flexDirection: "row",
      gap: spacing * 2,
    },
    cancelButton: {
      minHeight: 44,
    },
    flex1: {
      flex: 1,
    },

    modalOverlay: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: spacing * 5,
      backgroundColor: tint(c.textMain, 0.5, c.textMain),
    },
    modalSheet: {
      width: "100%",
    },
    modalCard: {
      borderWidth: 1,
      borderColor: c.borderDefault,
      backgroundColor: c.bgSurface,
    },
    modalContent: {
      padding: spacing * 4,
      gap: spacing * 3,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing,
    },
    modalIcon: {
      color: c.semanticWarning,
      fontSize: 18,
    },
    modalTitle: {
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.heading.size, 18),
      lineHeight: safeNumber(theme.typography.scale.heading.lineHeight, 24),
      fontWeight: "900",
      letterSpacing: -0.3,
    },
    modalDesc: {
      color: c.textSub,
      fontSize: safeNumber(theme.typography.scale.detail.size, 14),
      lineHeight: safeNumber(theme.typography.scale.detail.lineHeight, 20),
      fontWeight: "600",
    },
    modalActions: {
      flexDirection: "row",
      gap: spacing * 2,
    },
  });
});

function resolveVariant(action: NonCancelAction, role: ActionRole) {
  if (action === "rejectOffer") {
    return "destructive" as const;
  }
  if (role === "secondary") {
    return "secondary" as const;
  }
  return "primary" as const;
}

function resolveTitle(action: NonCancelAction, ctx: QuoteActionsContext, hasCompanionButton: boolean) {
  if (action !== "pay") return ACTION_LABEL[action];

  if (hasCompanionButton) return ACTION_LABEL[action];
  const amount = Number.isFinite(ctx.finalPrice) ? ctx.finalPrice : 0;
  return `${amount.toLocaleString("ko-KR")}원 결제하기`;
}

function toOrderedActions(
  primaryAction?: DecisionActionId,
  secondaryAction?: DecisionActionId
): {
  nonCancelActions: Array<{ action: NonCancelAction; role: ActionRole }>;
  hasCancelAction: boolean;
} {
  const actions: Array<{ action: DecisionActionId; role: ActionRole }> = [];

  if (secondaryAction) actions.push({ action: secondaryAction, role: "secondary" });
  if (primaryAction) actions.push({ action: primaryAction, role: "primary" });

  return {
    nonCancelActions: actions
      .filter((item): item is { action: NonCancelAction; role: ActionRole } => item.action !== "cancelRequest")
      .map((item) => ({ action: item.action, role: item.role })),
    hasCancelAction: actions.some((item) => item.action === "cancelRequest"),
  };
}

export function BottomActionRouter({ ctx, bottomBar, guards, onCancelRequest }: BottomActionRouterProps) {
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const paddingBottom = Math.max(safeNumber(insets.bottom, 0) + 12, 18);

  const primaryAction = bottomBar?.primary;
  const secondaryAction = bottomBar?.secondary;

  const { nonCancelActions, hasCancelAction } = React.useMemo(
    () => toOrderedActions(primaryAction, secondaryAction),
    [primaryAction, secondaryAction]
  );
  const hasCompanionButton = nonCancelActions.length > 1;

  const [showCancelModal, setShowCancelModal] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState("");
  const [cancelReasonError, setCancelReasonError] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (!hasCancelAction) {
      setShowCancelModal(false);
      setCancelReason("");
      setCancelReasonError(undefined);
    }
  }, [hasCancelAction]);

  if (nonCancelActions.length === 0 && !hasCancelAction) {
    return null;
  }

  const runAction = (action: NonCancelAction) => {
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

    Alert.alert("재요청", "같은 경로로 재요청 화면으로 이동합니다.");
    router.push("/(shipper)/quotes/create");
  };

  const requestAction = (action: NonCancelAction, needConfirm: boolean) => {
    const execute = () => runAction(action);
    if (!needConfirm) {
      execute();
      return;
    }

    Alert.alert("확인", CONFIRM_MESSAGE[action], [
      { text: "취소", style: "cancel" },
      { text: "확인", onPress: execute },
    ]);
  };

  const closeCancelModal = () => {
    setShowCancelModal(false);
    setCancelReasonError(undefined);
  };

  const submitCancelRequest = () => {
    const trimmed = cancelReason.trim();
    if (trimmed.length < 2) {
      setCancelReasonError("취소 사유를 2자 이상 입력해주세요.");
      return;
    }

    onCancelRequest?.({
      quoteId: ctx.quoteId,
      reason: trimmed,
    });

    setShowCancelModal(false);
    setCancelReason("");
    setCancelReasonError(undefined);
    Alert.alert("요청 취소", "취소 요청이 처리되었습니다.");
  };

  return (
    <View style={[styles.bottomWrap, { paddingBottom }]}>
      {nonCancelActions.length > 0 ? (
        <View style={styles.actionRow}>
          {nonCancelActions.map((item) => (
            <AppButton
              key={`${item.role}-${item.action}`}
              title={resolveTitle(item.action, ctx, hasCompanionButton)}
              variant={resolveVariant(item.action, item.role)}
              style={styles.flex1}
              onPress={() =>
                requestAction(
                  item.action,
                  item.role === "primary" ? guards?.confirmPrimary === true : guards?.confirmSecondary === true
                )
              }
            />
          ))}
        </View>
      ) : null}

      {hasCancelAction ? (
        <AppButton title={ACTION_LABEL.cancelRequest} variant="destructive" style={styles.cancelButton} onPress={() => setShowCancelModal(true)} />
      ) : null}

      <Modal transparent visible={showCancelModal} animationType="fade" onRequestClose={closeCancelModal}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeCancelModal} />
          <View style={styles.modalSheet}>
            <AppCard outlined elevated={false} style={styles.modalCard}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Ionicons name="alert-circle-outline" style={styles.modalIcon} />
                  <AppText style={styles.modalTitle}>취소 사유 입력</AppText>
                </View>
                <AppText style={styles.modalDesc}>요청 취소 사유를 입력하면 즉시 취소 상태로 변경됩니다.</AppText>

                <AppInput
                  label="취소 사유"
                  placeholder="취소 사유를 입력해주세요"
                  value={cancelReason}
                  onChangeText={(text) => {
                    setCancelReason(text);
                    if (cancelReasonError) setCancelReasonError(undefined);
                  }}
                  error={cancelReasonError}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={200}
                />

                <View style={styles.modalActions}>
                  <AppButton title="닫기" variant="secondary" style={styles.flex1} onPress={closeCancelModal} />
                  <AppButton title="취소 확정" variant="destructive" style={styles.flex1} onPress={submitCancelRequest} />
                </View>
              </View>
            </AppCard>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

export default BottomActionRouter;
