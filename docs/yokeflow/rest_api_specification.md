# OptiRoute REST API Specification

This document specifies all REST API endpoints for the OptiRoute application.

## Base URL

```
/api/v1
```

## Common Response Formats

### Success Response

```json
{
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error Response

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }
  }
}
```

## Common Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20, max: 100) |
| `sortBy` | string | Field to sort by |
| `sortOrder` | string | `asc` or `desc` (default: `desc`) |
| `search` | string | Search term for text fields |

---

## Clients API

### List Clients

```
GET /clients
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status: `active`, `inactive`, `suspended`, `archived` |
| `city` | string | Filter by city |
| `search` | string | Search in name, company_name, email |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "John Doe",
      "companyName": "Acme Corp",
      "email": "john@acme.com",
      "phone": "555-1234",
      "addressLine1": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "status": "active",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": { ... }
}
```

### Get Client by ID

```
GET /clients/:id
```

### Create Client

```
POST /clients
```

**Request Body:**
```json
{
  "name": "John Doe",
  "companyName": "Acme Corp",
  "email": "john@acme.com",
  "phone": "555-1234",
  "addressLine1": "123 Main St",
  "addressLine2": "Suite 100",
  "city": "New York",
  "state": "NY",
  "postalCode": "10001",
  "country": "USA",
  "notes": "VIP customer",
  "tags": ["vip", "commercial"]
}
```

**Options (query params):**
- `geocode=true` - Automatically geocode the address

### Update Client

```
PUT /clients/:id
```

**Request Body:** Same as create (all fields optional)

### Delete Client (Soft Delete)

```
DELETE /clients/:id
```

---

## Services API

### List Services

```
GET /services
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status: `active`, `inactive`, `discontinued` |
| `serviceType` | string | Filter by type: `maintenance`, `repair`, `inspection`, etc. |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Standard Maintenance",
      "code": "STD-MAINT",
      "serviceType": "maintenance",
      "description": "Regular maintenance service",
      "averageDurationMinutes": 60,
      "basePrice": 150.00,
      "requiresAppointment": true,
      "status": "active"
    }
  ]
}
```

### Get Service by ID

```
GET /services/:id
```

### Create Service

```
POST /services
```

**Request Body:**
```json
{
  "name": "Standard Maintenance",
  "code": "STD-MAINT",
  "serviceType": "maintenance",
  "description": "Regular maintenance service",
  "averageDurationMinutes": 60,
  "minimumDurationMinutes": 45,
  "maximumDurationMinutes": 90,
  "basePrice": 150.00,
  "priceCurrency": "USD",
  "requiresAppointment": true,
  "maxPerDay": 8,
  "equipmentRequired": ["tools", "parts"],
  "skillsRequired": ["certified-tech"]
}
```

### Update Service

```
PUT /services/:id
```

### Delete Service

```
DELETE /services/:id
```

---

## Locations API

### List Locations

```
GET /locations
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `locationType` | string | Filter: `client`, `depot`, `disposal`, `maintenance`, `home` |
| `clientId` | string | Filter by client ID |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "clientId": "uuid",
      "name": "Main Office",
      "locationType": "client",
      "addressLine1": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "isPrimary": true
    }
  ]
}
```

### Get Location by ID

```
GET /locations/:id
```

### Create Location

```
POST /locations
```

**Request Body:**
```json
{
  "clientId": "uuid",
  "name": "Main Office",
  "locationType": "client",
  "addressLine1": "123 Main St",
  "city": "New York",
  "state": "NY",
  "postalCode": "10001",
  "country": "USA",
  "isPrimary": true,
  "notes": "Front entrance"
}
```

### Update Location

```
PUT /locations/:id
```

### Delete Location

```
DELETE /locations/:id
```

---

## Bookings API

### List Bookings

```
GET /bookings
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status |
| `clientId` | string | Filter by client |
| `serviceId` | string | Filter by service |
| `vehicleId` | string | Filter by assigned vehicle |
| `startDate` | string | Filter by date range start (YYYY-MM-DD) |
| `endDate` | string | Filter by date range end (YYYY-MM-DD) |
| `date` | string | Filter by exact date (YYYY-MM-DD) |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "bookingNumber": "BK-2024-001",
      "clientId": "uuid",
      "serviceId": "uuid",
      "vehicleId": "uuid",
      "locationId": "uuid",
      "bookingType": "one_time",
      "scheduledDate": "2024-01-20",
      "scheduledStartTime": "09:00",
      "scheduledEndTime": "10:00",
      "estimatedDurationMinutes": 60,
      "status": "confirmed",
      "priority": "normal",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "quotedPrice": 150.00
    }
  ],
  "pagination": { ... }
}
```

### Get Booking by ID

```
GET /bookings/:id
```

### Create Booking

```
POST /bookings
```

**Request Body:**
```json
{
  "clientId": "uuid",
  "serviceId": "uuid",
  "locationId": "uuid",
  "scheduledDate": "2024-01-20",
  "scheduledStartTime": "09:00",
  "estimatedDurationMinutes": 60,
  "priority": "normal",
  "specialInstructions": "Call before arrival",
  "internalNotes": "New customer"
}
```

### Update Booking

```
PUT /bookings/:id
```

### Delete Booking

```
DELETE /bookings/:id
```

### Update Booking Status

```
PATCH /bookings/:id/status
```

**Request Body:**
```json
{
  "status": "completed",
  "cancellationReason": "Customer request"
}
```

---

## Vehicles API

### List Vehicles

```
GET /vehicles
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter: `available`, `in_use`, `maintenance`, `out_of_service` |
| `serviceType` | string | Filter by compatible service type ID |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Truck 1",
      "licensePlate": "ABC-1234",
      "make": "Ford",
      "model": "Transit",
      "year": 2022,
      "serviceTypes": ["service-uuid-1", "service-uuid-2"],
      "status": "available",
      "currentLatitude": 40.7128,
      "currentLongitude": -74.0060
    }
  ]
}
```

### Get Vehicle by ID

```
GET /vehicles/:id
```

### Create Vehicle

```
POST /vehicles
```

**Request Body:**
```json
{
  "name": "Truck 1",
  "licensePlate": "ABC-1234",
  "vin": "1HGCM82633A123456",
  "make": "Ford",
  "model": "Transit",
  "year": 2022,
  "color": "White",
  "serviceTypes": ["service-uuid-1", "service-uuid-2"],
  "fuelType": "gasoline",
  "homeLocationId": "location-uuid"
}
```

### Update Vehicle

```
PUT /vehicles/:id
```

### Delete Vehicle

```
DELETE /vehicles/:id
```

### Get Vehicle Locations

```
GET /vehicles/:id/locations
```

### Add Location to Vehicle

```
POST /vehicles/:id/locations
```

**Request Body:**
```json
{
  "locationId": "uuid",
  "isPrimary": true
}
```

### Remove Location from Vehicle

```
DELETE /vehicles/:id/locations/:locationId
```

### Set Primary Location

```
PUT /vehicles/:id/locations/:locationId/primary
```

---

## Routes API

### List Routes

```
GET /routes
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status |
| `vehicleId` | string | Filter by vehicle |
| `startDate` | string | Filter by date range start |
| `endDate` | string | Filter by date range end |
| `date` | string | Filter by exact date |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "routeName": "Route A - 2024-01-20",
      "routeCode": "RA-0120",
      "vehicleId": "uuid",
      "routeDate": "2024-01-20",
      "plannedStartTime": "08:00",
      "plannedEndTime": "17:00",
      "totalDistanceKm": 45.5,
      "totalDurationMinutes": 480,
      "totalStops": 8,
      "optimizationType": "balanced",
      "status": "planned",
      "stopSequence": ["booking-uuid-1", "booking-uuid-2"]
    }
  ],
  "pagination": { ... }
}
```

### Get Route by ID

```
GET /routes/:id
```

Returns full route details including expanded booking information.

### Create Route

```
POST /routes
```

**Request Body:**
```json
{
  "routeName": "Route A - 2024-01-20",
  "vehicleId": "uuid",
  "routeDate": "2024-01-20",
  "plannedStartTime": "08:00",
  "optimizationType": "balanced"
}
```

### Update Route

```
PUT /routes/:id
```

### Delete Route

```
DELETE /routes/:id
```

### Plan Routes (Generate Optimized Routes)

```
POST /routes/plan
```

**Request Body:**
```json
{
  "routeDate": "2024-01-20",
  "serviceId": "uuid",
  "maxStopsPerRoute": 15,
  "returnToStart": true,
  "routingPreference": "TRAFFIC_AWARE",
  "vehicleAllocations": [
    {
      "vehicleId": "uuid",
      "bookingCount": 8,
      "startLocationId": "depot-uuid",
      "endLocationId": "depot-uuid"
    }
  ]
}
```

**Response:**
```json
{
  "routes": [...],
  "unassignedBookings": [...],
  "summary": {
    "totalBookings": 20,
    "assignedBookings": 18,
    "routesCreated": 3,
    "vehiclesUsed": 3
  },
  "warnings": ["2 bookings have no coordinates"]
}
```

### Preview Route Plan

```
POST /routes/preview
```

Same request body as `/routes/plan`, but does not save routes to database.

### Get Route Statistics

```
GET /routes/stats
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `startDate` | string | Start date (required) |
| `endDate` | string | End date (required) |

**Response:**
```json
{
  "totalRoutes": 50,
  "completedRoutes": 45,
  "totalDistance": 1250.5,
  "totalDuration": 24000,
  "averageStopsPerRoute": 8.5,
  "vehicleUtilization": {
    "vehicle-uuid-1": 0.85,
    "vehicle-uuid-2": 0.72
  }
}
```

---

## Geocoding API

### Address Autocomplete

```
GET /geocoding/autocomplete
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `input` | string | Search text (required) |
| `region` | string | Country code (e.g., `us`) |
| `sessionToken` | string | Session token for billing |

**Response:**
```json
{
  "predictions": [
    {
      "placeId": "ChIJ...",
      "description": "123 Main St, New York, NY, USA",
      "mainText": "123 Main St",
      "secondaryText": "New York, NY, USA",
      "types": ["street_address"]
    }
  ]
}
```

### Geocode Address

```
POST /geocoding/geocode
```

**Request Body:**
```json
{
  "address": "123 Main St, New York, NY 10001",
  "region": "us"
}
```

**Response:**
```json
{
  "formattedAddress": "123 Main St, New York, NY 10001, USA",
  "coordinates": {
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "placeId": "ChIJ...",
  "locationType": "ROOFTOP",
  "addressComponents": {
    "streetNumber": "123",
    "route": "Main St",
    "locality": "New York",
    "administrativeAreaLevel1": "NY",
    "postalCode": "10001",
    "country": "USA"
  }
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `NOT_FOUND` | 404 | Resource not found |
| `DUPLICATE_ERROR` | 409 | Resource already exists |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Permission denied |
| `INTERNAL_ERROR` | 500 | Server error |
| `GOOGLEMAPS_ERROR` | 502 | Google Maps API error |
| `DATABASE_ERROR` | 500 | Database operation failed |

## HTTP Status Codes

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (successful delete) |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 500 | Internal Server Error |
| 502 | Bad Gateway (external API error) |
