import React, { useState, useEffect, useCallback } from 'react';
import { KnowledgeBase } from '../../types';
import knowledgeBaseApi from '../../services/knowledgeBaseApi';
import notificationService from '../../services/notificationService';
import { KnowledgeBaseList } from './KnowledgeBaseList';
import { KnowledgeBaseDetail } from './KnowledgeBaseDetail';
import { KnowledgeBaseDialog } from './KnowledgeBaseDialog';

export const KnowledgeBaseView: React.FC = () => {
  const [viewMode, setViewMode] = useState<'LIST' | 'DETAIL'>('LIST');
  const [selectedKb, setSelectedKb] = useState<KnowledgeBase | null>(null);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Dialog States
  const [isKbDialogOpen, setIsKbDialogOpen] = useState(false);
  const [editingKb, setEditingKb] = useState<KnowledgeBase | undefined>(undefined);

  const fetchKnowledgeBases = useCallback(async () => {
    setLoading(true);
    try {
      const data = await knowledgeBaseApi.getKnowledgeBases(false);
      setKnowledgeBases(data);
    } catch (error) {
      console.error('Failed to fetch knowledge bases:', error);
      notificationService.error('Failed to load knowledge bases');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKnowledgeBases();
  }, [fetchKnowledgeBases]);

  const handleCreateKb = async (data: any) => {
    try {
      await knowledgeBaseApi.createKnowledgeBase(data);
      notificationService.success('Knowledge base created successfully');
      fetchKnowledgeBases();
    } catch (error) {
      notificationService.error('Failed to create knowledge base');
      throw error;
    }
  };

  const handleUpdateKb = async (data: any) => {
    if (!editingKb) return;
    try {
      await knowledgeBaseApi.updateKnowledgeBase(editingKb.id, data);
      notificationService.success('Knowledge base updated successfully');
      fetchKnowledgeBases();
    } catch (error) {
      notificationService.error('Failed to update knowledge base');
      throw error;
    }
  };

  const handleDeleteKb = async (kb: KnowledgeBase) => {
    if (!window.confirm(`Are you sure you want to delete "${kb.name}"? This action cannot be undone.`)) return;
    try {
      await knowledgeBaseApi.deleteKnowledgeBase(kb.id);
      notificationService.success('Knowledge base deleted');
      fetchKnowledgeBases();
      if (selectedKb?.id === kb.id) {
        setViewMode('LIST');
        setSelectedKb(null);
      }
    } catch (error) {
      notificationService.error('Failed to delete knowledge base');
    }
  };

  const handleRebuildIndex = async (kb: KnowledgeBase) => {
    if (!window.confirm(`Rebuild index for "${kb.name}"? This may take a while.`)) return;
    try {
      await knowledgeBaseApi.rebuildIndex(kb.id);
      notificationService.success('Index rebuild started');
    } catch (error) {
      notificationService.error('Failed to rebuild index');
    }
  };

  if (viewMode === 'DETAIL' && selectedKb) {
    return (
      <KnowledgeBaseDetail
        knowledgeBase={selectedKb}
        onBack={() => {
          setViewMode('LIST');
          setSelectedKb(null);
          fetchKnowledgeBases(); // Refresh list on back to update counts
        }}
      />
    );
  }

  return (
    <>
      <KnowledgeBaseList
        knowledgeBases={knowledgeBases}
        loading={loading}
        onCreate={() => { setEditingKb(undefined); setIsKbDialogOpen(true); }}
        onEdit={(kb) => { setEditingKb(kb); setIsKbDialogOpen(true); }}
        onDelete={handleDeleteKb}
        onSelect={(kb) => { setSelectedKb(kb); setViewMode('DETAIL'); }}
        onRebuildIndex={handleRebuildIndex}
      />

      <KnowledgeBaseDialog
        isOpen={isKbDialogOpen}
        onClose={() => setIsKbDialogOpen(false)}
        onSubmit={editingKb ? handleUpdateKb : handleCreateKb}
        initialData={editingKb}
      />
    </>
  );
};
