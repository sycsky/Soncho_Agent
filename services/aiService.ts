import api from './api';

export interface AiSummaryResponse {
  summary: string;
}

export interface AiRewriteResponse {
  rewrittenText: string;
}

export interface AiSuggestTagsResponse {
  tags: string[];
}

const aiService = {
  /**
   * Generates a summary for the given session ID.
   * @param sessionId The ID of the session to summarize.
   */
  async summary(sessionId: string): Promise<AiSummaryResponse> {
    return api.post<AiSummaryResponse>('/ai/summary', { sessionId });
  },

  /**
   * Rewrites the given text to be more professional and polite.
   * @param text The text to rewrite.
   */
  async rewrite(text: string): Promise<AiRewriteResponse> {
    return api.post<AiRewriteResponse>('/ai/rewrite', { text });
  },

  /**
   * Suggests tags for the given session ID.
   * @param sessionId The ID of the session to analyze.
   */
  async suggestTags(sessionId: string): Promise<AiSuggestTagsResponse> {
    return api.post<AiSuggestTagsResponse>('/ai/suggest-tags', { sessionId });
  }
};

export default aiService;
