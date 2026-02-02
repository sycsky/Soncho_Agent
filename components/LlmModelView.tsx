import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LlmModel, LlmProvider } from '../types/workflow';
import { workflowApi } from '../services/workflowApi';
import { Bot, Plus, Trash2, Edit2, CheckCircle, XCircle, Play, Save, X, RefreshCw, Eye, EyeOff } from 'lucide-react';

export const LlmModelView: React.FC = () => {
  const { t } = useTranslation();
  const [models, setModels] = useState<LlmModel[]>([]);
  const [providers, setProviders] = useState<LlmProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentModel, setCurrentModel] = useState<Partial<LlmModel>>({});
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testingModelId, setTestingModelId] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  // Fetch models and providers on mount
  useEffect(() => {
    fetchModels();
    fetchProviders();
  }, []);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const data = await workflowApi.getAllModels();
      setModels(data);
    } catch (error) {
      console.error('Failed to fetch models:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProviders = async () => {
    try {
      const data = await workflowApi.getLlmProviders();
      setProviders(data);
    } catch (error) {
      console.error('Failed to fetch providers:', error);
    }
  };

  const handleSave = async () => {
    try {
      if (currentModel.id) {
        await workflowApi.updateLlmModel(currentModel.id, currentModel);
      } else {
        await workflowApi.createLlmModel(currentModel);
      }
      
      setIsEditing(false);
      setCurrentModel({});
      fetchModels();
    } catch (error) {
      console.error('Failed to save model:', error);
      alert('Failed to save model: ' + (error as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this model?')) return;

    try {
      await workflowApi.deleteLlmModel(id);
      fetchModels();
    } catch (error) {
      console.error('Failed to delete model:', error);
      alert('Failed to delete model: ' + (error as Error).message);
    }
  };

  const handleTest = async (id: string) => {
    setTestingModelId(id);
    setTestResult(null);
    try {
      const result = await workflowApi.testLlmModel(id);
      setTestResult({
        success: result.success,
        message: result.message || (result.success ? 'Connection successful' : 'Connection failed'),
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Network error or server failed to respond',
      });
    } finally {
      setTestingModelId(null);
    }
  };

  const startEdit = (model?: LlmModel) => {
    if (model) {
      setCurrentModel({ ...model, apiKey: '' }); // Don't show API key by default, user can overwrite
    } else {
      setCurrentModel({
        provider: providers[0]?.code || 'OPENAI',
        modelType: 'CHAT',
        enabled: true,
        supportsFunctions: true,
        supportsVision: false,
        defaultTemperature: 0.7,
        contextWindow: 4096,
      });
    }
    setIsEditing(true);
    setTestResult(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bot size={20} className="text-indigo-600" />
          <h3 className="text-lg font-semibold">LLM Models</h3>
        </div>
        <button 
          onClick={() => startEdit()}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
        >
          <Plus size={16} /> Add Model
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        Configure Large Language Models for your agents. You can add models from various providers like OpenAI, Azure, Anthropic, etc.
      </p>

      {isEditing ? (
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-6 animate-in fade-in zoom-in duration-200">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-gray-800">{currentModel.id ? 'Edit Model' : 'New Model'}</h4>
            <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name</label>
              <input 
                type="text" 
                value={currentModel.name || ''} 
                onChange={e => setCurrentModel({...currentModel, name: e.target.value})}
                placeholder="e.g. GPT-4 Turbo"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Code</label>
              <input 
                type="text" 
                value={currentModel.code || ''} 
                onChange={e => setCurrentModel({...currentModel, code: e.target.value})}
                placeholder="e.g. gpt4-turbo"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Provider</label>
              <select 
                value={currentModel.provider || ''} 
                onChange={e => {
                  const selectedProvider = providers.find(p => p.code === e.target.value);
                  setCurrentModel({
                    ...currentModel, 
                    provider: e.target.value,
                    baseUrl: selectedProvider?.defaultBaseUrl || currentModel.baseUrl
                  });
                }}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-white"
              >
                {providers.map(p => (
                  <option key={p.code} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Model Type</label>
              <select 
                value={currentModel.modelType || 'CHAT'} 
                onChange={e => {
                  const newType = e.target.value as 'CHAT' | 'EMBEDDING';
                  const updates: Partial<LlmModel> = { modelType: newType };
                  // If changing to EMBEDDING, ensure isDefault is false
                  if (newType === 'EMBEDDING') {
                    updates.isDefault = false;
                  }
                  setCurrentModel({...currentModel, ...updates});
                }}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-white"
              >
                <option value="CHAT">Chat</option>
                <option value="EMBEDDING">Embedding</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Model Name (API ID)</label>
              <input 
                type="text" 
                value={currentModel.modelName || ''} 
                onChange={e => setCurrentModel({...currentModel, modelName: e.target.value})}
                placeholder="e.g. gpt-4-turbo-preview"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="relative">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">API Key</label>
              <div className="relative">
                <input 
                  type={showApiKey ? "text" : "password"}
                  value={currentModel.apiKey || ''} 
                  onChange={e => setCurrentModel({...currentModel, apiKey: e.target.value})}
                  placeholder={currentModel.id ? "(Leave blank to keep unchanged)" : "sk-..."}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 pr-10"
                />
                <button 
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Base URL (Optional)</label>
              <input 
                type="text" 
                value={currentModel.baseUrl || ''} 
                onChange={e => setCurrentModel({...currentModel, baseUrl: e.target.value})}
                placeholder="https://api.openai.com/v1"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            {currentModel.provider === 'AZURE_OPENAI' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Deployment Name</label>
                  <input 
                    type="text" 
                    value={currentModel.azureDeploymentName || ''} 
                    onChange={e => setCurrentModel({...currentModel, azureDeploymentName: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">API Version</label>
                  <input 
                    type="text" 
                    value={currentModel.apiVersion || ''} 
                    onChange={e => setCurrentModel({...currentModel, apiVersion: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
             <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Context Window</label>
              <input 
                type="number" 
                value={currentModel.contextWindow || 4096} 
                onChange={e => setCurrentModel({...currentModel, contextWindow: parseInt(e.target.value)})}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
             <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Default Temp</label>
              <input 
                type="number" 
                step="0.1"
                min="0"
                max="2"
                value={currentModel.defaultTemperature || 0.7} 
                onChange={e => setCurrentModel({...currentModel, defaultTemperature: parseFloat(e.target.value)})}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
             <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Input Price / 1k</label>
              <input 
                type="number" 
                step="0.0001"
                value={currentModel.inputPricePer1k || 0} 
                onChange={e => setCurrentModel({...currentModel, inputPricePer1k: parseFloat(e.target.value)})}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 mb-6">
             <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={currentModel.supportsFunctions || false}
                  onChange={e => setCurrentModel({...currentModel, supportsFunctions: e.target.checked})}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                Supports Functions
             </label>
             <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={currentModel.supportsVision || false}
                  onChange={e => setCurrentModel({...currentModel, supportsVision: e.target.checked})}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                Supports Vision
             </label>
             <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={currentModel.enabled ?? true}
                  onChange={e => setCurrentModel({...currentModel, enabled: e.target.checked})}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                Enabled
             </label>
             <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer" title={currentModel.modelType === 'EMBEDDING' ? "Embedding models cannot be default" : ""}>
                <input 
                  type="checkbox" 
                  checked={currentModel.isDefault || false}
                  onChange={e => setCurrentModel({...currentModel, isDefault: e.target.checked})}
                  disabled={currentModel.modelType === 'EMBEDDING'}
                  className="rounded text-indigo-600 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                Default Model
             </label>
             <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={currentModel.statusExplanation || false}
                  onChange={e => setCurrentModel({...currentModel, statusExplanation: e.target.checked})}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                {t('status_explanation_model')}
             </label>
          </div>

          <div className="flex justify-end gap-2">
            <button 
              onClick={() => setIsEditing(false)} 
              className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={!currentModel.name || !currentModel.code || !currentModel.provider || !currentModel.modelName}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={16} /> Save Model
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading models...</div>
          ) : models.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              No models configured. Click "Add Model" to get started.
            </div>
          ) : (
            models.map(model => (
              <div key={model.id} className={`flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-all ${model.enabled ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200 opacity-75'}`}>
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${model.enabled ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-200 text-gray-500'}`}>
                    <Bot size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-gray-800">{model.name}</h4>
                      <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">{model.provider}</span>
                      {model.isDefault && <span className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">Default</span>}
                      {model.statusExplanation && <span className="text-[10px] uppercase font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">{t('status')}</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                      <span className="font-mono">{model.modelName}</span>
                      <span>•</span>
                      <span>{model.contextWindow?.toLocaleString()} ctx</span>
                      {model.supportsFunctions && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-green-600"><CheckCircle size={10} /> Functions</span>
                        </>
                      )}
                      {model.supportsVision && (
                         <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-purple-600"><CheckCircle size={10} /> Vision</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {testingModelId === model.id ? (
                     <span className="text-xs text-indigo-600 flex items-center gap-1 animate-pulse"><RefreshCw size={12} className="animate-spin"/> Testing...</span>
                  ) : (
                    <button 
                      onClick={() => handleTest(model.id)} 
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Test Connection"
                    >
                      <Play size={16} />
                    </button>
                  )}
                  <button 
                    onClick={() => startEdit(model)} 
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(model.id)} 
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {testResult && (
        <div className={`fixed bottom-8 right-8 p-4 rounded-lg shadow-lg border flex items-center gap-3 animate-in slide-in-from-bottom-4 ${testResult.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {testResult.success ? <CheckCircle size={20} /> : <XCircle size={20} />}
          <div>
            <h5 className="font-bold text-sm">{testResult.success ? 'Success' : 'Failed'}</h5>
            <p className="text-xs opacity-90">{testResult.message}</p>
          </div>
          <button onClick={() => setTestResult(null)} className="ml-2 hover:opacity-70"><X size={14}/></button>
        </div>
      )}
    </div>
  );
};
