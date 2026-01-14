import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalPlatform } from '../../types/platform';
import { platformApi } from '../../services/platformApi';
import { Plus, Edit, Trash2, Globe, Power, PowerOff } from 'lucide-react';
import { CreatePlatformDialog } from './CreatePlatformDialog';

export const PlatformView: React.FC = () => {
  const { t } = useTranslation();
  const [platforms, setPlatforms] = useState<ExternalPlatform[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<ExternalPlatform | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPlatforms();
  }, []);

  const loadPlatforms = async () => {
    setLoading(true);
    try {
      const data = await platformApi.getAllPlatforms();
      setPlatforms(data);
    } catch (error) {
      console.error('Failed to load platforms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlatform = async (id: string, name: string) => {
    if (!window.confirm(t('delete_confirm'))) return;
    try {
      await platformApi.deletePlatform(id);
      loadPlatforms();
    } catch (error) {
      console.error('Failed to delete platform:', error);
      alert(t('delete_failed'));
    }
  };

  const handleEditPlatform = (platform: ExternalPlatform) => {
    setEditingPlatform(platform);
    setIsCreateDialogOpen(true);
  };

  const handleCreatePlatform = () => {
    setEditingPlatform(null);
    setIsCreateDialogOpen(true);
  };

  const handleSuccess = () => {
    loadPlatforms();
    setIsCreateDialogOpen(false);
    setEditingPlatform(null);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto w-full relative animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Globe className="text-blue-600" /> {t('external_platforms')}
        </h2>
        <button 
          onClick={handleCreatePlatform} 
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
        >
          <Plus size={16} /> {t('create_platform_config')}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase">{t('name')}</th>
              <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase">{t('type_label')}</th>
              <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase">{t('auth_type')}</th>
              <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase">{t('status')}</th>
              <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase">{t('table_updated')}</th>
              <th className="text-right py-3 px-6 text-xs font-semibold text-gray-500 uppercase">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
               <tr>
                 <td colSpan={6} className="py-8 text-center text-gray-500">{t('loading_configurations')}</td>
               </tr>
            ) : platforms.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500">{t('not_configured')}</td>
              </tr>
            ) : (
              platforms.map(platform => (
                <tr key={platform.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="py-4 px-6">
                    <div className="font-medium text-gray-900">{platform.name}</div>
                    {platform.displayName && <div className="text-xs text-gray-500">{platform.displayName}</div>}
                  </td>
                  <td className="py-4 px-6 text-gray-600">
                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium border border-blue-100">
                      {platform.platformType}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-gray-600 text-sm">{platform.authType}</td>
                  <td className="py-4 px-6">
                    {platform.enabled ? (
                      <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                        <Power size={14} /> {t('enabled')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-400 text-sm font-medium">
                        <PowerOff size={14} /> {t('disabled')}
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-gray-600 text-sm">
                    {new Date(platform.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleEditPlatform(platform)} 
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title={t('edit')}
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeletePlatform(platform.id, platform.name)} 
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title={t('delete')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CreatePlatformDialog
        isOpen={isCreateDialogOpen}
        onClose={() => {
          setIsCreateDialogOpen(false);
          setEditingPlatform(null);
        }}
        onSuccess={handleSuccess}
        mode={editingPlatform ? 'edit' : 'create'}
        initialValues={editingPlatform || undefined}
      />
    </div>
  );
};
