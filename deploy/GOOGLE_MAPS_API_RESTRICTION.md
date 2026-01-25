# Google Maps API Key Restriction Guide

## Overview

This guide shows how to restrict your Google Maps API key to only work with Fleetillo domains (production and development).

**Current API Key (exposed - needs rotation):** `AIzaSyC9Sxd4Kyr5te9WWKzuWEio3An_iD1Vg2Q`

## Step-by-Step Restriction Process

### Step 1: Access Google Cloud Console

1. Go to: https://console.cloud.google.com/apis/credentials
2. Select your project (the one with the Maps API key)
3. Find your API key in the list
4. Click on the key name to edit it

### Step 2: Set Application Restrictions

**Choose restriction type:** `HTTP referrers (websites)`

This allows the key to work from browser-based applications.

**Why HTTP referrers?**
- ✅ Works for web applications (your use case)
- ✅ Allows both production domains and localhost
- ✅ Browser automatically sends referrer headers
- ❌ Won't work for server-side API calls (use IP restrictions for that)

### Step 3: Add Website Restrictions (Referrers)

Add these referrer patterns in the "Website restrictions" section:

```
# Production Domains
https://fleetillo.com/*
https://*.fleetillo.com/*
https://optiroute-web-tulrl.ondigitalocean.app/*
https://optiroute-presentation-j9zcc.ondigitalocean.app/*

# Development (localhost)
http://localhost/*
http://localhost:*/*
http://127.0.0.1/*
http://127.0.0.1:*/*

# Alternative localhost formats
http://localhost:3000/*
http://localhost:8080/*
http://127.0.0.1:3000/*
http://127.0.0.1:8080/*
```

**Pattern Explanation:**
- `*` = wildcard for any path
- `*.fleetillo.com` = matches any subdomain (kwenv.fleetillo.com, www.fleetillo.com, etc.)
- `localhost:*` = matches any port (3000, 8080, etc.)

### Step 4: Restrict API Access (Optional but Recommended)

Under "API restrictions":
- Select **"Restrict key"**
- Choose only the APIs you're actually using:
  - ✅ Maps JavaScript API
  - ✅ Geocoding API (if used)
  - ✅ Directions API (if used)
  - ✅ Places API (if used)
  - ✅ Distance Matrix API (if used)

**Don't enable APIs you're not using** - this reduces attack surface.

### Step 5: Save and Test

1. Click **"Save"** at the bottom
2. Wait 1-5 minutes for restrictions to propagate
3. Test the key

## Testing Your Restricted Key

### Test in Production (Browser Console)

1. Go to: https://fleetillo.com (or kwenv.fleetillo.com)
2. Open browser DevTools (F12)
3. Go to Console tab
4. Run this test:

```javascript
// Check if Google Maps loads
console.log('Google Maps API:', typeof google !== 'undefined' ? 'Loaded ✅' : 'Failed ❌');

// Test geocoding
if (typeof google !== 'undefined') {
  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({ address: '1600 Amphitheatre Parkway, Mountain View, CA' }, (results, status) => {
    console.log('Geocoding test:', status === 'OK' ? 'Success ✅' : `Failed: ${status} ❌`);
  });
}
```

**Expected result:** Both should show ✅

### Test Locally

1. Start your local dev server:
```bash
cd ~/github/fleetillo
npm run dev
```

2. Open: http://localhost:3000 (or whatever port you use)
3. Check browser console for Google Maps errors
4. Verify map displays correctly

### Test That Restrictions Work (Unauthorized Domain)

Try accessing the key from a different domain:

```javascript
// From https://example.com or any unauthorized domain
// Should fail with: "This API key is not authorized to use this service or API"
```

## Common Issues and Solutions

### Issue 1: "This API key is not authorized"

**Cause:** Referrer restrictions are too strict or incorrect

**Solutions:**
- Check domain spelling (https://fleetillo.com vs http://fleetillo.com)
- Verify wildcards are correct (`/*` at the end)
- Make sure you're accessing from allowed domain
- Wait 5 minutes after saving (restrictions take time to propagate)

### Issue 2: Localhost doesn't work

**Cause:** Missing localhost variations

**Solutions:**
Add all these patterns:
```
http://localhost/*
http://localhost:*/*
http://127.0.0.1/*
http://127.0.0.1:*/*
```

Some browsers use `localhost`, others use `127.0.0.1`

### Issue 3: Works on one domain but not another

**Cause:** Missing domain in allowed list

**Solutions:**
- Check browser DevTools Network tab
- Look for "Referer" header in requests
- Add exact domain pattern to allowed list

### Issue 4: Works without restrictions, fails with restrictions

**Cause:** Incorrect HTTP vs HTTPS

**Solutions:**
- Production should use `https://`
- Localhost should use `http://`
- Don't mix them up!

## Alternative: IP Address Restrictions

If you're making **server-side** API calls (from Node.js backend), use IP restrictions instead:

1. Get your DigitalOcean app's outbound IP:
```bash
doctl apps list
# Find your app ID
doctl apps get <app-id>
```

2. In Google Cloud Console:
   - Choose **"IP addresses"** restriction type
   - Add your server's IP address
   - Add your development machine's IP (for local testing)

**Note:** DigitalOcean Apps don't have static IPs by default, so HTTP referrers are better for web apps.

## Security Best Practices

### ✅ Do This:
- Use HTTP referrer restrictions for browser-based maps
- Restrict to only APIs you actually use
- Use different keys for dev/staging/prod (recommended)
- Rotate key if ever exposed publicly
- Monitor usage in Google Cloud Console

### ❌ Don't Do This:
- Don't use the same key in mobile apps (use Android/iOS restrictions)
- Don't hardcode keys in git (use environment variables)
- Don't allow `*` wildcard for all domains
- Don't skip API restrictions (enable only what you need)

## Production Domains Summary

**Add these to your HTTP referrer restrictions:**

```
Production:
- https://fleetillo.com/*
- https://*.fleetillo.com/*
- https://optiroute-web-tulrl.ondigitalocean.app/*

Development:
- http://localhost:*/*
- http://127.0.0.1:*/*
```

## After Restricting the Key

1. ✅ **Test in production** (https://fleetillo.com)
2. ✅ **Test locally** (http://localhost:3000)
3. ✅ **Monitor for errors** in browser console
4. ✅ **Update key in DigitalOcean** if you generated a new one
5. ✅ **Delete old unrestricted key** from Google Cloud Console

## Rotating to a New Key (Recommended)

Since your current key was exposed in git, consider creating a new one:

1. **Create new API key:**
   - Google Cloud Console → Credentials
   - Click **"+ CREATE CREDENTIALS"** → **"API key"**
   - Immediately restrict it (don't leave unrestricted!)

2. **Test new key:**
   - Update local `.env` with new key
   - Test locally
   - Verify maps load

3. **Deploy new key:**
   - Update DigitalOcean environment variables
   - Redeploy apps

4. **Delete old key:**
   - Wait 24 hours to ensure everything works
   - Delete old exposed key from Google Cloud Console

## Monitoring Usage

**Check usage regularly:**
- Google Cloud Console → APIs & Services → Dashboard
- Click "Maps JavaScript API"
- Review usage graphs
- Set up billing alerts (to catch abuse)

**Set quota limits:**
- Protect against unexpected charges
- Set daily quota limits per API
- Get alerts if quota exceeded

## Quick Reference

**Google Cloud Console:**
https://console.cloud.google.com/apis/credentials

**Current Domains:**
- Production: `fleetillo.com`, `*.fleetillo.com`
- DigitalOcean: `optiroute-web-tulrl.ondigitalocean.app`
- Development: `localhost:*`, `127.0.0.1:*`

**Restriction Type:** HTTP referrers (websites)

**Enabled APIs:** Maps JavaScript API (+ any others you use)
