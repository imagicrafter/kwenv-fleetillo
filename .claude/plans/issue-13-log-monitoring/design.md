# Design: Issue #13 - Automated DigitalOcean Log Monitoring

## Overview

A DigitalOcean Function that runs daily to fetch logs, detect errors using fingerprinting, and triage errors with LLM analysis. Detected errors are stored in Supabase for review.

### Key Design Decisions

1. **DO Function**: Serverless function triggered by CRON, isolated from main app
2. **Two-phase detection**: Fingerprint first (cheap), LLM only on errors (efficient token use)
3. **Context capture**: Include N lines before each error for LLM analysis
4. **Supabase direct**: Function connects directly to Supabase, no dependency on app API

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Daily Log Monitor Flow                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐                                           │
│  │  CRON Trigger    │                                           │
│  │  (6:00 AM UTC)   │                                           │
│  └────────┬─────────┘                                           │
│           │                                                     │
│           ▼                                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              DO Function: log-monitor                     │   │
│  │                                                           │   │
│  │  1. Fetch 24h logs via DO API ─────────────────────────┐ │   │
│  │                                                        │ │   │
│  │  2. Parse logs, detect error-level entries             │ │   │
│  │     ├─ Generate fingerprint for each error             │ │   │
│  │     └─ Collect preceding context lines                 │ │   │
│  │                                                        │ │   │
│  │  3. If no errors → Exit (no LLM call) ─────────────────┤ │   │
│  │                                                        │ │   │
│  │  4. For each unique error:                             │ │   │
│  │     ├─ Check if fingerprint exists in DB               │ │   │
│  │     ├─ If new: Call LLM for triage ◄───────────────────┤ │   │
│  │     └─ If exists: Update occurrence count              │ │   │
│  │                                                        │ │   │
│  │  5. Write to Supabase ─────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────┐        ┌──────────────────┐               │
│  │  DigitalOcean    │        │    Supabase      │               │
│  │  Logs API        │        │  detected_errors │               │
│  └──────────────────┘        └──────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

### `detected_errors`

```sql
CREATE TABLE fleetillo.detected_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fingerprint VARCHAR(64) NOT NULL UNIQUE,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    service_name VARCHAR(100),
    first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
    occurrence_count INTEGER NOT NULL DEFAULT 1,
    context_logs JSONB,           -- Log lines before error
    analysis JSONB,               -- LLM triage response
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'resolved', 'ignored')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_detected_errors_fingerprint ON fleetillo.detected_errors(fingerprint);
CREATE INDEX idx_detected_errors_status ON fleetillo.detected_errors(status);
CREATE INDEX idx_detected_errors_last_seen ON fleetillo.detected_errors(last_seen DESC);
```

### `error_log_entries`

```sql
CREATE TABLE fleetillo.error_log_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    detected_error_id UUID REFERENCES fleetillo.detected_errors(id) ON DELETE CASCADE,
    raw_log TEXT NOT NULL,
    timestamp TIMESTAMPTZ,
    log_level VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_error_log_entries_error ON fleetillo.error_log_entries(detected_error_id);
```

## DO Function Structure

```
functions/
  log-monitor/
    ├── project.yml           # DO Function config
    ├── packages/
    │   └── default/
    │       └── log-monitor/
    │           ├── package.json
    │           ├── tsconfig.json
    │           └── src/
    │               ├── index.ts          # Main handler
    │               ├── do-client.ts      # DigitalOcean API client
    │               ├── log-parser.ts     # Parse and fingerprint logs
    │               ├── llm-triage.ts     # LLM analysis
    │               └── db-client.ts      # Supabase operations
```

## TypeScript Interfaces

```typescript
// types.ts

export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  service?: string;
  stackTrace?: string;
  raw: string;
}

export interface DetectedError {
  fingerprint: string;
  errorMessage: string;
  stackTrace?: string;
  serviceName?: string;
  contextLogs: LogEntry[];
  occurrenceCount: number;
  firstSeen: Date;
  lastSeen: Date;
}

export interface LLMTriageResponse {
  summary: string;
  likelyRootCause: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestedFix: string;
  relatedPatterns?: string[];
}
```

## Fingerprinting Algorithm

```typescript
function generateFingerprint(entry: LogEntry): string {
  // Normalize message: remove timestamps, IDs, dynamic values
  const normalized = entry.message
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, '[TIMESTAMP]')  // ISO timestamps
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[UUID]')  // UUIDs
    .replace(/\d+/g, '[N]');  // Numbers
  
  // Include first stack frame if present
  const stackFrame = entry.stackTrace?.split('\n')[0] || '';
  
  const input = `${normalized}|${stackFrame}`;
  return crypto.createHash('sha256').update(input).digest('hex').substring(0, 16);
}
```

## LLM Triage Prompt

```
You are a DevOps engineer analyzing a production error.

ERROR:
{error_message}

STACK TRACE:
{stack_trace}

CONTEXT (logs before error):
{context_logs}

Analyze this error and respond in JSON format:
{
  "summary": "One-line summary of the error",
  "likelyRootCause": "What likely caused this error",
  "severity": "low|medium|high|critical",
  "suggestedFix": "Recommended action to fix this"
}
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DO_API_TOKEN` | DigitalOcean API token with logs read access |
| `DO_APP_ID` | App ID to fetch logs for |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |
| `LLM_API_KEY` | OpenAI/Anthropic API key |
| `LLM_MODEL` | Model to use (default: gpt-4) |
| `CONTEXT_LINES` | Lines before error to capture (default: 10) |

## project.yml (DO Function Config)

```yaml
packages:
  - name: default
    functions:
      - name: log-monitor
        runtime: nodejs:18
        triggers:
          - name: daily-schedule
            type: SCHEDULED
            cron: "0 6 * * *"  # 6:00 AM UTC daily
        environment:
          DO_API_TOKEN: ${DO_API_TOKEN}
          DO_APP_ID: ${DO_APP_ID}
          SUPABASE_URL: ${SUPABASE_URL}
          SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY}
          LLM_API_KEY: ${LLM_API_KEY}
```

## Testing Strategy

### Unit Tests
- Log parsing for JSON and text formats
- Fingerprint generation and normalization
- Context line extraction

### Integration Tests
- Mock DO API responses
- Mock LLM responses
- Supabase write verification

### Manual Validation
- Deploy function, trigger manually
- Verify errors are detected and stored
- Review LLM triage quality
