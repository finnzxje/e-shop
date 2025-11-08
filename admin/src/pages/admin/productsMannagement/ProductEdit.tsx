import React, {
  useState,
  useEffect,
  useCallback,
  type FormEvent,
  type ChangeEvent,
} from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import api from "../../../config/axios";
import { useAppProvider } from "../../../context/useContext";
import ProductForm from "./ProductForm";
import ProductMediaManagement from "./ProductMediaManagement";
import ProductVariantManagement from "./ProductVariantManagement";
import type { ProductFormPayload, Category, FullProduct } from "./types";
import toast from "react-hot-toast";

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

  const [productForm, setProductForm] =
    useState<ProductFormPayload>(initialFormState);

  const [fullProduct, setFullProduct] = useState<FullProduct | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagsInput, setTagsInput] = useState("");

  const fetchCategories = useCallback(async () => {
    if (!user?.token) return;
    try {
      const response = await api.get("/api/catalog/categories", {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setCategories(response.data);
    } catch (err) {
      console.error("Could not load categories", err);
      setError("Could not load the category list.");
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

      setFullProduct(data);
      const tagNames = (data.tags || [])
        .map((tag: any) => (tag.tag || "").trim())
        .filter(Boolean);

      setProductForm({
        name: data.name,
        slug: data.slug,
        description: data.description,
        basePrice: data.basePrice,
        categoryId: data.category.id,
        status: data.status,
        featured: data.featured,
        gender: data.gender,
        productType: data.productType,
        tags: tagNames,
      });
      setTagsInput(tagNames.join(", "));
    } catch (err) {
      console.error("Error loading product:", err);
      setError("Could not find the product or an error occurred.");
    }
  }, [productId, user?.token]);

  const loadData = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setError(null);

    await Promise.all([fetchCategories(), fetchProduct()]);
    setLoading(false);
  }, [productId, fetchCategories, fetchProduct]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- Handlers ---
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
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

    setProductForm((prev) => ({
      ...prev,
      tags: tagsArray,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (productForm.categoryId === "") {
      setError("Please select a category.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        ...productForm,
        status: productForm.status.toLowerCase(),
      };

      await api.put(`/api/admin/catalog/products/${productId}`, payload, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });

      await fetchProduct();
      toast.success("Updated information successfully!");
    } catch (error: any) {
      console.error("Error saving product:", error);
      if (error.response?.status === 409) {
        setError(error.response.data.message);
      } else if (error.response?.status === 404) {
        setError(error.response.data.message);
      } else if (error.response?.status === 400) {
        setError(error.response.data.message);
      } else {
        setError("An error occurred while saving the product.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!productId) {
    return (
      <div className="container mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold text-red-600">{error || "Error"}</h1>
        <p className="text-gray-600">Product ID not found.</p>
        <Link
          to="/admin/products"
          className="text-blue-600 hover:underline mt-4 inline-block"
        >
          Back to list
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Link
        to="/admin/products"
        className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
      >
        <ArrowLeft size={18} className="mr-2" />
        Back to product list
      </Link>

      <h1 className="text-3xl font-bold text-gray-800 mb-6">Edit Product</h1>

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

      <div className="mt-12">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">
          Manage Images & Variants
        </h2>

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
