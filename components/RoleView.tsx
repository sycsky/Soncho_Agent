import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Role } from '../types';
import { getRoles, createRole, updateRole, deleteRole, CreateRoleRequest, UpdateRoleRequest } from '../services/adminService';
import { Plus, Edit, Trash2, X } from 'lucide-react';

const RoleForm: React.FC<{ role?: Role; onSave: (data: CreateRoleRequest | UpdateRoleRequest) => void; onCancel: () => void; }> = ({ role, onSave, onCancel }) => {
  const { t } = useTranslation();
  const [name, setName] = useState(role?.name || '');
  const [description, setDescription] = useState(role?.description || '');
  const [permissions, setPermissions] = useState(role ? Object.keys(role.permissions).filter(p => role.permissions[p]).join(', ') : '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const perms = permissions.split(',').map(p => p.trim()).filter(Boolean);
    if (role) {
      onSave({ name, description, permissions: perms });
    } else {
      onSave({ name, description, permissions: perms });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
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
            <label className="block text-sm font-medium text-gray-700">{t('permissions_label')}</label>
            <input
              type="text"
              value={permissions}
              onChange={(e) => setPermissions(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
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
    if (window.confirm('Are you sure you want to delete this role?')) {
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
        <h2 className="text-2xl font-bold text-gray-800">Role Management</h2>
        <button onClick={() => setIsCreating(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
          <Plus size={16} />
          Add Role
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
                <td className="py-4 px-6 text-gray-600">{role.description}</td>
                <td className="py-4 px-6 text-right">
                  <button onClick={() => setEditingRole(role)} className="text-blue-600 hover:text-blue-800 text-sm font-medium mr-4"><Edit size={16} /></button>
                  <button onClick={() => handleDeleteRole(role.id)} className="text-red-600 hover:text-red-800 text-sm font-medium"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};