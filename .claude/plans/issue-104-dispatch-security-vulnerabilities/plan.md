# Plan: Issue #104 - Security: Dispatch Service Vulnerabilities to Address

## Overview

This plan addresses security vulnerabilities identified in the dispatch service (`dispatch-service/`). The vulnerabilities range from missing security headers to inadequate input validation. This is a medium-tier security hardening effort.

**Last Validated**: 2026-01-26 against current codebase (commit 63df80d)

## Scope

Harden the dispatch service against common web security vulnerabilities:
- Missing security headers (helmet)
- Unprotected Telegram webhook
- No rate limiting
- Manual input validation
- Timing-vulnerable API key comparison

## Risk Assessment

| Risk | Severity | Impact |
|------|----------|--------|
| Missing Security Headers | HIGH | XSS, clickjacking, MIME sniffing attacks |
| Telegram Webhook Unprotected | HIGH | Spoofed bot updates, command injection |
| No Rate Limiting | HIGH | DoS attacks, brute force |
| Permissive CORS | MEDIUM | Cross-origin data leakage |
| Manual Validation | MEDIUM | Injection attacks |
| Timing Attack on Auth | LOW | API key enumeration |

## Key Decisions

1. **Helmet for security headers** - Industry standard Express middleware, well-maintained, covers all OWASP recommended headers with sensible defaults.

2. **express-rate-limit over alternatives** - Lightweight, in-memory rate limiting sufficient for single-instance deployment. No Redis dependency needed at current scale.

3. **Zod for validation** - TypeScript-first schema validation with excellent type inference. Already used in the main `src/` codebase for consistency.

4. **Telegram secret token over IP allowlisting** - Telegram's recommended approach; IP ranges can change. Secret token provides cryptographic verification.

5. **Tiered rate limits** - Different endpoints have different abuse profiles. Webhooks need tighter limits (bot spam), dispatch endpoints need moderate limits (API abuse).

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CORS_ORIGIN` | No | `*` (dev only) | Allowed origin(s) - existing var, will enhance |
| `TELEGRAM_WEBHOOK_SECRET` | Yes | - | Secret token for webhook validation (new) |
| `RATE_LIMIT_WINDOW_MS` | No | `60000` | Rate limit window in milliseconds (new) |
| `RATE_LIMIT_MAX_REQUESTS` | No | `100` | Max requests per window (new) |

**Note:** `CORS_ORIGIN` already exists in `index.ts:45`. We'll enhance it to support comma-separated origins rather than introducing a new variable.

## Affected Files

| File | Changes |
|------|---------|
| `dispatch-service/package.json` | Add helmet, express-rate-limit, zod |
| `dispatch-service/src/index.ts` | Add helmet, CORS hardening |
| `dispatch-service/src/api/routes.ts` | Apply rate limiters |
| `dispatch-service/src/api/handlers/telegram.ts` | Secret token validation |
| `dispatch-service/src/api/handlers/dispatch.ts` | Zod validation |
| `dispatch-service/src/middleware/auth.ts` | Constant-time comparison |
| `dispatch-service/src/middleware/rate-limit.ts` | NEW - Rate limiting |
| `dispatch-service/src/middleware/telegram-auth.ts` | NEW - Webhook auth |
| `dispatch-service/src/middleware/validate.ts` | NEW - Zod middleware |
| `dispatch-service/src/validation/schemas.ts` | NEW - Zod schemas |

## Implementation Phases

### Phase 1: Security Headers (Priority: Critical)

1. Add `helmet` dependency to `dispatch-service/package.json`
2. Configure helmet middleware in `dispatch-service/src/index.ts`
3. Harden CORS configuration - replace wildcard with explicit origins

### Phase 2: Rate Limiting (Priority: High)

1. Add `express-rate-limit` dependency
2. Create `dispatch-service/src/middleware/rate-limit.ts`:
   - General API: 100 req/min
   - Dispatch endpoints: 50 req/min
   - Telegram webhook: 10 req/sec
3. Apply rate limiters to routes

### Phase 3: Telegram Webhook Security (Priority: High)

1. Create `dispatch-service/src/middleware/telegram-auth.ts`
   - Validate `X-Telegram-Bot-Api-Secret-Token` header
   - Environment variable: `TELEGRAM_WEBHOOK_SECRET`
2. Apply to `/telegram/webhook` endpoint
3. Document webhook registration with secret token

### Phase 4: Schema Validation (Priority: Medium)

1. Add `zod` dependency
2. Create `dispatch-service/src/validation/schemas.ts`:
   - SingleDispatchBody schema
   - BatchDispatchBody schema
   - Telegram update schema
3. Create `dispatch-service/src/middleware/validate.ts`
4. Replace manual validation in handlers

### Phase 5: Auth Hardening (Priority: Medium)

1. Use `crypto.timingSafeEqual()` for API key comparison
2. Add minimum key length validation (32 chars)

## Tasks

### Phase 1: Security Headers (Critical)
- [ ] Add `helmet` dependency to `dispatch-service/package.json`
- [ ] Configure helmet middleware in `dispatch-service/src/index.ts`
- [ ] Harden CORS configuration - enhance existing `CORS_ORIGIN` to support comma-separated origins
- [ ] Update `.env.example` with production CORS origins example

### Phase 2: Rate Limiting (High)
- [ ] Add `express-rate-limit` dependency to `dispatch-service/package.json`
- [ ] Create `dispatch-service/src/middleware/rate-limit.ts` with tiered limits
- [ ] Apply general rate limiter (100 req/min) to all routes
- [ ] Apply stricter rate limiter (50 req/min) to dispatch endpoints
- [ ] Apply webhook rate limiter (10 req/sec) to Telegram endpoint

### Phase 3: Telegram Webhook Security (High)
- [ ] Create `dispatch-service/src/middleware/telegram-auth.ts`
- [ ] Implement `X-Telegram-Bot-Api-Secret-Token` header validation
- [ ] Add `TELEGRAM_WEBHOOK_SECRET` environment variable
- [ ] Apply middleware to `/telegram/webhook` endpoint
- [ ] Update `.env.example` with new environment variable

### Phase 4: Schema Validation (Medium)
- [ ] Add `zod` dependency to `dispatch-service/package.json`
- [ ] Create `dispatch-service/src/validation/schemas.ts`
- [ ] Define `SingleDispatchBody` schema
- [ ] Define `BatchDispatchBody` schema
- [ ] Define Telegram update schema
- [ ] Create `dispatch-service/src/middleware/validate.ts`
- [ ] Replace manual validation in `dispatch.ts` handler
- [ ] Replace manual validation in `telegram.ts` handler

### Phase 5: Auth Hardening (Medium)
- [ ] Update `dispatch-service/src/middleware/auth.ts` to use `crypto.timingSafeEqual()`
- [ ] Add minimum API key length validation (32 chars)

### Testing
- [ ] Write unit tests for rate limit middleware
- [ ] Write unit tests for Telegram auth middleware
- [ ] Write unit tests for Zod validation schemas
- [ ] Write unit tests for validate middleware
- [ ] Write integration test for security headers
- [ ] Write integration test for CORS blocking
- [ ] Write integration test for rate limiting
- [ ] Write integration test for webhook secret validation
- [ ] Verify 80%+ test coverage on new middleware

### Final Verification
- [ ] Run full test suite - all tests pass
- [ ] Manual smoke test of dispatch flow
- [ ] Verify no regression in existing functionality

## Testing Requirements

### Unit Tests
- Rate limit middleware behavior
- Telegram auth middleware
- Zod validation schemas
- Validate middleware

### Integration Tests
- Security headers in responses
- CORS blocks unauthorized origins
- Rate limiting triggers correctly
- Webhook rejects invalid secrets

## Success Criteria

- [ ] API responses include security headers (CSP, X-Content-Type-Options, X-Frame-Options)
- [ ] CORS only allows configured origins (no wildcard in production)
- [ ] Rate limiting active on all endpoints
- [ ] Telegram webhook validates secret token
- [ ] All input validated via Zod schemas
- [ ] API key comparison is timing-attack resistant
- [ ] No regression in existing functionality
- [ ] 80%+ test coverage on new middleware

## Estimated Complexity

- Phase 1: 3 points
- Phase 2: 4 points
- Phase 3: 2 points
- Phase 4: 5 points
- Phase 5: 2 points

**Total: 16 points (Medium tier)**

## Demo Verification Checklist

**CRITICAL**: Complete this checklist before and after implementation to ensure the demo is not impacted.

### Pre-Implementation Baseline (Run Before Starting)

```bash
# 1. Start dispatch service locally
cd dispatch-service && npm run dev

# 2. Verify health endpoint
curl http://localhost:3001/api/v1/health

# 3. Verify dispatch endpoint (with valid API key)
curl -X POST http://localhost:3001/api/v1/dispatch \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"route_id": "TEST_UUID", "driver_id": "TEST_UUID"}'

# 4. Verify Telegram webhook receives updates (use ngrok or similar)
# 5. Document current response times for comparison
```

### Post-Implementation Verification (Run After Each Phase)

#### After Phase 1 (Security Headers)
- [ ] `curl -I http://localhost:3001/api/v1/health` shows security headers
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: DENY (or SAMEORIGIN)
- [ ] Existing CORS behavior unchanged for allowed origins
- [ ] Health endpoint still returns 200 OK

#### After Phase 2 (Rate Limiting)
- [ ] Normal requests succeed (under rate limit)
- [ ] Rapid requests (>100/min) return 429 Too Many Requests
- [ ] Rate limit headers present: X-RateLimit-Limit, X-RateLimit-Remaining
- [ ] Dispatch flow still works at normal pace

#### After Phase 3 (Telegram Webhook Security)
- [ ] Webhook with valid secret: returns 200 OK
- [ ] Webhook without secret: returns 401 Unauthorized
- [ ] Existing driver registration flow works end-to-end
- [ ] Telegram bot still receives and processes /start commands

#### After Phase 4 (Schema Validation)
- [ ] Valid dispatch requests succeed with same response format
- [ ] Invalid requests return same error format as before
- [ ] Batch dispatch still works correctly
- [ ] Error messages are user-friendly

#### After Phase 5 (Auth Hardening)
- [ ] Valid API keys still authenticate
- [ ] Invalid API keys still rejected
- [ ] No observable performance difference

### Demo Flow Smoke Test

Run this complete flow before the demo:

1. **Driver Registration Flow**
   - [ ] Generate registration link: `GET /api/v1/telegram/registration/:driverId`
   - [ ] Send registration email: `POST /api/v1/telegram/send-registration`
   - [ ] Driver clicks link, Telegram opens, /start works
   - [ ] Driver receives welcome message

2. **Dispatch Flow**
   - [ ] Create single dispatch: `POST /api/v1/dispatch`
   - [ ] Driver receives Telegram notification
   - [ ] Driver acknowledges dispatch (button click)
   - [ ] Get dispatch status: `GET /api/v1/dispatch/:id`
   - [ ] Status shows "acknowledged"

3. **Batch Dispatch Flow**
   - [ ] Create batch dispatch: `POST /api/v1/dispatch/batch`
   - [ ] All drivers receive notifications
   - [ ] Summary shows correct counts

4. **Health & Monitoring**
   - [ ] Health endpoint: `GET /api/v1/health`
   - [ ] Stats endpoint: `GET /api/v1/dispatch/stats`

### Rollback Plan

If issues are discovered during demo prep:

1. **Quick Rollback**: Revert to previous commit
   ```bash
   git revert HEAD --no-edit
   git push
   ```

2. **Phase-Specific Rollback**: Each phase is independent
   - Phase 1: Remove helmet middleware from index.ts
   - Phase 2: Remove rate-limit middleware from routes.ts
   - Phase 3: Remove telegram-auth middleware (webhook becomes public again)
   - Phase 4: Revert to manual validation (keep Zod for future)
   - Phase 5: Revert auth.ts to Set.has() comparison

3. **Environment Rollback**: If new env vars cause issues
   - `TELEGRAM_WEBHOOK_SECRET`: Remove from webhook handler (makes it public)
   - `CORS_ORIGIN`: Set to `*` for permissive mode

### Production Deployment Notes

Before deploying to production:

1. **Set environment variables in DigitalOcean**:
   - `CORS_ORIGIN`: `https://fleetillo.com,https://routemap.fleetillo.com`
   - `TELEGRAM_WEBHOOK_SECRET`: Generate with `openssl rand -hex 32`

2. **Re-register Telegram webhook with secret**:
   ```bash
   curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://dispatch.fleetillo.com/api/v1/telegram/webhook",
       "secret_token": "${TELEGRAM_WEBHOOK_SECRET}"
     }'
   ```

3. **Verify in production**:
   - Test health endpoint
   - Send a test dispatch
   - Verify Telegram delivery
