import React, { useState, useEffect } from 'react';
import {
  Card,
  DataTable,
  Button,
  Modal,
  Form,
  FormLayout,
  TextField,
  Select,
  Checkbox,
  Banner,
  Badge,
  ButtonGroup,
  InlineError
} from '@shopify/polaris';
import { useTranslation } from 'react-i18next';
import * as orderCancellationPolicyApi from '../../services/orderCancellationPolicyApi';
import type { OrderCancellationPolicy, SaveOrderCancellationPolicyRequest } from '../../services/orderCancellationPolicyApi';

export default function OrderCancellationPolicySettings() {
  const { t } = useTranslation();
  const [policies, setPolicies] = useState<OrderCancellationPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalActive, setModalActive] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<OrderCancellationPolicy | null>(null);
  const [error, setError] = useState<string>('');
  
  // 表单状态
  const [formData, setFormData] = useState<SaveOrderCancellationPolicyRequest>({
    name: '',
    description: '',
    cancellableHours: null,
    penaltyPercentage: null,
    enabled: true,
    sortOrder: 0,
    policyType: 'FREE'
  });
  
  // 加载政策列表
  const loadPolicies = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await orderCancellationPolicyApi.getAllPolicies();
      setPolicies(data || []);
    } catch (err) {
      console.error('Failed to load cancellation policies:', err);
      setError(t('order_cancellation.load_failed'));
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadPolicies();
  }, []);
  
  // 打开创建/编辑模态框
  const handleOpenModal = (policy?: OrderCancellationPolicy) => {
    if (policy) {
      setEditingPolicy(policy);
      setFormData({
        name: policy.name,
        description: policy.description || '',
        cancellableHours: policy.cancellableHours,
        penaltyPercentage: policy.penaltyPercentage,
        enabled: policy.enabled,
        sortOrder: policy.sortOrder,
        policyType: policy.policyType
      });
    } else {
      setEditingPolicy(null);
      setFormData({
        name: '',
        description: '',
        cancellableHours: null,
        penaltyPercentage: null,
        enabled: true,
        sortOrder: policies.length,
        policyType: 'FREE'
      });
    }
    setModalActive(true);
  };
  
  // 关闭模态框
  const handleCloseModal = () => {
    setModalActive(false);
    setEditingPolicy(null);
    setError('');
  };
  
  // 保存政策
  const handleSave = async () => {
    try {
      setError('');
      
      // 验证
      if (!formData.name.trim()) {
        setError(t('order_cancellation.form.name_required'));
        return;
      }

      if (formData.cancellableHours !== null && formData.cancellableHours < 0) {
        setError(t('order_cancellation.form.cancellable_hours_negative'));
        return;
      }
      
      if (formData.policyType === 'WITH_PENALTY' && 
          (formData.penaltyPercentage === null || formData.penaltyPercentage <= 0)) {
        setError(t('order_cancellation.form.penalty_required'));
        return;
      }
      
      if (editingPolicy) {
        await orderCancellationPolicyApi.updatePolicy(editingPolicy.id, formData);
      } else {
        await orderCancellationPolicyApi.createPolicy(formData);
      }
      
      await loadPolicies();
      handleCloseModal();
    } catch (err: any) {
      setError(err.response?.data?.message || t('order_cancellation.save_failed'));
    }
  };
  
  // 删除政策
  const handleDelete = async (id: string) => {
    if (!confirm(t('order_cancellation.delete_confirm'))) {
      return;
    }
    
    try {
      await orderCancellationPolicyApi.deletePolicy(id);
      await loadPolicies();
    } catch (err: any) {
      alert(err.response?.data?.message || t('order_cancellation.delete_failed'));
    }
  };
  
  // 上移政策
  const handleMoveUp = async (id: string) => {
    try {
      await orderCancellationPolicyApi.movePolicyUp(id);
      await loadPolicies();
    } catch (err: any) {
      alert(err.response?.data?.message || t('order_cancellation.move_failed'));
    }
  };
  
  // 下移政策
  const handleMoveDown = async (id: string) => {
    try {
      await orderCancellationPolicyApi.movePolicyDown(id);
      await loadPolicies();
    } catch (err: any) {
      alert(err.response?.data?.message || t('order_cancellation.move_failed'));
    }
  };
  
  // 政策类型选项
  const policyTypeOptions = [
    { label: t('order_cancellation.types.free'), value: 'FREE' },
    { label: t('order_cancellation.types.with_penalty'), value: 'WITH_PENALTY' },
    { label: t('order_cancellation.types.no_cancellation'), value: 'NO_CANCELLATION' }
  ];
  
  // 渲染政策类型徽章
  const renderPolicyTypeBadge = (type: string) => {
    switch (type) {
      case 'FREE':
        return <Badge status="success">{t('order_cancellation.types.free')}</Badge>;
      case 'WITH_PENALTY':
        return <Badge status="warning">{t('order_cancellation.types.with_penalty')}</Badge>;
      case 'NO_CANCELLATION':
        return <Badge status="critical">{t('order_cancellation.types.no_cancellation')}</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };
  
  // 构建表格行
  const rows = (policies || []).map((policy, index) => [
    <div key={`sort-${policy.id}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ minWidth: '30px', fontWeight: 'bold' }}>{policy.sortOrder}</span>
      <ButtonGroup>
        <Button 
          size="slim" 
          disabled={index === 0}
          onClick={() => handleMoveUp(policy.id)}
        >
          ↑
        </Button>
        <Button 
          size="slim" 
          disabled={index === policies.length - 1}
          onClick={() => handleMoveDown(policy.id)}
        >
          ↓
        </Button>
      </ButtonGroup>
    </div>,
    policy.name,
    policy.description || '-',
    policy.cancellableHours !== null ? t('order_cancellation.time.hours', { hours: policy.cancellableHours }) : t('order_cancellation.time.any_time'),
    policy.penaltyPercentage !== null ? `${policy.penaltyPercentage}%` : '0%',
    renderPolicyTypeBadge(policy.policyType),
    policy.enabled ? <Badge status="success">{t('order_cancellation.status.enabled')}</Badge> : <Badge>{t('order_cancellation.status.disabled')}</Badge>,
    <ButtonGroup key={`actions-${policy.id}`}>
      <Button size="slim" onClick={() => handleOpenModal(policy)}>{t('edit')}</Button>
      <Button size="slim" destructive onClick={() => handleDelete(policy.id)}>{t('delete')}</Button>
    </ButtonGroup>
  ]);
  
  return (
    <Card>
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 className="text-xl font-semibold">{t('order_cancellation.title')}</h2>
          <Button primary onClick={() => handleOpenModal()}>{t('order_cancellation.add_policy')}</Button>
        </div>
        
        <Banner status="info" style={{ marginBottom: '20px' }}>
          <p>{t('order_cancellation.description_banner')}</p>
          <p style={{ marginTop: '8px' }}>
            <strong>{t('order_cancellation.matching_rules_label')}</strong>{t('order_cancellation.matching_rules_desc')}
          </p>
        </Banner>
        
        {error && (
          <Banner status="critical" style={{ marginBottom: '20px' }}>
            <p>{error}</p>
          </Banner>
        )}
        
        {!loading && policies.length === 0 && !error && (
          <Banner status="warning" style={{ marginBottom: '20px' }}>
            <p>{t('order_cancellation.no_policies')}</p>
          </Banner>
        )}
        
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>{t('order_cancellation.loading')}</p>
          </div>
        )}
        
        {!loading && policies.length > 0 && (
        <DataTable
          columnContentTypes={['numeric', 'text', 'text', 'text', 'text', 'text', 'text', 'text']}
          headings={[
            t('order_cancellation.table.sort'),
            t('order_cancellation.table.name'),
            t('order_cancellation.table.description'),
            t('order_cancellation.table.cancellable_time'),
            t('order_cancellation.table.penalty_ratio'),
            t('order_cancellation.table.type'),
            t('order_cancellation.table.status'),
            t('order_cancellation.table.actions')
          ]}
          rows={rows}
        />
        )}
      </div>
      
      {/* 创建/编辑模态框 */}
      <Modal
        open={modalActive}
        onClose={handleCloseModal}
        title={editingPolicy ? t('order_cancellation.edit_policy') : t('order_cancellation.add_policy_title')}
        primaryAction={{
          content: t('save'),
          onAction: handleSave
        }}
        secondaryActions={[
          {
            content: t('cancel'),
            onAction: handleCloseModal
          }
        ]}
      >
        <Modal.Section>
          {error && (
            <div style={{ marginBottom: '16px' }}>
              <InlineError message={error} fieldID="form-error" />
            </div>
          )}
          
          <Form onSubmit={handleSave}>
            <FormLayout>
              <TextField
                label={t('order_cancellation.form.name')}
                value={formData.name}
                onChange={(value) => setFormData({ ...formData, name: value })}
                placeholder={t('order_cancellation.form.name_placeholder')}
                autoComplete="off"
                requiredIndicator
              />
              
              <TextField
                label={t('order_cancellation.form.description')}
                value={formData.description || ''}
                onChange={(value) => setFormData({ ...formData, description: value })}
                placeholder={t('order_cancellation.form.description_placeholder')}
                multiline={3}
                autoComplete="off"
              />
              
              <Select
                label={t('order_cancellation.form.type')}
                options={policyTypeOptions}
                value={formData.policyType}
                onChange={(value) => setFormData({ 
                  ...formData, 
                  policyType: value as any,
                  penaltyPercentage: value === 'FREE' ? 0 : formData.penaltyPercentage
                })}
              />
              
              <TextField
                label={t('order_cancellation.form.cancellable_hours')}
                type="number"
                value={formData.cancellableHours?.toString() || ''}
                onChange={(value) => setFormData({ 
                  ...formData, 
                  cancellableHours: value ? parseInt(value) : null 
                })}
                placeholder={t('order_cancellation.form.cancellable_hours_placeholder')}
                helpText={t('order_cancellation.form.cancellable_hours_help')}
                autoComplete="off"
              />
              
              {formData.policyType === 'WITH_PENALTY' && (
                <TextField
                  label={t('order_cancellation.form.penalty_percentage')}
                  type="number"
                  value={formData.penaltyPercentage?.toString() || ''}
                  onChange={(value) => setFormData({ 
                    ...formData, 
                    penaltyPercentage: value ? parseFloat(value) : null 
                  })}
                  placeholder={t('order_cancellation.form.penalty_percentage_placeholder')}
                  suffix="%"
                  helpText={t('order_cancellation.form.penalty_percentage_help')}
                  autoComplete="off"
                  requiredIndicator
                />
              )}
              
              <TextField
                label={t('order_cancellation.form.sort_order')}
                type="number"
                value={formData.sortOrder?.toString() || '0'}
                onChange={(value) => setFormData({ 
                  ...formData, 
                  sortOrder: value ? parseInt(value) : 0 
                })}
                helpText={t('order_cancellation.form.sort_order_help')}
                autoComplete="off"
              />
              
              <Checkbox
                label={t('order_cancellation.form.enabled')}
                checked={formData.enabled}
                onChange={(value) => setFormData({ ...formData, enabled: value })}
                helpText={t('order_cancellation.form.enabled_help')}
              />
            </FormLayout>
          </Form>
        </Modal.Section>
      </Modal>
    </Card>
  );
}

