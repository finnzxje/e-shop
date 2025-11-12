import { useState } from "react";
import { X, Check, ShoppingBag, Package, Heart } from "lucide-react";
import { useParams } from "react-router-dom";
import { ProductReviews } from "./productReviews";
import { useProductDetail } from "../hooks/useProductDetail";
import { useAppProvider } from "../context/useContex";
import toast from "react-hot-toast";
import { Recomender } from "./Recomender";
interface WishlistItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  basePrice: number;
  productActive: boolean;
  addedAt: string;
}
export default function Detail() {
  const { slug } = useParams<{ slug: string }>();
  const { user, wishlist, addToWishlist, removeFromWishlist } =
    useAppProvider();

  const {
    product,
    loading,
    error,
    availableColors,
    availableSizes,
    colorImages,
    selectedVariant,
    mainImageUrl,
    primaryPrice,
    selectedColor,
    setSelectedColor,
    selectedSize,
    setSelectedSize,
    quantity,
    setQuantity,
    handlAddToCart,
  } = useProductDetail(slug);

  // State UI cho zoom
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  const isWishlisted =
    wishlist?.some((item: WishlistItem) => item.productId === product?.id) ||
    false;
  const toggleWishlist = async (productId: string) => {
    if (!user?.token) {
      toast.error("Please log in to add items to your wishlist.");
      return;
    }

    try {
      if (isWishlisted) {
        await removeFromWishlist(productId);
      } else {
        await addToWishlist(productId);
      }
    } catch (err) {
      console.error("Failed to update wishlist:", err);
    }
  };

  // --- RENDER ---

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-base text-gray-500">Loading product...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="text-4xl mb-3">😢</div>
          <p className="text-base text-red-600 font-semibold">
            {error || "Product not found"}
          </p>
        </div>
      </div>
    );
  }

  // Giao diện JSX đã được dịch
  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* === CỘT BÊN TRÁI: HÌNH ẢNH === */}
            <div className="space-y-3 lg:sticky lg:top-6 lg:self-start">
              {/* Ảnh chính */}
              <div
                className="relative bg-white rounded-lg border border-gray-200 overflow-hidden cursor-zoom-in aspect-square"
                onClick={() => setZoomImage(mainImageUrl)}
              >
                <img
                  src={mainImageUrl}
                  alt={colorImages[0]?.altText || product.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 bg-white/80 px-2 py-1 rounded-md">
                  <p className="text-xs font-medium text-gray-700">
                    Click to zoom
                  </p>
                </div>
              </div>

              {/* Ảnh thumbnails */}
              {colorImages.length > 1 && (
                <div className="grid grid-cols-4 gap-3">
                  {colorImages.slice(1, 5).map((img) => (
                    <div
                      key={img.id}
                      className="relative bg-white rounded-md border border-gray-200 overflow-hidden cursor-pointer aspect-square"
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

            {/* === CỘT BÊN PHẢI: THÔNG TIN & LỰA CHỌN === */}
            <div className="space-y-6">
              {/* THẺ CHÍNH */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
                {/* 1. Header */}
                <div>
                  <div className="flex gap-2 flex-wrap mb-2">
                    <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                      {product.category.name}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium capitalize">
                      {product.gender}
                    </span>
                  </div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                    {product.name}
                  </h1>
                  <div className="flex items-baseline gap-3 mb-2">
                    <p className="text-3xl font-semibold text-gray-900">
                      ${primaryPrice.toFixed(2)}
                    </p>
                  </div>
                  {selectedVariant && (
                    <p className="text-xs text-gray-500 font-mono">
                      SKU: {selectedVariant.variantSku}
                    </p>
                  )}
                </div>

                <hr className="border-gray-100" />

                {/* 2. Chọn màu */}
                <div className="relative">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">
                    Color: {selectedColor?.name}
                  </h3>
                  <div className="flex gap-2 flex-wrap">
                    {availableColors.map((color) => (
                      <button
                        key={color.code}
                        onClick={() => setSelectedColor(color)}
                        className="group relative"
                        title={`${color.name} (${color.hex})`}
                      >
                        <div
                          className={`w-10 h-10 rounded-full border-2 transition-all ${
                            selectedColor?.code === color.code
                              ? "border-blue-500"
                              : "border-gray-200 hover:border-gray-400"
                          }`}
                          style={{ backgroundColor: color.hex || "" }}
                        >
                          {selectedColor?.code === color.code && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Check
                                className="w-4 h-4 text-white"
                                strokeWidth={3}
                              />
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      toggleWishlist(product.id);
                    }}
                    className={`p-2 absolute top-0 right-0 rounded-full transition-all duration-300 group
              ${
                isWishlisted
                  ? "bg-black hover:bg-gray-800 active:bg-gray-900 shadow-lg"
                  : "bg-white hover:bg-black active:bg-gray-800 border border-gray-200 hover:border-black"
              }`}
                  >
                    {isWishlisted ? (
                      <Heart
                        className="text-white cursor-pointer transform transition-all duration-300 ease-out 
                 group-hover:scale-110 group-active:scale-90"
                        fill="currentColor"
                        strokeWidth={1.5}
                      />
                    ) : (
                      <Heart
                        className="text-gray-700 group-hover:text-white cursor-pointer transform transition-all duration-200 ease-out 
                 group-hover:scale-110
                 group-active:scale-125 group-active:rotate-12"
                        strokeWidth={1.5}
                      />
                    )}
                  </button>
                </div>

                {/* 3. Chọn Size */}
                <div>
                  {/* Đã dịch & In đậm */}
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">
                    Size
                  </h3>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {availableSizes.map((size) => {
                      const variant = product.variants.find(
                        (v) =>
                          v.size === size &&
                          v.color.code === selectedColor?.code
                      );
                      const inStock = variant && variant.quantityInStock > 0;

                      return (
                        <button
                          key={size}
                          onClick={() => setSelectedSize(size)}
                          disabled={!inStock}
                          className={`relative py-3 rounded-md text-sm font-medium transition-all ${
                            selectedSize === size
                              ? "bg-gray-900 text-white"
                              : inStock
                              ? "bg-white border border-gray-300 text-gray-800 hover:bg-gray-50"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed line-through"
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                  {/* 3a. Trạng thái kho hàng */}
                  {selectedVariant && (
                    <div className="mt-3 p-3 rounded-md bg-gray-50">
                      {selectedVariant.quantityInStock > 0 ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <Check className="w-4 h-4" strokeWidth={2.5} />

                          <span className="font-medium text-sm">
                            In Stock ({selectedVariant.quantityInStock})
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-red-600">
                          <X className="w-4 h-4" strokeWidth={2.5} />

                          <span className="font-medium text-sm">
                            Out of Stock
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <hr className="border-gray-100" />

                {/* 4. Chọn số lượng */}
                {selectedVariant && selectedVariant.quantityInStock > 0 && (
                  <div>
                    {/* Đã dịch & In đậm */}
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">
                      Quantity
                    </h3>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-10 h-10 rounded-md bg-gray-100 hover:bg-gray-200 font-bold text-lg"
                      >
                        −
                      </button>
                      <span className="text-lg font-bold text-gray-900 min-w-[2.5rem] text-center">
                        {quantity}
                      </span>
                      <button
                        onClick={() =>
                          setQuantity(
                            Math.min(
                              selectedVariant.quantityInStock,
                              quantity + 1
                            )
                          )
                        }
                        className="w-10 h-10 rounded-md bg-gray-100 hover:bg-gray-200 font-bold text-lg"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                {/* 5. Nút Hành động */}
                <div className="space-y-3 pt-2">
                  <button
                    onClick={handlAddToCart}
                    disabled={
                      !selectedVariant || selectedVariant.quantityInStock === 0
                    }
                    className="w-full bg-gray-800 text-white py-3 rounded-md font-semibold text-base hover:bg-gray-900 transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    Add to Bag
                  </button>
                  {/* <button
                    disabled={
                      !selectedVariant || selectedVariant.quantityInStock === 0
                    }
                    className="w-full bg-white text-gray-800 border border-gray-800 py-3 rounded-md font-semibold text-base hover:bg-gray-50 transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    Buy Now
                  </button> */}
                </div>
              </div>

              {/* THẺ MÔ TẢ */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                {/* Đã dịch & In đậm */}
                <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Package className="w-5 h-5 text-gray-600" />
                  Product Description
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {product.description}
                </p>
                {product.taxonomyPath && product.taxonomyPath.length > 0 && (
                  <p className="text-xs text-gray-600 mt-4">
                    <span className="font-medium text-gray-800">
                      Category:{" "}
                    </span>
                    {product.taxonomyPath.join(" → ")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Zoom Image Modal */}
        {zoomImage && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="relative bg-white rounded-lg p-2 max-w-4xl w-full shadow-xl">
              <button
                className="absolute -top-3 -right-3 p-2 bg-gray-700 text-white rounded-full hover:scale-105 transition-transform shadow z-10"
                onClick={() => setZoomImage(null)}
              >
                <X className="w-5 h-5" strokeWidth={2.5} />
              </button>
              <img
                src={zoomImage}
                alt="Zoomed product"
                className="w-full max-h-[85vh] object-contain rounded-md"
              />
            </div>
          </div>
        )}

        {/* Component Đánh giá */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-8 border-t border-gray-200">
          <ProductReviews productId={product.id} />
        </div>
        <Recomender
          productId={product.variants[0].id ? product.variants[0].id : null}
        />
      </div>
    </>
  );
}
