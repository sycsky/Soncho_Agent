

import React, { useState, useEffect, useRef } from 'react';
import { ChatSession, Message, MessageSender, ChatStatus, Attachment, Agent, QuickReply } from '../types';
import sessionService from '../services/sessionService';
import { 
  Send, Paperclip, Smile, Bot, User, CheckCircle, X, 
  Eye, EyeOff, Wand2, Loader2, Sparkles, ArrowRightLeft, 
  Maximize2, Minimize2, Check, Languages, Globe, ClipboardCheck,
  FileText as FileTextIcon
} from 'lucide-react';
import { DEFAULT_AVATAR } from '../constants';
import Avatar from './Avatar';

interface ChatAreaProps {
  session: ChatSession;
  agents: Agent[];
  systemQuickReplies: QuickReply[];
  isZenMode: boolean;
  setIsZenMode: (val: boolean) => void;
  isAiTyping: boolean;
  onSendMessage: (text: string, attachments: Attachment[], isInternal: boolean, isTranslationEnabled: boolean, mentions: string[]) => void;
  onResolve: () => void;
  onTransfer: () => void;
  onSummary: () => void;
  onToggleStatus: () => void;
  onMagicRewrite: (text: string) => Promise<string>;
  sentiment: { score: number; label: string };
  isAnalyzingSentiment: boolean;
  currentAgentLanguage?: string;
}

const EMOJIS = ['😀', '😂', '😍', '😭', '😡', '👍', '👎', '🎉', '🔥', '❤️', '👀', '✅', '❌', '👋', '🙏', '💯'];

// Helper to parse and render mentions in chat history
const renderWithMentions = (text: string): React.ReactNode => {
  const regex = /@\[(.*?)\]\(user:(.*?)\)/g;
  const parts = text.split(regex);
  
  return parts.map((part, i) => {
    if (i % 3 === 1) { // This is the name part
      return (
        <span key={i} className="bg-blue-100 text-blue-700 font-semibold rounded px-1 py-0.5">
          @{part}
        </span>
      );
    }
    if (i % 3 === 2) { // This is the ID part, we skip it
      return null;
    }
    return part; // This is the normal text part
  });
};

export const ChatArea: React.FC<ChatAreaProps> = ({
  session,
  agents,
  systemQuickReplies,
  isZenMode,
  setIsZenMode,
  isAiTyping,
  onSendMessage,
  onResolve,
  onTransfer,
  onSummary,
  onToggleStatus,
  onMagicRewrite,
  sentiment,
  isAnalyzingSentiment,
  currentAgentLanguage = 'en'
}) => {
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isInternalMode, setIsInternalMode] = useState(false);
  
  // Translation state cached per session
  const [isTranslationEnabled, setIsTranslationEnabled] = useState(() => {
    return localStorage.getItem(`translation_enabled_${session.id}`) === 'true';
  });

  useEffect(() => {
    setIsTranslationEnabled(localStorage.getItem(`translation_enabled_${session.id}`) === 'true');
  }, [session.id]);

  const toggleTranslation = () => {
    const newState = !isTranslationEnabled;
    setIsTranslationEnabled(newState);
    localStorage.setItem(`translation_enabled_${session.id}`, String(newState));
  };

  const [isRewriting, setIsRewriting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  
  // Mention states
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionCursorIndex, setMentionCursorIndex] = useState(0);
  const [mentionedAgents, setMentionedAgents] = useState<Agent[]>([]);
  const [mentionableAgents, setMentionableAgents] = useState<Agent[]>([]);
  const [mentionLoading, setMentionLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const isResolved = session.status === ChatStatus.RESOLVED;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session.messages?.length]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 192); // Max height of 192px
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [inputText]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);
    const cursor = e.target.selectionStart;

    if (val.startsWith('/')) {
      setShowSlashMenu(true);
      setSlashFilter(val.substring(1));
    } else {
      setShowSlashMenu(false);
    }

    const lastAt = val.lastIndexOf('@', cursor - 1);
    if (lastAt !== -1) {
      const textAfterAt = val.substring(lastAt + 1, cursor);
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('@')) {
        setShowMentionMenu(true);
        setMentionFilter(textAfterAt);
        setMentionCursorIndex(lastAt);
        if (!mentionLoading) {
          setMentionLoading(true);
          sessionService.getMentionableAgents(session.id)
            .then(list => setMentionableAgents(list))
            .catch(() => setMentionableAgents([]))
            .finally(() => setMentionLoading(false));
        }
      } else {
        setShowMentionMenu(false);
      }
    } else {
      setShowMentionMenu(false);
    }
  };

  const insertMention = (agent: Agent) => {
    // Prevent duplicates
    if (mentionedAgents.some(a => a.id === agent.id)) {
        setShowMentionMenu(false);
        return;
    }
    
    // Add agent to pills
    setMentionedAgents(prev => [...prev, agent]);

    // Remove the @trigger from the input text
    const cursorPosition = textareaRef.current?.selectionStart || 0;
    const before = inputText.substring(0, mentionCursorIndex);
    const after = inputText.substring(cursorPosition);
    const newText = `${before}${after}`;
    
    setInputText(newText);
    setShowMentionMenu(false);
    
    setTimeout(() => {
        textareaRef.current?.focus();
        // Move cursor to where the trigger text was removed
        textareaRef.current?.setSelectionRange(mentionCursorIndex, mentionCursorIndex);
    }, 0);
  };
  
  const removeMention = (agentId: string) => {
    setMentionedAgents(prev => prev.filter(a => a.id !== agentId));
  };

  const insertSlashCommand = (text: string) => {
    setInputText(text);
    setShowSlashMenu(false);
    textareaRef.current?.focus();
  };

  const addEmoji = (emoji: string) => {
    setInputText(prev => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const newAttachment: Attachment = {
        id: Date.now().toString(),
        type: file.type.startsWith('image/') ? 'IMAGE' : 'FILE',
        url: URL.createObjectURL(file),
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB'
      };
      setAttachments([...attachments, newAttachment]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleMagicRewrite = async () => {
    if (!inputText.trim()) return;
    setIsRewriting(true);
    const rewritten = await onMagicRewrite(inputText);
    setInputText(rewritten);
    setIsRewriting(false);
  };

  const handleSend = () => {
    if ((!inputText.trim() && attachments.length === 0 && mentionedAgents.length === 0) || isRewriting || isResolved) return;
    
    const mentionMarkdown = mentionedAgents.map(a => `@[${a.name}](user:${a.id})`).join(' ');
    const fullText = `${inputText.trim()} ${mentionMarkdown}`.trim();
    const mentionIds = mentionedAgents.map(a => a.id);

    // Internal mode is forced if there are mentions
    const finalIsInternal = isInternalMode || mentionedAgents.length > 0;
    
    onSendMessage(fullText, attachments, finalIsInternal, isTranslationEnabled, mentionIds);
    
    setInputText('');
    setAttachments([]);
    setIsInternalMode(false);
    setMentionedAgents([]);
    closeAllPopups();
  };

  const closeAllPopups = () => {
      setShowEmojiPicker(false);
      setShowSlashMenu(false);
      setShowMentionMenu(false);
  };

  const placeholderText = isRewriting ? "AI Magic Rewrite in progress..." 
    : isInternalMode || mentionedAgents.length > 0 ? "Type internal note..." 
    : isResolved ? "Ticket resolved. Re-open to message." 
    : session.status === ChatStatus.AI_HANDLING ? "Take over and type a message..." 
    : "Type a message... (Type '/' for commands, '@' to mention)";

  return (
    <div className="flex-1 flex flex-col bg-white h-full relative">
      {/* Header */}
      <div className="h-16 border-b border-gray-200 flex justify-between items-center px-6 bg-white shrink-0 z-10">
          <div className="flex items-center gap-4">
            {!isZenMode ? (
              <div>
                  <h2 className="font-bold text-gray-800">{session.user?.name || 'Unknown User'}</h2>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className={`w-2 h-2 rounded-full ${session.status === ChatStatus.AI_HANDLING ? 'bg-purple-500' : 'bg-orange-500'}`}></span>
                      {session.status === ChatStatus.AI_HANDLING ? 'AI Pilot' : 'Human Agent'}
                  </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                 <Avatar name={session.user?.name} src={session.user?.avatar || undefined} size={40} bgClassName="bg-gray-100" />
                 <div>
                    <h2 className="font-bold text-gray-800">{session.user?.name || 'Unknown User'}</h2>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-bold uppercase tracking-wider text-[10px]">Zen Mode</span>
                    </div>
                 </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
              <div className="hidden lg:flex flex-col items-end mr-4">
                 <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                   {isAnalyzingSentiment ? <Loader2 size={10} className="animate-spin" /> : null}
                   Live Sentiment
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ease-out ${sentiment.score < 30 ? 'bg-red-500' : sentiment.score < 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${sentiment.score}%` }}
                      />
                    </div>
                    <span className={`text-xs font-bold ${sentiment.score < 30 ? 'text-red-500' : sentiment.score < 70 ? 'text-yellow-600' : 'text-green-600'}`}>{sentiment.label}</span>
                 </div>
              </div>

              <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block"></div>

               <button 
                onClick={onToggleStatus}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  session.status === ChatStatus.AI_HANDLING 
                    ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' 
                    : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
                }`}
                title={session.status === ChatStatus.AI_HANDLING ? "Switch to Human Agent" : "Switch to AI Pilot"}
               >
                 {session.status === ChatStatus.AI_HANDLING ? <Bot size={14}/> : <User size={14}/>}
                 {session.status === ChatStatus.AI_HANDLING ? 'AI Pilot' : 'Human'}
               </button>

              <button 
                 onClick={toggleTranslation} 
                 className={`p-2 rounded-lg transition-all duration-200 ${isTranslationEnabled ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'}`} 
                 title={isTranslationEnabled ? "Translation Active" : "Enable Translation"}
              >
                 <Languages size={18} />
              </button>

              <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block"></div>

              <button onClick={onSummary} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="AI Smart Summary"><Sparkles size={18} /></button>
              <button onClick={onTransfer} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Transfer Chat"><ArrowRightLeft size={18} /></button>
              <button onClick={() => setIsZenMode(!isZenMode)} className={`p-2 rounded-lg transition-colors ${isZenMode ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`} title={isZenMode ? "Exit Zen Mode" : "Enter Zen Mode"}>{isZenMode ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button>
              <div className="h-6 w-px bg-gray-200 mx-1"></div>
              <button 
                onClick={onResolve} 
                disabled={isResolved}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${isResolved ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700 shadow-sm'}`}
              >
                  <Check size={14} /> {isResolved ? 'Resolved' : 'Resolve'}
              </button>
          </div>
      </div>

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto p-6 space-y-4 ${isZenMode ? 'bg-white max-w-3xl mx-auto w-full' : 'bg-gray-50/50'}`}>
          {(session.messages || []).map((msg) => {
              const isUser = msg.sender === MessageSender.USER;
              const isAi = msg.sender === MessageSender.AI;
              const isInternal = msg.isInternal;
              const isSystem = msg.sender === MessageSender.SYSTEM;
              // Use prop passed from parent (reactive) or fallback to localStorage/default
              const targetLang = currentAgentLanguage || localStorage.getItem('agent_language') || 'en';
              const translationContent = msg.translationData?.[targetLang];
              const shouldShowTranslation = isTranslationEnabled && translationContent;
              // console.log(msg)
              if (isSystem) {
                return (
                   <div key={msg.id} className="w-full flex flex-col items-center gap-4 my-8 animate-in fade-in zoom-in-95 duration-500">
                      <div className="bg-amber-50 border border-amber-100 text-gray-700 text-xs px-5 py-4 rounded-xl shadow-sm max-w-xl w-full mx-auto relative">
                          <div className="flex items-center gap-2 mb-2 border-b border-amber-200/50 pb-2"><ClipboardCheck size={14} className="text-amber-600"/><span className="font-bold text-amber-800 uppercase tracking-wide text-[10px]">Resolution Summary</span></div>
                          <p className="whitespace-pre-wrap leading-relaxed">{renderWithMentions(shouldShowTranslation ? (translationContent as string) : msg.text)}</p>
                          {shouldShowTranslation && (
                             <div className="mt-2 pt-2 border-t border-amber-200/50 text-[10px] flex items-center gap-1.5 text-amber-600/70">
                                <Globe size={10} />
                                <span className="font-semibold">Translated from {msg.translationData?.originalText || 'Original'}</span>
                             </div>
                          )}
                      </div>
                      <div className="flex items-center w-full gap-4 opacity-70">
                         <div className="h-px bg-gray-300 flex-1"></div>
                         <div className="flex items-center gap-2 text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-200"><CheckCircle size={12} className="text-green-500" /><span className="text-[10px] font-bold uppercase tracking-wider">Ticket Resolved</span><span className="text-[10px] opacity-50">• {new Date(msg.timestamp).toLocaleString()}</span></div>
                         <div className="h-px bg-gray-300 flex-1"></div>
                      </div>
                   </div>
                );
              }

              return (
                  <div key={msg.id} className={`flex flex-col ${isUser ? 'items-start' : 'items-end'}`}>
                      <div className={`flex ${isUser ? 'justify-start' : 'justify-end'} w-full`}>
                          <div className={`max-w-[70%] rounded-2xl p-4 shadow-sm relative group ${isUser ? 'bg-white text-gray-800 rounded-tl-none border border-gray-100' : isAi ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-tr-none' : isInternal ? 'bg-yellow-100 text-yellow-900 border border-yellow-200 rounded-tr-none' : 'bg-blue-600 text-white rounded-tr-none'}`}>
                              {isInternal && (<div className="mb-2 pb-1 border-b border-yellow-200 flex items-center gap-2 text-yellow-800/80"><EyeOff size={12} /> <span className="text-[10px] font-bold uppercase tracking-wider">Internal Note</span></div>)}
                              {msg.attachments && msg.attachments.length > 0 && (<div className="mb-2 space-y-2">{msg.attachments.map(att => (<div key={att.id} className="rounded-lg overflow-hidden bg-black/10">{att.type === 'IMAGE' ? (<img src={att.url} alt="Attachment" className="max-w-full h-auto max-h-60 object-contain" />) : (<div className="flex items-center gap-3 p-3 bg-white/20"><FileTextIcon size={24} /><div className="flex flex-col overflow-hidden"><span className="text-sm font-medium truncate">{att.name}</span><span className="text-xs opacity-70">{att.size}</span></div></div>)}</div>))}</div>)}
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">{renderWithMentions(shouldShowTranslation ? (translationContent as string) : msg.text)}</p>
                              
                              {shouldShowTranslation && (
                                 <div className={`mt-2 pt-2 border-t text-[10px] flex items-center gap-1.5 ${isUser ? 'border-gray-100 text-gray-500' : 'border-white/20 text-blue-100'}`}>
                                    <Globe size={10} />
                                    <span className="font-semibold">Translated from {msg.translationData?.originalText || 'Original'}</span>
                                 </div>
                              )}

                              {/* {!shouldShowTranslation && msg.translation && (
                                 <div className={`mt-2 pt-2 border-t text-[10px] flex items-center gap-1.5 ${isUser ? 'border-gray-100 text-gray-500' : 'border-white/20 text-blue-100'}`}>
                                    <Globe size={10} />
                                    <span className="font-semibold">Translated to {msg.translation.originalText}</span>
                                    {isUser && (
                                       <span className="ml-auto underline cursor-pointer hover:text-blue-500">View Original</span>
                                    )}
                                 </div>
                              )} */}

                              <div className={`text-[10px] mt-1 opacity-70 flex items-center justify-end gap-1 ${isInternal ? 'text-yellow-700' : (isUser ? 'text-gray-400' : 'text-blue-100')}`}>{isAi && <Bot size={10} />}{msg.sender === MessageSender.AGENT && <User size={10} />}{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                          </div>
                      </div>
                  </div>
              );
          })}
          {isAiTyping && (<div className="flex justify-end"><div className="bg-gray-200 rounded-2xl rounded-tr-none p-3 flex gap-1"><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div></div></div>)}
          <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className={`relative ${isZenMode ? 'max-w-3xl mx-auto w-full' : ''}`}>
          
          {(showEmojiPicker || showSlashMenu || showMentionMenu) && (
              <div className="fixed inset-0 z-10" onClick={closeAllPopups}></div>
          )}

          {showEmojiPicker && (
            <div className="absolute bottom-full mb-2 right-4 bg-white shadow-xl rounded-xl border border-gray-200 p-3 w-64 z-20 animate-in zoom-in-95 duration-200">
                <div className="grid grid-cols-8 gap-2">
                  {EMOJIS.map(emoji => (
                    <button key={emoji} onClick={() => addEmoji(emoji)} className="p-1 hover:bg-gray-100 rounded text-xl transition-colors">{emoji}</button>
                  ))}
                </div>
            </div>
          )}
          
          {showSlashMenu && (
            <div className="absolute bottom-full mb-2 left-4 bg-white shadow-xl rounded-xl border border-gray-200 w-72 z-20 max-h-60 overflow-y-auto animate-in slide-in-from-bottom-2 duration-200">
              <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 text-xs font-bold text-gray-500 uppercase">Quick Replies</div>
              {systemQuickReplies.filter(r => r.label.toLowerCase().includes(slashFilter.toLowerCase()) || r.text.toLowerCase().includes(slashFilter.toLowerCase())).map(reply => (
                <button key={reply.id} onClick={() => insertSlashCommand(reply.text)} className="w-full text-left px-4 py-2 hover:bg-blue-50 flex flex-col gap-0.5 border-b border-gray-50 last:border-0">
                  <span className="text-sm font-semibold text-gray-800">{reply.label}</span>
                  <span className="text-xs text-gray-500 truncate">{reply.text}</span>
                </button>
              ))}
            </div>
          )}

          {showMentionMenu && (
             <div className="absolute bottom-full mb-2 left-10 bg白 shadow-xl rounded-xl border border-gray-200 w-64 z-20 max-h-60 overflow-y-auto animate-in slide-in-from-bottom-2 duration-200">
               <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 text-xs font-bold text-gray-500 uppercase">Mention Agent</div>
               {(mentionLoading ? [] : mentionableAgents).filter(a => a.name.toLowerCase().includes(mentionFilter.toLowerCase())).map(agent => (
                 <button key={agent.id} onClick={() => insertMention(agent)} className="w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center gap-3 border-b border-gray-50 last:border-0">
                   <Avatar name={agent.name} src={agent.avatar} size={24} />
                   <span className="text-sm font-semibold text-gray-800">{agent.name}</span>
                 </button>
               ))}
               {(!mentionLoading && (mentionableAgents.filter(a => a.name.toLowerCase().includes(mentionFilter.toLowerCase())).length === 0)) && (
                 <div className="p-3 text-xs text-gray-400 text-center">No agents found</div>
               )}
               {mentionLoading && (
                  <div className="p-3 text-xs text-gray-400 text-center">Loading...</div>
               )}
             </div>
          )}
      </div>
      
      <div className={`p-4 border-t border-gray-200 shrink-0 transition-colors duration-300 ${isInternalMode || mentionedAgents.length > 0 ? 'bg-yellow-50' : 'bg-white'} ${isZenMode ? 'flex justify-center' : ''} relative z-10`}>
           <div className={`${isZenMode ? 'w-full max-w-3xl' : 'w-full'}`}>
             {(isInternalMode || mentionedAgents.length > 0) && (<div className="flex items-center gap-2 mb-2 text-yellow-700 text-xs font-bold animate-in slide-in-from-bottom-2"><EyeOff size={14} /> Internal Whisper Mode Active (User cannot see this)</div>)}
             
             {attachments.length > 0 && (
                <div className="flex gap-3 mb-3 overflow-x-auto pb-2 px-1">
                    {attachments.map(att => (
                        <div key={att.id} className="relative group shrink-0">
                            {att.type === 'IMAGE' ? (<img src={att.url} alt="preview" className="h-16 w-16 object-cover rounded-lg border border-gray-200 shadow-sm" />) : (<div className="h-16 w-16 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200 shadow-sm"><FileTextIcon size={24} className="text-gray-500" /></div>)}
                            <button onClick={() => removeAttachment(att.id)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-md hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                        </div>
                    ))}
                </div>
             )}

            <div className={`relative rounded-2xl border transition-all duration-300 ease-out ${isInternalMode || mentionedAgents.length > 0 ? 'bg-white border-yellow-300 shadow-[0_0_0_4px_rgba(234,179,8,0.1)]' : 'bg-gray-50 border-gray-200 focus-within:bg-white focus-within:border-blue-300 focus-within:shadow-[0_0_0_4px_rgba(59,130,246,0.1)]'}`}>
                <textarea 
                    ref={textareaRef} 
                    rows={1} 
                    disabled={isRewriting || isResolved} 
                    className={`w-full focus:ring-0 outline-none resize-none overflow-y-auto min-h-[48px] max-h-48 caret-blue-500 bg-transparent text-sm leading-6 p-3 pb-12`}
                    value={inputText} 
                    onChange={handleInputChange} 
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder={placeholderText}
                />
                
                {mentionedAgents.length > 0 && (
                    <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 max-w-[calc(100%-150px)]">
                        {mentionedAgents.map(agent => (
                            <div key={agent.id} className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1.5 animate-in zoom-in-50 duration-200">
                                <Avatar name={agent.name} src={agent.avatar} size={16} />
                                <span>{agent.name}</span>
                                <button onClick={() => removeMention(agent.id)} className="text-blue-500 hover:text-blue-700">
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="absolute bottom-2 right-2 flex items-center gap-1">
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
                    
                    <div className="flex items-center gap-0.5 mr-2 bg-gray-100 rounded-lg p-1">
                        <button onClick={() => fileInputRef.current?.click()} className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-white rounded-md transition-all" title="Attach File"><Paperclip size={16} /></button>
                        <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} disabled={isResolved} className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-white rounded-md transition-all" title="Emoji"><Smile size={16} /></button>
                        
                        <div className="w-px h-4 bg-gray-300 mx-1"></div>
                        
                        <button onClick={() => setIsInternalMode(!isInternalMode)} disabled={isResolved || mentionedAgents.length > 0} className={`p-1.5 rounded-md transition-all ${isInternalMode || mentionedAgents.length > 0 ? 'text-yellow-600 bg-yellow-100' : 'text-gray-500 hover:text-gray-700 hover:bg-white'}`} title="Internal Whisper Mode"><EyeOff size={16} /></button>
                        {!isInternalMode && inputText.trim().length > 3 && (
                            <button onClick={handleMagicRewrite} disabled={isRewriting || isResolved} className="p-1.5 rounded-md text-purple-500 hover:bg-purple-100 hover:text-purple-700 transition-all" title="Magic Rewrite"><Wand2 size={16} /></button>
                        )}
                    </div>

                    <button 
                        onClick={handleSend} 
                        disabled={(!inputText.trim() && attachments.length === 0 && mentionedAgents.length === 0) || isRewriting || isResolved} 
                        className={`p-2 rounded-xl transition-all flex items-center justify-center ${(inputText.trim() || attachments.length > 0 || mentionedAgents.length > 0) ? (isInternalMode || mentionedAgents.length > 0 ? 'bg-yellow-600 text-white shadow-md hover:bg-yellow-700' : 'bg-blue-600 text-white shadow-md hover:bg-blue-700') : 'bg-gray-200 text-gray-400'}`}
                    >
                        {isRewriting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                </div>
            </div>
         </div>
      </div>
    </div>
  );
};
