import api from './api';
import { ScheduledTask, SaveScheduledTaskRequest } from '../types';

export const scheduledTaskApi = {
  getTasks: async (): Promise<ScheduledTask[]> => {
    return api.get<ScheduledTask[]>('/scheduled-tasks');
  },

  createTask: async (data: SaveScheduledTaskRequest): Promise<ScheduledTask> => {
    return api.post<ScheduledTask>('/scheduled-tasks', data);
  },

  updateTask: async (id: string, data: SaveScheduledTaskRequest): Promise<ScheduledTask> => {
    return api.put<ScheduledTask>(`/scheduled-tasks/${id}`, data);
  },

  deleteTask: async (id: string): Promise<void> => {
    return api.delete<void>(`/scheduled-tasks/${id}`);
  }
};
