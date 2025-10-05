export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  image?: string;
  category: {
    id: number;
    name: string;
    slug: string;
  };
}
export interface Category {
  id: number;
  name: string;
  slug: string;
  displayOrder: number;
  active: boolean;
  parentCategoryId: number | null;
  createdAt: string;
  image?: string;
}
export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface Color {
  id: number;
  code: string;
  name: string;
  hex: string | null;
}

export interface ProductImage {
  id: string;
  imageUrl: string;
  altText: string;
  displayOrder: number;
  primary: boolean;
  color: Color;
  createdAt: string;
}

export interface Variant {
  id: string;
  variantSku: string;
  price: number;
  currency: string;
  size: string;
  fit: string;
  quantityInStock: number;
  active: boolean;
  color: Color;
  createdAt: string;
  attributes: any[];
}

export interface productDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  category: Category;
  productType: string;
  gender: string;
  status: string;
  featured: boolean;
  tags: string[];
  taxonomyPath: string[];
  images: ProductImage[];
  variants: Variant[];
  createdAt: string;
  updatedAt: string;
}

export interface CartColor {
  id: number;
  code: string;
  name: string;
  hex: string;
}

export interface CartItem {
  id: string;
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  variantSku: string;
  size: string;
  fit: string;
  color: CartColor;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  inStock: boolean;
  availableQuantity: number;
}

export interface Cart {
  id: string;
  userId: string;
  totalItems: number;
  totalQuantity: number;
  subtotal: number;
  createdAt: string;
  updatedAt: string;
  items: CartItem[];
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  inStock: boolean;
  availableQuantity: number;
}
