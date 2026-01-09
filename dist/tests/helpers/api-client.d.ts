/**
 * API Client Helper for Playwright Tests
 *
 * Provides a simplified interface for making HTTP requests in tests
 * with built-in error handling, logging, and response validation.
 */
import { APIRequestContext, APIResponse } from '@playwright/test';
export interface ApiClientOptions {
    baseURL?: string;
    headers?: Record<string, string>;
    timeout?: number;
}
export interface RequestOptions {
    headers?: Record<string, string>;
    params?: Record<string, string>;
    timeout?: number;
}
/**
 * API Client wrapper for Playwright's request context
 */
export declare class ApiClient {
    private request;
    private baseURL;
    private defaultHeaders;
    private timeout;
    constructor(request: APIRequestContext, options?: ApiClientOptions);
    /**
     * Build full URL with query parameters
     */
    private buildUrl;
    /**
     * Merge headers with defaults
     */
    private mergeHeaders;
    /**
     * GET request
     */
    get(path: string, options?: RequestOptions): Promise<APIResponse>;
    /**
     * POST request
     */
    post(path: string, data?: unknown, options?: RequestOptions): Promise<APIResponse>;
    /**
     * PUT request
     */
    put(path: string, data?: unknown, options?: RequestOptions): Promise<APIResponse>;
    /**
     * PATCH request
     */
    patch(path: string, data?: unknown, options?: RequestOptions): Promise<APIResponse>;
    /**
     * DELETE request
     */
    delete(path: string, options?: RequestOptions): Promise<APIResponse>;
    /**
     * Assert response status is successful (2xx)
     */
    assertSuccess(response: APIResponse): Promise<void>;
    /**
     * Parse JSON response with error handling
     */
    parseJson<T = unknown>(response: APIResponse): Promise<T>;
    /**
     * Get response and assert it's successful with JSON body
     */
    getJson<T = unknown>(path: string, options?: RequestOptions): Promise<T>;
    /**
     * Post data and assert successful response with JSON body
     */
    postJson<T = unknown>(path: string, data?: unknown, options?: RequestOptions): Promise<T>;
    /**
     * Put data and assert successful response with JSON body
     */
    putJson<T = unknown>(path: string, data?: unknown, options?: RequestOptions): Promise<T>;
    /**
     * Patch data and assert successful response with JSON body
     */
    patchJson<T = unknown>(path: string, data?: unknown, options?: RequestOptions): Promise<T>;
    /**
     * Delete and assert successful response
     */
    deleteAndAssert(path: string, options?: RequestOptions): Promise<void>;
}
//# sourceMappingURL=api-client.d.ts.map