# Plan: Issue #28 - Introduce Vite/Webpack bundler for frontend assets

## Summary
Introduce Vite as a modern build tool for the frontend codebase to enable ES modules, hot module replacement (HMR), and production optimizations like tree-shaking and code splitting. This builds on the `api-client.js` pattern established in Issue #21.

## Requirements
- Add Vite and required dependencies to package.json
- Configure build output to match current `public/` structure
- Convert existing JavaScript to ES modules
- Maintain backward compatibility with existing functionality
- Enable development server with HMR

## Codebase Discovery

### Code Directories
| Directory | Contains | Affected |
|-----------|----------|----------|
| `web-launcher/public/` | Frontend HTML/JS/CSS | Yes |
| `shared/public/` | Shared frontend assets | Yes |
| `web-launcher/` | Web server entry | Yes |
| `dispatch-service/` | Backend API service | No |
| `src/` | Core backend logic | No |

### Entry Points
- `web-launcher/index.js` - Express web server
- `electron-launcher/src/main.js` - Electron app entry
- `shared/public/*.html` - HTML page entry points
- `web-launcher/public/*.html` - Web launcher HTML pages

## Impact Analysis

### Direct References
Files that will need ES module conversion:
- `web-launcher/public/preload.js` → Already uses `api-client.js` pattern
- `web-launcher/public/dispatch-client.js` → WebSocket client
- `web-launcher/public/confirmation-modal.js` → UI component

### Runtime References
- Script tags in HTML files reference JS files directly
- CSS imports via `<link>` tags

### Affected Layers
| Layer | Impact |
|-------|--------|
| Database | None |
| Backend | None |
| API | None |
| Frontend | Major - all JS files converted to ES modules |
| Config | New - vite.config.js added |

## Approach
Introduce Vite as the build tool for frontend assets. Vite is preferred over Webpack due to its faster development server (uses native ES modules), simpler configuration, and easy migration path from script tags.

The migration will be done incrementally:
1. Set up Vite with minimal configuration
2. Convert JS files to ES modules one at a time
3. Update HTML files to use `<script type="module">`
4. Configure production build to output to current structure

### Key Decisions
1. **Vite over Webpack**: Faster DX, simpler config, native ES module support
2. **In-place migration**: Keep current folder structure, avoid breaking deployments
3. **Optional TypeScript**: Don't require TS initially, enable as opt-in

## Implementation

### Files to Create
| File | Purpose |
|------|---------|
| `vite.config.js` | Vite configuration |
| `package.json` updates | Add Vite dependencies |

### Files to Modify
| File | Changes |
|------|---------|
| `web-launcher/public/preload.js` | Convert to ES module exports |
| `web-launcher/public/dispatch-client.js` | Convert to ES module |
| `web-launcher/public/confirmation-modal.js` | Convert to ES module |
| `web-launcher/public/*.html` | Update script tags to `type="module"` |

### Database Changes
None required.

## Boundary Crossing Checklist

- [ ] **Database ↔ Backend**: Not affected
- [x] **Backend ↔ API**: Not affected
- [x] **API ↔ Frontend**: No API changes, only build tooling
- [x] **Process ↔ Process**: Electron may need separate consideration
- [x] **Code ↔ Config**: New vite.config.js must match deployment structure

## Tasks
- [ ] 0. Create feature branch `issue/28-vite-bundler`
- [ ] 1. Add Vite dependencies to package.json
  - `vite`, `vite-plugin-html`
- [ ] 2. Create vite.config.js with multi-page setup
- [ ] 3. Convert preload.js to ES module pattern
- [ ] 4. Convert dispatch-client.js to ES module
- [ ] 5. Convert confirmation-modal.js to ES module
- [ ] 6. Update HTML files to use module script tags
- [ ] 7. Configure dev server proxy for API routes
- [ ] 8. Test development server with HMR
- [ ] 9. Configure production build output
- [ ] 10. Update deployment scripts if needed
- [ ] 11. Verify all existing functionality works

## Verification Strategy

### Static Verification
```bash
npm run build  # Production build succeeds
npm run lint   # No linting errors
```

### Runtime Verification
- Development server starts and HMR works
- All pages load correctly
- Login/logout flow works
- Dispatch functionality works
- All modals and interactions function

### Search Verification
```bash
# After migration, old non-module script tags should be minimal
grep -r "<script src=" web-launcher/public/*.html
```

## Risks
- **Electron compatibility**: Electron may need different bundling approach. Mitigation: Test electron-launcher after web-launcher migration.
- **Deployment changes**: Build output must match current structure. Mitigation: Configure Vite output paths explicitly.

## Dependencies
- Depends on #21 (Electron dependency refactor) - should complete first
- Optional dependency on #27 (folder consolidation) - can be done after
