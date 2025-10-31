import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../config/axios";
import { Loader2, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { useAppProvider } from "../../../context/useContex";

const StatusBadge = ({ status }: { status: string }) => {
  let colorClasses = "bg-gray-100 text-gray-800";
  switch (status.toUpperCase()) {
    case "CAPTURED":
    case "COMPLETED":
      colorClasses = "bg-green-100 text-green-800";
      break;
    case "PENDING":
      colorClasses = "bg-yellow-100 text-yellow-800";
      break;
    case "FAILED":
    case "CANCELLED":
      colorClasses = "bg-red-100 text-red-800";
      break;
  }
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${colorClasses}`}
    >
      {status}
    </span>
  );
};
const InfoItem = ({
  label,
  value,
  children,
}: {
  label: string;
  value?: string | number | null;
  children?: React.ReactNode;
}) => (
  <div>
    <p className="text-sm font-medium text-gray-500">{label}</p>
    <p className="mt-1 text-md font-semibold text-gray-900">
      {children ? children : value || "N/A"}
    </p>
  </div>
);

export default function TransactionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate(); // Thêm hook navigate
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAppProvider();

  useEffect(() => {
    if (!id) return;
    if (!user?.token) {
      toast.error("User token not found. Please log in.");
      setLoading(false);
      return;
    }

    const fetchTransactionDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(
          `/api/admin/payments/transactions/${id}`,
          {
            headers: { Authorization: `Bearer ${user.token}` },
          }
        );
        setTransaction(response.data);
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.message || "Could not load transaction details";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactionDetail();
  }, [id, user?.token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center text-red-500 p-6 text-center">
        {error}
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">
        Transaction not found.
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-4">
        <button
          onClick={() => navigate(-1)}
          className="flex cursor-pointer items-center text-sm font-medium text-blue-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={18} className="mr-1" />
          Back to Transactions
        </button>
      </div>

      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Transaction Detail: {transaction.orderNumber}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">
              Payment Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <InfoItem label="Transaction ID" value={transaction.id} />
              <InfoItem label="Order Number" value={transaction.orderNumber} />
              <InfoItem label="Amount">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: transaction.currency,
                }).format(transaction.amount)}
              </InfoItem>
              <InfoItem label="Amount Captured">
                {transaction.capturedAmount
                  ? new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: transaction.currency,
                    }).format(transaction.capturedAmount)
                  : "N/A"}
              </InfoItem>
              <InfoItem label="Status">
                <StatusBadge status={transaction.status} />
              </InfoItem>
              <InfoItem label="Payment Method" value={transaction.method} />
              <InfoItem label="Provider" value={transaction.provider} />
              <InfoItem
                label="Provider Transaction ID"
                value={transaction.providerTransactionId}
              />
              <InfoItem
                label="Idempotency Key"
                value={transaction.idempotencyKey}
              />
              <InfoItem
                label="Created At"
                value={new Date(transaction.createdAt).toLocaleString()}
              />
            </div>
          </div>

          {/* Thẻ Lỗi (nếu có) */}
          {(transaction.errorCode || transaction.errorMessage) && (
            <div className="bg-white shadow-md rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-red-600">
                Error Information
              </h2>
              <div className="space-y-4">
                <InfoItem label="Error Code" value={transaction.errorCode} />
                <InfoItem
                  label="Error Message"
                  value={transaction.errorMessage}
                />
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">
              Customer Details
            </h2>
            <div className="space-y-4">
              <InfoItem label="Customer ID" value={transaction.customer.id} />
              <InfoItem
                label="Full Name"
                value={`${transaction.customer.firstName} ${transaction.customer.lastName}`}
              />
              <InfoItem label="Email" value={transaction.customer.email} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
