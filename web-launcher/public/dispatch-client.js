/**
 * Client library for interacting with the Dispatch Service API
 * Base URL: /dispatch/api/v1
 */
class DispatchClient {
    constructor(baseUrl = '/dispatch/api/v1') {
        this.baseUrl = baseUrl;
    }

    /**
     * Helper for making authenticated requests
     */
    async _request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        try {
            const response = await fetch(url, { ...options, headers });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `Request failed: ${response.status} ${response.statusText}`);
            }

            // Return null for 204 No Content
            if (response.status === 204) return null;

            return await response.json();
        } catch (error) {
            console.error(`Dispatch API Error (${endpoint}):`, error);
            throw error;
        }
    }

    /**
     * Check service health
     */
    async getHealth() {
        return this._request('/health');
    }

    /**
     * Send a single dispatch
     * @param {Object} payload { routeId, driverId, channels: ['telegram', 'email'] }
     */
    async dispatchRoute(payload) {
        return this._request('/dispatch', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    /**
     * Send batch dispatches
     * @param {Array} dispatches Array of dispatch objects
     */
    async dispatchBatch(dispatches) {
        return this._request('/dispatch/batch', {
            method: 'POST',
            body: JSON.stringify({ dispatches })
        });
    }

    /**
     * Get dispatch status by ID
     * @param {string} dispatchId 
     */
    async getDispatchStatus(dispatchId) {
        return this._request(`/dispatch/${dispatchId}`);
    }

    /**
     * Get recent dispatches for history/dashboard
     * Note: This assumes the dispatch service will have a list endpoint.
     * If not, we might need to rely on local storage or implement a list endpoint in the service.
     * Based on API.md, there isn't a explicit "list all" endpoint yet, so this might need 
     * implementation on the backend or we simulate it for now.
     * 
     * UPDATE: Checking API.md again... it seems limited to get by ID.
     * However, for a dashboard we definitely need a list.
     * I will implement a placeholder /dispatch/history endpoint wrapper 
     * or unimplemented specific logic here.
     * 
     * For now, let's assume we'll add `GET /dispatch/history` to the backend 
     * or use a mock if strictly following current docs. 
     * Given the "Dispatch Management Page" requirement, a list endpoint is essential.
     */
    async getHistory(filters = {}) {
        // Construct query string
        const params = new URLSearchParams();
        if (filters.limit) params.append('limit', filters.limit);
        if (filters.offset) params.append('offset', filters.offset);
        if (filters.driverId) params.append('driverId', filters.driverId);
        if (filters.status) params.append('status', filters.status);
        if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) params.append('dateTo', filters.dateTo);

        // NOTE: This endpoint might need to be implemented in the dispatch service
        // For now, we'll try to call it.
        return this._request(`/dispatch/history?${params.toString()}`);
    }

    /**
     * Get dashboard stats
     */
    async getStats() {
        return this._request('/dispatch/stats');
    }

    /**
     * Generate Telegram registration link
     * @param {string} driverId 
     */
    async getTelegramRegistration(driverId) {
        return this._request(`/telegram/registration/${driverId}`);
    }

    /**
     * Email registration link to driver
     * @param {string} driverId 
     */
    async sendRegistrationEmail(driverId) {
        return this._request('/telegram/send-registration', {
            method: 'POST',
            body: JSON.stringify({ driverId })
        });
    }
}

// Export as global
window.DispatchClient = DispatchClient;
