# Security Guidelines

## Mandatory Security Checks

Before ANY commit:
- [ ] No hardcoded secrets (API keys, passwords, tokens)
- [ ] All user inputs validated
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitized HTML)
- [ ] CSRF protection enabled
- [ ] Authentication/authorization verified
- [ ] Rate limiting on all endpoints
- [ ] Error messages don't leak sensitive data

## Secret Management

```typescript
// NEVER: Hardcoded secrets
const apiKey = "sk-proj-xxxxx"

// ALWAYS: Environment variables
const apiKey = process.env.OPENAI_API_KEY

if (!apiKey) {
  throw new Error('OPENAI_API_KEY not configured')
}
```

## Pre-Commit Secret Detection

**Automated Protection**: Git hooks automatically scan for secrets before commits.

### How It Works
- **Pre-commit hook**: Scans staged files before allowing commit
- **Pre-push hook**: Final check before code reaches remote
- **GitHub Actions**: CI/CD scanning on all PRs and pushes to main

### Manual Scanning
```bash
# Check entire repository for secrets
npm run check-secrets

# Install/update git hooks
npm run install-hooks
```

### Bypassing Hooks
**Only bypass if absolutely necessary** (e.g., updating template files):

```bash
# Bypass pre-commit hook (NOT recommended)
git commit --no-verify -m "Update .env.example template"
```

**Requirements when bypassing**:
1. Add justification in commit message
2. Verify changes are actually safe (templates, docs, test fixtures)
3. Pre-push hook will still run as final check

### Secret Detection Patterns
The hooks detect:
- Google Maps API keys (`AIza...`)
- OpenAI keys (`sk-...`)
- DigitalOcean tokens (`dop_v1_...`)
- Supabase secrets (`sb_secret_...`)
- JWT tokens (`eyJ...`)
- Generic passwords, tokens, API keys

### Allowlisted Files
These files can contain example secrets:
- `.env.example` - Template with placeholders
- `deploy/SECRETS.md` - Documentation
- `deploy/*.template.yaml` - Configuration templates
- Test files and fixtures

## Secret Management Best Practices

### Environment Variables
```typescript
// NEVER: Hardcoded secrets
const apiKey = "sk-proj-xxxxx"

// ALWAYS: Environment variables
const apiKey = process.env.OPENAI_API_KEY

if (!apiKey) {
  throw new Error('OPENAI_API_KEY not configured')
}
```

### DigitalOcean App Specs
```yaml
# WRONG - Hardcoded secret
- key: SUPABASE_SERVICE_ROLE_KEY
  value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # ❌ NEVER DO THIS
  scope: RUN_TIME

# CORRECT - SECRET type reference
- key: SUPABASE_SERVICE_ROLE_KEY
  type: SECRET  # ✅ Configure value in DO dashboard
  scope: RUN_TIME
```

**See** `deploy/do-app-spec.template.yaml` for full example.

## Security Response Protocol

If security issue found:
1. STOP immediately
2. Use **security-reviewer** agent
3. Fix CRITICAL issues before continuing
4. Rotate any exposed secrets
5. Review entire codebase for similar issues

### Emergency: Secret Exposed
If you accidentally commit a secret:
1. **Rotate immediately**: Generate new secret in provider dashboard
2. **Update environments**: Configure new secret in all deployments
3. **Clean git history**: Use `git-filter-repo` (see `deploy/SECRETS.md`)
4. **Document incident**: Note in security log for audit trail
