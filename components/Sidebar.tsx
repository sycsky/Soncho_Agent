import React, { useState, useEffect } from 'react';
import { MessageCircle, BarChart, Users, Settings, LogOut, Check, User, UserCircle, GitBranch, Languages, Loader2, ChevronRight, ChevronLeft, Search } from 'lucide-react';
import { Agent } from '../types';
import { getSupportedLanguages, Language } from '../services/translationService';
import { updateAgent } from '../services/adminService';

interface SidebarProps {
  activeView: 'DASHBOARD' | 'INBOX' | 'TEAM' | 'CUSTOMERS' | 'ANALYTICS' | 'SETTINGS' | 'WORKFLOW';
  setActiveView: (view: 'DASHBOARD' | 'INBOX' | 'TEAM' | 'CUSTOMERS' | 'ANALYTICS' | 'SETTINGS' | 'WORKFLOW') => void;
  currentUser: Agent;
  showProfileMenu: boolean;
  setShowProfileMenu: (show: boolean) => void;
  currentUserStatus: 'ONLINE' | 'BUSY' | 'IDLE';
  handleStatusChange: (status: 'ONLINE' | 'BUSY' | 'IDLE') => void;
  handleLogout: () => void;
  onLanguageChange?: (lang: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  currentUser,
  showProfileMenu,
  setShowProfileMenu,
  currentUserStatus,
  handleStatusChange,
  handleLogout,
  onLanguageChange
}) => {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [isLanguagesLoading, setIsLanguagesLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(currentUser.language || '');
  const [menuView, setMenuView] = useState<'MAIN' | 'LANGUAGES'>('MAIN');
  const [languageSearch, setLanguageSearch] = useState('');

  useEffect(() => {
    setSelectedLanguage(currentUser.language || '');
    if (currentUser.language) {
      localStorage.setItem('agent_language', currentUser.language);
    }
  }, [currentUser.language]);

  useEffect(() => {
    if (!showProfileMenu) {
      setMenuView('MAIN');
      setLanguageSearch('');
    }
  }, [showProfileMenu]);

  useEffect(() => {
    if (showProfileMenu) {
      setIsLanguagesLoading(true);
      getSupportedLanguages()
        .then(setLanguages)
        .catch(console.error)
        .finally(() => setIsLanguagesLoading(false));
    }
  }, [showProfileMenu]);

  const handleLanguageChange = async (langCode: string) => {
    setSelectedLanguage(langCode);
    localStorage.setItem('agent_language', langCode);
    if (onLanguageChange) {
      onLanguageChange(langCode);
    }
    try {
      await updateAgent(currentUser.id, { language: langCode });
    } catch (error) {
      console.error("Failed to update language", error);
      setSelectedLanguage(currentUser.language || '');
    }
  };

  return (
    <div className="w-16 h-full bg-gray-900 flex flex-col items-center py-6 gap-8 z-20 shadow-xl shrink-0 transition-all duration-300">
      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-900/50">N</div>
      <nav className="flex flex-col gap-6 w-full">
        <button onClick={() => setActiveView('INBOX')} className={`p-3 mx-auto rounded-xl transition-all ${activeView === 'INBOX' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`} title="会话"><MessageCircle size={24} /></button>
        <button onClick={() => setActiveView('CUSTOMERS')} className={`p-3 mx-auto rounded-xl transition-all ${activeView === 'CUSTOMERS' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`} title="客户"><UserCircle size={24} /></button>
        <button onClick={() => setActiveView('TEAM')} className={`p-3 mx-auto rounded-xl transition-all ${activeView === 'TEAM' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`} title="团队"><Users size={24} /></button>
        <button onClick={() => setActiveView('WORKFLOW')} className={`p-3 mx-auto rounded-xl transition-all ${activeView === 'WORKFLOW' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`} title="工作流"><GitBranch size={24} /></button>
        <button onClick={() => setActiveView('ANALYTICS')} className={`p-3 mx-auto rounded-xl transition-all ${activeView === 'ANALYTICS' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`} title="统计"><BarChart size={24} /></button>
      </nav>
      <div className="mt-auto flex flex-col items-center gap-6 pb-6 relative">
        <button onClick={() => setActiveView('SETTINGS')} className={`p-2 transition-all rounded-lg ${activeView === 'SETTINGS' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}><Settings size={24} /></button>
        <div className="relative">
           <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="relative block outline-none transition-transform hover:scale-105">
            {currentUser.avatar ? (
              <img src={currentUser.avatar} className={`w-10 h-10 rounded-full border-2 object-cover ${currentUserStatus === 'ONLINE' ? 'border-green-500' : currentUserStatus === 'BUSY' ? 'border-yellow-500' : 'border-gray-500'}`} alt="Profile" />
            ) : (
              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center bg-gray-800 ${currentUserStatus === 'ONLINE' ? 'border-green-500' : currentUserStatus === 'BUSY' ? 'border-yellow-500' : 'border-gray-500'}`}>
                <User size={24} className="text-gray-500" />
              </div>
            )}
             <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-900 ${currentUserStatus === 'ONLINE' ? 'bg-green-500' : currentUserStatus === 'BUSY' ? 'bg-yellow-500' : 'bg-gray-500'}`}></div>
           </button>
           {showProfileMenu && (
             <div className="absolute bottom-0 left-14 ml-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-in slide-in-from-left-2 duration-200 flex flex-col max-h-[480px]">
               {menuView === 'MAIN' ? (
                 <>
                   <div className="p-4 border-b border-gray-100 bg-gray-50"><p className="font-bold text-gray-800">{currentUser.name}</p><p className="text-xs text-gray-500">{currentUser.email || 'No email provided'}</p></div>
                   <div className="p-2 space-y-1">
                      <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Set Status</div>
                      <button onClick={() => handleStatusChange('ONLINE')} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg text-sm text-gray-700"><div className="w-2.5 h-2.5 rounded-full bg-green-500"></div> Online{currentUserStatus === 'ONLINE' && <Check size={14} className="ml-auto text-green-600"/>}</button>
                      <button onClick={() => handleStatusChange('BUSY')} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg text-sm text-gray-700"><div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div> Busy{currentUserStatus === 'BUSY' && <Check size={14} className="ml-auto text-yellow-600"/>}</button>
                      <button onClick={() => handleStatusChange('IDLE')} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg text-sm text-gray-700"><div className="w-2.5 h-2.5 rounded-full bg-gray-400"></div> Idle / Away{currentUserStatus === 'IDLE' && <Check size={14} className="ml-auto text-gray-500"/>}</button>
                   </div>
                   <div className="p-2 space-y-1 border-t border-gray-100">
                      <button 
                        onClick={() => setMenuView('LANGUAGES')}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg text-sm text-gray-700 group"
                      >
                         <Languages size={16} className="text-gray-500 group-hover:text-blue-500"/>
                         <div className="flex-1 text-left">
                           <div className="text-xs text-gray-500">Language</div>
                           <div className="font-medium truncate">{languages.find(l => l.code === selectedLanguage)?.name || 'Select Language'}</div>
                         </div>
                         <ChevronRight size={16} className="text-gray-400"/>
                      </button>
                   </div>
                   <div className="p-2 border-t border-gray-100 mt-auto"><button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"><LogOut size={16} /> Sign Out</button></div>
                 </>
               ) : (
                 <>
                   <div className="p-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                     <button onClick={() => setMenuView('MAIN')} className="p-1 hover:bg-gray-200 rounded-lg transition-colors">
                       <ChevronLeft size={18} className="text-gray-600"/>
                     </button>
                     <span className="font-bold text-gray-800 text-sm">Select Language</span>
                   </div>
                   <div className="p-2 border-b border-gray-100">
                     <div className="relative">
                       <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                       <input 
                         type="text" 
                         placeholder="Search language..." 
                         value={languageSearch}
                         onChange={(e) => setLanguageSearch(e.target.value)}
                         className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                         autoFocus
                       />
                     </div>
                   </div>
                   <div className="overflow-y-auto p-1 max-h-[300px]">
                     {isLanguagesLoading ? (
                        <div className="flex items-center justify-center py-8 text-gray-500 gap-2">
                           <Loader2 size={16} className="animate-spin" /> Loading...
                        </div>
                     ) : (
                       languages
                         .filter(l => l.name.toLowerCase().includes(languageSearch.toLowerCase()))
                         .map(lang => (
                           <button 
                             key={lang.code} 
                             onClick={() => {
                               handleLanguageChange(lang.code);
                               setMenuView('MAIN');
                             }}
                             className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${selectedLanguage === lang.code ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'}`}
                           >
                             <span className="flex-1 text-left">{lang.name}</span>
                             {selectedLanguage === lang.code && <Check size={14} className="text-blue-600"/>}
                           </button>
                         ))
                     )}
                     {!isLanguagesLoading && languages.filter(l => l.name.toLowerCase().includes(languageSearch.toLowerCase())).length === 0 && (
                        <div className="py-8 text-center text-gray-400 text-xs">No languages found</div>
                     )}
                   </div>
                 </>
               )}
             </div>
           )}
        </div>
      </div>
    </div>
  );
};
