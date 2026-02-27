import * as React from "react";

type UseRefreshCooldownResult = {
  remainingSeconds: number;
  isCoolingDown: boolean;
  startCooldown: () => boolean;
};

export function useRefreshCooldown(initialSeconds = 5): UseRefreshCooldownResult {
  const [remainingSeconds, setRemainingSeconds] = React.useState(0);

  React.useEffect(() => {
    if (remainingSeconds <= 0) return;

    const timerId = window.setTimeout(() => {
      setRemainingSeconds((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timerId);
  }, [remainingSeconds]);

  const startCooldown = React.useCallback(() => {
    if (remainingSeconds > 0) return false;
    setRemainingSeconds(initialSeconds);
    return true;
  }, [initialSeconds, remainingSeconds]);

  return {
    remainingSeconds,
    isCoolingDown: remainingSeconds > 0,
    startCooldown,
  };
}
