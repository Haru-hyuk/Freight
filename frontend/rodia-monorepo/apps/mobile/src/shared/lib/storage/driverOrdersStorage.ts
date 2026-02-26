import * as SecureStore from "expo-secure-store";

const AI_TOOLTIP_SEEN_KEY = "driverOrders.aiTooltipSeen";

const memoryFallback = new Map<string, string>();

function isWeb(): boolean {
  return typeof window !== "undefined" && typeof (window as any)?.document !== "undefined";
}

function canUseLocalStorage(): boolean {
  try {
    return !!globalThis?.localStorage;
  } catch {
    return false;
  }
}

async function safeSecureGet(key: string): Promise<string | null> {
  try {
    return (await SecureStore.getItemAsync(key)) ?? null;
  } catch {
    return null;
  }
}

async function safeSecureSet(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // ignore
  }
}

async function safeWebGet(key: string): Promise<string | null> {
  if (canUseLocalStorage()) {
    try {
      return globalThis.localStorage.getItem(key);
    } catch {
      // ignore
    }
  }
  return memoryFallback.get(key) ?? null;
}

async function safeWebSet(key: string, value: string): Promise<void> {
  if (canUseLocalStorage()) {
    try {
      globalThis.localStorage.setItem(key, value);
      return;
    } catch {
      // ignore
    }
  }
  memoryFallback.set(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (isWeb()) return safeWebGet(key);
  return safeSecureGet(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (isWeb()) return safeWebSet(key, value);
  return safeSecureSet(key, value);
}

export async function readDriverOrdersAiTooltipSeen(): Promise<boolean> {
  const value = (await getItem(AI_TOOLTIP_SEEN_KEY)) ?? "";
  return value.trim() === "1";
}

export async function writeDriverOrdersAiTooltipSeen(seen: boolean): Promise<void> {
  await setItem(AI_TOOLTIP_SEEN_KEY, seen ? "1" : "0");
}

