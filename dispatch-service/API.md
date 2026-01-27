# Dispatch Service API Documentation

## Overview

The Dispatch Service provides REST APIs for sending route assignments to drivers via Telegram and Email channels. This document describes the API endpoints, request/response formats, and integration patterns for UI developers.

## Base URL

- **Production (Embedded):** `https://fleetillo.imagicrafterai.com/dispatch`
- **Production (Standalone):** `https://your-dispatch-service-url`
- **Local Development:** `http://localhost:3001`

In embedded mode, all endpoints are prefixed with `/dispatch`. For example:
- Health: `GET /dispatch/api/v1/health`
- Dispatch: `POST /dispatch/api/v1/dispatch`

## Authentication

All dispatch endpoints (except `/health`) require API key authentication.

**Header:**
```
X-API-Key: your-api-key
```

**Example:**
```bash
curl -H "X-API-Key: your-api-key" https://your-app-url/api/v1/dispatch
```

## API Endpoints

### 1. Single Dispatch

Send a route assignment to a single driver.

**Endpoint:** `POST /api/v1/dispatch`

**Request Body:**
```json
{
  "route_id": "uuid",           // Required: Route UUID
  "driver_id": "uuid",          // Required: Driver UUID
  "channels": ["telegram"],     // Optional: Override channels (telegram, email)
  "multi_channel": false,       // Optional: Send to all available channels
  "metadata": {                 // Optional: Additional context
    "dispatched_by": "user-id",
    "notes": "Urgent delivery"
  }
}
```

**Response (200 OK):**
```json
{
  "dispatch_id": "uuid",
  "status": "pending",
  "requested_channels": ["telegram"]
}
```

**Status Values:**
- `pending` - Dispatch created, not yet processed
- `sending` - Currently sending to channels
- `delivered` - At least one channel succeeded
- `partial` - Some channels succeeded, some failed
- `failed` - All channels failed

**Error Responses:**

  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "route_id": "Required field missing"
    }
  },
  "requestId": "correlation-id"
}
```

**401 Unauthorized** - Missing or invalid API key:
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing or invalid API key"
  },
  "requestId": "correlation-id"
}
```

**404 Not Found** - Route or driver not found:
```json
{
  "error": {
    "code": "ROUTE_NOT_FOUND",
    "message": "Route not found: uuid"
  },
  "requestId": "correlation-id"
}
```

**Example Usage:**
```javascript
// JavaScript/TypeScript example
async function dispatchRoute(routeId, driverId) {
  const response = await fetch('http://localhost:3001/api/v1/dispatch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'your-api-key'
    },
    body: JSON.stringify({
      route_id: routeId,
      driver_id: driverId
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  return await response.json();
}
```

---

### 2. Batch Dispatch

Send route assignments to multiple drivers in a single request.

**Endpoint:** `POST /api/v1/dispatch/batch`

**Request Body:**
```json
{
  "dispatches": [
    {
      "route_id": "uuid-1",
      "driver_id": "uuid-1"
    },
    {
      "route_id": "uuid-2",
      "driver_id": "uuid-2",
      "channels": ["email"]
    }
  ]
}
```

**Limits:**
- Maximum 100 dispatches per batch
- Minimum 1 dispatch per batch

**Response (200 OK):**
```json
{
  "results": [
    {
      "index": 0,
      "success": true,
      "dispatch_id": "uuid-1",
      "error": null
    },
    {
      "index": 1,
      "success": false,
      "dispatch_id": null,
      "error": "Driver not found: uuid-2"
    }
  ],
  "summary": {
    "total": 2,
    "successful": 1,
    "failed": 1
  }
}
```

**Error Responses:**

**400 Bad Request** - Empty batch or too large:
```json
{
  "error": {
    "code": "EMPTY_BATCH",
    "message": "Batch array cannot be empty"
  },
  "requestId": "correlation-id"
}
```

```json
{
  "error": {
    "code": "BATCH_TOO_LARGE",
    "message": "Batch size exceeds maximum of 100 items"
  },
  "requestId": "correlation-id"
}
```

**Example Usage:**
```javascript
async function dispatchMultipleRoutes(dispatches) {
  const response = await fetch('http://localhost:3001/api/v1/dispatch/batch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'your-api-key'
    },
    body: JSON.stringify({ dispatches })
  });
  
  const result = await response.json();
  
  // Handle partial failures
  const failures = result.results.filter(r => !r.success);
  if (failures.length > 0) {
    console.warn(`${failures.length} dispatches failed:`, failures);
  }
  
  return result;
}
```

---

### 3. Get Dispatch Status

Retrieve the status of a dispatch, including channel delivery details.

**Endpoint:** `GET /api/v1/dispatch/:id`

**Parameters:**
- `id` - Dispatch UUID (path parameter)

**Response (200 OK):**
```json
{
  "id": "dispatch-uuid",
  "route_id": "route-uuid",
  "driver_id": "driver-uuid",
  "status": "delivered",
  "requested_channels": ["telegram", "email"],
  "channel_dispatches": [
    {
      "channel": "telegram",
      "status": "delivered",
      "provider_message_id": "12345",
      "error_message": null,
      "sent_at": "2026-01-16T10:30:00Z",
      "delivered_at": "2026-01-16T10:30:01Z"
    },
    {
      "channel": "email",
      "status": "failed",
      "provider_message_id": null,
      "error_message": "Invalid email address",
      "sent_at": "2026-01-16T10:30:00Z",
      "delivered_at": null
    }
  ],
  "created_at": "2026-01-16T10:30:00Z",
  "updated_at": "2026-01-16T10:30:02Z"
}
```

**Channel Dispatch Status Values:**
- `pending` - Not yet attempted
- `sending` - Currently sending
- `delivered` - Successfully delivered
- `failed` - Delivery failed

**Error Responses:**

**404 Not Found** - Dispatch not found:
```json
{
  "error": {
    "code": "DISPATCH_NOT_FOUND",
    "message": "Dispatch not found: uuid"
  },
  "requestId": "correlation-id"
}
```

**Example Usage:**
```javascript
async function getDispatchStatus(dispatchId) {
  const response = await fetch(
    `http://localhost:3001/api/v1/dispatch/${dispatchId}`,
    {
      headers: {
        'X-API-Key': 'your-api-key'
      }
    }
  );
  
  if (!response.ok) {
    if (response.status === 404) {
      return null; // Dispatch not found
    }
    throw new Error('Failed to fetch dispatch status');
  }
  
  return await response.json();
}
```

---

### 4. Health Check

Check the health status of the dispatch service and its dependencies.

**Endpoint:** `GET /api/v1/health`

**Authentication:** None required (public endpoint)

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-17T05:08:42.712Z",
  "components": {
    "database": {
      "status": "healthy"
    },
    "telegram": {
      "status": "healthy"
    },
    "email": {
      "status": "healthy"
    }
  }
}
```

**Response (503 Service Unavailable):**
```json
{
  "status": "degraded",
  "timestamp": "2026-01-17T04:54:53.801Z",
  "components": {
    "database": {
      "status": "healthy"
    },
    "telegram": {
      "status": "degraded",
      "error": "Telegram bot token is not configured"
    },
    "email": {
      "status": "degraded",
      "error": "Email provider is not configured"
    }
  }
}
```

**Status Values:**
- `healthy` - All dependencies available
- `degraded` - Some non-critical dependencies unavailable
- `unhealthy` - Critical dependencies unavailable

**Component Status Values:**
- `healthy` - Service available and configured
- `degraded` - Service not configured or unavailable (includes error message)

**Example Usage:**
```javascript
async function checkServiceHealth() {
  const response = await fetch('/dispatch/api/v1/health');
  const health = await response.json();

  if (health.status !== 'healthy') {
    console.warn('Dispatch service is not healthy:', health);
  }

  return health;
}
```

---

### 5. Telegram Registration Link

Generate a Telegram registration link and QR code for a driver.

**Endpoint:** `GET /api/v1/telegram/registration/:driverId`

**Parameters:**
- `driverId` - Driver UUID (path parameter)

**Response (200 OK):**
```json
{
  "driverId": "3d219b3d-986b-47c1-a065-462f91d50fa4",
  "driverName": "Test Driver",
  "registrationLink": "https://t.me/route_dispatch_bot?start=3d219b3d-986b-47c1-a065-462f91d50fa4",
  "qrCodeUrl": "https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=...",
  "alreadyRegistered": false
}
```

**Error Responses:**

**404 Not Found** - Driver not found:
```json
{
  "error": {
    "code": "DRIVER_NOT_FOUND",
    "message": "Driver not found"
  },
  "requestId": "correlation-id"
}
```

**503 Service Unavailable** - Telegram not configured:
```json
{
  "error": {
    "code": "TELEGRAM_NOT_CONFIGURED",
    "message": "Telegram bot is not configured"
  },
  "requestId": "correlation-id"
}
```

**Example Usage:**
```javascript
async function getDriverRegistrationLink(driverId) {
  const response = await fetch(`/dispatch/api/v1/telegram/registration/${driverId}`, {
    headers: { 'X-API-Key': 'your-api-key' }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }

  return await response.json();
}
```

---

### 6. Send Registration Email

Send an email to a driver with their Telegram registration link and QR code.

**Endpoint:** `POST /api/v1/telegram/send-registration`

**Request Body:**
```json
{
  "driverId": "uuid",           // Required: Driver UUID
  "customMessage": "string"     // Optional: Custom message to include
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Registration email sent successfully",
  "driverId": "3d219b3d-986b-47c1-a065-462f91d50fa4",
  "email": "driver@example.com"
}
```

**Error Responses:**

**400 Bad Request** - Driver has no email:
```json
{
  "error": {
    "code": "NO_EMAIL",
    "message": "Driver does not have an email address configured"
  },
  "requestId": "correlation-id"
}
```

**404 Not Found** - Driver not found:
```json
{
  "error": {
    "code": "DRIVER_NOT_FOUND",
    "message": "Driver not found"
  },
  "requestId": "correlation-id"
}
```

**503 Service Unavailable** - Email not configured:
```json
{
  "error": {
    "code": "EMAIL_NOT_CONFIGURED",
    "message": "Email service (resend) is not configured"
  },
  "requestId": "correlation-id"
}
```

**Example Usage:**
```javascript
async function sendRegistrationEmail(driverId) {
  const response = await fetch('/dispatch/api/v1/telegram/send-registration', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'your-api-key'
    },
    body: JSON.stringify({ driverId })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }

  return await response.json();
}
```

---

### 7. Telegram Webhook

Receives updates from Telegram when drivers interact with the bot.

**Endpoint:** `POST /api/v1/telegram/webhook`

**Authentication:** None required (Telegram sends updates directly)

**Note:** This endpoint is called by Telegram, not by your application. After deployment, register the webhook URL with Telegram:

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://fleetillo.imagicrafterai.com/dispatch/api/v1/telegram/webhook"
```

The webhook handles:
- `/start <driver_id>` - Links driver's Telegram account to their driver record
- General messages - Responds with help information

---

## UI Integration Patterns

### Pattern 1: Dispatch Single Route

**Use Case:** User clicks "Send to Driver" button on a route detail page.

```javascript
// routes.html or routes page component
async function handleSendToDriver(routeId, driverId) {
  try {
    // Show loading state
    showLoading('Sending route to driver...');
    
    // Call dispatch API
    const result = await dispatchRoute(routeId, driverId);
    
    // Show success message
    showSuccess(`Route dispatched successfully! Dispatch ID: ${result.dispatch_id}`);
    
    // Optionally poll for status
    setTimeout(() => checkDispatchStatus(result.dispatch_id), 5000);
    
  } catch (error) {
    showError(`Failed to dispatch route: ${error.message}`);
  } finally {
    hideLoading();
  }
}
```

### Pattern 2: Batch Dispatch All Routes

**Use Case:** User clicks "Send All Routes" button to dispatch all routes for the day.

```javascript
// routes.html or routes page component
async function handleSendAllRoutes(routes) {
  try {
    showLoading('Dispatching all routes...');
    
    // Prepare batch request
    const dispatches = routes.map(route => ({
      route_id: route.id,
      driver_id: route.driver_id
    }));
    
    // Call batch dispatch API
    const result = await dispatchMultipleRoutes(dispatches);
    
    // Show summary
    const { successful, failed } = result.summary;
    if (failed === 0) {
      showSuccess(`All ${successful} routes dispatched successfully!`);
    } else {
      showWarning(
        `${successful} routes dispatched, ${failed} failed. ` +
        `Check the results for details.`
      );
      
      // Show failed dispatches
      const failures = result.results.filter(r => !r.success);
      displayFailures(failures);
    }
    
  } catch (error) {
    showError(`Failed to dispatch routes: ${error.message}`);
  } finally {
    hideLoading();
  }
}
```

### Pattern 3: Check Dispatch Status

**Use Case:** Show delivery status in the UI after dispatching.

```javascript
// Polling pattern for status updates
async function pollDispatchStatus(dispatchId, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await getDispatchStatus(dispatchId);
    
    if (!status) {
      return null; // Dispatch not found
    }
    
    // Check if dispatch is complete
    if (['delivered', 'partial', 'failed'].includes(status.status)) {
      return status;
    }
    
    // Wait before next poll (exponential backoff)
    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(1.5, i)));
  }
  
  // Timeout - dispatch still in progress
  return await getDispatchStatus(dispatchId);
}

// Usage
const finalStatus = await pollDispatchStatus(dispatchId);
if (finalStatus.status === 'delivered') {
  showSuccess('Route delivered to driver!');
} else if (finalStatus.status === 'partial') {
  showWarning('Route partially delivered. Some channels failed.');
} else {
  showError('Failed to deliver route to driver.');
}
```

### Pattern 4: Display Channel Delivery Details

**Use Case:** Show detailed delivery status for each channel.

```javascript
function displayChannelStatus(dispatch) {
  const statusHtml = dispatch.channel_dispatches.map(cd => {
    const icon = cd.status === 'delivered' ? '✅' : '❌';
    const channelName = cd.channel.charAt(0).toUpperCase() + cd.channel.slice(1);
    
    return `
      <div class="channel-status">
        <span class="icon">${icon}</span>
        <span class="channel">${channelName}</span>
        <span class="status">${cd.status}</span>
        ${cd.error_message ? `<span class="error">${cd.error_message}</span>` : ''}
      </div>
    `;
  }).join('');
  
  document.getElementById('dispatch-status').innerHTML = statusHtml;
}
```

---

## UI Components to Add

### 1. Dispatch Button

Add a "Send to Driver" button to the route detail/list view:

```html
<!-- In routes.html or route detail page -->
<button 
  id="dispatch-btn" 
  class="btn btn-primary"
  onclick="handleDispatchRoute(routeId, driverId)"
>
  📤 Send to Driver
</button>
```

### 2. Batch Dispatch Button

Add a "Send All Routes" button to the routes list view:

```html
<!-- In routes.html -->
<button 
  id="dispatch-all-btn" 
  class="btn btn-primary"
  onclick="handleDispatchAllRoutes()"
>
  📤 Send All Routes
</button>
```

### 3. Dispatch Status Modal

Show dispatch status in a modal after dispatching:

```html
<!-- Dispatch Status Modal -->
<div id="dispatch-status-modal" class="modal">
  <div class="modal-content">
    <h3>Dispatch Status</h3>
    <div id="dispatch-status-content">
      <p>Dispatch ID: <span id="dispatch-id"></span></p>
      <p>Status: <span id="dispatch-status"></span></p>
      <div id="channel-statuses"></div>
    </div>
    <button onclick="closeDispatchModal()">Close</button>
  </div>
</div>
```

### 4. Dispatch History Table

Show dispatch history for a route:

```html
<!-- In route detail page -->
<div class="dispatch-history">
  <h4>Dispatch History</h4>
  <table>
    <thead>
      <tr>
        <th>Date/Time</th>
        <th>Status</th>
        <th>Channels</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody id="dispatch-history-body">
      <!-- Populated dynamically -->
    </tbody>
  </table>
</div>
```

---

## Driver Configuration

For dispatches to work, drivers must have the appropriate channel configuration:

### Telegram Configuration
- Driver must have `telegram_chat_id` set in the database
- Driver must have started a conversation with your Telegram bot

### Email Configuration
- Driver must have a valid `email` address in the database

### Channel Preferences
- `preferred_channel` - Driver's preferred notification channel (telegram or email)
- `fallback_enabled` - Whether to try fallback channel if primary fails

**Example Driver Record:**
```json
{
  "id": "driver-uuid",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "telegram_chat_id": "123456789",
  "preferred_channel": "telegram",
  "fallback_enabled": true,
  "status": "active"
}
```

---

## Error Handling Best Practices

### 1. Handle Network Errors
```javascript
try {
  const result = await dispatchRoute(routeId, driverId);
} catch (error) {
  if (error.message.includes('fetch')) {
    showError('Network error. Please check your connection.');
  } else {
    showError(`Dispatch failed: ${error.message}`);
  }
}
```

### 2. Handle Validation Errors
```javascript
const response = await fetch('/api/v1/dispatch', { ... });
if (response.status === 400) {
  const error = await response.json();
  // Show specific validation errors
  Object.entries(error.error.details).forEach(([field, message]) => {
    showFieldError(field, message);
  });
}
```

### 3. Handle Authentication Errors
```javascript
if (response.status === 401) {
  showError('Authentication failed. Please check your API key configuration.');
  // Optionally redirect to settings page
}
```

### 4. Handle Not Found Errors
```javascript
if (response.status === 404) {
  const error = await response.json();
  if (error.error.code === 'ROUTE_NOT_FOUND') {
    showError('Route not found. It may have been deleted.');
  } else if (error.error.code === 'DRIVER_NOT_FOUND') {
    showError('Driver not found. Please assign a driver to this route first.');
  }
}
```

---

## Testing the Integration

### 1. Test with curl

```bash
# Test single dispatch
curl -X POST http://localhost:3001/api/v1/dispatch \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-key-1" \
  -d '{
    "route_id": "your-route-uuid",
    "driver_id": "your-driver-uuid"
  }'

# Test batch dispatch
curl -X POST http://localhost:3001/api/v1/dispatch/batch \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-key-1" \
  -d '{
    "dispatches": [
      {"route_id": "uuid-1", "driver_id": "uuid-1"},
      {"route_id": "uuid-2", "driver_id": "uuid-2"}
    ]
  }'

# Test get status
curl http://localhost:3001/api/v1/dispatch/your-dispatch-uuid \
  -H "X-API-Key: test-key-1"

# Test health check
curl http://localhost:3001/api/v1/health
```

### 2. Test in Browser Console

```javascript
// Test dispatch from browser console
fetch('http://localhost:3001/api/v1/dispatch', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'test-key-1'
  },
  body: JSON.stringify({
    route_id: 'your-route-uuid',
    driver_id: 'your-driver-uuid'
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

---

## Complete Integration Example

Here's a complete example of integrating dispatch functionality into a routes page:

```javascript
// dispatch-client.js - Reusable dispatch client

class DispatchClient {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl || 'http://localhost:3001';
    this.apiKey = apiKey;
  }
  
  async dispatch(routeId, driverId, options = {}) {
    const response = await fetch(`${this.baseUrl}/api/v1/dispatch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      },
      body: JSON.stringify({
        route_id: routeId,
        driver_id: driverId,
        ...options
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message);
    }
    
    return await response.json();
  }
  
  async dispatchBatch(dispatches) {
    const response = await fetch(`${this.baseUrl}/api/v1/dispatch/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      },
      body: JSON.stringify({ dispatches })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message);
    }
    
    return await response.json();
  }
  
  async getStatus(dispatchId) {
    const response = await fetch(
      `${this.baseUrl}/api/v1/dispatch/${dispatchId}`,
      {
        headers: { 'X-API-Key': this.apiKey }
      }
    );
    
    if (response.status === 404) {
      return null;
    }
    
    if (!response.ok) {
      throw new Error('Failed to fetch dispatch status');
    }
    
    return await response.json();
  }
  
  async checkHealth() {
    const response = await fetch(`${this.baseUrl}/api/v1/health`);
    return await response.json();
  }
}

// Usage in routes.html
const dispatchClient = new DispatchClient(
  'http://localhost:3001',
  'your-api-key'
);

async function dispatchRoute(routeId, driverId) {
  try {
    const result = await dispatchClient.dispatch(routeId, driverId);
    showToast('success', `Route dispatched! ID: ${result.dispatch_id}`);
    
    // Poll for status
    setTimeout(async () => {
      const status = await dispatchClient.getStatus(result.dispatch_id);
      if (status.status === 'delivered') {
        showToast('success', 'Route delivered to driver!');
      }
    }, 5000);
    
  } catch (error) {
    showToast('error', `Dispatch failed: ${error.message}`);
  }
}
```

---

## Next Steps

1. **Add UI Components:** Add dispatch buttons and status displays to your routes pages
2. **Implement API Client:** Create a reusable dispatch client module
3. **Test Integration:** Test with real routes and drivers in development
4. **Handle Errors:** Implement proper error handling and user feedback
5. **Add Monitoring:** Track dispatch success rates and failures

For deployment configuration and external service setup, see `DEPLOYMENT.md`.
