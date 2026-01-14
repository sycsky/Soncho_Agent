import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { KnowledgeBase } from '../../types';
import knowledgeBaseApi from '../../services/knowledgeBaseApi';
import notificationService from '../../services/notificationService';
import { KnowledgeBaseList } from './KnowledgeBaseList';
import { KnowledgeBaseDetail } from './KnowledgeBaseDetail';
import { KnowledgeBaseDialog } from './KnowledgeBaseDialog';

export const KnowledgeBaseView: React.FC = () => {
  const { t } = useTranslation();
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
      notificationService.error(t('loading_kb_failed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchKnowledgeBases();
  }, [fetchKnowledgeBases]);

  const handleCreateKb = async (data: any) => {
    try {
      await knowledgeBaseApi.createKnowledgeBase(data);
      notificationService.success(t('kb_created_success'));
      fetchKnowledgeBases();
    } catch (error) {
      notificationService.error(t('kb_created_failed'));
      throw error;
    }
  };

  const handleUpdateKb = async (data: any) => {
    if (!editingKb) return;
    try {
      await knowledgeBaseApi.updateKnowledgeBase(editingKb.id, data);
      notificationService.success(t('kb_updated_success'));
      fetchKnowledgeBases();
    } catch (error) {
      notificationService.error(t('kb_updated_failed'));
      throw error;
    }
  };

  const handleDeleteKb = async (kb: KnowledgeBase) => {
    if (!window.confirm(t('confirm_delete_kb', { name: kb.name }))) return;
    try {
      await knowledgeBaseApi.deleteKnowledgeBase(kb.id);
      notificationService.success(t('kb_deleted_success'));
      fetchKnowledgeBases();
      if (selectedKb?.id === kb.id) {
        setViewMode('LIST');
        setSelectedKb(null);
      }
    } catch (error) {
      notificationService.error(t('kb_deleted_failed'));
    }
  };

  const handleRebuildIndex = async (kb: KnowledgeBase) => {
    if (!window.confirm(t('confirm_rebuild_index', { name: kb.name }))) return;
    try {
      await knowledgeBaseApi.rebuildIndex(kb.id);
      notificationService.success(t('index_rebuild_started'));
    } catch (error) {
      notificationService.error(t('index_rebuild_failed'));
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
