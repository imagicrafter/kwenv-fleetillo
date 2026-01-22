# Plan: Issue #23 - Add parameterized schema deployment support

## Summary
Create a `scripts/deploy-schema.sh` script that allows deploying the database schema to a customizable schema name (defaulting to `fleetillo`). This enables multi-tenant deployments and isolation testing.

## Requirements
- [x] Create `scripts/deploy-schema.sh`
- [x] Support `--schema` argument (default: `fleetillo`)
- [x] Use `sed` or similar to replace `fleetillo` in the master migration file on the fly
- [x] Apply Supabase grants (anon, authenticated, service_role) to the new schema
- [x] Validate schema after deployment (reuse/wrap `validate-fleetillo-schema.ts` or add a new validation step)

## Codebase Discovery

### Code Directories
| Directory | Contains | Affected |
|-----------|----------|----------|
| `supabase/migrations/` | SQL migrations | Yes (Source) |
| `scripts/` | Setup/Utility scripts | Yes (New script location) |

### Entry Points
- `scripts/deploy-schema.sh` (New)

## Impact Analysis

### Affected Layers
| Layer | Impact |
|-------|--------|
| Database | Creates new schemas/tables |
| Config | Backend app will need to be configured to point to new schema (out of scope for THIS issue, but key for usage) |

## Approach

### deploy-schema.sh
1. Parse arguments (`-s`, `--schema`).
2. Read `supabase/migrations/20260120000000_create_fleetillo_schema.sql`.
3. Use `sed` to replace `fleetillo` with `$SCHEMA_NAME`.
4. Run via `psql` (assuming `DATABASE_URL` is set).
5. Run grants:
   ```sql
   GRANT USAGE ON SCHEMA $SCHEMA_NAME TO anon, authenticated, service_role;
   GRANT ALL ON ALL TABLES IN SCHEMA $SCHEMA_NAME TO service_role;
   GRANT ALL ON ALL SEQUENCES IN SCHEMA $SCHEMA_NAME TO service_role;
   -- etc for other roles
   ```
6. Run validation.

### Validation
Update `scripts/validate-fleetillo-schema.ts` to accept a schema name argument, or just pass it as an environment variable if it uses one. Currently it probably checks `fleetillo` hardcoded. We should make it dynamic.

## Implementation

### Files to Create
| File | Purpose |
|------|---------|
| `scripts/deploy-schema.sh` | Main deployment script |

### Files to Modify
| File | Changes |
|------|---------|
| `scripts/validate-fleetillo-schema.ts` | Accept schema name param |

## Tasks
- [ ] Create `scripts/deploy-schema.sh`
- [ ] Implement argument parsing
- [ ] Implement `sed` replacement logic
- [ ] Implement `psql` execution
- [ ] Add Grant statements execution
- [ ] Update `scripts/validate-fleetillo-schema.ts` to support dynamic schema
- [ ] Verify deployment to `fleetillo_test` schema

## Verification Strategy

### Runtime Verification
1. `export DATABASE_URL=...`
2. `./scripts/deploy-schema.sh --schema fleetillo_test`
3. Check DB to ensure `fleetillo_test` schema exists and has tables.
4. Run validation script against it.

### Risks
- `sed` replacement might match unintended strings (e.g. `fleetillo` in a comment or string literal that SHOULDN'T change? Unlikely for schema name usage, but we'll be careful).
- `validate-fleetillo-schema.ts` might need Typescript compilation. We'll run it with `ts-node` or `tsx`.
