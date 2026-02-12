# API Spec

## Auth

### Driver Signup
- Method: `POST`
- Path: `/api/auth/driver/signup`
- Request
```json
{
  "email": "driver@test.com",
  "password": "1234",
  "name": "홍길동",
  "phone": "010-0000-0000",
  "address": "서울시 강남구",
  "addressDetail": "101호",
  "bankName": "국민",
  "bankAccount": "123-456-7890"
}
```
- Response
```json
{
  "driverId": 1
}
```
- Errors
- `400 INVALID_INPUT_VALUE`: 이메일 중복

### Driver Login
- Method: `POST`
- Path: `/api/auth/driver/login`
- Request
```json
{
  "email": "driver@test.com",
  "password": "1234"
}
```
- Response
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "tokenType": "Bearer",
  "expiresIn": 3600
}
```

### Shipper Login
- Method: `POST`
- Path: `/api/auth/shipper/login`
- Request
```json
{
  "email": "shipper@test.com",
  "password": "1234"
}
```
- Response
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "tokenType": "Bearer",
  "expiresIn": 3600
}
```

### Admin Login
- Method: `POST`
- Path: `/api/auth/admin/login`
- Request
```json
{
  "email": "admin@test.com",
  "password": "1234"
}
```
- Response
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "tokenType": "Bearer",
  "expiresIn": 3600
}
```

### Shipper Signup
- Method: `POST`
- Path: `/api/auth/shipper/signup`
- Request
```json
{
  "email": "shipper@test.com",
  "password": "1234",
  "name": "홍길동",
  "companyName": "테스트상사",
  "phone": "010-1234-5678",
  "address": "서울시 강남구",
  "addressDetail": "101호",
  "bizRegNo": "1234567890",
  "bizPhone": "02-123-4567",
  "openDate": "20200101",
  "ownerName": "홍길동"
}
```
- Response
```json
{
  "shipperId": 1
}
```
- Notes
- 회원가입 시 국세청 사업자 진위확인 수행
- 진위확인 결과 `valid != "01"`이면 가입 실패
- Errors
- `400 INVALID_INPUT_VALUE`: 이메일 중복 또는 사업자 진위확인 실패

### Logout
- Method: `POST`
- Path: `/api/auth/logout`
- Headers: `Authorization: Bearer {accessToken}`
- Response: `204 No Content`


## Driver

### Truck Create
- Method: `POST`
- Path: `/api/driver/trucks`
- Request
```json
{
  "vehicleType": "CARGO",
  "vehicleBodyType": "WINGBODY",
  "tonnage": 1.0,
  "maxWeight": 1000.0,
  "maxVolume": 12.5,
  "name": "My Truck",
  "imageUrl": "https://example.com/truck.png",
  "approved": false,
  "insurance": "ACME-1234",
  "odometerKm": 12034.5,
  "lastInspectionDate": "2025-01-15"
}
```
- Response
```json
{
  "truckId": 1
}
```

### Truck List
- Method: `GET`
- Path: `/api/driver/trucks`
- Response
```json
[
  {
    "truckId": 1,
    "driverId": 10,
    "vehicleType": "CARGO",
    "vehicleBodyType": "WINGBODY",
    "tonnage": 1.0,
    "maxWeight": 1000.0,
    "maxVolume": 12.5,
    "name": "My Truck",
    "imageUrl": "https://example.com/truck.png",
    "approved": false,
    "insurance": "ACME-1234",
    "odometerKm": 12034.5,
    "lastInspectionDate": "2025-01-15",
    "createdAt": "2025-01-01T10:00:00",
    "updatedAt": "2025-01-01T10:00:00"
  }
]
```

### Truck Detail
- Method: `GET`
- Path: `/api/driver/trucks/{truckId}`
- Response
```json
{
  "truckId": 1,
  "driverId": 10,
  "vehicleType": "CARGO",
  "vehicleBodyType": "WINGBODY",
  "tonnage": 1.0,
  "maxWeight": 1000.0,
  "maxVolume": 12.5,
  "name": "My Truck",
  "imageUrl": "https://example.com/truck.png",
  "approved": false,
  "insurance": "ACME-1234",
  "odometerKm": 12034.5,
  "lastInspectionDate": "2025-01-15",
  "createdAt": "2025-01-01T10:00:00",
  "updatedAt": "2025-01-01T10:00:00"
}
```

### Truck Update
- Method: `PUT`
- Path: `/api/driver/trucks/{truckId}`
- Request
```json
{
  "vehicleType": "CARGO",
  "vehicleBodyType": "WINGBODY",
  "tonnage": 1.5,
  "maxWeight": 1200.0,
  "maxVolume": 13.0,
  "name": "Updated Truck",
  "imageUrl": "https://example.com/truck2.png",
  "approved": true,
  "insurance": "ACME-5678",
  "odometerKm": 13000.0,
  "lastInspectionDate": "2025-02-01"
}
```
- Response
```json
{
  "truckId": 1,
  "driverId": 10,
  "vehicleType": "CARGO",
  "vehicleBodyType": "WINGBODY",
  "tonnage": 1.5,
  "maxWeight": 1200.0,
  "maxVolume": 13.0,
  "name": "Updated Truck",
  "imageUrl": "https://example.com/truck2.png",
  "approved": true,
  "insurance": "ACME-5678",
  "odometerKm": 13000.0,
  "lastInspectionDate": "2025-02-01",
  "createdAt": "2025-01-01T10:00:00",
  "updatedAt": "2025-01-02T10:00:00"
}
```

### Truck Delete
- Method: `DELETE`
- Path: `/api/driver/trucks/{truckId}`
- Response: `204 No Content`

## Shipper

### Quote Create
- Method: `POST`
- Path: `/api/shipper/quotes`
- Request
```json
{
  "truckId": 1,
  "originAddress": "Seoul, KR",
  "destinationAddress": "Busan, KR",
  "originLat": 37.5665,
  "originLng": 126.9780,
  "destinationLat": 35.1796,
  "destinationLng": 129.0756,
  "distanceKm": 325,
  "weightKg": 1200,
  "volumeCbm": 10,
  "vehicleType": "TON_1",
  "vehicleBodyType": "CARGO",
  "cargoName": "냉동 해산물",
  "cargoType": "FROZEN",
  "cargoDesc": "Frozen seafood",
  "desiredPrice": 170000,
  "allowCombine": true,
  "loadMethod": "SHIPPER",
  "unloadMethod": "DRIVER",
  "checklistItems": [
    {
      "checklistItemId": 3,
      "extraInput": "Forklift needed",
      "extraFee": 20000.0
    }
  ]
}
```
- Response
```json
{
  "quoteId": 1
}
```

### Quote List
- Method: `GET`
- Path: `/api/shipper/quotes`
- Response
```json
[
  {
    "quoteId": 1,
    "truckId": 1,
    "originAddress": "Seoul, KR",
    "destinationAddress": "Busan, KR",
  "distanceKm": 325,
  "vehicleType": "TON_1",
  "vehicleBodyType": "CARGO",
  "cargoName": "냉동 해산물",
  "desiredPrice": 170000,
    "finalPrice": 170000,
    "status": "OPEN",
    "createdAt": "2025-01-01T10:00:00"
  }
]
```

### Quote Detail
- Method: `GET`
- Path: `/api/shipper/quotes/{quoteId}`
- Response
```json
{
  "quoteId": 1,
  "shipperId": 20,
  "truckId": 1,
  "originAddress": "Seoul, KR",
  "destinationAddress": "Busan, KR",
  "originLat": 37.5665,
  "originLng": 126.9780,
  "destinationLat": 35.1796,
  "destinationLng": 129.0756,
  "distanceKm": 325,
  "weightKg": 1200,
  "volumeCbm": 10,
  "vehicleType": "TON_1",
  "vehicleBodyType": "CARGO",
  "cargoName": "냉동 해산물",
  "cargoType": "FROZEN",
  "cargoDesc": "Frozen seafood",
  "basePrice": 100000,
  "distancePrice": 50000,
  "extraPrice": 20000,
  "desiredPrice": 170000,
  "finalPrice": 170000,
  "allowCombine": true,
  "loadMethod": "SHIPPER",
  "unloadMethod": "DRIVER",
  "status": "OPEN",
  "createdAt": "2025-01-01T10:00:00",
  "updatedAt": "2025-01-01T10:00:00",
  "checklistItems": [
    {
      "checklistItemId": 3,
      "extraInput": "Forklift needed",
      "extraFee": 20000.0
    }
  ]
}
```

### Quote Update
- Method: `PUT`
- Path: `/api/shipper/quotes/{quoteId}`
- Request
```json
{
  "truckId": 1,
  "originAddress": "Seoul, KR",
  "destinationAddress": "Busan, KR",
  "originLat": 37.5665,
  "originLng": 126.9780,
  "destinationLat": 35.1796,
  "destinationLng": 129.0756,
  "distanceKm": 325,
  "weightKg": 1200,
  "volumeCbm": 10,
  "vehicleType": "TON_1",
  "vehicleBodyType": "CARGO",
  "cargoName": "냉동 해산물",
  "cargoType": "FROZEN",
  "cargoDesc": "Frozen seafood",
  "desiredPrice": 170000,
  "allowCombine": true,
  "loadMethod": "SHIPPER",
  "unloadMethod": "DRIVER",
  "checklistItems": [
    {
      "checklistItemId": 3,
      "extraInput": "Forklift needed",
      "extraFee": 20000.0
    }
  ]
}
```
- Response
```json
{
  "quoteId": 1,
  "shipperId": 20,
  "truckId": 1,
  "originAddress": "Seoul, KR",
  "destinationAddress": "Busan, KR",
  "originLat": 37.5665,
  "originLng": 126.9780,
  "destinationLat": 35.1796,
  "destinationLng": 129.0756,
  "distanceKm": 325,
  "weightKg": 1200,
  "volumeCbm": 10,
  "vehicleType": "TON_1",
  "vehicleBodyType": "CARGO",
  "cargoName": "냉동 해산물",
  "cargoType": "FROZEN",
  "cargoDesc": "Frozen seafood",
  "basePrice": 100000,
  "distancePrice": 50000,
  "extraPrice": 20000,
  "desiredPrice": 170000,
  "finalPrice": 170000,
  "allowCombine": true,
  "loadMethod": "SHIPPER",
  "unloadMethod": "DRIVER",
  "status": "OPEN",
  "createdAt": "2025-01-01T10:00:00",
  "updatedAt": "2025-01-02T10:00:00",
  "checklistItems": [
    {
      "checklistItemId": 3,
      "extraInput": "Forklift needed",
      "extraFee": 20000.0
    }
  ]
}
```

### Quote Delete
- Method: `DELETE`
- Path: `/api/shipper/quotes/{quoteId}`
- Response: `204 No Content`

## Checklist

### Checklist Items
- Method: `GET`
- Path: `/api/checklist-items`
- Response
```json
[
  {
    "checklistItemId": 1,
    "category": "REQUEST",
    "name": "FRAGILE",
    "icon": "fragile",
    "hasExtraFee": true,
    "baseExtraFee": 5000.0,
    "requiresExtraInput": false,
    "extraInputLabel": "취급 주의 요망",
    "sortOrder": 1
  },
  {
    "checklistItemId": 2,
    "category": "REQUEST",
    "name": "UPRIGHT",
    "icon": "upright",
    "hasExtraFee": true,
    "baseExtraFee": 3000.0,
    "requiresExtraInput": false,
    "extraInputLabel": "눕힘 금지",
    "sortOrder": 2
  },
  {
    "checklistItemId": 3,
    "category": "REQUEST",
    "name": "KEEP_DRY",
    "icon": "umbrella",
    "hasExtraFee": true,
    "baseExtraFee": 5000.0,
    "requiresExtraInput": false,
    "extraInputLabel": "비/물기 주의",
    "sortOrder": 3
  },
  {
    "checklistItemId": 5,
    "category": "REQUEST",
    "name": "EASY_BREAK",
    "icon": "shock",
    "hasExtraFee": true,
    "baseExtraFee": 5000.0,
    "requiresExtraInput": false,
    "extraInputLabel": "충격 최소화",
    "sortOrder": 4
  }
]
```

## Error Response

```json
{
  "success": false,
  "message": "Authentication required.",
  "status": 401
}
```


## Quote Stops

- Quote Create/Update ??? `stops` ??? ??? ? ????.
- Quote Detail ??? `stops` ??? ?????.

```json
"stops": [
  {
    "seq": 1,
    "address": "Incheon, KR",
    "lat": 37.4563,
    "lng": 126.7052,
    "contactName": "???A",
    "contactPhone": "010-0000-0000",
    "deptName": "???",
    "managerName": "???"
  }
]
```

## Counter Offer (Driver/ Shipper)

### Driver Counter Offer Create
- Method: `POST`
- Path: `/api/driver/quotes/{quoteId}/counter-offers`
- Request
```json
{
  "proposedPrice": 240000,
  "message": "??? ?? ??? ??? ??? ?? ?? ??????."
}
```
- Response
```json
{
  "counterOfferId": 1,
  "quoteId": 10,
  "driverId": 7,
  "proposedPrice": 240000,
  "message": "??? ?? ??? ??? ??? ?? ?? ??????.",
  "status": "PENDING",
  "createdAt": "2025-01-01T10:00:00",
  "respondedAt": null
}
```

### Driver Counter Offer List (Me)
- Method: `GET`
- Path: `/api/driver/counter-offers/me`

### Shipper Counter Offer List
- Method: `GET`
- Path: `/api/shipper/quotes/{quoteId}/counter-offers`

### Shipper Counter Offer Accept
- Method: `PATCH`
- Path: `/api/shipper/counter-offers/{offerId}/accept`
- Response: `204 No Content`

### Shipper Counter Offer Reject
- Method: `PATCH`
- Path: `/api/shipper/counter-offers/{offerId}/reject`
- Response: `204 No Content`

## Notifications

### Notification List (Me)
- Method: `GET`
- Path: `/api/notifications/me`
- Response
```json
[
  {
    "notificationId": 1,
    "matchId": 10,
    "type": "COUNTER_OFFER_CREATED",
    "message": "???? ??? ??? ??????.",
    "isRead": false,
    "createdAt": "2025-01-01T10:00:00"
  }
]
```

### Notification Unread Count
- Method: `GET`
- Path: `/api/notifications/me/unread-count`
- Response
```json
{
  "unreadCount": 3
}
```

### Notification Mark Read
- Method: `PATCH`
- Path: `/api/notifications/{notificationId}/read`
- Response: `204 No Content`
