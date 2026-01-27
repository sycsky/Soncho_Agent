import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Agent } from '../types';
import sessionService from '../services/sessionService';
import Avatar from './Avatar';

interface TransferDialogProps {
  sessionId: string;
  isOpen: boolean;
  currentUserId: string;
  currentPrimaryAgentId: string;
  onClose: () => void;
  onTransferred: () => void;
}

const TransferDialog: React.FC<TransferDialogProps> = ({
  sessionId,
  isOpen,
  currentUserId,
  currentPrimaryAgentId,
  onClose,
  onTransferred,
}) => {
  const { t } = useTranslation();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [keepAsSupport, setKeepAsSupport] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedAgentId('');
    setKeepAsSupport(false);
    setError(null);
    // 权限校验：仅主要负责人可转移
    if (currentUserId !== currentPrimaryAgentId) {
      setError(t('transfer_permission_denied'));
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const list = await sessionService.getTransferableAgents(sessionId);
        setAgents(list.filter(a => a.id !== currentPrimaryAgentId));
      } catch (e) {
        setError(t('fetch_agents_failed'));
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, sessionId, currentUserId, currentPrimaryAgentId, t]);

  const handleTransfer = async () => {
    if (!selectedAgentId) return;
    try {
      setLoading(true);
      await sessionService.transferSession(sessionId, selectedAgentId, keepAsSupport);
      onTransferred();
      onClose();
    } catch (e) {
      setError(t('transfer_failed'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[990]" onClick={onClose} />
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800">{t('transfer_session_title')}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button>
          </div>

          <div className="p-4 space-y-3">
            {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded p-2">{error}</div>}
            {loading ? (
              <div className="text-xs text-gray-500">{t('loading')}</div>
            ) : (
              <>
                <div className="text-xs text-gray-500">{t('select_target_agent')}</div>
                <div className="max-h-56 overflow-y-auto space-y-2">
                  {agents.map(a => (
                    <button
                      key={a.id}
                      onClick={() => setSelectedAgentId(a.id)}
                      className={`w-full flex items-center gap-3 p-2 rounded border transition-colors ${selectedAgentId === a.id ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                      <Avatar name={a.name} src={a.avatarUrl} size={28} />
                      <div className="flex-1 text-left">
                        <div className="text-sm font-semibold text-gray-800">{a.name}</div>
                      </div>
                    </button>
                  ))}
                  {agents.length === 0 && (
                    <div className="text-xs text-gray-400">{t('no_agents_available')}</div>
                  )}
                </div>

                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input type="checkbox" checked={keepAsSupport} onChange={e => setKeepAsSupport(e.target.checked)} />
                  {t('keep_as_support')}
                </label>
              </>
            )}
          </div>

          <div className="px-4 py-3 border-t border-gray-100 flex justify-end gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200">{t('cancel')}</button>
            <button onClick={handleTransfer} disabled={!selectedAgentId || !!error || loading} className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">{t('confirm_transfer')}</button>
          </div>
        </div>
      </div>
    </>
  );
};

export default TransferDialog;
