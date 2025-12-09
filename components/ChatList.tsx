

import React, { useEffect, useState } from 'react';
import { ChatSession, ChatStatus, UserSource, ChatGroup } from '../types';
import { Monitor, Smartphone, Bot, User, CheckCircle, ChevronDown, ChevronRight, Inbox, MoreVertical, Plus, Trash2, FolderOpen, ArrowRight, X, Search } from 'lucide-react';
import { DEFAULT_AVATAR } from '../constants';
import sessionCategoryService from '../services/sessionCategoryService';

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
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    groups.reduce((acc, g) => ({ ...acc, [g.id]: true }), {})
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<{ group: ChatGroup } | null>(null);
  const [boundOverride, setBoundOverride] = useState<Record<string, { id: string; name: string }[]>>({});
  
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
    const [selected, setSelected] = useState<string[]>([]);
    const [available, setAvailable] = useState<{ id: string; name: string }[]>([]);

    useEffect(() => {
      const init = async () => {
        try {
          const av = await sessionCategoryService.getAvailableCategories();
          let list = av.map(c => ({ id: c.id, name: c.name }));
          if (mode === 'edit' && group) {
            const bound = await sessionCategoryService.getGroupCategories(group.id);
            setSelected(bound.map(b => b.id));
            const boundSimple = bound.map(b => ({ id: b.id, name: b.name }));
            const map = new Map<string, { id: string; name: string }>();
            [...list, ...boundSimple].forEach(item => { map.set(item.id, item); });
            list = Array.from(map.values());
          }
          setAvailable(list);
        } catch {}
      };
      init();
    }, [mode, group?.id]);

    const toggleSelect = (id: string) => {
      setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) return;
      if (mode === 'create') {
        const created = await onCreateGroup(name.trim());
        if (selected.length > 0) {
          await sessionCategoryService.setGroupCategories(created.id, selected);
          try {
            const bound = await sessionCategoryService.getGroupCategories(created.id);
            setBoundOverride(prev => ({ ...prev, [created.id]: bound.map(b => ({ id: b.id, name: b.name })) }));
          } catch {}
        }
      } else if (mode === 'edit' && group) {
        await onRenameGroup(group.id, name.trim());
        await sessionCategoryService.setGroupCategories(group.id, selected);
        try {
          const bound = await sessionCategoryService.getGroupCategories(group.id);
          setBoundOverride(prev => ({ ...prev, [group.id]: bound.map(b => ({ id: b.id, name: b.name })) }));
        } catch {}
      }
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-lg text-gray-800">{mode === 'create' ? '创建分组' : '编辑分组'}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">分组名称</label>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">绑定分类</label>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded p-2">
                {available.map(c => (
                  <label key={c.id} className="flex items-center gap-2 text-sm py-1">
                    <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggleSelect(c.id)} />
                    <span>{c.name}</span>
                  </label>
                ))}
                {available.length === 0 && (
                  <div className="text-xs text-gray-400">暂无分类，请先在系统设置中创建分类</div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">取消</button>
              <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors">保存</button>
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
    const { cleanText, mentionedNames } = lastMessage ? parseMessagePreview(lastMessage.text) : { cleanText: '', mentionedNames: [] };

    return (
      <div
        key={session.id}
        onClick={() => onSelectSession(session.id)}
        className={`relative p-3 border-b border-gray-100 cursor-pointer transition-colors group hover:bg-gray-50 ${
          activeSessionId === session.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'
        }`}
      >
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2 overflow-hidden">
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
            <div className="min-w-0">
              <h3 className={`font-semibold text-sm truncate w-full ${session.unreadCount > 0 ? 'text-gray-900 font-bold' : 'text-gray-700'}`}>
                 {session.user.name}
              </h3>
              <p className={`text-xs text-gray-500 truncate ${session.unreadCount > 0 ? 'font-medium text-gray-800' : ''}`}>
                {lastMessage
                  ? cleanText
                  : <span className="italic text-gray-400">No messages yet</span>}
              </p>
              <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                {isResolved ? (
                    <span className="flex items-center gap-1 text-green-600 font-medium bg-green-50 px-1.5 py-0.5 rounded-full text-[10px]">
                        <CheckCircle size={10} /> Resolved
                    </span>
                ) : session.status === ChatStatus.AI_HANDLING ? (
                   <><Bot size={12} className="text-purple-500" /> <span>AI Pilot</span></>
                ) : (
                   <><User size={12} className="text-orange-500" /> <span>Human</span></>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end shrink-0 ml-2">
             <div className="flex items-center gap-2 h-4">
                <span className={`text-[10px] shrink-0 ${session.unreadCount > 0 ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
                    {formatDate(session.lastActive)}
                </span>
             </div>
             {session.unreadCount > 0 && (
                <span className="mt-1 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {session.unreadCount}
                </span>
             )}
          </div>
        </div>
        
        {mentionedNames.length > 0 && (
          <div className="mt-2 flex items-center gap-1">
            <span 
              className="bg-blue-50 text-blue-600 text-[10px] font-semibold px-1.5 py-0.5 rounded-full max-w-[60px] truncate" 
              title={mentionedNames.join(', ')}
            >
              @{mentionedNames[0]}
            </span>
            {mentionedNames.length > 1 && (
              <span className="bg-gray-200 text-gray-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                +{mentionedNames.length - 1}
              </span>
            )}
          </div>
        )}
        
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
               <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase">Move to Group</div>
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
    <div className="flex flex-col h-full bg-white border-r border-gray-200 w-80 shrink-0 select-none">
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
                    placeholder="Search name, email..."
                    className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400"
                />
                <button onClick={() => { setIsSearching(false); setSearchQuery(''); }} className="text-gray-400 hover:text-gray-600">
                    <X size={14} />
                </button>
            </div>
        ) : (
            <>
                <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                    <Inbox size={18} /> Inbox
                </h2>
                <div className="flex items-center gap-2">
                   <button 
                     onClick={() => setIsSearching(true)}
                     className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors"
                     title="Search Contacts"
                   >
                     <Search size={16} />
                   </button>
                   <button 
                     onClick={() => setShowCreateModal(true)}
                     className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors"
                     title="Create Group"
                   >
                     <Plus size={16} />
                   </button>
                   <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                    {sessions.reduce((acc, s) => acc + s.unreadCount, 0)} Total
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

      <div className="flex-1 overflow-y-auto custom-scrollbar">
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
                                const cats = boundOverride[group.id] ?? (group.categories ? group.categories.map(c => ({ id: c.id, name: c.name })) : []);
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
                                    title="Rename Group"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                                    </svg>
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); onDeleteGroup(group.id); }}
                                    className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Delete Group"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                               </>
                             )}
                             {groupUnreadCount > 0 && (
                                <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm flex items-center gap-1">
                                    {groupUnreadCount} new
                                </span>
                             )}
                        </div>
                     </div>

                     {isExpanded && (
                         <div className="bg-white">
                            {groupSessions.length === 0 ? (
                                <div className="p-4 text-center text-gray-300 text-xs border-dashed border border-gray-100 m-2 rounded">
                                    {isSearching ? 'No matches' : 'Empty Group'}
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
                 No contacts found matching "{searchQuery}"
             </div>
         )}
      </div>
    </div>
  );
};
