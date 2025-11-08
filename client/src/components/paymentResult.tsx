import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../config/axios";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

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
  // --- Logic xử lý thanh toán (giữ nguyên) ---
  useEffect(() => {
    const confirmPayment = async () => {
      try {
        const vnpData = Object.fromEntries(params.entries());

        if (!vnpData.vnp_TransactionNo || vnpData.vnp_TransactionNo === "0") {
          const randomPart =
            crypto.randomUUID?.() ||
            Math.random().toString(36).substring(2) + Date.now();
          vnpData.vnp_TransactionNo = `DEV-${randomPart}`.slice(0, 128);
        }

        const token = localStorage.getItem("accessToken");
        if (!token) {
          throw new Error("Authentication token not found. Please log in.");
        }

        const res = await api.post("/api/payments/vnpay/confirm", vnpData, {
          headers: { Authorization: `Bearer ${token}` },
        });

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
  }, [params]);

  // --- Giao diện đã dịch sang Tiếng Anh ---

  // 1. Trạng thái Đang tải (Loading)
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-100 p-4">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600"></div>
        <h2 className="text-2xl font-semibold text-gray-800 mt-6">
          Confirming payment...
        </h2>
        <p className="text-gray-600 mt-2">
          Please wait a moment while we process your transaction.
        </p>
      </div>
    );
  }

  // 2. Trạng thái Lỗi (Error)
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl text-center">
          <AlertTriangle
            className="w-20 h-20 text-red-500 mx-auto"
            strokeWidth={1.5}
          />
          <h2 className="text-3xl font-bold text-gray-800 mt-5">
            Oops! An error occurred
          </h2>
          <p className="text-gray-600 mt-2">
            An error occurred while trying to confirm your payment.
          </p>
          <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
          <Link
            to="/"
            className="mt-8 inline-block w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold text-sm shadow-md hover:bg-indigo-700 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // 3. Trạng thái có kết quả (Result)
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      {order?.paymentStatus === "CAPTURED" ? (
        // 3.1. Thanh toán THÀNH CÔNG (Success)
        <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl text-center">
          <CheckCircle2
            className="w-20 h-20 text-green-500 mx-auto"
            strokeWidth={1.5}
          />
          <h2 className="text-3xl font-bold text-gray-800 mt-5">
            Payment Successful!
          </h2>
          <p className="text-gray-600 mt-2">
            Thank you for your booking. Have a great trip!
          </p>

          <div className="my-6 py-4 border-t border-b border-gray-200 space-y-3 text-left">
            <div className="flex justify-between">
              <span className="text-gray-500">Order Number:</span>
              <span className="font-medium text-gray-900">
                {order.orderNumber}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Order Status:</span>
              <span className="font-semibold text-green-600">
                {order.orderStatus}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <Link
              to="/purchase"
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold text-sm shadow-md hover:bg-indigo-700 transition-colors"
            >
              View Order
            </Link>
            <Link
              to="/"
              className="w-full px-6 py-3 bg-gray-100 text-gray-800 rounded-lg font-semibold text-sm hover:bg-gray-200 transition-colors"
            >
              Go to Homepage
            </Link>
          </div>
        </div>
      ) : (
        // 3.2. Thanh toán THẤT BẠI (Failed)
        <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl text-center">
          <XCircle
            className="w-20 h-20 text-red-500 mx-auto"
            strokeWidth={1.5}
          />
          <h2 className="text-3xl font-bold text-gray-800 mt-5">
            Payment Failed
          </h2>
          <p className="text-gray-600 mt-2">
            Unfortunately, your transaction could not be completed.
          </p>
          <div className="my-6 py-4 border-t border-b border-gray-200 space-y-3 text-left">
            <div className="flex justify-between">
              <span className="text-gray-500">Order Number:</span>
              <span className="font-medium text-gray-900">
                {order?.orderNumber || "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status:</span>
              <span className="font-semibold text-red-600">
                {order?.paymentStatus || "Unknown"}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <Link
              to="/"
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold text-sm shadow-md hover:bg-indigo-700 transition-colors"
            >
              Try Again
            </Link>
            <Link
              to="/contact"
              className="w-full px-6 py-3 bg-gray-100 text-gray-800 rounded-lg font-semibold text-sm hover:bg-gray-200 transition-colors"
            >
              Contact Support
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentResult;
