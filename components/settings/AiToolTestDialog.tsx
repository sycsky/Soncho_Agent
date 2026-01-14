import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Play, Loader2, CheckCircle, AlertCircle, Clock, Globe } from 'lucide-react';
import { AiTool, AiToolExecuteResponse } from '../../types/aiTool';
import aiToolApi from '../../services/aiToolApi';

interface AiToolTestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tool: AiTool;
}

export const AiToolTestDialog: React.FC<AiToolTestDialogProps> = ({ isOpen, onClose, tool }) => {
  const { t } = useTranslation();
  const [params, setParams] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiToolExecuteResponse | null>(null);

  if (!isOpen) return null;

  const handleParamChange = (key: string, value: string) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const handleExecute = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await aiToolApi.executeTool(tool.id, { params });
      setResult(res);
    } catch (error) {
      console.error('Test failed', error);
      setResult({
        success: false,
        output: t('execution_failed_network'),
        errorMessage: (error as any).message || t('unknown_error'),
        durationMs: 0,
        executionId: ''
      });
    } finally {
      setLoading(false);
    }
  };

  // Initialize params with default values if empty
  React.useEffect(() => {
    if (isOpen && tool.parameters) {
      const initialParams: Record<string, string> = {};
      tool.parameters.forEach(p => {
        if (p.defaultValue) {
          initialParams[p.name] = p.defaultValue;
        }
      });
      setParams(initialParams);
    }
  }, [isOpen, tool]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-[600px] max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
          <div>
            <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
              <Play size={18} className="text-blue-600" />
              Test Tool: {tool.displayName}
            </h3>
            <p className="text-xs text-gray-500 font-mono">{tool.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 p-1 rounded transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Input Parameters */}
          <div>
            <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Input Parameters</h4>
            <div className="space-y-4">
              {tool.parameters && tool.parameters.length > 0 ? (
                tool.parameters.map(param => (
                  <div key={param.name} className="space-y-1">
                    <div className="flex justify-between">
                      <label className="text-sm font-medium text-gray-700">
                        {param.displayName} <span className="text-gray-400 font-mono text-xs">({param.name})</span>
                      </label>
                      {param.required && <span className="text-xs text-red-500 font-medium">Required</span>}
                    </div>
                    
                    {param.type === 'ENUM' && param.enumValues ? (
                      <select
                        value={params[param.name] || ''}
                        onChange={(e) => handleParamChange(param.name, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="">Select {param.displayName}</option>
                        {param.enumValues.map(val => (
                          <option key={val} value={val}>{val}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={param.type === 'NUMBER' || param.type === 'INTEGER' ? 'number' : 'text'}
                        value={params[param.name] || ''}
                        onChange={(e) => handleParamChange(param.name, e.target.value)}
                        placeholder={param.description}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    )}
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500 italic text-center py-4 bg-gray-50 rounded-lg">
                  No parameters required for this tool.
                </div>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-end">
            <button
              onClick={handleExecute}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 transition-colors shadow-sm"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
              Execute Test
            </button>
          </div>

          <div className="h-px bg-gray-100"></div>

          {/* Execution Result */}
          <div>
            <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Execution Result</h4>
            
            {result ? (
              <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                {/* Result Status Bar */}
                <div className={`px-4 py-2 border-b border-gray-200 flex items-center justify-between ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle size={16} className="text-green-600" />
                    ) : (
                      <AlertCircle size={16} className="text-red-600" />
                    )}
                    <span className={`text-sm font-bold ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                      {result.success ? 'Success' : 'Failed'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {result.durationMs}ms
                    </span>
                    {result.httpStatus && (
                      <span className="flex items-center gap-1">
                        <Globe size={12} />
                        HTTP {result.httpStatus}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Result Body */}
                <div className="p-4">
                  {result.errorMessage && (
                    <div className="mb-3 p-3 bg-red-50 text-red-700 text-xs rounded-lg font-mono border border-red-100">
                      {result.errorMessage}
                    </div>
                  )}
                  <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap break-all bg-white p-3 rounded border border-gray-200 max-h-[200px] overflow-y-auto">
                    {tryFormatJson(result.output)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                <div className="bg-gray-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Play size={24} className="text-gray-300" />
                </div>
                <p className="text-sm text-gray-400">{t('enter_parameters_hint')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper to prettify JSON if possible
const tryFormatJson = (str: string) => {
  try {
    const obj = JSON.parse(str);
    return JSON.stringify(obj, null, 2);
  } catch (e) {
    return str;
  }
};
