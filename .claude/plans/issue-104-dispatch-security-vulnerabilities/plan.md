# Plan: Issue #104 - Security: Dispatch Service Vulnerabilities to Address

## Overview

This plan addresses security vulnerabilities identified in the dispatch service (`dispatch-service/`). The vulnerabilities range from missing security headers to inadequate input validation. This is a medium-tier security hardening effort.

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
