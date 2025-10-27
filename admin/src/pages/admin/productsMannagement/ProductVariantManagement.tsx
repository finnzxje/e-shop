// src/components/admin/products/ProductVariantManagement.tsx
import React, { useState, useEffect, type ChangeEvent } from "react";
import api from "../../../config/axios";
import { useAppProvider } from "../../../context/useContex";
import { Plus, Trash2, Loader2, Save } from "lucide-react";
import type { ProductVariant, Color } from "./types"; // Import từ file types.ts

interface Props {
  productId: string;
  initialVariants: ProductVariant[]; // Nhận variants từ ProductEdit
  onUpdate: () => void; // Hàm để gọi khi có thay đổi (báo cha fetch lại)
}

// Type cho một hàng trong form tạo mới
type NewVariantRow = {
  size: string;
  sku: string;
  price: number;
  quantity: number;
  active: boolean;
};

const ProductVariantManagement: React.FC<Props> = ({
  productId,
  initialVariants,
  onUpdate,
}) => {
  const { user } = useAppProvider();
  const [variants, setVariants] = useState(initialVariants);
  const [allColors, setAllColors] = useState<Color[]>([]);

  // State cho form tạo mới
  const [newVariantColorId, setNewVariantColorId] = useState<string>("");
  const [newVariantRows, setNewVariantRows] = useState<NewVariantRow[]>([
    { size: "", sku: "", price: 0, quantity: 0, active: true },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Đồng bộ state với prop
  useEffect(() => {
    setVariants(initialVariants);
  }, [initialVariants]);

  // 2. Fetch danh sách tất cả màu sắc để chọn
  useEffect(() => {
    const fetchColors = async () => {
      if (!user?.token) return;
      try {
        const response = await api.get<Color[]>("/api/admin/catalog/colors", {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setAllColors(response.data);
      } catch (err) {
        console.error("Không thể tải danh sách màu", err);
        setError("Không thể tải danh sách màu.");
      }
    };
    fetchColors();
  }, [user?.token]);

  // --- Handlers cho Form Tạo Mới ---
  const handleAddRow = () => {
    setNewVariantRows([
      ...newVariantRows,
      { size: "", sku: "", price: 0, quantity: 0, active: true },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    const list = [...newVariantRows];
    list.splice(index, 1);
    setNewVariantRows(list);
  };

  const handleRowChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    index: number
  ) => {
    const { name, value, type } = e.target;

    // 1. Sao chép mảng list
    const list = [...newVariantRows];

    // 2. Lấy item ra và cũng sao chép nó
    // (Quan trọng: Phải sao chép cả object bên trong để React nhận diện thay đổi)
    const item = { ...list[index] };

    // 3. Dùng 'name' để quyết định gán kiểu dữ liệu nào
    //    Đây là cách làm đúng và an toàn
    if (name === "active") {
      // TypeScript biết 'active' là kiểu boolean
      item.active = (e.target as HTMLInputElement).checked;
    } else if (name === "price" || name === "quantity") {
      // TypeScript biết 'price' và 'quantity' là kiểu number
      item[name] = parseFloat(value) || 0;
    } else if (name === "size" || name === "sku") {
      // TypeScript biết 'size' và 'sku' là kiểu string
      item[name] = value;
    }

    // 4. Đặt item đã cập nhật trở lại mảng
    list[index] = item;

    // 5. Cập nhật state
    setNewVariantRows(list);
  };
  // 3. Xử lý Tạo Mới (Bulk)
  const handleCreateVariants = async () => {
    if (!newVariantColorId) {
      setError("Vui lòng chọn một màu để thêm biến thể.");
      return;
    }
    if (!user?.token) return;

    setIsSubmitting(true);
    setError(null);

    // Lọc ra các hàng hợp lệ
    const validVariants = newVariantRows
      .filter((v) => v.size && v.sku && v.price > 0)
      .map((v) => ({ ...v, currency: "USD" })); // Thêm currency theo API

    if (validVariants.length === 0) {
      setError("Vui lòng điền ít nhất 1 biến thể hợp lệ (Size, SKU, Price).");
      setIsSubmitting(false);
      return;
    }

    const payload = {
      colorId: parseInt(newVariantColorId),
      variants: validVariants,
    };

    try {
      await api.post(
        `/api/admin/catalog/products/${productId}/variants`,
        payload,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      // Thành công!
      onUpdate(); // Báo cha fetch lại
      setNewVariantColorId("");
      setNewVariantRows([
        { size: "", sku: "", price: 0, quantity: 0, active: true },
      ]);
    } catch (err: any) {
      console.error("Lỗi tạo biến thể:", err);
      setError(`Tạo thất bại: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Xử lý Xóa Biến thể
  const handleDeleteVariant = async (variantId: string) => {
    if (
      !window.confirm("Bạn có chắc chắn muốn xóa biến thể này?") ||
      !user?.token
    ) {
      return;
    }

    try {
      await api.delete(
        `/api/admin/catalog/products/${productId}/variants/${variantId}`,
        {
          headers: { Authorization: `Bearer ${user.token}` },
        }
      );
      onUpdate(); // Báo cha fetch lại
    } catch (err: any) {
      console.error("Lỗi xóa biến thể:", err);
      alert(`Xóa thất bại: ${err.response?.data?.message || err.message}`);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-xl font-semibold mb-4">
        Quản lý Biến thể & Kho hàng
      </h3>

      {/* --- Form Tạo mới Biến thể --- */}
      <div className="border-b pb-6 mb-6 space-y-4">
        <h4 className="font-semibold text-gray-700">Thêm biến thể theo màu</h4>
        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Chọn màu (Bắt buộc)
          </label>
          <select
            value={newVariantColorId}
            onChange={(e) => setNewVariantColorId(e.target.value)}
            className="mt-1 block w-full md:w-1/3 border rounded-md shadow-sm"
          >
            <option value="">-- Chọn một màu --</option>
            {allColors.map((color) => (
              <option key={color.id} value={color.id}>
                {color.name} ({color.code})
              </option>
            ))}
          </select>
        </div>

        {/* Bảng nhập liệu động */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Chi tiết các Size
          </label>
          {newVariantRows.map((row, index) => (
            <div key={index} className="grid grid-cols-6 gap-2 items-center">
              <input
                type="text"
                name="size"
                placeholder="Size (S, M, L...)"
                value={row.size}
                onChange={(e) => handleRowChange(e, index)}
                className="border rounded-md px-2 py-1 col-span-1"
              />
              <input
                type="text"
                name="sku"
                placeholder="SKU"
                value={row.sku}
                onChange={(e) => handleRowChange(e, index)}
                className="border rounded-md px-2 py-1 col-span-2"
              />
              <input
                type="number"
                name="price"
                placeholder="Price"
                value={row.price}
                onChange={(e) => handleRowChange(e, index)}
                className="border rounded-md px-2 py-1 col-span-1"
              />
              <input
                type="number"
                name="quantity"
                placeholder="Quantity"
                value={row.quantity}
                onChange={(e) => handleRowChange(e, index)}
                className="border rounded-md px-2 py-1 col-span-1"
              />
              <button
                onClick={() => handleRemoveRow(index)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button
            onClick={handleAddRow}
            className="text-sm flex items-center text-blue-600 hover:text-blue-800"
          >
            <Plus size={16} className="mr-1" /> Thêm Size
          </button>
        </div>

        <button
          onClick={handleCreateVariants}
          disabled={isSubmitting}
          className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Save size={18} />
          )}
          <span className="ml-2">
            {isSubmitting ? "Đang lưu..." : "Lưu biến thể"}
          </span>
        </button>
      </div>

      {/* --- Danh sách biến thể hiện có --- */}
      <h4 className="font-semibold text-gray-700 mb-2">Các biến thể hiện có</h4>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                Màu
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                Size
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                SKU
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                Giá
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                Kho
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                Trạng thái
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {variants.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-500">
                  Chưa có biến thể nào.
                </td>
              </tr>
            ) : (
              variants.map((variant) => (
                <tr key={variant.id}>
                  <td className="px-4 py-2 whitespace-nowrap text-sm flex items-center">
                    <span
                      className="w-4 h-4 rounded-full mr-2 border"
                      style={{ backgroundColor: variant.color.hex }}
                    ></span>
                    {variant.color.name}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm">
                    {variant.size}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm">
                    {variant.variantSku}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm">
                    {variant.price.toLocaleString("vi-VN")}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm">
                    {variant.quantityInStock}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm">
                    {variant.active ? (
                      <span className="text-green-600">Active</span>
                    ) : (
                      <span className="text-gray-500">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-right">
                    {/* TODO: Nút Edit (PUT) và Adjust Stock */}
                    <button
                      onClick={() => handleDeleteVariant(variant.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductVariantManagement;
