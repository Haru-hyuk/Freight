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

## Error Response

```json
{
  "success": false,
  "message": "Authentication required.",
  "status": 401
}
```
