import React, { useState, useEffect } from 'react';
import { MessageCircle, BarChart, Users, Settings, LogOut, Check, User, UserCircle, GitBranch, Languages, Loader2, ChevronRight, ChevronLeft, Search } from 'lucide-react';
import { Agent } from '../types';
import { getSupportedLanguages, Language } from '../services/translationService';
import { updateAgent } from '../services/adminService';

interface MobileNavProps {
  activeView: 'DASHBOARD' | 'INBOX' | 'TEAM' | 'CUSTOMERS' | 'ANALYTICS' | 'SETTINGS' | 'WORKFLOW';
  setActiveView: (view: 'DASHBOARD' | 'INBOX' | 'TEAM' | 'CUSTOMERS' | 'ANALYTICS' | 'SETTINGS' | 'WORKFLOW') => void;
  currentUser: Agent | null;
  showProfileMenu: boolean;
  setShowProfileMenu: (show: boolean) => void;
  currentUserStatus: 'ONLINE' | 'BUSY' | 'IDLE';
  handleStatusChange: (status: 'ONLINE' | 'BUSY' | 'IDLE') => void;
  handleLogout: () => void;
  onLanguageChange?: (lang: string) => void;
  hasPermission?: (permissionKey: string) => boolean;
  isShopifyEmbedded?: boolean;
  onSwitchAgent?: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeView,
  setActiveView,
  currentUser,
  showProfileMenu,
  setShowProfileMenu,
  currentUserStatus,
  handleStatusChange,
  handleLogout,
  onLanguageChange,
  hasPermission,
  isShopifyEmbedded,
  onSwitchAgent
}) => {
  const { t } = useTranslation();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [isLanguagesLoading, setIsLanguagesLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(currentUser?.language || '');
  const [menuView, setMenuView] = useState<'MAIN' | 'LANGUAGES'>('MAIN');
  const [languageSearch, setLanguageSearch] = useState('');

  useEffect(() => {
    setSelectedLanguage(currentUser?.language || '');
  }, [currentUser?.language]);

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

  if (!currentUser) {
    return null;
  }

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-gray-900 flex items-center justify-between px-6 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
      <button onClick={() => setActiveView('INBOX')} className={`p-2 rounded-xl transition-all ${activeView === 'INBOX' ? 'text-blue-500' : 'text-gray-400'}`}><MessageCircle size={24} /></button>
      {(!hasPermission || hasPermission('accessCustomerManagement')) && (
        <button onClick={() => setActiveView('CUSTOMERS')} className={`p-2 rounded-xl transition-all ${activeView === 'CUSTOMERS' ? 'text-blue-500' : 'text-gray-400'}`}><UserCircle size={24} /></button>
      )}
      {(!hasPermission || hasPermission('manageTeam')) && (
        <button onClick={() => setActiveView('TEAM')} className={`p-2 rounded-xl transition-all ${activeView === 'TEAM' ? 'text-blue-500' : 'text-gray-400'}`}><Users size={24} /></button>
      )}
      {(!hasPermission || hasPermission('designWorkflow')) && (
        <button onClick={() => setActiveView('WORKFLOW')} className={`p-2 rounded-xl transition-all ${activeView === 'WORKFLOW' ? 'text-blue-500' : 'text-gray-400'}`}><GitBranch size={24} /></button>
      )}
      {(!hasPermission || hasPermission('accessSystemStatistics')) && (
        <button onClick={() => setActiveView('ANALYTICS')} className={`p-2 rounded-xl transition-all ${activeView === 'ANALYTICS' ? 'text-blue-500' : 'text-gray-400'}`}><BarChart size={24} /></button>
      )}
      <button onClick={() => setActiveView('SETTINGS')} className={`p-2 rounded-xl transition-all ${activeView === 'SETTINGS' ? 'text-blue-500' : 'text-gray-400'}`}><Settings size={24} /></button>
      
      <div className="relative">
         <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="relative block outline-none">
          {currentUser.avatar ? (
            <img src={currentUser.avatar} className={`w-8 h-8 rounded-full border-2 object-cover ${currentUserStatus === 'ONLINE' ? 'border-green-500' : currentUserStatus === 'BUSY' ? 'border-yellow-500' : 'border-gray-500'}`} alt="Profile" />
          ) : (
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center bg-gray-800 ${currentUserStatus === 'ONLINE' ? 'border-green-500' : currentUserStatus === 'BUSY' ? 'border-yellow-500' : 'border-gray-500'}`}>
              <User size={16} className="text-gray-500" />
            </div>
          )}
           <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-gray-900 ${currentUserStatus === 'ONLINE' ? 'bg-green-500' : currentUserStatus === 'BUSY' ? 'bg-yellow-500' : 'bg-gray-500'}`}></div>
         </button>

         {showProfileMenu && (
           <div className="absolute bottom-14 right-0 mb-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-in slide-in-from-bottom-2 duration-200 flex flex-col max-h-[480px]">
             {menuView === 'MAIN' ? (
               <>
                 <div className="p-4 border-b border-gray-100 bg-gray-50"><p className="font-bold text-gray-800">{currentUser.name}</p><p className="text-xs text-gray-500">{currentUser.email || t('no_email_provided')}</p></div>
                 <div className="p-2 space-y-1">
                    <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">{t('set_status_title')}</div>
                    <button onClick={() => handleStatusChange('ONLINE')} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg text-sm text-gray-700"><div className="w-2.5 h-2.5 rounded-full bg-green-500"></div> {t('status_online')}{currentUserStatus === 'ONLINE' && <Check size={14} className="ml-auto text-green-600"/>}</button>
                    <button onClick={() => handleStatusChange('BUSY')} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg text-sm text-gray-700"><div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div> {t('status_busy')}{currentUserStatus === 'BUSY' && <Check size={14} className="ml-auto text-yellow-600"/>}</button>
                    <button onClick={() => handleStatusChange('IDLE')} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg text-sm text-gray-700"><div className="w-2.5 h-2.5 rounded-full bg-gray-400"></div> {t('status_idle')}{currentUserStatus === 'IDLE' && <Check size={14} className="ml-auto text-gray-500"/>}</button>
                 </div>
                 <div className="p-2 space-y-1 border-t border-gray-100">
                    {isShopifyEmbedded && onSwitchAgent && (
                      <button 
                        onClick={() => {
                          if (onSwitchAgent) {
                            onSwitchAgent();
                            setShowProfileMenu(false);
                          }
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg text-sm text-gray-700 group"
                      >
                         <Users size={16} className="text-gray-500 group-hover:text-blue-500"/>
                         <div className="flex-1 text-left">
                           <div className="text-xs text-gray-500">{t('switch_agent')}</div>
                           <div className="font-medium truncate">{t('switch_agent_desc')}</div>
                         </div>
                         <ChevronRight size={16} className="text-gray-400"/>
                      </button>
                    )}
                    <button 
                      onClick={() => setMenuView('LANGUAGES')}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg text-sm text-gray-700 group"
                    >
                       <Languages size={16} className="text-gray-500 group-hover:text-blue-500"/>
                       <div className="flex-1 text-left">
                         <div className="text-xs text-gray-500">{t('language_label')}</div>
                         <div className="font-medium truncate">{languages.find(l => l.code === selectedLanguage)?.name || t('select_language_title')}</div>
                       </div>
                       <ChevronRight size={16} className="text-gray-400"/>
                    </button>
                 </div>
                 <div className="p-2 border-t border-gray-100 mt-auto"><button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"><LogOut size={16} /> {t('sign_out_button')}</button></div>
               </>
             ) : (
               <>
                 <div className="p-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                   <button onClick={() => setMenuView('MAIN')} className="p-1 hover:bg-gray-200 rounded-lg transition-colors">
                     <ChevronLeft size={18} className="text-gray-600"/>
                   </button>
                   <span className="font-bold text-gray-800 text-sm">{t('select_language_title')}</span>
                 </div>
                 <div className="p-2 border-b border-gray-100">
                   <div className="relative">
                     <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                     <input 
                       type="text" 
                       placeholder={t('search_language_placeholder')} 
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
                         <Loader2 size={16} className="animate-spin" /> {t('loading_languages')}
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
                      <div className="py-8 text-center text-gray-400 text-xs">{t('no_languages_found')}</div>
                   )}
                 </div>
               </>
             )}
           </div>
         )}
      </div>
    </div>
  );
};
