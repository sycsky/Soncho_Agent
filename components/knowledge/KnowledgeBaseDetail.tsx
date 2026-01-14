import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Search, Plus, FileText, RefreshCw, Trash2, Edit, ExternalLink, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { KnowledgeBase, KnowledgeDocument, SearchResult } from '../../types';
import knowledgeBaseApi, { Page } from '../../services/knowledgeBaseApi';
import { DocumentDialog } from './DocumentDialog';
import notificationService from '../../services/notificationService';

interface KnowledgeBaseDetailProps {
  knowledgeBase: KnowledgeBase;
  onBack: () => void;
}

export const KnowledgeBaseDetail: React.FC<KnowledgeBaseDetailProps> = ({
  knowledgeBase,
  onBack,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'DOCUMENTS' | 'TEST'>('DOCUMENTS');
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isDocDialogOpen, setIsDocDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<KnowledgeDocument | undefined>(undefined);

  // Test Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await knowledgeBaseApi.getDocuments(knowledgeBase.id, page, 20);
      setDocuments(res.content);
      setTotalPages(res.totalPages);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  }, [knowledgeBase.id, page]);

  useEffect(() => {
    if (activeTab === 'DOCUMENTS') {
      fetchDocuments();
    }
  }, [activeTab, fetchDocuments]);

  const handleAddDocument = async (data: any) => {
    try {
      await knowledgeBaseApi.addDocument(knowledgeBase.id, data);
      notificationService.success(t('doc_added_success'));
      fetchDocuments();
    } catch (error) {
      notificationService.error(t('doc_added_failed'));
    }
  };

  const handleUpdateDocument = async (data: any) => {
    if (!editingDoc) return;
    try {
      await knowledgeBaseApi.updateDocument(knowledgeBase.id, editingDoc.id, data);
      notificationService.success(t('doc_updated_success'));
      fetchDocuments();
    } catch (error) {
      notificationService.error(t('doc_updated_failed'));
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!window.confirm(t('confirm_delete_doc'))) return;
    try {
      await knowledgeBaseApi.deleteDocument(knowledgeBase.id, docId);
      notificationService.success(t('doc_deleted_success'));
      fetchDocuments();
    } catch (error) {
      notificationService.error(t('doc_deleted_failed'));
    }
  };

  const handleReprocessDocument = async (docId: string) => {
    try {
      await knowledgeBaseApi.reprocessDocument(knowledgeBase.id, docId);
      notificationService.success(t('doc_reprocess_started'));
      fetchDocuments();
    } catch (error) {
      notificationService.error(t('doc_reprocess_failed'));
    }
  };

  const handleTestSearch = async (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    setTestResult(null);
    try {
      const result = await knowledgeBaseApi.testKnowledgeBase(knowledgeBase.id, {
        query: searchQuery,
        maxResults: 5,
        minScore: 0.5,
      });
      setTestResult(result);
    } catch (error) {
      console.error('Search error:', error);
      notificationService.error(t('search_failed'));
    } finally {
      setSearching(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle size={16} className="text-green-500" />;
      case 'PROCESSING': return <RefreshCw size={16} className="text-blue-500 animate-spin" />;
      case 'FAILED': return <AlertCircle size={16} className="text-red-500" />;
      default: return <Clock size={16} className="text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED': return t('status_completed');
      case 'PROCESSING': return t('status_processing');
      case 'FAILED': return t('status_failed');
      default: return t('status_pending');
    }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-800">{knowledgeBase.name}</h2>
            <p className="text-xs text-gray-500 flex items-center gap-2">
              <span>{t('docs_count', { count: knowledgeBase.documentCount })}</span>
              <span>•</span>
              <span>{knowledgeBase.vectorDimension} {t('dim')}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('DOCUMENTS')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'DOCUMENTS' ? 'bg-white shadow text-purple-600' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            {t('documents_tab')}
          </button>
          <button
            onClick={() => setActiveTab('TEST')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'TEST' ? 'bg-white shadow text-purple-600' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            {t('test_search_tab')}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden p-6">
        {activeTab === 'DOCUMENTS' && (
          <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-700">{t('document_list')}</h3>
              <button
                onClick={() => { setEditingDoc(undefined); setIsDocDialogOpen(true); }}
                className="bg-purple-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 flex items-center gap-2"
              >
                <Plus size={16} /> {t('add_document')}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg">
              {loading ? (
                <div className="flex items-center justify-center h-32 text-gray-500">{t('loading_documents')}</div>
              ) : documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <FileText size={48} className="text-gray-300 mb-4" />
                  <p>{t('no_documents_yet')}</p>
                </div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 w-8"></th>
                      <th className="px-4 py-3">{t('table_title')}</th>
                      <th className="px-4 py-3 w-32">{t('table_type')}</th>
                      <th className="px-4 py-3 w-32">{t('table_chunks')}</th>
                      <th className="px-4 py-3 w-32">{t('table_status')}</th>
                      <th className="px-4 py-3 w-40">{t('table_updated')}</th>
                      <th className="px-4 py-3 w-24">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-gray-50 group">
                        <td className="px-4 py-3 text-center text-gray-400">
                          <FileText size={16} />
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800">
                          <div className="truncate max-w-[200px]" title={doc.title}>{doc.title}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{doc.docType}</td>
                        <td className="px-4 py-3 text-gray-500">{doc.chunkCount}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2" title={doc.errorMessage}>
                            {getStatusIcon(doc.status)}
                            <span className={`text-xs font-medium ${
                              doc.status === 'COMPLETED' ? 'text-green-600' :
                              doc.status === 'FAILED' ? 'text-red-600' :
                              'text-gray-600'
                            }`}>{getStatusText(doc.status)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {new Date(doc.updatedAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleReprocessDocument(doc.id)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title={t('reprocess')}
                            >
                              <RefreshCw size={14} />
                            </button>
                            <button
                              onClick={() => { setEditingDoc(doc); setIsDocDialogOpen(true); }}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title={t('edit')}
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title={t('delete')}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-4 gap-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1 border border-gray-200 rounded text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm text-gray-600">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1 border border-gray-200 rounded text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'TEST' && (
          <div className="h-full flex flex-col max-w-4xl mx-auto w-full">
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('semantic_search_test')}</h3>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTestSearch(e)}
                  placeholder={t('search_placeholder')}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
                <button
                  type="button"
                  onClick={handleTestSearch}
                  disabled={searching || !searchQuery.trim()}
                  className="absolute right-2 top-2 px-4 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                >
                  {searching ? t('searching') : t('search')}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {testResult ? (
                <div className="space-y-6 pb-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <div className="text-xs font-medium text-blue-600 uppercase mb-1">{t('total_documents')}</div>
                      <div className="text-2xl font-bold text-blue-800">{testResult.documentCount}</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                      <div className="text-xs font-medium text-green-600 uppercase mb-1">{t('matches_found')}</div>
                      <div className="text-2xl font-bold text-green-800">{testResult.resultCount}</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                      <div className="text-xs font-medium text-purple-600 uppercase mb-1">{t('search_time')}</div>
                      <div className="text-2xl font-bold text-purple-800">{testResult.searchTimeMs}ms</div>
                    </div>
                  </div>

                  {/* Search Results */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                      <span>{t('retrieval_results')}</span>
                      <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Top {testResult.results.length}</span>
                    </h4>
                    
                    {testResult.results.map((result: any, index: number) => (
                      <div key={index} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col items-center justify-center bg-purple-50 text-purple-700 rounded-lg w-12 h-12 border border-purple-100">
                              <span className="text-xs font-bold">{t('score')}</span>
                              <span className="text-sm font-bold">{result.scoreFormatted}</span>
                            </div>
                            <div>
                              <h5 className="font-bold text-gray-800 text-base">{result.title}</h5>
                              <span className="text-xs text-gray-400 font-mono">ID: {result.documentId?.substring(0, 8) || 'N/A'}...</span>
                            </div>
                          </div>
                          <span className="bg-gray-100 text-gray-500 text-xs font-mono px-2 py-1 rounded">
                            {t('rank')} #{index + 1}
                          </span>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 leading-relaxed border border-gray-100">
                          {result.content}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Context Preview */}
                  <div className="bg-gray-900 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-800 bg-gray-950 flex justify-between items-center">
                      <span className="text-gray-100 font-mono text-sm font-bold">{t('llm_context_preview')}</span>
                      <span className="text-xs text-gray-500">{t('what_the_ai_sees')}</span>
                    </div>
                    <div className="p-4 overflow-x-auto">
                      <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">{testResult.context}</pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-400 mt-12">
                  <Search size={48} className="mx-auto mb-4 opacity-20" />
                  <p>{t('search_test_hint')}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <DocumentDialog
        isOpen={isDocDialogOpen}
        onClose={() => setIsDocDialogOpen(false)}
        onSubmit={editingDoc ? handleUpdateDocument : handleAddDocument}
        initialData={editingDoc}
      />
    </div>
  );
};
