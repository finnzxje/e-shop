import React, { useState, useEffect, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Edit, Trash2, Loader2 } from "lucide-react"; // Thêm Loader2
import api from "../../../config/axios";
import axios from "axios";
import { useAppProvider } from "../../../context/useContex";
import toast from "react-hot-toast";

// --- Types (Đã cập nhật) ---

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
    // ... (Toàn bộ useEffect của bạn giữ nguyên, không thay đổi)
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
            `Không thể tải sản phẩm: ${
              error.response?.data?.message || error.message
            }`
          );
        } else {
          console.error("Lỗi không xác định:", error);
          setApiError("Đã xảy ra lỗi không mong muốn.");
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

  // --- THÊM MỚI: Hàm xử lý gọi API PATCH status ---
  const handleStatusChange = async (productId: string, newStatus: string) => {
    // 1. Hiển thị loading cho riêng hàng này
    setPatchingStatusId(productId);

    // 2. Cập nhật state (Optimistic Update)
    // Cập nhật UI ngay lập tức để người dùng thấy thay đổi
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

      toast.success("Cập nhật thành công");
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái:", error);
      // Lỗi: Báo cho người dùng và (lý tưởng) là fetch lại data
      // hoặc rollback state, ở đây ta chỉ cảnh báo
      alert(
        "Không thể cập nhật trạng thái. Dữ liệu có thể không đồng bộ, vui lòng tải lại trang."
      );
    } finally {
      // 4. Tắt loading
      setPatchingStatusId(null);
    }
  };

  return (
    <div className="container mx-auto p-4">
      {/* ... (Header và Filter giữ nguyên) ... */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Quản lý Sản phẩm</h1>
        <Link
          to="/admin/products/new"
          className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} className="mr-2" />
          Thêm sản phẩm
        </Link>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <input
              type="text"
              name="search"
              placeholder="Tìm kiếm tên, slug, mô tả..."
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
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động (Active)</option>
              <option value="DRAFT">Bản nháp (Draft)</option>
              <option value="ARCHIVED">Lưu trữ (Archived)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Bảng dữ liệu sản phẩm */}
      <div className="bg-white rounded-lg shadow-md overflow-x-auto">
        {/* ... (Loading, Error, No products giữ nguyên) ... */}
        {loading && (
          <div className="p-6 text-center text-gray-500">Đang tải...</div>
        )}
        {!loading && apiError && (
          <div className="p-6 text-center text-red-600">{apiError}</div>
        )}
        {!loading && !apiError && products.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            Không tìm thấy sản phẩm nào.
          </div>
        )}

        {!loading && !apiError && products.length > 0 && (
          <table className="min-w-full divide-y divide-gray-200">
            {/* ... (thead giữ nguyên) ... */}
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tên sản phẩm
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Giá
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cập nhật lần cuối
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.id}>
                  {/* ... (td Tên sản phẩm giữ nguyên) ... */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {product.name}
                    </div>
                    <div className="text-sm text-gray-500">{product.slug}</div>
                  </td>

                  {/* --- CẬP NHẬT: Thay <span> bằng <select> --- */}
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
                        // Ngăn click vào select box trigger sự kiện click của hàng (nếu có)
                        onClick={(e) => e.stopPropagation()}
                        className={`px-3 py-1 text-xs leading-5 font-semibold rounded-full border-0 focus:ring-0
                          ${
                            product.status.toUpperCase() === "ACTIVE"
                              ? "bg-green-100 text-green-800"
                              : product.status.toUpperCase() === "DRAFT"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="DRAFT">DRAFT</option>
                        <option value="ARCHIVED">ARCHIVED</option>
                      </select>
                    )}
                  </td>

                  {/* ... (td Giá, Cập nhật, Hành động giữ nguyên) ... */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {product.basePrice.toLocaleString("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(product.updatedAt).toLocaleString("vi-VN")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      to={`/admin/products/${product.id}`}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                      title="Sửa"
                    >
                      <Edit size={18} />
                    </Link>
                    <button
                      onClick={() =>
                        alert(
                          `Xóa sản phẩm ${product.id} (chưa cài đặt API DELETE)`
                        )
                      }
                      className="text-red-600 hover:text-red-900"
                      title="Xóa"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 4. Phân trang */}
      {/* ... (Phân trang giữ nguyên) ... */}
      {!loading && !apiError && pagination.totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 0}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Trang trước
          </button>
          <span className="text-sm text-gray-700">
            Trang {pagination.page + 1} / {pagination.totalPages}
          </span>
          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page + 1 >= pagination.totalPages}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Trang sau
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductManagement;
