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
    },
    {
      "checklistItemId": 8,
      "extraInput": null,
      "extraFee": 0.0
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

### Quote Validate
- Method: `POST`
- Path: `/api/shipper/quotes/validate`
- Request: Quote Create와 동일
- Response
```json
{
  "estimatedMinPrice": 150000,
  "estimatedMaxPrice": 190000,
  "estimatedWeightedPrice": 172000,
  "comments": [
    "희망금액이 예상 최저가의 85% 미만입니다. 매칭이 어려울 수 있어요.",
    "화물 특성상 파손주의/충격주의 체크리스트를 고려해보세요."
  ]
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
