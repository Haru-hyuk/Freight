const MOCK_MODE_KEY = "rodia_admin_mock_mode";
const MOCK_MODE_EVENT = "rodia:mock-mode-changed";

function readMockMode(): boolean {
  if (typeof window === "undefined") return true;
  const value = window.localStorage.getItem(MOCK_MODE_KEY);
  if (value === null) return true;
  return value === "true";
}

export function isMockModeEnabled(): boolean {
  return readMockMode();
}

export function setMockModeEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MOCK_MODE_KEY, String(enabled));
  window.dispatchEvent(new CustomEvent(MOCK_MODE_EVENT, { detail: enabled }));
}

export function subscribeMockMode(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  const handleStorage = (event: StorageEvent) => {
    if (event.key === MOCK_MODE_KEY) listener();
  };

  const handleLocal = () => listener();

  window.addEventListener("storage", handleStorage);
  window.addEventListener(MOCK_MODE_EVENT, handleLocal);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(MOCK_MODE_EVENT, handleLocal);
  };
}

