import React, {
  useState,
  useEffect,
  type ChangeEvent,
  type FormEvent,
} from "react";
import api from "../../../config/axios";
import { useAppProvider } from "../../../context/useContex";
import { Upload, Trash2, Loader2 } from "lucide-react";
import type { ProductImage, Color } from "./types"; // Import từ file types.ts

interface Props {
  productId: string;
  initialImages: ProductImage[]; // Nhận hình ảnh từ ProductEdit
  onUpdate: () => void; // Hàm để gọi khi có thay đổi (báo cha fetch lại)
}

// --- State cho form upload ---
const initialFormState = {
  file: null as File | null,
  altText: "",
  displayOrder: 0,
  isPrimary: false,
  colorId: "", // Sẽ là ID của màu
};

const ProductMediaManagement: React.FC<Props> = ({
  productId,
  initialImages,
  onUpdate,
}) => {
  const { user } = useAppProvider();
  const [images, setImages] = useState(initialImages);
  const [allColors, setAllColors] = useState<Color[]>([]);
  const [uploadForm, setUploadForm] = useState(initialFormState);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Đồng bộ state với prop
  useEffect(() => {
    setImages(initialImages);
  }, [initialImages]);

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
        console.error("Unable to load color list", err);
        setError("Unable to load color list");
      }
    };
    fetchColors();
  }, [user?.token]);

  const handleFormChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === "file") {
      const file = (e.target as HTMLInputElement).files?.[0] || null;
      setUploadForm((prev) => ({ ...prev, file }));
    } else if (type === "checkbox") {
      setUploadForm((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else {
      setUploadForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  // 3. Xử lý Upload
  const handleUploadSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!uploadForm.file) {
      setError("Vui lòng chọn một tập tin hình ảnh.");
      return;
    }
    if (!user?.token) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", uploadForm.file);
    formData.append("altText", uploadForm.altText);
    formData.append("displayOrder", String(uploadForm.displayOrder));
    formData.append("primary", String(uploadForm.isPrimary));
    if (uploadForm.colorId) {
      formData.append("colorId", uploadForm.colorId);
    }

    try {
      await api.post(
        `/api/admin/catalog/products/${productId}/images`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      // thành công!
      setUploadForm(initialFormState); // Reset form
      onUpdate(); // Báo cho component cha (ProductEdit) fetch lại
    } catch (err: any) {
      console.error("Error uploading image:", err);
      setError(`Upload failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // 4. Xử lý Xóa
  const handleDeleteImage = async (imageId: string) => {
    if (
      !window.confirm("Are you sure you want to delete this image?") ||
      !user?.token
    ) {
      return;
    }

    try {
      await api.delete(
        `/api/admin/catalog/products/${productId}/images/${imageId}`,
        {
          headers: { Authorization: `Bearer ${user.token}` },
        }
      );
      // thành công!
      onUpdate(); // Báo cho component cha (ProductEdit) fetch lại
    } catch (err: any) {
      console.error("Error deleting images:", err);
      alert(`Delete failure:${err.response?.data?.message || err.message}`);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
      <h3 className="text-xl font-semibold mb-4">Image management</h3>

      {/* --- Form Upload --- */}
      <form
        onSubmit={handleUploadSubmit}
        className="border-b pb-6 mb-6 space-y-4"
      >
        <h4 className="font-semibold text-gray-700">Add new images</h4>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Image file (required)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFormChange}
            className="mt-1 block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Alt Text
            </label>
            <input
              type="text"
              name="altText"
              value={uploadForm.altText}
              onChange={handleFormChange}
              className="mt-1 block w-full border rounded-md shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Assign to color (Optional)
            </label>
            <select
              name="colorId"
              value={uploadForm.colorId}
              onChange={handleFormChange}
              className="mt-1 block w-full border rounded-md shadow-sm"
            >
              <option value="">No color assigned</option>
              {allColors.map((color) => (
                <option key={color.id} value={color.id}>
                  {color.name} ({color.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Display order
            </label>
            <input
              type="number"
              name="displayOrder"
              value={uploadForm.displayOrder}
              onChange={handleFormChange}
              className="mt-1 block w-full border rounded-md shadow-sm"
            />
          </div>
          <div className="flex items-center pt-6">
            <input
              type="checkbox"
              id="isPrimary"
              name="isPrimary"
              checked={uploadForm.isPrimary}
              onChange={handleFormChange}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <label htmlFor="isPrimary" className="ml-2 text-sm text-gray-700">
              Set as main photo
            </label>
          </div>
        </div>
        <button
          type="submit"
          disabled={isUploading}
          className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isUploading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Upload size={18} />
          )}
          <span className="ml-2">
            {isUploading ? "Uploading..." : "Upload"}
          </span>
        </button>
      </form>

      {/* --- Danh sách hình ảnh --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {images.length === 0 ? (
          <p className="text-gray-500 col-span-full">
            There are no images for this product yet.
          </p>
        ) : (
          images.map((image) => (
            <div
              key={image.id}
              className="relative border rounded-lg shadow-sm"
            >
              <img
                src={image.imageUrl}
                alt={image.altText || "Product image"}
                className="w-full h-40 object-cover rounded-t-lg"
              />
              <div className="p-2 text-sm">
                <p className="truncate" title={image.altText ?? undefined}>
                  {image.altText || "(Không có alt text)"}
                </p>
                {image.primary && (
                  <span className="text-xs font-bold text-green-600">
                    Main photo
                  </span>
                )}
                {image.color && (
                  <div className="flex items-center text-xs text-gray-600">
                    <span
                      className="w-3 h-3 rounded-full mr-1 border"
                      style={{ backgroundColor: image.color.hex }}
                    ></span>
                    {image.color.name}
                  </div>
                )}
              </div>
              <button
                title="Xóa ảnh"
                onClick={() => handleDeleteImage(image.id)}
                className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-75 hover:opacity-100"
              >
                <Trash2 size={14} />
              </button>
              {/* TODO: Nút Edit (PATCH) có thể được thêm ở đây */}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ProductMediaManagement;
