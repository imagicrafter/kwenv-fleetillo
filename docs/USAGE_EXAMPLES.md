# Service CRUD Usage Examples

This document provides code examples for using the Service CRUD layer.

## Basic Usage

### 1. Creating a Service

```typescript
import { createService } from './src/services/index.js';
import type { CreateServiceInput } from './src/types/service.js';

const serviceInput: CreateServiceInput = {
  name: 'Oil Change Service',
  code: 'OIL-CHANGE',
  serviceType: 'maintenance',
  description: 'Complete oil change including filter replacement and fluid check',
  averageDurationMinutes: 45,
  minimumDurationMinutes: 30,
  maximumDurationMinutes: 60,
  basePrice: 49.99,
  priceCurrency: 'USD',
  requiresAppointment: true,
  maxPerDay: 10,
  equipmentRequired: ['oil filter wrench', 'drain pan', 'funnel'],
  skillsRequired: ['basic automotive'],
  tags: ['oil', 'maintenance', 'quick-service'],
  status: 'active',
};

const result = await createService(serviceInput);

if (result.success) {
  console.log('Service created:', result.data);
  console.log('Service ID:', result.data.id);
} else {
  console.error('Error:', result.error?.message);
}
```

### 2. Service Time Validation Examples

```typescript
// ✅ VALID: Proper duration values
await createService({
  name: 'Brake Service',
  serviceType: 'maintenance',
  averageDurationMinutes: 90,      // Must be positive
  minimumDurationMinutes: 60,      // Must be positive if provided
  maximumDurationMinutes: 120,     // Must be >= minimum
});

// ❌ INVALID: Negative duration
await createService({
  name: 'Invalid Service',
  serviceType: 'maintenance',
  averageDurationMinutes: -10,     // ERROR: Must be positive
});
// Result: { success: false, error: "Average duration must be a positive number" }

// ❌ INVALID: Zero duration
await createService({
  name: 'Invalid Service',
  serviceType: 'maintenance',
  averageDurationMinutes: 0,       // ERROR: Must be positive
});

// ❌ INVALID: Max < Min
await createService({
  name: 'Invalid Service',
  serviceType: 'maintenance',
  averageDurationMinutes: 60,
  minimumDurationMinutes: 90,
  maximumDurationMinutes: 30,      // ERROR: Must be >= minimum
});
// Result: { success: false, error: "Maximum duration must be greater than or equal to minimum duration" }
```

### 3. Description Validation

```typescript
// ✅ With description
await createService({
  name: 'Tire Rotation',
  serviceType: 'maintenance',
  description: 'Professional tire rotation service with balance check',
  averageDurationMinutes: 30,
});

// ✅ Without description (optional field)
await createService({
  name: 'Tire Rotation',
  serviceType: 'maintenance',
  // description is optional
  averageDurationMinutes: 30,
});

// ✅ Empty description is allowed
await createService({
  name: 'Tire Rotation',
  serviceType: 'maintenance',
  description: '',  // Empty string is valid
  averageDurationMinutes: 30,
});
```

### 4. Required Field Validation

```typescript
// ❌ INVALID: Empty name
await createService({
  name: '',                         // ERROR: Required
  serviceType: 'maintenance',
  averageDurationMinutes: 30,
});
// Result: { success: false, error: "Service name is required" }

// ❌ INVALID: Empty service type
await createService({
  name: 'Test Service',
  serviceType: '',                  // ERROR: Required
  averageDurationMinutes: 30,
});
// Result: { success: false, error: "Service type is required" }

// ❌ INVALID: Missing average duration
await createService({
  name: 'Test Service',
  serviceType: 'maintenance',
  // averageDurationMinutes is required
});
// Result: { success: false, error: "Average duration must be a positive number" }
```

### 5. Reading Services

```typescript
import {
  getServiceById,
  getServiceByCode,
  getServices,
  getServicesByType
} from './src/services/index.js';

// Get by ID
const service = await getServiceById('uuid-here');
if (service.success) {
  console.log('Service:', service.data);
}

// Get by code
const serviceByCode = await getServiceByCode('OIL-CHANGE');
if (serviceByCode.success) {
  console.log('Service:', serviceByCode.data);
}

// List all active services
const allServices = await getServices({ status: 'active' });
if (allServices.success) {
  console.log('Total services:', allServices.data.pagination.total);
  console.log('Services:', allServices.data.data);
}

// Get services by type
const maintenanceServices = await getServicesByType('maintenance');
if (maintenanceServices.success) {
  console.log('Maintenance services:', maintenanceServices.data.data);
}

// Advanced filtering
const filteredServices = await getServices(
  {
    status: 'active',
    serviceType: 'maintenance',
    minDuration: 30,
    maxDuration: 60,
    searchTerm: 'oil',
    tags: ['quick-service'],
  },
  {
    page: 1,
    limit: 10,
    sortBy: 'name',
    sortOrder: 'asc',
  }
);
```

### 6. Updating Services

```typescript
import { updateService } from './src/services/index.js';

// Update specific fields
const updated = await updateService({
  id: 'service-uuid',
  averageDurationMinutes: 50,
  description: 'Updated description',
});

if (updated.success) {
  console.log('Service updated:', updated.data);
}

// ❌ INVALID: Update with invalid duration
const invalidUpdate = await updateService({
  id: 'service-uuid',
  averageDurationMinutes: -5,  // ERROR: Must be positive
});
// Result: { success: false, error: "Average duration must be a positive number" }
```

### 7. Deleting and Restoring Services

```typescript
import {
  deleteService,
  restoreService,
  hardDeleteService
} from './src/services/index.js';

// Soft delete (sets deleted_at timestamp)
const deleted = await deleteService('service-uuid');
if (deleted.success) {
  console.log('Service soft deleted');
}

// Service won't be found in normal queries
const notFound = await getServiceById('service-uuid');
// Result: { success: false, error: "Service not found" }

// Restore soft-deleted service
const restored = await restoreService('service-uuid');
if (restored.success) {
  console.log('Service restored:', restored.data);
}

// Hard delete (permanent, requires admin client)
const hardDeleted = await hardDeleteService('service-uuid');
if (hardDeleted.success) {
  console.log('Service permanently deleted');
}
```

### 8. Counting Services

```typescript
import { countServices } from './src/services/index.js';

// Count all active services
const count = await countServices({ status: 'active' });
if (count.success) {
  console.log('Active services:', count.data);
}

// Count by type
const maintenanceCount = await countServices({
  status: 'active',
  serviceType: 'maintenance'
});
```

## Error Handling

All service functions return a `Result<T>` type:

```typescript
type Result<T> = {
  success: boolean;
  data?: T;
  error?: ServiceServiceError;
};

class ServiceServiceError extends Error {
  code: string;
  details?: unknown;
}
```

### Error Codes

```typescript
import { ServiceErrorCodes } from './src/services/index.js';

// Available error codes:
ServiceErrorCodes.NOT_FOUND           // 'SERVICE_NOT_FOUND'
ServiceErrorCodes.CREATE_FAILED       // 'SERVICE_CREATE_FAILED'
ServiceErrorCodes.UPDATE_FAILED       // 'SERVICE_UPDATE_FAILED'
ServiceErrorCodes.DELETE_FAILED       // 'SERVICE_DELETE_FAILED'
ServiceErrorCodes.QUERY_FAILED        // 'SERVICE_QUERY_FAILED'
ServiceErrorCodes.VALIDATION_FAILED   // 'SERVICE_VALIDATION_FAILED'
ServiceErrorCodes.DUPLICATE_CODE      // 'SERVICE_DUPLICATE_CODE'
```

### Error Handling Example

```typescript
const result = await createService(input);

if (!result.success) {
  const error = result.error;

  switch (error?.code) {
    case ServiceErrorCodes.VALIDATION_FAILED:
      console.error('Validation error:', error.message);
      console.error('Field:', error.details);
      break;

    case ServiceErrorCodes.DUPLICATE_CODE:
      console.error('Service code already exists:', error.details);
      break;

    case ServiceErrorCodes.CREATE_FAILED:
      console.error('Database error:', error.message);
      break;

    default:
      console.error('Unexpected error:', error?.message);
  }
}
```

## TypeScript Types

```typescript
import type {
  Service,
  ServiceRow,
  CreateServiceInput,
  UpdateServiceInput,
  ServiceFilters,
  ServiceType,
  ServiceStatus,
} from './src/types/service.js';

// Service entity (camelCase)
const service: Service = {
  id: 'uuid',
  name: 'Oil Change',
  code: 'OIL-CHANGE',
  serviceType: 'maintenance',
  description: 'Complete oil change service',
  averageDurationMinutes: 45,
  minimumDurationMinutes: 30,
  maximumDurationMinutes: 60,
  basePrice: 49.99,
  priceCurrency: 'USD',
  requiresAppointment: true,
  maxPerDay: 10,
  equipmentRequired: ['wrench', 'pan'],
  skillsRequired: ['basic automotive'],
  status: 'active',
  notes: 'Standard service',
  tags: ['oil', 'maintenance'],
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: undefined,
};

// Service types (union)
const serviceType: ServiceType = 'maintenance' | 'repair' | 'inspection' | 'installation' | 'consultation' | 'other';

// Service status (union)
const status: ServiceStatus = 'active' | 'inactive' | 'discontinued';
```

## Complete Example

```typescript
import {
  initializeSupabase,
  createService,
  getServiceById,
  updateService,
  deleteService,
  ServiceErrorCodes,
} from './src/services/index.js';

async function exampleWorkflow() {
  // 1. Initialize Supabase
  const init = await initializeSupabase();
  if (!init.success) {
    throw new Error('Failed to initialize database');
  }

  // 2. Create a service
  const createResult = await createService({
    name: 'Brake Pad Replacement',
    code: 'BRAKE-PAD',
    serviceType: 'maintenance',
    description: 'Replace front and rear brake pads',
    averageDurationMinutes: 90,
    minimumDurationMinutes: 60,
    maximumDurationMinutes: 120,
    basePrice: 149.99,
    requiresAppointment: true,
  });

  if (!createResult.success) {
    if (createResult.error?.code === ServiceErrorCodes.DUPLICATE_CODE) {
      console.error('Service code already exists');
      return;
    }
    throw createResult.error;
  }

  const serviceId = createResult.data!.id;
  console.log('Created service:', serviceId);

  // 3. Read the service
  const getResult = await getServiceById(serviceId);
  if (getResult.success) {
    console.log('Service details:', getResult.data);
  }

  // 4. Update the service
  const updateResult = await updateService({
    id: serviceId,
    averageDurationMinutes: 95,
    description: 'Updated: Replace brake pads with premium parts',
  });

  if (updateResult.success) {
    console.log('Service updated');
  }

  // 5. Soft delete
  await deleteService(serviceId);
  console.log('Service deleted (soft)');

  // Service is no longer visible
  const checkDeleted = await getServiceById(serviceId);
  console.log('Can find deleted service?', checkDeleted.success); // false

  // 6. Restore if needed
  await restoreService(serviceId);
  console.log('Service restored');
}
```

## Validation Summary

The service layer validates:

| Field | Validation Rules |
|-------|-----------------|
| `name` | Required, non-empty string |
| `serviceType` | Required, non-empty string |
| `averageDurationMinutes` | Required, must be > 0 |
| `minimumDurationMinutes` | Optional, must be > 0 if provided |
| `maximumDurationMinutes` | Optional, must be > 0 and >= minimumDurationMinutes if provided |
| `basePrice` | Optional, must be >= 0 if provided |
| `maxPerDay` | Optional, must be > 0 if provided |
| `code` | Optional, must be unique if provided |
| `description` | Optional, any string value |

All validation occurs at both the application level (TypeScript) and database level (PostgreSQL constraints).
