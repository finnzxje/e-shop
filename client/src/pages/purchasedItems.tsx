import { useEffect, useState, useCallback } from "react";
import {
  Loader2,
  CheckCircle2,
  X,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAppProvider } from "../context/useContex";
import api from "../config/axios";
import { useNavigate } from "react-router-dom";

interface Color {
  id: string;
  name: string;
  hex: string;
}
export interface Variant {
  id: string;
  sku: string;
  stock: number;
  color: Color;
  size: string;
}
interface ProductImage {
  id: string;
  imageUrl: string;
  color: Color;
}
export interface productDetail {
  id: string;
  name: string;
  slug: string;
  variants: Variant[];
  images: ProductImage[];
}
type OrderStatus =
  | "PENDING"
  | "AWAITING_PAYMENT"
  | "PROCESSING"
  | "FULFILLED"
  | "CANCELLED"
  | string;
type PaymentStatus =
  | "PENDING"
  | "AUTHORIZED"
  | "CAPTURED"
  | "FAILED"
  | "VOIDED"
  | string;
interface OrderItem {
  orderItemId: string;
  productId: string;
  productName: string;
  variantId: string;
  slug: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  currency: string;
}
interface Order {
  orderId: string;
  orderNumber: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  placedAt: string;
  items: OrderItem[];
  subtotalAmount: number;
  discountAmount: number;
  shippingAmount: number;
  totalAmount: number;
  taxAmount: number;
}
interface PaginatedOrders {
  content: Order[];
  totalPages: number;
}
interface EnrichedOrderItem extends OrderItem {
  images: string;
  variant: Variant[];
}
interface EnrichedOrder extends Omit<Order, "items"> {
  items: EnrichedOrderItem[];
}
// --- COMPONENT CHÍNH ---

const PurchasedItems = () => {
  const [orders, setOrders] = useState<EnrichedOrder[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const { user, isAuthLoading } = useAppProvider();
  const navigate = useNavigate();

  const [orderToConfirm, setOrderToConfirm] = useState<EnrichedOrder | null>(
    null
  );

  useEffect(() => {
    const fetchItemDetails = async (
      item: OrderItem
    ): Promise<EnrichedOrderItem> => {
      try {
        const res = await api.get<productDetail>(
          `/api/catalog/products/${item.slug}`
        );
        const variantProduct = res.data.variants.find(
          (r) => r.id === item.variantId
        );
        const images = res.data.images.find(
          (i) => i.color.id === variantProduct?.color.id
        );
        return {
          ...item,
          variant: variantProduct ? [variantProduct] : [],
          images: images?.imageUrl || "",
        };
      } catch (err) {
        console.error(`Failed to fetch images for ${item.slug}`, err);
        return { ...item, images: "", variant: [] };
      }
    };
    const fetchPurchasedOrders = async () => {
      if (isAuthLoading) {
        return;
      }
      if (!user?.token) {
        navigate("/");
        return;
      }
      try {
        setLoading(true);
        const res = await api.get<PaginatedOrders>(`/api/orders`, {
          params: { page, size: 10 },
          headers: { Authorization: `Bearer ${user.token}` },
        });
        const fetchedOrders: Order[] = res.data.content;
        setTotalPages(res.data.totalPages);
        const enrichedOrders = await Promise.all(
          fetchedOrders.map(async (order) => {
            const enrichedItems = await Promise.all(
              order.items.map((item) => fetchItemDetails(item))
            );
            return { ...order, items: enrichedItems };
          })
        );
        setOrders(enrichedOrders);
      } catch (error) {
        console.error("Error fetching purchased items:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPurchasedOrders();
  }, [page, user?.token, navigate, isAuthLoading]);

  const handleConfirm = useCallback(
    async (orderId: string) => {
      if (!user?.token) {
        navigate("/");
        return;
      }
      setConfirmingId(orderId);
      try {
        const res = await api.post(
          `/api/orders/${orderId}/confirm-fulfillment`,
          {},
          { headers: { Authorization: `Bearer ${user.token}` } }
        );
        const updatedOrderData = res.data;

        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order.orderId === updatedOrderData.orderId
              ? { ...order, orderStatus: updatedOrderData.orderStatus }
              : order
          )
        );

        setOrderToConfirm(null);
      } catch (error) {
        console.error("Failed to confirm fulfillment:", error);
      } finally {
        setConfirmingId(null);
      }
    },
    [user?.token, navigate]
  );
  const getOrderStatusDetails = (status: OrderStatus) => {
    switch (status) {
      case "PROCESSING":
        return {
          text: "Shipping",
          className: "bg-blue-100 text-blue-800",
        };
      case "FULFILLED":
        return {
          text: "Delivered",
          className: "bg-green-100 text-green-800",
        };
      case "CANCELLED":
        return {
          text: "Canceled",
          className: "bg-red-100 text-red-800",
        };
      case "PENDING":
      case "AWAITING_PAYMENT":
        return {
          text: "Pending",
          className: "bg-gray-100 text-gray-800",
        };
      default:
        return { text: status, className: "bg-gray-100 text-gray-800" };
    }
  };
  const getPaymentStatusDetails = (status: PaymentStatus) => {
    switch (status) {
      case "CAPTURED":
        return { text: "Paid", className: "bg-green-100 text-green-800" };
      case "FAILED":
        return {
          text: "Payment Failed",
          className: "bg-red-100 text-red-800",
        };
      case "PENDING":
        return {
          text: "Payment Pending",
          className: "bg-yellow-100 text-yellow-800",
        };
      case "AUTHORIZED":
        return {
          text: "Authorized",
          className: "bg-blue-100 text-blue-800",
        };
      case "VOIDED":
        return {
          text: "Voided",
          className: "bg-gray-100 text-gray-800",
        };
      default:
        return { text: status, className: "bg-gray-100 text-gray-800" };
    }
  };

  // --- PHẦN GIAO DIỆN (Render) ---
  return (
    <div className=" bg-gray-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">🛒 My Orders</h1>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-gray-500 w-8 h-8" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <ShoppingBag className="mx-auto w-12 h-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No Orders Yet
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              You haven't placed any orders. Start shopping to see them here!
            </p>
            <button
              onClick={() => navigate("/")}
              className="mt-6 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Shop Now
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const orderStatusDetails = getOrderStatusDetails(
                order.orderStatus
              );
              const paymentStatusDetails = getPaymentStatusDetails(
                order.paymentStatus
              );
              const isProcessingApi = confirmingId === order.orderId;

              return (
                <article
                  key={order.orderId}
                  className="bg-white shadow-md rounded-2xl overflow-hidden border border-gray-200"
                >
                  {/* (Header không thay đổi) */}
                  <header className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <div>
                      <h2 className="font-semibold text-lg text-gray-900">
                        Order #{order.orderNumber}
                      </h2>
                      <p className="text-sm text-gray-500">
                        Placed on:{" "}
                        {new Date(order.placedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${orderStatusDetails.className}`}
                      >
                        {orderStatusDetails.text}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${paymentStatusDetails.className}`}
                      >
                        {paymentStatusDetails.text}
                      </span>
                    </div>
                  </header>

                  {/* (Danh sách sản phẩm) */}
                  <div className="divide-y divide-gray-100">
                    {order.items.map((item) => {
                      const variant = item.variant?.[0];
                      return (
                        <div
                          key={item.orderItemId}
                          className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4"
                        >
                          <img
                            src={item.images || "/placeholder.svg"}
                            alt={item.productName}
                            className="w-24 h-24 rounded-lg object-cover border flex-shrink-0"
                          />
                          <div className="flex-grow">
                            <h3 className="font-semibold text-gray-800">
                              {item.productName}
                            </h3>
                            {variant && (
                              <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                <span
                                  className="inline-block w-4 h-4 rounded-full border border-gray-300"
                                  style={{
                                    backgroundColor:
                                      variant.color?.hex ?? undefined,
                                  }}
                                ></span>
                                <span>
                                  {variant.color?.name} / {variant.size}
                                </span>
                              </div>
                            )}
                          </div>
                          {/* ✨ SỬA: Bố cục giá/số lượng gọn gàng hơn */}
                          <div className="flex-shrink-0 text-sm sm:text-right">
                            <p className="text-gray-600">
                              {item.quantity} x ${item.unitPrice.toFixed(2)}
                            </p>
                            <p className="font-semibold text-gray-900 mt-1 text-base">
                              ${item.totalAmount.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* (Footer của Card Đơn Hàng - Đã đẹp) */}
                  <footer className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-8">
                    {/* Phần chi tiết giá */}
                    <div className="flex-1">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Subtotal:</span>
                          <span className="font-medium text-gray-900">
                            ${order.subtotalAmount.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Shipping:</span>
                          <span className="font-medium text-gray-900">
                            ${order.shippingAmount.toFixed(2)}
                          </span>
                        </div>
                        {order.discountAmount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Discount:</span>
                            <span className="font-medium text-red-600">
                              -${order.discountAmount.toFixed(2)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Tax:</span>
                          <span className="font-medium text-gray-900">
                            ${order.taxAmount.toFixed(2)}
                          </span>
                        </div>
                        <div className="!mt-3 pt-3 border-t border-gray-200">
                          <div className="flex justify-between items-center">
                            <span className="text-base font-bold text-gray-900">
                              Total Amount:
                            </span>
                            <span className="text-xl font-bold text-gray-900">
                              ${order.totalAmount.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Phần hành động */}
                    <div className="w-36 text-right flex-shrink-0">
                      {order.orderStatus === "PROCESSING" && (
                        <button
                          onClick={() => setOrderToConfirm(order)}
                          disabled={isProcessingApi}
                          className="flex items-center justify-center w-full px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                        >
                          {isProcessingApi ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Confirm Delivery"
                          )}
                        </button>
                      )}
                      {order.orderStatus === "FULFILLED" && (
                        <div className="flex items-center justify-end gap-1 text-green-600">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-xs font-semibold">
                            Delivered
                          </span>
                        </div>
                      )}
                      {(order.orderStatus === "CANCELLED" ||
                        order.orderStatus === "PENDING" ||
                        order.orderStatus === "AWAITING_PAYMENT") && (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </div>
                  </footer>
                </article>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <nav
            className="flex items-center justify-between mt-8"
            aria-label="Pagination"
          >
            <button
              onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
              disabled={page === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <span className="text-sm font-medium text-gray-700">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((prev) => prev + 1)}
              disabled={page + 1 >= totalPages}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </nav>
        )}
      </div>

      {orderToConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setOrderToConfirm(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Confirm Delivery
              </h3>
              <button
                onClick={() => setOrderToConfirm(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600">
                Are you sure you have received all items for order{" "}
                <span className="font-medium text-gray-900">
                  #{orderToConfirm.orderNumber}
                </span>
                ?
              </p>
            </div>
            <div className="flex justify-end gap-3 p-6 bg-gray-50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setOrderToConfirm(null)}
                disabled={confirmingId === orderToConfirm.orderId}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirm(orderToConfirm.orderId)}
                disabled={confirmingId === orderToConfirm.orderId}
                className="flex items-center justify-center w-28 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
              >
                {confirmingId === orderToConfirm.orderId ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Confirm"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchasedItems;
