// src/components/admin/products/ProductForm.tsx
import React, { type ChangeEvent, type FormEvent } from "react";
import { Save, Loader2, AlertCircle } from "lucide-react";
import type { ProductFormPayload, Category } from "./types"; // (Bạn nên tạo file types.ts riêng)

// --- Định nghĩa Props ---
interface ProductFormProps {
  product: ProductFormPayload;
  categories: Category[];
  tagsInput: string;
  submitting: boolean;
  error: string | null;
  isEditMode: boolean;

  // Handlers được truyền từ component cha
  onFormSubmit: (e: FormEvent) => void;
  onProductChange: (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => void;
  onTagsChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

const ProductForm: React.FC<ProductFormProps> = ({
  product,
  categories,
  tagsInput,
  submitting,
  error,
  isEditMode,
  onFormSubmit,
  onProductChange,
  onTagsChange,
}) => {
  return (
    <form onSubmit={onFormSubmit} className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Thông tin cơ bản</h2>

        {error && (
          <div className="flex items-center p-4 mb-4 text-red-800 bg-red-100 rounded-lg">
            <AlertCircle size={20} className="mr-3" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tên sản phẩm */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Tên sản phẩm
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={product.name}
              onChange={onProductChange}
              required
              className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Slug */}
          <div>
            <label
              htmlFor="slug"
              className="block text-sm font-medium text-gray-700"
            >
              Slug (URL)
            </label>
            <input
              type="text"
              id="slug"
              name="slug"
              value={product.slug}
              onChange={onProductChange}
              required
              className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Mô tả */}
        <div className="mt-6">
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700"
          >
            Mô tả
          </label>
          <textarea
            id="description"
            name="description"
            rows={5}
            value={product.description}
            onChange={onProductChange}
            className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Chi tiết & Phân loại</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Giá cơ bản */}
          <div>
            <label
              htmlFor="basePrice"
              className="block text-sm font-medium text-gray-700"
            >
              Giá cơ bản (Base Price)
            </label>
            <input
              type="number"
              id="basePrice"
              name="basePrice"
              step="0.01"
              value={product.basePrice}
              onChange={onProductChange}
              required
              className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Danh mục */}
          <div>
            <label
              htmlFor="categoryId"
              className="block text-sm font-medium text-gray-700"
            >
              Danh mục
            </label>
            <select
              id="categoryId"
              name="categoryId"
              value={product.categoryId}
              onChange={onProductChange}
              required
              className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="" disabled>
                -- Chọn danh mục --
              </option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Trạng thái */}
          <div>
            <label
              htmlFor="status"
              className="block text-sm font-medium text-gray-700"
            >
              Trạng thái
            </label>
            <select
              id="status"
              name="status"
              value={product.status.toUpperCase()} // Luôn hiển thị chữ hoa
              onChange={onProductChange}
              className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="DRAFT">Bản nháp (Draft)</option>
              <option value="ACTIVE">Hoạt động (Active)</option>
              <option value="ARCHIVED">Lưu trữ (Archived)</option>
            </select>
          </div>

          {/* Gender */}
          <div>
            <label
              htmlFor="gender"
              className="block text-sm font-medium text-gray-700"
            >
              Giới tính (Gender)
            </label>
            <select
              id="gender"
              name="gender"
              value={product.gender}
              onChange={onProductChange}
              className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="unisex">Unisex</option>
              <option value="mens">Nam (Men's)</option>
              <option value="womens">Nữ (Women's)</option>
            </select>
          </div>

          {/* Product Type */}
          <div>
            <label
              htmlFor="productType"
              className="block text-sm font-medium text-gray-700"
            >
              Loại sản phẩm (Product Type)
            </label>
            <input
              type="text"
              id="productType"
              name="productType"
              value={product.productType}
              onChange={onProductChange}
              placeholder="Ví dụ: tops, shoes, accessories"
              className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Tags */}
          <div>
            <label
              htmlFor="tags"
              className="block text-sm font-medium text-gray-700"
            >
              Tags (cách nhau bằng dấu phẩy)
            </label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={tagsInput}
              onChange={onTagsChange}
              placeholder="Ví dụ: essentials, organic"
              className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Featured */}
          <div className="flex items-center pt-6">
            <input
              id="featured"
              name="featured"
              type="checkbox"
              checked={product.featured}
              onChange={onProductChange}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label
              htmlFor="featured"
              className="ml-2 block text-sm font-medium text-gray-700"
            >
              Sản phẩm nổi bật (Featured)
            </label>
          </div>
        </div>
      </div>

      {/* Nút Submit */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center justify-center px-6 py-2 bg-blue-600 text-white font-medium rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 size={18} className="mr-2 animate-spin" />
          ) : (
            <Save size={18} className="mr-2" />
          )}
          {isEditMode ? "Lưu thay đổi" : "Tạo sản phẩm"}
        </button>
      </div>
    </form>
  );
};

export default ProductForm;
