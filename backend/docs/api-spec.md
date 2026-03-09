# API Spec (Controller-Accurate)

## Common
- Last verified: `2026-03-06`
- Source of truth: `backend/src/main/java/**/**Controller.java`
- Endpoint parity check: `doc 162 == controller 162` (missing 0 / extra 0)
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

### Token Refresh
- Method: `POST`
- Path: `/api/auth/refresh`
- Request DTO: `RefreshTokenRequest`
- Response DTO: `TokenResponse`

### My Profile
- Method: `GET`
- Path: `/api/auth/me`
- Response DTO: `MeResponse`

### My Profile Update
- Method: `PATCH`
- Path: `/api/auth/me`
- Request DTO: `MeUpdateRequest`
- Response DTO: `MeResponse`

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

### Active Truck
- Method: `GET`
- Path: `/api/driver/trucks/active`
- Response DTO: `TruckResponse`

### Active Truck Select
- Method: `PATCH`
- Path: `/api/driver/trucks/active/{truckId}`
- Response DTO: `TruckResponse`

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

### Quote ETA Suggestion
- Method: `POST`
- Path: `/api/shipper/quotes/eta-suggestion`
- Request DTO: `QuoteEtaSuggestionRequest`
- Response DTO: `QuoteEtaSuggestionResponse`
- Auth role: `ROLE_SHIPPER`

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

## Shipper Address Book

### Address List
- Method: `GET`
- Path: `/api/shipper/addresses`
- Response DTO: `List<ShipperAddressItemResponse>`

### Address Create
- Method: `POST`
- Path: `/api/shipper/addresses`
- Request DTO: `ShipperAddressUpsertRequest`
- Response DTO: `ShipperAddressItemResponse`

### Address Update
- Method: `PUT`
- Path: `/api/shipper/addresses/{addressId}`
- Request DTO: `ShipperAddressUpsertRequest`
- Response DTO: `ShipperAddressItemResponse`

### Address Delete
- Method: `DELETE`
- Path: `/api/shipper/addresses/{addressId}`
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
- Response DTO: `CounterOfferAcceptResponse`

`CounterOfferAcceptResponse` fields:
- `counterOfferId`
- `quoteId`
- `matchId`
- `driverId`
- `counterOfferStatus` (`ACCEPTED`)
- `quoteStatus` (`MATCHED`)
- `matchStatus` (`READY`)
- `paymentRequired` (`true`)
- `nextAction` (`PAYMENT_REQUIRED`)

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

### Match Batch Accept (Driver)
- Method: `POST`
- Path: `/api/driver/matches/accept-batch`
- Request DTO: `BatchAcceptMatchRequest`
- Response DTO: `BatchAcceptMatchResponse`

### Match Start Transit (Driver)
- Method: `POST`
- Path: `/api/driver/matches/{matchId}/start`
- Response DTO: `MatchResponse`

### Match Batch Start Transit (Driver)
- Method: `POST`
- Path: `/api/driver/matches/start-batch`
- Request DTO: `BatchStartTransitRequest`
- Response DTO: `BatchStartTransitResponse`

### Match Complete Transit (Driver)
- Method: `POST`
- Path: `/api/driver/matches/{matchId}/complete`
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

## Delivery Photos

### Upload Delivery Photo (Driver)
- Method: `POST`
- Path: `/api/driver/matches/{matchId}/photos`
- Content-Type: `multipart/form-data`
- Auth role: `ROLE_DRIVER` (accepted driver only)
- Request fields:
  - `type`: `PICKUP | DELIVERY`
  - `file`: image file
  - `takenAt`: optional ISO datetime
  - `lat`: optional decimal
  - `lng`: optional decimal
- Response DTO: `DeliveryPhotoResponse`

### Delivery Photo List (Driver)
- Method: `GET`
- Path: `/api/driver/matches/{matchId}/photos`
- Auth role: `ROLE_DRIVER` (accepted driver only)
- Response DTO: `List<DeliveryPhotoResponse>`

### Delivery Photo List (Shipper)
- Method: `GET`
- Path: `/api/shipper/matches/{matchId}/photos`
- Auth role: `ROLE_SHIPPER` (quote owner only)
- Response DTO: `List<DeliveryPhotoResponse>`

### Delivery Photo File Download
- Method: `GET`
- Path: `/api/delivery-photos/{photoId}/file`
- Auth role: `ROLE_DRIVER | ROLE_SHIPPER` (match participant only)
- Response: binary file stream

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

## Driver Optimization

### Route Recommendations
- Method: `POST`
- Path: `/api/driver/optimization/route-recommendations`
- Request DTO: `RouteRecommendRequest`
- Response DTO: `RouteAssemblyResponse` (runtime response type is `Object`)
- Auth role: `ROLE_DRIVER`

### Load Plan Preview
- Method: `POST`
- Path: `/api/driver/optimization/load-plan-preview`
- Request DTO: `LoadPlanPreviewRequest`
- Response DTO: `Object`
- Auth role: `ROLE_DRIVER`

### Route Selection Preview
- Method: `POST`
- Path: `/api/driver/optimization/route-selection-preview`
- Request DTO: `RouteSelectionPreviewRequest`
- Response DTO: `Object`
- Auth role: `ROLE_DRIVER`

## Driver Profile

### Driver On-Duty Status
- Method: `GET`
- Path: `/api/driver/me/on-duty`
- Response DTO: `DriverOnDutyResponse`
- Auth role: `ROLE_DRIVER`

### Driver On-Duty Update
- Method: `PATCH`
- Path: `/api/driver/me/on-duty`
- Request DTO: `DriverOnDutyRequest`
- Response DTO: `DriverOnDutyResponse`
- Auth role: `ROLE_DRIVER`

## Driver Quotes

### Driver Quote Summary
- Method: `GET`
- Path: `/api/driver/quotes/{quoteId}/summary`
- Response DTO: `DriverQuoteSummaryResponse`
- Auth role: `ROLE_DRIVER`

### Driver Quote Summaries
- Method: `GET`
- Path: `/api/driver/quotes/summaries?quoteIds={id1}&quoteIds={id2}...`
- Response DTO: `List<DriverQuoteSummaryResponse>`
- Auth role: `ROLE_DRIVER`

## Driver Settlements

### Driver My Settlements
- Method: `GET`
- Path: `/api/driver/settlements/me`
- Response DTO: `List<SettlementResponse>`
- Auth role: `ROLE_DRIVER`

### Driver Settlement Summary
- Method: `GET`
- Path: `/api/driver/settlements/me/summary`
- Response DTO: `DriverSettlementSummaryResponse`
- Auth role: `ROLE_DRIVER`

### Driver Settlement By Match
- Method: `GET`
- Path: `/api/driver/settlements?matchId={matchId}`
- Response DTO: `SettlementResponse`
- Auth role: `ROLE_DRIVER`

## Shipper Settlements

### Shipper My Settlements
- Method: `GET`
- Path: `/api/shipper/settlements/me`
- Response DTO: `List<SettlementResponse>`
- Auth role: `ROLE_SHIPPER`

### Shipper Settlement By Match
- Method: `GET`
- Path: `/api/shipper/settlements?matchId={matchId}`
- Response DTO: `SettlementResponse`
- Auth role: `ROLE_SHIPPER`

### Shipper Settlement Confirm
- Method: `POST`
- Path: `/api/shipper/settlements/{matchId}/confirm`
- Response DTO: `SettlementResponse`
- Auth role: `ROLE_SHIPPER`

## Shipper Settings

### Payment Methods
- Method: `GET`
- Path: `/api/shipper/settings/payment-methods`
- Response DTO: `List<ShipperPaymentMethodSummaryResponse>`
- Auth role: `ROLE_SHIPPER`

## Inquiry

### Shipper Inquiry Create
- Method: `POST`
- Path: `/api/shipper/inquiries`
- Request DTO: `InquiryCreateRequest`
- Response DTO: `InquiryResponse`
- Auth role: `ROLE_SHIPPER`

### Shipper My Inquiries
- Method: `GET`
- Path: `/api/shipper/inquiries/me`
- Response DTO: `List<InquiryResponse>`
- Auth role: `ROLE_SHIPPER`

### Driver Inquiry Create
- Method: `POST`
- Path: `/api/driver/inquiries`
- Request DTO: `InquiryCreateRequest`
- Response DTO: `InquiryResponse`
- Auth role: `ROLE_DRIVER`

### Driver My Inquiries
- Method: `GET`
- Path: `/api/driver/inquiries/me`
- Response DTO: `List<InquiryResponse>`
- Auth role: `ROLE_DRIVER`

### Admin Inquiry List
- Method: `GET`
- Path: `/api/admin/inquiries`
- Response DTO: `List<InquiryResponse>`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Admin Inquiry Answer
- Method: `PATCH`
- Path: `/api/admin/inquiries/{inquiryId}/answer`
- Request DTO: `InquiryAnswerRequest`
- Response DTO: `InquiryResponse`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

## Reference Catalog

### Truck Specs Reference
- Method: `GET`
- Path: `/api/reference/truck-specs?vehicleType={vehicleType}`
- Response DTO: `List<TruckSpecReferenceResponse>`

### Pricing Rates Reference
- Method: `GET`
- Path: `/api/reference/pricing-rates?vehicleType={vehicleType}`
- Response DTO: `List<PricingRateReferenceResponse>`

### Pricing Rate Reference
- Method: `GET`
- Path: `/api/reference/pricing-rate?distanceKm={distanceKm}&vehicleType={vehicleType}`
- Response DTO: `PricingRateReferenceResponse`

## Health

### Backend Health
- Method: `GET`
- Path: `/api/health`
- Response DTO: `Map<String, Object>`

## Admin Ops

### Admin Dashboard
- Method: `GET`
- Path: `/api/admin/dashboard?range={range}`
- Response DTO: `Map<String, Object>`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Admin Users
- Method: `GET`
- Path: `/api/admin/users`
- Response DTO: `Map<String, Object>`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Admin User Detail
- Method: `GET`
- Path: `/api/admin/users/{userId}`
- Response DTO: `Map<String, Object>`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Admin User Status Update
- Method: `PATCH`
- Path: `/api/admin/users/{userId}/status`
- Request DTO: `AdminUserStatusUpdateRequest`
- Response DTO: `Map<String, Object>`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

## Admin Transport

### Admin Quotes
- Method: `GET`
- Path: `/api/admin/quotes`
- Response DTO: `List<Map<String, Object>>`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Admin Quote Detail
- Method: `GET`
- Path: `/api/admin/quotes/{quoteId}`
- Response DTO: `Map<String, Object>`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Admin Matches
- Method: `GET`
- Path: `/api/admin/matches`
- Response DTO: `List<Map<String, Object>>`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Admin Match Detail
- Method: `GET`
- Path: `/api/admin/matches/{matchId}`
- Response DTO: `Map<String, Object>`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Admin Payments
- Method: `GET`
- Path: `/api/admin/payments`
- Response DTO: `List<Map<String, Object>>`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Admin Settlements
- Method: `GET`
- Path: `/api/admin/settlements`
- Response DTO: `List<Map<String, Object>>`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Admin Pricing Rates
- Method: `GET`
- Path: `/api/admin/pricing-rates`
- Response DTO: `List<Map<String, Object>>`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Admin Pricing Rate Update
- Method: `PATCH`
- Path: `/api/admin/pricing-rates/{rateId}`
- Request DTO: `AdminPricingVehicleUpdateRequest`
- Response DTO: `Map<String, Object>`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

## Admin Sanctions

### Admin Sanction List
- Method: `GET`
- Path: `/api/admin/sanctions`
- Response DTO: `List<Map<String, Object>>`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Admin Sanction Create
- Method: `POST`
- Path: `/api/admin/sanctions`
- Request DTO: `AdminSanctionCreateRequest`
- Response DTO: `Map<String, Object>`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Admin Sanction Release
- Method: `PATCH`
- Path: `/api/admin/sanctions/{sanctionId}/release`
- Response DTO: `Map<String, Object>`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

## Admin Truck Approvals

### Pending Truck List
- Method: `GET`
- Path: `/api/admin/trucks/pending`
- Response DTO: `List<TruckResponse>`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Truck Approval Update
- Method: `PATCH`
- Path: `/api/admin/trucks/{truckId}/approval`
- Request DTO: `TruckApprovalUpdateRequest`
- Response DTO: `TruckResponse`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

## Admin Integration

### Delivery History
- Method: `GET`
- Path: `/api/admin/delivery/history`
- Response DTO: `PaginatedResponse<DeliveryHistoryRowResponse>`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Live Deliveries
- Method: `GET`
- Path: `/api/admin/delivery/live`
- Response DTO: `List<LiveDeliveryRowResponse>`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Live Delivery Detail
- Method: `GET`
- Path: `/api/admin/delivery/live/{matchId}`
- Response DTO: `LiveDeliveryDetailResponse`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Dispatch Rows
- Method: `GET`
- Path: `/api/admin/dispatch`
- Response DTO: `Map<String, Object>`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Assignable Drivers
- Method: `GET`
- Path: `/api/admin/dispatch/{matchId}/drivers`
- Response DTO: `List<Map<String, Object>>`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Dispatch Force Assign
- Method: `POST`
- Path: `/api/admin/dispatch/{matchId}/force-assign`
- Request DTO: `AdminDispatchForceAssignRequest`
- Response DTO: `Map<String, Object>`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Driver Approvals
- Method: `GET`
- Path: `/api/admin/drivers/approvals`
- Response DTO: `List<Map<String, Object>>`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Driver Approval Review
- Method: `POST`
- Path: `/api/admin/drivers/approvals/{driverId}/review`
- Request DTO: `AdminReviewRequest`
- Response: `204 No Content`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Truck Approvals
- Method: `GET`
- Path: `/api/admin/trucks/approvals`
- Response DTO: `List<Map<String, Object>>`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Truck Approval Review
- Method: `POST`
- Path: `/api/admin/trucks/approvals/{truckId}/review`
- Request DTO: `AdminReviewRequest`
- Response: `204 No Content`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Settlement Approvals
- Method: `GET`
- Path: `/api/admin/settlements/approvals`
- Response DTO: `List<Map<String, Object>>`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Settlement Approval History
- Method: `GET`
- Path: `/api/admin/settlements/approval-history`
- Response DTO: `List<Map<String, Object>>`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Settlement Review
- Method: `POST`
- Path: `/api/admin/settlements/{settlementId}/review`
- Request DTO: `AdminReviewRequest`
- Response: `204 No Content`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Admin Quote Patch
- Method: `PATCH`
- Path: `/api/admin/quotes/{quoteId}`
- Request DTO: `AdminQuoteUpdateRequest`
- Response DTO: `Map<String, Object>`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Vehicle Pricing List
- Method: `GET`
- Path: `/api/admin/pricing/vehicles`
- Response DTO: `List<Map<String, Object>>`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Vehicle Pricing Update
- Method: `PATCH`
- Path: `/api/admin/pricing/vehicles/{vehiclePricingId}`
- Request DTO: `AdminPricingVehicleUpdateRequest`
- Response DTO: `Map<String, Object>`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Additional Option Pricing List
- Method: `GET`
- Path: `/api/admin/pricing/additional-options`
- Response DTO: `List<Map<String, Object>>`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Additional Option Pricing Update
- Method: `PATCH`
- Path: `/api/admin/pricing/additional-options/{additionalPricingId}`
- Request DTO: `AdminPricingAdditionalUpdateRequest`
- Response DTO: `Map<String, Object>`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Truck Spec Reference Rows
- Method: `GET`
- Path: `/api/admin/reference/truck-specs`
- Response DTO: `List<Map<String, Object>>`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Truck Spec Reference Update
- Method: `PATCH`
- Path: `/api/admin/reference/truck-specs/{specId}`
- Request DTO: `AdminTruckSpecUpdateRequest`
- Response DTO: `Map<String, Object>`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Activity Logs
- Method: `GET`
- Path: `/api/admin/activity-logs`
- Response DTO: `List<Map<String, Object>>`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Notification Endpoints (No Content)
- Method: `POST`
- Paths:
  - `/api/admin/notifications/kakao/live-alert`
  - `/api/admin/notifications/quote-updated`
  - `/api/admin/notifications/pricing-updated`
- Response: `204 No Content`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

## Admin Web Compat

### Ops Deviations
- Method: `GET`
- Path: `/api/admin/ops/deviations`
- Response DTO: `List<Map<String, Object>>`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Ops Activity Logs
- Method: `GET`
- Path: `/api/admin/ops/activity-logs`
- Response DTO: `List<Map<String, Object>>`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Ops Deviation Action
- Method: `POST`
- Path: `/api/admin/ops/deviations/{caseId}/actions`
- Request DTO: `Map<String, Object>`
- Response DTO: `Map<String, Object>`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Ops Sanction Logs
- Method: `GET`
- Path: `/api/admin/ops/sanctions/logs`
- Response DTO: `Map<String, Object>`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Order Cancellation Requests
- Method: `GET`
- Path: `/api/admin/orders/cancellations`
- Response DTO: `Map<String, Object>`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Order Cancellation Review
- Method: `POST`
- Path: `/api/admin/orders/cancellations/{requestId}/review`
- Request DTO: `Map<String, Object>`
- Response DTO: `Map<String, Object>`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

## Route APIs

### Place Search
- Method: `GET`
- Path: `/api/route/place-search?query={query}`
- Response DTO: `String(JSON)`
- Auth role: `ROLE_DRIVER | ROLE_SHIPPER | ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Route Find
- Method: `POST`
- Path: `/api/route/find`
- Request DTO: `RouteRequest`
- Response DTO: `RouteResponse`

### Kakao Directions Proxy
- Method: `GET`
- Path: `/api/route/directions`
- Response DTO: `String(JSON)`

### Kakao Multi Directions
- Method: `POST`
- Path: `/api/route/multi-directions`
- Request DTO: `MultiDirectionsRequest`
- Response DTO: `String(JSON)`

### Cached Distance (Single)
- Method: `GET`
- Path: `/api/route/cached-distance`
- Response DTO: `CachedDistanceResponse`

### Cached Distance (Batch)
- Method: `POST`
- Path: `/api/route/cached-distances`
- Request DTO: `BatchDistanceRequest`
- Response DTO: `BatchDistanceResponse`

### Route Health
- Method: `GET`
- Path: `/api/route/health`
- Response DTO: `String(JSON)`

## Load Plan

### Load Plan
- Method: `POST`
- Path: `/api/load/plan`
- Request DTO: `LoadPlanRequest`
- Response DTO: `LoadPlanResponse`
- Auth role: `ROLE_DRIVER | ROLE_ADMIN`

### Load Plan Confirm
- Method: `POST`
- Path: `/api/load/plan/confirm`
- Request DTO: `LoadPlanRequest`
- Response DTO: `LoadPlanSavedResponse`
- Auth role: `ROLE_DRIVER | ROLE_ADMIN`

## Tracking

### Driver GPS Submit
- Method: `POST`
- Path: `/api/driver/matches/{matchId}/gps`
- Request DTO: `GpsLogUpsertRequest`
- Response DTO: `GpsLogUpsertResponse`
- Auth role: `ROLE_DRIVER`

### Driver Tracking Sharing Update
- Method: `PATCH`
- Path: `/api/driver/matches/{matchId}/tracking-sharing`
- Request DTO: `TrackingShareUpdateRequest`
- Response DTO: `TrackingShareStateResponse`
- Auth role: `ROLE_DRIVER`

### Shipper Tracking View
- Method: `GET`
- Path: `/api/shipper/matches/{matchId}/tracking`
- Response DTO: `TrackingResponse`
- Auth role: `ROLE_SHIPPER`

## Route Assembly

### Route Assembly Recommend
- Method: `POST`
- Path: `/api/route-assembly/recommend`
- Request DTO: `RouteAssemblyRequest`
- Response DTO: `RouteAssemblyResponse`
- Auth role: `ROLE_DRIVER | ROLE_ADMIN | ROLE_OPERATOR`

### Route Assembly Evaluate
- Method: `POST`
- Path: `/api/route-assembly/evaluate`
- Request DTO: `RouteAssemblyRequest`
- Response DTO: `RouteAssemblyResponse`
- Auth role: `ROLE_DRIVER | ROLE_ADMIN | ROLE_OPERATOR`

### Route Assembly Accept
- Method: `POST`
- Path: `/api/route-assembly/accept`
- Request DTO: `RouteAcceptRequest`
- Response DTO: `RouteAcceptResponse`
- Auth role: `ROLE_DRIVER | ROLE_ADMIN`

### Calibration Feedback
- Method: `POST`
- Path: `/api/route-assembly/calibration/feedback`
- Request DTO: `RouteCalibrationFeedbackRequest`
- Response DTO: `RouteCalibrationFeedbackResponse`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Calibration Recompute
- Method: `POST`
- Path: `/api/route-assembly/calibration/recompute`
- Response DTO: `RouteCalibrationStatusResponse`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Calibration Status
- Method: `GET`
- Path: `/api/route-assembly/calibration/status`
- Response DTO: `RouteCalibrationStatusResponse`
- Auth role: `ROLE_ADMIN | ROLE_SUPER | ROLE_OPERATOR | ROLE_CS`

### Route Assembly Health
- Method: `GET`
- Path: `/api/route-assembly/health`
- Response DTO: `String`

## Public Config

### Public Frontend Config
- Method: `GET`
- Path: `/api/config/public`
- Response DTO: `Map<String, String>`

## Legacy GPS APIs (Conditional)

> Enabled only when `gpsload.legacy-api.enabled=true`.

### Legacy Driver GPS Submit
- Method: `POST`
- Path: `/api/gpsload-legacy/driver/matches/{matchId}/gps`
- Request DTO: `GpsLogRequest`
- Response DTO: `Map<String, Object>`

### Legacy Shipper Tracking
- Method: `GET`
- Path: `/api/gpsload-legacy/shipper/matches/{matchId}/tracking`
- Response DTO: `gpsload.gps.model.TrackingResponse`

### Legacy GPS History
- Method: `GET`
- Path: `/api/gpsload-legacy/matches/{matchId}/gps/history`
- Response DTO: `Map<String, Object>`

## Route Assembly Test View

### Route Assembly Test HTML
- Method: `GET`
- Path: `/route-assembly-test-view`
- Response: server-side rendered view `route-assembly-test`
