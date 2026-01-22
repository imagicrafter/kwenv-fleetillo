# Requirements: Issue #21 - Refactor Frontend to Remove Electron Dependency

## Introduction
The current `web-launcher` application relies on a `preload.js` shim that mimics the Electron IPC API (`window.electronAPI`) to communicate with the backend via HTTP/RPC. This architecture behaves like a desktop app wrapper rather than a modern web application.

The goal of this refactor is to remove the `window.electronAPI` dependency entirely and replace it with a dedicated `api-client.js` module that handles API communication. This will modernize the architecture, verify proper authentication handling (using standard web auth instead of Electron context), and clean up the codebase.

## Glossary
- **Electron API Shim**: The current `preload.js` file that mimics `window.electronAPI`.
- **API Client**: A new JavaScript module (`api-client.js`) that serves as the centralized interface for all backend communication.
- **RPC**: Remote Procedure Call, the current pattern used by the server (`/api/rpc`).

## Requirements

### Requirement 1: Create API Client Abstraction

**User Story:** As a developer, I want a robust `api-client.js` module so that I can make backend requests using standard JavaScript modules instead of global objects.

#### Acceptance Criteria
1. A new `api-client.js` file SHALL be created in `public/js/` (or appropriate location).
2. The client SHALL expose methods corresponding to all existing `electronAPI` namespaces (bookings, customers, vehicles, etc.).
3. The client SHALL use `fetch` to call the `/api/rpc` endpoint (or REST endpoints if available, but RPC seems to be the current contract).
4. The client SHALL handle 401 Unauthorized responses by redirecting to login.
5. The client SHALL handle generic network and server errors gracefully.

### Requirement 2: Replace `window.electronAPI` Usage

**User Story:** As a developer, I want all frontend pages to use the new API client so that the code is cleaner and cleaner and not dependent on Electron-style globals.

#### Acceptance Criteria
1. ALL occurrences of `window.electronAPI` in `.html` and `.js` files in `web-launcher` SHALL be replaced with usages of the new `apiClient`.
2. The `preload.js` script tag SHALL be removed from all HTML files.
3. The new `api-client.js` (and potentially `config.js` if needed) SHALL be included in all HTML files.
4. Legacy alias `clients` (used for `customers`) SHALL be supported or refactored to `customers` if possible, but maintaining the capability is required if backend expects it. (Shim mapped `clients` to `customers` proxy).

### Requirement 3: Cleanup and Verification

**User Story:** As a user, I want the web application to function exactly as before, with no loss of features.

#### Acceptance Criteria
1. The `web-launcher/public/preload.js` file SHALL be deleted after migration.
2. The application SHALL function correctly in a standard browser (Chrome/Safari) without any Electron-related console warnings.
3. Features to verify:
   - Dashboard loading
   - Customer CRUD (Create, Read, Update, Delete)
   - Vehicle Listing
   - Dispatch interface
   - Settings page
   - Login/Logout flow

### Requirement 4: Google Maps Integration

**User Story:** As a user, I want maps to continue valid working.

#### Acceptance Criteria
1. The `config.getGoogleMapsApiKey` method which was exposed via `electronAPI` SHALL be available via the new API client.
2. Maps SHALL load correctly.

## Constraints
- The backend `/api/rpc` endpoint contract MUST NOT be changed in this scope (unless absolutely necessary).
- No changes to `electron-launcher` (unless shared code is touched, but `web-launcher` is the focus per issue).

### Requirement 5: API Scalability Foundation

**User Story:** As a DevOps engineer, I want the API client to support configurable endpoints so that the frontend can be deployed separately from the API in the future.

#### Acceptance Criteria
1. The `api-client.js` SHALL read the API base URL from a configuration source (config file, environment injection, or global constant).
2. The default SHALL be relative (`/api`) for backward compatibility.
3. The fetch calls SHALL include `credentials: 'include'` to support cross-origin authentication when needed.
4. A `config.js` file SHALL be created to centralize configuration (API base URL, feature flags, etc.).

#### Notes
- Full CORS implementation and infrastructure separation are deferred to Issue #26.
- This requirement establishes the **foundation** only.

