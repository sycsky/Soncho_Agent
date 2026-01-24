import React from 'react';
import { ShoppingBag, Gift, Ticket, ArrowRight, ShoppingCart, Package, ExternalLink, Truck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './MessageCards.css';
import { Product } from '../types/product';
import { toast } from 'sonner';

interface ProductData {
  id: string;
  title: string;
  price: string;
  currency: string;
  url?: string;
  image?: string;
  handle?: string;
  variantId?: string;
  discounts?: string[];
}

interface ProductCardProps {
  data: ProductData | ProductData[];
}

interface GiftCardProps {
  data: {
    amount: string;
    code: string;
    currency: string;
  };
}

interface DiscountCardProps {
  data: {
    code: string;
    value: string;
    description: string;
  };
}

interface OrderData {
  orderNumber: string;
  orderId: string;
  totalPrice: string;
  currency: string;
  financialStatus: string;
  fulfillmentStatus: string;
  createdAt: string;
  note?: string;
  shippingAddress?: {
    name: string;
    firstName: string;
    lastName: string;
    phone: string;
    address1: string;
    address2: string;
    city: string;
    province: string;
    country: string;
    zip: string;
  };
  trackingInfo?: Array<{
    number: string;
    url: string;
    company: string;
  }>;
  items?: Array<{
    title: string;
    quantity: number;
    price?: string;
  }>;
}

interface OrderCardProps {
  data: OrderData | OrderData[];
}

const copyToClipboard = async (text: string, t: any) => {
    if (!text) return;
    
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            toast.success(t('message_cards.copied', { code: text }));
        } else {
            // Fallback for non-secure context or older browsers
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    toast.success(t('message_cards.copied', { code: text }));
                } else {
                    toast.error(t('message_cards.copy_failed'));
                }
            } catch (err) {
                console.error('Fallback copy failed', err);
                toast.error(t('message_cards.copy_failed'));
            }
            
            document.body.removeChild(textArea);
        }
    } catch (err) {
        console.error('Copy failed', err);
        toast.error(t('message_cards.copy_failed'));
    }
};

export const ProductCard: React.FC<ProductCardProps> = ({ data }) => {
  const { t } = useTranslation();
  
  let products: ProductData[] = [];
  let recommendation = "";

  if (Array.isArray(data)) {
    products = data;
  } else if (data && typeof data === 'object' && 'products' in data) {
    products = (data as any).products;
    recommendation = (data as any).recommendation;
  } else {
    products = [data as ProductData];
  }

  const handleProductClick = (product: ProductData) => {
    if (product.url) {
      window.open(product.url, '_blank');
    }
  };

  const handleCheckout = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (products.length === 0) return;

    // Construct checkout URL
    // Format: https://[domain]/cart/[variantId]:[qty],[variantId]:[qty]
    const firstUrl = products.find(p => p.url)?.url;
    if (!firstUrl) return;

    try {
      const urlObj = new URL(firstUrl);
      const origin = urlObj.origin;
      const variantsPath = products
        .map(p => {
            // Use variantId if available, fallback to id if it looks like a number (unlikely for shopify gid)
            // If variantId is missing, we might fail to checkout correctly.
            // Assuming variantId is passed as requested.
            // If variantId is not present, we can't build a cart link easily.
            // But let's try to use what we have.
            const vId = p.variantId ? p.variantId.split('/').pop() : ''; 
            return vId ? `${vId}:1` : '';
        })
        .filter(Boolean)
        .join(',');
      
      if (variantsPath) {
        window.open(`${origin}/cart/${variantsPath}`, '_blank');
      }
    } catch (e) {
      console.error('Invalid product URL', e);
    }
  };

  // Unified rendering: Always use the grid/combo layout
  // CSS grid will handle 1 item (via :has selector or default behavior)
  return (
    <div className="product-combo-container">
      {recommendation && (
        <div className="bg-blue-50 text-blue-800 p-3 rounded-lg mb-2 text-sm border border-blue-100 shadow-sm">
          {recommendation}
        </div>
      )}
      <div className="product-grid">
        {products.map((product, index) => (
          <div 
            key={product.id || index} 
            className="mini-product-card"
            onClick={() => handleProductClick(product)}
          >
            <div className="mini-product-image">
                {product.image ? (
                  <img src={product.image} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <ShoppingBag style={{ color: '#ccc', margin: 'auto' }} size={24} />
                )}
            </div>
            <div className="mini-product-info">
              <h4 className="mini-product-title">{product.title}</h4>
              {product.discounts && product.discounts.length > 0 && (
                <div className="flex flex-col gap-1 mt-1">
                   {product.discounts.map(d => (
                     <span key={d} className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-purple-100 text-purple-600 w-fit">{d}</span>
                   ))}
                </div>
              )}
              <div className="mini-product-price">{product.currency || '$'}{product.price}</div>
            </div>
          </div>
        ))}
      </div>
      <button 
        onClick={handleCheckout}
        className="checkout-button"
      >
        <ShoppingCart size={18} />
        {t('message_cards.checkout_all', { count: products.length })}
      </button>
    </div>
  );
};

export const GiftCard: React.FC<GiftCardProps> = ({ data }) => {
  const { t } = useTranslation();
  return (
    <div className="message-card gift-card" onClick={() => copyToClipboard(data.code, t)}>
      <div className="card-header">
        <Gift size={16} className="card-icon" />
        <span className="card-type">{t('message_cards.gift_card')}</span>
      </div>
      <div className="gift-amount">{data.currency || '$'}{data.amount}</div>
      <div className="gift-code">{data.code}</div>
      <div className="gift-footer">{t('message_cards.redeem')}</div>
    </div>
  );
};

export const DiscountCard: React.FC<DiscountCardProps> = ({ data }) => {
  const { t } = useTranslation();
  return (
    <div className="message-card discount-card" onClick={() => copyToClipboard(data.code, t)}>
      <div className="card-header">
        <Ticket size={16} className="card-icon" />
        <span className="card-type">{t('message_cards.discount')}</span>
      </div>
      <div className="discount-value">{data.value} {t('message_cards.off')}</div>
      <div className="discount-code">{data.code}</div>
      <div className="discount-desc">{data.description}</div>
    </div>
  );
};

const SingleOrderCard: React.FC<{ order: OrderData }> = ({ order }) => {
  const { t } = useTranslation();
  
  const handleTrackOrder = () => {
    const trackingUrl = order.trackingInfo && order.trackingInfo.length > 0 && order.trackingInfo[0].url
      ? order.trackingInfo[0].url 
      : null;
    
    if (trackingUrl) {
      window.open(trackingUrl, '_blank');
    } else {
      toast.error(t('message_cards.no_tracking_info'));
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('paid') || statusLower.includes('fulfilled') || statusLower.includes('delivered')) {
      return 'bg-green-100 text-green-700';
    }
    if (statusLower.includes('pending') || statusLower.includes('unfulfilled')) {
      return 'bg-yellow-100 text-yellow-700';
    }
    if (statusLower.includes('cancelled') || statusLower.includes('refunded')) {
      return 'bg-red-100 text-red-700';
    }
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="message-card order-card" onClick={handleTrackOrder}>
      <div className="card-header">
        <Package size={16} className="card-icon" />
        <span className="card-type">{t('message_cards.order')}</span>
      </div>
      
      <div className="order-header">
        <div className="order-number">{order.orderNumber}</div>
        <div className="order-price">{order.currency || '$'}{order.totalPrice}</div>
      </div>
      
      <div className="order-status-row">
        <span className={`status-badge ${getStatusBadgeClass(order.financialStatus)}`}>
          {t(`message_cards.financial_status.${order.financialStatus.toLowerCase().replace(/\s+/g, '_')}`, { defaultValue: order.financialStatus })}
        </span>
        <span className={`status-badge ${getStatusBadgeClass(order.fulfillmentStatus)}`}>
          {t(`message_cards.fulfillment_status.${order.fulfillmentStatus.toLowerCase().replace(/\s+/g, '_')}`, { defaultValue: order.fulfillmentStatus })}
        </span>
      </div>

      {order.shippingAddress && (
        <div className="shipping-info-section">
          <div className="info-label">{t('message_cards.shipping_address')}</div>
          <div className="info-content">
            {order.shippingAddress.name && (
              <div className="address-field-row">
                <span className="field-label">{t('message_cards.name')}:</span>
                <span className="field-value">{order.shippingAddress.name}</span>
              </div>
            )}
            {order.shippingAddress.phone && order.shippingAddress.phone !== 'null' && (
              <div className="address-field-row">
                <span className="field-label">{t('message_cards.phone')}:</span>
                <span className="field-value">{order.shippingAddress.phone}</span>
              </div>
            )}
            {order.shippingAddress.address1 && (
              <div className="address-field-row">
                <span className="field-label">{t('message_cards.address1')}:</span>
                <span className="field-value">{order.shippingAddress.address1}</span>
              </div>
            )}
            {order.shippingAddress.address2 && (
              <div className="address-field-row">
                <span className="field-label">{t('message_cards.address2')}:</span>
                <span className="field-value">{order.shippingAddress.address2}</span>
              </div>
            )}
            {order.shippingAddress.city && (
              <div className="address-field-row">
                <span className="field-label">{t('message_cards.city')}:</span>
                <span className="field-value">{order.shippingAddress.city}</span>
              </div>
            )}
            {order.shippingAddress.province && (
              <div className="address-field-row">
                <span className="field-label">{t('message_cards.province')}:</span>
                <span className="field-value">{order.shippingAddress.province}</span>
              </div>
            )}
            {order.shippingAddress.zip && (
              <div className="address-field-row">
                <span className="field-label">{t('message_cards.zip')}:</span>
                <span className="field-value">{order.shippingAddress.zip}</span>
              </div>
            )}
            {order.shippingAddress.country && (
              <div className="address-field-row">
                <span className="field-label">{t('message_cards.country')}:</span>
                <span className="field-value">{order.shippingAddress.country}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {order.note && (
        <div className="order-note-section">
          <div className="info-label">{t('message_cards.note')}</div>
          <div className="note-content">{order.note}</div>
        </div>
      )}

      {order.trackingInfo && order.trackingInfo.length > 0 && (
        <div className="tracking-section">
          <div className="tracking-header">
            <Truck size={14} />
            <span>{t('message_cards.tracking')}</span>
          </div>
          {order.trackingInfo.map((tracking, index) => (
            <div key={index} className="tracking-item">
              <span className="tracking-company">{tracking.company}</span>
              <span className="tracking-number">{tracking.number}</span>
            </div>
          ))}
        </div>
      )}

      {order.items && order.items.length > 0 && (
        <div className="order-items-list">
          <div className="items-header">
            {t('message_cards.items_count', { count: order.items.length })}
          </div>
          {order.items.map((item, index) => (
            <div key={index} className="order-item">
              <div className="item-info">
                <div className="item-title">{item.title}</div>
                <div className="item-details">
                  <span className="item-quantity">× {item.quantity}</span>
                  {item.price && <span className="item-price">{order.currency || '$'}{item.price}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="order-footer">
        <ExternalLink size={12} />
        <span>{t('message_cards.track_order')}</span>
      </div>
    </div>
  );
};

export const OrderCard: React.FC<OrderCardProps> = ({ data }) => {
  // Always treat data as an array
  const orders = Array.isArray(data) ? data : [data];

  return (
    <>
      {orders.map((order, index) => (
        <SingleOrderCard key={order.orderId || index} order={order} />
      ))}
    </>
  );
};
