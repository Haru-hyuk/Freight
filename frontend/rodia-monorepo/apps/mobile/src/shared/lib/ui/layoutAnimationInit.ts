import { Platform, UIManager } from "react-native";

let isLayoutAnimationInitialized = false;

export function initLayoutAnimationForAndroid() {
  if (isLayoutAnimationInitialized) return;
  isLayoutAnimationInitialized = true;

  if (Platform.OS !== "android") return;

  if (typeof UIManager.setLayoutAnimationEnabledExperimental === "function") {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}
