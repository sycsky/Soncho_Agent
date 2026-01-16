import React, { useCallback, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  ReactFlow, 
  MiniMap, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState, 
  addEdge,
  Handle,
  Position,
  NodeProps,
  Edge,
  ReactFlowProvider,
  useReactFlow,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  EdgeProps
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Play, GitBranch, Database, Bot, MessageSquare, GripHorizontal, Plus, Trash2, X, MoreHorizontal, ArrowLeft, ArrowRight, Calendar, User, Search, Filter, Save, Loader2, Square, Settings, ChevronRight, Star, Power, CheckCircle, Edit2, Headphones, Hammer, ListFilter, Split, Image, Tags, Wand2, Layout, Braces, Copy, Languages } from 'lucide-react';
import { workflowApi } from '../services/workflowApi';
import knowledgeBaseApi from '../services/knowledgeBaseApi';
import aiToolApi from '../services/aiToolApi';
import { AiWorkflow, LlmModel } from '../types/workflow';
import { KnowledgeBase } from '../types';
import { AiTool } from '../types/aiTool';
import { CreateWorkflowDialog } from './settings/CreateWorkflowDialog';
import { WorkflowTestDialog } from './WorkflowTestDialog';
import { WorkflowGeneratorDialog } from './WorkflowGeneratorDialog';
import { SystemPromptEnhancer } from './SystemPromptEnhancer';
import TiptapEditor, { TiptapEditorRef } from './TiptapEditor';
import { getLayoutedElements } from '../utils/layout';

// Helper hook to resolve model name from ID if display name is missing
const useModelName = (modelId?: string, modelDisplayName?: string) => {
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState(modelDisplayName || modelId || t('workflow.select_model'));

  useEffect(() => {
    let isMounted = true;

    const resolveName = async () => {
      const needsResolution = modelId && (!modelDisplayName || modelDisplayName === modelId);
      
      if (needsResolution) {
        try {
           // Check simple cache first
           if ((window as any).__modelCache?.[modelId!]) {
               if (isMounted) setDisplayName((window as any).__modelCache[modelId!]);
               return;
           }

           const models = await workflowApi.getEnabledModels();
           const found = models.find((m: any) => m.id === modelId);
           
           if (found && isMounted) {
             setDisplayName(found.name);
             // Update cache
             if (!(window as any).__modelCache) (window as any).__modelCache = {};
             (window as any).__modelCache[modelId!] = found.name;
           }
        } catch (err) {
          console.error('Failed to resolve model name', err);
        }
      } else {
         if (isMounted) setDisplayName(modelDisplayName || modelId || t('workflow.select_model'));
      }
    };

    resolveName();

    return () => { isMounted = false; };
  }, [modelId, modelDisplayName, t]);

  return displayName;
};

// Global cache for tools to avoid redundant fetching in nodes
const toolCache: { data: AiTool[] | null; promise: Promise<AiTool[]> | null } = { data: null, promise: null };

const useTools = () => {
  const [tools, setTools] = useState<AiTool[]>(toolCache.data || []);

  useEffect(() => {
    let isMounted = true;
    
    const fetchTools = async () => {
        if (toolCache.data) {
            if (isMounted) setTools(toolCache.data);
            return;
        }

        if (!toolCache.promise) {
            toolCache.promise = aiToolApi.getTools();
        }

        try {
            const data = await toolCache.promise;
            toolCache.data = data;
            if (isMounted) setTools(data);
        } catch (err) {
            console.error("Failed to fetch tools", err);
        }
    };

    fetchTools();

    return () => { isMounted = false; };
  }, []);

  return tools;
};

// Custom Edge Component with Delete Button
const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
}: EdgeProps) => {
  const { deleteElements } = useReactFlow();
  const { t } = useTranslation();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{
          ...style,
          strokeWidth: selected ? 2 : 1.5,
          stroke: selected ? '#2563eb' : '#94a3b8', // Blue-600 when selected
        }} 
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
            opacity: selected ? 1 : 0,
            transition: 'opacity 0.2s',
          }}
          className="nodrag nopan"
        >
          {selected && (
            <button
              className="bg-white text-red-500 border border-red-200 p-1.5 rounded-full shadow-md hover:bg-red-50 hover:border-red-300 transition-all flex items-center justify-center"
              onClick={(event) => {
                event.stopPropagation();
                deleteElements({ edges: [{ id }] });
              }}
              title={t('workflow_editor.delete_connection')}
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

// Reusable Node Menu Component
const NodeMenu = ({ nodeId }: { nodeId: string }) => {
  const { deleteElements, getNodes, setNodes } = useReactFlow();
  const { t } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);

  const handleCopyNode = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nodes = getNodes();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const newNode = {
      ...node,
      id: `${node.type}-${Math.random().toString(36).substr(2, 9)}`,
      position: {
        x: node.position.x + 50,
        y: node.position.y + 50,
      },
      selected: false,
      data: {
        ...node.data,
        label: (node.data as any).label ? `${(node.data as any).label} (Copy)` : undefined
      }
    };
    
    setNodes([...nodes, newNode]);
    setShowMenu(false);
  };

  return (
    <div className="absolute -top-2 -right-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity">
      <div className="relative">
        <button 
          className="bg-white p-1.5 rounded-full shadow-md border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
        >
          <MoreHorizontal size={14} />
        </button>
        
        {showMenu && (
          <div className="absolute top-full right-0 mt-1 w-32 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 overflow-hidden">
            <button 
              className="w-full text-left px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-2 transition-colors"
              onClick={handleCopyNode}
            >
              <Copy size={12} />
              <span>{t('workflow_editor.copy_node')}</span>
            </button>
            <button 
              className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                deleteElements({ nodes: [{ id: nodeId }] });
              }}
            >
              <Trash2 size={12} />
              <span>{t('workflow_editor.delete_node')}</span>
            </button>
          </div>
        )}
      </div>
      {/* Click outside listener could be added here for robustness, but simple toggle is okay for now */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(false);
          }} 
        />
      )}
    </div>
  );
};

// Custom Node Components (Keep existing ones)
const StartNode = ({ id, data, selected }: NodeProps) => {
  const { t } = useTranslation();
  return (
    <div className={`bg-white rounded-xl shadow-lg border p-0 min-w-[200px] group hover:border-blue-300 transition-colors relative ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-100'}`}>
      <NodeMenu nodeId={id} />
      <div className="bg-blue-50 px-4 py-2 rounded-t-xl border-b border-blue-100 flex items-center gap-2">
        <div className="bg-blue-100 p-1 rounded-lg text-blue-600">
          <Play size={14} />
        </div>
        <span className="font-semibold text-gray-700 text-sm">{(data as any).label || t('workflow_editor.start_node')}</span>
      </div>
      <div className="p-4">
        <div className="text-xs text-gray-500">{t('workflow_editor.workflow_entry_point')}</div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-blue-500" />
    </div>
  );
};

const IntentNode = ({ id, data, selected }: NodeProps) => {
  const { t } = useTranslation();
  const intents = (data.config as any)?.intents || [];
  const config = data.config as any;
  const modelDisplay = useModelName(config?.modelId || config?.model, config?.modelDisplayName);

  return (
    <div className={`bg-white rounded-xl shadow-lg border p-0 min-w-[280px] group hover:border-green-300 transition-colors relative ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-100'}`}>
      <NodeMenu nodeId={id} />
      <div className="bg-green-50 px-4 py-2 rounded-t-xl border-b border-green-100 flex items-center gap-2">
        <div className="bg-green-100 p-1 rounded-lg text-green-600">
          <GitBranch size={14} />
        </div>
        <span className="font-semibold text-gray-700 text-sm">{(data as any).label || t('workflow_editor.intent_node')}</span>
      </div>
      <div className="p-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200 w-fit">
          <Bot size={12} />
          <span>{modelDisplay}</span>
        </div>
      </div>
      <div className="p-0">
        <div className="relative">
            <div className="flex flex-col">
                {intents.length > 0 ? (
                  intents.map((intent: any) => (
                    <div key={intent.id} className="px-4 py-3 border-b border-gray-100 flex justify-between items-center relative hover:bg-gray-50 last:border-0">
                        <span className="text-xs font-medium text-gray-600 truncate max-w-[180px]" title={intent.label}>{intent.label}</span>
                        <Handle type="source" position={Position.Right} id={intent.id} className="!bg-green-500 !right-[-6px]" style={{top: '50%'}} />
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-3 text-xs text-gray-400 italic text-center">
                    {t('workflow_editor.no_intents')}
                  </div>
                )}
            </div>
        </div>
      </div>
      <div className="p-3 bg-gray-50 rounded-b-xl text-[10px] text-gray-400 leading-relaxed border-t border-gray-100">
        {t('workflow_editor.intent_description')}
      </div>
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
    </div>
  );
};

const KnowledgeNode = ({ id, data, selected }: NodeProps) => {
  const { t } = useTranslation();
  const config = data.config as any || {};
  const selectedKBs = config.selectedKnowledgeBases || [];
  const kbIds = config.knowledgeBaseIds || (config.knowledgeBaseId ? [config.knowledgeBaseId] : []);
  
  return (
    <div className={`bg-white rounded-xl shadow-lg border p-0 min-w-[240px] group hover:border-orange-300 transition-colors relative ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-100'}`}>
      <NodeMenu nodeId={id} />
      <div className="bg-orange-50 px-4 py-2 rounded-t-xl border-b border-orange-100 flex items-center gap-2">
        <div className="bg-orange-100 p-1 rounded-lg text-orange-600">
          <Database size={14} />
        </div>
        <span className="font-semibold text-gray-700 text-sm">{(data as any).label || t('workflow_editor.knowledge_node')}</span>
      </div>
      
      <div className="p-3 bg-gray-50 border-b border-gray-100">
        <div className="text-[10px] uppercase font-bold text-gray-400 mb-2">{t('workflow_editor.selected_kbs')}</div>
        {selectedKBs.length > 0 ? (
           <div className="space-y-1.5">
             {selectedKBs.slice(0, 3).map((kb: any) => (
               <div key={kb.id} className="flex items-center gap-2 bg-white border border-gray-200 px-2 py-1.5 rounded-lg text-xs text-gray-600 shadow-sm">
                 <Database size={10} className="text-orange-500 flex-shrink-0"/>
                 <span className="truncate font-medium">{kb.name}</span>
               </div>
             ))}
             {selectedKBs.length > 3 && (
               <div className="text-[10px] text-gray-500 pl-1 font-medium">+{selectedKBs.length - 3} {t('workflow_editor.more')}</div>
             )}
           </div>
        ) : kbIds.length > 0 ? (
           <div className="flex items-center gap-2 bg-white border border-gray-200 px-2 py-1.5 rounded-lg text-xs text-gray-600 shadow-sm">
               <Database size={10} className="text-orange-500 flex-shrink-0"/>
               <span className="truncate font-medium">{kbIds.length} {t('workflow_editor.knowledge_bases')}</span>
           </div>
        ) : (
           <div className="text-xs text-gray-400 italic bg-white/50 px-2 py-1.5 rounded border border-dashed border-gray-200">
             {t('workflow_editor.no_kb_selected')}
           </div>
        )}
      </div>

      <div className="p-4">
        <p className="text-xs text-gray-500">{(data as any).label || t('workflow_editor.retrieve_context')}</p>
      </div>
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
      <Handle type="source" position={Position.Right} className="!bg-orange-500" />
    </div>
  );
};

const LLMNode = ({ id, data, selected }: NodeProps) => {
  const { t } = useTranslation();
  const config = data.config as any;
  const modelDisplay = useModelName(config?.modelId || config?.model, config?.modelDisplayName);
  const tools = useTools();
  
  const boundToolIds = config?.tools || [];
  const boundTools = tools.filter(t => boundToolIds.includes(t.id));
  
  return (
    <div className={`bg-white rounded-xl shadow-lg border p-0 min-w-[240px] group hover:border-indigo-300 transition-colors relative ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-100'}`}>
      <NodeMenu nodeId={id} />
      <div className="bg-indigo-50 px-4 py-2 rounded-t-xl border-b border-indigo-100 flex items-center gap-2">
        <div className="bg-indigo-100 p-1 rounded-lg text-indigo-600">
          <Bot size={14} />
        </div>
        <span className="font-semibold text-gray-700 text-sm">{(data as any).label || t('workflow_editor.llm_node')}</span>
      </div>
      <div className="p-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200 w-fit">
          <Bot size={12} />
          <span>{modelDisplay}</span>
        </div>
      </div>
      
      {boundTools.length > 0 && (
          <div className="px-3 py-2 bg-white border-b border-gray-100">
             <div className="text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                <Hammer size={10} />
                {t('workflow_editor.tools')}
             </div>
             <div className="flex flex-col gap-1.5">
                {boundTools.map(tool => (
                    <div key={tool.id} className="flex items-center gap-1.5 bg-indigo-50/50 border border-indigo-100 px-2 py-1 rounded text-xs text-gray-600">
                        <div className="w-1 h-1 rounded-full bg-indigo-400"></div>
                        <span className="truncate max-w-[180px] font-medium">{tool.displayName || tool.name}</span>
                    </div>
                ))}
             </div>
          </div>
      )}

      <div className="p-4">
        <p className="text-xs text-gray-500">{t('workflow_editor.generate_answer')}</p>
      </div>
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
      <Handle type="source" position={Position.Right} className="!bg-indigo-500" />
    </div>
  );
};

const TranslationNode = ({ id, data, selected }: NodeProps) => {
  const { t } = useTranslation();
  const config = data.config as any;
  const modelDisplay = useModelName(config?.modelId || config?.model, config?.modelDisplayName);

  return (
    <div className={`bg-white rounded-xl shadow-lg border p-0 min-w-[240px] group hover:border-orange-300 transition-colors relative ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-100'}`}>
      <NodeMenu nodeId={id} />
      <div className="bg-orange-50 px-4 py-2 rounded-t-xl border-b border-orange-100 flex items-center gap-2">
        <div className="bg-orange-100 p-1 rounded-lg text-orange-600">
          <Languages size={14} />
        </div>
        <span className="font-semibold text-gray-700 text-sm">{(data as any).label || t('workflow_editor.translation_node')}</span>
      </div>
      <div className="p-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200 w-fit">
          <Bot size={12} />
          <span>{modelDisplay}</span>
        </div>
      </div>
      <div className="p-4">
        <p className="text-xs text-gray-500">{t('workflow_editor.translate_text')}</p>
      </div>
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
      <Handle type="source" position={Position.Right} className="!bg-orange-500" />
    </div>
  );
};

const ReplyNode = ({ id, data, selected }: NodeProps) => {
  const { t } = useTranslation();
  return (
    <div className={`bg-white rounded-xl shadow-lg border p-0 min-w-[240px] group hover:border-blue-300 transition-colors relative ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-100'}`}>
      <NodeMenu nodeId={id} />
      <div className="bg-blue-50 px-4 py-2 rounded-t-xl border-b border-blue-100 flex items-center gap-2">
        <div className="bg-blue-100 p-1 rounded-lg text-blue-600">
          <MessageSquare size={14} />
        </div>
        <span className="font-semibold text-gray-700 text-sm">{(data as any).label || t('workflow_editor.reply_node')}</span>
      </div>
      <div className="p-3 bg-gray-50 border-b border-gray-100">
         <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">{t('workflow_editor.response_source')}</div>
         <div className="flex items-center gap-2 text-xs text-gray-600 bg-white px-2 py-1 rounded border border-gray-200">
            {(data as any).source || t('workflow_editor.llm_output')}
         </div>
      </div>
      {(data as any).config?.text && (
          <div className="p-4 bg-gray-50/50">
            <p className="text-xs text-gray-500 italic whitespace-pre-wrap break-words max-w-[200px] line-clamp-3">"{(data as any).config.text}"</p>
          </div>
      )}
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
    </div>
  );
};

const EndNode = ({ id, data, selected }: NodeProps) => {
  const { t } = useTranslation();
  return (
    <div className={`bg-white rounded-xl shadow-lg border p-0 min-w-[200px] group hover:border-red-300 transition-colors relative ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-100'}`}>
      <NodeMenu nodeId={id} />
      <div className="bg-red-50 px-4 py-2 rounded-t-xl border-b border-red-100 flex items-center gap-2">
        <div className="bg-red-100 p-1 rounded-lg text-red-600">
          <Square size={14} />
        </div>
        <span className="font-semibold text-gray-700 text-sm">{(data as any).label || t('workflow_editor.end_node')}</span>
      </div>
      <div className="p-4">
        <div className="text-xs text-gray-500">{t('workflow_editor.workflow_exit_point')}</div>
      </div>
      <Handle type="target" position={Position.Left} className="!bg-red-500" />
    </div>
  );
};

const TransferNode = ({ id, data, selected }: NodeProps) => {
  const { t } = useTranslation();
  return (
    <div className={`bg-white rounded-xl shadow-lg border p-0 min-w-[200px] group hover:border-pink-300 transition-colors relative ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-100'}`}>
      <NodeMenu nodeId={id} />
      <div className="bg-pink-50 px-4 py-2 rounded-t-xl border-b border-pink-100 flex items-center gap-2">
        <div className="bg-pink-100 p-1 rounded-lg text-pink-600">
          <Headphones size={14} />
        </div>
        <span className="font-semibold text-gray-700 text-sm">{(data as any).label || t('workflow_editor.transfer_node')}</span>
      </div>
      <div className="p-4">
        <div className="text-xs text-gray-500">{t('workflow_editor.transfer_to_human')}</div>
      </div>
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
    </div>
  );
};

const FlowNode = ({ id, data, selected }: NodeProps) => {
  const config = data.config as any;
  const { t } = useTranslation();
  const workflowName = config?.workflowName || t('workflow_editor.select_workflow');

  return (
    <div className={`bg-white rounded-xl shadow-lg border p-0 min-w-[240px] group hover:border-purple-300 transition-colors relative ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-100'}`}>
      <NodeMenu nodeId={id} />
      <div className="bg-purple-50 px-4 py-2 rounded-t-xl border-b border-purple-100 flex items-center gap-2">
        <div className="bg-purple-100 p-1 rounded-lg text-purple-600">
          <Bot size={14} />
        </div>
        <span className="font-semibold text-gray-700 text-sm">{(data as any).label || 'Flow'}</span>
      </div>
      <div className="p-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200 w-fit">
          <Bot size={12} />
          <span>{workflowName}</span>
        </div>
      </div>
      <div className="p-4">
        <p className="text-xs text-gray-500">{t('workflow_editor.execute_another_workflow')}</p>
      </div>
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
      <Handle type="source" position={Position.Right} className="!bg-purple-500" />
    </div>
  );
};

const FlowEndNode = ({ id, data, selected }: NodeProps) => {
  return (
    <div className={`bg-white rounded-xl shadow-lg border p-0 min-w-[200px] group hover:border-gray-400 transition-colors relative ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-100'}`}>
      <NodeMenu nodeId={id} />
      <div className="bg-gray-100 px-4 py-2 rounded-t-xl border-b border-gray-200 flex items-center gap-2">
        <div className="bg-gray-200 p-1 rounded-lg text-gray-600">
          <Square size={14} />
        </div>
        <span className="font-semibold text-gray-700 text-sm">{(data as any).label || 'Flow End'}</span>
      </div>
      <div className="p-4">
        <div className="text-xs text-gray-500">Flow Execution End</div>
      </div>
      <Handle type="target" position={Position.Left} className="!bg-gray-500" />
    </div>
  );
};

const FlowUpdateNode = ({ id, data, selected }: NodeProps) => {
  return (
    <div className={`bg-white rounded-xl shadow-lg border p-0 min-w-[200px] group hover:border-yellow-300 transition-colors relative ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-100'}`}>
      <NodeMenu nodeId={id} />
      <div className="bg-yellow-50 px-4 py-2 rounded-t-xl border-b border-yellow-100 flex items-center gap-2">
        <div className="bg-yellow-100 p-1 rounded-lg text-yellow-600">
          <Edit2 size={14} />
        </div>
        <span className="font-semibold text-gray-700 text-sm">{(data as any).label || 'Flow Update'}</span>
      </div>
      <div className="p-4">
        <div className="text-xs text-gray-500">Update Flow State</div>
      </div>
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
      <Handle type="source" position={Position.Right} className="!bg-yellow-500" />
    </div>
  );
};

const AgentNode = ({ id, data, selected }: NodeProps) => {
  const { t } = useTranslation();
  const tools = useTools();
  const config = data.config as any;
  const modelDisplay = useModelName(config?.modelId || config?.model, config?.modelDisplayName);

  const configuredTools = (config?.tools || []).map((toolId: string) => 
    tools.find(t => t.id === toolId)
  ).filter(Boolean) as AiTool[];

  return (
    <div className={`bg-white rounded-xl shadow-lg border p-0 w-[300px] group hover:border-pink-300 transition-colors relative ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-100'}`}>
      <NodeMenu nodeId={id} />
      <div className="bg-pink-50 px-4 py-2 rounded-t-xl border-b border-pink-100 flex items-center gap-2">
        <div className="bg-pink-100 p-1 rounded-lg text-pink-600">
          <Wand2 size={14} />
        </div>
        <span className="font-semibold text-gray-700 text-sm">{(data as any).label || t('workflow_editor.nodes.agent')}</span>
      </div>
      <div className="p-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200 w-fit">
          <Bot size={12} />
          <span>{modelDisplay || t('workflow_editor.select_model')}</span>
        </div>
      </div>
        
      {configuredTools.length > 0 && (
          <div className="px-3 py-2 bg-white border-b border-gray-100">
             <div className="text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                <Hammer size={10} />
                {t('workflow_editor.tools')}
             </div>
             <div className="flex flex-col gap-1.5">
                {configuredTools.map((tool: AiTool) => (
                    <div key={tool.id} className="flex items-center gap-1.5 bg-indigo-50/50 border border-indigo-100 px-2 py-1 rounded text-xs text-gray-600">
                        <div className="w-1 h-1 rounded-full bg-indigo-400"></div>
                        <span className="truncate max-w-[180px] font-medium">{tool.displayName || tool.name}</span>
                    </div>
                ))}
             </div>
          </div>
      )}

      <div className="p-3 bg-gray-50 rounded-b-xl text-[10px] text-gray-400 leading-relaxed border-t border-gray-100">
        {t('workflow_editor.agent_desc')}
      </div>
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
      <Handle type="source" position={Position.Right} className="!bg-pink-500" />
    </div>
  );
};

const ToolNode = ({ id, data, selected }: NodeProps) => {
  const { t } = useTranslation();
  const config = data.config as any;
  const toolName = config?.toolName || t('workflow_editor.select_tool');

  return (
    <div className={`bg-white rounded-xl shadow-lg border p-0 min-w-[240px] group hover:border-orange-300 transition-colors relative ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-100'}`}>
      <NodeMenu nodeId={id} />
      <div className="bg-orange-50 px-4 py-2 rounded-t-xl border-b border-orange-100 flex items-center gap-2">
        <div className="bg-orange-100 p-1 rounded-lg text-orange-600">
          <Hammer size={14} />
        </div>
        <span className="font-semibold text-gray-700 text-sm">{(data as any).label || t('workflow_editor.tool_node')}</span>
      </div>
      <div className="p-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200 w-fit">
          <Hammer size={12} />
          <span>{toolName}</span>
        </div>
      </div>
      <div className="flex flex-col">
        <div className="flex justify-between items-center py-2 px-4 border-b border-gray-100 relative hover:bg-gray-50">
           <span className="text-xs font-medium text-gray-600">{t('workflow_editor.executed')}</span>
           <Handle type="source" position={Position.Right} id="executed" className="!bg-orange-500 !right-[-6px]" style={{top: '50%'}} />
        </div>
        <div className="flex justify-between items-center py-2 px-4 relative hover:bg-gray-50">
           <span className="text-xs font-medium text-gray-600">{t('workflow_editor.not_executed')}</span>
           <Handle type="source" position={Position.Right} id="not_executed" className="!bg-gray-400 !right-[-6px]" style={{top: '50%'}} />
        </div>
      </div>
      <div className="p-3 bg-gray-50 rounded-b-xl text-[10px] text-gray-400 leading-relaxed border-t border-gray-100">
        {t('workflow_editor.execute_tool_desc')}
      </div>
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
    </div>
  );
};




// Helper to get caret coordinates for textarea
const getCaretCoordinates = (element: HTMLTextAreaElement, position: number) => {
  const div = document.createElement('div');
  const style = window.getComputedStyle(element);
  
  Array.from(style).forEach(prop => {
    div.style.setProperty(prop, style.getPropertyValue(prop));
  });

  div.style.position = 'absolute';
  div.style.visibility = 'hidden';
  div.style.whiteSpace = 'pre-wrap';
  div.style.wordWrap = 'break-word';
  div.style.height = 'auto';
  div.style.width = style.width;
  div.style.overflow = 'hidden';
  
  div.textContent = element.value.substring(0, position);
  
  const span = document.createElement('span');
  span.textContent = '|';
  div.appendChild(span);
  
  document.body.appendChild(div);
  
  const coordinates = {
    top: span.offsetTop - element.scrollTop,
    left: span.offsetLeft - element.scrollLeft,
    height: parseInt(style.lineHeight) || 20
  };
  
  document.body.removeChild(div);
  
  return coordinates;
};

const ToolSelectionDialog = ({ 
    isOpen, 
    onClose, 
    availableTools, 
    onConfirm 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    availableTools: AiTool[]; 
    onConfirm: (selectedIds: string[]) => void; 
}) => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    if (!isOpen) return null;

    const filteredTools = availableTools.filter(t => 
        t.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
        );
    };

    const handleConfirm = () => {
        onConfirm(selectedIds);
        setSelectedIds([]);
        setSearchQuery('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-[500px] max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800">Add Tools</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={18} />
                    </button>
                </div>
                
                <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                            type="text" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search tools..."
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {filteredTools.length > 0 ? (
                        filteredTools.map(tool => (
                            <label key={tool.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                selectedIds.includes(tool.id) 
                                    ? 'bg-blue-50 border-blue-200' 
                                    : 'bg-white border-gray-200 hover:border-blue-300'
                            }`}>
                                <input 
                                    type="checkbox"
                                    checked={selectedIds.includes(tool.id)}
                                    onChange={() => toggleSelection(tool.id)}
                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                />
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-800 text-sm">{tool.displayName}</span>
                                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{tool.toolType}</span>
                                    </div>
                                    <div className="text-xs text-gray-500 truncate mt-0.5">{tool.description}</div>
                                </div>
                            </label>
                        ))
                    ) : (
                        <div className="text-center py-10 text-gray-400">
                            <Bot size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No tools found</p>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                    <div className="text-xs text-gray-500">
                        Selected: <span className="font-bold text-gray-700">{selectedIds.length}</span>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleConfirm}
                            disabled={selectedIds.length === 0}
                            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                        >
                            Confirm Add
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PropertyPanel = ({ node, nodes = [], edges = [], onChange, onClose, currentWorkflowId }: { node: NodeProps | any, nodes?: NodeProps[] | any[], edges?: Edge[] | any[], onChange: (data: any) => void, onClose: () => void, currentWorkflowId?: string }) => {
  const { t } = useTranslation();
  const [llmModels, setLlmModels] = useState<LlmModel[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [workflows, setWorkflows] = useState<AiWorkflow[]>([]);
  const [tools, setTools] = useState<AiTool[]>([]);
  const [showToolDialog, setShowToolDialog] = useState(false);
  const [showVarMenu, setShowVarMenu] = useState(false);
  const [varMenuPos, setVarMenuPos] = useState({ top: 0, left: 0, placement: 'bottom' });
  const [cursorIndex, setCursorIndex] = useState(0);
  const [filterText, setFilterText] = useState('');
  const [activeField, setActiveField] = useState<string | null>(null);
  const textareaRefs = useRef<{ [key: string]: HTMLTextAreaElement | HTMLInputElement | TiptapEditorRef | null }>({});
  
  const { setCenter, zoomTo, setNodes } = useReactFlow();

  // Helper to find next nodes and their info
  const nextNodesInfo = React.useMemo(() => {
    if (!node || !edges || !nodes) return [];
    
    const outgoingEdges = edges.filter((e: any) => e.source === node.id);
    
    // Group by source handle
    const groupedEdges: Record<string, any[]> = {};
    
    outgoingEdges.forEach((edge: any) => {
        const handleId = edge.sourceHandle || 'default';
        if (!groupedEdges[handleId]) groupedEdges[handleId] = [];
        groupedEdges[handleId].push(edge);
    });
    
    return Object.entries(groupedEdges).map(([handleId, edges]) => {
        const targets = edges.map((edge: any) => {
            const targetNode = nodes.find((n: any) => n.id === edge.target);
            return targetNode;
        }).filter(Boolean);

        // Resolve handle label
        let handleLabel = handleId;
        if (node.type === 'intent' && handleId !== 'default') {
            const intent = node.data.config?.intents?.find((i: any) => i.id === handleId);
            if (intent) {
                handleLabel = intent.label;
            }
        } else if (node.type === 'condition') {
            if (handleId === 'else') {
                handleLabel = 'ELSE';
            } else {
                const condition = node.data.config?.conditions?.find((c: any) => c.id === handleId);
                if (condition) {
                    const idx = (node.data.config?.conditions || []).indexOf(condition);
                    const prefix = idx === 0 ? 'IF' : 'ELSE IF';
                    // Truncate if too long
                    const source = (condition.sourceValue || '?').substring(0, 15) + ((condition.sourceValue || '').length > 15 ? '...' : '');
                    const val = (condition.inputValue || '').substring(0, 15) + ((condition.inputValue || '').length > 15 ? '...' : '');
                    handleLabel = `${prefix}: ${source} ${condition.conditionType} ${val}`;
                }
            }
        }
        
        return {
            handleId,
            handleLabel,
            targets
        };
    }).sort((a, b) => {
        if (node.type === 'condition') {
            if (a.handleId === 'else') return 1;
            if (b.handleId === 'else') return -1;
            
            const conditions = node.data.config?.conditions || [];
            const indexA = conditions.findIndex((c: any) => c.id === a.handleId);
            const indexB = conditions.findIndex((c: any) => c.id === b.handleId);
            return indexA - indexB;
        }
        return 0;
    });
  }, [node, edges, nodes]);

  const handleNavigateToNode = (targetNode: any) => {
    if (targetNode && targetNode.position) {
        // Calculate center position including node width/height offset
        // Assuming default node width ~250px and height ~100px if not available
        const x = targetNode.position.x + (targetNode.width ? targetNode.width / 2 : 125);
        const y = targetNode.position.y + (targetNode.height ? targetNode.height / 2 : 50);
        
        setCenter(x, y, { zoom: 1, duration: 800 });
        
        // Highlight the target node without selecting it in the property panel
        setNodes((nds) => nds.map((n) => ({
            ...n,
            selected: n.id === targetNode.id
        })));
    }
  };
  

  
  // Debug State
  // const [debugInfo, setDebugInfo] = useState<string>('');

  // Reset variable menu state when switching nodes
  useEffect(() => {
      setShowVarMenu(false);
      setFilterText('');
      setActiveField(null);
      // setDebugInfo('');
  }, [node.id]);

  // Calculate available variables from other nodes
  const availableVariables = React.useMemo(() => {
    const vars = [
        // Node Category
        { id: 'node.input', label: 'input', value: '{{sys.lastoutput}}', group: 'NODE', type: 'String' },
        
        // Start Category
        { id: 'sys.query', label: 'query', value: '{{sys.query}}', group: 'START', type: 'String' },
        { id: 'sys.files', label: 'files', value: '{{sys.files}}', group: 'START', type: 'Array[File]' },
        
        // Conversation Category
        { id: 'conversation.history', label: 'history', value: '{{conversation.history}}', group: 'CONVERSATION', type: 'Array' },
        
        // User Category
        { id: 'user.id', label: 'id', value: '{{user.id}}', group: 'USER', type: 'String' },

        // Agent Category
        { id: 'agent.sysPrompt', label: 'sysPrompt', value: '{{agent.sysPrompt}}', group: 'AGENT', type: 'String' },
    ];

    if (nodes && node) {
        nodes.forEach((n: any) => {
            if (n.id === node.id) return; // Skip self

            // Add specific output variables based on node type
            if (n.type === 'knowledge') {
                vars.push({ 
                    id: `${n.id}.result`, 
                    label: `${n.data.label || 'Retrieval'}.result`, 
                    value: `{{${n.data.label || 'Knowledge'}.result}}`,
                    group: 'KNOWLEDGE',
                    type: 'String'
                });

            } else if (n.type === 'llm') {
                vars.push({ 
                    id: `${n.id}.text`, 
                    label: `${n.data.label || 'Generation'}.text`, 
                    value: `{{${n.data.label || 'LLM'}.text}}`,
                    group: 'LLM',
                    type: 'String'
                });
            } else if (n.type === 'intent') {
                vars.push({ 
                    id: `${n.id}.category`, 
                    label: `${n.data.label || 'Recognition'}.category`, 
                    value: `{{${n.data.label || 'Intent'}.category}}`,
                    group: 'INTENT',
                    type: 'String'
                });
            }
        });
    }
    return vars;
  }, [nodes, node?.id]);

  const handleInsertVariable = (variable: string) => {
    if (!activeField || !textareaRefs.current[activeField]) return;
    
    const fieldRef = textareaRefs.current[activeField];
    
    if (fieldRef && 'insertVariable' in fieldRef) {
        (fieldRef as TiptapEditorRef).insertVariable(variable, cursorIndex);
    } else {
        const textarea = fieldRef as HTMLTextAreaElement;
        const currentValue = textarea?.value || '';
        // Replace the triggering '/' with the variable
        const newValue = currentValue.substring(0, cursorIndex - 1) + variable + currentValue.substring(cursorIndex);
        
        if (activeField === 'systemPrompt') {
            handleConfigChange('systemPrompt', newValue);
        } else if (activeField === 'customPrompt') {
            handleConfigChange('customPrompt', newValue);
        } else if (activeField === 'goal') {
            handleConfigChange('goal', newValue);
        } else if (activeField.startsWith('message-')) {
            const index = parseInt(activeField.split('-')[1]);
            handleUpdateMessage(index, 'content', newValue);

        } else if (activeField === 'sourceField') {
            handleConfigChange('sourceField', newValue);
        } else if (activeField.startsWith('condition_source_')) {
            const id = activeField.replace('condition_source_', '');
            const conditions = node.data.config?.conditions || [];
            const newConditions = conditions.map((c: any) => c.id === id ? { ...c, sourceValue: newValue } : c);
            handleConfigChange('conditions', newConditions);
        } else if (activeField.startsWith('condition_input_')) {
            const id = activeField.replace('condition_input_', '');
            const conditions = node.data.config?.conditions || [];
            const newConditions = conditions.map((c: any) => c.id === id ? { ...c, inputValue: newValue } : c);
            handleConfigChange('conditions', newConditions);
        }
    }
    
    setShowVarMenu(false);
    setFilterText('');
    
    // Focus back and move cursor
    setTimeout(() => {
        if (fieldRef && !('insertVariable' in fieldRef)) {
            const textarea = fieldRef as HTMLTextAreaElement;
            textarea.focus();
            const newCursorPos = cursorIndex - 1 + variable.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        } else if (fieldRef && 'focus' in fieldRef) {
             (fieldRef as TiptapEditorRef).focus();
        }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (showVarMenu) {
        if (e.key === 'Escape') {
            setShowVarMenu(false);
            e.preventDefault();
        }
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>, field: string) => {
      const val = e.target.value;
      const cursorPos = e.target.selectionStart || 0;
      const charBefore = val[cursorPos - 1];
      
          // Check if user just typed '/' or full-width '／'
      if (charBefore === '/' || charBefore === '／') {
          const rect = e.target.getBoundingClientRect();
          
          // Calculate available space
          const spaceBelow = window.innerHeight - rect.bottom;
          const menuHeight = 300; // Estimated max height
          const placement = spaceBelow < menuHeight && rect.top > menuHeight ? 'top' : 'bottom';
          
          // Clamp horizontal position
          const menuWidth = 260;
          const left = Math.min(rect.left, window.innerWidth - menuWidth - 20);

          const newPos = {
              top: placement === 'bottom' ? rect.bottom : rect.top,
              left: left,
              placement
          };

          setVarMenuPos(newPos);
          setCursorIndex(cursorPos);
          setShowVarMenu(true);
          setFilterText('');
          setActiveField(field);

          // Immediate debug update with calculated values
          // setDebugInfo(`TRIGGER: '/' (${cursorPos}), Menu: ON, Place: ${placement}, Pos: (${Math.round(newPos.top)}, ${Math.round(newPos.left)}), Field: ${field}, Vars: ${availableVariables.length}, Node: ${node.id}`);
      } else {
          // Update debug info for non-trigger cases
          // setDebugInfo(`Last: '${charBefore}' (${cursorPos}), Menu: ${showVarMenu ? 'ON' : 'OFF'}, Place: ${varMenuPos.placement}, Field: ${activeField}, Vars: ${availableVariables.length}, Node: ${node.id}`);
          
          if (showVarMenu && activeField === field) {
              const diff = cursorPos - cursorIndex;
              if (diff < 0) {
                 setShowVarMenu(false);
              } else {
                  const potentialFilter = val.substring(cursorIndex, cursorPos);
                  setFilterText(potentialFilter);
              }
          }
      }
      
      if (field === 'systemPrompt') {
          handleConfigChange('systemPrompt', val);
      } else if (field === 'customPrompt') {
          handleConfigChange('customPrompt', val);
      } else if (field.startsWith('message-')) {
          const index = parseInt(field.split('-')[1]);
          handleUpdateMessage(index, 'content', val);

      }
  };

  const handleEditorSlash = (field: string, rect: DOMRect, index: number) => {
      // Calculate available space
      const spaceBelow = window.innerHeight - rect.bottom;
      const menuHeight = 300; // Estimated max height
      const placement = spaceBelow < menuHeight && rect.top > menuHeight ? 'top' : 'bottom';
      
      // Clamp horizontal position
      const menuWidth = 260;
      const left = Math.min(rect.left, window.innerWidth - menuWidth - 20);

      const newPos = {
          top: placement === 'bottom' ? rect.bottom : rect.top,
          left: left,
          placement
      };

      setVarMenuPos(newPos);
      setCursorIndex(index);
      setShowVarMenu(true);
      setFilterText('');
      setActiveField(field);
  };

  const handleEditorChange = (field: string, value: string, cursorPosition?: number) => {
      if (field === 'systemPrompt') {
          handleConfigChange('systemPrompt', value);
      } else if (field === 'customPrompt') {
          handleConfigChange('customPrompt', value);
      } else if (field === 'targetText') {
          handleConfigChange('targetText', value);
      } else if (field === 'goal') {
          handleConfigChange('goal', value);
      }
      
      if (showVarMenu && activeField === field && cursorPosition !== undefined) {
          const diff = cursorPosition - cursorIndex;
          if (diff < 0) {
              setShowVarMenu(false);
          } else {
               const potentialFilter = value.substring(cursorIndex, cursorPosition);
               setFilterText(potentialFilter);
          }
      }
  };
  
  useEffect(() => {
    if (node && (node.type === 'intent' || node.type === 'llm' || node.type === 'agent' || node.type === 'imageTextSplit' || node.type === 'setSessionMetadata' || node.type === 'translation')) {
      workflowApi.getAllModels()
        .then(data => {
            const enabledModels = data.filter((m: LlmModel) => m.enabled);
            setLlmModels(enabledModels);
        })
        .catch(err => console.error('Failed to fetch models', err));
    }

    if (node && (node.type === 'llm' || node.type === 'tool' || node.type === 'agent')) {
        aiToolApi.getTools()
            .then(data => setTools(data))
            .catch(err => console.error('Failed to fetch tools', err));
    }
    
    if (node && node.type === 'knowledge') {
      knowledgeBaseApi.getKnowledgeBases(true)
        .then(data => {
            setKnowledgeBases(data);
            
            if (node.type === 'knowledge') {
                // Sync knowledgeBaseIds with selectedKnowledgeBases
                const config = node.data.config || {};
                const kbIds = config.knowledgeBaseIds || (config.knowledgeBaseId ? [config.knowledgeBaseId] : []);
                const selectedKBs = config.selectedKnowledgeBases || [];
                
                // Check if synchronization is needed (if IDs exist but selectedKBs is missing or length mismatch)
                if (kbIds.length > 0) {
                     const currentSelectedIds = selectedKBs.map((k: any) => k.id);
                     const isSynced = kbIds.length === selectedKBs.length && kbIds.every((id: string) => currentSelectedIds.includes(id));
                     
                     if (!isSynced) {
                         // Re-construct selectedKnowledgeBases from the full list
                         const newSelectedKBs = data
                            .filter(k => kbIds.includes(k.id))
                            .map(k => ({ id: k.id, name: k.name }));
                         
                         const validIds = newSelectedKBs.map(k => k.id);
    
                         // Only update if we found valid KBs or we need to clean up invalid IDs
                         if (newSelectedKBs.length > 0 || kbIds.length > 0) {
                             onChange({
                                 ...node.data,
                                 config: {
                                     ...config,
                                     knowledgeBaseIds: validIds,
                                     selectedKnowledgeBases: newSelectedKBs
                                 }
                             });
                         }
                     }
                }

            }
        })
        .catch(err => console.error('Failed to fetch knowledge bases', err));
    }

    if (node && node.type === 'flow') {
        workflowApi.getAllWorkflows()
            .then(data => setWorkflows(data))
            .catch(err => console.error('Failed to fetch workflows', err));
    }
  }, [node.type, node.id]); // Changed dependency to avoid loop, was [node]

  if (!node) return null;

  const handleChange = (field: string, value: any) => {
    onChange({ ...node.data, [field]: value });
  };

  const handleAddMessage = () => {
    const config = node.data.config || {};
    const messages = config.messages || [];
    const lastRole = messages.length > 0 ? messages[messages.length - 1].role : 'assistant';
    const newRole = lastRole === 'user' ? 'assistant' : 'user';
    
    onChange({
      ...node.data,
      config: {
        ...config,
        messages: [...messages, { role: newRole, content: '' }]
      }
    });
  };

  const handleUpdateMessage = (index: number, field: string, value: string) => {
    const config = node.data.config || {};
    const messages = [...(config.messages || [])];
    messages[index] = { ...messages[index], [field]: value };

    onChange({
      ...node.data,
      config: {
        ...config,
        messages
      }
    });
  };

  const handleDeleteMessage = (index: number) => {
    const config = node.data.config || {};
    const messages = config.messages.filter((_: any, i: number) => i !== index);

    onChange({
      ...node.data,
      config: {
        ...config,
        messages
      }
    });
  };

  const handleConfigChange = (field: string, value: any) => {
    const config = node.data.config || {};
    let updates: any = { [field]: value };

    // Special handling for model selection to save display name
    if (field === 'modelId') {
        const selectedModel = llmModels.find(m => m.id === value);
        if (selectedModel) {
            updates = {
                ...updates,
                model: selectedModel.modelName, // Legacy/Code
                modelDisplayName: selectedModel.name, // Display Name
                provider: selectedModel.provider
            };
        }
    }

    onChange({ 
      ...node.data, 
      config: { ...config, ...updates } 
    });
  };

  const handleAddIntent = () => {
    const config = node.data.config || {};
    const intents = config.intents || [];
    const newId = `i${Date.now()}`;
    const newIntent = { id: newId, label: 'New Intent' };
    
    onChange({
      ...node.data,
      config: {
        ...config,
        intents: [...intents, newIntent]
      }
    });
  };

  const handleUpdateIntent = (id: string, label: string) => {
    const config = node.data.config || {};
    const intents = config.intents || [];
    const updatedIntents = intents.map((i: any) => 
      i.id === id ? { ...i, label } : i
    );

    onChange({
      ...node.data,
      config: {
        ...config,
        intents: updatedIntents
      }
    });
  };

  const handleDeleteIntent = (id: string) => {
    const config = node.data.config || {};
    const intents = config.intents || [];
    const updatedIntents = intents.filter((i: any) => i.id !== id);

    onChange({
      ...node.data,
      config: {
        ...config,
        intents: updatedIntents
      }
    });
  };

  const handleRemoveTool = (toolId: string) => {
    const config = node.data.config || {};
    const currentTools = config.tools || [];
    const newTools = currentTools.filter((id: string) => id !== toolId);
    
    onChange({
        ...node.data,
        config: {
            ...config,
            tools: newTools
        }
    });
  };

  const handleAddTools = (newToolIds: string[]) => {
    const config = node.data.config || {};
    const currentTools = config.tools || [];
    const newTools = Array.from(new Set([...currentTools, ...newToolIds]));
    
    onChange({
        ...node.data,
        config: {
            ...config,
            tools: newTools
        }
    });
  };



  return (
    <div className="absolute top-4 right-4 w-[600px] bg-white rounded-xl shadow-xl border border-gray-200 z-20 flex flex-col max-h-[calc(100vh-32px)] overflow-hidden animate-in slide-in-from-right-5 duration-200">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <Settings size={16} className="text-gray-500" />
                    <h3 className="font-bold text-gray-800">{t('workflow_editor.properties')}</h3>
                  </div>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('workflow_editor.node_label')}</label>
                <input
                  type="text"
                  value={node.data.label || ''}
                  onChange={(e) => handleChange('label', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

        <div className="h-px bg-gray-100 my-2"></div>

        {node.type === 'flow' && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('workflow_editor.select_workflow')}</label>
            <select
              value={node.data.config?.workflowId || ''}
              onChange={(e) => {
                  const selectedId = e.target.value;
                  const selectedWorkflow = workflows.find(w => w.id === selectedId);
                  // Update config with workflowId AND workflowName so the node can display it
                  handleConfigChange('workflowId', selectedId);
                  if (selectedWorkflow) {
                       handleConfigChange('workflowName', selectedWorkflow.name);
                  }
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
               <option value="" disabled>{t('workflow_editor.select_workflow_placeholder')}</option>
               {workflows.map(wf => (
                   <option key={wf.id} value={wf.id}>{wf.name}</option>
               ))}
            </select>
            <p className="text-[10px] text-gray-400 mt-1">{t('workflow_editor.execute_another_workflow')}</p>
          </div>
        )}

        {node.type === 'intent' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('workflow_editor.model')}</label>
              <select 
                value={node.data.config?.modelId || node.data.config?.model || ''}
                onChange={(e) => handleConfigChange('modelId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" disabled>{t('workflow_editor.select_a_model')}</option>
                {llmModels.length > 0 ? (
                    llmModels.map(model => (
                      <option key={model.id} value={model.id}>{model.name} ({model.provider})</option>
                    ))
                  ) : (
                    <>
                      <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                      <option value="gpt-4">gpt-4</option>
                      <option value="claude-3-opus">claude-3-opus</option>
                    </>
                  )}
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-medium text-gray-500">{t('workflow_editor.system_prompt')}</label>
                <SystemPromptEnhancer 
                    nodeType="intent" 
                    userInput={node.data.config?.customPrompt || ''}
                    onEnhanced={(val) => handleEditorChange('customPrompt', val)}
                />
              </div>
              
              <div className="relative">
                <TiptapEditor
                    ref={el => textareaRefs.current['customPrompt'] = el}
                    value={node.data.config?.customPrompt || ''} 
                    onChange={(val, selection) => handleEditorChange('customPrompt', val, selection)}
                    onSlash={(rect, index) => handleEditorSlash('customPrompt', rect, index)}
                    placeholder={t('workflow_editor.enter_system_prompt_intent')}
                    className="min-h-[150px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('workflow_editor.history_turns')}</label>
              <input 
                type="number" 
                min="0"
                value={node.data.config?.historyCount ?? 0}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  handleConfigChange('historyCount', isNaN(val) ? 0 : Math.max(0, val));
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
              <p className="text-[10px] text-gray-400 mt-1">{t('workflow_editor.number_of_historical_messages')}</p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-medium text-gray-500">{t('workflow_editor.intents')}</label>
                <button 
                  onClick={handleAddIntent}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  <Plus size={12} /> {t('workflow_editor.add')}
                </button>
              </div>
              
              <div className="space-y-2">
                {(node.data.config?.intents || []).map((intent: any) => (
                  <div key={intent.id} className="flex items-center gap-2">
                    <input 
                      type="text" 
                      value={intent.label} 
                      onChange={(e) => handleUpdateIntent(intent.id, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={t('workflow_editor.intent_name')}
                    />
                    <button 
                      onClick={() => handleDeleteIntent(intent.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {(!node.data.config?.intents || node.data.config.intents.length === 0) && (
                  <div className="text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200 text-xs text-gray-400">
                    {t('workflow_editor.no_intents_yet')}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}


        {node.type === 'tool' && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('workflow_editor.select_tool')}</label>
            <select 
              value={node.data.config?.toolId || ''}
              onChange={(e) => {
                  const selectedId = e.target.value;
                  const selectedTool = tools.find(t => t.id === selectedId);
                  onChange({
                      ...node.data,
                      config: {
                          ...node.data.config,
                          toolId: selectedId,
                          toolName: selectedTool?.displayName || ''
                      }
                  });
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" disabled>{t('workflow_editor.select_a_tool')}</option>
              {tools.map(tool => (
                <option key={tool.id} value={tool.id}>{tool.displayName}</option>
              ))}
            </select>
            <p className="text-[10px] text-gray-400 mt-2">
                {t('workflow_editor.tool_execution_desc')}
            </p>
          </div>
        )}



        {node.type === 'translation' && (
           <div className="space-y-4">
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-100 mb-4">
                 <p className="text-xs text-orange-800">
                   {t('workflow_editor.translation_desc')}
                 </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('workflow_editor.model')}</label>
                <select 
                  value={node.data.config?.modelId || node.data.config?.model || ''}
                  onChange={(e) => handleConfigChange('modelId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="" disabled>{t('workflow_editor.select_a_model')}</option>
                  {llmModels.length > 0 ? (
                      llmModels.map(model => (
                        <option key={model.id} value={model.id}>{model.name} ({model.provider})</option>
                      ))
                    ) : (
                      <>
                        <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                        <option value="gpt-4">gpt-4</option>
                        <option value="claude-3-opus">claude-3-opus</option>
                      </>
                    )}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-medium text-gray-500">{t('workflow_editor.additional_prompt')}</label>
                  <SystemPromptEnhancer 
                      nodeType="translation"
                      userInput={node.data.config?.systemPrompt || ''}
                      onEnhanced={(val) => handleEditorChange('systemPrompt', val)}
                  />
                </div>
                <div className="relative">
                  <TiptapEditor
                      ref={el => textareaRefs.current['systemPrompt'] = el}
                      value={node.data.config?.systemPrompt || ''} 
                      onChange={(val, selection) => handleEditorChange('systemPrompt', val, selection)}
                      onSlash={(rect, index) => handleEditorSlash('systemPrompt', rect, index)}
                      placeholder={t('workflow_editor.enter_additional_instructions')}
                      className="min-h-[100px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('workflow_editor.target_text')}</label>
                <div className="relative">
                  <TiptapEditor
                      ref={el => textareaRefs.current['targetText'] = el}
                      value={node.data.config?.targetText || ''} 
                      onChange={(val, selection) => handleEditorChange('targetText', val, selection)}
                      onSlash={(rect, index) => handleEditorSlash('targetText', rect, index)}
                      placeholder={t('workflow_editor.enter_text_to_translate')}
                      className="min-h-[100px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('workflow_editor.history_message_count')}</label>
                <input 
                  type="number" 
                  min="0"
                  value={node.data.config?.historyCount ?? 0}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    handleConfigChange('historyCount', isNaN(val) ? 0 : Math.max(0, val));
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="0"
                />
                <p className="text-[10px] text-gray-400 mt-1">{t('workflow_editor.number_of_messages_for_language_inference')}</p>
              </div>
           </div>
        )}

        {node.type === 'imageTextSplit' && (
           <div className="space-y-4">
              <div className="p-4 bg-teal-50 rounded-lg border border-teal-100 mb-4">
                 <p className="text-xs text-teal-800">
                   {t('workflow_editor.image_text_split_desc')}
                 </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('workflow_editor.model')}</label>
                <select 
                  value={node.data.config?.modelId || node.data.config?.model || ''}
                  onChange={(e) => handleConfigChange('modelId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="" disabled>{t('workflow_editor.select_a_model')}</option>
                  {llmModels.length > 0 ? (
                      llmModels.map(model => (
                        <option key={model.id} value={model.id}>{model.name} ({model.provider})</option>
                      ))
                    ) : (
                      <>
                        <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                        <option value="gpt-4">gpt-4</option>
                        <option value="claude-3-opus">claude-3-opus</option>
                      </>
                    )}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-medium text-gray-500">{t('workflow_editor.system_prompt')}</label>
                  <SystemPromptEnhancer 
                      nodeType="imageTextSplit"
                      userInput={node.data.config?.systemPrompt || ''}
                      onEnhanced={(val) => handleEditorChange('systemPrompt', val)}
                  />
                </div>
                <div className="relative">
                  <TiptapEditor
                      ref={el => textareaRefs.current['systemPrompt'] = el}
                      value={node.data.config?.systemPrompt || ''} 
                      onChange={(val, selection) => handleEditorChange('systemPrompt', val, selection)}
                      onSlash={(rect, index) => handleEditorSlash('systemPrompt', rect, index)}
                      placeholder={t('workflow_editor.enter_system_prompt_split')}
                      className="min-h-[150px]"
                  />
                </div>
              </div>
           </div>
        )}

        {node.type === 'setSessionMetadata' && (
           <div className="space-y-4">
              <div className="p-4 bg-fuchsia-50 rounded-lg border border-fuchsia-100 mb-4">
                 <p className="text-xs text-fuchsia-800">
                   {t('workflow_editor.set_metadata_desc')}
                 </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('workflow_editor.model')}</label>
                <select 
                  value={node.data.config?.modelId || node.data.config?.model || ''}
                  onChange={(e) => handleConfigChange('modelId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                >
                  <option value="" disabled>{t('workflow_editor.select_a_model')}</option>
                  {llmModels.length > 0 ? (
                      llmModels.map(model => (
                        <option key={model.id} value={model.id}>{model.name} ({model.provider})</option>
                      ))
                    ) : (
                      <>
                        <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                        <option value="gpt-4">gpt-4</option>
                        <option value="claude-3-opus">claude-3-opus</option>
                      </>
                    )}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-medium text-gray-500">{t('workflow_editor.system_prompt')}</label>
                  <SystemPromptEnhancer 
                      nodeType="setSessionMetadata"
                      userInput={node.data.config?.systemPrompt || ''}
                      onEnhanced={(val) => handleEditorChange('systemPrompt', val)}
                  />
                </div>
                <div className="relative">
                  <TiptapEditor
                      ref={el => textareaRefs.current['systemPrompt'] = el}
                      value={node.data.config?.systemPrompt || ''} 
                      onChange={(val, selection) => handleEditorChange('systemPrompt', val, selection)}
                      onSlash={(rect, index) => handleEditorSlash('systemPrompt', rect, index)}
                      placeholder={t('workflow_editor.enter_system_prompt_metadata')}
                      className="min-h-[150px]"
                  />
                </div>
              </div>

              <div>
                 <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-medium text-gray-500">{t('workflow_editor.mappings')}</label>
                    <button 
                        onClick={() => {
                            const currentMappings = (node.data.config?.mappings && !Array.isArray(node.data.config?.mappings)) ? node.data.config.mappings : {};
                            let newKey = "source_field";
                            let counter = 1;
                            while (newKey in currentMappings) {
                                newKey = `source_field_${counter}`;
                                counter++;
                            }
                            handleConfigChange('mappings', { ...currentMappings, [newKey]: "" });
                        }}
                        className="text-xs text-fuchsia-600 hover:text-fuchsia-700 font-medium flex items-center gap-1"
                    >
                        <Plus size={12} /> {t('workflow_editor.add_mapping')}
                    </button>
                 </div>
                 
                 <div className="space-y-3">
                    {Object.entries((node.data.config?.mappings && !Array.isArray(node.data.config?.mappings)) ? node.data.config.mappings : {}).map(([source, target], index) => (
                        <div key={index} className="flex items-center gap-2">
                            <input 
                                type="text" 
                                value={source}
                                onChange={(e) => {
                                    const newKey = e.target.value;
                                    const oldKey = source;
                                    if (newKey === oldKey) return;
                                    
                                    const currentMappings = (node.data.config?.mappings && !Array.isArray(node.data.config?.mappings)) ? node.data.config.mappings : {};
                                    // Preserve order by reconstructing
                                    const newMappings: Record<string, string> = {};
                                    Object.keys(currentMappings).forEach(k => {
                                        if (k === oldKey) {
                                            newMappings[newKey] = currentMappings[oldKey];
                                        } else {
                                            newMappings[k] = currentMappings[k];
                                        }
                                    });
                                    handleConfigChange('mappings', newMappings);
                                }}
                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                                placeholder={t('workflow_editor.source_field')}
                            />
                            <ArrowLeft size={14} className="text-gray-400 rotate-180" />
                            <input 
                                type="text" 
                                value={target as string}
                                onChange={(e) => {
                                    const currentMappings = { ...((node.data.config?.mappings && !Array.isArray(node.data.config?.mappings)) ? node.data.config.mappings : {}) };
                                    currentMappings[source] = e.target.value;
                                    handleConfigChange('mappings', currentMappings);
                                }}
                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                                placeholder={t('workflow_editor.metadata_field')}
                            />
                            <button 
                                onClick={() => {
                                    const currentMappings = { ...((node.data.config?.mappings && !Array.isArray(node.data.config?.mappings)) ? node.data.config.mappings : {}) };
                                    delete currentMappings[source];
                                    handleConfigChange('mappings', currentMappings);
                                }}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                    {Object.keys((node.data.config?.mappings && !Array.isArray(node.data.config?.mappings)) ? node.data.config.mappings : {}).length === 0 && (
                        <div className="text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200 text-xs text-gray-400">
                            {t('workflow_editor.no_mappings_defined')}
                        </div>
                    )}
                 </div>
              </div>
           </div>
        )}

        {node.type === 'parameter_extraction' && (
           <div className="space-y-4">
              <div className="p-4 bg-violet-50 rounded-lg border border-violet-100 mb-4">
                 <p className="text-xs text-violet-800">
                   {t('workflow_editor.parameter_extraction_desc')}
                 </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('workflow_editor.model')}</label>
                <select 
                  value={node.data.config?.modelId || node.data.config?.model || ''}
                  onChange={(e) => handleConfigChange('modelId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="" disabled>{t('workflow_editor.select_a_model')}</option>
                  {llmModels.length > 0 ? (
                      llmModels.map(model => (
                        <option key={model.id} value={model.id}>{model.name} ({model.provider})</option>
                      ))
                    ) : (
                      <>
                        <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                        <option value="gpt-4">gpt-4</option>
                        <option value="claude-3-opus">claude-3-opus</option>
                      </>
                    )}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-medium text-gray-500">{t('workflow_editor.system_prompt')}</label>
                  <SystemPromptEnhancer 
                      nodeType="parameter_extraction"
                      userInput={node.data.config?.systemPrompt || ''}
                      onEnhanced={(val) => handleEditorChange('systemPrompt', val)}
                  />
                </div>
                <div className="relative">
                  <TiptapEditor
                      ref={el => textareaRefs.current['systemPrompt'] = el}
                      value={node.data.config?.systemPrompt || ''} 
                      onChange={(val, selection) => handleEditorChange('systemPrompt', val, selection)}
                      onSlash={(rect, index) => handleEditorSlash('systemPrompt', rect, index)}
                      placeholder={t('workflow_editor.enter_system_prompt_extraction')}
                      className="min-h-[150px]"
                  />
                </div>
              </div>

              <div>
                 <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-medium text-gray-500">{t('workflow_editor.parameters')}</label>
                    <button 
                        onClick={() => {
                            const currentParams = node.data.config?.parameters || [];
                            const newParam = { name: `param_${currentParams.length + 1}`, type: 'string', description: '' };
                            handleConfigChange('parameters', [...currentParams, newParam]);
                        }}
                        className="text-xs text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1"
                    >
                        <Plus size={12} /> {t('workflow_editor.add_parameter')}
                    </button>
                 </div>
                 
                 <div className="space-y-3">
                    {(node.data.config?.parameters || []).map((param: any, index: number) => (
                        <div key={index} className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-2">
                                <input 
                                    type="text" 
                                    value={param.name}
                                    onChange={(e) => {
                                        const newParams = [...(node.data.config?.parameters || [])];
                                        newParams[index] = { ...newParams[index], name: e.target.value };
                                        handleConfigChange('parameters', newParams);
                                    }}
                                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    placeholder={t('workflow_editor.parameter_name')}
                                />
                                <select
                                    value={param.type}
                                    onChange={(e) => {
                                        const newParams = [...(node.data.config?.parameters || [])];
                                        newParams[index] = { ...newParams[index], type: e.target.value };
                                        handleConfigChange('parameters', newParams);
                                    }}
                                    className="w-24 px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                >
                                    <option value="string">{t('workflow_editor.string')}</option>
                                    <option value="number">{t('workflow_editor.number')}</option>
                                    <option value="boolean">{t('workflow_editor.boolean')}</option>
                                    <option value="array">{t('workflow_editor.array')}</option>
                                    <option value="object">{t('workflow_editor.object')}</option>
                                </select>
                                <button 
                                    onClick={() => {
                                        const newParams = (node.data.config?.parameters || []).filter((_: any, i: number) => i !== index);
                                        handleConfigChange('parameters', newParams);
                                    }}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            <input 
                                type="text" 
                                value={param.description || ''}
                                onChange={(e) => {
                                    const newParams = [...(node.data.config?.parameters || [])];
                                    newParams[index] = { ...newParams[index], description: e.target.value };
                                    handleConfigChange('parameters', newParams);
                                }}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                                placeholder={t('workflow_editor.description_optional')}
                            />
                        </div>
                    ))}
                    {(!node.data.config?.parameters || node.data.config.parameters.length === 0) && (
                        <div className="text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200 text-xs text-gray-400">
                            {t('workflow_editor.no_parameters_defined')}
                        </div>
                    )}
                 </div>
              </div>
           </div>
        )}

        {node.type === 'variable' && (
           <div className="space-y-4">
              <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-100 mb-4">
                 <p className="text-xs text-cyan-800">
                   {t('workflow_editor.variable_desc')}
                 </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('workflow_editor.variable_name')}</label>
                <input 
                  type="text" 
                  value={node.data.config?.variableName || ''}
                  onChange={(e) => handleConfigChange('variableName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="e.g. user_id"
                />
                <p className="text-[10px] text-gray-400 mt-1">{t('workflow_editor.variable_name_help')}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('workflow_editor.source_field')}</label>
                <input 
                  type="text" 
                  value={node.data.config?.sourceField || ''}
                  onChange={(e) => handleConfigChange('sourceField', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="e.g. {{LLM.text}}"
                />
                <p className="text-[10px] text-gray-400 mt-1">{t('workflow_editor.source_field_help')}</p>
              </div>
           </div>
        )}

        {node.type === 'llm' && (
          <>
             <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('workflow_editor.model')}</label>
              <select 
                value={node.data.config?.modelId || node.data.config?.model || ''}
                onChange={(e) => handleConfigChange('modelId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" disabled>{t('workflow_editor.select_a_model')}</option>
                {llmModels.length > 0 ? (
                    llmModels.map(model => (
                      <option key={model.id} value={model.id}>{model.name} ({model.provider})</option>
                    ))
                  ) : (
                    <>
                      <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                      <option value="gpt-4">gpt-4</option>
                      <option value="claude-3-opus">claude-3-opus</option>
                    </>
                  )}
              </select>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-medium text-gray-500">{t('workflow_editor.system_prompt')}</label>
                <SystemPromptEnhancer 
                    nodeType="llm"
                    toolIds={node.data.config?.tools}
                    userInput={node.data.config?.systemPrompt || ''}
                    onEnhanced={(val) => handleEditorChange('systemPrompt', val)}
                />
              </div>
              
              <div className="relative">
                <TiptapEditor
                    ref={el => textareaRefs.current['systemPrompt'] = el}
                    value={node.data.config?.systemPrompt || ''} 
                    onChange={(val, selection) => handleEditorChange('systemPrompt', val, selection)}
                    onSlash={(rect, index) => handleEditorSlash('systemPrompt', rect, index)}
                    placeholder={t('workflow_editor.enter_system_prompt')}
                    className="min-h-[150px]"
                />
              </div>
            </div>

            {/* History Configuration */}
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                    <input 
                        type="checkbox"
                        checked={node.data.config?.useHistory || false}
                        onChange={(e) => handleConfigChange('useHistory', e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    {t('workflow_editor.read_conversation_history')}
                </label>
                
                {node.data.config?.useHistory && (
                    <div className="mt-3 pl-6 border-l-2 border-blue-100 animate-in fade-in slide-in-from-top-1 duration-200">
                        <label className="block text-xs font-medium text-gray-500 mb-1">{t('workflow_editor.history_message_count')}</label>
                        <input 
                            type="number"
                            min="1"
                            max="50"
                            value={node.data.config?.readCount || 10}
                            onChange={(e) => handleConfigChange('readCount', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">{t('workflow_editor.include_recent_chat_history')}</p>
                    </div>
                )}
            </div>

            <div>
                 <label className="block text-xs font-medium text-gray-500 mb-2">{t('workflow_editor.conversation_history')}</label>
                 <div className="space-y-3">
                    {(node.data.config?.messages || []).map((msg: any, index: number) => (
                        <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                            <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-gray-700 uppercase">{msg.role}</span>
                                    <button 
                                        onClick={() => handleUpdateMessage(index, 'role', msg.role === 'user' ? 'assistant' : 'user')}
                                        className="text-[10px] text-blue-600 hover:underline"
                                    >
                                        {t('workflow_editor.switch_role')}
                                    </button>
                                </div>
                                <button 
                                    onClick={() => handleDeleteMessage(index)}
                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                            <div className="relative">
                                <textarea
                                    ref={el => textareaRefs.current[`message-${index}`] = el}
                                    value={msg.content}
                                    onChange={(e) => handleTextareaInput(e, `message-${index}`)}
                                    onKeyDown={handleKeyDown}
                                    rows={3}
                                    className="w-full px-3 py-2 text-sm focus:outline-none resize-none block border-none"
                                    placeholder={t('workflow_editor.enter_role_message', { role: msg.role })}
                                />
                            </div>
                        </div>
                    ))}
                 </div>
                 <button 
                    onClick={handleAddMessage}
                    className="w-full mt-2 py-2 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center justify-center gap-1"
                 >
                    <Plus size={12} /> {t('workflow_editor.add_message')}
                 </button>
            </div>

            {/* Tools Section */}
            <div>
                <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-medium text-gray-500">{t('workflow_editor.tools')}</label>
                    <button 
                        onClick={() => setShowToolDialog(true)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                        <Plus size={12} /> {t('workflow_editor.add_tool')}
                    </button>
                </div>
                
                <div className="space-y-2">
                    {(() => {
                        const currentToolIds = node.data.config?.tools || [];
                        const addedTools = tools.filter(t => currentToolIds.includes(t.id));
                        
                        if (addedTools.length === 0) {
                            return (
                                <div className="text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200 text-xs text-gray-400">
                                    {t('workflow_editor.no_tools_added_yet')}
                                </div>
                            );
                        }

                        return addedTools.map(tool => (
                            <div key={tool.id} className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-lg shadow-sm group">
                                <div className="w-8 h-8 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                                    <Settings size={14} />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="text-xs font-medium text-gray-700 truncate">{tool.displayName}</div>
                                    <div className="text-[10px] text-gray-400 truncate">{tool.name}</div>
                                </div>
                                <button 
                                    onClick={() => handleRemoveTool(tool.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                                    title={t('workflow_editor.remove_tool')}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ));
                    })()}
                </div>
                
                <ToolSelectionDialog 
                    isOpen={showToolDialog}
                    onClose={() => setShowToolDialog(false)}
                    availableTools={tools.filter(t => !(node.data.config?.tools || []).includes(t.id))}
                    onConfirm={handleAddTools}
                />
            </div>





            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('workflow_editor.temperature')}: {node.data.config?.temperature || 0.7}</label>
              <input 
                type="range" 
                min="0" 
                max="2" 
                step="0.1"
                value={node.data.config?.temperature || 0.7} 
                onChange={(e) => handleConfigChange('temperature', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </>
        )}

        {node.type === 'agent' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Model</label>
              <select
                value={node.data.config?.modelId || node.data.config?.model || ''}
                onChange={(e) => handleConfigChange('modelId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" disabled>Select a model</option>
                {llmModels.length > 0 ? (
                    llmModels.map(model => (
                      <option key={model.id} value={model.id}>{model.name} ({model.provider})</option>
                    ))
                  ) : (
                    <>
                      <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                      <option value="gpt-4">gpt-4</option>
                      <option value="claude-3-opus">claude-3-opus</option>
                    </>
                  )}
              </select>
            </div>

            <div>
               <label className="block text-xs font-medium text-gray-500 mb-1">Goal / Instruction</label>
               <div className="relative">
                 <TiptapEditor
                   ref={el => textareaRefs.current['goal'] = el}
                   value={node.data.config?.goal || ''}
                   onChange={(val, selection) => handleEditorChange('goal', val, selection)}
                   onSlash={(rect, index) => handleEditorSlash('goal', rect, index)}
                   placeholder="Describe what the agent should achieve..."
                   className="min-h-[150px]"
                 />
                 <p className="text-[10px] text-gray-400 mt-1">
                   {t('workflow_editor.type_slash_for_vars') || "Type '/' to insert variables"}
                 </p>
               </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Max Iterations</label>
              <input
                type="number"
                min="1"
                max="50"
                value={node.data.config?.maxIterations || 10}
                onChange={(e) => handleConfigChange('maxIterations', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">History Messages Count</label>
              <input
                type="number"
                min="0"
                value={node.data.config?.readCount ?? 10}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  handleConfigChange('readCount', isNaN(val) ? 0 : Math.max(0, val));
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="10"
              />
              <p className="text-[10px] text-gray-400 mt-1">Number of historical messages to use</p>
            </div>

            <div>
                <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-medium text-gray-500">Tools</label>
                    <button
                        onClick={() => setShowToolDialog(true)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                        <Plus size={12} /> Add Tool
                    </button>
                </div>

                <div className="space-y-2">
                    {(() => {
                        const currentToolIds = node.data.config?.tools || [];
                        const addedTools = tools.filter(t => currentToolIds.includes(t.id));

                        if (addedTools.length === 0) {
                            return (
                                <div className="text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200 text-xs text-gray-400">
                                    No tools added yet
                                </div>
                            );
                        }

                        return addedTools.map(tool => (
                            <div key={tool.id} className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-lg shadow-sm group">
                                <div className="w-8 h-8 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                                    <Settings size={14} />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="text-xs font-medium text-gray-700 truncate">{tool.displayName}</div>
                                    <div className="text-[10px] text-gray-400 truncate">{tool.name}</div>
                                </div>
                                <button
                                    onClick={() => handleRemoveTool(tool.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                                    title="Remove tool"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ));
                    })()}
                </div>

                <ToolSelectionDialog
                    isOpen={showToolDialog}
                    onClose={() => setShowToolDialog(false)}
                    availableTools={tools.filter(t => !(node.data.config?.tools || []).includes(t.id))}
                    onConfirm={handleAddTools}
                />
            </div>

             <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Temperature: {node.data.config?.temperature || 0.7}</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={node.data.config?.temperature || 0.7}
                onChange={(e) => handleConfigChange('temperature', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        )}

        {node.type === 'reply' && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('workflow_editor.reply_text')}</label>
            <textarea 
              value={node.data.config?.text || ''} 
              onChange={(e) => handleConfigChange('text', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder={t('workflow_editor.enter_reply_text')}
            />
          </div>
        )}
        

        
        {node.type === 'variable' && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('workflow_editor.variable_name')}</label>
            <input 
              type="text"
              value={node.data.config?.variableName || ''}
              onChange={(e) => handleConfigChange('variableName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
              placeholder="e.g. user_age"
            />
            
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('workflow_editor.source_value')}</label>
            <div className="relative">
                <input 
                  ref={el => textareaRefs.current['sourceField'] = el}
                  type="text"
                  value={node.data.config?.sourceField || ''}
                  onChange={(e) => handleConfigChange('sourceField', e.target.value)}
                  onFocus={() => setActiveField('sourceField')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                  placeholder="e.g. {{user.id}}"
                />
                <button 
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors"
                    onClick={(e) => {
                        const input = textareaRefs.current['sourceField'];
                        if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
                            const rect = input.getBoundingClientRect();
                            setVarMenuPos({ top: rect.bottom + 5, left: rect.left, placement: 'bottom' });
                            setActiveField('sourceField');
                            setShowVarMenu(true);
                            // When clicking button, assume we want to append if cursor is at 0/default
                            if (input.value && input.selectionStart === 0) {
                                setCursorIndex(input.value.length + 1);
                            }
                        }
                    }}
                >
                    <Braces size={14} />
                </button>
            </div>
          </div>
        )}

        {node.type === 'condition' && (
          <div className="space-y-4">
             <div className="flex justify-between items-center">
                 <label className="block text-xs font-medium text-gray-500">{t('workflow_editor.conditions')}</label>
                 <button 
                     onClick={() => {
                        const conditions = node.data.config?.conditions || [];
                        const newCondition = {
                            id: Math.random().toString(36).substring(7),
                            sourceValue: '',
                            conditionType: 'contains',
                            inputValue: ''
                        };
                        handleConfigChange('conditions', [...conditions, newCondition]);
                     }}
                     className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                 >
                     <Plus size={12} /> {t('workflow_editor.add_condition')}
                 </button>
             </div>
             
             <div className="space-y-3">
                 {(node.data.config?.conditions || []).map((condition: any, idx: number) => (
                     <div key={condition.id} className="p-3 bg-gray-50 border border-gray-200 rounded-lg relative group">
                         <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-gray-500 uppercase">{idx === 0 ? t('workflow_editor.if') : t('workflow_editor.else_if')}</span>
                            <button 
                                onClick={() => {
                                    const conditions = node.data.config?.conditions || [];
                                    handleConfigChange('conditions', conditions.filter((c: any) => c.id !== condition.id));
                                }}
                                className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
                            >
                                <Trash2 size={14} />
                            </button>
                         </div>
                         
                         <div className="space-y-2">
                             {/* Source Value */}
                             <div className="relative">
                                <input 
                                  ref={el => textareaRefs.current[`condition_source_${condition.id}`] = el}
                                  type="text"
                                  value={condition.sourceValue || ''}
                                  onChange={(e) => {
                                      const conditions = node.data.config?.conditions || [];
                                      const newConditions = conditions.map((c: any) => c.id === condition.id ? { ...c, sourceValue: e.target.value } : c);
                                      handleConfigChange('conditions', newConditions);
                                  }}
                                  onFocus={() => setActiveField(`condition_source_${condition.id}`)}
                                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 pr-7"
                                  placeholder={t('workflow_editor.source_value')}
                                />
                                <button 
                                        className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 p-0.5 rounded hover:bg-blue-50 transition-colors"
                                        onClick={(e) => {
                                            const input = textareaRefs.current[`condition_source_${condition.id}`];
                                            if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
                                                const rect = input.getBoundingClientRect();
                                                setVarMenuPos({ top: rect.bottom + 5, left: rect.left, placement: 'bottom' });
                                                setActiveField(`condition_source_${condition.id}`);
                                                setShowVarMenu(true);
                                                // When clicking button, assume we want to append if cursor is at 0/default
                                                if (input.value && input.selectionStart === 0) {
                                                    setCursorIndex(input.value.length + 1);
                                                }
                                            }
                                        }}
                                    >
                                    <Braces size={12} />
                                </button>
                             </div>
                             
                             {/* Condition Type */}
                             <select 
                                value={condition.conditionType || 'contains'}
                                onChange={(e) => {
                                      const conditions = node.data.config?.conditions || [];
                                      const newConditions = conditions.map((c: any) => c.id === condition.id ? { ...c, conditionType: e.target.value } : c);
                                      handleConfigChange('conditions', newConditions);
                                }}
                                className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                             >
                                <option value="contains">{t('workflow_editor.contains')}</option>
                                <option value="notContains">{t('workflow_editor.not_contains')}</option>
                                <option value="startsWith">{t('workflow_editor.starts_with')}</option>
                                <option value="endsWith">{t('workflow_editor.ends_with')}</option>
                                <option value="equals">{t('workflow_editor.equals')}</option>
                                <option value="notEquals">{t('workflow_editor.not_equals')}</option>
                                <option value="isEmpty">{t('workflow_editor.is_empty')}</option>
                                <option value="isNotEmpty">{t('workflow_editor.is_not_empty')}</option>
                                <option value="gt">{t('workflow_editor.greater_than')}</option>
                                <option value="lt">{t('workflow_editor.less_than')}</option>
                                <option value="gte">{t('workflow_editor.greater_than_or_equal')}</option>
                                <option value="lte">{t('workflow_editor.less_than_or_equal')}</option>
                             </select>
                             
                             {/* Input Value */}
                             {!['isEmpty', 'isNotEmpty'].includes(condition.conditionType) && (
                                 <div className="relative">
                                    <input 
                                      ref={el => textareaRefs.current[`condition_input_${condition.id}`] = el}
                                      type="text"
                                      value={condition.inputValue || ''}
                                      onChange={(e) => {
                                          const conditions = node.data.config?.conditions || [];
                                          const newConditions = conditions.map((c: any) => c.id === condition.id ? { ...c, inputValue: e.target.value } : c);
                                          handleConfigChange('conditions', newConditions);
                                      }}
                                      onFocus={() => setActiveField(`condition_input_${condition.id}`)}
                                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 pr-7"
                                      placeholder={t('workflow_editor.target_value')}
                                    />
                                    <button 
                                        className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 p-0.5 rounded hover:bg-blue-50 transition-colors"
                                        onClick={(e) => {
                                            const input = textareaRefs.current[`condition_input_${condition.id}`];
                                            if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
                                                const rect = input.getBoundingClientRect();
                                                setVarMenuPos({ top: rect.bottom + 5, left: rect.left, placement: 'bottom' });
                                                setActiveField(`condition_input_${condition.id}`);
                                                setShowVarMenu(true);
                                                // When clicking button, assume we want to append if cursor is at 0/default
                                                if (input.value && input.selectionStart === 0) {
                                                    setCursorIndex(input.value.length + 1);
                                                }
                                            }
                                        }}
                                    >
                                        <Braces size={12} />
                                    </button>
                                 </div>
                             )}
                         </div>
                     </div>
                 ))}
                 
                 {(node.data.config?.conditions || []).length === 0 && (
                    <div className="text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200 text-xs text-gray-400">
                        {t('workflow_editor.no_conditions_added')}
                    </div>
                 )}
                 
                 <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between opacity-50 cursor-not-allowed">
                     <span className="text-xs font-bold text-gray-500 uppercase">{t('workflow_editor.else')}</span>
                     <span className="text-xs text-gray-400 italic">{t('workflow_editor.fallback_branch')}</span>
                 </div>
             </div>
          </div>
        )}

        {node.type === 'knowledge' && (
           <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">{t('workflow_editor.knowledge_bases')}</label>
            <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1 mb-4">
              {(() => {
                  const selectedIds = node.data.config?.knowledgeBaseIds || (node.data.config?.knowledgeBaseId ? [node.data.config.knowledgeBaseId] : []);
                  
                  const toggleKb = (kb: KnowledgeBase) => {
                      let newIds: string[];
                      let newSelectedKBs: any[];
                      
                      if (selectedIds.includes(kb.id)) {
                          newIds = selectedIds.filter((id: string) => id !== kb.id);
                      } else {
                          newIds = [...selectedIds, kb.id];
                      }
                      
                      // Update Selected Objects for UI
                      newSelectedKBs = knowledgeBases
                          .filter(k => newIds.includes(k.id))
                          .map(k => ({ id: k.id, name: k.name }));

                      // Perform single atomic update
                      const config = node.data.config || {};
                      onChange({
                          ...node.data,
                          config: {
                              ...config,
                              knowledgeBaseIds: newIds,
                              selectedKnowledgeBases: newSelectedKBs
                          }
                      });
                  };

                  return knowledgeBases.map(kb => {
                    const isSelected = selectedIds.includes(kb.id);
                    return (
                      <div 
                        key={kb.id} 
                        onClick={() => toggleKb(kb)}
                        className={`
                          flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all group
                          ${isSelected 
                            ? 'bg-blue-50 border-blue-200 shadow-sm' 
                            : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                          }
                        `}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className={`p-1.5 rounded-md transition-colors ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500 group-hover:text-blue-500 group-hover:bg-blue-50'}`}>
                             <Database size={16} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className={`text-sm font-medium truncate transition-colors ${isSelected ? 'text-blue-800' : 'text-gray-700'}`}>
                              {kb.name}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                <span>{kb.documentCount} docs</span>
                                <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                <span>{kb.vectorDimension} dim</span>
                            </div>
                          </div>
                        </div>
                        <div className={`
                            w-5 h-5 rounded-full border flex items-center justify-center transition-all
                            ${isSelected 
                                ? 'bg-blue-500 border-blue-500 text-white' 
                                : 'border-gray-300 bg-transparent group-hover:border-blue-300'
                            }
                        `}>
                            {isSelected && <CheckCircle size={12} fill="currentColor" className="text-white" />}
                        </div>
                      </div>
                   );
                 });
              })()}
              {knowledgeBases.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <Database size={24} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-xs text-gray-500">{t('workflow_editor.no_knowledge_bases_available')}</p>
                </div>
              )}
            </div>

            <label className="block text-xs font-medium text-gray-500 mb-1">{t('workflow_editor.query_source')}</label>
            <select 
                value={node.data.config?.querySource || 'userMessage'}
                onChange={(e) => handleConfigChange('querySource', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                <option value="userMessage">{t('workflow_editor.user_message')}</option>
                <option value="lastOutput">{t('workflow_editor.last_node_output')}</option>
            </select>
          </div>
        )}

        {/* Next Node Info */}
        <div className="mt-4 pt-4 border-t border-gray-100">
            <label className="block text-xs font-bold text-gray-700 mb-3 flex items-center gap-1.5">
                <GitBranch size={14} className="text-gray-400" />
                {t('workflow_editor.next_step')}
            </label>
            {nextNodesInfo.length === 0 ? (
                <div className="text-xs text-gray-400 italic bg-gray-50 p-3 rounded-lg border border-dashed border-gray-200 text-center">
                    {t('workflow_editor.no_connected_nodes')}
                </div>
            ) : (
                <div className="space-y-4">
                    {nextNodesInfo.map((info) => (
                        <div key={info.handleId} className="space-y-2">
                            {(node.type === 'intent' || node.type === 'tool' || node.type === 'condition') && info.handleId !== 'default' && (
                                <div className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md w-fit border border-blue-100 shadow-sm flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                    {node.type === 'intent' || node.type === 'condition' ? info.handleLabel : `${t('workflow_editor.exit')}: ${info.handleLabel}`}
                                </div>
                            )}
                            {info.targets.map((target: any) => (
                                <button
                                    key={target.id} 
                                    onClick={() => handleNavigateToNode(target)}
                                    className="w-full flex items-center gap-3 p-3 bg-white hover:bg-gray-50 rounded-xl border border-gray-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all group text-left"
                                >
                                    <div className={`
                                        p-2 rounded-lg flex-shrink-0 transition-colors
                                        ${target.type === 'start' ? 'bg-blue-100 text-blue-600' : ''}
                                        ${target.type === 'end' ? 'bg-red-100 text-red-600' : ''}
                                        ${target.type === 'intent' ? 'bg-green-100 text-green-600' : ''}
                                        ${target.type === 'llm' ? 'bg-indigo-100 text-indigo-600' : ''}
                                        ${target.type === 'tool' ? 'bg-orange-100 text-orange-600' : ''}
                                        ${target.type === 'knowledge' ? 'bg-orange-100 text-orange-600' : ''}
                                        ${!['start', 'end', 'intent', 'llm', 'tool', 'knowledge'].includes(target.type) ? 'bg-gray-100 text-gray-600' : ''}
                                    `}>
                                        {target.type === 'start' && <Play size={16}/>}
                                        {target.type === 'end' && <Square size={16}/>}
                                        {target.type === 'intent' && <GitBranch size={16}/>}
                                        {target.type === 'llm' && <Bot size={16}/>}
                                        {target.type === 'tool' && <Hammer size={16}/>}
                                        {target.type === 'knowledge' && <Database size={16}/>}
                                        {/* Fallback icon */}
                                        {!['start', 'end', 'intent', 'llm', 'tool', 'knowledge'].includes(target.type) && <ArrowRight size={16}/>}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold text-gray-700 truncate group-hover:text-blue-600 transition-colors">
                                            {target.data?.label || target.type}
                                        </div>
                                        <div className="text-[10px] text-gray-400 truncate uppercase tracking-wider">
                                            {target.type}
                                        </div>
                                    </div>
                                    
                                    <div className="text-gray-300 group-hover:text-blue-400 transition-colors">
                                        <ChevronRight size={16} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
      
      {showVarMenu && typeof document !== 'undefined' && createPortal(
                <div 
                    className="fixed z-[99999] bg-white rounded-lg shadow-2xl border border-gray-200 w-64 max-h-80 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                    style={{ 
                        top: varMenuPos.placement === 'bottom' ? `${varMenuPos.top}px` : undefined,
                        bottom: varMenuPos.placement === 'top' ? `${window.innerHeight - varMenuPos.top}px` : undefined,
                        left: `${varMenuPos.left}px` 
                    }}
                >
                    <div className="p-2 border-b border-gray-100 bg-gray-50">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                            <div className="w-full pl-7 pr-2 py-1 text-xs border border-gray-200 rounded bg-white text-gray-500 truncate">
                                {filterText || t('workflow_editor.search_variable')}
                            </div>
                        </div>
                    </div>
                    <div className="overflow-y-auto flex-1 p-1 custom-scrollbar">
                        {(() => {
                            const filteredVars = availableVariables.filter(v => 
                                v.label.toLowerCase().includes(filterText.toLowerCase()) || 
                                v.value.toLowerCase().includes(filterText.toLowerCase())
                            );

                            const groupedVars = filteredVars.reduce((acc, v) => {
                                if (!acc[v.group]) acc[v.group] = [];
                                acc[v.group].push(v);
                                return acc;
                            }, {} as Record<string, typeof availableVariables>);

                            if (Object.keys(groupedVars).length === 0) {
                                return <div className="p-4 text-center text-xs text-gray-400">{t('workflow_editor.no_variables_found')}</div>;
                            }

                            return Object.entries(groupedVars).map(([group, vars]) => (
                                <div key={group} className="mb-2">
                                    <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase">{group}</div>
                                    {vars.map(v => (
                                        <button
                                            key={v.id}
                                            onClick={() => handleInsertVariable(v.value)}
                                            className="w-full text-left px-2 py-1.5 hover:bg-blue-50 rounded flex items-center justify-between group transition-colors"
                                        >
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <div className="w-4 h-4 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-mono font-bold">
                                                    {'{x}'}
                                                </div>
                                                <span className="text-xs text-gray-700 truncate" title={v.value}>{v.label}</span>
                                            </div>
                                            <span className="text-[10px] text-gray-400 font-mono ml-2">{v.type}</span>
                                        </button>
                                    ))}
                                </div>
                            ));
                        })()}
                    </div>
                </div>,
                document.body
            )}
    </div>
  );
};

const ImageTextSplitNode = ({ id, data, selected }: NodeProps) => {
  const { t } = useTranslation();
  const config = data.config as any;
  const modelDisplay = useModelName(config?.modelId || config?.model, config?.modelDisplayName);

  return (
    <div className={`bg-white rounded-xl shadow-lg border p-0 min-w-[240px] group hover:border-teal-300 transition-colors relative ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-100'}`}>
      <NodeMenu nodeId={id} />
      <div className="bg-teal-50 px-4 py-2 rounded-t-xl border-b border-teal-100 flex items-center gap-2">
        <div className="bg-teal-100 p-1 rounded-lg text-teal-600">
          <Split size={14} />
        </div>
        <span className="font-semibold text-gray-700 text-sm">{(data as any).label || t('workflow_editor.image_text_split')}</span>
      </div>
      <div className="p-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200 w-fit">
          <Bot size={12} />
          <span>{modelDisplay}</span>
        </div>
      </div>
      <div className="p-4">
        <div className="text-xs text-gray-500">
          {t('workflow_editor.splits_context_structured')}
        </div>
      </div>
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
      <Handle type="source" position={Position.Right} className="!bg-teal-500" />
    </div>
  );
};

const SetSessionMetadataNode = ({ id, data, selected }: NodeProps) => {
  const { t } = useTranslation();
  const config = data.config as any;
  const modelDisplay = useModelName(config?.modelId || config?.model, config?.modelDisplayName);

  return (
    <div className={`bg-white rounded-xl shadow-lg border p-0 min-w-[240px] group hover:border-fuchsia-300 transition-colors relative ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-100'}`}>
      <NodeMenu nodeId={id} />
      <div className="bg-fuchsia-50 px-4 py-2 rounded-t-xl border-b border-fuchsia-100 flex items-center gap-2">
        <div className="bg-fuchsia-100 p-1 rounded-lg text-fuchsia-600">
          <Tags size={14} />
        </div>
        <span className="font-semibold text-gray-700 text-sm">{(data as any).label || t('workflow_editor.set_metadata')}</span>
      </div>
      <div className="p-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200 w-fit">
          <Bot size={12} />
          <span>{modelDisplay}</span>
        </div>
      </div>
      <div className="p-4">
        <div className="text-xs text-gray-500">
          {t('workflow_editor.extract_set_metadata')}
        </div>
      </div>
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
      <Handle type="source" position={Position.Right} className="!bg-fuchsia-500" />
    </div>
  );
};

const ParameterExtractionNode = ({ id, data, selected }: NodeProps) => {
  const { t } = useTranslation();
  const config = data.config as any;
  const modelDisplay = useModelName(config?.modelId || config?.model, config?.modelDisplayName);
  const parameters = config?.parameters || [];

  return (
    <div className={`bg-white rounded-xl shadow-lg border p-0 min-w-[240px] group hover:border-violet-300 transition-colors relative ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-100'}`}>
      <NodeMenu nodeId={id} />
      <div className="bg-violet-50 px-4 py-2 rounded-t-xl border-b border-violet-100 flex items-center gap-2">
        <div className="bg-violet-100 p-1 rounded-lg text-violet-600">
          <ListFilter size={14} />
        </div>
        <span className="font-semibold text-gray-700 text-sm">{(data as any).label || t('workflow_editor.param_extraction')}</span>
      </div>
      <div className="p-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200 w-fit">
          <Bot size={12} />
          <span>{modelDisplay}</span>
        </div>
      </div>
      <div className="p-4">
        <div className="text-xs text-gray-500 mb-2">{t('workflow_editor.extract_structured_parameters')}</div>
        {parameters.length > 0 ? (
            <div className="space-y-1">
                {parameters.slice(0, 3).map((param: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-[10px] bg-gray-50 px-2 py-1 rounded">
                        <span className="font-medium text-gray-600 truncate max-w-[120px]">{param.name}</span>
                        <span className="text-gray-400">{param.type}</span>
                    </div>
                ))}
                {parameters.length > 3 && (
                    <div className="text-[10px] text-gray-400 pl-1">+ {parameters.length - 3} more</div>
                )}
            </div>
        ) : (
            <div className="text-[10px] text-gray-400 italic">{t('workflow_editor.no_parameters_configured')}</div>
        )}
      </div>
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
      <Handle type="source" position={Position.Right} className="!bg-violet-500" />
    </div>
  );
};

const VariableNode = ({ id, data, selected }: NodeProps) => {
  const { t } = useTranslation();
  const config = data.config as any;
  const variableName = config?.variableName || '';
  const sourceField = config?.sourceField || '';

  return (
    <div className={`bg-white rounded-xl shadow-lg border p-0 min-w-[200px] group hover:border-cyan-300 transition-colors relative ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-100'}`}>
      <NodeMenu nodeId={id} />
      <div className="bg-cyan-50 px-4 py-2 rounded-t-xl border-b border-cyan-100 flex items-center gap-2">
        <div className="bg-cyan-100 p-1 rounded-lg text-cyan-600">
          <Braces size={14} />
        </div>
        <span className="font-semibold text-gray-700 text-sm">{(data as any).label || t('workflow_editor.variable_setting')}</span>
      </div>
      <div className="p-4">
        {variableName ? (
           <div className="flex flex-col gap-1">
             <div className="text-xs text-gray-500">{t('workflow_editor.variable_name')}: <span className="font-medium text-gray-700">{variableName}</span></div>
             {sourceField && <div className="text-xs text-gray-500">{t('workflow_editor.source_field')}: <span className="font-medium text-gray-700">{sourceField}</span></div>}
           </div>
        ) : (
           <div className="text-xs text-gray-500">{t('workflow_editor.set_workflow_variable')}</div>
        )}
      </div>
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
      <Handle type="source" position={Position.Right} className="!bg-cyan-500" />
    </div>
  );
};

const ConditionNode = ({ id, data, selected }: NodeProps) => {
  const { t } = useTranslation();
  const conditions = (data.config as any)?.conditions || [];

  return (
    <div className={`bg-white rounded-xl shadow-lg border p-0 min-w-[280px] group hover:border-teal-300 transition-colors relative ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-100'}`}>
      <NodeMenu nodeId={id} />
      <div className="bg-teal-50 px-4 py-2 rounded-t-xl border-b border-teal-100 flex items-center gap-2">
        <div className="bg-teal-100 p-1 rounded-lg text-teal-600">
          <Split size={14} />
        </div>
        <span className="font-semibold text-gray-700 text-sm">{(data as any).label || t('workflow_editor.condition_check')}</span>
      </div>
      
      <div className="p-0">
        <div className="flex flex-col">
            {/* IF / ELSE IF Branches */}
            {conditions.map((condition: any, index: number) => (
                <div key={condition.id} className="px-4 py-3 border-b border-gray-100 flex justify-between items-center relative hover:bg-gray-50">
                    <div className="flex flex-col overflow-hidden mr-2">
                        <span className="text-xs font-bold text-gray-500 uppercase mb-0.5">
                            {index === 0 ? t('workflow_editor.if') : t('workflow_editor.else_if')}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-gray-700 truncate max-w-[180px]">
                            <span className="font-mono bg-gray-100 px-1 rounded">{condition.sourceValue || '?'}</span>
                            <span className="text-gray-400 font-bold text-[10px]">{condition.conditionType}</span>
                            {!['isEmpty', 'isNotEmpty'].includes(condition.conditionType) && (
                                <span className="font-mono bg-gray-100 px-1 rounded">{condition.inputValue || '?'}</span>
                            )}
                        </div>
                    </div>
                    <Handle type="source" position={Position.Right} id={condition.id} className="!bg-teal-500 !right-[-6px]" style={{top: '50%'}} />
                </div>
            ))}
            
            {/* ELSE Branch */}
            <div className="px-4 py-3 flex justify-between items-center relative hover:bg-gray-50 bg-gray-50/50 rounded-b-xl">
                <span className="text-xs font-bold text-gray-500 uppercase">{t('workflow_editor.else')}</span>
                <Handle type="source" position={Position.Right} id="else" className="!bg-gray-400 !right-[-6px]" style={{top: '50%'}} />
            </div>
        </div>
      </div>
      
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
    </div>
  );
};

const nodeTypes = {
  start: StartNode,
  end: EndNode,
  intent: IntentNode,
  knowledge: KnowledgeNode,

  variable: VariableNode,

  condition: ConditionNode,

  llm: LLMNode,
  translation: TranslationNode,
  reply: ReplyNode,
  human_transfer: TransferNode,
  flow: FlowNode,
  flow_end: FlowEndNode,
  flow_update: FlowUpdateNode,
  agent: AgentNode,
  tool: ToolNode,

  imageTextSplit: ImageTextSplitNode,
  setSessionMetadata: SetSessionMetadataNode,
  parameter_extraction: ParameterExtractionNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

// Sidebar Component for Draggable Nodes
const Sidebar = () => {
  const { t } = useTranslation();
  const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/reactflow/label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  const categories = [
    {
      title: t('workflow_editor.categories.flow_control'),
      items: [
        {
          type: 'start',
          label: t('workflow_editor.nodes.start'),
          icon: <Play size={16} />,
          bg: 'bg-blue-50',
          border: 'border-blue-100',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600'
        },
        {
          type: 'end',
          label: t('workflow_editor.nodes.end'),
          icon: <Square size={16} />,
          bg: 'bg-red-50',
          border: 'border-red-100',
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600'
        },
        {
          type: 'condition',
          label: t('workflow_editor.condition_check'),
          icon: <Split size={16} />,
          bg: 'bg-teal-50',
          border: 'border-teal-100',
          iconBg: 'bg-teal-100',
          iconColor: 'text-teal-600',
          onDragExtra: (event: React.DragEvent) => {
             event.dataTransfer.setData('application/reactflow/config', JSON.stringify({
              conditions: [
                  {
                    id: Math.random().toString(36).substring(7),
                    sourceValue: '',
                    conditionType: 'contains',
                    inputValue: ''
                  }
              ]
            }));
          }
        },
        {
          type: 'intent',
          label: t('workflow_editor.nodes.intent'),
          icon: <GitBranch size={16} />,
          bg: 'bg-green-50',
          border: 'border-green-100',
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
          onDragExtra: (event: React.DragEvent) => {
            event.dataTransfer.setData('application/reactflow/config', JSON.stringify({
              intents: []
            }));
          }
        }
      ]
    },
    {
      title: t('workflow_editor.categories.ai_capabilities'),
      items: [
        {
            type: 'llm',
            label: t('workflow_editor.nodes.llm'),
            icon: <Bot size={16}/>,
            bg: 'bg-indigo-50',
            border: 'border-indigo-100',
            iconBg: 'bg-indigo-100',
            iconColor: 'text-indigo-600'
        },
        {
            type: 'knowledge',
            label: t('workflow_editor.nodes.knowledge'),
            icon: <Database size={16}/>,
            bg: 'bg-orange-50',
            border: 'border-orange-100',
            iconBg: 'bg-orange-100',
            iconColor: 'text-orange-600'
        },
        {
            type: 'translation',
            label: t('workflow_editor.nodes.translation'),
            icon: <Languages size={16}/>,
            bg: 'bg-orange-50',
            border: 'border-orange-100',
            iconBg: 'bg-orange-100',
            iconColor: 'text-orange-600'
        },
        {
            type: 'imageTextSplit',
            label: t('workflow_editor.image_text_split'),
            icon: <Split size={16}/>,
            bg: 'bg-teal-50',
            border: 'border-teal-100',
            iconBg: 'bg-teal-100',
            iconColor: 'text-teal-600'
        },
        {
            type: 'agent',
            label: t('workflow_editor.nodes.agent'),
            icon: <Bot size={16}/>,
            bg: 'bg-purple-50',
            border: 'border-purple-100',
            iconBg: 'bg-purple-100',
            iconColor: 'text-purple-600'
        }
      ]
    },
    {
        title: t('workflow_editor.categories.interaction'),
        items: [
            {
                type: 'reply',
                label: t('workflow_editor.nodes.reply'),
                icon: <MessageSquare size={16}/>,
                bg: 'bg-blue-50',
                border: 'border-blue-100',
                iconBg: 'bg-blue-100',
                iconColor: 'text-blue-600'
            },
            {
                type: 'human_transfer',
                label: t('workflow_editor.transfer_to_human'),
                icon: <Headphones size={16}/>,
                bg: 'bg-pink-50',
                border: 'border-pink-100',
                iconBg: 'bg-pink-100',
                iconColor: 'text-pink-600'
            },
            {
                type: 'parameter_extraction',
                label: t('workflow_editor.param_extraction'),
                icon: <ListFilter size={16}/>,
                bg: 'bg-violet-50',
                border: 'border-violet-100',
                iconBg: 'bg-violet-100',
                iconColor: 'text-violet-600'
            },
            {
                type: 'variable',
                label: t('workflow_editor.variable_setting'),
                icon: <Braces size={16}/>,
                bg: 'bg-cyan-50',
                border: 'border-cyan-100',
                iconBg: 'bg-cyan-100',
                iconColor: 'text-cyan-600'
            },
            {
                type: 'setSessionMetadata',
                label: t('workflow_editor.set_metadata'),
                icon: <Tags size={16}/>,
                bg: 'bg-fuchsia-50',
                border: 'border-fuchsia-100',
                iconBg: 'bg-fuchsia-100',
                iconColor: 'text-fuchsia-600'
            }
        ]
    },
    {
        title: t('workflow_editor.categories.advanced'),
        items: [
            {
                type: 'tool',
                label: t('workflow_editor.tool_node'),
                icon: <Hammer size={16}/>,
                bg: 'bg-orange-50',
                border: 'border-orange-100',
                iconBg: 'bg-orange-100',
                iconColor: 'text-orange-600'
            },
            {
                type: 'flow',
                label: t('workflow_editor.nodes.flow'),
                icon: <Layout size={16}/>,
                bg: 'bg-purple-50',
                border: 'border-purple-100',
                iconBg: 'bg-purple-100',
                iconColor: 'text-purple-600'
            },
            {
                type: 'flow_end',
                label: t('workflow_editor.agent_end'),
                icon: <Square size={16}/>,
                bg: 'bg-gray-50',
                border: 'border-gray-100',
                iconBg: 'bg-gray-200',
                iconColor: 'text-gray-600'
            },
            {
                type: 'flow_update',
                label: t('workflow_editor.agent_update'),
                icon: <Edit2 size={16}/>,
                bg: 'bg-yellow-50',
                border: 'border-yellow-100',
                iconBg: 'bg-yellow-100',
                iconColor: 'text-yellow-600'
            }
        ]
    }
  ];

  return (
    <div className="absolute top-20 left-4 w-60 bg-white rounded-xl shadow-xl border border-gray-200 z-20 flex flex-col max-h-[calc(100vh-7rem)]">
      <div className="p-4 pb-2 border-b border-gray-100 flex-shrink-0">
        <h3 className="text-sm font-bold text-gray-800">{t('workflow_editor.components')}</h3>
        <p className="text-xs text-gray-500">{t('workflow_editor.drag_to_add')}</p>
      </div>

      <div className="p-3 overflow-y-auto custom-scrollbar flex-1 space-y-6">
        {categories.map((group, index) => (
            <div key={index}>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">{group.title}</h4>
                <div className="space-y-2">
                    {group.items.map((item) => (
                        <div
                          key={item.type}
                          className={`flex items-center gap-2 p-2 ${item.bg} border ${item.border} rounded-md cursor-grab active:cursor-grabbing hover:shadow-sm transition-all`}
                          onDragStart={(event) => {
                            onDragStart(event, item.type, item.label);
                            if (item.onDragExtra) item.onDragExtra(event);
                          }}
                          draggable
                        >
                          <div className={`${item.iconBg} p-1 rounded ${item.iconColor}`}>{item.icon}</div>
                          <span className="text-xs font-medium text-gray-700">{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

// Internal component to access React Flow instance
const WorkflowEditor = ({ onBack, workflowId }: { onBack: () => void; workflowId: string }) => {
  const { t } = useTranslation();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { screenToFlowPosition, getNodes, getEdges } = useReactFlow();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [workflowCategoryIds, setWorkflowCategoryIds] = useState<string[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [showGeneratorDialog, setShowGeneratorDialog] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const handleGenerateWorkflow = async (prompt: string, modelId: string) => {
    try {
      const currentNodes = getNodes();
      const currentEdges = getEdges();
      
      const result = await workflowApi.generateWorkflow({
        prompt,
        modelId,
        existingNodesJson: currentNodes.length > 0 ? JSON.stringify(currentNodes) : undefined,
        existingEdgesJson: currentEdges.length > 0 ? JSON.stringify(currentEdges) : undefined
      });
      
      if (result.nodesJson && result.edgesJson) {
        let newNodes = JSON.parse(result.nodesJson);
        const newEdges = JSON.parse(result.edgesJson);
        
        // Fetch enabled models to populate model names if missing
        try {
            const models = await workflowApi.getEnabledModels();
            
            newNodes = newNodes.map((node: any) => {
                const config = node.data?.config || {};
                
                // Check if node needs model name resolution
                // Normalize 'modelId' to 'model' if present
                let targetModelId = config.model || config.modelId;
                
                if (targetModelId) {
                    const modelInfo = models.find((m: any) => m.id === targetModelId);
                    if (modelInfo) {
                        return {
                            ...node,
                            data: {
                                ...node.data,
                                config: {
                                    ...config,
                                    model: targetModelId, // Ensure standard field 'model' is set
                                    modelDisplayName: modelInfo.name
                                }
                            }
                        };
                    } else {
                        // If model not found but we have an ID, ensure 'model' field is set
                        return {
                             ...node,
                             data: {
                                 ...node.data,
                                 config: {
                                     ...config,
                                     model: targetModelId
                                 }
                             }
                        };
                    }
                }
                
                return node;
            });
        } catch (err) {
            console.error('Failed to resolve model names for generated workflow', err);
            // Continue with nodes as-is if fetching fails
        }
        
        setNodes(newNodes);
        setEdges(newEdges);
      }
    } catch (error) {
      console.error('Failed to generate workflow:', error);
      throw error;
    }
  };

  const onNodeClick = useCallback((event: React.MouseEvent, node: any) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const onNodeDataChange = useCallback((newData: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNodeId) {
          return { ...node, data: newData };
        }
        return node;
      })
    );
  }, [selectedNodeId, setNodes]);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  useEffect(() => {
    const loadWorkflow = async () => {
      try {
        setLoading(true);
        const workflow = await workflowApi.getWorkflowById(workflowId);
        if (workflow) {
          setWorkflowName(workflow.name);
          setWorkflowDescription(workflow.description || '');
          
          // Load categories
          if (workflow.categoryIds) {
            setWorkflowCategoryIds(workflow.categoryIds);
          } else {
             try {
                const cats = await workflowApi.getWorkflowCategories(workflowId);
                setWorkflowCategoryIds(cats);
             } catch (e) {
                console.warn('Failed to fetch categories', e);
             }
          }

          if (workflow.nodesJson) {
            setNodes(JSON.parse(workflow.nodesJson));
          }
          if (workflow.edgesJson) {
            setEdges(JSON.parse(workflow.edgesJson));
          }
        }
      } catch (error) {
        console.error('Failed to load workflow:', error);
      } finally {
        setLoading(false);
      }
    };

    loadWorkflow();
  }, [workflowId, setNodes, setEdges]);

  const enforceGpt5Temperature = (nodes: any[]) => {
      let hasChanges = false;
      const updatedNodes = nodes.map(node => {
        const modelName = node.data.config?.modelDisplayName || node.data.config?.modelDisplayName;
        const temperature = node.data.config?.temperature ?? 0.7; // Default to 0.7 if undefined

        // Check if model exists and contains 'gpt-5' (case insensitive)
        if (modelName && typeof modelName === 'string' && modelName.toLowerCase().includes('gpt-5')) {
          // console.log('Found GPT-5 model:', modelName);
          if (temperature < 1) {
            hasChanges = true;
            return {
              ...node,
              data: {
                ...node.data,
                config: {
                  ...node.data.config,
                  temperature: 1
                }
              }
            };
          }
        }
        return node;
      });
      return { nodes: updatedNodes, hasChanges };
  };

  const handleSaveSettings = async (name: string, description: string, categoryIds: string[]) => {
      try {
          let currentNodes = getNodes();
          const { nodes: updatedNodes, hasChanges } = enforceGpt5Temperature(currentNodes);
          
          if (hasChanges) {
              setNodes(updatedNodes);
              currentNodes = updatedNodes;
          }

          await workflowApi.updateWorkflow(workflowId, {
              name,
              description,
              nodesJson: JSON.stringify(currentNodes),
              edgesJson: JSON.stringify(getEdges()),
              categoryIds
          });
          
          setWorkflowName(name);
          setWorkflowDescription(description);
          setWorkflowCategoryIds(categoryIds);
          setIsSettingsOpen(false);
      } catch (error) {
          console.error('Failed to update workflow settings:', error);
      }
  };

  const onSave = async () => {
    try {
      setSaving(true);
      let currentNodes = getNodes();
      const currentEdges = getEdges();
      
      const { nodes: updatedNodes, hasChanges } = enforceGpt5Temperature(currentNodes);
      
      if (hasChanges) {
        setNodes(updatedNodes);
        currentNodes = updatedNodes;
      }
      
      // Filter out edges that are connected to non-existent nodes
      const nodeIds = new Set(currentNodes.map(n => n.id));
      const validEdges = currentEdges.filter(edge => 
        nodeIds.has(edge.source) && nodeIds.has(edge.target)
      );

      await workflowApi.updateWorkflow(workflowId, {
        name: workflowName,
        description: workflowDescription,
        nodesJson: JSON.stringify(currentNodes),
        edgesJson: JSON.stringify(validEdges),
        categoryIds: workflowCategoryIds
      });
      
      // Update local state with cleaned edges to reflect what was saved
      if (validEdges.length !== currentEdges.length) {
        setEdges(validEdges);
      }
      
      // Optional: Show success toast
    } catch (error) {
      console.error('Failed to save workflow:', error);
    } finally {
      setSaving(false);
    }
  };

  const onLayout = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges,
      'LR'
    );

    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
  }, [nodes, edges, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const label = event.dataTransfer.getData('application/reactflow/label');
      const configStr = event.dataTransfer.getData('application/reactflow/config');

      // check if the dropped element is valid
      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: Math.random().toString(36).substring(7),
        type,
        position,
        data: { 
          label,
          config: configStr ? JSON.parse(configStr) : undefined
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes],
  );

  if (loading) {
    return (
      <div className="flex-1 h-full bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="flex-1 h-full bg-gray-50 relative flex">
      <Sidebar />
      <div className="flex-1 h-full" ref={reactFlowWrapper}>
        <div className="absolute top-4 left-[280px] z-10 bg-white/80 backdrop-blur p-2 rounded-lg border border-gray-200 shadow-sm flex items-center gap-3 w-auto max-w-[calc(100vw-300px)]">
            <button 
              onClick={onBack}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-800 transition-colors flex-shrink-0"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <input 
                type="text" 
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="font-bold text-gray-800 leading-tight bg-transparent border-none focus:ring-0 p-0 text-base truncate"
                placeholder={t('workflow_editor.workflow_name')}
              />
              <input 
                type="text" 
                value={workflowDescription}
                onChange={(e) => setWorkflowDescription(e.target.value)}
                className="text-xs text-gray-500 bg-transparent border-none focus:ring-0 p-0 truncate"
                placeholder={t('workflow_editor.add_description')}
              />
            </div>
            <div className="h-6 w-px bg-gray-200 mx-2 flex-shrink-0"></div>
            <div className="flex items-center gap-1 flex-shrink-0">
                <button 
                  onClick={() => setShowGeneratorDialog(true)}
                  className="p-1.5 hover:bg-purple-50 rounded-lg text-purple-600 hover:text-purple-700 transition-colors"
                  title={t('workflow_editor.generate_workflow')}
                >
                  <Wand2 size={20} />
                </button>
                <button 
                  onClick={onLayout}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-800 transition-colors"
                  title={t('workflow_editor.auto_layout')}
                >
                  <Layout size={20} />
                </button>
                <button 
                  onClick={() => setShowTestDialog(true)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-800 transition-colors"
                  title={t('workflow_editor.test_workflow')}
                >
                  <Play size={20} />
                </button>
                <button 
                  onClick={() => setIsSettingsOpen(true)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-800 transition-colors"
                  title={t('workflow_editor.workflow_settings')}
                >
                  <Settings size={20} />
                </button>
                <button 
                  onClick={onSave}
                  disabled={saving}
                  className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-2"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>{t('workflow_editor.save')}</span>
                </button>
            </div>
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onDragOver={onDragOver}
          onDrop={onDrop}
          fitView
          className="bg-gray-50"
          deleteKeyCode={['Backspace', 'Delete']}
          defaultEdgeOptions={{
            type: 'custom',
            animated: true,
            style: { stroke: '#94a3b8' },
            deletable: true,
          }}
        >
          <Controls />
          <MiniMap />
          <Background gap={12} size={1} />
        </ReactFlow>
        {selectedNode && (
            <PropertyPanel 
            node={selectedNode} 
            nodes={nodes}
            edges={edges}
            onChange={onNodeDataChange} 
            onClose={() => setSelectedNodeId(null)}
            currentWorkflowId={workflowId} 
            />
        )}
        
        <CreateWorkflowDialog 
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            onConfirm={handleSaveSettings}
            initialValues={{
                name: workflowName,
                description: workflowDescription,
                categoryIds: workflowCategoryIds
            }}
            mode="edit"
            workflowId={workflowId}
        />
        
        <WorkflowTestDialog 
            isOpen={showTestDialog}
            onClose={() => setShowTestDialog(false)}
            workflowId={workflowId}
            workflowName={workflowName}
            nodes={nodes}
        />
        
        <WorkflowGeneratorDialog 
            isOpen={showGeneratorDialog}
            onClose={() => setShowGeneratorDialog(false)}
            onGenerate={handleGenerateWorkflow}
        />
      </div>
    </div>
  );
};

const WorkflowList = ({ onSelect }: { onSelect: (id: string) => void }) => {
  const { t } = useTranslation();
  const [workflows, setWorkflows] = useState<AiWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<AiWorkflow | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const data = await workflowApi.getAllWorkflows();
      if (Array.isArray(data)) {
        setWorkflows(data);
      } else {
        console.warn('Received non-array workflow data:', data);
        setWorkflows([]);
      }
    } catch (error) {
      console.error('Failed to load workflows:', error);
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setIsCreateDialogOpen(true);
  };

  const handleConfirmCreate = async (name: string, description: string, categoryIds: string[]) => {
    try {
      setCreating(true);
      const newWorkflow = await workflowApi.createWorkflow({
        name,
        description,
        nodesJson: '[]',
        edgesJson: '[]',
        categoryIds
      });
      onSelect(newWorkflow.id);
    } catch (error) {
      console.error('Failed to create workflow:', error);
    } finally {
      setCreating(false);
      setIsCreateDialogOpen(false);
    }
  };

  const handleEdit = (e: React.MouseEvent, workflow: AiWorkflow) => {
    e.stopPropagation();
    setEditingWorkflow(workflow);
    setIsEditDialogOpen(true);
  };

  const handleConfirmEdit = async (name: string, description: string, categoryIds: string[]) => {
    if (!editingWorkflow) return;
    try {
      await workflowApi.updateWorkflow(editingWorkflow.id, {
        name,
        description,
        nodesJson: editingWorkflow.nodesJson,
        edgesJson: editingWorkflow.edgesJson,
        categoryIds
      });
      await loadWorkflows();
    } catch (error) {
      console.error('Failed to update workflow:', error);
    } finally {
      setEditingWorkflow(null);
      setIsEditDialogOpen(false);
    }
  };

  const handleCopy = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      setLoading(true);
      await workflowApi.copyWorkflow(id);
      await loadWorkflows();
    } catch (error) {
      console.error('Failed to copy workflow:', error);
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm(t('workflow_editor.delete_workflow_confirm'))) {
      try {
        await workflowApi.deleteWorkflow(id);
        await loadWorkflows();
      } catch (error) {
        console.error('Failed to delete workflow:', error);
      }
    }
  };

  const handleSetDefault = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await workflowApi.setDefaultWorkflow(id);
      await loadWorkflows();
    } catch (error) {
      console.error('Failed to set default workflow:', error);
    }
  };

  const handleToggleEnabled = async (e: React.MouseEvent, id: string, enabled: boolean) => {
    e.stopPropagation();
    try {
      await workflowApi.toggleWorkflow(id, enabled);
      await loadWorkflows();
    } catch (error) {
      console.error('Failed to toggle workflow:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 h-full bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="flex-1 h-full bg-gray-50 p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{t('workflow_editor.workflow_orchestration')}</h1>
            <p className="text-gray-500 mt-1">{t('workflow_editor.manage_design_workflows')}</p>
          </div>
          <button 
            onClick={handleCreate}
            disabled={creating}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
            <span>{t('workflow_editor.create_workflow')}</span>
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8 p-4 flex gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                    type="text" 
                    placeholder={t('workflow_editor.search_workflows')}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>
            <button className="px-4 py-2 border border-gray-200 rounded-lg flex items-center gap-2 text-gray-600 hover:bg-gray-50">
                <Filter size={20} />
                <span>{t('workflow_editor.filter')}</span>
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.isArray(workflows) && workflows.map((workflow) => (
            <div 
              key={workflow.id}
              onClick={() => onSelect(workflow.id)}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-lg ${workflow.isDefault ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'}`}>
                  {workflow.isDefault ? <Star size={24} fill="currentColor" /> : <MessageSquare size={24} />}
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    className={`p-1.5 rounded transition-colors ${workflow.isDefault ? 'text-yellow-500 bg-yellow-50' : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'}`}
                    onClick={(e) => handleSetDefault(e, workflow.id)}
                    title={t('workflow_editor.set_as_default')}
                  >
                    <Star size={16} fill={workflow.isDefault ? "currentColor" : "none"} />
                  </button>
                  <button 
                    className={`p-1.5 rounded transition-colors ${workflow.enabled ? 'text-green-500 bg-green-50' : 'text-gray-400 hover:text-green-500 hover:bg-green-50'}`}
                    onClick={(e) => handleToggleEnabled(e, workflow.id, !workflow.enabled)}
                    title={workflow.enabled ? t('workflow_editor.disable') : t('workflow_editor.enable')}
                  >
                    <Power size={16} />
                  </button>
                  <button 
                    className="text-gray-400 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded transition-colors"
                    onClick={(e) => handleCopy(e, workflow.id)}
                    title={t('workflow_editor.copy_workflow')}
                  >
                    <Copy size={16} />
                  </button>
                  <button 
                    className="text-gray-400 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded transition-colors"
                    onClick={(e) => handleEdit(e, workflow)}
                    title={t('workflow_editor.edit_details')}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    className="text-gray-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded transition-colors"
                    onClick={(e) => handleDelete(e, workflow.id)}
                    title={t('delete')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors">
                {workflow.name}
              </h3>
              <p className="text-sm text-gray-500 mb-4 line-clamp-2 h-10">
                {workflow.description || t('workflow_editor.no_description_provided')}
              </p>

              {workflow.categories && workflow.categories.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {workflow.categories.slice(0, 3).map(cat => (
                    <span key={cat.id} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 truncate max-w-[100px]">
                      {cat.name}
                    </span>
                  ))}
                  {workflow.categories.length > 3 && (
                    <span className="text-[10px] text-gray-400 self-center">+{workflow.categories.length - 3}</span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-100 text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} />
                  <span>{new Date(workflow.updatedAt || Date.now()).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded">
                  <GitBranch size={14} />
                  <span>{workflow.nodesJson ? JSON.parse(workflow.nodesJson).length : 0} {t('workflow_editor.nodes_count')}</span>
                </div>
              </div>
            </div>
          ))}

          {/* New Workflow Card Placeholder */}
          <button 
            onClick={handleCreate}
            disabled={creating}
            className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center gap-4 text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/50 transition-all min-h-[220px]"
          >
            <div className="p-4 rounded-full bg-gray-50 group-hover:bg-blue-100 transition-colors">
                {creating ? <Loader2 className="animate-spin" size={32} /> : <Plus size={32} />}
            </div>
            <span className="font-medium">{t('workflow_editor.create_new_workflow')}</span>
          </button>
        </div>
      </div>

      <CreateWorkflowDialog 
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onConfirm={handleConfirmCreate}
        mode="create"
      />

      <CreateWorkflowDialog 
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setEditingWorkflow(null);
        }}
        onConfirm={handleConfirmEdit}
        initialValues={editingWorkflow ? {
          name: editingWorkflow.name,
          description: editingWorkflow.description || '',
          categoryIds: editingWorkflow.categoryIds || []
        } : undefined}
        mode="edit"
        workflowId={editingWorkflow?.id}
      />
    </div>
  );
};

export const WorkflowView = () => {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);

  if (!selectedWorkflowId) {
    return <WorkflowList onSelect={setSelectedWorkflowId} />;
  }

  return (
    <ReactFlowProvider>
      <WorkflowEditor 
        workflowId={selectedWorkflowId} 
        onBack={() => setSelectedWorkflowId(null)} 
      />
    </ReactFlowProvider>
  );
};
