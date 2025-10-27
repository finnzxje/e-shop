// src/components/admin/products/ProductEdit.tsx
import React, {
  useState,
  useEffect,
  useCallback, // Thêm useCallback
  type FormEvent,
  type ChangeEvent,
} from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import api from "../../../config/axios";
import { useAppProvider } from "../../../context/useContex";
import ProductForm from "./ProductForm";
import ProductMediaManagement from "./ProductMediaManagement";
import ProductVariantManagement from "./ProductVariantManagement";
import type { ProductFormPayload, Category, FullProduct } from "./types";

// --- State khởi tạo cho Form ---
const initialFormState: ProductFormPayload = {
  name: "",
  slug: "",
  description: "",
  basePrice: 0,
  categoryId: "",
  status: "DRAFT",
  featured: false,
  gender: "unisex",
  productType: "tops",
  tags: [],
};

const ProductEdit: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const { user } = useAppProvider();

  // --- SỬA LỖI STATE ---
  // Tách làm 2 state:
  // 1. Dữ liệu cho Form (những gì người dùng nhập)
  const [productForm, setProductForm] =
    useState<ProductFormPayload>(initialFormState);
  // 2. Dữ liệu đầy đủ từ API (bao gồm images, variants...)
  const [fullProduct, setFullProduct] = useState<FullProduct | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagsInput, setTagsInput] = useState("");

  // --- SỬA LỖI FETCHING & SCOPE ---
  // Định nghĩa các hàm fetch bên ngoài useEffect
  const fetchCategories = useCallback(async () => {
    if (!user?.token) return;
    try {
      const response = await api.get("/api/catalog/categories", {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setCategories(response.data);
    } catch (err) {
      console.error("Không thể tải categories", err);
      setError("Không thể tải danh sách danh mục.");
    }
  }, [user?.token]);

  const fetchProduct = useCallback(async () => {
    if (!productId || !user?.token) return;
    try {
      const response = await api.get<FullProduct>(
        `/api/admin/catalog/products/${productId}`,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      const data = response.data;

      // 1. Cập nhật state data đầy đủ
      setFullProduct(data);

      // 2. Cập nhật state cho Form
      setProductForm({
        name: data.name,
        slug: data.slug,
        description: data.description,
        basePrice: data.basePrice,
        categoryId: data.category.id, // SỬA LỖI: Lấy từ object category
        status: data.status,
        featured: data.featured,
        gender: data.gender,
        productType: data.productType,
        tags: data.tags || [],
      });
      setTagsInput((data.tags || []).join(", "));
    } catch (err) {
      console.error("Lỗi tải sản phẩm:", err);
      setError("Không thể tìm thấy sản phẩm hoặc đã có lỗi xảy ra.");
    }
  }, [productId, user?.token]);

  // Hàm loadData chung, có thể gọi lại bởi onUpdate
  const loadData = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setError(null);
    // Chờ cả 2 hàm fetch chạy xong
    await Promise.all([fetchCategories(), fetchProduct()]);
    setLoading(false);
  }, [productId, fetchCategories, fetchProduct]);

  // useEffect chính chỉ gọi loadData
  useEffect(() => {
    loadData();
  }, [loadData]); // Chỉ phụ thuộc vào loadData

  // --- Handlers ---
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    // Cập nhật state của Form
    setProductForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : type === "number"
          ? parseFloat(value) || 0
          : value,
    }));
  };

  const handleTagsChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setTagsInput(value);
    const tagsArray = value
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
    // Cập nhật state của Form
    setProductForm((prev) => ({
      ...prev,
      tags: tagsArray,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (productForm.categoryId === "") {
      setError("Vui lòng chọn một danh mục.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Gửi đi state của Form
      const payload = {
        ...productForm,
        status: productForm.status.toLowerCase(),
      };

      await api.put(`/api/admin/catalog/products/${productId}`, payload, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });

      // Sau khi submit thành công, fetch lại data (đặc biệt là updatedAt)
      await fetchProduct();
      // toast.success("Cập nhật thành công!");
    } catch (error: any) {
      console.error("Lỗi khi lưu sản phẩm:", error);
      if (error.response?.status === 409) {
        setError("Lỗi: Slug này đã tồn tại. Vui lòng chọn một slug khác.");
      } else if (error.response?.status === 404) {
        setError("Lỗi: Danh mục được chọn không tồn tại.");
      } else {
        setError("Đã xảy ra lỗi khi lưu sản phẩm.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // --- Render ---

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // SỬA LỖI: Thêm Guard kiểm tra productId
  if (!productId) {
    return (
      <div className="container mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold text-red-600">{error || "Lỗi"}</h1>
        <p className="text-gray-600">Không tìm thấy ID sản phẩm.</p>
        <Link
          to="/admin/products"
          className="text-blue-600 hover:underline mt-4 inline-block"
        >
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  // Nếu code chạy tới đây, TypeScript biết `productId` là `string`
  return (
    <div className="container mx-auto p-4">
      <Link
        to="/admin/products"
        className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
      >
        <ArrowLeft size={18} className="mr-2" />
        Quay lại danh sách sản phẩm
      </Link>

      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Chỉnh sửa sản phẩm
      </h1>

      {/* 1. Form chung (dùng state 'productForm') */}
      <ProductForm
        product={productForm}
        categories={categories}
        tagsInput={tagsInput}
        submitting={submitting}
        error={error}
        isEditMode={true}
        onFormSubmit={handleSubmit}
        onProductChange={handleChange}
        onTagsChange={handleTagsChange}
      />

      {/* 2. Các component con (dùng state 'fullProduct') */}
      <div className="mt-12">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">
          Quản lý Hình ảnh & Biến thể
        </h2>

        {/* SỬA LỖI: Lấy images/variants từ `fullProduct` */}
        <ProductMediaManagement
          productId={productId}
          initialImages={fullProduct?.images || []}
          onUpdate={loadData}
        />
        <ProductVariantManagement
          productId={productId}
          initialVariants={fullProduct?.variants || []}
          onUpdate={loadData}
        />
      </div>
    </div>
  );
};

export default ProductEdit;
