import React from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, WifiOff } from 'lucide-react';

interface GlobalErrorOverlayProps {
  onRefresh: () => void;
}

export const GlobalErrorOverlay: React.FC<GlobalErrorOverlayProps> = ({ onRefresh }) => {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2147483647] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 text-center animate-in fade-in zoom-in duration-300">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <WifiOff className="w-8 h-8 text-red-600" />
        </div>
        
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {t('connection_lost_title', 'Connection Lost')}
        </h2>
        
        <p className="text-gray-500 mb-8">
          {t('connection_lost_message', 'Connection to the server has been lost. Please refresh the page to reconnect.')}
        </p>
        
        <button
          onClick={onRefresh}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
          {t('refresh_page', 'Refresh Page')}
        </button>
      </div>
    </div>
  );
};
