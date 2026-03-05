# Driver Run Contract Matrix (2026-03-05)

Source of truth: `apps/mobile/src/shared/api/generated/**` (orval-generated)

## 1) Run SoT

- Primary SoT: `MatchResponse` (`driver-match-controller`)
- Required key for run actions: `matchId`
- Run state rendering input:
  - `accepted` (`MatchResponse.accepted`)
  - `matchStatus` (`MatchResponse.status`)
- `DriverQuoteSummaryResponse` is display-only supplemental data.
  - no `status` field, so it must not be used as run status SoT.

## 2) Driver Match (Run Transition)

### startTransit (`driver-match-controller.startTransit`)
- request path param: `matchId` (required)
- response: `MatchResponse`

### completeTransit (`driver-match-controller.completeTransit`)
- request path param: `matchId` (required)
- response: `MatchResponse`

### MatchResponse fields used in run
- `matchId`, `quoteId`, `accepted`, `status`
- `locationSharingEnabled`, `locationSharingUpdatedAt`
- `acceptedAt`, `updatedAt`

## 3) Tracking (Driver)

### submitDriverGps (`tracking-controller.submitDriverGps`)
- request:
  - path param: `matchId` (required)
  - body: `GpsLogUpsertRequest`
    - required: `lat`, `lng`
    - optional: `speedKmh`, `bearing`
- response: `GpsLogUpsertResponse`
  - `gpsLogId`, `matchId`, `loggedAt`, `deduplicated`, `reason`

### updateTrackingSharing (`tracking-controller.updateTrackingSharing`)
- request:
  - path param: `matchId` (required)
  - body: `TrackingShareUpdateRequest`
    - required: `enabled: boolean`
- response: `TrackingShareStateResponse`
  - `matchId`, `enabled`, `updatedAt`

## 4) Quote Summary (Display-only)

### getQuoteSummary (`driver-quote-controller.getQuoteSummary`)
- request path param: `quoteId` (required)
- response: `DriverQuoteSummaryResponse`
- run display fields:
  - `originAddress`, `destinationAddress`
  - `cargoName`, `finalPrice`, `distanceKm`, `weightKg`, `volumeCbm`
  - `vehicleType`, `vehicleBodyType`, `loadMethod`, `unloadMethod`

## 5) Delivery Photo (Driver)

### getDriverMatchPhotos (`delivery-photo-controller.getDriverMatchPhotos`)
- request path param: `matchId` (required)
- response: `DeliveryPhotoResponse[]`
  - `photoId`, `matchId`, `type`, `fileUrl`, `takenAt`, `createdAt`

### uploadDriverPhoto (`delivery-photo-controller.uploadDriverPhoto`)
- request:
  - path param: `matchId` (required)
  - body: `UploadDriverPhotoBody`
    - required: `file: Blob`
  - query params: `UploadDriverPhotoParams`
    - required: `type` (`PICKUP` | `DELIVERY`)
    - optional: `takenAt`, `lat`, `lng`
- response: `DeliveryPhotoResponse`

### Photo Gate Rule in Run UI
- `PICKUP_IN_PROGRESS`: requires at least one `type=PICKUP` photo.
- `TRANSIT_IN_PROGRESS`: requires at least one `type=DELIVERY` photo.
- Gate source: server photo list from `getDriverMatchPhotos(matchId)`.

## 6) Status Normalization Rule

Single run policy entry:
- `getDriverUiStateFromStatusPayload({ scope: "run", accepted, matchStatus, quoteStatus: undefined })`

Priority:
1. `matchStatus` first
2. `quoteStatus` fallback (run scope에서는 `undefined` 사용)
3. `accepted === false` in `run/my` scope keeps waiting state (`ASSIGNED`) unless explicitly `NEGOTIATING`

## 7) Server Raw -> DriverUiState -> Korean Label

- `OPEN` -> `READY_TO_ACCEPT` -> `요청 접수`
- `NEGOTIATING` -> `NEGOTIATING` -> `협상 중`
- `ASSIGNED` / `READY` / `MATCHED` -> `ASSIGNED` -> `배차 확정`
- `PREPARING` / `PICKUP` -> `PICKUP_IN_PROGRESS` -> `상차 중`
- `TRANSIT` / `DRIVING` / `IN_TRANSIT` -> `TRANSIT_IN_PROGRESS` -> `운송 중`
- `DROPOFF` / `DELIVERED` / `COMPLETED` -> `COMPLETED` -> `운송 완료`
- `CANCELED` / `CANCELLED` -> `CANCELED` -> `취소`

## 8) Sync Rule (Driver Run Tab)

- Focus refetch:
  - run detail page: focus refetch + interval(12s) for volatile statuses
    (`NEGOTIATING`, `ASSIGNED`, `READY`, `MATCHED`, `ACCEPTED`, `PREPARING`)
  - run board(`assignedOnly`): focus interval(12s) when `NEGOTIATING`/`ASSIGNED` orders exist
- Action success event:
  - `RUN_STATUS_UPDATED` published on start/complete/tracking-sharing/photo upload success
  - subscribers refresh list/detail by `matchIds`/`quoteIds`

## 9) UX Rule (Run Actions)

- No optimistic status patching for run transitions.
- On success: refetch current match (+ optional summary) and render by refreshed `match.status`.
- On failure: show reason message + retry action.
- GPS note:
  - As of 2026-03-05, no shared location provider utility is wired in app code.
  - GPS action remains disabled with explicit message until provider is integrated.
