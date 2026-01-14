import api from './api';

export interface OrderCancellationPolicy {
  id: string;
  name: string;
  description?: string;
  cancellableHours?: number | null;
  penaltyPercentage?: number | null;
  enabled: boolean;
  isDefault: boolean;
  sortOrder: number;
  policyType: 'FREE' | 'WITH_PENALTY' | 'NO_CANCELLATION';
  createdAt: string;
  updatedAt: string;
}

export interface SaveOrderCancellationPolicyRequest {
  name: string;
  description?: string;
  cancellableHours?: number | null;
  penaltyPercentage?: number | null;
  enabled: boolean;
  isDefault?: boolean;
  sortOrder?: number;
  policyType: 'FREE' | 'WITH_PENALTY' | 'NO_CANCELLATION';
}

/**
 * 获取所有取消政策
 */
export const getAllPolicies = async (): Promise<OrderCancellationPolicy[]> => {
  const response = await api.get<OrderCancellationPolicy[]>('/order-cancellation-policies');
  console.log('getAllPolicies response:', response);
  return response;
};

/**
 * 获取启用的取消政策
 */
export const getEnabledPolicies = async (): Promise<OrderCancellationPolicy[]> => {
  return api.get<OrderCancellationPolicy[]>('/order-cancellation-policies/enabled');
};

/**
 * 获取默认取消政策
 * @deprecated 不再使用默认政策，改用阶梯匹配逻辑
 */
export const getDefaultPolicy = async (): Promise<OrderCancellationPolicy> => {
  return api.get<OrderCancellationPolicy>('/order-cancellation-policies/default');
};

/**
 * 根据ID获取取消政策
 */
export const getPolicyById = async (id: string): Promise<OrderCancellationPolicy> => {
  return api.get<OrderCancellationPolicy>(`/order-cancellation-policies/${id}`);
};

/**
 * 创建取消政策
 */
export const createPolicy = async (
  request: SaveOrderCancellationPolicyRequest
): Promise<OrderCancellationPolicy> => {
  return api.post<OrderCancellationPolicy>('/order-cancellation-policies', request);
};

/**
 * 更新取消政策
 */
export const updatePolicy = async (
  id: string,
  request: SaveOrderCancellationPolicyRequest
): Promise<OrderCancellationPolicy> => {
  return api.put<OrderCancellationPolicy>(`/order-cancellation-policies/${id}`, request);
};

/**
 * 删除取消政策
 */
export const deletePolicy = async (id: string): Promise<void> => {
  await api.delete<void>(`/order-cancellation-policies/${id}`);
};

/**
 * 设置默认取消政策
 * @deprecated 不再使用默认政策，改用阶梯匹配逻辑
 */
export const setDefaultPolicy = async (id: string): Promise<void> => {
  await api.put<void>(`/order-cancellation-policies/${id}/set-default`, {});
};

/**
 * 上移政策
 */
export const movePolicyUp = async (id: string): Promise<void> => {
  await api.put<void>(`/order-cancellation-policies/${id}/move-up`, {});
};

/**
 * 下移政策
 */
export const movePolicyDown = async (id: string): Promise<void> => {
  await api.put<void>(`/order-cancellation-policies/${id}/move-down`, {});
};

