// src/hooks/useProductDetail.ts
import { useState, useEffect, useMemo, useCallback } from "react";
import api from "../config/axios";
import type {
  productDetail,
  Color,
  ProductImage,
  Variant,
} from "../config/interface";
import { useAppProvider } from "../context/useContex";
import { trackProductView } from "../services/trackingService";
import toast from "react-hot-toast";

export function useProductDetail(slug: string | undefined) {
  const [product, setProduct] = useState<productDetail | null>(null);

  // --- STATE CHO LỰA CHỌN ---
  const [selectedColor, setSelectedColor] = useState<Color | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  // --- STATE GIAO DIỆN ---
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user, setCart } = useAppProvider();

  // useEffect 1: Fetch product data
  useEffect(() => {
    async function fetchData(slug: string) {
      try {
        setLoading(true);
        setError(null);
        setProduct(null);
        const response = await api.get(`/api/catalog/products/${slug}`);
        setProduct(response.data);
      } catch (error: any) {
        setError(error.response?.data?.message || "Failed to load product");
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    // Chỉ fetch khi có slug
    if (slug) {
      fetchData(slug);
    } else {
      setLoading(false);
      setError("Product slug is missing.");
    }
  }, [slug]);

  // useEffect 2: Set giá trị mặc định khi 'product' được tải
  useEffect(() => {
    if (product) {
      const colors = Array.from(
        new Map(product.variants.map((v) => [v.color.code, v.color])).values()
      );
      // Set màu mặc định
      setSelectedColor(colors[0] || null);
      // Reset các lựa chọn khác
      setSelectedSize(null);
      setQuantity(1);
    }
  }, [product]);

  // --- TÍNH TOÁN DỮ LIỆU PHÁI SINH (Dùng useMemo) ---
  // Tốt hơn là dùng useMemo thay vì useState + useEffect cho dữ liệu phái sinh

  // Tính toán màu có sẵn (chỉ tính 1 lần khi product thay đổi)
  const availableColors = useMemo<Color[]>(() => {
    if (!product) return [];
    return Array.from(
      new Map(product.variants.map((v) => [v.color.code, v.color])).values()
    );
  }, [product]);

  // Tính toán size có sẵn (tính lại khi product hoặc màu thay đổi)
  const availableSizes = useMemo<string[]>(() => {
    if (!product || !selectedColor) return [];
    return product.variants
      .filter((v) => v.color.code === selectedColor.code && v.active)
      .map((v) => v.size);
  }, [product, selectedColor]);

  // Tính toán ảnh theo màu
  const colorImages = useMemo<ProductImage[]>(() => {
    if (!product || !selectedColor) return [];
    return product.images.filter(
      (img) => img.color.code === selectedColor.code
    );
  }, [product, selectedColor]);

  // Tính toán biến thể được chọn
  const selectedVariant = useMemo<Variant | null>(() => {
    if (!product || !selectedColor || !selectedSize) return null;
    return (
      product.variants.find(
        (v) => v.color.code === selectedColor.code && v.size === selectedSize
      ) || null
    );
  }, [product, selectedColor, selectedSize]);

  // useEffect 3 (thay cho 3 & 4): Reset size khi màu thay đổi
  useEffect(() => {
    setSelectedSize(null); // Reset size khi đổi màu
  }, [selectedColor]);

  // --- TRACKING LOGIC ---

  // useEffect 5: Track lượt xem trang
  useEffect(() => {
    if (product) {
      trackProductView(product.id, user?.token, {
        metadata: { page: "product-detail", context: "page-load" },
      });
    }
  }, [product, user?.token]);

  // useEffect 6: Theo dõi lượt chọn biến thể
  useEffect(() => {
    if (selectedVariant && product) {
      trackProductView(product.id, user?.token, {
        variantId: selectedVariant.id,
        metadata: { page: "product-detail", action: "variant_select" },
      });
    }
  }, [selectedVariant, product, user?.token]);

  // --- HANDLERS (Sử dụng useCallback) ---

  // Xử lý Add to Cart
  const handlAddToCart = useCallback(async () => {
    if (!selectedVariant || !user?.token) {
      toast.error("You must be logged in to use this feature");
      return;
    } // Kiểm tra an toàn
    try {
      const res = await api.post(
        "/api/cart/items",
        {
          variantId: selectedVariant.id,
          quantity: quantity,
        },
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );
      setCart(res.data);
      toast.success("The product has been successfully added to the cart");
    } catch (err) {
      console.error(err);
      // (Thêm toast error ở đây)
    }
  }, [selectedVariant, quantity, user?.token, setCart]);

  // --- GIÁ TRỊ TÍNH TOÁN ĐỂ HIỂN THỊ ---
  const mainImageUrl =
    colorImages[0]?.imageUrl || "https://via.placeholder.com/600";
  const primaryPrice = selectedVariant?.price || product?.basePrice || 0;

  // Trả về mọi thứ mà Giao diện (View) cần
  return {
    product,
    loading,
    error,

    // Dữ liệu đã xử lý
    availableColors,
    availableSizes,
    colorImages,
    selectedVariant,
    mainImageUrl,
    primaryPrice,

    // State và hàm Set cho tương tác
    selectedColor,
    setSelectedColor,
    selectedSize,
    setSelectedSize,
    quantity,
    setQuantity,

    // Hàm xử lý
    handlAddToCart,
  };
}
