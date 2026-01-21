import { ExternalPlatform, CreatePlatformRequest, UpdatePlatformRequest, PlatformTypeOption, AuthTypeOption } from '../types/platform';
import { BASE_URL } from '../config';
import { tokenService } from './tokenService';

const API_BASE = `${BASE_URL}/api/v1/webhook`;

const getToken = (): string | null => {
  return tokenService.getToken();
};

const getHeaders = () => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  if (!response.ok) {
    const errorText = await response.text();
    try {
      const errorJson = JSON.parse(errorText);
      throw new Error(errorJson.message || `HTTP Error ${response.status}`);
    } catch (e) {
      throw new Error(`HTTP Error ${response.status}: ${errorText}`);
    }
  }

  const json = await response.json();
  
  // Check if the response is wrapped in a standard API response format
  if (json && typeof json === 'object' && 'data' in json && 'code' in json) {
    if (json.success === false) {
      throw new Error(json.message || 'API request failed');
    }
    return json.data as T;
  }

  return json as T;
};

export const platformApi = {
  getPlatformTypes: async (): Promise<PlatformTypeOption[]> => {
    const response = await fetch(`${API_BASE}/platform-types`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse<PlatformTypeOption[]>(response);
  },

  getAuthTypes: async (): Promise<AuthTypeOption[]> => {
    const response = await fetch(`${API_BASE}/auth-types`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse<AuthTypeOption[]>(response);
  },

  getAllPlatforms: async (): Promise<ExternalPlatform[]> => {
    const response = await fetch(`${API_BASE}/platforms`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse<ExternalPlatform[]>(response);
  },

  getPlatformByName: async (name: string): Promise<ExternalPlatform | null> => {
    const response = await fetch(`${API_BASE}/platforms/${name}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (response.status === 404) return null;
    return handleResponse<ExternalPlatform>(response);
  },

  createPlatform: async (data: CreatePlatformRequest): Promise<ExternalPlatform> => {
    const response = await fetch(`${API_BASE}/platforms`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<ExternalPlatform>(response);
  },

  updatePlatform: async (id: string, data: UpdatePlatformRequest): Promise<ExternalPlatform> => {
    const response = await fetch(`${API_BASE}/platforms/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<ExternalPlatform>(response);
  },

  deletePlatform: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/platforms/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<void>(response);
  }
};
