import api from './api';
import { Agent } from '../types';

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface UpdateProfileRequest {
  email?: string;
  avatarUrl?: string;
  name?: string;
}

export const authService = {
  changePassword: async (data: ChangePasswordRequest): Promise<void> => {
    return api.post<void>('/auth/change-password', data);
  },

  updateProfile: async (data: UpdateProfileRequest): Promise<Agent> => {
    return api.put<Agent>('/auth/profile', data);
  }
};
