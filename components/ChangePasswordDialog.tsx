import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Loader2, Lock } from 'lucide-react';
import { authService } from '../services/authService';
import { toast } from 'sonner';

interface ChangePasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  forced?: boolean;
  defaultOldPassword?: string;
}

export const ChangePasswordDialog: React.FC<ChangePasswordDialogProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  forced = false, 
  defaultOldPassword 
}) => {
  const { t } = useTranslation();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError(t('password_mismatch'));
      return;
    }

    setIsLoading(true);
    try {
      await authService.changePassword({
        oldPassword: forced && defaultOldPassword ? defaultOldPassword : oldPassword,
        newPassword
      });
      toast.success(t('password_updated'));
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('unknown_error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Lock size={20} />
            </div>
            <h2 className="text-lg font-bold text-gray-800">{t('change_password_title')}</h2>
          </div>
          {!forced && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg">
              <X size={20} />
            </button>
          )}
        </div>

        <div className="p-6">
          {forced && (
            <div className="mb-6 bg-yellow-50 border border-yellow-100 rounded-xl p-4 text-sm text-yellow-800 flex gap-3">
              <div className="shrink-0 mt-0.5 text-yellow-500">
                <Lock size={16} />
              </div>
              {t('change_password_reason')}
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {(!forced || !defaultOldPassword) && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">{t('current_password')}</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">{t('new_password')}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">{t('confirm_password')}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                required
              />
            </div>

            <div className="pt-4 flex items-center justify-end gap-3">
              {!forced && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-50 rounded-xl transition-colors"
                >
                  {t('cancel')}
                </button>
              )}
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading && <Loader2 size={16} className="animate-spin" />}
                {t('save_changes')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
