import React, { useState, useEffect, useRef } from 'react';
import { Search, Package, X, Loader2, Check, LayoutTemplate } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Product } from '../types/product';
import { getProducts } from '../services/productService';

interface ProductSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (product: Product) => void;
  onSendCard: (product: Product | Product[]) => void;
}

export const ProductSelector: React.FC<ProductSelectorProps> = ({ isOpen, onClose, onSelect, onSendCard }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [endCursor, setEndCursor] = useState<string | null>(null);
  
  // Ref to track if we're currently searching to avoid race conditions
  const searchingRef = useRef(false);

  // Function definitions BEFORE usage
  const handleSearch = async (q: string, isNewSearch: boolean = false) => {
    if (searchingRef.current && isNewSearch) return; // Prevent overlapping searches
    
    if (isNewSearch) {
      setLoading(true);
      setProducts([]);
      setEndCursor(null);
      setHasNextPage(false);
    } else {
      setLoadingMore(true);
    }

    searchingRef.current = true;

    try {
      const cursor = isNewSearch ? undefined : (endCursor || undefined);
      const results = await getProducts(q, 10, cursor);
      
      if (isNewSearch) {
        setProducts(results.products);
      } else {
        setProducts(prev => [...prev, ...results.products]);
      }
      
      setHasNextPage(results.pageInfo.hasNextPage);
      setEndCursor(results.pageInfo.endCursor);
    } catch (error) {
      console.error('Failed to fetch products', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      searchingRef.current = false;
    }
  };

  const toggleProductSelection = (product: Product) => {
    setSelectedProducts(prev => {
      const exists = prev.some(p => p.id === product.id);
      if (exists) {
        return prev.filter(p => p.id !== product.id);
      }
      return [...prev, product];
    });
  };

  const handleSendSelected = () => {
    if (selectedProducts.length > 0) {
      onSendCard(selectedProducts);
      setSelectedProducts([]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      handleSearch('', true);
      setSelectedProducts([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isOpen) {
        handleSearch(query, true);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, isOpen]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 50 && hasNextPage && !loadingMore && !loading) {
      handleSearch(query, false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Package className="text-blue-600" size={20} />
              {t('product_selector.title')}
            </h3>
            {selectedProducts.length > 0 && (
               <button 
                 onClick={handleSendSelected}
                 className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
               >
                 <LayoutTemplate size={16} />
                 {t('product_selector.send_selected', { count: selectedProducts.length })}
               </button>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('product_selector.search_placeholder')}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              autoFocus
            />
          </div>
        </div>

        {/* Product List */}
        <div 
          className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50/30"
          onScroll={handleScroll}
        >
          {loading && products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Loader2 size={32} className="animate-spin mb-3 text-blue-500" />
              <p className="text-sm">{t('product_selector.loading')}</p>
            </div>
          ) : products.length > 0 ? (
            <>
              {products.map((product) => {
                const isSelected = selectedProducts.some(p => p.id === product.id);
                return (
                <div 
                  key={product.id}
                  onClick={() => toggleProductSelection(product)}
                  className={`group flex items-center gap-4 p-3 bg-white border rounded-xl hover:shadow-md cursor-pointer transition-all ${
                    isSelected ? 'border-blue-500 bg-blue-50/30 ring-1 ring-blue-500/20' : 'border-gray-100 hover:border-blue-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                    isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300 group-hover:border-blue-400'
                  }`}>
                    {isSelected && <Check size={14} className="text-white" />}
                  </div>

                  <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0 border border-gray-200 flex items-center justify-center">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="text-gray-300" size={24} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">{product.title}</h4>
                    <p className="text-xs text-gray-500 line-clamp-1">{product.description}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm font-bold ${product.compareAtPrice ? 'text-red-600' : 'text-gray-900'}`}>
                          {product.currency} {product.price}
                        </span>
                        {product.compareAtPrice && (
                          <span className="text-xs text-gray-400 line-through">
                             {product.currency} {product.compareAtPrice}
                          </span>
                        )}
                      </div>
                      
                      {product.compareAtPrice && (
                         <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-red-100 text-red-600">
                           {t('product_selector.sale')}
                         </span>
                      )}

                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        product.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {product.status}
                      </span>
                      <span className="text-xs text-gray-400 mt-1">• {t('product_selector.in_stock', { count: product.inventory })}</span>
                    </div>
                    {product.applicableDiscounts && product.applicableDiscounts.length > 0 && (
                        <div className="flex flex-col gap-1.5 mt-2 w-full">
                          {product.applicableDiscounts.map(discount => (
                            <div key={discount} className="flex">
                                <span className="text-[10px] font-bold px-2 py-1 rounded bg-purple-100 text-purple-700 border border-purple-200">
                                  {discount}
                                </span>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity pr-2 flex gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onSendCard(product); }}
                        className="bg-purple-50 text-purple-600 p-2 rounded-full hover:bg-purple-100 transition-colors"
                        title={t('product_selector.send_as_card')}
                      >
                          <LayoutTemplate size={16} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onSelect(product); }}
                        className="bg-blue-50 text-blue-600 p-2 rounded-full hover:bg-blue-100 transition-colors"
                        title={t('product_selector.insert_link')}
                      >
                          <Check size={16} />
                      </button>
                  </div>
                </div>
                );
              })}
              {loadingMore && (
                <div className="flex justify-center py-4">
                  <Loader2 size={24} className="animate-spin text-blue-500" />
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Package size={48} className="mb-4 opacity-20" />
              <p>{t('product_selector.no_results', { query })}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
