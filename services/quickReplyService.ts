import api from './api';

export interface QuickReply {
  id: string;
  label: string;
  text: string;
  category: string;
  system: boolean;
}

export interface CreateQuickReplyRequest {
  label: string;
  text: string;
  category?: string;
}

export interface UpdateQuickReplyRequest {
  label: string;
  text: string;
  category?: string;
}

class QuickReplyServiceAPI {
  /**
   * 获取所有快捷回复
   */
  async getAllQuickReplies(agentId?: string): Promise<QuickReply[]> {
    const params = agentId ? `?agentId=${agentId}` : '';
    return api.get<QuickReply[]>(`/quick-replies${params}`);
  }

  /**
   * 获取单个快捷回复
   */
  async getQuickReplyById(id: string): Promise<QuickReply> {
    return api.get<QuickReply>(`/quick-replies/${id}`);
  }

  /**
   * 创建快捷回复
   */
  async createQuickReply(request: CreateQuickReplyRequest, agentId: string, system: boolean = false): Promise<QuickReply> {
    return api.post<QuickReply>('/quick-replies', {
      ...request,
      agentId,
      system
    });
  }

  /**
   * 创建系统快捷回复
   */
  async createSystemQuickReply(request: CreateQuickReplyRequest, agentId: string): Promise<QuickReply> {
    return this.createQuickReply(request, agentId, true);
  }

  /**
   * 更新快捷回复
   */
  async updateQuickReply(id: string, request: UpdateQuickReplyRequest, agentId: string): Promise<QuickReply> {
    return api.put<QuickReply>(`/quick-replies/${id}`, {
      ...request,
      agentId
    });
  }

  /**
   * 删除快捷回复
   */
  async deleteQuickReply(id: string, agentId: string): Promise<void> {
    return api.delete<void>(`/quick-replies/${id}`, { data: { agentId } });
  }
}

const quickReplyServiceAPI = new QuickReplyServiceAPI();
export default quickReplyServiceAPI;