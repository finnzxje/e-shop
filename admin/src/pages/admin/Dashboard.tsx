import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  DollarSign,
  ShoppingCart,
  UserPlus,
  CreditCard,
  BadgeDollarSign,
  MousePointerClick,
  AlertCircle,
  Loader2,
  ArrowRightLeft,
} from "lucide-react";
import type { ReactNode } from "react";
import api from "../../config/axios";
import { useAppProvider } from "../../context/useContext";
interface SummaryData {
  revenue: number;
  orders: number;
  capturedPayments: number;
  newCustomers: number;
  averageOrderValue: number;
  conversionRate: number;
}

interface RevenueData {
  bucketStart: string;
  bucketEnd: string;
  orderCount: number;
  gross: number;
  net: number;
  refunds: number;
}

const formatCurrency = (value: number, targetCurrency: "USD" | "VND") => {
  if (targetCurrency === "VND") {
    // Giả sử 1 USD = 25,000 VND
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value * 25000);
  }

  // Mặc định là USD
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat("en-US").format(value);
};

interface StatCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => (
  <div className="bg-white p-5 rounded-lg shadow transition-all hover:shadow-lg">
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold text-gray-500 uppercase">{title}</h3>
      <div
        className={`p-2 rounded-full`}
        style={{ backgroundColor: `${color}20` }}
      >
        {React.cloneElement(icon as React.ReactElement<any>, {
          className: "w-5 h-5",
          style: { color },
        })}
      </div>
    </div>
    <p className="text-3xl font-bold text-gray-800 mt-2">{value}</p>
  </div>
);

const StatCardSkeleton: React.FC = () => (
  <div className="bg-white p-5 rounded-lg shadow animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
    <div className="h-8 bg-gray-300 rounded w-3/4"></div>
  </div>
);

const RevenueChart: React.FC<{
  data: RevenueData[];
  currency: "USD" | "VND";
}> = ({ data, currency }) => {
  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatYAxis = (tickItem: number) => {
    // tickItem là giá trị USD gốc
    if (currency === "VND") {
      const vndValue = tickItem * 25000;
      // Định dạng rút gọn (triệu, tỷ)
      if (vndValue >= 1_000_000_000) {
        return `${(vndValue / 1_000_000_000).toFixed(0)}tỷ`; // Tỷ
      }
      if (vndValue >= 1_000_000) {
        return `${(vndValue / 1_000_000).toFixed(0)}tr`; // Triệu
      }
      if (vndValue >= 1_000) {
        return `${(vndValue / 1_000).toFixed(0)}k`; // Ngàn
      }
      return vndValue.toString();
    }

    // Định dạng USD gốc
    if (tickItem >= 1000) {
      return `$${(tickItem / 1000).toFixed(0)}k`;
    }
    return `$${tickItem}`;
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart
        data={data}
        margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis
          dataKey="bucketStart"
          tickFormatter={formatShortDate}
          fontSize={12}
          stroke="#6b7280"
        />
        <YAxis tickFormatter={formatYAxis} fontSize={12} stroke="#6b7280" />
        <Tooltip
          formatter={(value: number, name: string) => {
            let formattedValue: string;
            if (currency === "VND") {
              const vndValue = value * 25000;
              formattedValue = new Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
              }).format(vndValue);
            } else {
              formattedValue = new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(value);
            }

            const displayName = name.charAt(0).toUpperCase() + name.slice(1);
            return [formattedValue, displayName];
          }}
          labelFormatter={(label: string) => formatShortDate(label)}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="gross"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="refunds"
          stroke="#ef4444"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

const Dashboard: React.FC = () => {
  const { user } = useAppProvider();
  const [currency, setCurrency] = useState<"USD" | "VND">("USD");

  const [summaryPeriod, setSummaryPeriod] = useState<string>("30d");
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [chartRange, setChartRange] = useState<string>("30d");
  const [chartData, setChartData] = useState<RevenueData[]>([]);
  const [isChartLoading, setIsChartLoading] = useState(true);
  const [chartError, setChartError] = useState<string | null>(null);

  const statCardMetrics = [
    {
      key: "revenue",
      title: "Total Revenue",
      icon: <DollarSign />,
      color: "#3b82f6",
    },
    {
      key: "orders",
      title: "Orders",
      icon: <ShoppingCart />,
      color: "#f59e0b",
    },
    {
      key: "newCustomers",
      title: "New Customers",
      icon: <UserPlus />,
      color: "#10b981",
    },
    {
      key: "capturedPayments",
      title: "Payments (Captured)",
      icon: <CreditCard />,
      color: "#6366f1",
    },
    {
      key: "averageOrderValue",
      title: "Avg. Order Value",
      icon: <BadgeDollarSign />,
      color: "#a855f7",
    },
    {
      key: "conversionRate",
      title: "Conversion Rate",
      icon: <MousePointerClick />,
      color: "#ec4899",
    },
  ];

  // Fetch Summary Data
  useEffect(() => {
    const fetchSummary = async () => {
      if (!user?.token) {
        setSummaryError("Please log in to view analytics.");
        setIsSummaryLoading(false);
        return;
      }

      setIsSummaryLoading(true);
      setSummaryError(null);
      try {
        const res = await api.get(
          `/api/admin/analytics/summary?period=${summaryPeriod}`,
          {
            headers: { Authorization: `Bearer ${user.token}` },
          }
        );
        setSummaryData(res.data);
      } catch (err) {
        setSummaryError("Failed to load summary data.");
        console.error(err);
      } finally {
        setIsSummaryLoading(false);
      }
    };
    fetchSummary();
  }, [summaryPeriod, user?.token]);

  // Fetch Chart Data
  useEffect(() => {
    const fetchChartData = async () => {
      if (!user?.token) {
        setChartError("Please log in to view chart.");
        setIsChartLoading(false);
        return;
      }

      setIsChartLoading(true);
      setChartError(null);

      const end = new Date();
      const start = new Date();
      if (chartRange === "7d") start.setDate(end.getDate() - 7);
      if (chartRange === "30d") start.setDate(end.getDate() - 30);
      if (chartRange === "90d") start.setDate(end.getDate() - 90);

      const utcEnd = end.toISOString();
      const utcStart = start.toISOString();

      const interval = chartRange === "90d" ? "weekly" : "daily";

      try {
        const res = await api.get(
          `/api/admin/analytics/revenue?start=${utcStart}&end=${utcEnd}&interval=${interval}`,
          {
            headers: { Authorization: `Bearer ${user.token}` },
          }
        );
        setChartData(res.data);
      } catch (err) {
        setChartError("Failed to load chart data.");
        console.error(err);
      } finally {
        setIsChartLoading(false);
      }
    };
    fetchChartData();
  }, [chartRange, user?.token]);

  const getFormattedValue = (
    key: keyof SummaryData,
    value: number,
    currency: "USD" | "VND"
  ) => {
    switch (key) {
      case "revenue":
      case "capturedPayments":
      case "averageOrderValue":
        return formatCurrency(value, currency);
      case "orders":
      case "newCustomers":
        return formatNumber(value);
      case "conversionRate":
        return `${value.toFixed(2)}%`;
      default:
        return value.toString();
    }
  };

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      {/* --- PHẦN HEADER --- */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <button
            onClick={() => setCurrency((c) => (c === "USD" ? "VND" : "USD"))}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <ArrowRightLeft className="w-4 h-4" />{" "}
            <span>Show in {currency === "USD" ? "VND" : "USD"}</span>
          </button>

          <select
            value={summaryPeriod}
            onChange={(e) => setSummaryPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSummaryLoading}
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* --- PHẦN CARD THỐNG KÊ --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isSummaryLoading ? (
          Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : summaryError ? (
          <div className="col-span-full bg-red-100 border border-red-300 text-red-700 p-4 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <span>{summaryError}</span>
          </div>
        ) : (
          statCardMetrics.map((metric) => (
            <StatCard
              key={metric.key}
              title={metric.title}
              value={getFormattedValue(
                metric.key as keyof SummaryData,
                summaryData?.[metric.key as keyof SummaryData] ?? 0,
                currency
              )}
              icon={metric.icon}
              color={metric.color}
            />
          ))
        )}
      </div>

      {/* --- PHẦN BIỂU ĐỒ DOANH THU --- */}
      <div className="bg-white p-6 rounded-lg shadow-lg mt-8">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Revenue Overview
          </h2>
          <select
            value={chartRange}
            onChange={(e) => setChartRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2 sm:mt-0"
            disabled={isChartLoading}
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>

        {isChartLoading ? (
          <div className="flex items-center justify-center h-[400px]">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          </div>
        ) : chartError ? (
          <div className="flex items-center justify-center h-[400px] text-red-600">
            <AlertCircle className="w-6 h-6 mr-2" />
            <span>{chartError}</span>
          </div>
        ) : (
          <RevenueChart data={chartData} currency={currency} />
        )}
      </div>
    </div>
  );
};

const DashboardWrapper: React.FC = () => <Dashboard />;

export default DashboardWrapper;
