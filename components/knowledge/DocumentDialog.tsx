import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Upload, Link, Type } from 'lucide-react';
import { CreateDocumentRequest, UpdateDocumentRequest } from '../../services/knowledgeBaseApi';
import { KnowledgeDocument, DocumentType } from '../../types';

interface DocumentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateDocumentRequest | UpdateDocumentRequest) => Promise<void>;
  initialData?: KnowledgeDocument;
}

export const DocumentDialog: React.FC<DocumentDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [docType, setDocType] = useState<DocumentType>('TEXT');
  const [sourceUrl, setSourceUrl] = useState('');
  const [chunkSize, setChunkSize] = useState(500);
  const [chunkOverlap, setChunkOverlap] = useState(50);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setContent(initialData.content);
      setDocType(initialData.docType);
      setSourceUrl(initialData.sourceUrl || '');
      setChunkSize(initialData.chunkSize);
      setChunkOverlap(initialData.chunkOverlap);
    } else {
      setTitle('');
      setContent('');
      setDocType('TEXT');
      setSourceUrl('');
      setChunkSize(500);
      setChunkOverlap(50);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data: any = {
        title,
        content,
        chunkSize,
      };

      if (!initialData) {
        data.docType = docType;
        data.sourceUrl = sourceUrl;
        data.chunkOverlap = chunkOverlap;
      }

      await onSubmit(data);
      onClose();
    } catch (error) {
      console.error('Failed to submit:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-[800px] max-w-full mx-4 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
          <h3 className="text-lg font-semibold text-gray-800">
            {initialData ? t('edit_document') : t('add_document')}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {!initialData && (
            <div className="grid grid-cols-3 gap-4 mb-4">
              <button
                type="button"
                onClick={() => setDocType('TEXT')}
                className={`p-3 border rounded-lg flex flex-col items-center gap-2 ${docType === 'TEXT' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}`}
              >
                <Type size={24} />
                <span className="text-xs font-medium">{t('raw_text')}</span>
              </button>
              <button
                type="button"
                onClick={() => setDocType('MARKDOWN')}
                className={`p-3 border rounded-lg flex flex-col items-center gap-2 ${docType === 'MARKDOWN' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}`}
              >
                <Type size={24} />
                <span className="text-xs font-medium">{t('markdown')}</span>
              </button>
              <button
                type="button"
                disabled
                className="p-3 border border-gray-200 rounded-lg flex flex-col items-center gap-2 opacity-50 cursor-not-allowed"
              >
                <Upload size={24} />
                <span className="text-xs font-medium">{t('file_upload_coming_soon')}</span>
              </button>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('title')}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('placeholder_doc_title')}
              required
            />
          </div>

          {docType === 'URL' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('source_url')}</label>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/doc"
              />
            </div>
          )}

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('content')}</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[200px] font-mono text-sm"
              placeholder={t('placeholder_doc_content')}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('chunk_size')}</label>
              <input
                type="number"
                value={chunkSize}
                onChange={(e) => setChunkSize(parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                min={100}
                max={2000}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('chunk_overlap')}</label>
              <input
                type="number"
                value={chunkOverlap}
                onChange={(e) => setChunkOverlap(parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                min={0}
                max={500}
                disabled={!!initialData}
              />
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !title.trim() || !content.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? t('saving') : (initialData ? t('update_document') : t('add_document'))}
          </button>
        </div>
      </div>
    </div>
  );
};
