# Supabase Key Rotation Guide

## Current Status
- **Legacy Anon Key**: In use (exposed in git history - needs rotation)
- **Service Role Key**: In use (exposed in git history - CRITICAL rotation needed)

## Apps Using Supabase Keys

### 1. fleetillo-app (DigitalOcean)
**Environment Variables to Update:**
- `SUPABASE_KEY` (anon/publishable key)
- `SUPABASE_SERVICE_ROLE_KEY` (service role key)

**Location**: DigitalOcean App Platform → fleetillo-app → Components → web → Environment Variables

### 2. primco-demo (DigitalOcean)
**Environment Variables to Update:**
- `VITE_SUPABASE_ANON_KEY`

**Location**: DigitalOcean App Platform → primco-demo → Components → primco-demo-web → Environment Variables

### 3. Local Development
**Files to Update:**
- `.env`
- `gradient-agents/optiroute-support-agent/bundle.env`
- `gradient-agents/optiroute-support-agent/.env`
- `dispatch-service/.env`

## Rotation Process

### Phase 1: Generate New Keys (Supabase Dashboard)

1. **Go to**: https://supabase.com/dashboard/project/vtaufnxworztolfdwlll/settings/api

2. **Get New Publishable Key:**
   - Look for "Project API keys" or "anon public" key
   - **If labeled "publishable key"** - copy this (new format)
   - **If only "anon" key exists** - this IS your publishable key (already using it)

3. **Rotate Service Role Key** (CRITICAL):
   - Find "service_role" key section
   - Click "Reveal" to see current key
   - Click **"Roll service_role key"** or **"Regenerate"**
   - ⚠️ **IMPORTANT**: Save the new key immediately - can't retrieve later!
   - Old key will stop working after regeneration

### Phase 2: Test Locally

```bash
# Update .env with new keys
cd ~/github/fleetillo

# Edit .env file
SUPABASE_KEY=<NEW_PUBLISHABLE_KEY>
SUPABASE_SERVICE_ROLE_KEY=<NEW_SERVICE_ROLE_KEY>

# Test locally
npm run dev
# Verify login works
# Verify data loading works
# Verify admin operations work (if using service role)

# Test gradient agent
cd gradient-agents/optiroute-support-agent
# Update bundle.env and .env with new keys
# Test agent functionality
```

### Phase 3: Update DigitalOcean (Staging/Production)

**For fleetillo-app:**

```bash
# Via doctl
doctl apps spec get f7b5791e-3ddf-4b13-9fbf-30665a117025

# Or via Dashboard:
# 1. Go to: DigitalOcean → Apps → fleetillo-app
# 2. Settings → Components → web → Environment Variables
# 3. Edit SUPABASE_KEY → paste new publishable key
# 4. Edit SUPABASE_SERVICE_ROLE_KEY → paste new service role key
# 5. Save
# 6. Trigger deployment
```

**For primco-demo:**

```bash
# Via Dashboard:
# 1. Go to: DigitalOcean → Apps → primco-demo
# 2. Settings → Components → primco-demo-web → Environment Variables
# 3. Edit VITE_SUPABASE_ANON_KEY → paste new publishable key
# 4. Save
# 5. Trigger deployment
```

### Phase 4: Verify All Apps

**Checklist:**

- [ ] **fleetillo-app**: Can login with demo password
- [ ] **fleetillo-app**: Data loads correctly (locations, customers, routes)
- [ ] **fleetillo-app**: Can create/edit records
- [ ] **fleetillo-app**: Dispatch service works (if using service role)
- [ ] **primco-demo**: Can access with access code
- [ ] **primco-demo**: Form submissions work
- [ ] **Local dev**: All functionality works
- [ ] **Gradient agent**: Can query Supabase data

### Phase 5: Delete Legacy Keys (Optional)

**⚠️ Only do this AFTER verifying all apps work!**

1. Go to Supabase Dashboard → Settings → API
2. If there's a separate "legacy anon key" section with delete option, remove it
3. Old service role key is automatically invalidated when you rotate

## Troubleshooting

### Error: "Invalid API key"
- Verify key was copied completely (no spaces or line breaks)
- Check if key is marked as "encrypted" in DO dashboard
- Verify SUPABASE_URL matches: `https://vtaufnxworztolfdwlll.supabase.co`

### Error: "JWT expired"
- This shouldn't happen with new keys (they have long expiry)
- Verify you're using the NEW key, not old one
- Check Supabase project status (not paused)

### Service role operations fail
- Verify you're using SERVICE_ROLE_KEY for admin operations
- Verify you're using ANON/PUBLISHABLE_KEY for client operations
- Check RLS policies in Supabase

### App still works with old key
- DigitalOcean may have cached environment variables
- Force redeploy the app
- Clear CloudFlare cache if using CDN

## Key Differences: Anon vs Service Role

**Anon/Publishable Key** (Client-side):
- ✅ Safe to expose in browser/mobile apps
- ✅ Respects Row Level Security (RLS)
- ❌ Limited permissions
- **Use for**: Frontend apps, public API access

**Service Role Key** (Server-side):
- ❌ NEVER expose in browser/mobile apps
- ❌ Bypasses Row Level Security (RLS)
- ✅ Full database access
- **Use for**: Backend services, admin operations, migrations
- **⚠️ CRITICAL**: Keep this secret and rotate immediately if exposed

## Timeline

**Recommended Timeline:**
- **Day 1**: Generate new keys, test locally
- **Day 2**: Deploy to staging/test environment
- **Day 3-5**: Monitor for issues
- **Day 6**: Deploy to production
- **Day 7**: Verify all apps, delete legacy keys

**Fast Timeline (if compromised):**
- **Hour 1**: Generate new keys
- **Hour 2**: Test locally quickly
- **Hour 3**: Deploy to all apps
- **Hour 4**: Verify and delete legacy

## Current Exposed Keys (Need Rotation)

These were exposed in git history and MUST be rotated:

1. **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0YXVmbnh3b3J6dG9sZmR3bGxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA4ODIwMjUsImV4cCI6MjA1NjQ1ODAyNX0.O_Xg5cLp8x5FMQIYJKQKBCY8FC37AeJ5ffOhyEZ_yqg`

2. **Service Role Key** (CRITICAL): `sb_secret_KMEb1AsLUW4HTnyzquzgPg_eWDc2Co-`

**Priority**: Rotate service role key IMMEDIATELY (full DB access)
