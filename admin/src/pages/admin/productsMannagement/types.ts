export type Category = {
  id: number;
  name: string;
  slug: string;
};

export interface ProductFormPayload {
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  categoryId: number | "";
  status: "DRAFT" | "ACTIVE" | "ARCHIVED" | "draft" | "active";
  featured: boolean;
  gender: string;
  productType: string;
  tags: string[];
}

export interface FullProduct extends ProductFormPayload {
  id: string;
  createdAt: string;
  updatedAt: string;
  category: Category;
  variants: any[];
  images: any[];
}

export type Color = {
  id: number;
  code: string;
  name: string;
  hex: string;
};

export type ProductImage = {
  id: string;
  imageUrl: string;
  altText: string | null;
  displayOrder: number;
  primary: boolean;
  createdAt: string;
  color: Color | null;
};

export type ProductVariant = {
  id: string;
  variantSku: string;
  price: number;
  quantityInStock: number;
  active: boolean;
  size: string;
  fit: string | null;
  currency: string;
  createdAt: string;
  color: Color;
  attributes: any[];
};

export type StockAdjustmentPayload = {
  newQuantity: number;
  reason: string;
  notes?: string;
};
export interface ColorMediaAggregate {
  color: Color | null;
  images: ProductImage[];
  variants: ProductVariant[];
}
