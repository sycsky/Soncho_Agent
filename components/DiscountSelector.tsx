import React, { useState, useEffect } from 'react';
import { Ticket, X, Loader2, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getDiscounts } from '../services/productService';

interface Discount {
  id: string;
  code: string;
  value: string;
  description: string;
}

interface DiscountSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (discount: any) => void;
}

export const DiscountSelector: React.FC<DiscountSelectorProps> = ({ isOpen, onClose, onSend }) => {
  const { t } = useTranslation();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDiscounts();
    }
  }, [isOpen]);

  const loadDiscounts = async () => {
    setLoading(true);
    try {
      const data = await getDiscounts();
      setDiscounts(data);
    } catch (error) {
      console.error('Failed to load discounts', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Ticket className="text-purple-600" size={20} />
            {t('discount_selector.title')}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin text-purple-500" />
            </div>
          ) : discounts.length > 0 ? (
            discounts.map((discount) => (
              <div
                key={discount.id}
                onClick={() => onSend(discount)}
                className="group flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:border-purple-300 hover:shadow-md cursor-pointer transition-all"
              >
                <div>
                  <div className="font-bold text-gray-900 group-hover:text-purple-600 transition-colors">{discount.code}</div>
                  <div className="text-sm text-gray-600">{discount.value} {t('discount_selector.off')}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{discount.description}</div>
                </div>
                <button className="bg-purple-50 text-purple-600 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all">
                  <Check size={16} />
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              {t('discount_selector.no_active')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
