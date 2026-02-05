import * as SecureStore from "expo-secure-store";

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

const ACCESS_TOKEN_KEY = "auth.accessToken";
const REFRESH_TOKEN_KEY = "auth.refreshToken";

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
  // expo-secure-store는 웹에서 제한이 있을 수 있어, 웹은 localStorage/memory로 폴백
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

export const tokenStorage = {
  async getAccessToken(): Promise<string | null> {
    return getItem(ACCESS_TOKEN_KEY);
  },

  async getRefreshToken(): Promise<string | null> {
    return getItem(REFRESH_TOKEN_KEY);
  },

  async setAccessToken(token: string | null): Promise<void> {
    const v = (token ?? "").trim();
    if (!v) return deleteItem(ACCESS_TOKEN_KEY);
    return setItem(ACCESS_TOKEN_KEY, v);
  },

  async setRefreshToken(token: string | null): Promise<void> {
    const v = (token ?? "").trim();
    if (!v) return deleteItem(REFRESH_TOKEN_KEY);
    return setItem(REFRESH_TOKEN_KEY, v);
  },

  async getTokens(): Promise<AuthTokens | null> {
    const [accessToken, refreshToken] = await Promise.all([getItem(ACCESS_TOKEN_KEY), getItem(REFRESH_TOKEN_KEY)]);
    const a = (accessToken ?? "").trim();
    const r = (refreshToken ?? "").trim();
    if (!a || !r) return null;
    return { accessToken: a, refreshToken: r };
  },

  async setTokens(tokens: Partial<AuthTokens> | null): Promise<void> {
    const accessToken = (tokens?.accessToken ?? "").trim();
    const refreshToken = (tokens?.refreshToken ?? "").trim();

    await Promise.all([
      accessToken ? setItem(ACCESS_TOKEN_KEY, accessToken) : deleteItem(ACCESS_TOKEN_KEY),
      refreshToken ? setItem(REFRESH_TOKEN_KEY, refreshToken) : deleteItem(REFRESH_TOKEN_KEY),
    ]);
  },

  async clearTokens(): Promise<void> {
    await Promise.all([deleteItem(ACCESS_TOKEN_KEY), deleteItem(REFRESH_TOKEN_KEY)]);
  },
};