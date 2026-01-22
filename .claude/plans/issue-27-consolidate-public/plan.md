# Plan: Issue #27 - Consolidate shared/public and web-launcher/public folders

## Summary
Eliminate code duplication by consolidating the two nearly-identical frontend codebases in `/shared/public/` and `/web-launcher/public/`. After Issue #21, web-launcher uses the new `api-client.js` pattern while shared still uses `preload.js`, creating a maintenance burden.

## Requirements
- Single source of truth for frontend files
- Both web-launcher and electron-launcher must function correctly
- No duplicate maintenance burden
- Preserve all existing functionality

## Codebase Discovery

### Code Directories
| Directory | Contains | Affected |
|-----------|----------|----------|
| `web-launcher/public/` | Web server frontend (17 files) | Yes - primary |
| `shared/public/` | Shared/Electron frontend (17 files) | Yes - will be removed |
| `electron-launcher/` | Electron app entry | Yes - will use consolidated folder |
| `web-launcher/` | Express web server | Yes - serves static files |

### Entry Points
- `web-launcher/index.js` - Serves `web-launcher/public/`
- `electron-launcher/src/main.js` - Loads from `shared/public/`

### Current File Differences
Based on file sizes, key differences exist in:
| File | web-launcher | shared | Difference |
|------|-------------|--------|------------|
| bookings.html | 163KB | 160KB | 3KB different |
| dispatch.html | 38KB | 33KB | 5KB different |
| index.html | 48KB | 36KB | 12KB different |
| routes.html | 84KB | 79KB | 5KB different |
| settings.html | 45KB | 43KB | 2KB different |
| dispatch-client.js | 6.6KB | 6.6KB | Minor |

## Impact Analysis

### Direct References
Files referencing shared/public:
- `electron-launcher/src/main.js` - Loads HTML from shared/public
- Root route fallback in web-launcher

### Runtime References
- Electron IPC expects `preload.js` pattern
- Web server expects `api-client.js` pattern (after #21)

### Affected Layers
| Layer | Impact |
|-------|--------|
| Database | None |
| Backend | None |
| API | None |
| Frontend | Major - consolidation of two codebases |
| Config | Updates to file paths |

## critical Discovery (from Issue #16 Debugging)
- **Stale Feature Code**: `web-launcher/public` was found to be stale compared to `shared/public`. Feature updates (like "Custom Fields") were applied to `shared` but not `web-launcher`. **DO NOT assume `web-launcher` is the "latest" version.**
- **Backend RPC Drift**: `web-launcher/server.js` maintains its own RPC map which does not automatically sync with service updates. We found `settings.getSetting` missing in `server.js` while present in `settings.service.ts`, causing frontend crashes.

## Approach
Use a **symlink approach** where `shared/public` becomes a symlink to `web-launcher/public`. This ensures:
1. Single source of truth in `web-launcher/public`
2. Electron-launcher continues to work via symlink
3. No build-time complexity

### Key Decisions
1. **web-launcher/public as canonical (with caution)**: It has the newer `api-client.js` pattern, but its *content* must be carefully merged with feature code from `shared/public`.
2. **Symlink over copy**: No build step needed, immediate consistency
3. **Merge differences carefully**: Review each file difference before consolidating
4. **RPC Parity Check**: Ensure `web-launcher/server.js` exposes all methods present in the shared services used by the frontend.

## Implementation

### Pre-Implementation Analysis
- [ ] Diff each file between the two folders to understand all differences
- [ ] Document which version of each file is correct
- [ ] Identify any Electron-specific code that must be preserved

### Files to Delete
| File | Reason |
|------|--------|
| `shared/public/*` | Replaced by symlink |

### Files to Create
| File | Purpose |
|------|---------|
| `shared/public` (symlink) | Points to `web-launcher/public` |

### Files to Modify
| File | Changes |
|------|---------|
| `electron-launcher/src/main.js` | May need path updates if structure changes |
| `web-launcher/public/*.html` | Merge any Electron-specific features from shared |

### Database Changes
None required.

## Boundary Crossing Checklist

- [x] **Database ↔ Backend**: Not affected
- [x] **Backend ↔ API**: Not affected
- [x] **API ↔ Frontend**: Web-launcher serves consolidated files
- [ ] **Process ↔ Process**: Electron IPC must still work after consolidation
- [x] **Code ↔ Config**: Electron config may need path updates

## Tasks
- [ ] 0. Create feature branch `issue/27-consolidate-public`
- [ ] 1. Generate detailed diff of all files between folders
  ```bash
  diff -rq shared/public web-launcher/public
  ```
- [ ] 2. For each differing file, determine correct version
- [ ] 3. Merge any Electron-specific code into web-launcher versions
- [ ] 4. Test web-launcher with merged files
- [ ] 5. Backup shared/public folder
- [ ] 6. Delete shared/public contents
- [ ] 7. Create symlink: `ln -s ../web-launcher/public shared/public`
- [ ] 8. Test electron-launcher with symlink
- [ ] 9. Update any hardcoded paths if needed
- [ ] 10. Verify all functionality
- [ ] 11. **Verify RPC Parity**: Check that all RPC methods called by the new consolidated frontend are actually exposed in `web-launcher/server.js`. (e.g., `settings.getSetting`).

## Verification Strategy

### Static Verification
```bash
# Verify symlink is correct
ls -la shared/public
# Should show: shared/public -> ../web-launcher/public
```

### Runtime Verification
- Web-launcher serves all pages correctly
- Electron-launcher loads all pages correctly
- All navigation works in both environments
- Dispatch modal works in both environments

### Search Verification
```bash
# Verify no stale references to old shared/public
grep -r "shared/public" --include="*.js" --include="*.ts" .
```

## Risks
- **Git behavior with symlinks**: Some Git clients handle symlinks differently. Mitigation: Test on Windows/Mac/Linux.
- **Electron IPC differences**: Electron may have specific preload requirements. Mitigation: Careful code merge, test thoroughly.

## Dependencies
- Must wait for #21 (Electron dependency refactor) to complete first
- Should complete before #28 (Vite bundler) for cleaner setup
