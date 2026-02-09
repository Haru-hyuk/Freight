# API Spec

## Auth

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
  "cargoType": "FROZEN",
  "cargoDesc": "Frozen seafood",
  "basePrice": 100000,
  "distancePrice": 50000,
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
  "cargoType": "FROZEN",
  "cargoDesc": "Frozen seafood",
  "basePrice": 100000,
  "distancePrice": 50000,
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
    "category": "VEHICLE",
    "name": "LIFT_WINGBODY",
    "icon": "lift_wing",
    "hasExtraFee": true,
    "baseExtraFee": 30000.0,
    "requiresExtraInput": false,
    "extraInputLabel": null,
    "sortOrder": 1
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
