# Plan: Rename APP_BASE_URL to ROUTEMAP_DISPATCH_URL

## Summary
Rename the `APP_BASE_URL` environment variable to `ROUTEMAP_DISPATCH_URL` for better clarity about its purpose.

## Analysis

**All usages found (6 total):**

| File | Line | Current Code |
|------|------|--------------|
| `do-app-spec.yaml` | 40 | Web service env var declaration |
| `do-app-spec.yaml` | 97 | Dispatch service env var declaration |
| `web-launcher/server.js` | 832 | Token URL generation |
| `dispatch-service/src/core/templates.ts` | 343 | Token API call |
| `dispatch-service/src/core/templates.ts` | 409 | Fallback URL generation |
| `dispatch-service/.env.example` | 8 | Example env file |

**Will it break anything?**
No, as long as:
1. All 6 code references are updated
2. The DigitalOcean env var is renamed in the dashboard

## Files to Modify

1. `web-launcher/server.js` - Update env var reference
2. `dispatch-service/src/core/templates.ts` - Update 2 env var references
3. `dispatch-service/.env.example` - Update example
4. `do-app-spec.yaml` - Update both web and dispatch service declarations

## Implementation Steps

1. Update `web-launcher/server.js`:
   ```javascript
   // Line 832
   const baseUrl = process.env.ROUTEMAP_DISPATCH_URL || 'https://routemap.fleetillo.com';
   ```

2. Update `dispatch-service/src/core/templates.ts`:
   ```javascript
   // Line 343
   const appBaseUrl = process.env.ROUTEMAP_DISPATCH_URL || 'https://routemap.fleetillo.com';

   // Line 409
   const appBaseUrl = process.env.ROUTEMAP_DISPATCH_URL || 'https://routemap.fleetillo.com';
   ```

3. Update `dispatch-service/.env.example`:
   ```
   ROUTEMAP_DISPATCH_URL=https://routemap.fleetillo.com
   ```

4. Update `do-app-spec.yaml`:
   - Line 40: Change `APP_BASE_URL` to `ROUTEMAP_DISPATCH_URL`
   - Line 97: Change `APP_BASE_URL` to `ROUTEMAP_DISPATCH_URL`

## Post-Deploy Action Required

**Manual step in DigitalOcean:**
- Rename the env var from `APP_BASE_URL` to `ROUTEMAP_DISPATCH_URL` in the web component settings
- Value stays the same: `https://routemap.fleetillo.com`

## Verification

1. Deploy the code changes
2. Rename the env var in DigitalOcean dashboard
3. Trigger a new dispatch
4. Verify the generated link is: `https://routemap.fleetillo.com/driver/route.html?token=<uuid>`
5. Click the link and verify the route map displays
