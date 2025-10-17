import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../config/axios";

interface Order {
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  transactionStatus: string;
  alreadyProcessed: boolean;
}

const PaymentResult = () => {
  const [params] = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const confirmPayment = async () => {
      try {
        const vnpData = Object.fromEntries(params.entries());

        // ✨ SỬA LỖI: Lấy token trực tiếp từ localStorage thay vì từ context
        const token = localStorage.getItem("accessToken");

        // Thêm bước kiểm tra để đảm bảo người dùng đã đăng nhập
        if (!token) {
          throw new Error("Authentication token not found. Please log in.");
        }

        const res = await api.post(
          "/api/payments/vnpay/confirm",
          vnpData,
          { headers: { Authorization: `Bearer ${token}` } } // Sử dụng token vừa lấy
        );

        setOrder(res.data);
      } catch (err: any) {
        console.error(
          "Payment confirm error:",
          err.response?.data || err.message
        );
        setError(
          err.response?.data?.message ||
            err.message ||
            "An error occurred during payment confirmation."
        );
      } finally {
        setLoading(false);
      }
    };

    confirmPayment();
  }, [params]); // Xóa 'user' khỏi dependency array vì không còn được sử dụng

  if (loading) {
    return <p className="text-center mt-10">Đang xác nhận thanh toán...</p>;
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">
          ❌ Thanh toán thất bại!
        </h2>
        <p className="text-red-700 bg-red-100 p-3 rounded-md">{error}</p>
        <Link
          to="/"
          className="mt-4 inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Quay về trang chủ
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 text-center">
      {order?.paymentStatus === "CAPTURED" ? (
        <div>
          <h2 className="text-2xl font-bold text-green-600 mb-4">
            🎉 Thanh toán thành công!
          </h2>
          <p>
            Mã đơn hàng: <b>{order.orderNumber}</b>
          </p>
          <p>Trạng thái: {order.orderStatus}</p>
        </div>
      ) : (
        <div>
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            ❌ Thanh toán không thành công!
          </h2>
          <p>
            Mã đơn hàng: <b>{order?.orderNumber || "Không có"}</b>
          </p>
          <p>Lý do: Trạng thái thanh toán là "{order?.paymentStatus}".</p>
        </div>
      )}
    </div>
  );
};

export default PaymentResult;
