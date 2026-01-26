import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { CreateKnowledgeBaseRequest, UpdateKnowledgeBaseRequest } from '../../services/knowledgeBaseApi';
import { KnowledgeBase } from '../../types';
import { LlmModel } from '../../types/workflow';
import { workflowApi } from '../../services/workflowApi';

interface KnowledgeBaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateKnowledgeBaseRequest | UpdateKnowledgeBaseRequest) => Promise<void>;
  initialData?: KnowledgeBase;
}

export const KnowledgeBaseDialog: React.FC<KnowledgeBaseDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [vectorDimension, setVectorDimension] = useState(1536);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description || '');
      setVectorDimension(initialData.vectorDimension);
    } else {
      setName('');
      setDescription('');
      setVectorDimension(1536);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        name,
        description,
        vectorDimension: initialData ? undefined : vectorDimension, // Only send dimension on create
      });
      onClose();
    } catch (error) {
      console.error('Failed to submit:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-[500px] max-w-full mx-4">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">
            {initialData ? t('edit_kb_title') : t('create_kb_title')}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('name')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('placeholder_kb_name')}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('description')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
              placeholder={t('placeholder_kb_desc')}
            />
          </div>

          {!initialData && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('vector_dimension')}</label>
              <input
                type="number"
                value={vectorDimension}
                onChange={(e) => setVectorDimension(parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!!initialData}
              />
              <p className="text-xs text-gray-500 mt-1">{t('vector_dimension_help')}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? t('saving') : (initialData ? t('update') : t('create'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
