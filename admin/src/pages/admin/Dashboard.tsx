import React from "react";

const Dashboard: React.FC = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card thống kê mẫu */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-600">
            Tổng Doanh Thu
          </h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">120.000.000đ</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-600">
            Người Dùng Mới
          </h3>
          <p className="text-3xl font-bold text-green-600 mt-2">+150</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-600">Đơn Hàng</h3>
          <p className="text-3xl font-bold text-yellow-600 mt-2">45</p>
        </div>
        {/* Thêm các card khác... */}
      </div>
    </div>
  );
};

export default Dashboard;
