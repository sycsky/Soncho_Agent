import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Role } from '../types';
import { getRoles, createRole, updateRole, deleteRole, CreateRoleRequest, UpdateRoleRequest } from '../services/adminService';
import { Plus, Edit, Trash2, X } from 'lucide-react';

// 权限定义
const PERMISSION_KEYS = [
  'setReadInfo',
  'setCancellationPolicy',
  'manageKnowledgeBaseSetting',
  'accessCustomerManagement',
  'manageTeam',
  'accessSystemStatistics',
  'designWorkflow',
  'accessRoleConfig',
  'accessAiTools',
  'accessBilling'
] as const;

const RoleForm: React.FC<{ role?: Role; onSave: (data: CreateRoleRequest | UpdateRoleRequest) => void; onCancel: () => void; }> = ({ role, onSave, onCancel }) => {
  const { t } = useTranslation();
  const [name, setName] = useState(role?.name || '');
  const [description, setDescription] = useState(role?.description || '');
  
  // 权限状态，使用Map格式
  const [permissions, setPermissions] = useState<Record<string, boolean>>(() => {
    if (role?.permissions) {
      // 确保所有权限键都有值
      const perms: Record<string, boolean> = {};
      PERMISSION_KEYS.forEach(key => {
        perms[key] = role.permissions[key] === true;
      });
      return perms;
    }
    // 默认所有权限为false
    const defaultPerms: Record<string, boolean> = {};
    PERMISSION_KEYS.forEach(key => {
      defaultPerms[key] = false;
    });
    return defaultPerms;
  });

  const togglePermission = (key: string) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (role) {
      // 更新角色，使用Map格式
      onSave({ name, description, permissions });
    } else {
      // 创建角色，转换为string[]
      const permArray = Object.keys(permissions).filter(key => permissions[key]);
      onSave({ name, description, permissions: permArray });
    }
  };

  const getPermissionLabel = (key: string) => {
    const labels: Record<string, string> = {
      'setReadInfo': t('permission_set_read_info_label'),
      'setCancellationPolicy': t('permission_set_cancellation_policy_label'),
      'manageKnowledgeBaseSetting': t('permission_manage_knowledge_base_setting_label'),
      'accessCustomerManagement': t('permission_access_customer_management_label'),
      'manageTeam': t('permission_manage_team_label'),
      'accessSystemStatistics': t('permission_access_system_statistics_label'),
      'designWorkflow': t('permission_design_workflow_label'),
      'accessRoleConfig': t('permission_access_role_config_label'),
      'accessAiTools': t('permission_access_ai_tools_label'),
      'accessBilling': t('permission_access_billing_label'),
    };
    return labels[key] || key;
  };

  const getPermissionDesc = (key: string) => {
    const descs: Record<string, string> = {
      'setReadInfo': t('permission_set_read_info_desc'),
      'setCancellationPolicy': t('permission_set_cancellation_policy_desc'),
      'manageKnowledgeBaseSetting': t('permission_manage_knowledge_base_setting_desc'),
      'accessCustomerManagement': t('permission_access_customer_management_desc'),
      'manageTeam': t('permission_manage_team_desc'),
      'accessSystemStatistics': t('permission_access_system_statistics_desc'),
      'designWorkflow': t('permission_design_workflow_desc'),
      'accessRoleConfig': t('permission_access_role_config_desc'),
      'accessAiTools': t('permission_access_ai_tools_desc'),
      'accessBilling': t('permission_access_billing_desc'),
    };
    return descs[key] || '';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">{role ? t('edit_role_title') : t('add_new_role_title')}</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">{t('name')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">{t('description')}</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">{t('permissions_table_title')}</label>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">{t('permissions_table_header_permission')}</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">{t('permissions_table_header_desc')}</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-700 uppercase">{t('permissions_table_header_enable')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {PERMISSION_KEYS.map((key) => (
                    <tr key={key} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{getPermissionLabel(key)}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{getPermissionDesc(key)}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => togglePermission(key)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            permissions[key] ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              permissions[key] ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex justify-end gap-4">
            <button type="button" onClick={onCancel} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">{t('cancel')}</button>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">{t('save')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const RoleView: React.FC = () => {
  const { t } = useTranslation();
  const [roles, setRoles] = useState<Role[]>([]);
  const [editingRole, setEditingRole] = useState<Role | undefined>(undefined);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const roleData = await getRoles();
      setRoles(roleData);
    } catch (error) {
      // Error already handled by API service
    }
  };

  const handleSaveRole = async (data: CreateRoleRequest | UpdateRoleRequest) => {
    try {
      if (editingRole) {
        await updateRole(editingRole.id, data as UpdateRoleRequest);
      } else {
        await createRole(data as CreateRoleRequest);
      }
      fetchRoles();
    } catch (error) {
      // Error already handled by API service
    } finally {
      setEditingRole(undefined);
      setIsCreating(false);
    }
  };

  const handleDeleteRole = async (id: string) => {
    if (window.confirm(t('delete_role_confirm'))) {
      try {
        await deleteRole(id);
        fetchRoles();
      } catch (error) {
        // Error already handled by API service
      }
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto w-full relative animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{t('role_management_title')}</h2>
        <button onClick={() => setIsCreating(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
          <Plus size={16} />
          {t('add_role_button')}
        </button>
      </div>

      {(isCreating || editingRole) && (
        <RoleForm 
          role={editingRole}
          onSave={handleSaveRole} 
          onCancel={() => { setIsCreating(false); setEditingRole(undefined); }} 
        />
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase">{t('name')}</th>
              <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase">{t('description')}</th>
              <th className="text-right py-3 px-6 text-xs font-semibold text-gray-500 uppercase">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {roles.map(role => (
              <tr key={role.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="py-4 px-6 font-medium text-gray-900">{role.name}</td>
                <td className="py-4 px-6 text-gray-600">{role.description || '-'}</td>
                <td className="py-4 px-6 text-right">
                  {!role.isSystem && (
                    <>
                      <button onClick={() => setEditingRole(role)} className="text-blue-600 hover:text-blue-800 text-sm font-medium mr-4"><Edit size={16} /></button>
                      <button onClick={() => handleDeleteRole(role.id)} className="text-red-600 hover:text-red-800 text-sm font-medium"><Trash2 size={16} /></button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
