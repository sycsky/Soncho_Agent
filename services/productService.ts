import api from './api';
import { Product } from '../types/product';

interface ShopifyImage {
  url: string;
  altText?: string;
}

interface ShopifyImageNode {
  url: string;
}

interface ShopifyImageEdge {
  node: ShopifyImageNode;
}

interface ShopifyMoney {
  amount: string;
  currencyCode: string;
}

interface ShopifyVariantNode {
  id: string;
  price: string;
  sku: string | null;
}

interface ShopifyVariantEdge {
  node: ShopifyVariantNode;
}

interface ShopifyProductNode {
  id: string;
  title: string;
  handle: string;
  description: string;
  status: string;
  totalInventory: number;
  featuredImage?: ShopifyImage;
  images?: {
    edges: ShopifyImageEdge[];
  };
  priceRange: {
    minVariantPrice: ShopifyMoney;
    maxVariantPrice: ShopifyMoney;
  };
  variants: {
    edges: ShopifyVariantEdge[];
  };
  applicableDiscounts?: string[];
}

interface ShopifyProductEdge {
  cursor: string;
  node: ShopifyProductNode;
}

interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

interface ShopifyProductsResponse {
  edges: ShopifyProductEdge[];
  pageInfo: PageInfo;
}

export interface ProductSearchResult {
  products: Product[];
  pageInfo: PageInfo;
}

export const getProducts = async (query: string = '', limit: number = 10, cursor?: string): Promise<ProductSearchResult> => {
  try {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (limit) params.append('limit', limit.toString());
    if (cursor) params.append('cursor', cursor);

    // API 现在返回包含 edges 和 pageInfo 的对象
    const response = await api.get<ShopifyProductsResponse>(`/shopify/products?${params.toString()}`);
    
    // 兼容旧接口格式（如果后端还未完全部署或出错返回数组）
    const edges = Array.isArray(response) ? response : (response?.edges || []);
    const pageInfo = (response && !Array.isArray(response)) ? response.pageInfo : { hasNextPage: false, endCursor: null };

    if (!Array.isArray(edges)) {
      console.error('Unexpected response format:', response);
      return { products: [], pageInfo: { hasNextPage: false, endCursor: null } };
    }

    const shopDomain = localStorage.getItem('shopify_shop');

    const products = edges.map(({ node }) => {
      let price = '0.00';
      let compareAtPrice: string | null = null;
      let currency = '';
      let variantId = '';

      // 优先使用变体价格，避免 priceRange 可能出现的单位问题（如 100x 差异）
      if (node.variants?.edges?.length > 0) {
        const firstVariant = node.variants.edges[0].node;
        price = firstVariant.price;
        compareAtPrice = firstVariant.compareAtPrice;
        variantId = firstVariant.id;
        // 尝试从 priceRange 获取货币代码
        if (node.priceRange?.minVariantPrice) {
          currency = node.priceRange.minVariantPrice.currencyCode;
        }
      } else if (node.priceRange?.minVariantPrice) {
        // 如果没有变体信息，回退到 priceRange
        price = node.priceRange.minVariantPrice.amount;
        currency = node.priceRange.minVariantPrice.currencyCode;
      }

      // 获取图片 URL：优先使用 featuredImage，如果没有则尝试从 images 列表中获取第一张
      let imageUrl = node.featuredImage?.url || '';
      if (!imageUrl && node.images?.edges?.length > 0) {
        imageUrl = node.images.edges[0].node.url;
      }

      return {
        id: node.id,
        title: node.title,
        description: node.description || '',
        price: price,
        compareAtPrice: compareAtPrice,
        currency: currency,
        imageUrl: imageUrl,
        inventory: node.totalInventory,
        status: (['active', 'archived', 'draft'].includes(node.status.toLowerCase()) 
          ? node.status.toLowerCase() 
          : 'archived') as 'active' | 'archived' | 'draft',
        url: shopDomain ? `https://${shopDomain}/products/${node.handle}` : node.handle,
        variantId: variantId || undefined,
        applicableDiscounts: node.applicableDiscounts || []
      };
    });

    return { products, pageInfo };
  } catch (error) {
    console.error('Failed to fetch products:', error);
    throw error;
  }
};

export const getDiscounts = async () => {
  const response = await api.get<any>('/shopify/discounts');
  // Handle GraphQL response structure for discountNodes
  if (response?.edges) {
    return response.edges
      .map((edge: any) => {
        const discount = edge.node.discount;
        let code = '';
        if (discount.codes?.nodes?.length > 0) {
          code = discount.codes.nodes[0].code;
        } else if (discount.title && !discount.title.includes('Automatic')) {
          code = discount.title;
        }
        
        // Filter out if no code found (Automatic discounts usually don't have user-entered codes)
        if (!code) return null;

        let value = '';
        if (discount.customerGets?.value) {
          if (typeof discount.customerGets.value.percentage === 'number') {
            const pct = Math.round(Math.abs(discount.customerGets.value.percentage * 100));
            value = pct >= 100 ? 'Free' : `${pct}%`;
          } else if (discount.customerGets.value.amount) {
            value = `$${discount.customerGets.value.amount.amount}`;
          } else if (discount.customerGets.value.effect) {
             // Handle DiscountOnQuantity (nested effect)
             const effect = discount.customerGets.value.effect;
             if (typeof effect.percentage === 'number') {
                const pct = Math.round(Math.abs(effect.percentage * 100));
                value = pct >= 100 ? 'Free' : `${pct}%`;
             } else if (effect.amount) {
                value = `$${effect.amount.amount}`;
             }
          }
        } else if (edge.node.discount.__typename?.includes('FreeShipping')) {
          value = 'Free Shipping';
        }

        // Fallback for BXGY if value is missing (e.g. complex conditions)
        if (!value && edge.node.discount.__typename?.includes('Bxgy')) {
          value = 'Buy X Get Y';
        }
        
        // Fallback for App Discounts
        if (!value && edge.node.discount.__typename?.includes('App')) {
          value = 'App Discount';
        }

        return {
          id: edge.node.id,
          code: code,
          value: value,
          description: `Starts at ${new Date(discount.startsAt).toLocaleDateString()}`
        };
      })
      .filter((d: any) => d !== null); // Filter out nulls
  }
  return [];
};

export const createGiftCard = async (amount: string, note?: string, customerId?: string, expiresOn?: string) => {
  const response = await api.post<any>('/shopify/gift-cards', { amount, note, customerId, expiresOn });
  if (response?.giftCard) {
    // We injected the code into the giftCard object in the backend
    return response.giftCard;
  }
  if (response?.userErrors?.length > 0) {
    throw new Error(response.userErrors[0].message);
  }
  throw new Error('Failed to create gift card');
};

export const recordSentItem = async (data: {
  customerId: string;
  itemType: 'DISCOUNT' | 'GIFT_CARD';
  itemValue: string;
  amount?: string;
  note?: string;
}) => {
  await api.post('/shopify/sent-items', data);
};
