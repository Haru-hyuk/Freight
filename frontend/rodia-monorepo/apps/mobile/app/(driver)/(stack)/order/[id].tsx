import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { useMatchDetail } from "@/features/matching/model/useMatchDetail";
import {
  BACKEND_STATUS,
  DRIVER_CTA_ID,
  DRIVER_UI_STATE,
  getDriverCta,
  getDriverUiStateFromRawStatus,
  normalizeStatus,
} from "@/shared/lib/policy";
import { safeNumber, safeString } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppErrorState } from "@/shared/ui/kit/AppErrorState";
import { AppSpinner } from "@/shared/ui/kit/AppSpinner";
import { DriverOrderActionBar } from "@/features/driver-orders/ui/detail/DriverOrderActionBar";
import { DriverOrderDetailHeader } from "@/features/driver-orders/ui/detail/DriverOrderDetailHeader";
import { DriverOrderNegotiatingCard } from "@/features/driver-orders/ui/detail/DriverOrderNegotiatingCard";
import { DriverOrderPaymentPendingCard } from "@/features/driver-orders/ui/detail/DriverOrderPaymentPendingCard";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

type DriverOrderRouteParams = {
  id?: string | string[];
  source?: string | string[];
};

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  return StyleSheet.create({
    stateWrap: { paddingTop: spacing * 12 },
    content: { gap: spacing * 3, paddingBottom: spacing * 24 },
    refreshBtn: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 18,
    },
  });
});

function parsePositiveRouteId(rawId: string | string[] | undefined): number {
  const candidate = Array.isArray(rawId) ? rawId[0] : rawId;
  const parsed = Number(candidate);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function normalizeSource(rawSource: string | string[] | undefined): "market" | "my" | "run" {
  const candidate = Array.isArray(rawSource) ? rawSource[0] : rawSource;
  if (candidate === "market" || candidate === "my" || candidate === "run") return candidate;
  return "my";
}

export default function DriverOrderDetailRoute() {
  const params = useLocalSearchParams<DriverOrderRouteParams>();
  const router = useRouter();
  const styles = useStyles();
  const theme = useAppTheme();

  const matchId = parsePositiveRouteId(params.id);
  const source = normalizeSource(params.source);
  const isMarket = source === "market";
  const viewModel = useMatchDetail(matchId);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const refetchOnFocus = async () => {
        if (cancelled) return;
        await viewModel.refetch();
      };

      void refetchOnFocus();

      return () => {
        cancelled = true;
      };
    }, [viewModel.refetch])
  );

  if (matchId <= 0) {
    return (
      <PageScaffold
        title="오더 상세"
        subtitle="오더 정보 확인"
        scroll={false}
        padding={20}
        onPressBack={() => router.back()}
      >
        <View style={styles.stateWrap}>
          <AppErrorState
            title="유효한 오더 ID가 아닙니다."
            description="목록에서 오더를 다시 선택해 주세요."
            retryLabel="뒤로 가기"
            onRetry={() => router.back()}
            fullScreen={false}
          />
        </View>
      </PageScaffold>
    );
  }

  const cTextMuted = safeString(theme?.colors?.textMuted, "#64748B");

  const headerRight = (
    <Pressable
      style={styles.refreshBtn}
      onPress={() => {
        void viewModel.refetch();
      }}
    >
      <Ionicons name="refresh" size={22} color={cTextMuted} />
    </Pressable>
  );

  if (viewModel.isLoading || (!viewModel.match && !viewModel.errorMessage)) {
    return (
      <PageScaffold
        title="오더 상세"
        subtitle="오더 정보 확인"
        scroll={false}
        padding={20}
        onPressBack={() => router.back()}
        headerRight={headerRight}
      >
        <View style={styles.stateWrap}>
          <AppSpinner label="오더 상세를 불러오는 중입니다." />
        </View>
      </PageScaffold>
    );
  }

  if (viewModel.errorMessage) {
    return (
      <PageScaffold
        title="오더 상세"
        subtitle="오더 정보 확인"
        scroll={false}
        padding={20}
        onPressBack={() => router.back()}
        headerRight={headerRight}
      >
        <View style={styles.stateWrap}>
          <AppErrorState
            title="오더 상세를 불러오지 못했습니다."
            description={viewModel.errorMessage}
            retryLabel="다시 시도"
            onRetry={() => {
              void viewModel.refetch();
            }}
            fullScreen={false}
          />
        </View>
      </PageScaffold>
    );
  }

  if (!viewModel.match) {
    return (
      <PageScaffold
        title="오더 상세"
        subtitle="오더 정보 확인"
        scroll={false}
        padding={20}
        onPressBack={() => router.back()}
        headerRight={headerRight}
      >
        <View style={styles.stateWrap}>
          <AppSpinner label="오더 상세를 불러오는 중입니다." />
        </View>
      </PageScaffold>
    );
  }

  const rawStatus = String(viewModel.quote?.status ?? viewModel.match.status ?? "");
  const normalized = normalizeStatus(rawStatus);
  const effectiveRawStatus =
    isMarket && normalized === BACKEND_STATUS.READY ? BACKEND_STATUS.OPEN : rawStatus;
  const uiState = getDriverUiStateFromRawStatus(effectiveRawStatus);
  const cta = getDriverCta(uiState, true);

  return (
    <PageScaffold
      title="오더 상세"
      subtitle="오더 정보 확인"
      scroll
      padding={20}
      onPressBack={() => router.back()}
      headerRight={headerRight}
      bottomBar={<DriverOrderActionBar cta={cta} />}
    >
      <View style={styles.content}>
        {cta.id === DRIVER_CTA_ID.PAYMENT_PENDING ? (
          <DriverOrderPaymentPendingCard />
        ) : uiState === DRIVER_UI_STATE.NEGOTIATING ? (
          <DriverOrderNegotiatingCard quote={viewModel.quote} />
        ) : (
          <DriverOrderDetailHeader
            match={viewModel.match}
            quote={viewModel.quote}
            uiState={uiState}
          />
        )}
      </View>
    </PageScaffold>
  );
}
