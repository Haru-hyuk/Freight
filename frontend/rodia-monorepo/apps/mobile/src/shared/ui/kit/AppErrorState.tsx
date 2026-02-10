// apps/mobile/src/shared/ui/kit/AppErrorState.tsx
import React from "react";
import { View } from "react-native";
import type { ViewStyle } from "react-native";
import { createThemedStyles } from "../../theme/useAppTheme";
import { AppButton } from "./AppButton";
import { AppCard } from "./AppCard";
import { AppContainer } from "./AppContainer";
import { AppText } from "./AppText";

export type AppErrorStateProps = {
  title?: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
  fullScreen?: boolean;
  style?: ViewStyle;
};

const useStyles = createThemedStyles((theme) => ({
  screen: {
    flex: 1,
  },
  wrap: {
    width: "100%",
    alignItems: "stretch",
    justifyContent: "center",
  },
  cardInner: {
    padding: 16,
    gap: 10,
  },
  title: {
    marginBottom: 2,
  },
  desc: {
    marginBottom: 10,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  hint: {
    marginTop: 8,
  },
  borderHint: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderDefault,
    marginTop: 8,
    paddingTop: 10,
  },
}));

export function AppErrorState({
  title = "문제가 발생했어요",
  description = "잠시 후 다시 시도해 주세요.",
  retryLabel = "다시 시도",
  onRetry,
  fullScreen = false,
  style,
}: AppErrorStateProps) {
  const styles = useStyles();

  const content = (
    <View style={[styles.wrap, style]}>
      <AppCard>
        <View style={styles.cardInner}>
          <AppText variant="heading" weight="700" color="textMain" align="left" style={styles.title}>
            {title}
          </AppText>

          <AppText variant="body" color="textMain" align="left" style={styles.desc}>
            {description}
          </AppText>

          <View style={styles.actions}>
            {typeof onRetry === "function" ? (
              <AppButton variant="primary" title={retryLabel} onPress={onRetry} />
            ) : null}
          </View>

          <View style={styles.borderHint}>
            <AppText variant="caption" color="borderDefault">
              네트워크 상태를 확인하거나 잠시 후 다시 시도해 주세요.
            </AppText>
          </View>
        </View>
      </AppCard>
    </View>
  );

  if (!fullScreen) return content;

  return (
    <AppContainer style={styles.screen} scroll={false}>
      {content}
    </AppContainer>
  );
}

// 요약(3줄)
// - 네트워크/서버 오류 상태를 공통 UI로 표준화하는 컴포넌트입니다.
// - onRetry가 있을 때만 “다시 시도” 버튼이 노출되어 안전합니다.
// - fullScreen 옵션으로 화면 전체/부분 삽입 모두 대응합니다.