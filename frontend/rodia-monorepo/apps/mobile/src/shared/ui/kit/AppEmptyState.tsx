// apps/mobile/src/shared/ui/kit/AppEmptyState.tsx
import React from "react";
import { View } from "react-native";
import type { ViewStyle } from "react-native";
import { createThemedStyles } from "../../theme/useAppTheme";
import { AppButton } from "./AppButton";
import { AppCard } from "./AppCard";
import { AppContainer } from "./AppContainer";
import { AppText } from "./AppText";

export type AppEmptyAction = {
  label: string;
  onPress: () => void;
};

export type AppEmptyStateProps = {
  title?: string;
  description?: string;
  action?: AppEmptyAction;
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
    marginBottom: 8,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  borderHint: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderDefault,
    marginTop: 8,
    paddingTop: 10,
  },
}));

export function AppEmptyState({
  title = "표시할 내용이 없어요",
  description = "조건을 바꾸거나 새로고침해 보세요.",
  action,
  fullScreen = false,
  style,
}: AppEmptyStateProps) {
  const styles = useStyles();

  const canAction = typeof action?.onPress === "function" && (action?.label?.trim?.()?.length ?? 0) > 0;

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
            {canAction ? <AppButton variant="secondary" title={action!.label} onPress={action!.onPress} /> : null}
          </View>

          <View style={styles.borderHint}>
            <AppText variant="caption" color="borderDefault">
              새로고침 또는 필터 조건 변경으로 다시 확인할 수 있어요.
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
// - 빈 상태(리스트 없음/초기 상태)를 공통 UI로 표준화하는 컴포넌트입니다.
// - action이 유효할 때만 버튼이 노출되어 안전합니다.
// - fullScreen 옵션으로 화면 전체/부분 삽입 모두 대응합니다.