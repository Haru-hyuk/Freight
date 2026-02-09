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

## Error Response

```json
{
  "success": false,
  "message": "Authentication required.",
  "status": 401
}
```
