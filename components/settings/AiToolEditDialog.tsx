import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Play, ChevronDown, ChevronUp, HelpCircle, Code, List } from 'lucide-react';
import { AiTool, ParameterDefinition, FieldType, AiToolType, AuthType, ApiMethod, McpServerType } from '../../types/aiTool';
import aiToolApi from '../../services/aiToolApi';
import notificationService from '../../services/notificationService';
import { ParameterEditor } from './ParameterEditor';

interface AiToolEditDialogProps {
  tool: AiTool | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const DEFAULT_TOOL: Partial<AiTool> = {
  name: '',
  displayName: '',
  description: '',
  toolType: 'API',
  parameters: [],
  apiMethod: 'GET',
  apiUrl: '',
  apiTimeout: 10,
  authType: 'NONE',
  retryCount: 0,
  requireConfirmation: false,
  enabled: true,
  sortOrder: 0
};

export const AiToolEditDialog: React.FC<AiToolEditDialogProps> = ({ tool, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<AiTool>>(DEFAULT_TOOL);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [parameterMode, setParameterMode] = useState<'form' | 'json'>('form');
  const [jsonParameters, setJsonParameters] = useState('');
  
  // State for Metadata Table
  const [metadataRows, setMetadataRows] = useState<{ key: string, description: string }[]>([]);

  // Helper to clean parameter data (keep only whitelisted fields)
  const cleanParameter = (param: ParameterDefinition): ParameterDefinition => {
    // Define whitelist of allowed fields
    const allowedFields: (keyof ParameterDefinition)[] = [
      'name',
      'type',
      'required',
      'description',
      'enumValues',
      'properties',
      'items'
    ];

    const cleaned: any = {};
    
    // Only copy allowed fields if they exist and are not null
    allowedFields.forEach(field => {
      if (param[field] !== undefined && param[field] !== null) {
        cleaned[field] = param[field];
      }
    });
    
    // Recursively clean nested properties
    if (cleaned.properties) {
      cleaned.properties = (cleaned.properties as ParameterDefinition[]).map(cleanParameter);
    }
    if (cleaned.items) {
      cleaned.items = cleanParameter(cleaned.items as ParameterDefinition);
    }
    
    return cleaned as ParameterDefinition;
  };

  // Initialize form data
  useEffect(() => {
    if (tool) {
      setFormData(JSON.parse(JSON.stringify(tool))); // Deep copy
      // Initialize JSON mode state with cleaned parameters
      const cleanedParams = (tool.parameters || []).map(cleanParameter);
      setJsonParameters(JSON.stringify(cleanedParams, null, 2));
      
      // Parse resultMetadata if exists
      if (tool.resultMetadata) {
        try {
            const parsed = JSON.parse(tool.resultMetadata);
            if (Array.isArray(parsed)) {
                 setMetadataRows(parsed);
            }
        } catch (e) {
            console.error("Failed to parse resultMetadata", e);
            setMetadataRows([]);
        }
      } else {
          setMetadataRows([]);
      }
    } else {
      setFormData({ ...DEFAULT_TOOL });
      setMetadataRows([]);
      setJsonParameters('[]');
    }
  }, [tool, isOpen]);

  const updateField = (field: keyof AiTool, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleParameterMode = (mode: 'form' | 'json') => {
    if (mode === parameterMode) return;

    if (mode === 'json') {
      // Sync from Form to JSON and clean it
      const cleanedParams = (formData.parameters || []).map(cleanParameter);
      setJsonParameters(JSON.stringify(cleanedParams, null, 2));
    } else {
      // Sync from JSON to Form
      try {
        const parsed = JSON.parse(jsonParameters);
        if (!Array.isArray(parsed)) {
          notificationService.error('Parameters must be an array');
          return;
        }
        updateField('parameters', parsed);
      } catch (e) {
        notificationService.error('Invalid JSON format');
        return;
      }
    }
    setParameterMode(mode);
  };

  const handleMetadataChange = (index: number, field: 'key' | 'description', value: string) => {
    const newRows = [...metadataRows];
    newRows[index] = { ...newRows[index], [field]: value };
    setMetadataRows(newRows);
    
    // Update formData immediately
    updateField('resultMetadata', JSON.stringify(newRows));
  };

  const addMetadataRow = () => {
    const newRows = [...metadataRows, { key: '', description: '' }];
    setMetadataRows(newRows);
    updateField('resultMetadata', JSON.stringify(newRows));
  };

  const removeMetadataRow = (index: number) => {
    const newRows = [...metadataRows];
    newRows.splice(index, 1);
    setMetadataRows(newRows);
    updateField('resultMetadata', JSON.stringify(newRows));
  };


  const handleParameterChange = (index: number, updatedParam: ParameterDefinition) => {
    const newParams = [...(formData.parameters || [])];
    newParams[index] = updatedParam;
    updateField('parameters', newParams);
  };

  const addParameter = () => {
    const newParam: ParameterDefinition = {
      name: '',
      type: 'STRING',
      required: true,
      description: ''
    };
    updateField('parameters', [...(formData.parameters || []), newParam]);
  };

  const removeParameter = (index: number) => {
    const newParams = [...(formData.parameters || [])];
    newParams.splice(index, 1);
    updateField('parameters', newParams);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.displayName || !formData.toolType) {
      notificationService.error('Please fill in all required fields');
      return;
    }

    // Name validation (letters, numbers, underscores only)
    if (!/^[a-zA-Z0-9_]+$/.test(formData.name)) {
      notificationService.error('Tool name can only contain letters, numbers, and underscores');
      return;
    }

    // Helper to clean parameter data (keep only whitelisted fields)
    const cleanParameter = (param: ParameterDefinition): ParameterDefinition => {
      // Define whitelist of allowed fields
      const allowedFields: (keyof ParameterDefinition)[] = [
        'name',
        'type',
        'required',
        'description',
        'enumValues',
        'properties',
        'items'
      ];

      const cleaned: any = {};
      
      // Only copy allowed fields if they exist and are not null
      allowedFields.forEach(field => {
        if (param[field] !== undefined && param[field] !== null) {
          cleaned[field] = param[field];
        }
      });
      
      // Recursively clean nested properties
      if (cleaned.properties) {
        cleaned.properties = (cleaned.properties as ParameterDefinition[]).map(cleanParameter);
      }
      if (cleaned.items) {
        cleaned.items = cleanParameter(cleaned.items as ParameterDefinition);
      }
      
      return cleaned as ParameterDefinition;
    };

    const cleanToolData = (data: Partial<AiTool>) => {
      const cleaned = { ...data };
      if (cleaned.parameters) {
        cleaned.parameters = cleaned.parameters.map(cleanParameter);
      }
      return cleaned;
    };

    let payloadData = { ...formData };
    if (parameterMode === 'json') {
      try {
        const parsed = JSON.parse(jsonParameters);
        if (!Array.isArray(parsed)) throw new Error('Parameters must be an array');
        payloadData.parameters = parsed;
      } catch (e) {
        notificationService.error('Invalid JSON in parameters');
        return;
      }
    }

    const payload = cleanToolData(payloadData);

    setIsSubmitting(true);
    console.log('Submitting cleaned tool data:', JSON.stringify(payload, null, 2));
    try {
      if (tool) {
        await aiToolApi.updateTool(tool.id, payload);
        notificationService.success('Tool updated successfully');
      } else {
        await aiToolApi.createTool(payload as Omit<AiTool, 'id'>);
        notificationService.success('Tool created successfully');
      }
      onSave();
    } catch (error: any) {
      console.error('Failed to save tool', error);
      notificationService.error(error.response?.data?.message || 'Failed to save tool');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-[800px] max-w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
          <h3 className="text-xl font-bold text-gray-800">
            {tool ? 'Edit AI Tool' : 'Create AI Tool'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form id="tool-form" onSubmit={handleSubmit} className="space-y-8">
            
            {/* Basic Info */}
            <section className="space-y-4">
              <h4 className="font-bold text-gray-800 border-b border-gray-100 pb-2">Basic Information</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tool Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="e.g. get_weather"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Unique identifier for AI calls (letters, numbers, _)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => updateField('displayName', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Weather Query"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                  placeholder="Describe what this tool does. This helps the AI understand when to use it."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tool Type <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${formData.toolType === 'API' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input
                      type="radio"
                      name="toolType"
                      value="API"
                      checked={formData.toolType === 'API'}
                      onChange={(e) => updateField('toolType', e.target.value)}
                      className="hidden"
                    />
                    <span className="font-medium">API Interface</span>
                  </label>
                  <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${formData.toolType === 'MCP' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input
                      type="radio"
                      name="toolType"
                      value="MCP"
                      checked={formData.toolType === 'MCP'}
                      onChange={(e) => updateField('toolType', e.target.value)}
                      className="hidden"
                    />
                    <span className="font-medium">MCP Service</span>
                  </label>
                  <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${formData.toolType === 'INTERNAL' ? 'bg-orange-50 border-orange-200 text-orange-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input
                      type="radio"
                      name="toolType"
                      value="INTERNAL"
                      checked={formData.toolType === 'INTERNAL'}
                      onChange={(e) => updateField('toolType', e.target.value)}
                      className="hidden"
                    />
                    <span className="font-medium">Internal Tool</span>
                  </label>
                </div>
              </div>
            </section>

            {/* Result Configuration Section */}
            <section className="space-y-4">
                 <h4 className="font-bold text-gray-800 border-b border-gray-100 pb-2">Result Configuration</h4>
                 
                 <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">
                         Result Description
                     </label>
                     <textarea
                         value={formData.resultDescription || ''}
                         onChange={(e) => updateField('resultDescription', e.target.value)}
                         className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                         placeholder="Describe the returned data structure to help AI understand the output."
                     />
                     <p className="text-xs text-gray-500 mt-1">Example: Returns a JSON object containing temperature and weather condition.</p>
                 </div>

                 <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                         Result Metadata (JSON Fields)
                     </label>
                     <div className="border border-gray-200 rounded-lg overflow-hidden">
                         <table className="w-full text-sm text-left">
                             <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                                 <tr>
                                     <th className="px-4 py-2 w-1/3">Field Name</th>
                                     <th className="px-4 py-2">Description</th>
                                     <th className="px-4 py-2 w-10"></th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-gray-100">
                                 {metadataRows.map((row, index) => (
                                     <tr key={index} className="group hover:bg-gray-50">
                                         <td className="p-2">
                                             <input 
                                                 type="text" 
                                                 value={row.key}
                                                 onChange={(e) => handleMetadataChange(index, 'key', e.target.value)}
                                                 placeholder="e.g. temp"
                                                 className="w-full border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-blue-500"
                                             />
                                         </td>
                                         <td className="p-2">
                                             <input 
                                                 type="text" 
                                                 value={row.description}
                                                 onChange={(e) => handleMetadataChange(index, 'description', e.target.value)}
                                                 placeholder="e.g. Temperature in Celsius"
                                                 className="w-full border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-blue-500"
                                             />
                                         </td>
                                         <td className="p-2 text-center">
                                             <button 
                                                 type="button"
                                                 onClick={() => removeMetadataRow(index)}
                                                 className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                                             >
                                                 <Trash2 size={14} />
                                             </button>
                                         </td>
                                     </tr>
                                 ))}
                                 {metadataRows.length === 0 && (
                                     <tr>
                                         <td colSpan={3} className="px-4 py-6 text-center text-gray-400 italic text-xs">
                                             No metadata fields defined.
                                         </td>
                                     </tr>
                                 )}
                             </tbody>
                         </table>
                         <div className="bg-gray-50 p-2 border-t border-gray-200">
                             <button 
                                 type="button"
                                 onClick={addMetadataRow}
                                 className="w-full py-1.5 border border-dashed border-gray-300 rounded text-xs text-gray-500 hover:bg-white hover:border-blue-400 hover:text-blue-600 transition-all flex items-center justify-center gap-1"
                             >
                                 <Plus size={12} /> Add Field
                             </button>
                         </div>
                     </div>
                 </div>
            </section>

            {/* Parameters */}
            <section className="space-y-4">
              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <h4 className="font-bold text-gray-800">Parameters</h4>
                <div className="flex gap-2">
                  <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                    <button
                      type="button"
                      onClick={() => toggleParameterMode('form')}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                        parameterMode === 'form' 
                          ? 'bg-white text-blue-600 shadow-sm' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <List size={14} /> Form
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleParameterMode('json')}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                        parameterMode === 'json' 
                          ? 'bg-white text-blue-600 shadow-sm' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Code size={14} /> JSON
                    </button>
                  </div>
                  {parameterMode === 'form' && (
                    <button
                      type="button"
                      onClick={addParameter}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 ml-2"
                    >
                      <Plus size={16} /> Add Parameter
                    </button>
                  )}
                </div>
              </div>

              {parameterMode === 'form' ? (
                <div className="space-y-4">
                  {(formData.parameters || []).map((param, index) => (
                    <ParameterEditor
                      key={index}
                      parameter={param}
                      onChange={(updatedParam) => handleParameterChange(index, updatedParam)}
                      onRemove={() => removeParameter(index)}
                    />
                  ))}
                  {(!formData.parameters || formData.parameters.length === 0) && (
                    <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                      No parameters defined. Click "Add Parameter" to create one.
                    </div>
                  )}
                </div>
              ) : (
                <div>
                   <textarea
                     value={jsonParameters}
                     onChange={(e) => setJsonParameters(e.target.value)}
                     className="w-full h-[400px] font-mono text-sm border border-gray-300 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                     placeholder="Enter parameters JSON here..."
                   />
                   <p className="text-xs text-gray-500 mt-2">
                     Edit parameters as a JSON array. Be careful with syntax.
                   </p>
                </div>
              )}
            </section>

            {/* API Config */}
            {formData.toolType === 'API' && (
              <section className="space-y-4">
                <h4 className="font-bold text-gray-800 border-b border-gray-100 pb-2">API Configuration</h4>
                
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                    <select
                      value={formData.apiMethod}
                      onChange={(e) => updateField('apiMethod', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                    <input
                      type="text"
                      value={formData.apiUrl}
                      onChange={(e) => updateField('apiUrl', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                      placeholder="https://api.example.com/v1/resource"
                    />
                    <p className="text-xs text-gray-500 mt-1">Use <span className="font-mono bg-gray-100 px-1 rounded">{"{{param}}"}</span> to reference parameters</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Headers (JSON)</label>
                  <textarea
                    value={formData.apiHeaders}
                    onChange={(e) => updateField('apiHeaders', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm h-20"
                    placeholder='{"Content-Type": "application/json"}'
                  />
                </div>

                {formData.apiMethod !== 'GET' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Body Template</label>
                    <textarea
                      value={formData.apiBodyTemplate}
                      onChange={(e) => updateField('apiBodyTemplate', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm h-24"
                      placeholder='{"key": "{{value}}"}'
                    />
                  </div>
                )}
              </section>
            )}

            {/* Internal Tool Config */}
            {formData.toolType === 'INTERNAL' && (
              <section className="space-y-4">
                <h4 className="font-bold text-gray-800 border-b border-gray-100 pb-2">Internal Tool Configuration</h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Function Name (Internal)
                  </label>
                  <input
                    type="text"
                    value={formData.apiUrl}
                    onChange={(e) => updateField('apiUrl', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="e.g. system.getCurrentTime"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The identifier for the internal function handler.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parameter Mapping Template (Optional)
                  </label>
                  <textarea
                    value={formData.apiBodyTemplate}
                    onChange={(e) => updateField('apiBodyTemplate', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm h-24"
                    placeholder='{"arg1": "{{param1}}", "options": { "flag": "{{param2}}" }}'
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Transform the AI parameters into the internal function arguments. Defaults to direct mapping if empty.
                  </p>
                </div>
              </section>
            )}

            {formData.toolType === 'API' && (
            <section className="space-y-4">
              <h4 className="font-bold text-gray-800 border-b border-gray-100 pb-2">Authentication</h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Auth Type</label>
                <select
                  value={formData.authType}
                  onChange={(e) => updateField('authType', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="NONE">None</option>
                  <option value="API_KEY">API Key</option>
                  <option value="BEARER">Bearer Token</option>
                  <option value="BASIC">Basic Auth</option>
                </select>
              </div>

              {formData.authType !== 'NONE' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Auth Config (JSON)</label>
                  <textarea
                    value={formData.authConfig}
                    onChange={(e) => updateField('authConfig', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm h-24"
                    placeholder={
                      formData.authType === 'API_KEY' ? '{"headerName": "X-API-Key", "apiKey": "..."}' :
                      formData.authType === 'BEARER' ? '{"token": "..."}' :
                      formData.authType === 'BASIC' ? '{"username": "...", "password": "..."}' : '{}'
                    }
                  />
                </div>
              )}
            </section>
            )}

            {/* Advanced Options */}
            <section className="space-y-4">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-800"
              >
                {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                Advanced Options
              </button>

              {showAdvanced && (
                <div className="pl-4 border-l-2 border-gray-100 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Response Extraction (JSONPath)</label>
                    <input
                      type="text"
                      value={formData.apiResponsePath}
                      onChange={(e) => updateField('apiResponsePath', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                      placeholder="data.results[0]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Timeout (seconds)</label>
                      <input
                        type="number"
                        value={formData.apiTimeout}
                        onChange={(e) => updateField('apiTimeout', parseInt(e.target.value))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Retry Count</label>
                      <input
                        type="number"
                        value={formData.retryCount}
                        onChange={(e) => updateField('retryCount', parseInt(e.target.value))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="requireConfirmation"
                      checked={formData.requireConfirmation}
                      onChange={(e) => updateField('requireConfirmation', e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="requireConfirmation" className="text-sm text-gray-700">Require user confirmation before execution</label>
                  </div>
                </div>
              )}
            </section>

          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="tool-form"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save Tool'}
          </button>
        </div>
      </div>
    </div>
  );
};
