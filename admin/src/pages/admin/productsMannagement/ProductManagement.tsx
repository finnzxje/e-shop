import React, { useState, useEffect, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Edit, Loader2 } from "lucide-react";
import api from "../../../config/axios";
import axios from "axios";
import { useAppProvider } from "../../../context/useContex";
import toast from "react-hot-toast";

type ProductSummary = {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  status: string;
  featured: boolean;
  updatedAt: string;
};

type PageResponse<T> = {
  content: T[];
  totalPages: number;
  totalElements: number;
  page: number;
  size: number;
};

type ProductFilters = {
  search: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED" | "";
  page: number;
  size: number;
};

// --- Component Chính ---

const ProductManagement: React.FC = () => {
  const { user } = useAppProvider();
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [pagination, setPagination] = useState({
    page: 0,
    totalPages: 1,
  });
  const [filters, setFilters] = useState<ProductFilters>({
    search: "",
    status: "",
    page: 0,
    size: 10,
  });
  const [apiError, setApiError] = useState<string | null>(null);

  // State để theo dõi ID sản phẩm đang được cập nhật status
  const [patchingStatusId, setPatchingStatusId] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setApiError(null);

      const params = {
        search: filters.search || undefined,
        status: filters.status || undefined,
        page: filters.page,
        size: filters.size,
        sort: "updatedAt,desc",
      };

      try {
        const response = await api.get<PageResponse<ProductSummary>>(
          "/api/admin/catalog/products",
          {
            params,
            headers: { Authorization: `Bearer ${user?.token}` },
          }
        );

        const data = response.data;
        console.log(params);
        setProducts(data.content);
        setPagination({
          page: data.page,
          totalPages: data.totalPages,
        });
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error("Lỗi gọi API:", error.response?.data);
          setApiError(
            `Could not load products: ${
              error.response?.data?.message || error.message
            }`
          );
        } else {
          console.error("Lỗi không xác định:", error);
          setApiError("An unexpected error occurred.");
        }
      } finally {
        setLoading(false);
      }
    };

    if (user?.token) {
      fetchProducts();
    }
  }, [filters, user?.token]);

  const handleFilterChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    // Khi filter thay đổi, quay về trang đầu tiên (page 0)
    setFilters((prev) => ({
      ...prev,
      [name]: value,
      page: 0,
    }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  const handleStatusChange = async (productId: string, newStatus: string) => {
    // 1. Hiển thị loading cho riêng hàng này
    setPatchingStatusId(productId);
    // 2. Cập nhật state (Optimistic Update)
    setProducts((prevProducts) =>
      prevProducts.map((p) =>
        p.id === productId ? { ...p, status: newStatus.toUpperCase() } : p
      )
    );

    try {
      // 3. Gọi API (API docs yêu cầu chữ thường)
      await api.patch(
        `/api/admin/catalog/products/${productId}/status`,
        { status: newStatus.toLowerCase() },
        {
          headers: { Authorization: `Bearer ${user?.token}` },
        }
      );

      toast.success("Update status successful!");
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái:", error);

      alert(
        "Could not update status. Data may be out of sync, please reload the page."
      );
      // Optional: Rollback state if API call failed
      // fetchProducts(); // Hoặc fetch lại data
    } finally {
      // 4. Tắt loading
      setPatchingStatusId(null);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Product Management</h1>
        <Link
          to="/admin/products/new"
          className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} className="mr-2" />
          Add Product
        </Link>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <input
              type="text"
              name="search"
              placeholder="Search name, slug, description..."
              value={filters.search}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border rounded-lg pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </div>
          <div>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-lg shadow-md overflow-x-auto">
        {loading && (
          <div className="p-6 text-center text-gray-500">Loading...</div>
        )}
        {!loading && apiError && (
          <div className="p-6 text-center text-red-600">{apiError}</div>
        )}
        {!loading && !apiError && products.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            No products found.
          </div>
        )}

        {!loading && !apiError && products.length > 0 && (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {product.name}
                    </div>
                    <div className="text-sm text-gray-500">{product.slug}</div>
                  </td>

                  {/* Status Dropdown */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {/* Hiển thị spinner nếu đang patching hàng này */}
                    {patchingStatusId === product.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <select
                        value={product.status.toUpperCase()}
                        onChange={(e) =>
                          handleStatusChange(product.id, e.target.value)
                        }
                        // Ngăn click vào select box trigger sự kiện click của hàng
                        onClick={(e) => e.stopPropagation()}
                        className={`px-3 py-1 text-xs leading-5 font-semibold rounded-full border-0 focus:ring-0 appearance-none bg-no-repeat bg-right pr-7
                          ${
                            product.status.toUpperCase() === "ACTIVE"
                              ? "bg-green-100 text-green-800"
                              : product.status.toUpperCase() === "DRAFT"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        // Add basic dropdown arrow styling
                        style={{
                          backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-chevron-down" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/></svg>')`,
                          backgroundPosition: "right 0.5rem center",
                          backgroundSize: "0.8em",
                        }}
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="DRAFT">DRAFT</option>
                        <option value="ARCHIVED">ARCHIVED</option>
                      </select>
                    )}
                  </td>

                  {/* Price */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {product.basePrice.toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                    })}
                  </td>
                  {/* Last Updated */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(product.updatedAt).toLocaleString("en-US")}{" "}
                  </td>
                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      to={`/admin/products/${product.id}`}
                      className="text-blue-600 hover:text-blue-900 justify-center flex"
                      title="Edit"
                    >
                      <Edit size={18} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && !apiError && pagination.totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 0}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-700">
            Page {pagination.page + 1} of {pagination.totalPages}
          </span>
          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page + 1 >= pagination.totalPages}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductManagement;
