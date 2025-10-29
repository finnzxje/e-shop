import React, { type ChangeEvent, type FormEvent } from "react";
import { Save, Loader2, AlertCircle } from "lucide-react";
import type { ProductFormPayload, Category } from "./types";

// --- Prop Definitions ---
interface ProductFormProps {
  product: ProductFormPayload;
  categories: Category[];
  tagsInput: string;
  submitting: boolean;
  error: string | null;
  isEditMode: boolean;

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
        <h2 className="text-xl font-semibold mb-4">Basic Information</h2>

        {error && (
          <div className="flex items-center p-4 mb-4 text-red-800 bg-red-100 rounded-lg">
            <AlertCircle size={20} className="mr-3" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Product Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Product Name
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

        {/* Description */}
        <div className="mt-6">
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700"
          >
            Description
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
        <h2 className="text-xl font-semibold mb-4">Details & Classification</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Base Price */}
          <div>
            <label
              htmlFor="basePrice"
              className="block text-sm font-medium text-gray-700"
            >
              Base Price
            </label>
            <input
              type="number"
              id="basePrice"
              name="basePrice"
              step="0.01"
              value={product.basePrice === 0 ? "" : product.basePrice}
              onChange={onProductChange}
              required
              className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Category */}
          <div>
            <label
              htmlFor="categoryId"
              className="block text-sm font-medium text-gray-700"
            >
              Category
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
                -- Select a category --
              </option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label
              htmlFor="status"
              className="block text-sm font-medium text-gray-700"
            >
              Status
            </label>
            <select
              id="status"
              name="status"
              value={product.status.toUpperCase()} // Always display uppercase
              onChange={onProductChange}
              className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          {/* Gender */}
          <div>
            <label
              htmlFor="gender"
              className="block text-sm font-medium text-gray-700"
            >
              Gender
            </label>
            <select
              id="gender"
              name="gender"
              value={product.gender}
              onChange={onProductChange}
              className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="unisex">Unisex</option>
              <option value="mens">Men's</option>
              <option value="womens">Women's</option>
            </select>
          </div>

          {/* Product Type */}
          <div>
            <label
              htmlFor="productType"
              className="block text-sm font-medium text-gray-700"
            >
              Product Type
            </label>
            <input
              type="text"
              id="productType"
              name="productType"
              value={product.productType}
              onChange={onProductChange}
              placeholder="e.g., tops, shoes, accessories"
              className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Tags */}
          <div>
            <label
              htmlFor="tags"
              className="block text-sm font-medium text-gray-700"
            >
              Tags (comma-separated)
            </label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={tagsInput}
              onChange={onTagsChange}
              placeholder="e.g., essentials, organic"
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
              Featured Product
            </label>
          </div>
        </div>
      </div>

      {/* Submit Button */}
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
          {isEditMode ? "Save Changes" : "Create Product"}
        </button>
      </div>
    </form>
  );
};

export default ProductForm;
