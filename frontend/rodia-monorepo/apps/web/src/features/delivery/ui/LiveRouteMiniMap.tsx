import type { LiveRoutePoint } from "@/features/delivery/model/liveTypes";

type Props = {
  plannedRoute: LiveRoutePoint[];
  currentRoute: LiveRoutePoint[];
};

export function LiveRouteMiniMap({ plannedRoute, currentRoute }: Props) {
  const all = [...plannedRoute, ...currentRoute];

  if (all.length < 2) {
    return (
      <div className="flex h-56 items-center justify-center rounded-lg border border-border bg-muted text-sm text-foreground">
        경로 데이터가 부족합니다.
      </div>
    );
  }

  const minLat = Math.min(...all.map((point) => point.lat));
  const maxLat = Math.max(...all.map((point) => point.lat));
  const minLng = Math.min(...all.map((point) => point.lng));
  const maxLng = Math.max(...all.map((point) => point.lng));

  const toPoint = (point: LiveRoutePoint) => {
    const x = ((point.lng - minLng) / (maxLng - minLng || 1)) * 90 + 5;
    const y = 95 - ((point.lat - minLat) / (maxLat - minLat || 1)) * 90;
    return `${x},${y}`;
  };

  const planned = plannedRoute.map(toPoint).join(" ");
  const current = currentRoute.map(toPoint).join(" ");
  const currentLast = currentRoute[currentRoute.length - 1];

  return (
    <div className="rounded-lg border border-border bg-muted p-3">
      <div className="mb-2 text-sm font-medium text-foreground">미니맵 경로 비교</div>
      <svg viewBox="0 0 100 100" className="h-56 w-full rounded-md border border-border bg-background">
        <polyline points={planned} fill="none" stroke="currentColor" strokeWidth="1.2" />
        <polyline points={current} fill="none" stroke="currentColor" strokeWidth="2.2" />
        <circle
          cx={((currentLast.lng - minLng) / (maxLng - minLng || 1)) * 90 + 5}
          cy={95 - ((currentLast.lat - minLat) / (maxLat - minLat || 1)) * 90}
          r="2.4"
          fill="currentColor"
        />
      </svg>
      <div className="mt-2 text-xs text-foreground">얇은 선: 계획 경로 / 굵은 선: 현재 이동 경로</div>
    </div>
  );
}
