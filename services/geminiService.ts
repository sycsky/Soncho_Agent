import api from './api';
import { tokenService } from './tokenService';







export const rewriteMessage = async (draft: string, sessionId?: string): Promise<string> => {
  try {
    const language = tokenService.getLanguage();
    const response = await api.post<{ rewrittenText: string }>('/ai/rewrite', { 
      text: draft,
      sessionId: sessionId,
      language: language
    });
    
    return response.rewrittenText || draft;
  } catch (error) {
    console.error("Magic Rewrite Error:", error);
    // Fallback to original text if backend fails
    return draft;
  }
};



export const suggestUserTags = async (
  conversationHistory: { role: string; content: string }[],
  userContext: string,
  sessionId?: string
): Promise<string[]> => {
  try {
    if (sessionId) {
       // Call backend API for AI tags
       const response = await api.post<{ tags: string[] }>('/ai/suggest-tags', { 
         sessionId: sessionId 
       });
       return response.tags || [];
    }


  } catch (error) {
    console.error("Gemini Tag Suggestion Error:", error);
    return [];
  }
};
