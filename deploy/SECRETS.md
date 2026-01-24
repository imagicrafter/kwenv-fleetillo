# Required Secrets for DigitalOcean Deployment

This document lists all secrets that must be configured in DigitalOcean App Platform before deployment.

## ⚠️ Security Notice

**NEVER commit secrets to git!** All sensitive values must be configured in the DigitalOcean App Platform dashboard under:
- **App Settings → Environment Variables (App-Level)**

## Required Secrets

### 1. Supabase Configuration

#### `SUPABASE_KEY`
- **Description**: Supabase anonymous key for client-side database access
- **Where to find**: Supabase Dashboard → Settings → API → Project API Keys → `anon public`
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

#### `SUPABASE_SERVICE_ROLE_KEY` 🔴 CRITICAL
- **Description**: Supabase service role key with full database access
- **Where to find**: Supabase Dashboard → Settings → API → Project API Keys → `service_role` (hidden by default, click "Reveal")
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **⚠️ WARNING**: This key has FULL database access. Handle with extreme care!

### 2. Google Maps

#### `GOOGLE_MAPS_API_KEY`
- **Description**: Google Maps API key for routing and geocoding
- **Where to find**: Google Cloud Console → APIs & Services → Credentials
- **Example**: `***REMOVED_GOOGLE_MAPS_KEY***`

### 3. Application Configuration

#### `DEMO_PASSWORD`
- **Description**: Password for demo/guest access
- **Recommended**: Use a strong random password, not "demo123"
- **Generate with**: `openssl rand -base64 32`

#### `SESSION_SECRET`
- **Description**: Secret key for encrypting session cookies
- **Recommended**: Use a strong random string (32+ characters)
- **Generate with**: `openssl rand -base64 48`

### 4. Dispatch Service (if using notifications)

#### `DISPATCH_API_KEYS`
- **Description**: Comma-separated list of API keys for dispatch service authentication
- **Example**: `key1_abc123,key2_def456`
- **Generate with**: `openssl rand -hex 32`

#### `TELEGRAM_BOT_TOKEN` (Optional)
- **Description**: Telegram bot token for driver notifications
- **Where to find**: Create bot via @BotFather on Telegram
- **Example**: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`

#### `RESEND_API_KEY` (Optional)
- **Description**: Resend API key for email notifications
- **Where to find**: Resend Dashboard → API Keys
- **Example**: `re_abc123def456`

## How to Configure in DigitalOcean

1. Go to your DigitalOcean App Platform dashboard
2. Select your app (fleetillo-web)
3. Navigate to **Settings → Environment Variables**
4. Click **Add Environment Variable**
5. For each secret above:
   - Name: Enter the key name (e.g., `SUPABASE_KEY`)
   - Value: Paste your secret value
   - Scope: `All Components` (or specific component if needed)
   - **✓ Check "Encrypt"** to mark as secret
6. Click **Save** after adding all secrets
7. Redeploy your app for changes to take effect

## Secret Rotation Schedule

Rotate secrets according to this schedule:

| Secret | Rotation Frequency | Priority |
|--------|-------------------|----------|
| `SUPABASE_SERVICE_ROLE_KEY` | Every 90 days | 🔴 Critical |
| `SESSION_SECRET` | Every 90 days | 🔴 Critical |
| `DISPATCH_API_KEYS` | Every 90 days | 🟡 High |
| `GOOGLE_MAPS_API_KEY` | Annually | 🟡 High |
| `TELEGRAM_BOT_TOKEN` | Annually | 🟢 Medium |
| `RESEND_API_KEY` | Annually | 🟢 Medium |
| `DEMO_PASSWORD` | As needed | 🟢 Low |

## Emergency: Secrets Exposed

If secrets are accidentally committed to git or exposed:

### 1. Immediate Actions (within 1 hour)
```bash
# Rotate ALL exposed secrets immediately in their respective dashboards
# Supabase: Generate new keys
# Google: Restrict or regenerate API key
# Update DigitalOcean App Platform with new values
```

### 2. Clean Git History
```bash
# Remove from git history using git-filter-repo
pip install git-filter-repo
git filter-repo --path deploy/do-app-spec.embedded.yaml --path deploy/do-app-spec.standalone.yaml --invert-paths

# Force push (coordinate with team!)
git push --force-with-lease
```

### 3. Verify Cleanup
```bash
# Search for any remaining secrets
git log -p -S 'secret_pattern_here'
```

## Automated Secret Detection

**Protection**: Pre-commit hooks automatically scan for secrets before commits are created.

### How It Works
1. **Pre-commit hook**: Scans staged files for secret patterns
2. **Pre-push hook**: Final safety check before code reaches remote
3. **GitHub Actions**: CI/CD scanning on all PRs and main branch

### Detection Alerts
When secrets are detected, you receive multiple notifications:

- **Console Output**: Immediate feedback with file, line number, and fix instructions
- **Desktop Notification** (macOS): Native notification showing repo, file, and pattern type
- **Detection Log**: `~/.claude/logs/secret-detections.log` contains audit trail with:
  - Timestamp (ISO 8601 UTC)
  - Repository name
  - File path and line number
  - Secret pattern type
- **Agent Blocking**: Claude Code agents are stopped immediately when attempting automated commits with secrets

### Setup
Hooks are automatically installed when you run `npm install`:
```bash
# Manual installation/update
npm run install-hooks

# Manual secret check
npm run check-secrets
```

### When Commits Are Blocked
If a secret is detected:

```
❌ SECRET DETECTED - Commit blocked!

File: deploy/do-app-spec.yaml
Line: 37
Pattern: Google Maps API key

    35:   - key: GOOGLE_MAPS_API_KEY
    36:     scope: RUN_TIME
    37:     value: AIzaSyC9Sxd4Kyr5te9WWKzuWEio3An_iD1Vg2Q
    38:     scope: RUN_TIME

✋ NEVER commit secrets to git!

Fix:
  Use environment variable GOOGLE_MAPS_API_KEY or GOOGLE_MAPS_BROWSER_KEY
```

**To fix**: Remove the hardcoded value and use SECRET type instead:
```yaml
- key: GOOGLE_MAPS_API_KEY
  type: SECRET  # ← Configure value in DO dashboard
  scope: RUN_TIME
```

### Bypassing Checks (NOT Recommended)
Only bypass for legitimate cases (updating templates, documentation):
```bash
git commit --no-verify -m "docs: Update .env.example template"
```

**Note**: Pre-push hook will still run as a final safety net.

## Template Files

For local development, use template files with example values:
- `.env.example` - Copy to `.env` and fill in your secrets
- `deploy/do-app-spec.template.yaml` - Example app spec with SECRET type usage
- `bundle.env.example` - Template for gradient agents

**Never commit real secrets to these files!**

## Deployment Spec Best Practices

### ❌ WRONG - Hardcoded Secrets
```yaml
envs:
  - key: SUPABASE_SERVICE_ROLE_KEY
    value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # NEVER DO THIS!
    scope: RUN_TIME
```

### ✅ CORRECT - SECRET Type Reference
```yaml
envs:
  - key: SUPABASE_SERVICE_ROLE_KEY
    type: SECRET  # Configure actual value in DO dashboard
    scope: RUN_TIME
```

See `deploy/do-app-spec.template.yaml` for a complete example.
