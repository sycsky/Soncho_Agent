import { BASE_URL } from '../config';
import notificationService from './notificationService';

// Unified response format from the backend
interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

const getToken = (): string | null => {
  try {
    return localStorage.getItem('nexus_token');
  } catch (error) {
    console.error("Could not access localStorage:", error);
    return null;
  }
};

// FIX: Add an interface for the API service to correctly type `this` and allow generic method calls.
// Fix: Added `this: ApiService` to each method signature to ensure `this` is correctly typed.
interface ApiRequestInit extends RequestInit {
  data?: unknown;
}

interface ApiService {
  request<T>(this: ApiService, endpoint: string, options?: ApiRequestInit): Promise<T>;
  get<T>(this: ApiService, endpoint: string, options?: ApiRequestInit): Promise<T>;
  post<T>(this: ApiService, endpoint: string, body: unknown, options?: ApiRequestInit): Promise<T>;
  put<T>(this: ApiService, endpoint: string, body: unknown, options?: ApiRequestInit): Promise<T>;
  delete<T>(this: ApiService, endpoint: string, options?: ApiRequestInit): Promise<T>;
}

const api: ApiService = {
  // Fix: Added `this: ApiService` to match the interface and correctly type `this`.
  async request<T>(this: ApiService, endpoint: string, options: ApiRequestInit = {}): Promise<T> {
    const url = `${BASE_URL}/api/v1${endpoint}`;
    const token = getToken();

    const headers = new Headers(options.headers || {});
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);

      // Handle 204 No Content
      if (response.status === 204) {
        return Promise.resolve() as Promise<T>;
      }

      // Handle non-OK HTTP status codes
      if (!response.ok) {
        // Try to parse error response
        try {
          const errorResponse: ApiResponse<T> = await response.json();
          const errorMessage = errorResponse.message || `HTTP ${response.status}: ${response.statusText}`;
          notificationService.error(errorMessage);
          throw new Error(errorMessage);
        } catch (parseError) {
          // If JSON parsing fails, use status text
          const errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          notificationService.error(errorMessage);
          throw new Error(errorMessage);
        }
      }

      const jsonResponse: ApiResponse<T> = await response.json();

      if (jsonResponse.code === 200) {
        return jsonResponse.data;
      } else {
        // Backend returned non-200 code in response body
        const errorMessage = jsonResponse.message || `API Error: ${jsonResponse.code}`;
        notificationService.error(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      // Network errors or other exceptions
      if (error instanceof Error) {
        // If it's already our thrown error, re-throw it
        if (error.message.startsWith('HTTP') || error.message.startsWith('API Error')) {
          throw error;
        }
        // Network error
        const errorMessage = 'Network error: Unable to connect to server';
        notificationService.error(errorMessage);
        throw new Error(errorMessage);
      }
      // Unknown error
      const errorMessage = 'An unexpected error occurred';
      notificationService.error(errorMessage);
      throw error;
    }
  },

  // Fix: Added `this: ApiService` to fix "Untyped function calls may not accept type arguments" error.
  get<T>(this: ApiService, endpoint: string, options?: ApiRequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  },

  // Fix: Added `this: ApiService` to fix "Untyped function calls may not accept type arguments" error.
  post<T>(this: ApiService, endpoint: string, body: unknown, options?: ApiRequestInit): Promise<T> {
    const isFormData = body instanceof FormData;
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: isFormData ? (body as BodyInit) : JSON.stringify(body),
    });
  },
  
  // Fix: Added `this: ApiService` to fix "Untyped function calls may not accept type arguments" error.
  put<T>(this: ApiService, endpoint: string, body: unknown, options?: ApiRequestInit): Promise<T> {
    const isFormData = body instanceof FormData;
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: isFormData ? (body as BodyInit) : JSON.stringify(body),
    });
  },

  // Fix: Added `this: ApiService` to fix "Untyped function calls may not accept type arguments" error.
  delete<T>(this: ApiService, endpoint: string, options?: ApiRequestInit): Promise<T> {
    // 如果options中包含data属性，将其作为请求体
    const config = { ...options, method: 'DELETE' };
    if (options?.data) {
      config.body = JSON.stringify(options.data);
    }
    return this.request<T>(endpoint, config);
  },
};

export default api;
