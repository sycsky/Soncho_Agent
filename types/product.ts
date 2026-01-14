export interface Product {
  id: string;
  title: string;
  description: string;
  price: string;
  compareAtPrice?: string | null;
  currency: string;
  imageUrl: string;
  inventory: number;
  status: 'active' | 'archived' | 'draft';
  url: string;
  variantId?: string;
  applicableDiscounts?: string[];
}
