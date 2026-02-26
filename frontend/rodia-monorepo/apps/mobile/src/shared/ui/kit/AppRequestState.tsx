import React from "react";

import { AppErrorState } from "@/shared/ui/kit/AppErrorState";
import { AppSpinner } from "@/shared/ui/kit/AppSpinner";

type Props = {
  isLoading: boolean;
  loadingLabel?: string;
  errorMessage?: string | null;
  errorTitle?: string;
  retryLabel?: string;
  onRetry?: () => void;
  fullScreen?: boolean;
  children: React.ReactNode;
};

export function AppRequestState({
  isLoading,
  loadingLabel = "불러오는 중입니다.",
  errorMessage,
  errorTitle = "요청을 처리하지 못했어요",
  retryLabel = "다시 시도",
  onRetry,
  fullScreen = false,
  children,
}: Props) {
  if (isLoading) {
    return <AppSpinner label={loadingLabel} />;
  }

  if (errorMessage) {
    return (
      <AppErrorState
        title={errorTitle}
        description={errorMessage}
        retryLabel={retryLabel}
        onRetry={onRetry}
        fullScreen={fullScreen}
      />
    );
  }

  return <>{children}</>;
}

export default AppRequestState;

