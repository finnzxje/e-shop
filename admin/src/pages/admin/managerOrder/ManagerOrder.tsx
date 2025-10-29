import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../../config/axios";
import { Loader2, ChevronLeft, ChevronRight, Search, Eye } from "lucide-react";
import toast from "react-hot-toast";
import { useAppProvider } from "../../../context/useContex";

interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface Transaction {
  id: string;
  orderId: string;
  orderNumber: string;
  provider: string;
  amount: number;
  currency: string;
  status: "PENDING" | "CAPTURED" | "FAILED" | string;
  method: string;
  createdAt: string;
  customer: Customer;
}

interface PaginationInfo {
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

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

export default function ManagerOrder() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const { user } = useAppProvider();
  const [filterInputs, setFilterInputs] = useState({
    status: "",
    orderNumber: "",
  });
  const [activeFilters, setActiveFilters] = useState({
    status: "",
    orderNumber: "",
  });

  useEffect(() => {
    // Check for token on component mount
    if (!user?.token) {
      toast.error("User token not found. Please log in.");
      setLoading(false);
      return;
    }

    const fetchTransactions = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.append("page", currentPage.toString());
        params.append("size", "10");
        params.append("sort", "createdAt,desc");

        if (activeFilters.status) {
          params.append("status", activeFilters.status);
        }
        if (activeFilters.orderNumber) {
          params.append("orderNumber", activeFilters.orderNumber);
        }

        const response = await api.get("/api/admin/payments/transactions", {
          params,
          headers: { Authorization: `Bearer ${user.token}` },
        });

        setTransactions(response.data.content);
        setPagination(response.data);
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.message || "Could not load transactions";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [currentPage, activeFilters, user?.token]);

  const handleFilterInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFilterInputs((prev) => ({ ...prev, [name]: value }));
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(0);
    setActiveFilters(filterInputs);
  };

  const handleNextPage = () => {
    if (pagination && pagination.hasNext) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (pagination && pagination.hasPrevious) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Transaction Management
      </h1>

      {/* --- Filter Section --- */}
      <form
        onSubmit={handleFilterSubmit}
        className="mb-6 p-4 bg-white rounded-lg shadow"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Filter by Order Number */}
          <div>
            <label
              htmlFor="orderNumber"
              className="block text-sm font-medium text-gray-700"
            >
              Order Number
            </label>
            <input
              type="text"
              id="orderNumber"
              name="orderNumber"
              value={filterInputs.orderNumber}
              onChange={handleFilterInputChange}
              className="mt-1 block w-full rounded-md  px-4 py-2 border-gray-500 border shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="ORD-00010000"
            />
          </div>

          {/* Filter by Status */}
          <div>
            <label
              htmlFor="status"
              className="block text-sm font-medium text-gray-700"
            >
              Status
            </label>
            <select
              id="status"
              name="status"
              value={filterInputs.status}
              onChange={handleFilterInputChange}
              className="mt-1 block w-full rounded-md border-gray-500 border px-4 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="CAPTURED">Captured</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          {/* Submit Button */}
          <div className="md:mt-6">
            <button
              type="submit"
              className="flex w-full md:w-auto items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white font-medium shadow-sm hover:bg-blue-700"
            >
              <Search size={18} className="mr-2" />
              Search
            </button>
          </div>
        </div>
      </form>

      {/* --- Transactions Table --- */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Order Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Date Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-12 text-red-500 font-medium"
                  >
                    {error}
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-500">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {tx.orderNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {tx.customer.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: tx.currency,
                      }).format(tx.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {tx.method} ({tx.provider})
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {/* Link to detail page, using transactionId */}
                      <Link
                        to={`/admin/orders/${tx.id}`}
                        className="text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        <Eye size={16} className="mr-1" />
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* --- Pagination Controls --- */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={handlePrevPage}
                disabled={!pagination.hasPrevious}
                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={handleNextPage}
                disabled={!pagination.hasNext}
                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{" "}
                  <span className="font-medium">
                    {pagination.page * pagination.size + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium">
                    {pagination.page * pagination.size + transactions.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium">
                    {pagination.totalElements}
                  </span>{" "}
                  results
                </p>
              </div>
              <div>
                <nav
                  className="isolate inline-flex -space-x-px rounded-md shadow-sm"
                  aria-label="Pagination"
                >
                  <button
                    onClick={handlePrevPage}
                    disabled={!pagination.hasPrevious}
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <span className="sr-only">Previous</span>
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300">
                    Page {pagination.page + 1} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={handleNextPage}
                    disabled={!pagination.hasNext}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <span className="sr-only">Next</span>
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
