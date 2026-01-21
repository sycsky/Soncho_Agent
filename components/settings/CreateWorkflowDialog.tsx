import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Loader2, Tag } from 'lucide-react';
import { workflowApi } from '../../services/workflowApi';
import { WorkflowCategory } from '../../types/workflow';

interface CreateWorkflowDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string, description: string, categoryIds: string[]) => Promise<void>;
  initialValues?: {
    name: string;
    description: string;
    categoryIds: string[];
  };
  mode?: 'create' | 'edit';
  workflowId?: string;
}

export const CreateWorkflowDialog: React.FC<CreateWorkflowDialogProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm,
  initialValues,
  mode = 'create',
  workflowId
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<WorkflowCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      if (mode === 'edit' && initialValues) {
        setName(initialValues.name);
        setDescription(initialValues.description);
        setSelectedCategoryIds(initialValues.categoryIds || []);
      } else {
        // Reset form for create mode
        setName('');
        setDescription('');
        setSelectedCategoryIds([]);
      }
    }
  }, [isOpen, mode, initialValues, workflowId]); // Added dependencies

  const loadCategories = async () => {
    try {
      setIsLoadingCategories(true);
      let categories: WorkflowCategory[];
      
      if (mode === 'edit' && workflowId) {
        categories = await workflowApi.getAvailableCategoriesForWorkflow(workflowId);
      } else {
        categories = await workflowApi.getAvailableCategories();
      }
      
      setAvailableCategories(categories);
    } catch (error) {
      console.error('Failed to load categories:', error);
      // Optional: notificationService.error(t('failed_load_categories'));
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      await onConfirm(name, description, selectedCategoryIds);
      onClose();
    } catch (error) {
      console.error(`Failed to ${mode} workflow:`, error);
      // Optional: notificationService.error(t('failed_save_workflow'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-[500px] max-w-full flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
          <h3 className="text-xl font-bold text-gray-800">
            {mode === 'create' ? t('workflow_editor.create_new_workflow') : t('workflow_editor.edit_workflow_settings')}
          </h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-6">
          <form id="create-workflow-form" onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('workflow_editor.workflow_name')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t('workflow_editor.workflow_name_placeholder')}
                required
                autoFocus
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('description')}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                placeholder={t('workflow_editor.description_placeholder')}
                disabled={isSubmitting}
              />
            </div>

            {/* Categories hidden as per requirement
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categories
              </label>
              <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 min-h-[80px]">
                {isLoadingCategories ? (
                  <div className="flex items-center justify-center py-4 text-gray-400">
                    <Loader2 size={16} className="animate-spin mr-2" />
                    <span className="text-xs">Loading categories...</span>
                  </div>
                ) : availableCategories.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {availableCategories.map(category => {
                      const isSelected = selectedCategoryIds.includes(category.id);
                      return (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => toggleCategory(category.id)}
                          className={`
                            flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all border
                            ${isSelected 
                              ? 'bg-blue-100 text-blue-700 border-blue-200' 
                              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                            }
                          `}
                        >
                          <Tag size={12} />
                          {category.name}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-400 text-xs italic">
                    {t('workflow_editor.no_categories_available')}
                  </div>
                )}
              </div>
            </div>
            */}
          </form>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              form="create-workflow-form"
              disabled={!name.trim() || isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting && <Loader2 className="animate-spin" size={16} />}
              {mode === 'create' ? t('create_workflow') : t('save_changes')}
            </button>
        </div>
      </div>
    </div>
  );
};
