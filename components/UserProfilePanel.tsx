
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { UserProfile, UserSource, QuickReply, ChatSession, Agent } from '../types';
import { MapPin, Mail, Phone, Tag, Plus, X, MessageSquareText, Trash2, Lock, Shield, Sparkles, Loader2, Edit3, Check, Crown, Users } from 'lucide-react';
import { DEFAULT_AVATAR } from '../constants';
import Avatar from './Avatar';
import quickReplyServiceAPI from '../services/quickReplyService';
import sessionService from '../services/sessionService';

interface UserProfilePanelProps {
  user: UserProfile;
  currentSession: ChatSession;
  agents: Agent[];
  allQuickReplies: QuickReply[];
  agentId: string;
  onUpdateTags: (userId: string, tags: string[], isAiTag?: boolean) => void;
  onUpdateNotes: (sessionId: string, notes: string) => void;
  onUpdateName?: (userId: string, name: string) => void;
  onQuickReply: (text: string) => void;
  onGenerateAiTags?: (userId: string) => void;
  onAddSupportAgent: (agentId: string) => void;
  onRemoveSupportAgent: (agentId: string) => void;
  onTransferChat: (agentId: string) => void;
  isGeneratingTags?: boolean;
  canManageSessionAgents?: boolean;
  subscription?: Subscription | null;
}

export const UserProfilePanel: React.FC<UserProfilePanelProps> = ({ 
  user,
  currentSession,
  agents,
  allQuickReplies,
  agentId,
  onUpdateTags,
  onUpdateNotes,
  onUpdateName,
  onQuickReply,
  onGenerateAiTags,
  onAddSupportAgent,
  onRemoveSupportAgent,
  onTransferChat,
  isGeneratingTags = false,
  canManageSessionAgents = false,
  subscription
}) => {
  const { t } = useTranslation();
  const canAiTags = subscription?.supportAiTags ?? false;
  // 安全检查: 如果 user 不存在，返回提示
  if (!user) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-6 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <Users size={48} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">{t('no_user_selected')}</p>
        </div>
      </div>
    );
  }

  const [newTag, setNewTag] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteTemp, setNoteTemp] = useState(user.notes || '');

  // Edit Name State
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameTemp, setNameTemp] = useState(user?.name || '');

  // Personal Quick Reply State
  const [personalQuickReplies, setPersonalQuickReplies] = useState<QuickReply[]>([]);
  const [isAddingReply, setIsAddingReply] = useState(false);
  const [newReplyLabel, setNewReplyLabel] = useState('');
  const [newReplyText, setNewReplyText] = useState('');
  
  // Add Agent Dropdown
  const [isAddingAgent, setIsAddingAgent] = useState(false);
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);
  const isFullWidth = (ch: string) => {
    const cp = ch.codePointAt(0) || 0;
    if ((cp >= 0x4E00 && cp <= 0x9FFF) || (cp >= 0x3400 && cp <= 0x4DBF)) return true;
    if ((cp >= 0x3040 && cp <= 0x309F) || (cp >= 0x30A0 && cp <= 0x30FF)) return true;
    if (cp >= 0xAC00 && cp <= 0xD7AF) return true;
    if ((cp >= 0xFF01 && cp <= 0xFF60) || (cp >= 0xFFE0 && cp <= 0xFFE6)) return true;
    return false;
  };

  const initials = (n?: string) => {
    const s = (n || '').trim();
    if (!s) return 'U';
    const chars = Array.from(s);
    const preferred = chars.filter(ch => /\p{L}|\p{N}/u.test(ch));
    const source = preferred.length ? preferred : chars;
    const first = source[0] || 'U';
    if (isFullWidth(first)) return first;
    let out = '';
    for (const ch of source) {
      if (isFullWidth(ch)) break;
      out += ch;
      if (out.length >= 2) break;
    }
    return /^[A-Za-z]+$/.test(out) ? out.toUpperCase() : out || first;
  };

  // 从传入的allQuickReplies中过滤出个人快捷回复和系统快捷回复
  useEffect(() => {
    // 过滤出个人快捷回复（非系统快捷回复）
    const personalReplies = allQuickReplies.filter(reply => !reply.system);
    setPersonalQuickReplies(personalReplies);
  }, [allQuickReplies]);

  useEffect(() => {
    setNameTemp(user?.name || '');
    setNoteTemp(user?.notes || '');
    setIsEditingName(false);
    setIsEditingNote(false);
    setIsAddingAgent(false);
  }, [user?.id, user?.name, user?.notes]);

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTag.trim() && !user.tags.includes(newTag.trim())) {
      onUpdateTags(user.id, [...user.tags, newTag.trim()], false);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onUpdateTags(user.id, user.tags.filter(t => t !== tagToRemove), false);
  };

  const removeAiTag = (tagToRemove: string) => {
    const currentAiTags = user.aiTags || [];
    onUpdateTags(user.id, currentAiTags.filter(t => t !== tagToRemove), true);
  };

  const saveNote = () => {
    onUpdateNotes(currentSession.id, noteTemp);
    setIsEditingNote(false);
  };

  const saveName = () => {
    if (nameTemp.trim() && onUpdateName) {
        onUpdateName(user.id, nameTemp.trim());
        setIsEditingName(false);
    }
  };

  const handleAddPersonalReply = async () => {
    if (newReplyLabel.trim() && newReplyText.trim()) {
      try {
        const newReply = await quickReplyServiceAPI.createQuickReply({
          label: newReplyLabel.trim(),
          text: newReplyText.trim()
        }, agentId);
        setPersonalQuickReplies([newReply, ...personalQuickReplies]);
        setNewReplyLabel('');
        setNewReplyText('');
        setIsAddingReply(false);
      } catch (error) {
        console.error('Failed to add personal quick reply:', error);
      }
    }
  };

  const deletePersonalReply = async (id: string) => {
    try {
      await quickReplyServiceAPI.deleteQuickReply(id, agentId);
      setPersonalQuickReplies(personalQuickReplies.filter(r => r.id !== id));
    } catch (error) {
      console.error('Failed to delete personal quick reply:', error);
    }
  };

  // Helper to find agent info
  const getAgent = (id: string) => agents.find(a => a.id === id);

  return (
    <div className="w-80 bg-white border-l border-gray-200 h-full overflow-y-auto flex flex-col shrink-0">
      <div className="p-6 flex flex-col items-center border-b border-gray-100">
        <Avatar name={user.name} src={user.avatar || undefined} size={96} borderClassName="ring-4 ring-blue-50" bgClassName="bg-gray-100" />
        
        {/* Name Editing Section */}
        {isEditingName ? (
            <div className="flex items-center gap-2 mb-2 w-full">
                <input 
                    type="text" 
                    value={nameTemp}
                    onChange={(e) => setNameTemp(e.target.value)}
                    className="flex-1 text-center font-bold text-gray-800 border-b-2 border-blue-500 outline-none pb-1"
                    autoFocus
                />
                <button onClick={saveName} className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200"><Check size={16} /></button>
                <button onClick={() => { setIsEditingName(false); setNameTemp(user.name); }} className="p-1 bg-gray-100 text-gray-500 rounded hover:bg-gray-200"><X size={16} /></button>
            </div>
        ) : (
            <div className="group relative w-full flex justify-center mb-2">
                <div className="relative">
                    <h2 className="text-xl font-bold text-gray-800">{user.name}</h2>
                    {onUpdateName && (
                        <button 
                            onClick={() => setIsEditingName(true)} 
                            className="absolute left-full ml-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-blue-500 p-1"
                            title={t('edit_name')}
                        >
                            <Edit3 size={16} />
                        </button>
                    )}
                </div>
            </div>
        )}

        <span className={`mt-1 px-3 py-1 rounded-full text-xs font-semibold ${
          user.source === UserSource.WECHAT ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
        }`}>
          {user.source === UserSource.WECHAT ? t('wechat_user') : t('web_visitor')}
        </span>
        {currentSession.category && (
          <div className="mt-2 text-xs text-gray-600">
            {t('group_info', { name: currentSession.category.name })}
          </div>
        )}
      </div>

      <div className="p-6 space-y-6 flex-1">
        
        {/* Support Team Section */}
        <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Users size={14} /> {t('support_team')}
              </h3>
              <div className="relative">
                  <button 
                    onClick={async () => {
                      if (!canManageSessionAgents) return;
                      setIsAddingAgent(!isAddingAgent);
                      if (!isAddingAgent) {
                        try {
                          setIsLoadingAvailable(true);
                          const list = await sessionService.getAvailableAgents(currentSession.id);
                          const existingIds = (currentSession.agents || []).map(a => a.id);
                          setAvailableAgents(list.filter(a => !existingIds.includes(a.id)));
                        } catch (e) {
                          console.error('Failed to load available agents', e);
                        } finally {
                          setIsLoadingAvailable(false);
                        }
                      }
                    }}
                    className={`p-1 rounded transition-colors ${canManageSessionAgents ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-300 cursor-not-allowed'}`}
                    title={t('add_agent_to_group')}
                  >
                    <Plus size={16} />
                  </button>
                  {isAddingAgent && (
                      <div className="absolute right-0 top-6 w-48 bg-white shadow-xl border border-gray-200 rounded-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                          <div className="bg-gray-50 px-3 py-2 text-[10px] font-bold text-gray-400 uppercase border-b border-gray-100">{t('add_support_agent')}</div>
                          <div className="max-h-40 overflow-y-auto">
                              {isLoadingAvailable ? (
                                <div className="p-3 text-center text-xs text-gray-400">{t('loading')}</div>
                              ) : (
                                <>
                                  {availableAgents.map(agent => (
                                    <button 
                                      key={agent.id}
                                      onClick={() => { onAddSupportAgent(agent.id); setIsAddingAgent(false); }}
                                      className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 flex items-center gap-2"
                                    >
                                        {agent.avatar ? (
                                          <img src={agent.avatar} className="w-5 h-5 rounded-full" />
                                        ) : (
                                          <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
                                            <span className="text-[9px] font-bold text-gray-600">{initials(agent.name)}</span>
                                          </div>
                                        )}
                                        {agent.name}
                                    </button>
                                  ))}
                                  {availableAgents.length === 0 && (
                                    <div className="p-3 text-center text-xs text-gray-400">{t('no_agents_available')}</div>
                                  )}
                                </>
                              )}
                          </div>
                          {/* Close overlay */}
                          <div className="fixed inset-0 z-[-1]" onClick={() => setIsAddingAgent(false)}></div>
                      </div>
                  )}
              </div>
            </div>

            <div className="space-y-3">
                {/* Primary Owner */}
                {currentSession.agents?.find(a => a.isPrimary) ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2.5 flex items-center gap-3 relative">
                      <Avatar name={currentSession.agents!.find(a => a.isPrimary)?.name} src={currentSession.agents!.find(a => a.isPrimary)?.avatar} size={32} borderClassName="border-2 border-yellow-300" bgClassName="bg-yellow-200" textClassName="text-yellow-700" />
                      <div>
                          <div className="text-xs font-bold text-gray-800">{currentSession.agents!.find(a => a.isPrimary)?.name || t('unknown_user')}</div>
                          <div className="text-[10px] text-yellow-700 font-bold flex items-center gap-1 uppercase tracking-wider"><Crown size={10} /> {t('primary_owner')}</div>
                      </div>
                  </div>
                ) : null}

                {/* Support Agents */}
                {currentSession.agents && currentSession.agents.filter(a => !a.isPrimary).length > 0 ? (
                  <div className="space-y-2 pl-2 border-l-2 border-gray-100 ml-2">
                    {currentSession.agents.filter(a => !a.isPrimary).map(a => (
                      <div key={a.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50">
                        <Avatar name={a.name} src={a.avatar} size={24} />
                        <div className="flex-1">
                          <div className="text-xs font-medium text-gray-700">{a.name}</div>
                          <div className="text-[10px] text-gray-400">{t('support_role')}</div>
                        </div>
                        {canManageSessionAgents && (
                          <button
                            onClick={() => {
                              if (!confirm(t('confirm_remove_support_agent'))) return;
                              onRemoveSupportAgent(a.id);
                            }}
                            className="text-gray-400 hover:text-red-500 p-1 rounded"
                            title={t('remove_support_agent')}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 italic pl-2">{t('no_other_support_agents')}</div>
                )}
            </div>
        </div>
        
        <hr className="border-gray-100" />

        {/* Contact Info */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('contact_info')}</h3>
          {user.email && (
            <div className="flex items-center text-sm text-gray-600">
              <Mail size={16} className="mr-3 text-gray-400" />
              {user.email}
            </div>
          )}
          {user.phone && (
            <div className="flex items-center text-sm text-gray-600">
              <Phone size={16} className="mr-3 text-gray-400" />
              {user.phone}
            </div>
          )}
          {user.location && (
            <div className="flex items-center text-sm text-gray-600">
              <MapPin size={16} className="mr-3 text-gray-400" />
              {user.location}
            </div>
          )}
        </div>

        {/* Tags */}
        <div>
           <div className="flex justify-between items-center mb-3">
             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
               {t('user_tags')} <Tag size={14} />
             </h3>
             {onGenerateAiTags && canAiTags && (
               <button 
                onClick={() => onGenerateAiTags(user.id)}
                disabled={isGeneratingTags}
                className="text-purple-600 hover:text-purple-800 text-[10px] font-bold flex items-center gap-1 bg-purple-50 px-2 py-1 rounded transition-colors disabled:opacity-50"
                title={t('ai_analyze_tooltip')}
               >
                 {isGeneratingTags ? <Loader2 size={10} className="animate-spin"/> : <Sparkles size={10} />}
                 {t('ai_analyze_button')}
               </button>
             )}
           </div>
           
           <div className="flex flex-wrap gap-2 mb-3">
             {/* Manual Tags */}
             {user.tags.map(tag => (
               <span key={`manual_${tag}`} className="bg-gray-100 text-gray-700 border border-gray-200 px-2 py-1 rounded text-xs flex items-center group">
                 {tag}
                 <button onClick={() => removeTag(tag)} className="ml-1 text-gray-400 hover:text-red-500">
                   <X size={12} />
                 </button>
               </span>
             ))}

             {/* AI Tags */}
             {user.aiTags?.map(tag => (
               <span key={`ai_${tag}`} className="bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-700 border border-purple-200 px-2 py-1 rounded text-xs flex items-center group shadow-sm">
                 <Sparkles size={10} className="mr-1 text-purple-400" />
                 {tag}
                 <button onClick={() => removeAiTag(tag)} className="ml-1 text-purple-300 hover:text-purple-500">
                   <X size={12} />
                 </button>
               </span>
             ))}
           </div>
           <form onSubmit={handleAddTag} className="relative">
             <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder={t('add_manual_tag_placeholder')}
                className="w-full text-sm border border-gray-300 rounded-md pl-3 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
             />
             <button type="submit" className="absolute right-1 top-1.5 text-blue-500 hover:text-blue-700">
               <Plus size={16} />
             </button>
           </form>
        </div>

        {/* Notes */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('internal_notes_title')}</h3>
            {!isEditingNote && (
              <button onClick={() => setIsEditingNote(true)} className="text-xs text-blue-500 hover:underline">
                {t('edit_button')}
              </button>
            )}
          </div>
          
          {isEditingNote ? (
            <div className="space-y-2">
              <textarea
                value={noteTemp}
                onChange={(e) => setNoteTemp(e.target.value)}
                className="w-full h-24 text-sm border border-gray-300 rounded-md p-2 focus:outline-none focus:border-blue-500 resize-none"
              />
              <div className="flex justify-end gap-2">
                <button 
                  onClick={() => setIsEditingNote(false)}
                  className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                >
                  {t('cancel_button')}
                </button>
                <button 
                  onClick={saveNote}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {t('save_button')}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 p-3 rounded-md border border-yellow-100 text-sm text-gray-700 min-h-[80px]">
              {user.notes || t('no_notes_placeholder')}
            </div>
          )}
        </div>

        {/* Quick Replies - Mixed System & Personal */}
        <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <MessageSquareText size={14} /> {t('quick_replies')}
              </h3>
              {!isAddingReply && (
                <button 
                  onClick={() => setIsAddingReply(true)}
                  className="text-blue-600 hover:bg-blue-50 p-1 rounded transition-colors"
                  title={t('new_personal_reply')}
                >
                  <Plus size={16} />
                </button>
              )}
            </div>

            {isAddingReply && (
              <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200 animate-in slide-in-from-top-2 fade-in duration-200">
                <div className="text-xs font-semibold text-blue-600 mb-2">{t('new_personal_reply')}</div>
                <input 
                  type="text"
                  placeholder={t('personal_reply_label_placeholder')}
                  value={newReplyLabel}
                  onChange={(e) => setNewReplyLabel(e.target.value)}
                  className="w-full mb-2 text-xs font-semibold border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-blue-500"
                />
                <textarea
                  placeholder={t('message_content_placeholder')}
                  value={newReplyText}
                  onChange={(e) => setNewReplyText(e.target.value)}
                  className="w-full mb-2 text-xs border border-gray-300 rounded px-2 py-1.5 h-16 resize-none focus:outline-none focus:border-blue-500"
                />
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => setIsAddingReply(false)} 
                    className="text-xs text-gray-500 px-2 py-1 hover:text-gray-700"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    onClick={handleAddPersonalReply}
                    disabled={!newReplyLabel.trim() || !newReplyText.trim()}
                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('add')}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {/* Personal Replies */}
              {personalQuickReplies.map(reply => (
                <div key={reply.id} className="relative group">
                  <button
                    onClick={() => onQuickReply(reply.text)}
                    className="w-full text-left p-3 rounded-lg border border-blue-100 bg-blue-50/30 hover:bg-blue-50 hover:border-blue-300 transition-all shadow-sm"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <div className="text-xs font-bold text-gray-700 group-hover:text-blue-700">{reply.label}</div>
                      <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">{t('personal_category')}</span>
                    </div>
                    <div className="text-xs text-gray-500 truncate">{reply.text}</div>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deletePersonalReply(reply.id); }}
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white/80 rounded backdrop-blur-sm"
                    title={t('delete_personal_reply')}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}

              {/* System Replies */}
              {allQuickReplies.filter(reply => reply.system).map(reply => (
                <div key={reply.id} className="relative group">
                  <button
                    onClick={() => onQuickReply(reply.text)}
                    className="w-full text-left p-3 rounded-lg border border-gray-100 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <div className="text-xs font-bold text-gray-700">{reply.label}</div>
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                        <Shield size={8} /> {t('system_category')}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 truncate">{reply.text}</div>
                  </button>
                  {/* System replies cannot be deleted here */}
                  <div className="absolute top-2 right-2 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity p-1" title={t('system_managed')}>
                    <Lock size={12} />
                  </div>
                </div>
              ))}
            </div>
        </div>
      </div>
    </div>
  );
};
