import React, { useState } from 'react';
import { QuickReply, KnowledgeEntry } from '../types';
import { Settings, Shield, Database, Users, Bot, Wrench, Globe, MessageSquare } from 'lucide-react';
import { RoleView } from './RoleView';
import { CategoryView } from './CategoryView';
import { LlmModelView } from './LlmModelView';
import { KnowledgeBaseView } from './knowledge/KnowledgeBaseView';
import { AiToolsSettings } from './settings/AiToolsSettings';
import { PlatformView } from './settings/PlatformView';
import { OfficialChannelConfigView } from './settings/OfficialChannelConfig';

interface SettingsViewProps {
  systemQuickReplies: QuickReply[];
  knowledgeBase: KnowledgeEntry[]; // Deprecated, but kept for compatibility with parent
  onAddSystemReply: (label: string, text: string, category: string) => void;
  onDeleteSystemReply: (id: string) => void;
  onAddKnowledge: (title: string, content: string) => void; // Deprecated
  onDeleteKnowledge: (id: string) => void; // Deprecated
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  systemQuickReplies,
  onAddSystemReply,
  onDeleteSystemReply,
}) => {
  const [settingsTab, setSettingsTab] = useState<'QUICK_REPLIES' | 'KNOWLEDGE_BASE' | 'ROLES' | 'CATEGORIES' | 'LLM_MODELS' | 'AI_TOOLS' | 'EXTERNAL_PLATFORMS' | 'OFFICIAL_CHANNELS'>('QUICK_REPLIES');
  
  // Form states
  const [newSysReplyLabel, setNewSysReplyLabel] = useState('');
  const [newSysReplyText, setNewSysReplyText] = useState('');
  const [newSysReplyCategory, setNewSysReplyCategory] = useState('General');

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(newSysReplyLabel && newSysReplyText) {
      onAddSystemReply(newSysReplyLabel, newSysReplyText, newSysReplyCategory);
      setNewSysReplyLabel('');
      setNewSysReplyText('');
    }
  };

  return (
    <div className="flex h-full w-full bg-gray-50 overflow-hidden animate-in fade-in duration-300">
        {/* Settings Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
          <div className="p-6 border-b border-gray-100">
             <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
               <Settings className="text-gray-600" /> Settings
             </h2>
          </div>
          <nav className="flex-1 p-4 space-y-1">
             <button onClick={() => setSettingsTab('QUICK_REPLIES')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${settingsTab === 'QUICK_REPLIES' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}><Shield size={18} />Quick Replies</button>
             <button onClick={() => setSettingsTab('KNOWLEDGE_BASE')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${settingsTab === 'KNOWLEDGE_BASE' ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-50'}`}><Database size={18} />Knowledge Base</button>
             <button onClick={() => setSettingsTab('ROLES')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${settingsTab === 'ROLES' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}><Users size={18} />Roles</button>
             <button onClick={() => setSettingsTab('CATEGORIES')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${settingsTab === 'CATEGORIES' ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50'}`}><Users size={18} />Categories</button>
             <button onClick={() => setSettingsTab('LLM_MODELS')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${settingsTab === 'LLM_MODELS' ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-50'}`}><Bot size={18} />LLM Models</button>
             <button onClick={() => setSettingsTab('AI_TOOLS')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${settingsTab === 'AI_TOOLS' ? 'bg-cyan-50 text-cyan-700' : 'text-gray-600 hover:bg-gray-50'}`}><Wrench size={18} />AI Tools</button>
             <button onClick={() => setSettingsTab('EXTERNAL_PLATFORMS')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${settingsTab === 'EXTERNAL_PLATFORMS' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}><Globe size={18} />External Platforms</button>
             <button onClick={() => setSettingsTab('OFFICIAL_CHANNELS')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${settingsTab === 'OFFICIAL_CHANNELS' ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50'}`}><MessageSquare size={18} />Official Channels</button>
          </nav>
          <div className="p-4 border-t border-gray-100 text-xs text-gray-400 text-center">Version 1.3.0</div>
        </div>
        {/* Settings Content */}
        <div className="flex-1 overflow-y-auto p-8">
           <div className="max-w-[1200px] mx-auto h-full">
              {settingsTab === 'QUICK_REPLIES' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                   <div className="flex items-center gap-2 mb-4"><Shield size={20} className="text-blue-600" /><h3 className="text-lg font-semibold">Unified Quick Replies</h3></div>
                   <p className="text-sm text-gray-500 mb-6">Define standard responses available to all support agents.</p>
                   <form onSubmit={handleReplySubmit} className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                      <div className="grid grid-cols-2 gap-4 mb-3">
                         <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Label</label><input type="text" value={newSysReplyLabel} onChange={e => setNewSysReplyLabel(e.target.value)} placeholder="e.g. Refund Policy" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"/></div>
                         <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label><select value={newSysReplyCategory} onChange={e => setNewSysReplyCategory(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white"><option value="General">General</option><option value="Sales">Sales</option><option value="Technical">Technical</option><option value="Billing">Billing</option></select></div>
                      </div>
                      <div className="mb-3"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Response Content</label><textarea value={newSysReplyText} onChange={e => setNewSysReplyText(e.target.value)} placeholder="Type the full canned response here..." className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 h-20 resize-none"/></div>
                      <div className="flex justify-end"><button type="submit" disabled={!newSysReplyLabel.trim() || !newSysReplyText.trim()} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"><Settings size={16} /> Add System Reply</button></div>
                   </form>
                   <div className="space-y-3">
                      {systemQuickReplies.map(reply => (
                         <div key={reply.id} className="flex items-start justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 bg-white group">
                            <div className="flex-1 mr-4">
                               <div className="flex items-center gap-2 mb-1"><span className="font-bold text-gray-800 text-sm">{reply.label}</span><span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{reply.category}</span></div>
                               <p className="text-sm text-gray-600">{reply.text}</p>
                            </div>
                            <button onClick={() => onDeleteSystemReply(reply.id)} className="text-gray-400 hover:text-red-500 p-2 rounded hover:bg-red-50 transition-colors"><Settings size={16} /></button>
                         </div>
                      ))}
                   </div>
                </div>
              )}
              {settingsTab === 'KNOWLEDGE_BASE' && (
                <KnowledgeBaseView />
              )}
              {settingsTab === 'ROLES' && (
                <RoleView />
              )}
              {settingsTab === 'CATEGORIES' && (
                <CategoryView />
              )}
              {settingsTab === 'LLM_MODELS' && (
                <LlmModelView />
              )}
              {settingsTab === 'AI_TOOLS' && (
                <AiToolsSettings />
              )}
              {settingsTab === 'EXTERNAL_PLATFORMS' && (
                <PlatformView />
              )}
              {settingsTab === 'OFFICIAL_CHANNELS' && (
                <OfficialChannelConfigView />
              )}
           </div>
        </div>
    </div>
  );
};
