import React, { useState, useEffect, type ChangeEvent } from "react";
import api from "../../../config/axios";
import { useAppProvider } from "../../../context/useContext";
import { Plus, Trash2, Loader2, Save, X, Edit, Check } from "lucide-react";
import type { ProductVariant, Color, ColorMediaAggregate } from "./types";
import toast from "react-hot-toast";

interface Props {
  productId: string;
  initialVariants: ProductVariant[];
  onUpdate: () => void;
}

type NewVariantRow = {
  size: string;
  sku: string;
  price: string;
  quantity: string;
  active: boolean;
};

type VariantUpdatePayload = {
  size: string;
  sku: string;
  price: number;
  quantity: number;
  active: boolean;
  colorId: number;
};

const ProductVariantManagement: React.FC<Props> = ({
  productId,
  initialVariants,
  onUpdate,
}) => {
  const { user } = useAppProvider();
  const [variants, setVariants] = useState(initialVariants);
  const [allColors, setAllColors] = useState<Color[]>([]);

  const [newVariantColorId, setNewVariantColorId] = useState<string>("");
  const [newVariantRows, setNewVariantRows] = useState<NewVariantRow[]>([
    { size: "", sku: "", price: "", quantity: "", active: true },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(
    null
  );
  const [isUpdating, setIsUpdating] = useState(false);

  const [patchingStatusId, setPatchingStatusId] = useState<string | null>(null);

  useEffect(() => {
    setVariants(initialVariants);
    setEditingVariant(null);
  }, [initialVariants]);

  useEffect(() => {
    const fetchColors = async () => {
      if (!user?.token || !productId) return;
      try {
        const response = await api.get<ColorMediaAggregate[]>(
          `/api/admin/catalog/products/${productId}/colors`,
          {
            headers: { Authorization: `Bearer ${user.token}` },
          }
        );

        const productColors = response.data
          .map((aggregate) => aggregate.color)
          .filter(Boolean) as Color[];

        setAllColors(productColors);
      } catch (err) {
        console.error("Unable to load color list", err);
        setError("Unable to load product color list.");
      }
    };
    fetchColors();
  }, [user?.token, productId]);

  const handleAddRow = () => {
    setNewVariantRows([
      ...newVariantRows,
      { size: "", sku: "", price: "", quantity: "", active: true },
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
    const { name, value } = e.target;
    const list = [...newVariantRows];
    const item = { ...list[index] };

    if (name === "active") {
      item.active = (e.target as HTMLInputElement).checked;
    } else if (name === "price") {
      const sanitizedValue = value.replace(/[^0-9.]/g, "");
      if (sanitizedValue.split(".").length > 2) return;
      item[name] = sanitizedValue;
    } else if (name === "quantity") {
      const sanitizedValue = value.replace(/[^0-9]/g, "");
      item[name] = sanitizedValue;
    } else if (name === "size" || name === "sku") {
      item[name] = value;
    }

    list[index] = item;
    setNewVariantRows(list);
  };

  const handleCreateVariants = async () => {
    if (!newVariantColorId) {
      setError("Please select a color to add variation.");
      return;
    }
    if (!user?.token) return;

    setIsSubmitting(true);
    setError(null);

    const validVariants = newVariantRows
      .map((v) => ({
        ...v,
        price: parseFloat(v.price) || 0,
        quantity: parseInt(v.quantity, 10) || 0,
      }))
      .filter((v) => v.size && v.sku && v.price > 0)
      .map((v) => ({ ...v, currency: "USD" }));

    if (validVariants.length === 0) {
      setError(
        "Please fill in at least 1 valid variation (Size, SKU, Price > 0)."
      );
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
      onUpdate();
      setNewVariantColorId("");
      setNewVariantRows([
        { size: "", sku: "", price: "", quantity: "", active: true },
      ]);
      toast.success("Create a successful variation!");
    } catch (err: any) {
      console.error("Error creating variant:", err);
      setError(`Create failure: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const performDeleteVariant = async (variantId: string) => {
    const deleteToastId = toast.loading("Deleting variant...");
    try {
      await api.delete(
        `/api/admin/catalog/products/${productId}/variants/${variantId}`,
        {
          headers: { Authorization: `Bearer ${user?.token}` },
        }
      );
      toast.success("Variant deleted successfully!", { id: deleteToastId });
      onUpdate();
    } catch (err: any) {
      console.error("Lỗi xóa biến thể:", err);
      const errorMessage = err.response?.data?.message || err.message;
      toast.error(`Delete failure: ${errorMessage}`, { id: deleteToastId });
    }
  };

  const handleDeleteVariant = (variantId: string) => {
    if (!user?.token) {
      return;
    }
    toast(
      (t) => (
        <div className="bg-white p-4 rounded-lg flex flex-col gap-3">
          <p className="font-semibold text-gray-800">
            Are you sure you want to delete?
          </p>
          <p className="text-sm text-gray-600">
            This variant will be permanently removed.
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-1 rounded-md text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                performDeleteVariant(variantId);
              }}
              className="px-3 py-1 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Delete
            </button>
          </div>
        </div>
      ),
      {
        position: "top-center",
        duration: 5000,
      }
    );
  };

  const handleStatusToggle = async (
    variantId: string,
    currentStatus: boolean
  ) => {
    if (!user?.token) return;
    if (editingVariant && editingVariant.id === variantId) {
      toast.error("Please save or cancel your edits before changing status.");
      return;
    }
    const newStatus = !currentStatus;
    setPatchingStatusId(variantId);
    try {
      await api.patch(
        `/api/admin/catalog/products/${productId}/variants/${variantId}/status`,
        { active: newStatus },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      onUpdate();
      toast.success("Changed variant status successfully!");
    } catch (err: any) {
      console.error("Lỗi cập nhật trạng thái variant:", err);
      alert(`Update failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setPatchingStatusId(null);
    }
  };

  const handleEditClick = (variant: ProductVariant) => {
    setEditingVariant({ ...variant });
  };

  const handleEditCancel = () => {
    setEditingVariant(null);
  };

  const handleEditChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    if (!editingVariant) return;

    const { name, value } = e.target;

    setEditingVariant((prev) => {
      if (!prev) return null;
      const updated = { ...prev };

      if (name === "price" || name === "quantityInStock") {
        updated[name] = parseFloat(value) || 0;
      } else if (name === "size" || name === "variantSku") {
        updated[name] = value;
      } else if (name === "color") {
        const newColorId = parseInt(value, 10);
        const newColor = allColors.find((c) => c.id === newColorId);
        if (newColor) {
          updated.color = newColor;
        }
      }
      return updated;
    });
  };

  const handleUpdateVariant = async () => {
    if (!editingVariant || !user?.token) return;

    if (
      !editingVariant.size ||
      !editingVariant.variantSku ||
      editingVariant.price <= 0
    ) {
      toast.error("Size, SKU, and Price (must be > 0) are required.");
      return;
    }

    setIsUpdating(true);
    const updateToastId = toast.loading("Updating variant...");

    const payload: VariantUpdatePayload = {
      size: editingVariant.size,
      sku: editingVariant.variantSku,
      price: editingVariant.price,
      quantity: editingVariant.quantityInStock,
      active: editingVariant.active,
      colorId: editingVariant.color.id,
    };

    try {
      await api.put(
        `/api/admin/catalog/products/${productId}/variants/${editingVariant.id}`,
        payload,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      toast.success("Variant updated successfully!", { id: updateToastId });
      setEditingVariant(null);
      onUpdate();
    } catch (err: any) {
      console.error("Error updating variant:", err);
      const msg = err.response?.data?.message || err.message;
      toast.error(`Update failed: ${msg}`, { id: updateToastId });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-xl font-semibold mb-4">
        Variation & Inventory Management
      </h3>
      <div className="border-b pb-6 mb-6 space-y-4">
        <h4 className="font-semibold text-gray-700">Add variation by color</h4>
        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Choose color (Required)
          </label>
          <select
            value={newVariantColorId}
            onChange={(e) => setNewVariantColorId(e.target.value)}
            className="mt-1 block w-full md:w-1/3 border px-2 py-1 rounded-md shadow-sm"
          >
            <option value="">-- Choose a color --</option>
            {allColors.map((color) => (
              <option key={color.id} value={color.id}>
                {color.name} ({color.code})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Size details
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
                type="text"
                inputMode="decimal"
                name="price"
                placeholder="Price"
                value={row.price}
                onChange={(e) => handleRowChange(e, index)}
                className="border rounded-md px-2 py-1 col-span-1"
              />

              <input
                type="text"
                inputMode="numeric"
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
            <Plus size={16} className="mr-1" /> Add Size
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
            {isSubmitting ? "Saving..." : "Save variation"}
          </span>
        </button>
      </div>

      {/* --- Danh sách biến thể hiện có --- */}
      <h4 className="font-semibold text-gray-700 mb-2">Variations available</h4>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                Color
              </th>

              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                Size
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                SKU
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                Price
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                Warehouse
              </th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">
                Status
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {variants.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-500">
                  There are no variations yet.
                </td>
              </tr>
            ) : (
              variants.map((variant) => {
                const isEditing = !!(
                  editingVariant && editingVariant.id === variant.id
                );

                return (
                  <tr
                    key={variant.id}
                    className={isEditing ? "bg-blue-50" : ""}
                  >
                    {/* --- THAY ĐỔI 2: Cột Color --- */}
                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                      {isEditing ? (
                        <select
                          name="color"
                          value={editingVariant.color.id}
                          onChange={handleEditChange}
                          className="w-full border rounded-md px-2 py-1 text-sm"
                        >
                          {allColors.map((color) => (
                            <option key={color.id} value={color.id}>
                              {color.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex items-center">
                          <span
                            className="w-4 h-4 rounded-full mr-2 border"
                            style={{ backgroundColor: variant.color.hex }}
                          ></span>
                          {variant.color.name}
                        </div>
                      )}
                    </td>

                    {/* Size */}
                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                      {isEditing ? (
                        <input
                          type="text"
                          name="size"
                          value={editingVariant.size}
                          onChange={handleEditChange}
                          className="w-20 border rounded-md px-2 py-1"
                        />
                      ) : (
                        variant.size
                      )}
                    </td>

                    {/* SKU */}
                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                      {isEditing ? (
                        <input
                          type="text"
                          name="variantSku"
                          value={editingVariant.variantSku}
                          onChange={handleEditChange}
                          className="w-40 border rounded-md px-2 py-1"
                        />
                      ) : (
                        variant.variantSku
                      )}
                    </td>

                    {/* Price */}
                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                      {isEditing ? (
                        <input
                          type="number"
                          name="price"
                          value={
                            editingVariant.price === 0
                              ? ""
                              : editingVariant.price
                          }
                          onChange={handleEditChange}
                          className="w-24 border rounded-md px-2 py-1"
                        />
                      ) : (
                        variant.price.toLocaleString("vi-VN")
                      )}
                    </td>

                    {/* Warehouse */}
                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                      {isEditing ? (
                        <input
                          type="number"
                          name="quantityInStock"
                          value={
                            editingVariant.quantityInStock === 0
                              ? ""
                              : editingVariant.quantityInStock
                          }
                          onChange={handleEditChange}
                          className="w-20 border rounded-md px-2 py-1"
                        />
                      ) : (
                        variant.quantityInStock
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-center">
                      {patchingStatusId === variant.id ? (
                        <Loader2 size={16} className="animate-spin mx-auto" />
                      ) : (
                        <button
                          onClick={() =>
                            handleStatusToggle(variant.id, variant.active)
                          }
                          disabled={isEditing} // <-- Đã sửa (lỗi 2)
                          className={`px-3 py-1 text-xs leading-5 font-semibold rounded-full
                            ${
                              variant.active
                                ? "bg-green-100 text-green-800 hover:bg-green-200"
                                : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                            }
                            ${isEditing ? "opacity-50 cursor-not-allowed" : ""}
                          `}
                        >
                          {variant.active ? "Active" : "Inactive"}
                        </button>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right">
                      {isEditing ? (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={handleUpdateVariant}
                            disabled={isUpdating}
                            className="text-green-600 hover:text-green-800 disabled:opacity-50"
                          >
                            {isUpdating ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Check size={16} />
                            )}
                          </button>
                          <button
                            onClick={handleEditCancel}
                            disabled={isUpdating}
                            className="text-gray-600 hover:text-gray-800 disabled:opacity-50"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-3 justify-end">
                          <button
                            onClick={() => handleEditClick(variant)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteVariant(variant.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductVariantManagement;
