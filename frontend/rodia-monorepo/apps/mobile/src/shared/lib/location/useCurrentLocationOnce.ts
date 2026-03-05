import { useCallback, useRef, useState } from "react";

declare const require: ((name: string) => unknown) | undefined;

export type CurrentLocationStatus = "idle" | "requesting" | "ready" | "denied" | "error";

export type CurrentLocationCoords = {
  lat: number;
  lng: number;
  speedKmh?: number;
  bearing?: number;
};

export type UseCurrentLocationOnceResult = {
  status: CurrentLocationStatus;
  coords?: CurrentLocationCoords;
  message?: string;
  request: () => Promise<void>;
};

type ExpoPermission = {
  status?: string;
  granted?: boolean;
  canAskAgain?: boolean;
};

type ExpoPosition = {
  coords?: {
    latitude?: number;
    longitude?: number;
    speed?: number | null;
    heading?: number | null;
  };
};

type ExpoLocationModule = {
  Accuracy?: {
    Balanced?: unknown;
    High?: unknown;
  };
  requestForegroundPermissionsAsync?: () => Promise<ExpoPermission>;
  getCurrentPositionAsync?: (options?: Record<string, unknown>) => Promise<ExpoPosition>;
};

function toOptionalFiniteNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toOptionalSpeedKmh(value: unknown): number | undefined {
  const speed = toOptionalFiniteNumber(value);
  if (typeof speed !== "number" || speed < 0) return undefined;
  const speedKmh = Number((speed * 3.6).toFixed(1));
  if (speedKmh > 250) return undefined;
  return speedKmh;
}

function toOptionalBearing(value: unknown): number | undefined {
  const bearing = toOptionalFiniteNumber(value);
  if (typeof bearing !== "number") return undefined;
  if (bearing < 0 || bearing > 360) return undefined;
  return Number(bearing.toFixed(1));
}

function toOptionalLatitude(value: unknown): number | undefined {
  const lat = toOptionalFiniteNumber(value);
  if (typeof lat !== "number" || lat < -90 || lat > 90) return undefined;
  return lat;
}

function toOptionalLongitude(value: unknown): number | undefined {
  const lng = toOptionalFiniteNumber(value);
  if (typeof lng !== "number" || lng < -180 || lng > 180) return undefined;
  return lng;
}

function loadExpoLocationModule(): ExpoLocationModule | null {
  if (typeof require !== "function") return null;
  try {
    return require("expo-location") as ExpoLocationModule;
  } catch {
    return null;
  }
}

function resolveDeniedMessage(permission: ExpoPermission | undefined): string {
  if (permission?.canAskAgain === false) {
    return "위치 권한이 거부되어 설정에서 허용이 필요합니다.";
  }
  return "위치 권한이 거부되었습니다.";
}

export function useCurrentLocationOnce(): UseCurrentLocationOnceResult {
  const [, forceRender] = useState(0);
  const stateRef = useRef<UseCurrentLocationOnceResult>({
    status: "idle",
    message: "위치 업데이트를 누르면 권한 요청 후 현재 좌표를 가져옵니다.",
    request: async () => {},
  });

  const updateState = useCallback((next: Partial<UseCurrentLocationOnceResult>) => {
    Object.assign(stateRef.current, next);
    forceRender((prev) => prev + 1);
  }, []);

  const request = useCallback(async () => {
    updateState({
      status: "requesting",
      message: "현재 위치를 확인하는 중입니다.",
    });

    const locationModule = loadExpoLocationModule();
    if (!locationModule?.requestForegroundPermissionsAsync || !locationModule?.getCurrentPositionAsync) {
      updateState({
        status: "error",
        coords: undefined,
        message: "위치 모듈(expo-location)을 불러오지 못했습니다.",
      });
      return;
    }

    try {
      const permission = await locationModule.requestForegroundPermissionsAsync();
      const granted =
        permission?.granted === true ||
        String(permission?.status ?? "")
          .trim()
          .toLowerCase() === "granted";

      if (!granted) {
        updateState({
          status: "denied",
          coords: undefined,
          message: resolveDeniedMessage(permission),
        });
        return;
      }

      const position = await locationModule.getCurrentPositionAsync({
        accuracy: locationModule.Accuracy?.Balanced ?? locationModule.Accuracy?.High,
      });
      const lat = toOptionalLatitude(position?.coords?.latitude);
      const lng = toOptionalLongitude(position?.coords?.longitude);

      if (typeof lat !== "number" || typeof lng !== "number") {
        updateState({
          status: "error",
          coords: undefined,
          message: "현재 좌표를 읽을 수 없습니다.",
        });
        return;
      }
      const speedKmh = toOptionalSpeedKmh(position?.coords?.speed);
      const bearing = toOptionalBearing(position?.coords?.heading);

      updateState({
        status: "ready",
        coords: {
          lat,
          lng,
          ...(typeof speedKmh === "number" ? { speedKmh } : {}),
          ...(typeof bearing === "number" ? { bearing } : {}),
        },
        message: "현재 위치를 확인했습니다.",
      });
    } catch (error) {
      updateState({
        status: "error",
        coords: undefined,
        message:
          error instanceof Error && error.message
            ? error.message
            : "위치 정보를 가져오지 못했습니다.",
      });
    }
  }, [updateState]);

  stateRef.current.request = request;
  return stateRef.current;
}

export default useCurrentLocationOnce;
