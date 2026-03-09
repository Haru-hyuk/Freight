import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";

import { useAuth } from "@/features/auth/model/useAuth";
import {
  createDriverHomeSummaryDefaults,
  loadDriverHomeSummary,
  type DriverHomeSummary,
} from "../api/driver-home-summary-api";

type LoadOptions = {
  isCancelled?: () => boolean;
};

export type UseDriverHomeSummaryResult = {
  data: DriverHomeSummary;
  isLoading: boolean;
  errorMessage: string | null;
  reload: () => Promise<void>;
};

export function useDriverHomeSummary(): UseDriverHomeSummaryResult {
  const auth = useAuth();
  const isVerificationBlocked = auth.pendingVerificationRole === "driver";

  const [data, setData] = useState<DriverHomeSummary>(() =>
    createDriverHomeSummaryDefaults({ isVerificationBlocked })
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(
    async (options: LoadOptions = {}) => {
      const isCancelled = options.isCancelled ?? (() => false);
      const defaults = createDriverHomeSummaryDefaults({ isVerificationBlocked });

      if (auth.status !== "authenticated") {
        if (!isCancelled()) {
          setData(defaults);
          setErrorMessage(null);
          setIsLoading(false);
        }
        return;
      }

      if (!isCancelled()) {
        setIsLoading(true);
      }

      try {
        const summary = await loadDriverHomeSummary({ isVerificationBlocked });
        if (isCancelled()) return;
        setData(summary);
        setErrorMessage(null);
      } catch {
        if (isCancelled()) return;
        setData(defaults);
        setErrorMessage("홈 요약 데이터를 불러오지 못했습니다.");
      } finally {
        if (!isCancelled()) {
          setIsLoading(false);
        }
      }
    },
    [auth.status, isVerificationBlocked]
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void load({ isCancelled: () => cancelled });
      return () => {
        cancelled = true;
      };
    }, [load])
  );

  const reload = useCallback(async () => {
    await load();
  }, [load]);

  return {
    data,
    isLoading,
    errorMessage,
    reload,
  };
}

