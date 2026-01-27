

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChatSession, ChatStatus, UserSource, ChatGroup } from '../types';
import { Monitor, Smartphone, Bot, User, CheckCircle, ChevronDown, ChevronRight, Inbox, MoreVertical, Plus, Trash2, FolderOpen, ArrowRight, X, Search } from 'lucide-react';
import { DEFAULT_AVATAR } from '../constants';

interface ChatListProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  groups: ChatGroup[];
  onCreateGroup: (name: string) => Promise<ChatGroup>;
  onDeleteGroup: (id: string) => void;
  onMoveSession: (sessionId: string, groupId: string) => void;
  onRenameGroup: (groupId: string, newName: string) => Promise<void>;
  currentUserId?: string;
}

// Helper to parse mentions and separate them from the main text
const parseMessagePreview = (text: string): { cleanText: string, mentionedNames: string[] } => {
  if (!text) return { cleanText: "", mentionedNames: [] };
  const regex = /@\[(.*?)\]\(user:.*?\)/g;
  
  const mentionedNames = Array.from(text.matchAll(regex), match => match[1]);
  const cleanText = text.replace(regex, '').trim();
  
  return { cleanText, mentionedNames };
};

export const ChatList: React.FC<ChatListProps> = ({ 
  sessions, 
  activeSessionId, 
  onSelectSession,
  groups,
  onCreateGroup,
  onDeleteGroup,
  onMoveSession,
  onRenameGroup,
  currentUserId
}) => {
  const { t } = useTranslation();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    groups.reduce((acc, g) => ({ ...acc, [g.id]: true }), {})
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<{ group: ChatGroup } | null>(null);
  
  // Search State
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for the "Move to" dropdown logic
  const [openMenuSessionId, setOpenMenuSessionId] = useState<string | null>(null);
  
  // State for renaming groups
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // 移除全量分类加载，改为在弹窗内按需加载可绑定分类

  const GroupModal: React.FC<{
    mode: 'create' | 'edit';
    group?: ChatGroup;
    onClose: () => void;
  }> = ({ mode, group, onClose }) => {
    const [name, setName] = useState(group?.name || '');

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) return;
      if (mode === 'create') {
        await onCreateGroup(name.trim());
      } else if (mode === 'edit' && group) {
        await onRenameGroup(group.id, name.trim());
      }
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-lg text-gray-800">{mode === 'create' ? t('create_group') : t('edit_group')}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('group_name')}</label>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">{t('cancel')}</button>
              <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors">{t('save')}</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // 分组的分类改为从 bootstrap 的 group.categories 渲染，不再单独查询

  const handleRenameGroup = (groupId: string, currentName: string) => {
    const g = groups.find(g => g.id === groupId);
    if (!g) return;
    setShowEditModal({ group: g });
  };

  const handleRenameCancelOrBlur = () => {
    setRenamingGroupId(null);
    setRenameValue('');
  };

  const handleRenameSubmit = async (groupId: string) => {
    const nextName = renameValue.trim();
    if (!nextName) {
      handleRenameCancelOrBlur();
      return;
    }
    try {
      await onRenameGroup(groupId, nextName);
    } finally {
      handleRenameCancelOrBlur();
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - timestamp;
    
    // If less than 24 hours, show time
    if (diff < 24 * 60 * 60 * 1000) {
       return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString();
  };
  
  // Helper to render a single chat item
  const renderChatItem = (session: ChatSession) => {
    // 安全检查: 确保 user 对象存在
    if (!session.user) {
      console.warn('Session missing user data:', session.id);
      return null;
    }

    const isResolved = session.status === ChatStatus.RESOLVED;
    const isMenuOpen = openMenuSessionId === session.id;
    const lastMessage = session.lastMessage;  // ✅ 直接使用 lastMessage 字段
    
    // Calculate preview text
    let previewText = '';
    let mentionedNames: string[] = [];
    
    if (lastMessage) {
        if (lastMessage.messageType === 'CARD_PRODUCT') {
            previewText = t('card_product');
        } else if (lastMessage.messageType === 'CARD_GIFT') {
            previewText = t('card_gift');
        } else if (lastMessage.messageType === 'CARD_DISCOUNT') {
            previewText = t('card_discount');
        } else if (lastMessage.messageType === 'CARD_ORDER') {
            previewText = t('card_order');
        } else if ((lastMessage.text || '').startsWith('card#')) {
             // Fallback for raw text
             if ((lastMessage.text || '').includes('CARD_PRODUCT')) previewText = t('card_product');
             else if ((lastMessage.text || '').includes('CARD_GIFT')) previewText = t('card_gift');
             else if ((lastMessage.text || '').includes('CARD_DISCOUNT')) previewText = t('card_discount');
             else if ((lastMessage.text || '').includes('CARD_ORDER')) previewText = t('card_order');
             else previewText = t('card_generic');
        } else {
            const parsed = parseMessagePreview(lastMessage.text || '');
            previewText = parsed.cleanText;
            mentionedNames = parsed.mentionedNames;
        }
    }

    return (
      <div
        key={session.id}
        onClick={() => onSelectSession(session.id)}
        className={`relative p-3 border-b border-gray-100 cursor-pointer transition-colors group hover:bg-gray-50 ${
          activeSessionId === session.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'
        }`}
      >
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3 overflow-hidden flex-1">
            <div className="relative shrink-0">
               <img 
                  src={session.user.avatar || DEFAULT_AVATAR} 
                  alt={session.user.name} 
                  className="w-10 h-10 rounded-full object-cover bg-gray-100" 
               />
               {session.user.source === UserSource.WECHAT ? (
                 <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-0.5 border border-white">
                    <Smartphone size={10} />
                 </div>
               ) : (
                  <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full p-0.5 border border-white">
                    <Monitor size={10} />
                 </div>
               )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                      <h3 className={`font-semibold text-sm truncate ${session.unreadCount > 0 ? 'text-gray-900 font-bold' : 'text-gray-700'}`}>
                        {session.user.name}
                      </h3>
                      {mentionedNames.length > 0 && (
                        <span 
                          className="bg-red-50 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 flex items-center gap-0.5 border border-red-100" 
                          title={mentionedNames.join(', ')}
                        >
                          <span>@</span>
                          <span className="max-w-[60px] truncate">{mentionedNames[0]}</span>
                          {mentionedNames.length > 1 && <span>+{mentionedNames.length - 1}</span>}
                        </span>
                      )}
                  </div>
                  <span className={`text-[10px] shrink-0 ${session.unreadCount > 0 ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
                    {formatDate(session.lastActive)}
                  </span>
              </div>
              
              <div className="flex items-center justify-between mt-0.5">
                  <p className={`text-xs text-gray-500 truncate pr-2 ${session.unreadCount > 0 ? 'font-medium text-gray-800' : ''}`}>
                    {lastMessage
                      ? previewText
                      : <span className="italic text-gray-400">{t('no_messages_yet')}</span>}
                  </p>
                  
                  {session.unreadCount > 0 && (
                    <span className="shrink-0 bg-blue-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
                        {session.unreadCount}
                    </span>
                  )}
              </div>

              <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                {isResolved ? (
                    <span className="flex items-center gap-1 text-green-600 font-medium bg-green-50 px-1.5 py-0.5 rounded-full text-[10px]">
                        <CheckCircle size={10} /> {t('resolved')}
                    </span>
                ) : session.status === ChatStatus.AI_HANDLING ? (
                   <><Bot size={12} className="text-purple-500" /> <span>{t('ai_pilot')}</span></>
                ) : (
                   <><User size={12} className="text-orange-500" /> <span>{t('human_agent')}</span></>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Removed old mention block */}
        
        {/* Move Menu Trigger - Only visible on hover */}
        <button 
          onClick={(e) => { e.stopPropagation(); setOpenMenuSessionId(isMenuOpen ? null : session.id); }}
          className={`absolute right-3 top-3 opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-opacity ${isMenuOpen ? 'opacity-100 bg-gray-200' : ''}`}
        >
          <MoreVertical size={14} className="text-gray-500" />
        </button>

        {/* Move Context Menu */}
        {isMenuOpen && (
           <>
             <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpenMenuSessionId(null); }} />
             <div className="absolute right-2 top-10 z-50 bg-white border border-gray-200 shadow-xl rounded-lg w-40 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
               <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase">{t('move_to_group')}</div>
               {groups.map(group => (
                  <button
                    key={group.id}
                    onClick={(e) => {
                        e.stopPropagation();
                        onMoveSession(session.id, group.id);
                        setOpenMenuSessionId(null);
                    }}
                    disabled={session.groupId === group.id}
                    className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50 disabled:bg-gray-50"
                  >
                     <FolderOpen size={12} className={session.groupId === group.id ? 'text-blue-500' : 'text-gray-400'} />
                     {group.name}
                     {session.groupId === group.id && <CheckCircle size={10} className="ml-auto text-blue-500"/>}
                  </button>
               ))}
             </div>
           </>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 w-full shrink-0 select-none">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center min-h-[68px]">
        {isSearching ? (
            <div className="flex items-center w-full gap-2 animate-in fade-in slide-in-from-top-1 duration-200 bg-white px-3 py-1.5 rounded-lg border border-blue-200 shadow-sm">
                <Search size={14} className="text-blue-500 shrink-0"/>
                <input 
                    autoFocus
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('search_placeholder_contacts')}
                    className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400"
                />
                <button onClick={() => { setIsSearching(false); setSearchQuery(''); }} className="text-gray-400 hover:text-gray-600">
                    <X size={14} />
                </button>
            </div>
        ) : (
            <>
                <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                    <Inbox size={18} /> {t('inbox')}
                </h2>
                <div className="flex items-center gap-2">
                   <button 
                     onClick={() => setIsSearching(true)}
                     className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors"
                     title={t('search_contacts')}
                   >
                     <Search size={16} />
                   </button>
                   <button 
                     onClick={() => setShowCreateModal(true)}
                     className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors"
                     title={t('create_group')}
                   >
                     <Plus size={16} />
                   </button>
                   <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                    {sessions.reduce((acc, s) => acc + s.unreadCount, 0)} {t('total')}
                   </span>
                </div>
            </>
        )}
      </div>
      
      {showCreateModal && (
        <GroupModal mode="create" onClose={() => setShowCreateModal(false)} />
      )}
      {showEditModal && (
        <GroupModal mode="edit" group={showEditModal.group} onClose={() => setShowEditModal(null)} />
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-20 lg:pb-0">
         {/* GROUPS SECTION */}
         {groups.map(group => {
             // Filter sessions for this group AND search query
             const groupSessions = sessions
                .filter(s => s.groupId === group.id)
                .filter(s => {
                    if (!s.user) return false; // 过滤掉没有 user 的会话
                    if (!searchQuery) return true;
                    const q = searchQuery.toLowerCase();
                    return (
                        s.user.name?.toLowerCase().includes(q) ||
                        (s.user.email && s.user.email.toLowerCase().includes(q)) ||
                        (s.user.phone && s.user.phone.includes(q))
                    );
                })
                .sort((a, b) => {
                  // Prioritize time first (Newest messages at top)
                  return b.lastActive - a.lastActive;
                });
             
             // If searching and group is empty, hide it to clear clutter
             if (isSearching && groupSessions.length === 0) return null;

             const groupUnreadCount = groupSessions.reduce((acc, s) => acc + s.unreadCount, 0);
             // Auto expand if searching
             const isExpanded = isSearching ? true : expandedGroups[group.id];

             return (
                 <div key={group.id} className="border-b border-gray-100">
                     <div className="w-full flex items-center justify-between px-4 py-3 bg-gray-50/50 hover:bg-gray-100 sticky top-0 z-10 group transition-colors">
                        {renamingGroupId === group.id ? (
                          // 重命名输入框
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              autoFocus
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameSubmit(group.id);
                                if (e.key === 'Escape') handleRenameCancelOrBlur();
                              }}
                              onBlur={handleRenameCancelOrBlur}
                              className="flex-1 px-2 py-1 text-xs font-bold text-gray-700 border border-blue-400 rounded outline-none"
                            />
                          </div>
                        ) : (
                          <button 
                              onClick={() => toggleGroup(group.id)}
                              className="flex items-center gap-2 text-xs font-bold text-gray-600 uppercase tracking-wider flex-1"
                          >
                              {isExpanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                              <span className="truncate">{group.name}</span>
                              {(() => {
                                const cats = group.categories ? group.categories.map(c => ({ id: c.id, name: c.name })) : [];
                                return cats && cats.length > 0 ? (
                                  <span className="text-gray-400 font-normal text-[10px] ml-2 inline-block truncate max-w-[140px]" title={cats.map(c => c.name).join(', ')}>
                                    [{(() => {
                                    const names = cats.map(c => c.name);
                                    const MAX = 3;
                                    return names.length > MAX ? `${names.slice(0, MAX).join(', ')} +${names.length - MAX}` : names.join(', ');
                                  })()}]
                                </span>
                                ) : null;
                              })()}
                              <span className="text-gray-400 font-normal text-[10px] lowercase">({groupSessions.length})</span>
                        </button>
                        )}
                        
                        <div className="flex items-center gap-2">
                             {!group.isSystem && !isSearching && renamingGroupId !== group.id && (
                               <>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleRenameGroup(group.id, group.name); }}
                                    className="text-gray-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title={t('rename_group_tooltip')}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                                    </svg>
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); onDeleteGroup(group.id); }}
                                    className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title={t('delete_group_tooltip')}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                               </>
                             )}
                             {groupUnreadCount > 0 && (
                                <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm flex items-center gap-1">
                                    {groupUnreadCount} {t('new_messages_suffix')}
                                </span>
                             )}
                        </div>
                     </div>

                     {isExpanded && (
                         <div className="bg-white">
                            {groupSessions.length === 0 ? (
                                <div className="p-4 text-center text-gray-300 text-xs border-dashed border border-gray-100 m-2 rounded">
                                    {isSearching ? t('no_matches') : t('empty_group')}
                                </div>
                            ) : (
                                groupSessions.map(renderChatItem)
                            )}
                         </div>
                     )}
                 </div>
             );
         })}
         {isSearching && sessions.filter(s => s.user && s.user.name?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
             <div className="p-8 text-center text-gray-400 text-sm">
                 {t('no_contacts_found', { query: searchQuery })}
             </div>
         )}
      </div>
    </div>
  );
};
