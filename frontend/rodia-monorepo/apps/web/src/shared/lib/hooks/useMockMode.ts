import { useEffect, useState } from "react";

import { isMockModeEnabled, setMockModeEnabled, subscribeMockMode } from "@/shared/lib/mock-mode";

export function useMockMode() {
  const [enabled, setEnabled] = useState<boolean>(() => isMockModeEnabled());

  useEffect(() => {
    return subscribeMockMode(() => {
      setEnabled(isMockModeEnabled());
    });
  }, []);

  const updateEnabled = (next: boolean) => {
    setMockModeEnabled(next);
  };

  return { enabled, setEnabled: updateEnabled };
}

