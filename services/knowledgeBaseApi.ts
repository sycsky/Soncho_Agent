import api from './api';
import { KnowledgeBase, KnowledgeDocument, SearchResult, DocumentType } from '../types';

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface CreateKnowledgeBaseRequest {
  name: string;
  description?: string;
  embeddingModelId?: string;
  vectorDimension?: number;
}

export interface UpdateKnowledgeBaseRequest {
  name?: string;
  description?: string;
  enabled?: boolean;
}

export interface CreateDocumentRequest {
  title: string;
  content: string;
  docType?: DocumentType;
  sourceUrl?: string;
  chunkSize?: number;
  chunkOverlap?: number;
  metadata?: string;
}

export interface UpdateDocumentRequest {
  title?: string;
  content?: string;
  chunkSize?: number;
}

export interface SearchRequest {
  query: string;
  maxResults?: number;
  minScore?: number;
}

export interface MultiSearchRequest extends SearchRequest {
  knowledgeBaseIds: string[];
}

export interface TestKnowledgeBaseRequest {
  query: string;
  maxResults: number;
  minScore: number;
}

export interface TestKnowledgeBaseResponse {
  knowledgeBaseName: string;
  documentCount: number;
  query: string;
  resultCount: number;
  results: TestSearchResult[];
  context: string;
  searchTimeMs: number;
  message: string;
}

export interface TestSearchResult {
  documentId: string;
  title: string;
  content: string;
  score: number;
  scoreFormatted: string;
}

const knowledgeBaseApi = {
  // Knowledge Base Management
  getKnowledgeBases: (enabledOnly: boolean = false) => {
    return api.get<KnowledgeBase[]>(`/knowledge-bases?enabledOnly=${enabledOnly}`);
  },

  createKnowledgeBase: (data: CreateKnowledgeBaseRequest) => {
    return api.post<KnowledgeBase>('/knowledge-bases', data);
  },

  updateKnowledgeBase: (id: string, data: UpdateKnowledgeBaseRequest) => {
    return api.put<KnowledgeBase>(`/knowledge-bases/${id}`, data);
  },

  deleteKnowledgeBase: (id: string) => {
    return api.delete<void>(`/knowledge-bases/${id}`);
  },

  rebuildIndex: (id: string) => {
    return api.post<void>(`/knowledge-bases/${id}/rebuild`, {});
  },

  // Document Management
  getDocuments: (kbId: string, page: number = 0, size: number = 20) => {
    return api.get<Page<KnowledgeDocument>>(`/knowledge-bases/${kbId}/documents?page=${page}&size=${size}`);
  },

  addDocument: (kbId: string, data: CreateDocumentRequest) => {
    return api.post<KnowledgeDocument>(`/knowledge-bases/${kbId}/documents`, data);
  },

  batchAddDocuments: (kbId: string, documents: CreateDocumentRequest[]) => {
    return api.post<KnowledgeDocument[]>(`/knowledge-bases/${kbId}/documents/batch`, documents);
  },

  updateDocument: (kbId: string, docId: string, data: UpdateDocumentRequest) => {
    return api.put<KnowledgeDocument>(`/knowledge-bases/${kbId}/documents/${docId}`, data);
  },

  deleteDocument: (kbId: string, docId: string) => {
    return api.delete<void>(`/knowledge-bases/${kbId}/documents/${docId}`);
  },

  reprocessDocument: (kbId: string, docId: string) => {
    return api.post<void>(`/knowledge-bases/${kbId}/documents/${docId}/reprocess`, {});
  },

  // Search
  searchKnowledgeBase: (kbId: string, data: SearchRequest) => {
    return api.post<SearchResult[]>(`/knowledge-bases/${kbId}/search`, data);
  },

  searchKnowledgeBases: (data: MultiSearchRequest) => {
    return api.post<SearchResult[]>('/knowledge-bases/search', data);
  },

  testKnowledgeBase: (kbId: string, data: TestKnowledgeBaseRequest) => {
    return api.post<TestKnowledgeBaseResponse>(`/knowledge-bases/${kbId}/test`, data);
  },
};

export default knowledgeBaseApi;
