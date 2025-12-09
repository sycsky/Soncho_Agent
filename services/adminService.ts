import api from './api';
import { Agent, Role } from '../types';

// Agent Related Interfaces
export interface AgentPage {
  content: Agent[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

export interface CreateAgentRequest {
  name: string;
  email: string;
  password: string;
  roleId: string;
}

export interface UpdateAgentRequest {
  name?: string;
  status?: 'ONLINE' | 'OFFLINE' | 'BUSY';
  roleId?: string;
  language?: string;
}

// Role Related Interfaces
export interface CreateRoleRequest {
  name: string;
  description?: string;
  permissions: string[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permissions?: string[];
}

// API Functions
export const getAgents = (page: number, size: number, sort: string, name?: string, role?: string): Promise<AgentPage> => {
  const params = new URLSearchParams({
    page: page.toString(),
    size: size.toString(),
    sort,
  });
  if (name) params.append('name', name);
  if (role) params.append('role', role);
  return api.get<AgentPage>(`/admin/agents?${params.toString()}`);
};

export const createAgent = (data: CreateAgentRequest): Promise<Agent> => {
  return api.post<Agent>('/admin/agents', data);
};

export const updateAgent = (id: string, data: UpdateAgentRequest): Promise<Agent> => {
  return api.put<Agent>(`/admin/agents/${id}`, data);
};

export const getRoles = (): Promise<Role[]> => {
  return api.get<Role[]>('/admin/roles');
};

export const createRole = (data: CreateRoleRequest): Promise<Role> => {
  return api.post<Role>('/admin/roles', data);
};

export const updateRole = (id: string, data: UpdateRoleRequest): Promise<Role> => {
  return api.put<Role>(`/admin/roles/${id}`, data);
};

export const deleteRole = (id: string): Promise<void> => {
  return api.delete<void>(`/admin/roles/${id}`);
};
