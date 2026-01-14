import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Edit, Trash2, Play, MoreHorizontal, CheckCircle, XCircle, Globe, Server } from 'lucide-react';
import { AiTool, AiToolType } from '../../types/aiTool';
import aiToolApi from '../../services/aiToolApi';
import { AiToolTestDialog } from './AiToolTestDialog';
import { AiToolEditDialog } from './AiToolEditDialog';
import notificationService from '../../services/notificationService';

export const AiToolsSettings: React.FC = () => {
  const { t } = useTranslation();
  const [tools, setTools] = useState<AiTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | AiToolType>('ALL');
  
  // Dialog states
  const [editingTool, setEditingTool] = useState<AiTool | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [testingTool, setTestingTool] = useState<AiTool | null>(null);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);

  const fetchTools = async () => {
    setLoading(true);
    try {
      const data = await aiToolApi.getTools(keyword);
      setTools(data);
    } catch (error) {
      console.error('Failed to fetch tools', error);
      notificationService.error(t('fetch_tools_failed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTools();
  }, [keyword]);

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('delete_confirm'))) return;
    
    try {
      await aiToolApi.deleteTool(id);
      setTools(tools.filter(t => t.id !== id));
      notificationService.success(t('tool_deleted_success'));
    } catch (error) {
      console.error('Failed to delete tool', error);
      notificationService.error(t('tool_delete_failed'));
    }
  };

  const handleToggleEnabled = async (tool: AiTool) => {
    try {
      const updatedTool = await aiToolApi.updateTool(tool.id, { enabled: !tool.enabled });
      setTools(tools.map(t => t.id === tool.id ? updatedTool : t));
      notificationService.success(updatedTool.enabled ? t('tool_enabled') : t('tool_disabled'));
    } catch (error) {
      console.error('Failed to update tool status', error);
      notificationService.error(t('tool_status_update_failed'));
    }
  };

  const handleCreate = () => {
    setEditingTool(null);
    setIsEditDialogOpen(true);
  };

  const handleEdit = (tool: AiTool) => {
    setEditingTool(tool);
    setIsEditDialogOpen(true);
  };

  const handleTest = (tool: AiTool) => {
    setTestingTool(tool);
    setIsTestDialogOpen(true);
  };

  const handleSave = async () => {
    await fetchTools();
    setIsEditDialogOpen(false);
  };

  const filteredTools = tools.filter(t => typeFilter === 'ALL' || t.toolType === typeFilter);

  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <div>
          <h2 className="text-lg font-bold text-gray-800">{t('ai_tools')}</h2>
          <p className="text-xs text-gray-500">{t('ai_tools_desc')}</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
        >
          <Plus size={16} />
          {t('create_tool')}
        </button>
      </div>

      {/* Toolbar */}
      <div className="p-4 border-b border-gray-100 flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t('search_tools_placeholder')}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">{t('all_types')}</option>
            <option value="API">API</option>
            <option value="MCP">MCP</option>
          </select>
        </div>
      </div>

      {/* Tool List */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
        {loading ? (
          <div className="flex justify-center items-center h-32 text-gray-400">
            {t('loading_tools')}
          </div>
        ) : filteredTools.length === 0 ? (
          <div className="text-center text-gray-400 mt-12">
            <p>{t('no_tools_found')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTools.map(tool => (
              <div key={tool.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    <div className={`p-3 rounded-lg h-fit ${tool.toolType === 'API' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                      {tool.toolType === 'API' ? <Globe size={24} /> : <Server size={24} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-800 text-base">{tool.displayName}</h3>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${
                          tool.toolType === 'API' 
                            ? 'bg-blue-50 text-blue-600 border-blue-100' 
                            : 'bg-purple-50 text-purple-600 border-purple-100'
                        }`}>
                          {tool.toolType}
                        </span>
                      </div>
                      <div className="font-mono text-xs text-gray-500 mb-2">{tool.name}</div>
                      <p className="text-sm text-gray-600 mb-3 max-w-2xl">{tool.description}</p>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
                          {t('parameters_title')}: {tool.parameters.map(p => p.name).join(', ') || t('none')}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-3">
                    <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${
                      tool.enabled ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {tool.enabled ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {tool.enabled ? t('enabled') : t('disabled')}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <button 
                        onClick={() => handleTest(tool)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title={t('test_tool')}
                      >
                        <Play size={16} />
                      </button>
                      <button 
                        onClick={() => handleEdit(tool)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title={t('edit_tool')}
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleToggleEnabled(tool)}
                        className={`p-1.5 rounded transition-colors ${
                          tool.enabled 
                            ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50' 
                            : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                        }`}
                        title={tool.enabled ? t('disabled') : t('enabled')}
                      >
                        {tool.enabled ? <XCircle size={16} /> : <CheckCircle size={16} />}
                      </button>
                      <button 
                        onClick={() => handleDelete(tool.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title={t('delete_tool')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      {isTestDialogOpen && testingTool && (
        <AiToolTestDialog
          tool={testingTool}
          isOpen={isTestDialogOpen}
          onClose={() => setIsTestDialogOpen(false)}
        />
      )}

      {isEditDialogOpen && (
        <AiToolEditDialog
          tool={editingTool}
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
};
