import React from 'react';
import { KnowledgeBase } from '../../types';
import { Plus, Search, Database, MoreVertical, Trash2, Edit, BookOpen, RefreshCw } from 'lucide-react';

interface KnowledgeBaseListProps {
  knowledgeBases: KnowledgeBase[];
  loading: boolean;
  onCreate: () => void;
  onEdit: (kb: KnowledgeBase) => void;
  onDelete: (kb: KnowledgeBase) => void;
  onSelect: (kb: KnowledgeBase) => void;
  onRebuildIndex: (kb: KnowledgeBase) => void;
}

export const KnowledgeBaseList: React.FC<KnowledgeBaseListProps> = ({
  knowledgeBases,
  loading,
  onCreate,
  onEdit,
  onDelete,
  onSelect,
  onRebuildIndex,
}) => {
  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading knowledge bases...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Database className="text-purple-600" /> Knowledge Bases
          </h2>
          <p className="text-sm text-gray-500 mt-1">Manage your vector databases for AI context retrieval</p>
        </div>
        <button
          onClick={onCreate}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 flex items-center gap-2"
        >
          <Plus size={18} /> Create Knowledge Base
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {knowledgeBases.map((kb) => (
          <div
            key={kb.id}
            className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow group relative"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <Database size={24} />
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); onRebuildIndex(kb); }}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                  title="Rebuild Index"
                >
                  <RefreshCw size={16} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(kb); }}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                  title="Edit Settings"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(kb); }}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <h3 className="text-lg font-bold text-gray-800 mb-2 cursor-pointer hover:text-purple-600" onClick={() => onSelect(kb)}>
              {kb.name}
            </h3>
            <p className="text-sm text-gray-500 line-clamp-2 mb-4 h-10">
              {kb.description || 'No description provided.'}
            </p>

            <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <BookOpen size={14} /> {kb.documentCount} Docs
                </span>
                <span>{kb.vectorDimension} dim</span>
              </div>
              <span>{new Date(kb.updatedAt).toLocaleDateString()}</span>
            </div>
            
            <button 
              onClick={() => onSelect(kb)}
              className="w-full mt-4 py-2 bg-gray-50 text-gray-600 text-sm font-medium rounded-lg hover:bg-purple-50 hover:text-purple-700 transition-colors"
            >
              Manage Documents
            </button>
          </div>
        ))}

        {knowledgeBases.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <Database size={48} className="text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No knowledge bases yet</h3>
            <p className="text-sm text-gray-500 mb-6">Create one to start adding documents for AI context.</p>
            <button
              onClick={onCreate}
              className="text-purple-600 font-medium hover:text-purple-700 hover:underline"
            >
              Create your first knowledge base
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
