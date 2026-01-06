import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Trash2, Play, Bot, User, AlertCircle, Clock, CheckCircle2, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react';
import workflowTestService from '../services/workflowTestService';
import { TestMessage, WorkflowTestSessionDto, NodeDetail } from '../types/workflowTest';

import { Node } from '@xyflow/react';

const ExecutionPathItem = ({ node, nodes }: { node: NodeDetail, nodes: Node[] }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    return (
        <div className="border-b border-gray-50 last:border-0">
            <div 
                className="px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer group"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    <div className="text-gray-400 group-hover:text-gray-600 transition-colors">
                        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </div>
                    <div className={`w-1.5 h-1.5 rounded-full ${node.success ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-xs font-medium text-gray-700">{node.nodeType}</span>
                    <span className="text-[10px] text-gray-400 font-mono">
                        ({nodes.find(n => n.id === node.nodeId)?.data?.label as string || node.nodeId})
                    </span>
                </div>
                <span className="text-[10px] text-gray-400">{node.durationMs}ms</span>
            </div>
            
            {isExpanded && (
                <div className="bg-gray-50 px-3 py-2 text-xs font-mono space-y-2 border-t border-gray-100">
                    {node.input && (
                        <div>
                            <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Input</div>
                            <div className="bg-white p-2 rounded border border-gray-200 overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar">
                                {typeof node.input === 'string' ? node.input : JSON.stringify(node.input, null, 2)}
                            </div>
                        </div>
                    )}
                    {node.output && (
                        <div>
                            <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Output</div>
                            <div className="bg-white p-2 rounded border border-gray-200 overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar">
                                {typeof node.output === 'string' ? node.output : JSON.stringify(node.output, null, 2)}
                            </div>
                        </div>
                    )}
                    {!node.input && !node.output && (
                        <div className="text-gray-400 italic text-[10px]">No detailed data available</div>
                    )}
                </div>
            )}
        </div>
    );
};

interface WorkflowTestDialogProps {
  isOpen: boolean;
  workflowId: string;
  workflowName?: string;
  nodes?: Node[];
  onClose: () => void;
}

export const WorkflowTestDialog: React.FC<WorkflowTestDialogProps> = ({ 
  isOpen,
  workflowId, 
  workflowName,
  nodes = [],
  onClose 
}) => {
  const [testSessionId, setTestSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize session
  useEffect(() => {
    if (!isOpen) return;

    const initSession = async () => {
      try {
        setLoading(true);
        const session = await workflowTestService.createSession(workflowId);
        setTestSessionId(session.testSessionId);
        setMessages(session.messages);
      } catch (err: any) {
        setError(err.message || 'Failed to initialize test session');
      } finally {
        setLoading(false);
      }
    };
    initSession();
  }, [isOpen, workflowId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const handleSendMessage = async () => {
    if (!input.trim() || !testSessionId || loading) return;

    const userMsg = input;
    setInput('');
    setLoading(true);

    try {
      // Optimistic update
      const tempMsg: TestMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: userMsg,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, tempMsg]);

      const updatedSession = await workflowTestService.sendMessage(testSessionId, userMsg);
      setMessages(updatedSession.messages);
    } catch (err: any) {
      console.error('Send message failed', err);
      // Remove optimistic message or show error
      setError('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!testSessionId) return;
    try {
      const updatedSession = await workflowTestService.clearHistory(testSessionId);
      setMessages(updatedSession.messages);
    } catch (err) {
      console.error('Failed to clear history', err);
    }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <Bot size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">Workflow Test</h3>
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                Running: {workflowName}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleClearHistory}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Clear History"
            >
              <RotateCcw size={18} />
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
          
          {messages.length === 0 && !loading && !error && (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                <Play size={32} className="text-gray-300 ml-1" />
              </div>
              <p className="text-sm">Send a message to start testing the workflow</p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              
              <div className={`flex flex-col gap-1 max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                }`}>
                  {msg.content}
                </div>
                
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[10px] text-gray-400">{formatTime(msg.timestamp)}</span>
                  {msg.meta && (
                    <>
                      <span className="text-[10px] text-gray-300">•</span>
                      <span className={`text-[10px] flex items-center gap-1 ${msg.meta.success ? 'text-green-600' : 'text-red-500'}`}>
                        {msg.meta.success ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                        {msg.meta.durationMs}ms
                      </span>
                    </>
                  )}
                </div>

                {/* Node Details (Assistant Only) */}
                {msg.meta?.nodeDetails && msg.meta.nodeDetails.length > 0 && (
                  <div className="mt-2 w-full bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Execution Path
                    </div>
                    <div className="divide-y divide-gray-50">
                      {msg.meta.nodeDetails.map((node, idx) => (
                        <ExecutionPathItem key={idx} node={node} nodes={nodes} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                <Bot size={16} />
              </div>
              <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-100">
          <div className="flex gap-2 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type a message to test... (Shift+Enter for new line)"
              disabled={loading || !testSessionId}
              rows={1}
              className="flex-1 bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-full p-3 outline-none transition-all focus:bg-white focus:shadow-sm disabled:opacity-60 resize-none min-h-[46px] max-h-[120px]"
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || loading || !testSessionId}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm"
            >
              <Send size={18} />
            </button>
          </div>
          <div className="text-[10px] text-gray-400 text-center mt-2">
            Test sessions expire after 30 minutes of inactivity
          </div>
        </div>
      </div>
    </div>
  );
};
