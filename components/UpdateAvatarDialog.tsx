import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Loader2, Image, User } from 'lucide-react';
import { authService } from '../services/authService';
import { toast } from 'sonner';
import fileService from '../services/fileService';

interface UpdateAvatarDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newAvatarUrl: string) => void;
  currentAvatarUrl?: string;
  currentUserId: string;
}

export const UpdateAvatarDialog: React.FC<UpdateAvatarDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentAvatarUrl,
  currentUserId
}) => {
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(currentAvatarUrl || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedFile(null);
    setPreviewUrl(currentAvatarUrl || '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, [currentAvatarUrl, isOpen]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    const nextUrl = URL.createObjectURL(file);
    objectUrlRef.current = nextUrl;
    setSelectedFile(file);
    setPreviewUrl(nextUrl);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selectedFile) {
      setError(t('avatar_file_required'));
      return;
    }
    setIsLoading(true);

    try {
      const uploadResponse = await fileService.uploadFile(selectedFile, currentUserId, 'AVATAR', true);
      await authService.updateProfile({ avatarUrl: uploadResponse.url });
      toast.success(t('avatar_updated'));
      onSuccess(uploadResponse.url);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('upload_failed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Image size={20} />
            </div>
            <h2 className="text-lg font-bold text-gray-800">{t('update_avatar_title')}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full border-2 border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
              {previewUrl ? (
                <img src={previewUrl} alt={t('update_avatar_title')} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '' }} />
              ) : (
                <User size={32} className="text-gray-400" />
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">{t('avatar_choose_file')}</label>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-50 rounded-xl transition-colors"
              >
                {t('cancel')}
              </button>
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
