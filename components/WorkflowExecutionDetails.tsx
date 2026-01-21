import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Activity, Clock, CheckCircle, XCircle, Terminal, PlayCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface NodeExecutionDetail {
  nodeId: string;
  nodeType: string;
  input: any;
  output: any;
  durationMs: number;
  success: boolean;
  errorMessage?: string;
  toolExecutions?: ToolExecutionStep[];
}

interface ToolExecutionStep {
  toolName: string;
  args: any;
  result: any;
  durationMs: number;
  success: boolean;
  error?: string;
}

interface WorkflowExecutionInfo {
  executionId: string;
  status: string;
  nodeDetails: NodeExecutionDetail[];
  toolExecutionChain: ToolExecutionStep[];
  errorMessage?: string;
  durationMs: number;
  workflowId?: string;
  workflowName?: string;
}

interface WorkflowExecutionDetailsProps {
  workflowInfo: WorkflowExecutionInfo;
}

export const WorkflowExecutionDetails: React.FC<WorkflowExecutionDetailsProps> = ({ workflowInfo }) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  if (!workflowInfo) return null;

  const toggleNode = (index: number) => {
    setExpandedNodes(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const isSuccess = workflowInfo.status === 'SUCCESS';
  const statusColor = isSuccess ? 'text-green-600' : 'text-red-600';
  const statusBg = isSuccess ? 'bg-green-50' : 'bg-red-50';
  const statusBorder = isSuccess ? 'border-green-200' : 'border-red-200';

  return (
    <div className={`mt-2 rounded-lg border ${statusBorder} ${statusBg} text-base overflow-hidden`}>
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-opacity-80 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Activity size={16} className={statusColor} />
          <span className={`font-semibold text-sm ${statusColor}`}>
            {t('workflow_execution.workflow_label')} {workflowInfo.workflowName || t('workflow_execution.unknown')}
          </span>
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Clock size={12} /> {workflowInfo.durationMs}ms
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {workflowInfo.status}
          </span>
          {isExpanded ? <ChevronDown size={16} className="text-gray-500" /> : <ChevronRight size={16} className="text-gray-500" />}
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 border-t border-gray-200 bg-white space-y-4">
          {workflowInfo.errorMessage && (
            <div className="p-3 bg-red-50 text-red-700 rounded text-sm border border-red-100 mb-2 break-words">
              <strong>Error:</strong> {workflowInfo.errorMessage}
            </div>
          )}

          {workflowInfo.nodeDetails && workflowInfo.nodeDetails.length > 0 && (
             <div className="space-y-3">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <PlayCircle size={14} /> Execution Path
                </div>
                <div className="space-y-3">
                  {workflowInfo.nodeDetails.map((node, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                       <div 
                         className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
                         onClick={() => toggleNode(idx)}
                       >
                          <div className="flex items-center gap-2">
                             {node.success ? <CheckCircle size={14} className="text-green-500" /> : <XCircle size={14} className="text-red-500" />}
                             <span className="font-mono text-sm font-bold text-gray-700">{node.nodeId}</span>
                             <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-xs uppercase">{node.nodeType}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">{node.durationMs}ms</span>
                            {expandedNodes[idx] ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                          </div>
                       </div>
                       
                       {expandedNodes[idx] && (
                         <div className="p-3 border-t border-gray-200 bg-white space-y-3">
                            {node.input && (
                               <div>
                                 <div className="text-xs text-gray-500 uppercase font-bold mb-1">Input</div>
                                 <pre className="bg-gray-50 p-2 rounded text-xs font-mono text-gray-600 overflow-x-auto border border-gray-100">
                                   {typeof node.input === 'string' ? node.input : JSON.stringify(node.input, null, 2)}
                                 </pre>
                               </div>
                            )}
                            {node.output && (
                               <div>
                                 <div className="text-xs text-gray-500 uppercase font-bold mb-1">Output</div>
                                 <pre className="bg-gray-50 p-2 rounded text-xs font-mono text-gray-600 overflow-x-auto border border-gray-100">
                                   {typeof node.output === 'string' ? node.output : JSON.stringify(node.output, null, 2)}
                                 </pre>
                               </div>
                            )}

                            {node.toolExecutions && node.toolExecutions.length > 0 && (
                               <div className="mt-3 pt-3 border-t border-gray-100">
                                  <div className="text-xs text-gray-500 uppercase font-bold mb-2 flex items-center gap-1">
                                     <Terminal size={12} /> {t('workflow_execution.tool_executions')}
                                  </div>
                                  <div className="space-y-3 pl-3 border-l-2 border-blue-100">
                                     {node.toolExecutions.map((tool, tIdx) => (
                                       <div key={tIdx} className="text-sm">
                                          <div className="flex items-center gap-2 mb-1.5">
                                            {tool.success ? <CheckCircle size={12} className="text-green-500" /> : <XCircle size={12} className="text-red-500" />}
                                            <span className="font-mono font-semibold text-blue-600">{tool.toolName}</span>
                                            <span className="text-gray-400 text-xs">{tool.durationMs}ms</span>
                                          </div>
                                          <div className="pl-5 space-y-2">
                                            <div className="bg-gray-50 p-2 rounded border border-gray-100 font-mono text-xs text-gray-600 break-all">
                                              <span className="text-gray-400 select-none">{t('workflow_execution.args')}</span>
                                              {typeof tool.args === 'string' ? tool.args : JSON.stringify(tool.args)}
                                            </div>
                                            {tool.result && (
                                              <div className="bg-blue-50 p-2 rounded border border-blue-100 font-mono text-xs text-gray-600 break-all max-h-40 overflow-y-auto">
                                                <span className="text-blue-400 select-none">{t('workflow_execution.result')}</span>
                                                {typeof tool.result === 'string' ? tool.result : JSON.stringify(tool.result)}
                                              </div>
                                            )}
                                            {tool.error && (
                                              <div className="bg-red-50 p-2 rounded border border-red-100 font-mono text-xs text-red-600 break-all">
                                                 <span className="text-red-400 select-none">{t('workflow_execution.err')}</span>
                                                 {tool.error}
                                              </div>
                                            )}
                                          </div>
                                       </div>
                                     ))}
                                  </div>
                               </div>
                            )}

                            {node.errorMessage && (
                               <div className="text-red-600 text-sm bg-red-50 p-2 rounded border border-red-100">
                                 <strong>{t('workflow_execution.error_label')}</strong> {node.errorMessage}
                               </div>
                            )}
                         </div>
                       )}
                    </div>
                  ))}
                </div>
             </div>
          )}
        </div>
      )}
    </div>
  );
};
