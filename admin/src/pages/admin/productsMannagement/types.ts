// Đây là type cho Danh mục
export type Category = {
  id: number;
  name: string;
  slug: string;
};

// Đây là type cho dữ liệu trên Form
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

// Đây là type cho dữ liệu đầy đủ khi GET {id} (dựa trên JSON bạn gửi)
export interface FullProduct extends ProductFormPayload {
  id: string;
  createdAt: string;
  updatedAt: string;
  category: Category;
  variants: any[]; // (Bạn có thể định nghĩa type cho Variant sau)
  images: any[]; // (Bạn có thể định nghĩa type cho Image sau)
}
/**
 * Định nghĩa cho một Màu Sắc (Color)
 * Dùng chung cho cả Variant và Image
 */
export type Color = {
  id: number;
  code: string;
  name: string;
  hex: string;
};

/**
 * Định nghĩa cho một Hình Ảnh Sản Phẩm (ProductImage)
 */
export type ProductImage = {
  id: string;
  imageUrl: string;
  altText: string | null;
  displayOrder: number;
  primary: boolean;
  createdAt: string;
  color: Color | null; // Hình ảnh có thể không gán vào màu nào
};

/**
 * Định nghĩa cho một Biến Thể Sản Phẩm (ProductVariant)
 */
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
  color: Color; // Variant luôn thuộc về một màu
  attributes: any[]; // Bạn có thể định nghĩa type này rõ hơn nếu biết cấu trúc
};
/**
 * Dữ liệu (payload) để gửi khi điều chỉnh kho hàng
 * POST /api/admin/catalog/products/{productId}/variants/{variantId}/stock-adjustments
 */
export type StockAdjustmentPayload = {
  newQuantity: number;
  reason: string;
  notes?: string; // 'notes' có thể là tùy chọn
};
