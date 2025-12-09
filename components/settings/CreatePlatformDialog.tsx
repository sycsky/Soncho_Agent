import React, { useState, useEffect } from 'react';
import { X, Loader2, Eye, EyeOff } from 'lucide-react';
import { platformApi } from '../../services/platformApi';
import { ExternalPlatform, PlatformTypeOption, AuthTypeOption, CreatePlatformRequest, UpdatePlatformRequest } from '../../types/platform';

interface CreatePlatformDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialValues?: ExternalPlatform;
  mode: 'create' | 'edit';
}

export const CreatePlatformDialog: React.FC<CreatePlatformDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialValues,
  mode
}) => {
  const [platformTypes, setPlatformTypes] = useState<PlatformTypeOption[]>([]);
  const [authTypes, setAuthTypes] = useState<AuthTypeOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCredential, setShowCredential] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [platformType, setPlatformType] = useState('');
  const [callbackUrl, setCallbackUrl] = useState('');
  const [authType, setAuthType] = useState('NONE');
  const [authCredential, setAuthCredential] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [extraHeaders, setExtraHeaders] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [remark, setRemark] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadOptions();
      if (mode === 'edit' && initialValues) {
        setName(initialValues.name);
        setDisplayName(initialValues.displayName || '');
        setPlatformType(initialValues.platformType);
        setCallbackUrl(initialValues.callbackUrl || '');
        setAuthType(initialValues.authType);
        setAuthCredential(initialValues.authCredential || '');
        setWebhookSecret(initialValues.webhookSecret || '');
        setExtraHeaders(initialValues.extraHeaders || '');
        setEnabled(initialValues.enabled);
        setRemark(initialValues.remark || '');
      } else {
        resetForm();
      }
    }
  }, [isOpen, mode, initialValues]);

  const loadOptions = async () => {
    try {
      const [pTypes, aTypes] = await Promise.all([
        platformApi.getPlatformTypes(),
        platformApi.getAuthTypes()
      ]);
      setPlatformTypes(pTypes);
      setAuthTypes(aTypes);
    } catch (error) {
      console.error('Failed to load options:', error);
    }
  };

  const resetForm = () => {
    setName('');
    setDisplayName('');
    setPlatformType('');
    setCallbackUrl('');
    setAuthType('NONE');
    setAuthCredential('');
    setWebhookSecret('');
    setExtraHeaders('');
    setEnabled(true);
    setRemark('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (mode === 'create') {
        const data: CreatePlatformRequest = {
          name,
          displayName,
          platformType,
          callbackUrl,
          authType,
          authCredential,
          webhookSecret,
          extraHeaders,
          enabled,
          remark
        };
        await platformApi.createPlatform(data);
      } else if (mode === 'edit' && initialValues) {
        const data: UpdatePlatformRequest = {
          displayName,
          callbackUrl,
          authType,
          authCredential,
          webhookSecret,
          extraHeaders,
          enabled,
          remark
        };
        await platformApi.updatePlatform(initialValues.id, data);
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save platform:', error);
      alert('Failed to save platform: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCredentialPlaceholder = (type: string) => {
    switch (type) {
      case 'API_KEY': return 'your-api-key';
      case 'BEARER_TOKEN': return 'your-access-token';
      case 'BASIC_AUTH': return 'username:password';
      case 'CUSTOM_HEADER': return 'Header-Name:value';
      default: return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-[600px] max-w-full flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
          <h3 className="text-xl font-bold text-gray-800">
            {mode === 'create' ? 'Create Platform Configuration' : 'Edit Platform Configuration'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6">
          <form id="platform-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Platform Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                  placeholder="e.g. line_official"
                  required
                  disabled={mode === 'edit'}
                />
                <p className="text-xs text-gray-500 mt-1">Unique identifier, cannot be changed later.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Platform Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={platformType}
                  onChange={(e) => setPlatformType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                  required
                  disabled={mode === 'edit'}
                >
                  <option value="">Select Type</option>
                  {platformTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Line Official Account"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Callback URL
              </label>
              <input
                type="url"
                value={callbackUrl}
                onChange={(e) => setCallbackUrl(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://api.example.com/callback"
              />
              <p className="text-xs text-gray-500 mt-1">System will POST reply messages to this URL.</p>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <h4 className="text-sm font-bold text-gray-800 mb-4">Authentication</h4>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Auth Type
                  </label>
                  <select
                    value={authType}
                    onChange={(e) => setAuthType(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {authTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.description}</option>
                    ))}
                  </select>
                </div>

                {authType !== 'NONE' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Auth Credential
                    </label>
                    <div className="relative">
                      <input
                        type={showCredential ? "text" : "password"}
                        value={authCredential}
                        onChange={(e) => setAuthCredential(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                        placeholder={getCredentialPlaceholder(authType)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCredential(!showCredential)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showCredential ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Webhook Secret
                  </label>
                  <div className="relative">
                    <input
                      type={showSecret ? "text" : "password"}
                      value={webhookSecret}
                      onChange={(e) => setWebhookSecret(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                      placeholder="Secret for verifying incoming webhook requests"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Extra Headers (JSON)
              </label>
              <textarea
                value={extraHeaders}
                onChange={(e) => setExtraHeaders(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm h-20"
                placeholder='{"X-Custom-Header": "value"}'
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remark
              </label>
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="enabled"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="enabled" className="ml-2 block text-sm text-gray-900">
                Enable this platform
              </label>
            </div>
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
            Cancel
          </button>
          <button
            type="submit"
            form="platform-form"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="animate-spin" size={16} />}
            {mode === 'create' ? 'Create' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
