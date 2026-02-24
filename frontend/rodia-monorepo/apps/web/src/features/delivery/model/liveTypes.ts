export type LiveDeliveryStatus = "NORMAL" | "DELAYED" | "DEVIATED";

export type LiveDeliveryRow = {
  matchId: string;
  quoteId: string;
  driverId: string;
  driverName: string;
  shipperName: string;
  originAddress: string;
  destinationAddress: string;
  currentLat: number;
  currentLng: number;
  speedKmh: number;
  progressPercent: number;
  deviationDistanceKm: number;
  routeUpdatedAt: string;
  liveStatus: LiveDeliveryStatus;
};

export type LiveRoutePoint = {
  lat: number;
  lng: number;
  recordedAt?: string;
};

export type LiveDeliveryTimelineEvent = {
  id: string;
  label: string;
  occurredAt: string;
  note?: string;
};

export type LiveDeliveryDetail = {
  matchId: string;
  cargoType: string;
  cargoWeightKg: number;
  truckType: string;
  truckWeightTon: number;
  truckVolumeCbm: number;
  totalRouteKm: number;
  routeProgressPercent: number;
  deviationReason?: string;
  plannedRoute: LiveRoutePoint[];
  currentRoute: LiveRoutePoint[];
  timeline: LiveDeliveryTimelineEvent[];
};

export type KakaoAlertPayload = {
  matchId: string;
  templateCode: "DELAY_NOTICE" | "DEVIATION_NOTICE";
};
