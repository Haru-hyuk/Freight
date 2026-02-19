# API Spec (Controller-Accurate)

## Common
- Base URL: server host + port
- Auth: `Authorization: Bearer {accessToken}`

## Auth

### Driver Signup
- Method: `POST`
- Path: `/api/auth/driver/signup`
- Request DTO: `DriverSignupRequest`
- Response DTO: `DriverSignupResponse`

### Shipper Signup
- Method: `POST`
- Path: `/api/auth/shipper/signup`
- Request DTO: `ShipperSignupRequest`
- Response DTO: `ShipperSignupResponse`

### Driver Login
- Method: `POST`
- Path: `/api/auth/driver/login`
- Request DTO: `LoginRequest`
- Response DTO: `TokenResponse`

### Shipper Login
- Method: `POST`
- Path: `/api/auth/shipper/login`
- Request DTO: `LoginRequest`
- Response DTO: `TokenResponse`

### Admin Login
- Method: `POST`
- Path: `/api/auth/admin/login`
- Request DTO: `LoginRequest`
- Response DTO: `TokenResponse`

### Logout
- Method: `POST`
- Path: `/api/auth/logout`
- Response: `204 No Content`

## Driver Trucks

### Truck Create
- Method: `POST`
- Path: `/api/driver/trucks`
- Request DTO: `TruckCreateRequest`
- Response DTO: `TruckCreateResponse`

### Truck List
- Method: `GET`
- Path: `/api/driver/trucks`
- Response DTO: `List<TruckResponse>`

### Truck Detail
- Method: `GET`
- Path: `/api/driver/trucks/{truckId}`
- Response DTO: `TruckResponse`

### Truck Update
- Method: `PUT`
- Path: `/api/driver/trucks/{truckId}`
- Request DTO: `TruckUpdateRequest`
- Response DTO: `TruckResponse`

### Truck Delete
- Method: `DELETE`
- Path: `/api/driver/trucks/{truckId}`
- Response: `204 No Content`

## Shipper Quotes

### Quote Create
- Method: `POST`
- Path: `/api/shipper/quotes`
- Request DTO: `QuoteCreateRequest`
- Response DTO: `QuoteCreateResponse`
- Response fields:
  - `quoteId` (internal bigint)
  - `quotePublicId` (public UUID)

### Quote Validate
- Method: `POST`
- Path: `/api/shipper/quotes/validate`
- Request DTO: `QuoteCreateRequest`
- Response DTO: `QuoteValidationResponse`
- Response fields (major):
  - `estimatedMinPrice`, `estimatedMaxPrice`, `estimatedWeightedPrice`
  - `overallStatus`: `GOOD | NORMAL | RISKY`
  - `dispatchSpeed`: `FAST | NORMAL | SLOW`
  - `badge`
  - `loadAnalysis`:
    - `currentKg`, `capacityKg`, `usagePercent`
    - `safety`: `SAFE | WARN | RISK`
    - `label`
  - `priceAnalysis`:
    - `userDesiredPrice`, `minPrice`, `maxPrice`, `weightedPrice`, `suggestedPrice`
    - `fit`: `LOW | NORMAL | HIGH`
    - `label`
  - `confidence` (0.0 ~ 1.0)
  - `aiSummary`
  - `reasons[]`, `actions[]`, `comments[]`

### Quote List
- Method: `GET`
- Path: `/api/shipper/quotes`
- Response DTO: `List<QuoteListResponse>`
- Response includes both `quoteId` and `quotePublicId`

### Quote Detail
- Method: `GET`
- Path: `/api/shipper/quotes/{quoteIdentifier}`
- Response DTO: `QuoteDetailResponse`
- `quoteIdentifier` supports UUID `quotePublicId` (preferred) and `quoteId` (fallback)

### Quote Update
- Method: `PUT`
- Path: `/api/shipper/quotes/{quoteIdentifier}`
- Request DTO: `QuoteUpdateRequest`
- Response DTO: `QuoteDetailResponse`

### Quote Delete
- Method: `DELETE`
- Path: `/api/shipper/quotes/{quoteIdentifier}`
- Response: `204 No Content`

## Checklist

### Checklist Items
- Method: `GET`
- Path: `/api/checklist-items`
- Response DTO: `List<ChecklistItemResponse>`

## Driver Counter Offers

### Counter Offer Create
- Method: `POST`
- Path: `/api/driver/quotes/{quoteId}/counter-offers`
- Request DTO: `CounterOfferCreateRequest`
- Response DTO: `CounterOfferResponse`

### My Counter Offers
- Method: `GET`
- Path: `/api/driver/counter-offers/me`
- Response DTO: `List<CounterOfferResponse>`

## Shipper Counter Offers

### Counter Offer List By Quote
- Method: `GET`
- Path: `/api/shipper/quotes/{quoteId}/counter-offers`
- Response DTO: `List<CounterOfferResponse>`

### Counter Offer Accept
- Method: `PATCH`
- Path: `/api/shipper/counter-offers/{offerId}/accept`
- Response: `204 No Content`

### Counter Offer Reject
- Method: `PATCH`
- Path: `/api/shipper/counter-offers/{offerId}/reject`
- Response: `204 No Content`

## Driver Matches

### Open Matches
- Method: `GET`
- Path: `/api/driver/matches`
- Response DTO: `List<MatchResponse>`

### My Matches (Driver)
- Method: `GET`
- Path: `/api/driver/matches/me`
- Response DTO: `List<MatchResponse>`

### Match Accept (Driver)
- Method: `POST`
- Path: `/api/driver/matches/{matchId}/accept`
- Response DTO: `MatchResponse`

### Match Cancel (Driver)
- Method: `DELETE`
- Path: `/api/driver/matches/{matchId}`
- Response: `204 No Content`

### Match Detail (Driver)
- Method: `GET`
- Path: `/api/driver/matches/{matchId}`
- Response DTO: `MatchResponse`

## Shipper Matches

### Match Create (Shipper)
- Method: `POST`
- Path: `/api/shipper/matches`
- Request DTO: `MatchCreateRequest`
- Response DTO: `MatchResponse`

### My Matches (Shipper)
- Method: `GET`
- Path: `/api/shipper/matches/me`
- Response DTO: `List<MatchResponse>`

### Match Cancel (Shipper)
- Method: `DELETE`
- Path: `/api/shipper/matches/{matchId}`
- Response: `204 No Content`

### Match Detail (Shipper)
- Method: `GET`
- Path: `/api/shipper/matches/{matchId}`
- Response DTO: `MatchResponse`

## Notifications

### Notification List
- Method: `GET`
- Path: `/api/notifications/me`
- Response DTO: `List<NotificationResponse>`

### Notification Unread Count
- Method: `GET`
- Path: `/api/notifications/me/unread-count`
- Response DTO: `UnreadCountResponse`

### Notification Mark Read
- Method: `PATCH`
- Path: `/api/notifications/{notificationId}/read`
- Response: `204 No Content`

## Push Tokens (FCM)

### Push Token Upsert
- Method: `POST`
- Path: `/api/push-tokens/me`
- Request DTO: `FcmTokenUpsertRequest`
- Request example:
```json
{
  "deviceType": "ANDROID",
  "fcmToken": "fcm_device_token_value"
}
```
- `deviceType`: `ANDROID | IOS | WEB`
- Response: `204 No Content`

### Push Token Deactivate
- Method: `DELETE`
- Path: `/api/push-tokens/me?fcmToken={fcmToken}`
- Response: `204 No Content`

## Announcements (Public)

### Announcement List
- Method: `GET`
- Path: `/api/announcements`
- Response DTO: `List<AnnouncementResponse>`

### Announcement Detail
- Method: `GET`
- Path: `/api/announcements/{announcementId}`
- Response DTO: `AnnouncementResponse`

## Announcements (Admin)

### Admin Announcement Create
- Method: `POST`
- Path: `/api/admin/announcements`
- Request DTO: `AnnouncementCreateRequest`
- Response DTO: `AnnouncementResponse`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Admin Announcement Update
- Method: `PUT`
- Path: `/api/admin/announcements/{announcementId}`
- Request DTO: `AnnouncementUpdateRequest`
- Response DTO: `AnnouncementResponse`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Admin Announcement Delete
- Method: `DELETE`
- Path: `/api/admin/announcements/{announcementId}`
- Response: `204 No Content`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Admin Announcement List
- Method: `GET`
- Path: `/api/admin/announcements`
- Response DTO: `List<AnnouncementResponse>`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Admin Announcement Detail
- Method: `GET`
- Path: `/api/admin/announcements/{announcementId}`
- Response DTO: `AnnouncementResponse`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

## Shipper Payments

### Payment Prepare
- Method: `POST`
- Path: `/api/shipper/payments/prepare`
- Request DTO: `PaymentPrepareRequest`
- Response DTO: `PaymentPrepareResponse`
- Auth role: `ROLE_SHIPPER`

### Payment Confirm
- Method: `POST`
- Path: `/api/shipper/payments/confirm`
- Request DTO: `PaymentConfirmRequest`
- Response DTO: `PaymentResponse`
- Auth role: `ROLE_SHIPPER`

### My Payments
- Method: `GET`
- Path: `/api/shipper/payments/me`
- Response DTO: `List<PaymentResponse>`
- Auth role: `ROLE_SHIPPER`

### Payment Detail
- Method: `GET`
- Path: `/api/shipper/payments/{paymentId}`
- Response DTO: `PaymentResponse`
- Auth role: `ROLE_SHIPPER`

### Payments By Match
- Method: `GET`
- Path: `/api/shipper/payments?matchId={matchId}`
- Response DTO: `List<PaymentResponse>`
- Auth role: `ROLE_SHIPPER`
