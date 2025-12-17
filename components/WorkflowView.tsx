import React, { useCallback, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
import { Play, GitBranch, Database, Bot, MessageSquare, GripHorizontal, Plus, Trash2, X, MoreHorizontal, ArrowLeft, Calendar, User, Search, Filter, Save, Loader2, Square, Settings, ChevronRight, Star, Power, CheckCircle, Edit2, Headphones, Hammer, ListFilter } from 'lucide-react';
import { workflowApi } from '../services/workflowApi';
import knowledgeBaseApi from '../services/knowledgeBaseApi';
import aiToolApi from '../services/aiToolApi';
import { AiWorkflow, LlmModel } from '../types/workflow';
import { KnowledgeBase } from '../types';
import { AiTool } from '../types/aiTool';
import { CreateWorkflowDialog } from './settings/CreateWorkflowDialog';
import { WorkflowTestDialog } from './WorkflowTestDialog';

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
              title="Delete Connection"
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
  const { deleteElements } = useReactFlow();
  const [showMenu, setShowMenu] = useState(false);

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
              className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                deleteElements({ nodes: [{ id: nodeId }] });
              }}
            >
              <Trash2 size={12} />
              <span>Delete Node</span>
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
const StartNode = ({ id, data }: NodeProps) => {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-0 min-w-[200px] group hover:border-blue-300 transition-colors relative">
      <NodeMenu nodeId={id} />
      <div className="bg-blue-50 px-4 py-2 rounded-t-xl border-b border-blue-100 flex items-center gap-2">
        <div className="bg-blue-100 p-1 rounded-lg text-blue-600">
          <Play size={14} />
        </div>
        <span className="font-semibold text-gray-700 text-sm">Start</span>
      </div>
      <div className="p-4">
        <div className="text-xs text-gray-500">Workflow Entry Point</div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-blue-500" />
    </div>
  );
};

const IntentNode = ({ id, data }: NodeProps) => {
  const intents = (data.config as any)?.intents || [];
  const config = data.config as any;
  const modelDisplay = config?.modelDisplayName || config?.model || 'Select Model';

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-0 min-w-[280px] group hover:border-green-300 transition-colors relative">
      <NodeMenu nodeId={id} />
      <div className="bg-green-50 px-4 py-2 rounded-t-xl border-b border-green-100 flex items-center gap-2">
        <div className="bg-green-100 p-1 rounded-lg text-green-600">
          <GitBranch size={14} />
        </div>
        <span className="font-semibold text-gray-700 text-sm">Intent Recognition</span>
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
                    No intents configured. Add in properties.
                  </div>
                )}
            </div>
        </div>
      </div>
      <div className="p-3 bg-gray-50 rounded-b-xl text-[10px] text-gray-400 leading-relaxed border-t border-gray-100">
        Classify user intent to direct the conversation flow.
      </div>
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
    </div>
  );
};

const KnowledgeNode = ({ id, data }: NodeProps) => {
  const config = data.config as any || {};
  const selectedKBs = config.selectedKnowledgeBases || [];
  const kbIds = config.knowledgeBaseIds || (config.knowledgeBaseId ? [config.knowledgeBaseId] : []);
  
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-0 min-w-[240px] group hover:border-orange-300 transition-colors relative">
      <NodeMenu nodeId={id} />
      <div className="bg-orange-50 px-4 py-2 rounded-t-xl border-b border-orange-100 flex items-center gap-2">
        <div className="bg-orange-100 p-1 rounded-lg text-orange-600">
          <Database size={14} />
        </div>
        <span className="font-semibold text-gray-700 text-sm">Knowledge Retrieval</span>
      </div>
      
      <div className="p-3 bg-gray-50 border-b border-gray-100">
        <div className="text-[10px] uppercase font-bold text-gray-400 mb-2">Selected Knowledge Bases</div>
        {selectedKBs.length > 0 ? (
           <div className="space-y-1.5">
             {selectedKBs.slice(0, 3).map((kb: any) => (
               <div key={kb.id} className="flex items-center gap-2 bg-white border border-gray-200 px-2 py-1.5 rounded-lg text-xs text-gray-600 shadow-sm">
                 <Database size={10} className="text-orange-500 flex-shrink-0"/>
                 <span className="truncate font-medium">{kb.name}</span>
               </div>
             ))}
             {selectedKBs.length > 3 && (
               <div className="text-[10px] text-gray-500 pl-1 font-medium">+{selectedKBs.length - 3} more</div>
             )}
           </div>
        ) : kbIds.length > 0 ? (
           <div className="flex items-center gap-2 bg-white border border-gray-200 px-2 py-1.5 rounded-lg text-xs text-gray-600 shadow-sm">
               <Database size={10} className="text-orange-500 flex-shrink-0"/>
               <span className="truncate font-medium">{kbIds.length} Knowledge Base{kbIds.length > 1 ? 's' : ''}</span>
           </div>
        ) : (
           <div className="text-xs text-gray-400 italic bg-white/50 px-2 py-1.5 rounded border border-dashed border-gray-200">
             No knowledge base selected
           </div>
        )}
      </div>

      <div className="p-4">
        <p className="text-xs text-gray-500">{(data as any).label || 'Retrieve relevant context'}</p>
      </div>
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
      <Handle type="source" position={Position.Right} className="!bg-orange-500" />
    </div>
  );
};

const LLMNode = ({ id, data }: NodeProps) => {
  const config = data.config as any;
  const modelDisplay = config?.modelDisplayName || config?.model || 'Select Model';
  
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-0 min-w-[240px] group hover:border-indigo-300 transition-colors relative">
      <NodeMenu nodeId={id} />
      <div className="bg-indigo-50 px-4 py-2 rounded-t-xl border-b border-indigo-100 flex items-center gap-2">
        <div className="bg-indigo-100 p-1 rounded-lg text-indigo-600">
          <Bot size={14} />
        </div>
        <span className="font-semibold text-gray-700 text-sm">LLM Generation</span>
      </div>
      <div className="p-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200 w-fit">
          <Bot size={12} />
          <span>{modelDisplay}</span>
        </div>
      </div>
      <div className="p-4">
        <p className="text-xs text-gray-500">Generate answer based on context</p>
      </div>
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
      <Handle type="source" position={Position.Right} className="!bg-indigo-500" />
    </div>
  );
};

const ReplyNode = ({ id, data }: NodeProps) => {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-0 min-w-[240px] group hover:border-blue-300 transition-colors relative">
      <NodeMenu nodeId={id} />
      <div className="bg-blue-50 px-4 py-2 rounded-t-xl border-b border-blue-100 flex items-center gap-2">
        <div className="bg-blue-100 p-1 rounded-lg text-blue-600">
          <MessageSquare size={14} />
        </div>
        <span className="font-semibold text-gray-700 text-sm">Direct Reply</span>
      </div>
      <div className="p-3 bg-gray-50 border-b border-gray-100">
         <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">Response Source</div>
         <div className="flex items-center gap-2 text-xs text-gray-600 bg-white px-2 py-1 rounded border border-gray-200">
            {(data as any).source || 'LLM Output'}
         </div>
      </div>
      {(data as any).text && (
          <div className="p-4 bg-gray-50/50">
            <p className="text-xs text-gray-500 italic">"{(data as any).text}"</p>
          </div>
      )}
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
    </div>
  );
};

const EndNode = ({ id, data }: NodeProps) => {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-0 min-w-[200px] group hover:border-red-300 transition-colors relative">
      <NodeMenu nodeId={id} />
      <div className="bg-red-50 px-4 py-2 rounded-t-xl border-b border-red-100 flex items-center gap-2">
        <div className="bg-red-100 p-1 rounded-lg text-red-600">
          <Square size={14} />
        </div>
        <span className="font-semibold text-gray-700 text-sm">End</span>
      </div>
      <div className="p-4">
        <div className="text-xs text-gray-500">Workflow Exit Point</div>
      </div>
      <Handle type="target" position={Position.Left} className="!bg-red-500" />
    </div>
  );
};

const TransferNode = ({ id, data }: NodeProps) => {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-0 min-w-[200px] group hover:border-pink-300 transition-colors relative">
      <NodeMenu nodeId={id} />
      <div className="bg-pink-50 px-4 py-2 rounded-t-xl border-b border-pink-100 flex items-center gap-2">
        <div className="bg-pink-100 p-1 rounded-lg text-pink-600">
          <Headphones size={14} />
        </div>
        <span className="font-semibold text-gray-700 text-sm">Transfer to Human</span>
      </div>
      <div className="p-4">
        <div className="text-xs text-gray-500">Transfer conversation to human agent</div>
      </div>
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
    </div>
  );
};

const AgentNode = ({ id, data }: NodeProps) => {
  const config = data.config as any;
  const workflowName = config?.workflowName || 'Select Workflow';

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-0 min-w-[240px] group hover:border-purple-300 transition-colors relative">
      <NodeMenu nodeId={id} />
      <div className="bg-purple-50 px-4 py-2 rounded-t-xl border-b border-purple-100 flex items-center gap-2">
        <div className="bg-purple-100 p-1 rounded-lg text-purple-600">
          <Bot size={14} />
        </div>
        <span className="font-semibold text-gray-700 text-sm">Agent</span>
      </div>
      <div className="p-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200 w-fit">
          <Bot size={12} />
          <span>{workflowName}</span>
        </div>
      </div>
      <div className="p-4">
        <p className="text-xs text-gray-500">Execute another workflow</p>
      </div>
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
      <Handle type="source" position={Position.Right} className="!bg-purple-500" />
    </div>
  );
};

const AgentEndNode = ({ id, data }: NodeProps) => {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-0 min-w-[200px] group hover:border-gray-400 transition-colors relative">
      <NodeMenu nodeId={id} />
      <div className="bg-gray-100 px-4 py-2 rounded-t-xl border-b border-gray-200 flex items-center gap-2">
        <div className="bg-gray-200 p-1 rounded-lg text-gray-600">
          <Square size={14} />
        </div>
        <span className="font-semibold text-gray-700 text-sm">Agent End</span>
      </div>
      <div className="p-4">
        <div className="text-xs text-gray-500">Agent Execution End</div>
      </div>
      <Handle type="target" position={Position.Left} className="!bg-gray-500" />
    </div>
  );
};

const AgentUpdateNode = ({ id, data }: NodeProps) => {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-0 min-w-[200px] group hover:border-yellow-300 transition-colors relative">
      <NodeMenu nodeId={id} />
      <div className="bg-yellow-50 px-4 py-2 rounded-t-xl border-b border-yellow-100 flex items-center gap-2">
        <div className="bg-yellow-100 p-1 rounded-lg text-yellow-600">
          <Edit2 size={14} />
        </div>
        <span className="font-semibold text-gray-700 text-sm">Agent Update</span>
      </div>
      <div className="p-4">
        <div className="text-xs text-gray-500">Update Agent State</div>
      </div>
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
      <Handle type="source" position={Position.Right} className="!bg-yellow-500" />
    </div>
  );
};

const ToolNode = ({ id, data }: NodeProps) => {
  const config = data.config as any;
  const toolName = config?.toolName || 'Select Tool';

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-0 min-w-[240px] group hover:border-orange-300 transition-colors relative">
      <NodeMenu nodeId={id} />
      <div className="bg-orange-50 px-4 py-2 rounded-t-xl border-b border-orange-100 flex items-center gap-2">
        <div className="bg-orange-100 p-1 rounded-lg text-orange-600">
          <Hammer size={14} />
        </div>
        <span className="font-semibold text-gray-700 text-sm">Tool Execution</span>
      </div>
      <div className="p-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200 w-fit">
          <Hammer size={12} />
          <span>{toolName}</span>
        </div>
      </div>
      <div className="flex flex-col">
        <div className="flex justify-between items-center py-2 px-4 border-b border-gray-100 relative hover:bg-gray-50">
           <span className="text-xs font-medium text-gray-600">Executed</span>
           <Handle type="source" position={Position.Right} id="executed" className="!bg-orange-500 !right-[-6px]" style={{top: '50%'}} />
        </div>
        <div className="flex justify-between items-center py-2 px-4 relative hover:bg-gray-50">
           <span className="text-xs font-medium text-gray-600">Not Executed</span>
           <Handle type="source" position={Position.Right} id="not_executed" className="!bg-gray-400 !right-[-6px]" style={{top: '50%'}} />
        </div>
      </div>
      <div className="p-3 bg-gray-50 rounded-b-xl text-[10px] text-gray-400 leading-relaxed border-t border-gray-100">
        Execute tool if matched, else skip.
      </div>
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
    </div>
  );
};

const ParameterExtractionNode = ({ id, data }: NodeProps) => {
  const config = data.config as any;
  const toolName = config?.toolName || 'Select Tool';
  const modelDisplay = config?.modelDisplayName || config?.model || 'Select Model';

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-0 min-w-[280px] group hover:border-violet-300 transition-colors relative">
      <NodeMenu nodeId={id} />
      <div className="bg-violet-50 px-4 py-2 rounded-t-xl border-b border-violet-100 flex items-center gap-2">
        <div className="bg-violet-100 p-1 rounded-lg text-violet-600">
          <ListFilter size={14} />
        </div>
        <span className="font-semibold text-gray-700 text-sm">Param Extraction</span>
      </div>
      <div className="p-3 bg-gray-50 border-b border-gray-100 space-y-2">
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200 w-fit">
          <Hammer size={12} />
          <span>{toolName}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200 w-fit">
          <Bot size={12} />
          <span>{modelDisplay}</span>
        </div>
      </div>
      <div className="flex flex-col">
        <div className="flex justify-between items-center py-2 px-4 border-b border-gray-100 relative hover:bg-gray-50">
           <span className="text-xs font-medium text-gray-600">Success</span>
           <Handle type="source" position={Position.Right} id="success" className="!bg-violet-500 !right-[-6px]" style={{top: '50%'}} />
        </div>
        <div className="flex justify-between items-center py-2 px-4 relative hover:bg-gray-50">
           <span className="text-xs font-medium text-gray-600">Missing Params</span>
           <Handle type="source" position={Position.Right} id="fail" className="!bg-red-400 !right-[-6px]" style={{top: '50%'}} />
        </div>
      </div>
      <div className="p-3 bg-gray-50 rounded-b-xl text-[10px] text-gray-400 leading-relaxed border-t border-gray-100">
        Extract parameters for tool execution.
      </div>
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
    </div>
  );
};

const KnowledgeSearchNode = ({ id, data }: NodeProps) => {
  const config = data.config as any || {};
  const kbName = config.selectedKnowledgeBase?.name || 'No KB selected';
  
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-0 min-w-[240px] group hover:border-cyan-300 transition-colors relative">
      <NodeMenu nodeId={id} />
      <div className="bg-cyan-50 px-4 py-2 rounded-t-xl border-b border-cyan-100 flex items-center gap-2">
        <div className="bg-cyan-100 p-1 rounded-lg text-cyan-600">
          <Search size={14} />
        </div>
        <span className="font-semibold text-gray-700 text-sm">Knowledge Base Search</span>
      </div>
      
      <div className="p-4">
        <div className="text-xs text-gray-500 mb-1">Target Knowledge Base</div>
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg">
           <Database size={14} className="text-cyan-500"/>
           <span className="text-sm font-medium text-gray-700 truncate">{kbName}</span>
        </div>
      </div>
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
      <Handle type="source" position={Position.Right} className="!bg-cyan-500" />
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

const PropertyPanel = ({ node, nodes = [], onChange, onClose, currentWorkflowId }: { node: NodeProps | any, nodes?: NodeProps[] | any[], onChange: (data: any) => void, onClose: () => void, currentWorkflowId?: string }) => {
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
  const textareaRefs = useRef<{ [key: string]: HTMLTextAreaElement | HTMLInputElement | null }>({});
  
  // Test Session State
  const [testMessages, setTestMessages] = useState<{role: string, content: string}[]>([]);
  const [testInput, setTestInput] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  
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
            } else if (n.type === 'kb_search') {
                vars.push({ 
                    id: `${n.id}.result`, 
                    label: `${n.data.label || 'Search'}.result`, 
                    value: `{{${n.data.label || 'Search'}.result}}`,
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
    
    const textarea = textareaRefs.current[activeField];
    const currentValue = textarea?.value || '';
    // Replace the triggering '/' with the variable
    const newValue = currentValue.substring(0, cursorIndex - 1) + variable + currentValue.substring(cursorIndex);
    
    if (activeField === 'systemPrompt') {
        handleConfigChange('systemPrompt', newValue);
    } else if (activeField === 'customPrompt') {
        handleConfigChange('customPrompt', newValue);
    } else if (activeField.startsWith('message-')) {
        const index = parseInt(activeField.split('-')[1]);
        handleUpdateMessage(index, 'content', newValue);
    } else if (activeField.startsWith('param-desc-')) {
        const index = parseInt(activeField.split('param-desc-')[1]);
        const currentParams = [...(node.data.config?.parameters || [])];
        if (currentParams[index]) {
            currentParams[index] = { ...currentParams[index], description: newValue };
            handleConfigChange('parameters', currentParams);
        }
    }
    
    setShowVarMenu(false);
    setFilterText('');
    
    // Focus back and move cursor
    setTimeout(() => {
        if (textarea) {
            textarea.focus();
            const newCursorPos = cursorIndex - 1 + variable.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
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
      } else if (field.startsWith('param-desc-')) {
          const index = parseInt(field.split('param-desc-')[1]);
          const currentParams = [...(node.data.config?.parameters || [])];
          if (currentParams[index]) {
              currentParams[index] = { ...currentParams[index], description: val };
              handleConfigChange('parameters', currentParams);
          }
      }
  };

  useEffect(() => {
    if (node && (node.type === 'intent' || node.type === 'llm' || node.type === 'parameter_extraction')) {
      workflowApi.getAllModels()
        .then(data => {
            const enabledModels = data.filter((m: LlmModel) => m.enabled);
            setLlmModels(enabledModels);
        })
        .catch(err => console.error('Failed to fetch models', err));
    }

    if (node && (node.type === 'llm' || node.type === 'tool' || node.type === 'parameter_extraction')) {
        aiToolApi.getTools()
            .then(data => setTools(data))
            .catch(err => console.error('Failed to fetch tools', err));
    }
    
    if (node && (node.type === 'knowledge' || node.type === 'kb_search')) {
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
            } else if (node.type === 'kb_search') {
               const config = node.data.config || {};
               if (config.knowledgeBaseId && !config.selectedKnowledgeBase) {
                   const kb = data.find(k => k.id === config.knowledgeBaseId);
                   if (kb) {
                       onChange({
                           ...node.data,
                           config: {
                               ...config,
                               selectedKnowledgeBase: { id: kb.id, name: kb.name }
                           }
                       });
                   }
               }
            }
        })
        .catch(err => console.error('Failed to fetch knowledge bases', err));
    }

    if (node && node.type === 'agent') {
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

  const handleSendTestMessage = async () => {
    if (!testInput.trim()) return;
    
    const userMsg = { role: 'user', content: testInput };
    setTestMessages(prev => [...prev, userMsg]);
    setTestInput('');
    setIsTesting(true);
    
    // Simulate AI response with tool usage if applicable
    setTimeout(() => {
        const config = node.data.config || {};
        const selectedTools = tools.filter(t => (config.tools || []).includes(t.id));
        
        let responseContent = "This is a simulated response.";
        const toolCalls: any[] = [];

        // Simple simulation logic
        if (userMsg.content.includes('weather') && selectedTools.some(t => t.name.includes('weather'))) {
            toolCalls.push({
                tool: 'get_weather',
                params: { city: 'Beijing' },
                result: { temp: 25, condition: 'Sunny' }
            });
            responseContent = "The weather in Beijing is sunny with a temperature of 25°C.";
        } else if (userMsg.content.includes('email') && selectedTools.some(t => t.name.includes('email'))) {
             toolCalls.push({
                tool: 'send_email',
                params: { to: 'user@example.com', subject: 'Test' },
                result: { status: 'sent' }
            });
            responseContent = "I've sent the email successfully.";
        }

        const aiMsg = { 
            role: 'assistant', 
            content: responseContent,
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined
        };
        
        setTestMessages(prev => [...prev, aiMsg]);
        setIsTesting(false);
    }, 1500);
  };

  return (
    <div className="absolute top-4 right-4 w-[450px] bg-white rounded-xl shadow-xl border border-gray-200 z-20 flex flex-col max-h-[calc(100vh-32px)] overflow-hidden animate-in slide-in-from-right-5 duration-200">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Settings size={16} className="text-gray-500" />
              <h3 className="font-bold text-gray-800">Properties</h3>
            </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={18} />
        </button>
      </div>
      
      <div className="p-4 overflow-y-auto flex-1 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Node Label</label>
          <input 
            type="text" 
            value={node.data.label || ''} 
            disabled
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
          />
        </div>

        <div className="h-px bg-gray-100 my-2"></div>

        {/* Node specific fields */}
        {node.type === 'intent' && (
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
              <label className="block text-xs font-medium text-gray-500 mb-1">System Prompt</label>
              
              <div className="relative">
                <textarea 
                    ref={el => textareaRefs.current['customPrompt'] = el}
                    value={node.data.config?.customPrompt || ''} 
                    onChange={(e) => handleTextareaInput(e, 'customPrompt')}
                    onKeyDown={handleKeyDown}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
                    placeholder="Enter system prompt for intent classification. Type '/' to insert variable..."
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">History Turns</label>
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
              <p className="text-[10px] text-gray-400 mt-1">Number of historical messages to include (&gt;=0)</p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-medium text-gray-500">Intents</label>
                <button 
                  onClick={handleAddIntent}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  <Plus size={12} /> Add
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
                      placeholder="Intent name"
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
                    No intents yet
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {node.type === 'agent' && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Select Workflow</label>
            <select 
              value={node.data.config?.workflowId || ''}
              onChange={(e) => {
                  const selectedId = e.target.value;
                  const selectedWorkflow = workflows.find(w => w.id === selectedId);
                  onChange({
                      ...node.data,
                      config: {
                          ...node.data.config,
                          workflowId: selectedId,
                          workflowName: selectedWorkflow?.name || ''
                      }
                  });
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" disabled>Select a workflow</option>
              {workflows
                .filter(w => w.id !== currentWorkflowId)
                .map(workflow => (
                <option key={workflow.id} value={workflow.id}>{workflow.name}</option>
              ))}
            </select>
          </div>
        )}

        {node.type === 'tool' && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Select Tool</label>
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
              <option value="" disabled>Select a tool</option>
              {tools.map(tool => (
                <option key={tool.id} value={tool.id}>{tool.displayName}</option>
              ))}
            </select>
            <p className="text-[10px] text-gray-400 mt-2">
                This node will try to match and execute the selected tool.
            </p>
          </div>
        )}

        {node.type === 'parameter_extraction' && (
           <div className="space-y-4">
              {/* Tool Selection */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Bind Tool</label>
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
                  <option value="" disabled>Select a tool to bind</option>
                  {tools.map(tool => (
                    <option key={tool.id} value={tool.id}>{tool.displayName}</option>
                  ))}
                </select>
              </div>

              {/* Model Selection */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Extraction Model</label>
                <select 
                  value={node.data.config?.modelId || ''}
                  onChange={(e) => {
                      handleConfigChange('modelId', e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled>Select a model</option>
                  {llmModels.length > 0 ? (
                      llmModels.map(model => (
                        <option key={model.id} value={model.id}>{model.name} ({model.provider})</option>
                      ))
                    ) : (
                      <option value="" disabled>No models available</option>
                    )}
                </select>
              </div>

              {/* System Prompt */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">System Prompt</label>
                <div className="relative">
                  <textarea 
                      ref={el => textareaRefs.current['systemPrompt'] = el}
                      value={node.data.config?.systemPrompt || ''} 
                      onChange={(e) => handleTextareaInput(e, 'systemPrompt')}
                      onKeyDown={handleKeyDown}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
                      placeholder="Instruction for parameter extraction..."
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
                    Read Conversation History
                </label>
                
                {node.data.config?.useHistory && (
                    <div className="mt-3 pl-6 border-l-2 border-blue-100 animate-in fade-in slide-in-from-top-1 duration-200">
                        <label className="block text-xs font-medium text-gray-500 mb-1">History Message Count</label>
                        <input 
                            type="number"
                            min="1"
                            max="50"
                            value={node.data.config?.readCount || 10}
                            onChange={(e) => handleConfigChange('readCount', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            placeholder="Number of messages to read"
                        />
                    </div>
                )}
              </div>
              
              {/* Conversation History Config */}
              <div>
                 <label className="block text-xs font-medium text-gray-500 mb-2">Conversation History</label>
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
                                        Switch Role
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
                                    placeholder={`Enter ${msg.role} message. Type '/' to insert variable...`}
                                />
                            </div>
                        </div>
                    ))}
                 </div>
                 <button 
                    onClick={handleAddMessage}
                    className="w-full mt-2 py-2 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center justify-center gap-1"
                 >
                    <Plus size={12} /> Add Message
                 </button>
              </div>

              {/* Parameter Definition */}
              <div>
                 <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-medium text-gray-500">Extraction Parameters</label>
                    <button 
                        onClick={() => {
                            const currentParams = node.data.config?.parameters || [];
                            handleConfigChange('parameters', [...currentParams, { name: '', description: '', required: true, type: 'string' }]);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                        <Plus size={12} /> Add Parameter
                    </button>
                 </div>
                 
                 <div className="space-y-3">
                    {(node.data.config?.parameters || []).map((param: any, index: number) => (
                        <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 space-y-2 relative group">
                            <button 
                                onClick={() => {
                                    const newParams = [...(node.data.config?.parameters || [])];
                                    newParams.splice(index, 1);
                                    handleConfigChange('parameters', newParams);
                                }}
                                className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X size={14} />
                            </button>
                            
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10px] text-gray-400 mb-1">Name</label>
                                    <input 
                                        type="text"
                                        value={param.name}
                                        onChange={(e) => {
                                            const newParams = [...(node.data.config?.parameters || [])];
                                            newParams[index] = { ...newParams[index], name: e.target.value };
                                            handleConfigChange('parameters', newParams);
                                        }}
                                        className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-500"
                                        placeholder="param_name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-gray-400 mb-1">Type</label>
                                    <select
                                        value={param.type}
                                        onChange={(e) => {
                                            const newParams = [...(node.data.config?.parameters || [])];
                                            newParams[index] = { ...newParams[index], type: e.target.value };
                                            handleConfigChange('parameters', newParams);
                                        }}
                                        className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="string">String</option>
                                        <option value="number">Number</option>
                                        <option value="boolean">Boolean</option>
                                        <option value="array">Array</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-[10px] text-gray-400 mb-1">Description</label>
                                <textarea 
                                    ref={el => textareaRefs.current[`param-desc-${index}`] = el}
                                    value={param.description}
                                    onChange={(e) => handleTextareaInput(e, `param-desc-${index}`)}
                                    onKeyDown={handleKeyDown}
                                    rows={2}
                                    className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-500 resize-none"
                                    placeholder="Description for extraction. Type '/' to insert variable..."
                                />
                            </div>
                            
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox"
                                    checked={param.required}
                                    onChange={(e) => {
                                        const newParams = [...(node.data.config?.parameters || [])];
                                        newParams[index] = { ...newParams[index], required: e.target.checked };
                                        handleConfigChange('parameters', newParams);
                                    }}
                                    className="rounded text-blue-600 w-3 h-3"
                                />
                                <span className="text-[10px] text-gray-500">Required</span>
                            </label>
                        </div>
                    ))}
                    {(node.data.config?.parameters || []).length === 0 && (
                        <div className="text-center py-3 bg-gray-50 rounded-lg border border-dashed border-gray-200 text-xs text-gray-400">
                            No parameters defined
                        </div>
                    )}
                 </div>
              </div>
           </div>
        )}

        {node.type === 'llm' && (
          <>
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
              <label className="block text-xs font-medium text-gray-500 mb-1">System Prompt</label>
              
              <div className="relative">
                <textarea 
                    ref={el => textareaRefs.current['systemPrompt'] = el}
                    value={node.data.config?.systemPrompt || ''} 
                    onChange={(e) => handleTextareaInput(e, 'systemPrompt')}
                    onKeyDown={handleKeyDown}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
                    placeholder="Enter system prompt. Type '/' to insert variable..."
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
                    Read Conversation History
                </label>
                
                {node.data.config?.useHistory && (
                    <div className="mt-3 pl-6 border-l-2 border-blue-100 animate-in fade-in slide-in-from-top-1 duration-200">
                        <label className="block text-xs font-medium text-gray-500 mb-1">History Message Count</label>
                        <input 
                            type="number"
                            min="1"
                            max="50"
                            value={node.data.config?.readCount || 10}
                            onChange={(e) => handleConfigChange('readCount', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            placeholder="Number of messages to read"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">Include recent chat history</p>
                    </div>
                )}
            </div>

            <div>
                 <label className="block text-xs font-medium text-gray-500 mb-2">Conversation History</label>
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
                                        Switch Role
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
                                    placeholder={`Enter ${msg.role} message. Type '/' to insert variable...`}
                                />
                            </div>
                        </div>
                    ))}
                 </div>
                 <button 
                    onClick={handleAddMessage}
                    className="w-full mt-2 py-2 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center justify-center gap-1"
                 >
                    <Plus size={12} /> Add Message
                 </button>
            </div>

            {/* Tools Section */}
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

            {/* Test Session Section */}
            <div className="mt-4 border-t border-gray-100 pt-4">
                <label className="block text-xs font-medium text-gray-500 mb-2">Test Session</label>
                <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden flex flex-col h-64">
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                        {testMessages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs gap-2 opacity-60">
                                <Bot size={24} />
                                <span>Start a conversation to test</span>
                            </div>
                        ) : (
                            testMessages.map((msg, idx) => (
                                <div key={idx} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[85%] px-3 py-2 rounded-lg text-xs ${
                                        msg.role === 'user' 
                                            ? 'bg-blue-600 text-white rounded-br-none' 
                                            : 'bg-white border border-gray-200 text-gray-700 rounded-bl-none shadow-sm'
                                    }`}>
                                        {msg.content}
                                    </div>
                                    {/* Tool Calls Display */}
                                    {(msg as any).toolCalls && (msg as any).toolCalls.map((tc: any, i: number) => (
                                        <div key={i} className="max-w-[85%] bg-gray-100 border border-gray-200 rounded-lg p-2 text-[10px] font-mono text-gray-600 w-full">
                                            <div className="flex items-center gap-1 text-blue-600 font-bold mb-1">
                                                <Settings size={10} />
                                                Tool Call: {tc.tool}
                                            </div>
                                            <div className="mb-1">Args: {JSON.stringify(tc.params)}</div>
                                            <div className="text-green-600">Result: {JSON.stringify(tc.result)}</div>
                                        </div>
                                    ))}
                                </div>
                            ))
                        )}
                        {isTesting && (
                            <div className="flex items-center gap-2 text-gray-400 text-xs ml-1">
                                <Loader2 size={12} className="animate-spin" />
                                <span>AI is thinking...</span>
                            </div>
                        )}
                    </div>
                    <div className="p-2 bg-white border-t border-gray-200 flex gap-2">
                        <input 
                            type="text" 
                            value={testInput}
                            onChange={(e) => setTestInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendTestMessage()}
                            placeholder="Type a message..."
                            className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button 
                            onClick={handleSendTestMessage}
                            disabled={isTesting || !testInput.trim()}
                            className="bg-blue-600 text-white p-1.5 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
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
          </>
        )}

        {node.type === 'reply' && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Reply Text</label>
            <textarea 
              value={node.data.text || ''} 
              onChange={(e) => handleChange('text', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Enter reply text..."
            />
          </div>
        )}
        
        {node.type === 'kb_search' && (
           <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Select Knowledge Base</label>
            <select 
                value={node.data.config?.knowledgeBaseId || ''} 
                onChange={(e) => {
                    const kbId = e.target.value;
                    const kb = knowledgeBases.find(k => k.id === kbId);
                    const config = node.data.config || {};
                    onChange({
                        ...node.data,
                        config: {
                            ...config,
                            knowledgeBaseId: kbId,
                            selectedKnowledgeBase: kb ? { id: kb.id, name: kb.name } : undefined
                        }
                    });
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            >
                <option value="">Select a knowledge base...</option>
                {knowledgeBases.map(kb => (
                    <option key={kb.id} value={kb.id}>{kb.name}</option>
                ))}
            </select>

            <label className="block text-xs font-medium text-gray-500 mb-1">Query Source</label>
            <select 
                value={node.data.config?.querySource || 'userMessage'}
                onChange={(e) => handleConfigChange('querySource', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                <option value="userMessage">User Message</option>
                <option value="lastOutput">Last Node Output</option>
            </select>
           </div>
        )}
        
        {node.type === 'knowledge' && (
           <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Knowledge Bases</label>
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
                    <p className="text-xs text-gray-500">No knowledge bases available</p>
                </div>
              )}
            </div>

            <label className="block text-xs font-medium text-gray-500 mb-1">Query Source</label>
            <select 
                value={node.data.config?.querySource || 'userMessage'}
                onChange={(e) => handleConfigChange('querySource', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                <option value="userMessage">User Message</option>
                <option value="lastOutput">Last Node Output</option>
            </select>
          </div>
        )}
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
                                {filterText || 'Search variable...'}
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
                                return <div className="p-4 text-center text-xs text-gray-400">No variables found</div>;
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

const nodeTypes = {
  start: StartNode,
  end: EndNode,
  intent: IntentNode,
  knowledge: KnowledgeNode,
  kb_search: KnowledgeSearchNode,
  llm: LLMNode,
  reply: ReplyNode,
  human_transfer: TransferNode,
  agent: AgentNode,
  agent_end: AgentEndNode,
  agent_update: AgentUpdateNode,
  tool: ToolNode,
  parameter_extraction: ParameterExtractionNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

// Sidebar Component for Draggable Nodes
const Sidebar = () => {
  const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/reactflow/label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="absolute top-20 left-4 w-60 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-20 flex flex-col gap-4">
      <div className="pb-2 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-800">Components</h3>
        <p className="text-xs text-gray-500">Drag to add to workflow</p>
      </div>
      
      <div className="space-y-3">
        <div 
          className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg cursor-grab active:cursor-grabbing hover:shadow-md transition-all"
          onDragStart={(event) => onDragStart(event, 'start', 'Start')}
          draggable
        >
          <div className="bg-blue-100 p-1.5 rounded text-blue-600"><Play size={16}/></div>
          <span className="text-sm font-medium text-gray-700">Start</span>
        </div>

        <div 
          className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-lg cursor-grab active:cursor-grabbing hover:shadow-md transition-all"
          onDragStart={(event) => onDragStart(event, 'end', 'End')}
          draggable
        >
          <div className="bg-red-100 p-1.5 rounded text-red-600"><Square size={16}/></div>
          <span className="text-sm font-medium text-gray-700">End</span>
        </div>

        <div 
          className="flex items-center gap-3 p-3 bg-green-50 border border-green-100 rounded-lg cursor-grab active:cursor-grabbing hover:shadow-md transition-all"
          onDragStart={(event) => {
            onDragStart(event, 'intent', 'Intent Recognition');
            // Add default empty intents for new nodes
            event.dataTransfer.setData('application/reactflow/config', JSON.stringify({
              intents: []
            }));
          }}
          draggable
        >
          <div className="bg-green-100 p-1.5 rounded text-green-600"><GitBranch size={16}/></div>
          <span className="text-sm font-medium text-gray-700">Intent Recognition</span>
        </div>

        <div 
          className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-100 rounded-lg cursor-grab active:cursor-grabbing hover:shadow-md transition-all"
          onDragStart={(event) => onDragStart(event, 'knowledge', 'Knowledge Retrieval')}
          draggable
        >
          <div className="bg-orange-100 p-1.5 rounded text-orange-600"><Database size={16}/></div>
          <span className="text-sm font-medium text-gray-700">Knowledge Retrieval</span>
        </div>

        <div 
          className="flex items-center gap-3 p-3 bg-cyan-50 border border-cyan-100 rounded-lg cursor-grab active:cursor-grabbing hover:shadow-md transition-all"
          onDragStart={(event) => onDragStart(event, 'kb_search', 'Knowledge Base Search')}
          draggable
        >
          <div className="bg-cyan-100 p-1.5 rounded text-cyan-600"><Search size={16}/></div>
          <span className="text-sm font-medium text-gray-700">Knowledge Base Search</span>
        </div>

        <div 
          className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-lg cursor-grab active:cursor-grabbing hover:shadow-md transition-all"
          onDragStart={(event) => onDragStart(event, 'llm', 'LLM Generation')}
          draggable
        >
          <div className="bg-indigo-100 p-1.5 rounded text-indigo-600"><Bot size={16}/></div>
          <span className="text-sm font-medium text-gray-700">LLM Generation</span>
        </div>

        <div 
          className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg cursor-grab active:cursor-grabbing hover:shadow-md transition-all"
          onDragStart={(event) => onDragStart(event, 'reply', 'Direct Reply')}
          draggable
        >
          <div className="bg-blue-100 p-1.5 rounded text-blue-600"><MessageSquare size={16}/></div>
          <span className="text-sm font-medium text-gray-700">Direct Reply</span>
        </div>

        <div 
          className="flex items-center gap-3 p-3 bg-pink-50 border border-pink-100 rounded-lg cursor-grab active:cursor-grabbing hover:shadow-md transition-all"
          onDragStart={(event) => onDragStart(event, 'human_transfer', 'Transfer to Human')}
          draggable
        >
          <div className="bg-pink-100 p-1.5 rounded text-pink-600"><Headphones size={16}/></div>
          <span className="text-sm font-medium text-gray-700">Transfer to Human</span>
        </div>

        <div 
          className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-100 rounded-lg cursor-grab active:cursor-grabbing hover:shadow-md transition-all"
          onDragStart={(event) => onDragStart(event, 'agent', 'Agent')}
          draggable
        >
          <div className="bg-purple-100 p-1.5 rounded text-purple-600"><Bot size={16}/></div>
          <span className="text-sm font-medium text-gray-700">Agent</span>
        </div>

        <div 
          className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-lg cursor-grab active:cursor-grabbing hover:shadow-md transition-all"
          onDragStart={(event) => onDragStart(event, 'agent_end', 'Agent End')}
          draggable
        >
          <div className="bg-gray-200 p-1.5 rounded text-gray-600"><Square size={16}/></div>
          <span className="text-sm font-medium text-gray-700">Agent End</span>
        </div>

        <div 
          className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-100 rounded-lg cursor-grab active:cursor-grabbing hover:shadow-md transition-all"
          onDragStart={(event) => onDragStart(event, 'agent_update', 'Agent Update')}
          draggable
        >
          <div className="bg-yellow-100 p-1.5 rounded text-yellow-600"><Edit2 size={16}/></div>
          <span className="text-sm font-medium text-gray-700">Agent Update</span>
        </div>

        <div 
          className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-100 rounded-lg cursor-grab active:cursor-grabbing hover:shadow-md transition-all"
          onDragStart={(event) => onDragStart(event, 'tool', 'Tool Execution')}
          draggable
        >
          <div className="bg-orange-100 p-1.5 rounded text-orange-600"><Hammer size={16}/></div>
          <span className="text-sm font-medium text-gray-700">Tool Execution</span>
        </div>

        <div 
          className="flex items-center gap-3 p-3 bg-violet-50 border border-violet-100 rounded-lg cursor-grab active:cursor-grabbing hover:shadow-md transition-all"
          onDragStart={(event) => onDragStart(event, 'parameter_extraction', 'Param Extraction')}
          draggable
        >
          <div className="bg-violet-100 p-1.5 rounded text-violet-600"><ListFilter size={16}/></div>
          <span className="text-sm font-medium text-gray-700">Param Extraction</span>
        </div>
      </div>
    </div>
  );
};

// Internal component to access React Flow instance
const WorkflowEditor = ({ onBack, workflowId }: { onBack: () => void; workflowId: string }) => {
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
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

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

  const handleSaveSettings = async (name: string, description: string, categoryIds: string[]) => {
      try {
          await workflowApi.updateWorkflow(workflowId, {
              name,
              description,
              nodesJson: JSON.stringify(getNodes()),
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
      const currentNodes = getNodes();
      const currentEdges = getEdges();
      
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
        <div className="absolute top-4 left-[280px] z-10 bg-white/80 backdrop-blur p-2 rounded-lg border border-gray-200 shadow-sm flex items-center gap-3 max-w-[600px]">
            <button 
              onClick={onBack}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex flex-col gap-1">
              <input 
                type="text" 
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="font-bold text-gray-800 leading-tight bg-transparent border-none focus:ring-0 p-0 text-base"
                placeholder="Workflow Name"
              />
              <input 
                type="text" 
                value={workflowDescription}
                onChange={(e) => setWorkflowDescription(e.target.value)}
                className="text-xs text-gray-500 bg-transparent border-none focus:ring-0 p-0 w-64"
                placeholder="Add description..."
              />
            </div>
            <div className="h-6 w-px bg-gray-200 mx-2"></div>
            <button 
              onClick={() => setShowTestDialog(true)}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-800 transition-colors"
              title="Test Workflow"
            >
              <Play size={20} />
            </button>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-800 transition-colors"
              title="Workflow Settings"
            >
              <Settings size={20} />
            </button>
            <button 
              onClick={onSave}
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>Save</span>
            </button>
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
        />
      </div>
    </div>
  );
};

const WorkflowList = ({ onSelect }: { onSelect: (id: string) => void }) => {
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

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this workflow?')) {
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
            <h1 className="text-2xl font-bold text-gray-800">Workflow Orchestration</h1>
            <p className="text-gray-500 mt-1">Manage and design your AI agent workflows</p>
          </div>
          <button 
            onClick={handleCreate}
            disabled={creating}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
            <span>Create Workflow</span>
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8 p-4 flex gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                    type="text" 
                    placeholder="Search workflows..." 
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>
            <button className="px-4 py-2 border border-gray-200 rounded-lg flex items-center gap-2 text-gray-600 hover:bg-gray-50">
                <Filter size={20} />
                <span>Filter</span>
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
                    title="Set as Default"
                  >
                    <Star size={16} fill={workflow.isDefault ? "currentColor" : "none"} />
                  </button>
                  <button 
                    className={`p-1.5 rounded transition-colors ${workflow.enabled ? 'text-green-500 bg-green-50' : 'text-gray-400 hover:text-green-500 hover:bg-green-50'}`}
                    onClick={(e) => handleToggleEnabled(e, workflow.id, !workflow.enabled)}
                    title={workflow.enabled ? "Disable" : "Enable"}
                  >
                    <Power size={16} />
                  </button>
                  <button 
                    className="text-gray-400 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded transition-colors"
                    onClick={(e) => handleEdit(e, workflow)}
                    title="Edit Details"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    className="text-gray-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded transition-colors"
                    onClick={(e) => handleDelete(e, workflow.id)}
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors">
                {workflow.name}
              </h3>
              <p className="text-sm text-gray-500 mb-4 line-clamp-2 h-10">
                {workflow.description || 'No description provided'}
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
                  <span>{workflow.nodesJson ? JSON.parse(workflow.nodesJson).length : 0} nodes</span>
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
            <span className="font-medium">Create New Workflow</span>
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
