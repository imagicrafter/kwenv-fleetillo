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
export class ApiClient {
  private request: APIRequestContext;
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;

  constructor(request: APIRequestContext, options: ApiClientOptions = {}) {
    this.request = request;
    this.baseURL = options.baseURL || '';
    this.defaultHeaders = options.headers || {};
    this.timeout = options.timeout || 30000;
  }

  /**
   * Build full URL with query parameters
   */
  private buildUrl(path: string, params?: Record<string, string>): string {
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
  private mergeHeaders(headers?: Record<string, string>): Record<string, string> {
    return { ...this.defaultHeaders, ...headers };
  }

  /**
   * GET request
   */
  async get(path: string, options: RequestOptions = {}): Promise<APIResponse> {
    const url = this.buildUrl(path, options.params);
    return await this.request.get(url, {
      headers: this.mergeHeaders(options.headers),
      timeout: options.timeout || this.timeout,
    });
  }

  /**
   * POST request
   */
  async post(
    path: string,
    data?: unknown,
    options: RequestOptions = {}
  ): Promise<APIResponse> {
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
  async put(
    path: string,
    data?: unknown,
    options: RequestOptions = {}
  ): Promise<APIResponse> {
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
  async patch(
    path: string,
    data?: unknown,
    options: RequestOptions = {}
  ): Promise<APIResponse> {
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
  async delete(path: string, options: RequestOptions = {}): Promise<APIResponse> {
    const url = this.buildUrl(path, options.params);
    return await this.request.delete(url, {
      headers: this.mergeHeaders(options.headers),
      timeout: options.timeout || this.timeout,
    });
  }

  /**
   * Assert response status is successful (2xx)
   */
  async assertSuccess(response: APIResponse): Promise<void> {
    if (!response.ok()) {
      const body = await response.text();
      throw new Error(
        `Expected successful response but got ${response.status()}: ${body}`
      );
    }
  }

  /**
   * Parse JSON response with error handling
   */
  async parseJson<T = unknown>(response: APIResponse): Promise<T> {
    try {
      return await response.json() as T;
    } catch (error) {
      const text = await response.text();
      throw new Error(`Failed to parse JSON response: ${text}. Error: ${error}`);
    }
  }

  /**
   * Get response and assert it's successful with JSON body
   */
  async getJson<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.get(path, options);
    await this.assertSuccess(response);
    return await this.parseJson<T>(response);
  }

  /**
   * Post data and assert successful response with JSON body
   */
  async postJson<T = unknown>(
    path: string,
    data?: unknown,
    options: RequestOptions = {}
  ): Promise<T> {
    const response = await this.post(path, data, options);
    await this.assertSuccess(response);
    return await this.parseJson<T>(response);
  }

  /**
   * Put data and assert successful response with JSON body
   */
  async putJson<T = unknown>(
    path: string,
    data?: unknown,
    options: RequestOptions = {}
  ): Promise<T> {
    const response = await this.put(path, data, options);
    await this.assertSuccess(response);
    return await this.parseJson<T>(response);
  }

  /**
   * Patch data and assert successful response with JSON body
   */
  async patchJson<T = unknown>(
    path: string,
    data?: unknown,
    options: RequestOptions = {}
  ): Promise<T> {
    const response = await this.patch(path, data, options);
    await this.assertSuccess(response);
    return await this.parseJson<T>(response);
  }

  /**
   * Delete and assert successful response
   */
  async deleteAndAssert(path: string, options: RequestOptions = {}): Promise<void> {
    const response = await this.delete(path, options);
    await this.assertSuccess(response);
  }
}
