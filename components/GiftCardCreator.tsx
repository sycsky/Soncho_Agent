import React, { useState } from 'react';
import { Gift, X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { createGiftCard } from '../services/productService';

interface GiftCardCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (giftCard: any) => void;
  customerId?: string;
}

export const GiftCardCreator: React.FC<GiftCardCreatorProps> = ({ isOpen, onClose, onSend, customerId }) => {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('50');
  const [note, setNote] = useState('');
  const [expiresOn, setExpiresOn] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const giftCard = await createGiftCard(amount, note, customerId, expiresOn);
      onSend({
        amount: giftCard.balance.amount,
        code: giftCard.code,
        currency: giftCard.balance.currencyCode,
        expiresOn: giftCard.expiresOn
      });
    } catch (err: any) {
      setError(err.message || t('gift_card.error_create'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Gift className="text-pink-600" size={20} />
            {t('gift_card.title')}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('gift_card.amount')}</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-7 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                placeholder="50.00"
                min="1"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('gift_card.expires_on_optional')}</label>
            <input
              type="date"
              value={expiresOn}
              onChange={(e) => setExpiresOn(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('gift_card.note_optional')}</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
              placeholder={t('gift_card.note_placeholder')}
            />
          </div>

          {error && <div className="text-red-500 text-sm">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-pink-600 hover:bg-pink-700 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : t('gift_card.create_send')}
          </button>
        </form>
      </div>
    </div>
  );
};
