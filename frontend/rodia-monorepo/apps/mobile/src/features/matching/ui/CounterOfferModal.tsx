import React, { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { safeNumber, safeString, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppInput } from "@/shared/ui/kit/AppInput";
import { AppText } from "@/shared/ui/kit/AppText";

type CounterOfferModalProps = {
  visible: boolean;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (amount: number) => void | Promise<void>;
};

function parseAmount(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.trunc(parsed);
}

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const cTextMain = safeString(theme?.colors?.textMain, "#111827");
  const cTextMuted = safeString(theme?.colors?.textMuted, "#64748B");
  const cSurface = safeString(theme?.colors?.bgSurface, "#FFFFFF");
  const cBorder = safeString(theme?.colors?.borderDefault, "#E2E8F0");
  const cOverlay = tint("#000000", 0.44, "#000000");
  const cDanger = safeString(theme?.colors?.semanticDanger, "#EF4444");

  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: cOverlay,
      justifyContent: "flex-end",
    },
    keyboardWrap: {
      width: "100%",
    },
    sheet: {
      borderTopLeftRadius: safeNumber(theme?.layout?.radii?.card, 18),
      borderTopRightRadius: safeNumber(theme?.layout?.radii?.card, 18),
      backgroundColor: cSurface,
      borderTopWidth: 1,
      borderColor: tint(cBorder, 0.8, cBorder),
      paddingHorizontal: spacing * 5,
      paddingTop: spacing * 5,
      paddingBottom: spacing * 6,
      gap: spacing * 3,
    },
    title: {
      color: cTextMain,
      fontSize: safeNumber(theme?.typography?.scale?.heading?.size, 18) + 2,
      lineHeight: safeNumber(theme?.typography?.scale?.heading?.lineHeight, 26) + 2,
      fontWeight: "900",
    },
    subtitle: {
      color: cTextMuted,
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14) + 1,
      lineHeight: safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20) + 2,
      fontWeight: "700",
      marginTop: 2,
    },
    input: {
      minHeight: 56,
    },
    helper: {
      color: cTextMuted,
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12) + 1,
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16) + 2,
      fontWeight: "700",
    },
    error: {
      color: cDanger,
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12) + 1,
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16) + 2,
      fontWeight: "800",
    },
    actions: {
      flexDirection: "row",
      gap: spacing * 2,
    },
    actionButton: {
      flex: 1,
      minHeight: 56,
    },
  });
});

export function CounterOfferModal({
  visible,
  isSubmitting = false,
  errorMessage,
  onClose,
  onSubmit,
}: CounterOfferModalProps) {
  const theme = useAppTheme();
  const styles = useStyles();
  const [amountInput, setAmountInput] = useState("");
  const [localErrorMessage, setLocalErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setAmountInput("");
      setLocalErrorMessage(null);
    }
  }, [visible]);

  const mergedErrorMessage = useMemo(() => {
    const localText = typeof localErrorMessage === "string" ? localErrorMessage.trim() : "";
    if (localText) return localText;
    const externalText = typeof errorMessage === "string" ? errorMessage.trim() : "";
    return externalText || null;
  }, [errorMessage, localErrorMessage]);

  const submit = () => {
    if (isSubmitting) return;
    const amount = parseAmount(amountInput);
    if (amount <= 0) {
      setLocalErrorMessage("희망 운임을 입력해 주세요.");
      return;
    }

    setLocalErrorMessage(null);
    void onSubmit(amount);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={isSubmitting ? undefined : onClose}>
        <KeyboardAvoidingView
          style={styles.keyboardWrap}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View>
              <AppText style={styles.title}>운임 제안하기</AppText>
              <AppText style={styles.subtitle}>희망 금액을 입력하면 화주에게 즉시 전달됩니다.</AppText>
            </View>

            <AppInput
              label="희망 운임"
              value={amountInput}
              onChangeText={(text) => {
                setAmountInput(text.replace(/[^0-9]/g, ""));
                setLocalErrorMessage(null);
              }}
              placeholder="예) 180000"
              keyboardType="number-pad"
              editable={!isSubmitting}
              shellStyle={styles.input}
              inputStyle={{
                fontSize: safeNumber(theme?.typography?.scale?.title?.size, 22),
                fontWeight: "900",
              }}
            />
            <AppText style={styles.helper}>숫자만 입력됩니다.</AppText>
            {mergedErrorMessage ? <AppText style={styles.error}>{mergedErrorMessage}</AppText> : null}

            <View style={styles.actions}>
              <AppButton
                title="닫기"
                variant="secondary"
                style={styles.actionButton}
                disabled={isSubmitting}
                onPress={onClose}
                textStyle={{ fontSize: 16, fontWeight: "800" }}
              />
              <AppButton
                title="제안 보내기"
                variant="primary"
                style={styles.actionButton}
                loading={isSubmitting}
                disabled={isSubmitting}
                onPress={submit}
                textStyle={{ fontSize: 16, fontWeight: "900" }}
              />
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

export default CounterOfferModal;
