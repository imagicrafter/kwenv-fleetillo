# Design: Issue #2 - Messaging Templates

## Overview

Enable database-backed messaging templates with a UI for customization. Templates use Handlebars syntax for variable substitution and support multiple channels (Telegram, Email, SMS).

### Key Design Decisions

1. **Handlebars syntax**: Use `{{variable}}` for familiarity and ecosystem support
2. **Database + file fallback**: Load from DB, fall back to file-based defaults
3. **Caching with TTL**: Cache templates in memory, invalidate on update
4. **Single table**: Store all channels in one table with type discriminator

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   Template System Architecture                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐      ┌─────────────────────────────────┐  │
│  │  Admin UI       │      │     Dispatch Service            │  │
│  │  (templates.html│      │                                 │  │
│  │   page)         │      │  ┌─────────────────────────┐   │  │
│  └────────┬────────┘      │  │    TemplateEngine       │   │  │
│           │               │  │    (enhanced)           │   │  │
│           │               │  │  ┌─────────────────┐    │   │  │
│           │               │  │  │  Template Cache │    │   │  │
│           │               │  │  └────────┬────────┘    │   │  │
│           │               │  │           │             │   │  │
│           │               │  │  ┌────────▼────────┐    │   │  │
│           │               │  │  │ DB Loader       │    │   │  │
│           │               │  │  │ (with fallback) │    │   │  │
│           │               │  │  └─────────────────┘    │   │  │
│           │               │  └─────────────────────────┘   │  │
│           │               └──────────────┬──────────────────┘  │
│           │                              │                     │
│           ▼                              ▼                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Supabase                              │   │
│  │  ┌─────────────────────┐  ┌─────────────────────────┐   │   │
│  │  │  message_templates  │  │  template_versions      │   │   │
│  │  └─────────────────────┘  └─────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

### `message_templates`

```sql
CREATE TABLE fleetillo.message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('telegram', 'email', 'sms')),
    subject VARCHAR(255),                 -- For email only
    body TEXT NOT NULL,
    variables JSONB DEFAULT '[]',         -- List of available variables
    is_default BOOLEAN DEFAULT false,     -- Seed templates marked as default
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(name, channel)
);

CREATE INDEX idx_message_templates_channel ON fleetillo.message_templates(channel);
CREATE INDEX idx_message_templates_name ON fleetillo.message_templates(name);
```

### `template_versions` (for rollback)

```sql
CREATE TABLE fleetillo.template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES fleetillo.message_templates(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    subject VARCHAR(255),
    body TEXT NOT NULL,
    changed_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_template_versions_template ON fleetillo.template_versions(template_id, version DESC);
```

## TypeScript Interfaces

```typescript
// types/template.ts

export type TemplateChannel = 'telegram' | 'email' | 'sms';

export interface MessageTemplate {
  id: string;
  name: string;
  channel: TemplateChannel;
  subject?: string;           // Email only
  body: string;
  variables: string[];
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateVersion {
  id: string;
  templateId: string;
  version: number;
  subject?: string;
  body: string;
  changedBy?: string;
  createdAt: Date;
}

export interface RenderContext {
  driver_name?: string;
  customer_name?: string;
  pickup_time?: string;
  pickup_address?: string;
  dropoff_address?: string;
  booking_reference?: string;
  [key: string]: string | undefined;
}
```

## Components

### TemplateRepository

```typescript
class TemplateRepository {
  async findByNameAndChannel(name: string, channel: TemplateChannel): Promise<MessageTemplate | null>;
  async findAll(channel?: TemplateChannel): Promise<MessageTemplate[]>;
  async create(input: CreateTemplateInput): Promise<MessageTemplate>;
  async update(id: string, input: UpdateTemplateInput): Promise<MessageTemplate>;
  async delete(id: string): Promise<void>;
  async createVersion(templateId: string, changedBy?: string): Promise<TemplateVersion>;
}
```

### TemplateEngine (Enhanced)

```typescript
class TemplateEngine {
  private cache: Map<string, { template: MessageTemplate; expiresAt: number }>;
  private cacheTTL: number = 60000; // 1 minute default

  async getTemplate(name: string, channel: TemplateChannel): Promise<MessageTemplate>;
  render(template: MessageTemplate, context: RenderContext): string;
  validateSyntax(body: string): { valid: boolean; errors: string[] };
  getAvailableVariables(): string[];
  invalidateCache(name?: string, channel?: TemplateChannel): void;
}
```

### File Fallback Loader

```typescript
class FileTemplateLoader {
  // Load from dispatch-service/templates/*.md and *.html
  async loadFileTemplate(name: string, channel: TemplateChannel): Promise<string | null>;
}
```

## API Design

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rpc` (templates.getAll) | List all templates, optional channel filter |
| GET | `/api/rpc` (templates.getById) | Get single template |
| POST | `/api/rpc` (templates.create) | Create new template |
| PUT | `/api/rpc` (templates.update) | Update template (creates version) |
| DELETE | `/api/rpc` (templates.delete) | Soft delete template |
| POST | `/api/rpc` (templates.validate) | Validate template syntax |
| GET | `/api/rpc` (templates.getVersions) | Get version history |
| POST | `/api/rpc` (templates.rollback) | Rollback to previous version |

## Default Templates

Seed the following on first deployment:

| Name | Channel | Purpose |
|------|---------|---------|
| dispatch_request | telegram | Initial dispatch request to driver |
| dispatch_confirmed | telegram | Confirmation after driver accepts |
| dispatch_request | email | Email version of dispatch request |
| dispatch_confirmed | email | Email confirmation |

## Variable Registry

Standard variables available for all templates:

```typescript
const TEMPLATE_VARIABLES = [
  { name: 'driver_name', description: 'Name of assigned driver' },
  { name: 'customer_name', description: 'Customer/client name' },
  { name: 'pickup_time', description: 'Scheduled pickup time' },
  { name: 'pickup_address', description: 'Pickup location address' },
  { name: 'dropoff_address', description: 'Dropoff location address' },
  { name: 'booking_reference', description: 'Unique booking ID' },
  { name: 'vehicle_info', description: 'Vehicle details' },
  { name: 'special_instructions', description: 'Special instructions for driver' }
];
```

## UI Design

### Template List Page (`templates.html`)

- Tabs for each channel (Telegram, Email, SMS)
- Table showing: Name, Subject (email), Last Updated, Actions (Edit, Delete)
- "New Template" button

### Template Editor Modal

- Name input (disabled for default templates)
- Channel selector
- Subject input (shown for email only)
- Body textarea with Handlebars syntax highlighting
- Variables sidebar with click-to-insert
- Live preview panel with sample data
- Save/Cancel buttons

## Testing Strategy

### Unit Tests
- Template rendering with various contexts
- Syntax validation (valid/invalid templates)
- Cache behavior

### Integration Tests
- CRUD operations
- Version history
- File fallback

### Manual Verification
- Create/edit templates in UI
- Verify rendered messages in dispatch flow
