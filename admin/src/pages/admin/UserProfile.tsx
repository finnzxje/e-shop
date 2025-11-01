import React from "react";
import { useAppProvider } from "../../context/useContext";
import {
  User,
  Mail,
  Shield,
  CheckCircle,
  XCircle,
  LogOut,
  Hash,
  Calendar,
} from "lucide-react";

const formatDate = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    return "Invalid Date";
  }
};

const UserProfile: React.FC = () => {
  const { user, isLoading, logout } = useAppProvider();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <p className="text-gray-500">Loading information...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <p className="text-red-500">User information not found.</p>
      </div>
    );
  }

  const userRole = user.roles[0];
  const userRoleDisplay = userRole || "N/A";

  return (
    <div className="p-6 md:p-10 bg-gray-50 min-h-full">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">
        Account Information
      </h1>

      <div className="max-w-7xl mx-auto  p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-8">
          {/* Full Name */}
          <div className="flex items-center space-x-4">
            <User className="w-6 h-6 text-gray-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500">Full Name</p>
              <p className="text-lg font-semibold text-gray-900 truncate">
                {user.firstName} {user.lastName}
              </p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center space-x-4">
            <Mail className="w-6 h-6 text-gray-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500">Email</p>
              <p className="text-lg font-semibold text-gray-900 truncate">
                {user.email}
              </p>
            </div>
          </div>

          {/* Role */}
          <div className="flex items-center space-x-4">
            <Shield className="w-6 h-6 text-gray-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500">Role</p>
              <span
                className={`px-3 py-1 text-sm font-bold rounded-full inline-block ${
                  userRole === "ADMIN"
                    ? "bg-red-100 text-red-700"
                    : userRole === "STAFF"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {userRoleDisplay}
              </span>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center space-x-4">
            {user.enabled ? (
              <CheckCircle className="w-6 h-6 text-green-500" />
            ) : (
              <XCircle className="w-6 h-6 text-red-500" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500">Status</p>
              <p
                className={`text-lg font-semibold ${
                  user.enabled ? "text-green-600" : "text-red-600"
                }`}
              >
                {user.enabled ? "Active" : "Inactive"}
              </p>
            </div>
          </div>

          {/* === TRƯỜNG MỚI: ID === */}
          <div className="flex items-center space-x-4">
            <Hash className="w-6 h-6 text-gray-400" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-500">User ID</p>
              <p
                className="text-lg font-semibold text-gray-900 truncate"
                title={user.id}
              >
                {user.id}
              </p>
            </div>
          </div>

          {/* === TRƯỜNG MỚI: Ngày tạo === */}
          <div className="flex items-center space-x-4">
            <Calendar className="w-6 h-6 text-gray-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500">Created At</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatDate(user.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Nút Đăng xuất */}
        <div className="mt-10 pt-6 border-t border-gray-200">
          <button
            onClick={logout}
            className=" flex items-center justify-center gap-2 bg-red-600 text-white py-3 px-5 rounded-lg font-semibold hover:bg-red-700 transition-colors duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
