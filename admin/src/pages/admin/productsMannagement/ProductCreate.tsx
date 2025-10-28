// src/components/admin/products/ProductCreate.tsx
import React, {
  useState,
  useEffect,
  type FormEvent,
  type ChangeEvent,
} from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import api from "../../../config/axios";
import { useAppProvider } from "../../../context/useContex";
import ProductForm from "./ProductForm"; // Import form UI
import type { ProductFormPayload, Category } from "./types"; // (Import từ file types.ts)

// State khởi tạo cho sản phẩm mới
const initialState: ProductFormPayload = {
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

const ProductCreate: React.FC = () => {
  const { user } = useAppProvider();
  const navigate = useNavigate();

  const [product, setProduct] = useState<ProductFormPayload>(initialState);
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagsInput, setTagsInput] = useState("");

  // --- Data Fetching ---
  useEffect(() => {
    // Chỉ fetch Categories
    const fetchCategories = async () => {
      try {
        const response = await api.get("/api/catalog/categories", {
          headers: { Authorization: `Bearer ${user?.token}` },
        });
        setCategories(response.data);
      } catch (err) {
        console.error("Unable to load categories", err);
        setError("Unable to load category list.");
      }
    };

    fetchCategories();
  }, [user?.token]);

  // --- Handlers ---
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    setProduct((prev) => ({
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
    setProduct((prev) => ({
      ...prev,
      tags: tagsArray,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (product.categoryId === "") {
      setError("Please select a category.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        ...product,
        status: product.status.toLowerCase(),
      };

      // Chỉ dùng logic POST
      const response = await api.post(`/api/admin/catalog/products`, payload, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });

      // Điều hướng đến trang edit của sản phẩm vừa tạo
      const newId = response.data.id;
      navigate(`/admin/products/${newId}`);
      // toast.success("Tạo sản phẩm thành công!"); // Nên thêm toast
    } catch (error: any) {
      console.error("Lỗi khi tạo sản phẩm:", error);
      if (error.response?.status === 409) {
        setError(
          "Error: This slug already exists. Please choose another slug."
        );
      } else if (error.response?.status === 404) {
        setError("Error: The selected category does not exist.");
      } else {
        setError("An error occurred while creating the product.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Link
        to="/admin/products"
        className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
      >
        <ArrowLeft size={18} className="mr-2" />
        Return to product list
      </Link>

      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Create new products
      </h1>

      <ProductForm
        product={product}
        categories={categories}
        tagsInput={tagsInput}
        submitting={submitting}
        error={error}
        isEditMode={false} // Luôn là false
        onFormSubmit={handleSubmit}
        onProductChange={handleChange}
        onTagsChange={handleTagsChange}
      />
    </div>
  );
};

export default ProductCreate;
