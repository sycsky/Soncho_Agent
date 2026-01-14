import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SessionCategory } from '../types';
import sessionCategoryService, { CreateCategoryRequest, UpdateCategoryRequest } from '../services/sessionCategoryService';
import { Plus, Edit, Trash2, X, Copy } from 'lucide-react';

const CategoryForm: React.FC<{
  category?: SessionCategory;
  onSave: (data: CreateCategoryRequest | UpdateCategoryRequest) => void;
  onCancel: () => void;
}> = ({ category, onSave, onCancel }) => {
  const { t } = useTranslation();
  const [name, setName] = useState(category?.name || '');
  const [description, setDescription] = useState(category?.description || '');
  const [icon, setIcon] = useState(category?.icon || '');
  const [color, setColor] = useState(category?.color || '#3B82F6');
  const [sortOrder, setSortOrder] = useState<number | ''>(category?.sortOrder ?? '');
  const [enabled, setEnabled] = useState<boolean>(category?.enabled ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = category
      ? { name, description, icon, color, enabled, sortOrder: sortOrder === '' ? undefined : Number(sortOrder) }
      : { name, description, icon, color, sortOrder: sortOrder === '' ? undefined : Number(sortOrder) };
    onSave(payload);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6">{category ? t('edit_category') : t('add_category')}</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">{t('name')}</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">{t('description')}</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('icon')}</label>
              <input type="text" value={icon} onChange={(e) => setIcon(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder={t('icon_placeholder')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('color')}</label>
              <input type="text" value={color} onChange={(e) => setColor(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>
          {category && (
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('enabled')}</label>
                <select value={enabled ? 'true' : 'false'} onChange={(e) => setEnabled(e.target.value === 'true')} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                  <option value="true">{t('yes')}</option>
                  <option value="false">{t('no')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('sort_order')}</label>
                <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-4">
            <button type="button" onClick={onCancel} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">{t('cancel')}</button>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">{t('save')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const CategoryView: React.FC = () => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<SessionCategory[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingCategory, setEditingCategory] = useState<SessionCategory | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await sessionCategoryService.getAllCategories();
      setCategories(data);
    } catch (e) {}
  };

  const handleSaveCategory = async (data: CreateCategoryRequest | UpdateCategoryRequest) => {
    try {
      if (editingCategory) {
        await sessionCategoryService.updateCategory(editingCategory.id, data as UpdateCategoryRequest);
      } else {
        await sessionCategoryService.createCategory(data as CreateCategoryRequest);
      }
      setIsCreating(false);
      setEditingCategory(undefined);
      loadCategories();
    } catch (e) {}
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm(t('delete_category_confirm'))) return;
    try {
      await sessionCategoryService.deleteCategory(id);
      loadCategories();
    } catch (e) {}
  };

  const totalPages = Math.max(1, Math.ceil(categories.length / pageSize));
  const paged = categories.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

  return (
    <div className="p-8 max-w-4xl mx-auto w-full relative animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{t('category_management')}</h2>
        <button onClick={() => setIsCreating(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
          <Plus size={16} /> {t('add_category')}
        </button>
      </div>

      {(isCreating || editingCategory) && (
        <CategoryForm category={editingCategory} onSave={handleSaveCategory} onCancel={() => { setIsCreating(false); setEditingCategory(undefined); }} />
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase">{t('name')}</th>
              <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase">{t('icon')}</th>
              <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase">{t('color')}</th>
              <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase">{t('enabled')}</th>
              <th className="text-right py-3 px-6 text-xs font-semibold text-gray-500 uppercase">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {paged.map(cat => (
              <tr key={cat.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="py-4 px-6 font-medium text-gray-900">{cat.name}</td>
                <td className="py-4 px-6 text-gray-600">{cat.icon || '-'}</td>
                <td className="py-4 px-6 text-gray-600">{cat.color || '-'}</td>
                <td className="py-4 px-6 text-gray-600">{cat.enabled ? t('yes') : t('no')}</td>
                <td className="py-4 px-6 text-right">
                  <button onClick={() => handleCopyId(cat.id)} className="text-gray-500 hover:text-gray-700 text-sm font-medium mr-4" title={t('copy_id')}><Copy size={16} /></button>
                  <button onClick={() => setEditingCategory(cat)} className="text-blue-600 hover:text-blue-800 text-sm font-medium mr-4"><Edit size={16} /></button>
                  <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-600 hover:text-red-800 text-sm font-medium"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {paged.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 px-6 text-center text-gray-400">{t('no_categories')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <span className="text-sm text-gray-600">{t('pagination', { current: currentPage + 1, total: totalPages })}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0} className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">{t('prev_page')}</button>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage === totalPages - 1} className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">{t('next_page')}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryView;
