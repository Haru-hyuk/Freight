import * as SecureStore from "expo-secure-store";

export type PendingVerificationRole = "shipper" | "driver";

const PENDING_ROLE_KEY = "auth.pendingVerificationRole";

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

async function safeSecureDelete(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // ignore
  }
}

async function safeWebGet(key: string): Promise<string | null> {
  if (canUseLocalStorage()) {
    try {
      const v = globalThis.localStorage.getItem(key);
      return v ?? null;
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

async function safeWebDelete(key: string): Promise<void> {
  if (canUseLocalStorage()) {
    try {
      globalThis.localStorage.removeItem(key);
      return;
    } catch {
      // ignore
    }
  }
  memoryFallback.delete(key);
}

async function getItem(key: string): Promise<string | null> {
  if (isWeb()) return safeWebGet(key);
  return safeSecureGet(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (isWeb()) return safeWebSet(key, value);
  return safeSecureSet(key, value);
}

async function deleteItem(key: string): Promise<void> {
  if (isWeb()) return safeWebDelete(key);
  return safeSecureDelete(key);
}

function toRole(value: unknown): PendingVerificationRole | null {
  const raw = typeof value === "string" ? value.trim() : "";
  if (raw === "shipper" || raw === "driver") return raw;
  return null;
}

export const verificationStorage = {
  async getPendingRole(): Promise<PendingVerificationRole | null> {
    const v = await getItem(PENDING_ROLE_KEY);
    return toRole(v);
  },

  async setPendingRole(role: PendingVerificationRole | null): Promise<void> {
    if (!role) {
      await deleteItem(PENDING_ROLE_KEY);
      return;
    }
    await setItem(PENDING_ROLE_KEY, role);
  },

  async clearPendingRole(): Promise<void> {
    await deleteItem(PENDING_ROLE_KEY);
  },
};

