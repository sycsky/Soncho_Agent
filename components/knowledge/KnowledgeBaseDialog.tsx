import React, { useState, useEffect } from 'react';
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
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [vectorDimension, setVectorDimension] = useState(1536);
  const [embeddingModelId, setEmbeddingModelId] = useState('');
  const [embeddingModels, setEmbeddingModels] = useState<LlmModel[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const models = await workflowApi.getAllModels();
        const embeddings = models.filter(m => m.modelType === 'EMBEDDING');
        setEmbeddingModels(embeddings);
      } catch (error) {
        console.error('Failed to fetch models:', error);
      }
    };
    
    if (isOpen) {
      fetchModels();
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description || '');
      setVectorDimension(initialData.vectorDimension);
      setEmbeddingModelId(initialData.embeddingModelId || '');
    } else {
      setName('');
      setDescription('');
      setVectorDimension(1536);
      setEmbeddingModelId('');
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
        embeddingModelId,
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
            {initialData ? 'Edit Knowledge Base' : 'Create Knowledge Base'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Product FAQ"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
              placeholder="Describe what this knowledge base contains..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Embedding Model</label>
            <select
              value={embeddingModelId}
              onChange={(e) => setEmbeddingModelId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select an embedding model...</option>
              {embeddingModels.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name} ({model.provider})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Required for vectorizing documents.</p>
          </div>

          {!initialData && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vector Dimension</label>
              <input
                type="number"
                value={vectorDimension}
                onChange={(e) => setVectorDimension(parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!!initialData}
              />
              <p className="text-xs text-gray-500 mt-1">Default: 1536 (OpenAI text-embedding-3-small)</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? 'Saving...' : (initialData ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
