import { BASE_URL } from '../config';
import { tokenService } from './tokenService';

export interface EventConfig {
  id?: string;
  name: string;
  displayName: string;
  description: string;
  workflowName: string;
  enabled: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

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
  // Expected format: { code: number, message: string, data: T, success: boolean }
  if (json && typeof json === 'object' && 'data' in json && 'code' in json) {
    if (json.success === false) {
      throw new Error(json.message || 'API request failed');
    }
    return json.data as T;
  }

  return json as T;
};

export const eventService = {
  // 1. 获取所有事件
  getAllEvents: async (): Promise<EventConfig[]> => {
    try {
      const response = await fetch(`${BASE_URL}/api/v1/events`, {
        headers: getHeaders(),
      });
      return handleResponse<EventConfig[]>(response);
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  },

  // 2. 获取所有启用的事件
  getEnabledEvents: async (): Promise<EventConfig[]> => {
    try {
      const response = await fetch(`${BASE_URL}/api/v1/events/enabled`, {
        headers: getHeaders(),
      });
      return handleResponse<EventConfig[]>(response);
    } catch (error) {
      console.error('Error fetching enabled events:', error);
      throw error;
    }
  },

  // 3. 根据ID获取事件
  getEventById: async (eventId: string): Promise<EventConfig> => {
    try {
      const response = await fetch(`${BASE_URL}/api/v1/events/${eventId}`, {
        headers: getHeaders(),
      });
      return handleResponse<EventConfig>(response);
    } catch (error) {
      console.error(`Error fetching event ${eventId}:`, error);
      throw error;
    }
  },

  // 4. 创建事件
  createEvent: async (event: Omit<EventConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<EventConfig> => {
    try {
      const response = await fetch(`${BASE_URL}/api/v1/events`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(event),
      });
      return handleResponse<EventConfig>(response);
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  },

  // 5. 更新事件
  updateEvent: async (eventId: string, event: Partial<EventConfig>): Promise<EventConfig> => {
    try {
      const response = await fetch(`${BASE_URL}/api/v1/events/${eventId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(event),
      });
      return handleResponse<EventConfig>(response);
    } catch (error) {
      console.error(`Error updating event ${eventId}:`, error);
      throw error;
    }
  },

  // 6. 删除事件
  deleteEvent: async (eventId: string): Promise<void> => {
    try {
      const response = await fetch(`${BASE_URL}/api/v1/events/${eventId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse<void>(response);
    } catch (error) {
      console.error(`Error deleting event ${eventId}:`, error);
      throw error;
    }
  },
};
