# Shipper Quote Contract Matrix (2026-03-04)

Source of truth: `apps/mobile/src/shared/api/generated/**` (orval-generated)

## 1) Quote

### QuoteCreateRequest (`quote-controller.createQuote`, `quote-controller.validateQuote`)
- required: `originAddress`, `destinationAddress`, `weightKg`, `vehicleType`, `vehicleBodyType`, `cargoName`, `cargoType`, `loadMethod`, `unloadMethod`
- optional:
`truckId`, `originLat`, `originLng`, `destinationLat`, `destinationLng`, `distanceKm`, `volumeCbm`, `cargoDesc`, `basePrice`, `distancePrice`, `desiredPrice`, `allowCombine`, `checklistItems[]`, `quoteItems[]`, `stops[]`

### QuoteUpdateRequest (`quote-controller.updateQuote`)
- all fields optional (same field set as create)

### QuoteCreateResponse (`quote-controller.createQuote`)
- fields:
`quoteId`, `quotePublicId`, `originLat`, `originLng`, `destinationLat`, `destinationLng`, `stops[]`

### QuoteListResponse (`quote-controller.listQuotes`)
- fields:
`quoteId`, `quotePublicId`, `truckId`, `originAddress`, `destinationAddress`, `distanceKm`, `vehicleType`, `vehicleBodyType`, `cargoName`, `desiredPrice`, `finalPrice`, `status`, `createdAt`

### QuoteDetailResponse (`quote-controller.getQuote`, `quote-controller.updateQuote`)
- fields:
`quoteId`, `quotePublicId`, `shipperId`, `truckId`, `originAddress`, `destinationAddress`, `originLat`, `originLng`, `destinationLat`, `destinationLng`, `distanceKm`, `weightKg`, `volumeCbm`, `vehicleType`, `vehicleBodyType`, `cargoName`, `cargoType`, `cargoDesc`, `basePrice`, `distancePrice`, `extraPrice`, `desiredPrice`, `finalPrice`, `allowCombine`, `loadMethod`, `unloadMethod`, `status`, `createdAt`, `updatedAt`, `quoteItems[]`, `checklistItems[]`, `stops[]`

### QuoteValidationResponse (`quote-controller.validateQuote`)
- fields:
`estimatedMinPrice`, `estimatedMaxPrice`, `estimatedWeightedPrice`, `comments[]`, `overallStatus`, `dispatchSpeed`, `badge`, `loadAnalysis`, `priceAnalysis`, `confidence`, `aiSummary`, `reasons[]`, `actions[]`
- nested:
`loadAnalysis.{currentKg, capacityKg, usagePercent, safety(SAFE|WARN|RISK), label}`
`priceAnalysis.{userDesiredPrice, minPrice, maxPrice, weightedPrice, suggestedPrice, fit(LOW|NORMAL|HIGH), label}`
- enum:
`overallStatus`: `GOOD|NORMAL|RISKY`
`dispatchSpeed`: `FAST|NORMAL|SLOW`

## 2) Shipper Match

### MatchCreateRequest (`shipper-match-controller.createMatch`)
- required: `quoteId`

### MatchResponse (`shipper-match-controller.createMatch/getMatch/getMyMatches`)
- fields:
`matchId`, `quoteId`, `driverId`, `accepted`, `status`, `matchGroupKey`, `matchGroupType`, `matchGroupOrder`, `locationSharingEnabled`, `locationSharingUpdatedAt`, `acceptedAt`, `createdAt`, `updatedAt`
- note:
`status` is string in schema (not enum), so parser keeps canonical token (only spelling normalize: `CANCELLED -> CANCELED`)

## 3) Payment

### PaymentPrepareRequest (`payment-controller.prepare`)
- required: `matchId`, `amount`
- optional: `orderName`

### PaymentPrepareResponse (`payment-controller.prepare`)
- fields:
`paymentId`, `orderId`, `amount`, `orderName`, `clientKey`

### PaymentConfirmRequest (`payment-controller.confirm`)
- required: `paymentKey`, `orderId`, `amount`

### PaymentResponse (`payment-controller.confirm/getByMatchId/getById/getMyPayments`)
- fields:
`paymentId`, `matchId`, `orderNo`, `method`, `status`, `paidAt`, `attemptId`, `amountType`, `pgRef`, `totalAmount`, `createdAt`
- enum:
`status`: `PENDING|COMPLETED|FAILED|REFUNDED`
`method`: `CARD|TRANSFER|PREPAID`

## 4) Status Interpretation (Shipper UI)

Single SoT function:
`shared/lib/policy/quoteStatusResolver.ts#resolveEffectiveQuoteStatus`

- quote raw -> canonical QuoteStatusApi:
`OPEN, NEGOTIATING, ASSIGNED, PREPARING, DRIVING, ACCEPTED, PICKUP, TRANSIT, DROPOFF, CANCELED`
- match promotion:
`READY` is promoted only when `accepted === true`
- payment promotion:
`payment.status === COMPLETED` and quote in pre-payment stage => `PREPARING`

Customer UI state mapping:
`shared/lib/policy/customerPolicy.ts#getCustomerUiStateFromBackendStatus`
