import api from './api';

export enum CustomerChannel {
  WEB = 'WEB',
  WECHAT = 'WECHAT',
  WHATSAPP = 'WHATSAPP',
  LINE = 'LINE',
  TELEGRAM = 'TELEGRAM',
  FACEBOOK = 'FACEBOOK',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PHONE = 'PHONE',
  APP = 'APP'
}

export interface Customer {
  id: string;
  name: string;
  primaryChannel: CustomerChannel;
  email?: string;
  phone?: string;
  wechatOpenId?: string;
  whatsappPhone?: string;
  lineUserId?: string;
  telegramUserId?: string;
  facebookPsid?: string;
  tags: string[];
  notes?: string;
  active: boolean;
  createdAt: string;
  lastInteractionAt?: string;
  roleCode?: string;
  roleName?: string;
}

export interface CustomerRole {
  code: string;
  name: string;
  description?: string;
}

export interface CreateRoleRequest {
  code: string;
  name: string;
  description?: string;
}

export interface CustomerListParams {
  name?: string;
  channel?: CustomerChannel;
  active?: boolean;
  page?: number;
  size?: number;
}

export interface CustomerListResponse {
  content: Customer[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
}

export interface CreateCustomerRequest {
  name: string;
  primaryChannel: CustomerChannel;
  email?: string;
  phone?: string;
  wechatOpenId?: string;
  whatsappPhone?: string;
  lineUserId?: string;
  telegramUserId?: string;
  facebookPsid?: string;
  tags?: string[];
  notes?: string;
}

export interface UpdateCustomerRequest {
  name?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  notes?: string;
  active?: boolean;
}

export interface CustomerTokenResponse {
  customerId: string;
  token: string;
}

class CustomerServiceAPI {
  /**
   * 获取客户列表
   */
  async getCustomers(params: CustomerListParams = {}): Promise<CustomerListResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.name) queryParams.append('name', params.name);
    if (params.channel) queryParams.append('channel', params.channel);
    if (params.active !== undefined) queryParams.append('active', String(params.active));
    if (params.page !== undefined) queryParams.append('page', String(params.page));
    if (params.size !== undefined) queryParams.append('size', String(params.size));
    
    const query = queryParams.toString();
    const endpoint = query ? `/customers?${query}` : '/customers';
    
    return api.get<CustomerListResponse>(endpoint);
  }

  /**
   * 获取客户详情
   */
  async getCustomerById(customerId: string): Promise<Customer> {
    return api.get<Customer>(`/customers/${customerId}`);
  }

  /**
   * 创建客户
   */
  async createCustomer(request: CreateCustomerRequest): Promise<Customer> {
    return api.post<Customer>('/customers', request);
  }

  /**
   * 更新客户信息
   */
  async updateCustomer(customerId: string, request: UpdateCustomerRequest): Promise<Customer> {
    return api.put<Customer>(`/customers/${customerId}`, request);
  }

  /**
   * 为客户生成 Token（用于客服人员协助客户）
   */
  async generateCustomerToken(customerId: string): Promise<CustomerTokenResponse> {
    return api.post<CustomerTokenResponse>(`/customers/${customerId}/token`, {});
  }

  /**
   * 删除客户
   */
  async deleteCustomer(customerId: string): Promise<void> {
    return api.delete<void>(`/customers/${customerId}`);
  }

  /**
   * 批量更新客户标签
   */
  async updateCustomerTags(customerId: string, tags: string[]): Promise<Customer> {
    return api.put<Customer>(`/customers/${customerId}`, { tags });
  }

  /**
   * 获取客户的会话历史
   */
  async getCustomerConversations(customerId: string): Promise<any[]> {
    return api.get<any[]>(`/customers/${customerId}/conversations`);
  }

  /**
   * 获取客户所有标签
   */
  async getCustomerTags(customerId: string): Promise<string[]> {
    return api.get<string[]>(`/customers/${customerId}/tags`);
  }

  /**
   * 获取客户手动标签
   */
  async getCustomerManualTags(customerId: string): Promise<string[]> {
    return api.get<string[]>(`/customers/${customerId}/tags/manual`);
  }

  /**
   * 获取客户AI标签
   */
  async getCustomerAiTags(customerId: string): Promise<string[]> {
    return api.get<string[]>(`/customers/${customerId}/tags/ai`);
  }

  /**
   * 添加客户手动标签
   */
  async addCustomerManualTag(customerId: string, tag: string): Promise<Customer> {
    return api.post<Customer>(`/customers/${customerId}/tags/manual`, { tag });
  }

  /**
   * 删除客户手动标签
   */
  async removeCustomerManualTag(customerId: string, tag: string): Promise<Customer> {
    return api.delete<Customer>(`/customers/${customerId}/tags/manual`, { data: { tag } });
  }

  /**
   * 删除客户AI标签
   */
  async removeCustomerAiTag(customerId: string, tag: string): Promise<Customer> {
    return api.delete<Customer>(`/customers/${customerId}/tags/ai`, { data: { tag } });
  }

  /**
   * 获取会话备注
   */
  async getSessionNote(sessionId: string): Promise<string> {
    return api.get<string>(`/chat/sessions/${sessionId}/note`);
  }

  /**
   * 创建会话备注
   */
  async createSessionNote(sessionId: string, content: string): Promise<string> {
    return api.post<string>(`/chat/sessions/${sessionId}/note`, { content });
  }

  /**
   * 更新会话备注
   */
  async updateSessionNote(sessionId: string, content: string): Promise<string> {
    return api.put<string>(`/chat/sessions/${sessionId}/note`, { content });
  }

  /**
   * 删除会话备注
   */
  async deleteSessionNote(sessionId: string): Promise<void> {
    return api.delete<void>(`/chat/sessions/${sessionId}/note`);
  }

  /**
   * 为客户分配特殊角色
   */
  async assignCustomerRole(customerId: string, roleCode: string): Promise<Customer> {
    return api.post<Customer>(`/customers/${customerId}/role?roleCode=${encodeURIComponent(roleCode)}`, null);
  }

  /**
   * 获取所有客户角色
   */
  async getCustomerRoles(): Promise<CustomerRole[]> {
    return api.get<CustomerRole[]>('/customer-roles');
  }

  /**
   * 创建客户角色
   */
  async createCustomerRole(request: CreateRoleRequest): Promise<CustomerRole> {
    return api.post<CustomerRole>('/customer-roles', request);
  }
}

const customerServiceAPI = new CustomerServiceAPI();
export default customerServiceAPI;
