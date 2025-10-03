import { useState, useEffect } from "react";
import { X, Check, ShoppingBag, Zap, Package } from "lucide-react";
import { useParams } from "react-router-dom";
import api from "../config/axios";
import type { productDetail, Color } from "../config/interface";

export default function Detail() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<productDetail | null>(null);
  const [selectedColor, setSelectedColor] = useState<Color | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 font-medium">
            Loading amazing product...
          </p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-gray-100">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl">
          <div className="text-6xl mb-4">😢</div>
          <p className="text-xl text-red-600 font-semibold">
            {error || "Product not found"}
          </p>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left: Product Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div
              className="relative bg-white rounded-3xl shadow-xl overflow-hidden cursor-zoom-in group aspect-square"
              onClick={() =>
                colorImages[0] && setZoomImage(colorImages[0].imageUrl)
              }
            >
              <img
                src={
                  colorImages[0]?.imageUrl || "https://via.placeholder.com/600"
                }
                alt={colorImages[0]?.altText}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
                <p className="text-sm font-semibold text-gray-800">
                  Click to zoom
                </p>
              </div>
            </div>

            {/* Thumbnail Grid */}
            {colorImages.length > 1 && (
              <div className="grid grid-cols-3 gap-3">
                {colorImages.slice(1).map((img) => (
                  <div
                    key={img.id}
                    className="relative bg-white rounded-2xl shadow-md overflow-hidden cursor-pointer hover:shadow-xl hover:scale-105 transition-all aspect-square"
                    onClick={() => setZoomImage(img.imageUrl)}
                  >
                    <img
                      src={img.imageUrl}
                      alt={img.altText}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Product Info */}
          <div className="space-y-6 lg:sticky lg:top-8 lg:self-start">
            {/* Header */}
            <div className="bg-white rounded-3xl shadow-xl p-6 lg:p-8">
              {/* Category Badge */}
              <div className="flex gap-2 flex-wrap mb-4">
                <span className="inline-flex items-center px-4 py-1.5 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 rounded-full text-sm font-semibold">
                  {product.category.name}
                </span>
                <span className="inline-flex items-center px-4 py-1.5 bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 rounded-full text-sm font-semibold capitalize">
                  {product.gender}
                </span>
              </div>

              {/* Product Title */}
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
                {product.name}
              </h1>

              {/* Price */}
              <div className="flex items-baseline gap-3 mb-2">
                <p className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  ${selectedVariant?.price || product.basePrice}
                </p>
              </div>

              {selectedVariant && (
                <p className="text-sm text-gray-500 font-mono">
                  SKU: {selectedVariant.variantSku}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="bg-white rounded-3xl shadow-xl p-6 lg:p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-600" />
                Product Description
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Color Selection with HEX */}
            <div className="bg-white rounded-3xl shadow-xl p-6 lg:p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Color: {selectedColor?.name}
                </h3>
                <span className="text-sm text-gray-500 font-mono">
                  {selectedColor?.hex}
                </span>
              </div>
              <div className="flex gap-3 flex-wrap">
                {availableColors.map((color) => (
                  <button
                    key={color.code}
                    onClick={() => {
                      setSelectedColor(color);
                      setSelectedSize(null);
                    }}
                    className={`group relative transition-all ${
                      selectedColor?.code === color.code
                        ? "scale-110"
                        : "hover:scale-105"
                    }`}
                    title={`${color.name} (${color.hex})`}
                  >
                    {/* Color Circle */}
                    <div
                      className={`w-14 h-14 rounded-full shadow-lg border-4 transition-all ${
                        selectedColor?.code === color.code
                          ? "border-purple-600 shadow-purple-300"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                      style={{
                        backgroundColor: color.hex || "",
                        boxShadow:
                          selectedColor?.code === color.code
                            ? `0 0 20px ${color.hex}40`
                            : undefined,
                      }}
                    >
                      {/* Check Icon */}
                      {selectedColor?.code === color.code && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-white rounded-full p-1 shadow-lg">
                            <Check
                              className="w-4 h-4 text-purple-600"
                              strokeWidth={3}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Color Name Tooltip */}
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      <span className="text-xs font-medium text-gray-700 bg-white px-2 py-1 rounded-lg shadow-md">
                        {color.name}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Size Selection */}
            <div className="bg-white rounded-3xl shadow-xl p-6 lg:p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Select Size
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {availableSizes.map((size) => {
                  const variant = product.variants.find(
                    (v) =>
                      v.size === size && v.color.code === selectedColor?.code
                  );
                  const inStock = variant && variant.quantityInStock > 0;

                  return (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      disabled={!inStock}
                      className={`relative py-4 rounded-2xl text-base font-bold transition-all ${
                        selectedSize === size
                          ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg scale-105"
                          : inStock
                          ? "bg-gray-100 text-gray-800 hover:bg-gray-200 hover:scale-105"
                          : "bg-gray-50 text-gray-300 cursor-not-allowed"
                      }`}
                    >
                      {size}
                      {selectedSize === size && (
                        <Check
                          className="w-4 h-4 absolute top-2 right-2"
                          strokeWidth={3}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Stock Status */}
              {selectedVariant && (
                <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100">
                  {selectedVariant.quantityInStock > 0 ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <Check className="w-5 h-5" strokeWidth={2.5} />
                      <span className="font-semibold">
                        In Stock - {selectedVariant.quantityInStock} available
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-600">
                      <X className="w-5 h-5" strokeWidth={2.5} />
                      <span className="font-semibold">Out of Stock</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quantity Selector */}
            {selectedVariant && selectedVariant.quantityInStock > 0 && (
              <div className="bg-white rounded-3xl shadow-xl p-6 lg:p-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Quantity
                </h3>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold text-xl transition-colors"
                  >
                    −
                  </button>
                  <span className="text-2xl font-bold text-gray-900 min-w-[3rem] text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() =>
                      setQuantity(
                        Math.min(selectedVariant.quantityInStock, quantity + 1)
                      )
                    }
                    className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold text-xl transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="sticky bottom-0 bg-white rounded-3xl shadow-2xl p-6 lg:p-8 space-y-3">
              <button
                disabled={
                  !selectedSize ||
                  !selectedVariant ||
                  selectedVariant.quantityInStock === 0
                }
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-2xl font-bold text-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 group"
              >
                <ShoppingBag className="w-5 h-5 group-hover:scale-110 transition-transform" />
                Add to Bag
              </button>
              <button
                disabled={
                  !selectedSize ||
                  !selectedVariant ||
                  selectedVariant.quantityInStock === 0
                }
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-2xl font-bold text-lg hover:from-orange-600 hover:to-red-600 transition-all shadow-lg hover:shadow-xl disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 group"
              >
                <Zap className="w-5 h-5 group-hover:scale-110 transition-transform" />
                Buy Now
              </button>
            </div>

            {/* Product Details */}
            {product.taxonomyPath && product.taxonomyPath.length > 0 && (
              <div className="bg-white rounded-3xl shadow-xl p-6 lg:p-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Product Details
                </h3>
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-gray-800">
                    Category Path:{" "}
                  </span>
                  {product.taxonomyPath.join(" → ")}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Zoom Image Modal */}
      {zoomImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="relative bg-white rounded-3xl p-4 max-w-5xl w-full shadow-2xl">
            <button
              className="absolute -top-4 -right-4 p-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full hover:scale-110 transition-transform shadow-xl z-10"
              onClick={() => setZoomImage(null)}
            >
              <X className="w-6 h-6" strokeWidth={2.5} />
            </button>
            <img
              src={zoomImage}
              alt="Zoomed product"
              className="w-full max-h-[85vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
