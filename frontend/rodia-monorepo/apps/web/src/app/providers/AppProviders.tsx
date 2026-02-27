import * as React from "react";
import type { PropsWithChildren } from "react";

import { initializeAppearanceSettings } from "@/shared/lib/hooks/useAppearanceSettings";

export default function AppProviders({ children }: PropsWithChildren) {
  React.useEffect(() => {
    initializeAppearanceSettings();
  }, []);

  return <>{children}</>;
}
