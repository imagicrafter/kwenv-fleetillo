/**
 * API Client for Fleetillo
 * Replaces the electronAPI shim with a standard fetch-based implementation.
 */

class ApiError extends Error {
    constructor(message, code, details) {
        super(message);
        this.name = 'ApiError';
        this.code = code;
        this.details = details;
    }
}

const ApiClient = {
    // Core RPC call method
    async callRpc(namespace, method, args) {
        if (AppConfig.DEBUG) {
            console.log(`[ApiClient] Calling RPC: ${namespace}.${method}`, args);
        }

        try {
            const response = await fetch(`${AppConfig.API_BASE_URL}/rpc`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ namespace, method, args })
            });

            if (!response.ok) {
                if (response.status === 401) {
                    console.warn('[ApiClient] Unauthorized request, redirecting to login');
                    window.location.href = 'login.html';
                    return;
                }

                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    // If JSON parse fails, use status text
                    throw new Error(`Server error: ${response.status} ${response.statusText}`);
                }

                throw new ApiError(
                    errorData.message || `Server error: ${response.statusText}`,
                    errorData.code,
                    errorData.details
                );
            }

            return await response.json();
        } catch (error) {
            console.error(`[ApiClient] RPC Failed for ${namespace}.${method}:`, error);
            throw error;
        }
    },

    // Helper to create proxy for a namespace
    createProxy(namespace) {
        return new Proxy({}, {
            get: (target, prop) => {
                return async (...args) => {
                    return this.callRpc(namespace, prop, args);
                };
            }
        });
    }
};

// Initialize the global API client
window.apiClient = {
    bookings: ApiClient.createProxy('bookings'),
    customers: ApiClient.createProxy('customers'),
    clients: ApiClient.createProxy('customers'), // Legacy alias pointing to customers namespace
    drivers: ApiClient.createProxy('drivers'),
    services: ApiClient.createProxy('services'),
    locations: ApiClient.createProxy('locations'),
    vehicles: ApiClient.createProxy('vehicles'),
    vehicleLocations: ApiClient.createProxy('vehicleLocations'),
    routes: ApiClient.createProxy('routes'),
    geocoding: ApiClient.createProxy('geocoding'),
    activities: ApiClient.createProxy('activities'),
    settings: ApiClient.createProxy('settings'),
    // Special handling for config to match existing pattern
    config: {
        getGoogleMapsApiKey: () => ApiClient.callRpc('config', 'getGoogleMapsApiKey', [])
    }
};
