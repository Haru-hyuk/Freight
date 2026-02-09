import type { PropsWithChildren } from "react";

export default function AppProviders({ children }: PropsWithChildren) {
  // 현재는 UI-only 뼈대. (추후 QueryClientProvider/ThemeProvider 등 여기로)
  return <>{children}</>;
}
