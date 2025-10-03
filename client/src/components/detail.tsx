import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useParams } from "react-router-dom";
import api from "../config/axios";

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

export interface Product {
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

export default function Detail() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedColor, setSelectedColor] = useState<Color | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch product data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const response = await api.get(`/api/catalog/products/${slug}`);
        const data = response.data;
        setProduct(data);

        // Set default color (first available color)
        if (data.images && data.images.length > 0) {
          setSelectedColor(data.images[0].color);
        }
      } catch (error: any) {
        setError(error.response?.data?.message || "Failed to load product");
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [slug]);

  // Lock scroll when modal is open
  useEffect(() => {
    if (zoomImage) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [zoomImage]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">
          {error || "Product not found"}
        </div>
      </div>
    );
  }

  // Get unique colors from variants
  const availableColors = Array.from(
    new Map(product.variants.map((v) => [v.color.code, v.color])).values()
  );

  // Get images for selected color
  const colorImages = selectedColor
    ? product.images.filter((img) => img.color.code === selectedColor.code)
    : product.images;

  // Get available sizes for selected color
  const availableSizes = selectedColor
    ? product.variants
        .filter((v) => v.color.code === selectedColor.code && v.active)
        .map((v) => v.size)
    : [];

  // Get selected variant
  const selectedVariant = product.variants.find(
    (v) => v.color.code === selectedColor?.code && v.size === selectedSize
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 px-6 py-12 bg-gray-50 min-h-screen max-w-7xl mx-auto">
      {/* Left: Product Images */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {colorImages.map((img) => (
            <div
              key={img.id}
              className="relative bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer hover:scale-105 transition-transform"
              onClick={() => setZoomImage(img.imageUrl)}
            >
              <img
                src={img.imageUrl}
                alt={img.altText}
                className="w-full h-[300px] object-cover"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Right: Product Info */}
      <div className="space-y-6">
        {/* Product Title and Price */}
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{product.name}</h1>
          <p className="text-2xl font-semibold mt-3 text-gray-900">
            ${selectedVariant?.price || product.basePrice}
          </p>
          {selectedVariant && (
            <p className="text-sm text-gray-600 mt-1">
              SKU: {selectedVariant.variantSku}
            </p>
          )}
        </div>

        {/* Category and Product Type */}
        <div className="flex gap-2 flex-wrap">
          <span className="px-3 py-1 bg-gray-200 rounded-full text-sm text-gray-700">
            {product.category.name}
          </span>
          <span className="px-3 py-1 bg-gray-200 rounded-full text-sm text-gray-700 capitalize">
            {product.gender}
          </span>
        </div>

        {/* Description */}
        <p className="text-gray-700 leading-relaxed">{product.description}</p>

        {/* Color Selection */}
        <div>
          <p className="font-medium text-gray-700 mb-3">
            Color: {selectedColor?.name}
          </p>
          <div className="flex gap-3 flex-wrap">
            {availableColors.map((color) => (
              <button
                key={color.code}
                onClick={() => {
                  setSelectedColor(color);
                  setSelectedSize(null);
                }}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                  selectedColor?.code === color.code
                    ? "border-black bg-gray-100 shadow-md"
                    : "border-gray-300 hover:border-black"
                }`}
              >
                {color.name}
              </button>
            ))}
          </div>
        </div>

        {/* Size Selection */}
        <div>
          <p className="font-medium text-gray-700 mb-3">Size</p>
          <div className="grid grid-cols-4 gap-2">
            {availableSizes.map((size) => {
              const variant = product.variants.find(
                (v) => v.size === size && v.color.code === selectedColor?.code
              );
              const inStock = variant && variant.quantityInStock > 0;

              return (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  disabled={!inStock}
                  className={`py-2 rounded-lg border text-sm font-medium transition-all ${
                    selectedSize === size
                      ? "border-black bg-gray-100 shadow-md"
                      : inStock
                      ? "border-gray-300 hover:border-black"
                      : "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
          {selectedSize &&
            selectedVariant &&
            selectedVariant.quantityInStock === 0 && (
              <p className="text-sm text-red-600 mt-2">Out of stock</p>
            )}
        </div>

        {/* Stock Status */}
        {selectedVariant && (
          <div className="text-sm">
            {selectedVariant.quantityInStock > 0 ? (
              <p className="text-green-600 font-medium">
                In Stock ({selectedVariant.quantityInStock} available)
              </p>
            ) : (
              <p className="text-red-600 font-medium">Out of Stock</p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          <button
            disabled={
              !selectedSize ||
              !selectedVariant ||
              selectedVariant.quantityInStock === 0
            }
            className="flex-1 bg-black text-white py-3 rounded-full font-semibold hover:bg-gray-800 transition-colors shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Add to Bag
          </button>
          <button
            disabled={
              !selectedSize ||
              !selectedVariant ||
              selectedVariant.quantityInStock === 0
            }
            className="flex-1 bg-black text-white py-3 rounded-full font-semibold hover:bg-gray-800 transition-colors shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Buy Now
          </button>
        </div>

        {/* Product Details */}
        {product.taxonomyPath && product.taxonomyPath.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Category: </span>
              {product.taxonomyPath.join(" > ")}
            </p>
          </div>
        )}
      </div>

      {/* Zoom Image Modal */}
      {zoomImage && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="relative bg-white rounded-xl p-4 max-w-4xl w-full">
            <button
              className="absolute top-3 right-3 p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition z-10"
              onClick={() => setZoomImage(null)}
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
            <img
              src={zoomImage}
              alt="Zoomed product"
              className="w-full max-h-[80vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
