import React, { useState, useEffect } from 'react';
import { X, Wand2, Loader2, Bot } from 'lucide-react';
import { workflowApi } from '../services/workflowApi';
import { LlmModel } from '../types/workflow';

interface WorkflowGeneratorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (prompt: string, modelId: string) => Promise<void>;
}

export const WorkflowGeneratorDialog: React.FC<WorkflowGeneratorDialogProps> = ({
  isOpen,
  onClose,
  onGenerate
}) => {
  const [prompt, setPrompt] = useState('');
  const [selectedModelId, setSelectedModelId] = useState('');
  const [models, setModels] = useState<LlmModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadModels();
      setPrompt('');
      setError(null);
    }
  }, [isOpen]);

  const loadModels = async () => {
    try {
      setLoading(true);
      const data = await workflowApi.getEnabledModels();
      setModels(data);
      if (data.length > 0) {
        setSelectedModelId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load models', err);
      setError('Failed to load AI models');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !selectedModelId) return;

    try {
      setGenerating(true);
      setError(null);
      await onGenerate(prompt, selectedModelId);
      onClose();
    } catch (err: any) {
      console.error('Generation failed', err);
      setError(err.message || 'Failed to generate workflow');
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-purple-50 to-white">
          <div className="flex items-center gap-2 text-purple-700">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Wand2 size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">Generate Workflow</h3>
              <p className="text-xs text-purple-600/80">Describe what you want, AI builds it</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select AI Model
            </label>
            {loading ? (
              <div className="w-full h-10 bg-gray-50 rounded-lg animate-pulse" />
            ) : (
              <div className="relative">
                <Bot className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <select
                  value={selectedModelId}
                  onChange={(e) => setSelectedModelId(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all appearance-none cursor-pointer"
                >
                  {models.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name} ({model.provider})
                    </option>
                  ))}
                  {models.length === 0 && <option disabled>No enabled models found</option>}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="E.g., Create a customer support workflow that identifies intent, searches knowledge base for answers, and transfers to human if sentiment is negative..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all min-h-[120px] resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating || !prompt.trim() || !selectedModelId}
            className="px-6 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm shadow-purple-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {generating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 size={16} />
                Generate Workflow
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};