import { useEffect, useState, useCallback } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useAppProvider } from "../context/useContex";
import api from "../config/axios";
import type { productDetail, Variant } from "../config/interface";
import { useNavigate } from "react-router-dom";

// ... (Các interface PurchasedItem, productDetail, v.v... giữ nguyên) ...
export interface PurchasedItem {
  orderId: string;
  orderNumber: string;
  orderStatus: "PROCESSING" | "COMPLETED" | "CANCELLED" | "FULFILLED" | string;
  paymentStatus: "CAPTURED" | "PENDING" | "FAILED" | string;
  orderItemId: string;
  slug: string;
  productId: string;
  productName: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  currency: string;
  purchasedAt: string;
  images: string;
  variant: Variant[];
}

const PurchasedItems = () => {
  const [items, setItems] = useState<PurchasedItem[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const { user } = useAppProvider();
  const navigate = useNavigate(); // --- BẮT ĐẦU SỬA LỖI 1: useEffect ---

  useEffect(() => {
    // (Hàm fetchImagesForProducts không thay đổi)
    const fetchImagesForProducts = async (productsData: PurchasedItem[]) => {
      return await Promise.all(
        productsData.map(async (p: PurchasedItem) => {
          try {
            const res = await api.get<productDetail>(
              `/api/catalog/products/${p.slug}`
            );

            const variantProduct = res.data.variants.find(
              (r) => r.id === p.variantId
            );
            const images = res.data.images.find(
              (i) => i.color.id === variantProduct?.color.id
            );
            return {
              ...p,

              variant: variantProduct ? [variantProduct] : [],
              images: images?.imageUrl,
            };
          } catch (err) {
            console.error(`Failed to fetch images for ${p.slug}`, err);
            return null;
          }
        })
      );
    };

    const fetchPurchasedItems = async () => {
      // SỬA Ở ĐÂY: Dùng user?.token
      if (!user?.token) {
        navigate("/");
        return;
      }
      try {
        setLoading(true);
        const res = await api.get(
          `/api/orders/purchased-items?page=${page}&size=10`,
          {
            // Khi đã vượt qua (if) ở trên, user.token ở đây chắc chắn tồn tại
            headers: { Authorization: `Bearer ${user.token}` },
          }
        );
        const order = await fetchImagesForProducts(res.data.content);

        setItems(order.filter((item) => item !== null) as PurchasedItem[]);
        setTotalPages(res.data.totalPages);
      } catch (error) {
        console.error("Error fetching purchased items:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPurchasedItems(); // SỬA Ở ĐÂY: Dùng user?.token trong dependency array // Và thêm 'navigate' vì nó được sử dụng bên trong
  }, [page, user?.token, navigate]); // --- KẾT THÚC SỬA LỖI 1 --- // --- BẮT ĐẦU SỬA LỖI 2: useCallback ---
  const handleConfirm = useCallback(
    async (orderId: string) => {
      // SỬA Ở ĐÂY: Dùng user?.token
      if (!user?.token) {
        navigate("/");
        return;
      }
      setConfirmingId(orderId);
      try {
        const res = await api.post(
          `/api/orders/${orderId}/confirm-fulfillment`,
          {},
          {
            // Tương tự, user.token ở đây an toàn vì đã check ở trên
            headers: { Authorization: `Bearer ${user.token}` },
          }
        );

        const updatedOrderData = res.data;

        setItems((prevItems) =>
          prevItems.map((item) =>
            item.orderId === updatedOrderData.orderId
              ? { ...item, orderStatus: updatedOrderData.orderStatus }
              : item
          )
        );
      } catch (error) {
        console.error("Failed to confirm fulfillment:", error);
      } finally {
        setConfirmingId(null);
      }
    }, // SỬA Ở ĐÂY: Dùng user?.token và thêm 'navigate'
    [user?.token, navigate]
  ); // --- KẾT THÚC SỬA LỖI 2 --- // --- PHẦN GIAO DIỆN (Render) --- // (Giữ nguyên toàn bộ phần return JSX của bạn)
  return (
    <div className="min-h-screen bg-gray-50 px-6 py-10">
           {" "}
      <div className="max-w-6xl mx-auto">
               {" "}
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
                    🛒 Purchased Items        {" "}
        </h1>
               {" "}
        {loading ? (
          <div className="flex justify-center py-10">
                       {" "}
            <Loader2 className="animate-spin text-gray-500 w-8 h-8" />         {" "}
          </div>
        ) : items.length === 0 ? (
          <p className="text-gray-500 text-center py-10">
                        No purchased items found.          {" "}
          </p>
        ) : (
          <div className="bg-white shadow rounded-2xl overflow-hidden">
                       {" "}
            <table className="w-full border-collapse">
                           {" "}
              <thead className="bg-gray-100 text-gray-700">
                               {" "}
                <tr>
                                   {" "}
                  <th className="text-left px-6 py-3 font-medium">Product</th> 
                                 {" "}
                  <th className="text-left px-6 py-3 font-medium">Quantity</th> 
                                 {" "}
                  <th className="text-left px-6 py-3 font-medium">Price</th>   
                               {" "}
                  <th className="text-left px-6 py-3 font-medium">Total</th>   
                               {" "}
                  <th className="text-left px-6 py-3 font-medium">
                                        Order Status                  {" "}
                  </th>
                                   {" "}
                  <th className="text-left px-6 py-3 font-medium">Payment</th> 
                                 {" "}
                  <th className="text-left px-6 py-3 font-medium">
                                        Purchased At                  {" "}
                  </th>
                                   {" "}
                  <th className="text-left px-6 py-3 font-medium">Action</th>   
                             {" "}
                </tr>
                             {" "}
              </thead>
                           {" "}
              <tbody>
                               {" "}
                {items.map((item) => {
                  const variant = item.variant?.[0];
                  const isConfirming = confirmingId === item.orderId;

                  return (
                    <tr
                      key={item.orderItemId}
                      className="border-b hover:bg-gray-50 transition"
                    >
                                           {" "}
                      <td className="px-6 py-4">
                                               {" "}
                        <div className="flex items-center gap-4">
                                                   {" "}
                          <img
                            src={item.images || "/placeholder.svg"}
                            alt={item.productName}
                            className="w-20 h-20 rounded-lg object-cover border"
                          />
                                                   {" "}
                          <div>
                                                       {" "}
                            <div className="font-semibold text-gray-800">
                                                            {item.productName} 
                                                       {" "}
                            </div>
                                                       {" "}
                            {variant && (
                              <div className="text-sm text-gray-500 flex items-center gap-2">
                                                               {" "}
                                <span
                                  className="inline-block w-4 h-4 rounded-full border border-gray-300"
                                  style={{
                                    backgroundColor:
                                      variant.color?.hex ?? undefined,
                                  }}
                                ></span>
                                                             {" "}
                                <span> {variant.size}</span>                   
                                       {" "}
                              </div>
                            )}
                                                 {" "}
                          </div>
                                           {" "}
                        </div>
                                   {" "}
                      </td>
                                 {" "}
                      <td className="px-6 py-4 text-gray-700">
                          {item.quantity}         {" "}
                      </td>
                               {" "}
                      <td className="px-6 py-4 text-gray-700">
                          ${item.unitPrice.toFixed(2)}         {" "}
                      </td>
                               {" "}
                      <td className="px-6 py-4 font-medium text-gray-900">
                          ${item.totalAmount.toFixed(2)} {" "}
                      </td>
                         {" "}
                      <td className="px-6 py-4">
                         {" "}
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            item.orderStatus === "PROCESSING"
                              ? "bg-yellow-100 text-yellow-800"
                              : item.orderStatus === "COMPLETED" ||
                                item.orderStatus === "FULFILLED"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                            {item.orderStatus} {" "}
                        </span>
                         {" "}
                      </td>
                       {" "}
                      <td className="px-6 py-4">
                         {" "}
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            item.paymentStatus === "CAPTURED"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                            {item.paymentStatus} {" "}
                        </span>
                         {" "}
                      </td>
                       {" "}
                      <td className="px-6 py-4 text-gray-500 text-sm">
                          {new Date(item.purchasedAt).toLocaleString()} {" "}
                      </td>
                       {" "}
                      <td className="px-6 py-4">
                         {" "}
                        {item.orderStatus === "COMPLETED" && (
                          <button
                            onClick={() => handleConfirm(item.orderId)}
                            disabled={isConfirming}
                            className="flex items-center justify-center px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                          >
                             {" "}
                            {isConfirming ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              "Confirm Delivery"
                            )}
                             {" "}
                          </button>
                        )}
                         {" "}
                        {item.orderStatus === "FULFILLED" && (
                          <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="w-4 h-4" /> {" "}
                            <span className="text-xs font-semibold">
                                Confirmed  {" "}
                            </span>
                             {" "}
                          </div>
                        )}
                         {" "}
                        {(item.orderStatus === "PROCESSING" ||
                          item.orderStatus === "CANCELLED") && (
                          <span className="text-gray-400">—</span>
                        )}
                         {" "}
                      </td>
                       {" "}
                    </tr>
                  );
                })}
                 {" "}
              </tbody>
               {" "}
            </table>
             {" "}
          </div>
        )}
         {" "}
        {totalPages > 1 && (
          <div className="flex justify-center mt-6 space-x-2">
             {" "}
            <button
              onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
              disabled={page === 0}
              className={`px-4 py-2 rounded-lg border ${
                page === 0
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "hover:bg-gray-100"
              }`}
            >
                Prev  {" "}
            </button>
             {" "}
            <span className="px-3 py-2 text-gray-700">
                Page {page + 1} of {totalPages} {" "}
            </span>
             {" "}
            <button
              onClick={() => setPage((prev) => prev + 1)}
              disabled={page + 1 >= totalPages}
              className={`px-4 py-2 rounded-lg border ${
                page + 1 >= totalPages
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "hover:bg-gray-100"
              }`}
            >
                Next  {" "}
            </button>
             {" "}
          </div>
        )}
         {" "}
      </div>
       {" "}
    </div>
  );
};

export default PurchasedItems;
