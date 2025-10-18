import { useState, useEffect } from "react";
import { X, Check, ShoppingBag, Zap, Package } from "lucide-react";
import { useParams } from "react-router-dom";
import api from "../config/axios";
// THAY ĐỔI: Thêm interface 'ProductImage' và 'Variant' (suy ra từ code của bạn)
import type {
  productDetail,
  Color,
  ProductImage,
  Variant,
} from "../config/interface";
import { useAppProvider } from "../context/useContex";
import { trackProductView } from "../services/trackingService";

export default function Detail() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<productDetail | null>(null);

  // --- STATE CHO LỰA CHỌN ---
  const [selectedColor, setSelectedColor] = useState<Color | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  // --- STATE CHO DỮ LIỆU PHÁI SINH ---
  const [availableColors, setAvailableColors] = useState<Color[]>([]);
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);
  const [colorImages, setColorImages] = useState<ProductImage[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);

  // --- STATE GIAO DIỆN ---
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user, setCart } = useAppProvider();

  // useEffect 1: Fetch product data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        setProduct(null); // Xóa sản phẩm cũ
        const response = await api.get(`/api/catalog/products/${slug}`);
        setProduct(response.data);
      } catch (error: any) {
        setError(error.response?.data?.message || "Failed to load product");
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [slug]);

  // useEffect 2: Set giá trị mặc định khi 'product' được tải
  useEffect(() => {
    if (product) {
      // TÍNH TOÁN MÀU CÓ SẴN (Lấy từ 'variants', không phải 'images')
      const colors = Array.from(
        new Map(product.variants.map((v) => [v.color.code, v.color])).values()
      );
      setAvailableColors(colors);

      // SỬA LỖI: Set màu mặc định dựa trên 'variants'
      setSelectedColor(colors[0] || null);

      setSelectedSize(null); // Reset size
      setQuantity(1); // Reset số lượng
    }
  }, [product]);

  // useEffect 3: Cập nhật 'availableSizes' và 'colorImages' khi 'selectedColor' thay đổi
  useEffect(() => {
    if (product && selectedColor) {
      // Cập nhật size có sẵn
      const sizes = product.variants
        .filter((v) => v.color.code === selectedColor.code && v.active)
        .map((v) => v.size);
      setAvailableSizes(sizes);

      // Cập nhật ảnh theo màu
      const images = product.images.filter(
        (img) => img.color.code === selectedColor.code
      );
      setColorImages(images);

      // Reset size và variant
      setSelectedSize(null);
      setSelectedVariant(null);
    }
  }, [product, selectedColor]);

  // useEffect 4: Cập nhật 'selectedVariant' khi 'selectedSize' thay đổi
  useEffect(() => {
    if (product && selectedColor && selectedSize) {
      const variant = product.variants.find(
        (v) => v.color.code === selectedColor.code && v.size === selectedSize
      );
      setSelectedVariant(variant || null);
    } else {
      setSelectedVariant(null);
    }
  }, [product, selectedColor, selectedSize]);

  // --- TÍCH HỢP (TRACKING) ---
  // useEffect 5: Track lượt xem trang
  useEffect(() => {
    if (product) {
      trackProductView(product.id, user?.token, {
        metadata: { page: "product-detail", context: "page-load" },
      });
    }
  }, [product, user?.token]);

  // --- TÍCH HỢP (3): THEO DÕI LƯỢT CHỌN BIẾN THỂ ---
  useEffect(() => {
    // SỬA LỖI: Phải kiểm tra cả 'product' VÀ 'selectedVariant'
    if (selectedVariant && product) {
      trackProductView(
        product.id, // <-- Giờ đã an toàn
        user?.token,
        {
          variantId: selectedVariant.id,
          metadata: { page: "product-detail", action: "variant_select" },
        }
      );
    }
    // SỬA LỖI: Dùng 'product' thay vì 'product.id' trong dependency array
  }, [selectedVariant, product, user?.token]);
  // --- KẾT THÚC SỬA LỖI ---

  // useEffect 7: Lock scroll khi zoom
  useEffect(() => {
    document.body.style.overflow = zoomImage ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [zoomImage]);

  // Xử lý Add to Cart
  const handlAddToCart = async () => {
    if (!selectedVariant) return; // Kiểm tra an toàn
    try {
      const res = await api.post(
        "/api/cart/items",
        {
          variantId: selectedVariant.id,
          quantity: quantity,
        },
        {
          headers: {
            Authorization: `Bearer ${user?.token}`,
          },
        }
      );
      setCart(res.data);
      // Thêm thông báo thành công (ví dụ: react-hot-toast)
      // toast.success("Added to cart!");
    } catch (err) {
      console.error(err);
      // Thêm thông báo lỗi
      // toast.error("Failed to add item.");
    }
  };

  // --- PHẦN RENDER ---

  if (loading) {
    // (Giao diện Loading không đổi)
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
    // (Giao diện Error không đổi)
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

  const mainImageUrl =
    colorImages[0]?.imageUrl || "https://via.placeholder.com/600";
  const primaryPrice = selectedVariant?.price || product.basePrice;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* === CỘT BÊN TRÁI: HÌNH ẢNH === */}
          <div className="space-y-4 lg:sticky lg:top-8 lg:self-start">
            {/* Ảnh chính */}
            <div
              className="relative bg-white rounded-3xl shadow-xl overflow-hidden cursor-zoom-in group aspect-square"
              onClick={() => setZoomImage(mainImageUrl)}
            >
              <img
                src={mainImageUrl}
                alt={colorImages[0]?.altText}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
                <p className="text-sm font-semibold text-gray-800">
                  Click to zoom
                </p>
              </div>
            </div>

            {/* Ảnh thumbnails */}
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

          {/* === CỘT BÊN PHẢI: THÔNG TIN & LỰA CHỌN (ĐÃ GỘP) === */}
          <div className="space-y-6">
            {/* THẺ CHÍNH (GỘP TẤT CẢ LỰA CHỌN VÀO ĐÂY) */}
            <div className="bg-white rounded-3xl shadow-xl p-6 lg:p-8 space-y-6">
              {/* 1. Header (Tên, Giá, Category) */}
              <div>
                <div className="flex gap-2 flex-wrap mb-3">
                  <span className="inline-flex items-center px-4 py-1.5 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 rounded-full text-sm font-semibold">
                    {product.category.name}
                  </span>
                  <span className="inline-flex items-center px-4 py-1.5 bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 rounded-full text-sm font-semibold capitalize">
                    {product.gender}
                  </span>
                </div>
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
                  {product.name}
                </h1>
                <div className="flex items-baseline gap-3 mb-2">
                  <p className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    ${primaryPrice}
                  </p>
                </div>
                {selectedVariant && (
                  <p className="text-sm text-gray-500 font-mono">
                    SKU: {selectedVariant.variantSku}
                  </p>
                )}
              </div>

              <hr className="border-gray-100" />

              {/* 2. Chọn màu */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Color: {selectedColor?.name}
                  </h3>
                </div>
                <div className="flex gap-3 flex-wrap">
                  {availableColors.map((color) => (
                    <button
                      key={color.code}
                      onClick={() => setSelectedColor(color)}
                      className={`group relative transition-all ${
                        selectedColor?.code === color.code
                          ? "scale-110"
                          : "hover:scale-105"
                      }`}
                      title={`${color.name} (${color.hex})`}
                    >
                      <div
                        className={`w-14 h-14 rounded-full shadow-lg border-4 transition-all ${
                          selectedColor?.code === color.code
                            ? "border-purple-600 shadow-purple-300"
                            : "border-gray-200 hover:border-gray-400"
                        }`}
                        style={{ backgroundColor: color.hex || "" }}
                      >
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
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Chọn Size */}
              <div>
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
                {/* 3a. Trạng thái kho hàng */}
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

              <hr className="border-gray-100" />

              {/* 4. Chọn số lượng */}
              {selectedVariant && selectedVariant.quantityInStock > 0 && (
                <div>
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
                          Math.min(
                            selectedVariant.quantityInStock,
                            quantity + 1
                          )
                        )
                      }
                      className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold text-xl transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* 5. Nút Hành động */}
              <div className="space-y-3 pt-4">
                <button
                  onClick={handlAddToCart}
                  disabled={
                    !selectedVariant || selectedVariant.quantityInStock === 0
                  }
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-2xl font-bold text-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 group"
                >
                  <ShoppingBag className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  Add to Bag
                </button>
                <button
                  disabled={
                    !selectedVariant || selectedVariant.quantityInStock === 0
                  }
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-2xl font-bold text-lg hover:from-orange-600 hover:to-red-600 transition-all shadow-lg hover:shadow-xl disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 group"
                >
                  <Zap className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  Buy Now
                </button>
              </div>
            </div>

            {/* THẺ MÔ TẢ (Vẫn giữ riêng biệt để dễ đọc) */}
            <div className="bg-white rounded-3xl shadow-xl p-6 lg:p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-600" />
                Product Description
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {product.description}
              </p>
              {product.taxonomyPath && product.taxonomyPath.length > 0 && (
                <p className="text-sm text-gray-600 mt-4">
                  <span className="font-medium text-gray-800">
                    Category Path:{" "}
                  </span>
                  {product.taxonomyPath.join(" → ")}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Zoom Image Modal (Không đổi) */}
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
