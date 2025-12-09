import api from './api';
import { SessionCategory } from '../types';

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  sortOrder?: number;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  enabled?: boolean;
  sortOrder?: number;
}

const getEnabledCategories = (): Promise<SessionCategory[]> => {
  return api.get<SessionCategory[]>('/session-categories');
};

const getAllCategories = (): Promise<SessionCategory[]> => {
  return api.get<SessionCategory[]>('/session-categories/all');
};

const getCategory = (id: string): Promise<SessionCategory> => {
  return api.get<SessionCategory>(`/session-categories/${id}`);
};

const createCategory = (data: CreateCategoryRequest): Promise<SessionCategory> => {
  return api.post<SessionCategory>('/session-categories', data);
};

const updateCategory = (id: string, data: UpdateCategoryRequest): Promise<SessionCategory> => {
  return api.put<SessionCategory>(`/session-categories/${id}`, data);
};

const deleteCategory = (id: string): Promise<void> => {
  return api.delete<void>(`/session-categories/${id}`);
};

const getGroupCategories = (groupId: string): Promise<SessionCategory[]> => {
  return api.get<SessionCategory[]>(`/session-groups/${groupId}/categories`);
};

const setGroupCategories = (
  groupId: string,
  categoryIds: string[]
): Promise<void> => {
  return api.put<void>(`/session-groups/${groupId}/categories`, { categoryIds });
};

const getAvailableCategories = (): Promise<SessionCategory[]> => {
  return api.get<SessionCategory[]>(`/session-groups/available-categories`);
};

export default {
  getEnabledCategories,
  getAllCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getGroupCategories,
  setGroupCategories,
  getAvailableCategories,
};
