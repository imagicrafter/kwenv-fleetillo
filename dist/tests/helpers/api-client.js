"use strict";
/**
 * API Client Helper for Playwright Tests
 *
 * Provides a simplified interface for making HTTP requests in tests
 * with built-in error handling, logging, and response validation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiClient = void 0;
/**
 * API Client wrapper for Playwright's request context
 */
class ApiClient {
    request;
    baseURL;
    defaultHeaders;
    timeout;
    constructor(request, options = {}) {
        this.request = request;
        this.baseURL = options.baseURL || '';
        this.defaultHeaders = options.headers || {};
        this.timeout = options.timeout || 30000;
    }
    /**
     * Build full URL with query parameters
     */
    buildUrl(path, params) {
        const url = new URL(path, this.baseURL);
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                url.searchParams.append(key, value);
            });
        }
        return url.toString();
    }
    /**
     * Merge headers with defaults
     */
    mergeHeaders(headers) {
        return { ...this.defaultHeaders, ...headers };
    }
    /**
     * GET request
     */
    async get(path, options = {}) {
        const url = this.buildUrl(path, options.params);
        return await this.request.get(url, {
            headers: this.mergeHeaders(options.headers),
            timeout: options.timeout || this.timeout,
        });
    }
    /**
     * POST request
     */
    async post(path, data, options = {}) {
        const url = this.buildUrl(path, options.params);
        return await this.request.post(url, {
            headers: this.mergeHeaders(options.headers),
            data,
            timeout: options.timeout || this.timeout,
        });
    }
    /**
     * PUT request
     */
    async put(path, data, options = {}) {
        const url = this.buildUrl(path, options.params);
        return await this.request.put(url, {
            headers: this.mergeHeaders(options.headers),
            data,
            timeout: options.timeout || this.timeout,
        });
    }
    /**
     * PATCH request
     */
    async patch(path, data, options = {}) {
        const url = this.buildUrl(path, options.params);
        return await this.request.patch(url, {
            headers: this.mergeHeaders(options.headers),
            data,
            timeout: options.timeout || this.timeout,
        });
    }
    /**
     * DELETE request
     */
    async delete(path, options = {}) {
        const url = this.buildUrl(path, options.params);
        return await this.request.delete(url, {
            headers: this.mergeHeaders(options.headers),
            timeout: options.timeout || this.timeout,
        });
    }
    /**
     * Assert response status is successful (2xx)
     */
    async assertSuccess(response) {
        if (!response.ok()) {
            const body = await response.text();
            throw new Error(`Expected successful response but got ${response.status()}: ${body}`);
        }
    }
    /**
     * Parse JSON response with error handling
     */
    async parseJson(response) {
        try {
            return await response.json();
        }
        catch (error) {
            const text = await response.text();
            throw new Error(`Failed to parse JSON response: ${text}. Error: ${error}`);
        }
    }
    /**
     * Get response and assert it's successful with JSON body
     */
    async getJson(path, options = {}) {
        const response = await this.get(path, options);
        await this.assertSuccess(response);
        return await this.parseJson(response);
    }
    /**
     * Post data and assert successful response with JSON body
     */
    async postJson(path, data, options = {}) {
        const response = await this.post(path, data, options);
        await this.assertSuccess(response);
        return await this.parseJson(response);
    }
    /**
     * Put data and assert successful response with JSON body
     */
    async putJson(path, data, options = {}) {
        const response = await this.put(path, data, options);
        await this.assertSuccess(response);
        return await this.parseJson(response);
    }
    /**
     * Patch data and assert successful response with JSON body
     */
    async patchJson(path, data, options = {}) {
        const response = await this.patch(path, data, options);
        await this.assertSuccess(response);
        return await this.parseJson(response);
    }
    /**
     * Delete and assert successful response
     */
    async deleteAndAssert(path, options = {}) {
        const response = await this.delete(path, options);
        await this.assertSuccess(response);
    }
}
exports.ApiClient = ApiClient;
//# sourceMappingURL=api-client.js.map