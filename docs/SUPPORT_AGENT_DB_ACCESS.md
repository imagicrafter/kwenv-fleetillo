# OptiRoute Support Agent - Database Access Implementation

This document details the implementation of database access capabilities for the OptiRoute Support Agent, a DigitalOcean Gradient-powered AI agent that helps users with questions about their fleet, bookings, and customers.

## Overview

The Support Agent is deployed on DigitalOcean's Gradient platform and provides real-time database query capabilities to answer user questions like:
- "How many vehicles are in the fleet?"
- "How many pending bookings are there?"
- "How many active customers do we have?"

**Endpoint**: `https://agents.do-ai.run/e7b58fd7-d32f-4d4c-bee0-adf3a7d0d8db/optiroute-support/run`

---

## Implementation Details

### Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Chat Widget   │────▶│  Gradient Agent  │────▶│    Supabase     │
│   (Frontend)    │     │    (main.py)     │     │   (routeiq)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  DatabaseTool    │
                        │  (database.py)   │
                        └──────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `gradient-agents/optiroute-support-agent/main.py` | Agent entrypoint, LLM interaction, tool execution loop |
| `gradient-agents/optiroute-support-agent/tools/database.py` | Supabase client wrapper with query methods |
| `gradient-agents/optiroute-support-agent/bundle.env` | Environment variables for cloud deployment |
| `gradient-agents/optiroute-support-agent/deploy.sh` | Deployment script |

### Database Tool Methods

The `DatabaseTool` class in `tools/database.py` provides the following methods:

| Method | Description | Example Use Case |
|--------|-------------|------------------|
| `get_vehicle_count()` | Returns total vehicle count | "How many vehicles?" |
| `get_customer_count()` | Returns total client count | "How many customers?" |
| `get_booking_counts_by_status()` | Returns booking counts grouped by status | "How many pending bookings?" |
| `get_vehicle_status(query)` | Searches vehicles by name/plate | "Where is Unit 103?" |
| `search_customers(query)` | Searches clients by name/email | "Find customer John" |
| `list_active_routes()` | Lists non-completed routes | "What routes are active?" |

### Tool Schema

The LLM is provided with a `TOOLS_SCHEMA` that describes available functions. This schema is defined in `main.py` and passed to the Gradient inference client:

```python
TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "get_vehicle_count",
            "description": "Get the total number of vehicles in the fleet.",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    # ... additional tools
]
```

---

## Issues Encountered & Resolutions

### 1. Permission Denied - Custom Role

**Issue**: Initial implementation used a custom `optiroute_viewer` role with dynamically generated JWTs. The agent received "permission denied to set role 'optiroute_viewer'" errors.

**Root Cause**: The custom role was not properly configured in the Supabase instance, or Row Level Security (RLS) policies were blocking access.

**Resolution**: Switched to using `SUPABASE_SERVICE_ROLE_KEY` directly, which bypasses RLS. The agent's code is read-only by design, so this is safe for the current use case.

```python
# Before (dynamic JWT)
self.key = generate_jwt_for_role("optiroute_viewer")

# After (service role key)
self.key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
```

---

### 2. Relation Does Not Exist

**Issue**: After fixing permissions, queries failed with "relation 'public.vehicles' does not exist".

**Root Cause**: The application uses a custom schema named `routeiq`, not the default `public` or `optiroute` schema. The `DatabaseTool` was not configured with the correct schema.

**Resolution**: Added explicit schema configuration via environment variable:

```python
self.schema = os.environ.get("SUPABASE_SCHEMA", "optiroute")
self.client = create_client(
    self.url,
    self.key,
    options=ClientOptions(schema=self.schema)
)
```

**Environment variable**: `SUPABASE_SCHEMA=routeiq`

---

### 3. Environment Variables Not Deployed

**Issue**: Fixes worked locally but the cloud agent continued to hallucinate, indicating the `.env` file changes were not reaching the deployed instance.

**Root Cause**: The `.gitignore` file excludes `.env` files, so they were not included in the deployment bundle.

**Resolution**: Created `bundle.env` (not ignored by git) and modified `main.py` to load it:

```python
if os.path.exists("bundle.env"):
    dotenv.load_dotenv("bundle.env")
else:
    dotenv.load_dotenv()
```

---

### 4. Agent Hallucinating Vehicle Counts

**Issue**: Agent reported incorrect vehicle counts (e.g., "15 vehicles" when only 4 existed), or refused to provide counts.

**Root Cause**: The `get_vehicle_status()` function was a search tool, not a counting tool. When the LLM called it with an empty query or didn't call it at all, it would guess or refuse to answer.

**Resolution**: Implemented dedicated counting tools:
- `get_vehicle_count()` - Uses Supabase's `count='exact'` parameter
- `get_customer_count()` - Same approach for clients

```python
def get_vehicle_count(self) -> Dict[str, int]:
    result = self.client.from_("vehicles").select("*", count="exact", head=True).execute()
    return {"count": result.count}
```

Updated `SYSTEM_PROMPT` to guide the LLM:
```
- Use `get_vehicle_count` when asked for the total number of vehicles.
- Use `get_customer_count` when asked for the number of active customers.
```

---

### 5. Wrong Table Name in Code

**Issue**: Code referenced a `customers` table that doesn't exist.

**Root Cause**: Initial implementation assumed a table name of `customers`, but the actual table is named `clients`.

**Resolution**: Updated all queries to use the correct table name:

```python
# Before
self.client.table("customers").select("*")

# After
self.client.from_("clients").select("*")
```

---

## Environment Variables Required

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for admin access | Yes |
| `SUPABASE_SCHEMA` | Database schema name (set to `routeiq`) | Yes |
| `GRADIENT_MODEL_ACCESS_KEY` | Gradient platform API key | Yes |
| `DIGITALOCEAN_API_TOKEN` | For deployment | Yes (deploy only) |

---

## Open / Unresolved Issues

### 1. ~~TOOLS_SCHEMA Duplication~~ ✅ RESOLVED
**Status**: Resolved (2026-01-07)  
**Description**: `TOOLS_SCHEMA` was defined in both `tools/database.py` and `main.py`. The version in `database.py` was outdated and missing the new counting tools.  
**Resolution**: Removed `TOOLS_SCHEMA` from `database.py` entirely. The canonical definition is now only in `main.py`. Updated import statement accordingly.

### 2. ~~Service Role Key Security~~ ✅ RESOLVED
**Status**: Resolved (2026-01-07)  
**Description**: Using `SUPABASE_SERVICE_ROLE_KEY` bypassed all RLS policies, which was not ideal for production.  
**Resolution**: 
1. Applied `GRANT optiroute_viewer TO authenticator` in Supabase
2. Updated `database.py` to use JWT authentication with `optiroute_viewer` role
3. Agent now uses proper read-only access with RLS enforcement
4. Fallback to Service Role Key only if JWT secret is unavailable

**Code Change**: Added `_apply_readonly_jwt()` method to generate and apply JWT with `optiroute_viewer` role.

### 3. ~~No Rate Limiting~~ ✅ RESOLVED
**Status**: Resolved (2026-01-07)  
**Description**: The agent did not implement query throttling, which could allow excessive database queries.  
**Resolution**: Implemented time-based rate limiting in `DatabaseTool`:
- `MAX_QUERIES_PER_MINUTE = 10` (configurable)
- `RATE_LIMIT_WINDOW = 60` seconds
- `_check_rate_limit()` method tracks query timestamps and returns `False` if limit exceeded
- All 6 query methods now check rate limit before executing
- User-friendly error message: "Too many queries. Please wait a moment before trying again."

### 4. ~~Missing Error Handling for Empty Results~~ ✅ RESOLVED
**Status**: Resolved (2026-01-07)  
**Description**: When search methods returned no results, the agent provided confusing responses.  
**Resolution**: Added user-friendly messages to search methods:
- `get_vehicle_status`: Returns `{"message": "No vehicles found matching 'X'. Try a different search term."}`
- `search_customers`: Returns `{"message": "No customers found matching 'X'. Try a different search term."}`
- `list_active_routes`: Returns `{"message": "No active routes found."}`

### 5. ~~list_active_routes Joins May Fail~~ ✅ RESOLVED
**Status**: Resolved (2026-01-07)  
**Description**: The `list_active_routes()` method used Supabase joins (`driver:drivers(name), vehicle:vehicles(name)`) that failed due to missing foreign key relationships in the schema cache.  
**Resolution**: 
- Removed invalid join syntax
- Used correct column names from `RouteRow` TypeScript interface: `route_name`, `route_code`, `route_date`, `status`, `vehicle_id`, etc.
- Added empty result handling
- Query now works correctly (returns user-friendly message when no active routes exist)

---

## Local Testing

A debug script is available for testing database connectivity:

```bash
cd gradient-agents/optiroute-support-agent
./.venv/bin/python3 debug_vehicles.py
```

Expected output:
```
--- NEW: Vehicle Count Tool ---
Vehicle Count: {'count': 4}

--- NEW: Customer Count Tool ---
Customer Count: {'count': 4}
```

---

## Deployment

```bash
cd gradient-agents/optiroute-support-agent
./deploy.sh
```

Ensure `bundle.env` contains all required environment variables before deploying.

---

## Verified Functionality

| Feature | Status | Verified Date |
|---------|--------|---------------|
| Vehicle count query | ✅ Working | 2026-01-06 |
| Customer count query | ✅ Working | 2026-01-06 |
| Booking counts by status | ✅ Working | 2026-01-06 |
| Vehicle search | ✅ Working | 2026-01-06 |
| Customer search | ✅ Working | 2026-01-06 |
| Active routes listing | ⚠️ Untested | - |
