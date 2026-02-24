import { Platform, UIManager } from "react-native";

let isLayoutAnimationInitialized = false;

function isNewArchitectureEnabled() {
  const runtimeGlobal = globalThis as typeof globalThis & {
    nativeFabricUIManager?: unknown;
  };
  const platformConstants = Platform.constants as { isNewArchEnabled?: boolean } | undefined;
  return Boolean(runtimeGlobal.nativeFabricUIManager) || Boolean(platformConstants?.isNewArchEnabled);
}

export function initLayoutAnimationForAndroid() {
  if (isLayoutAnimationInitialized) return;
  isLayoutAnimationInitialized = true;

  if (Platform.OS !== "android") return;
  if (isNewArchitectureEnabled()) return;

  if (typeof UIManager.setLayoutAnimationEnabledExperimental === "function") {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}
