import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Mail,
  User,
  Shield,
  Check,
  X,
  MapPin,
} from "lucide-react";
import api from "../../../config/axios";
import { useAppProvider } from "../../../context/useContex"; // Đã sửa: ../../../context/useContex

interface UserAddress {
  id: string;
  fullName: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault: boolean;
}

interface AdminUserDetail {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  enabled: boolean;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  roles: string[];
  addresses: UserAddress[];
}

const UserDetail: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAppProvider();

  const [userDetail, setUserDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !user?.token) {
      // Lỗi logic giữ tiếng Việt
      setError("Thiếu thông tin ID người dùng hoặc token.");
      setLoading(false);
      return;
    }

    const fetchUserDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get<AdminUserDetail>(
          `/api/admin/users/${userId}`,
          {
            headers: { Authorization: `Bearer ${user.token}` },
          }
        );
        setUserDetail(response.data);
      } catch (err: any) {
        // Log giữ tiếng Việt
        console.error("Lỗi khi tải chi tiết người dùng:", err);
        if (err.response?.status === 404) {
          // Lỗi logic giữ tiếng Việt
          setError("Không tìm thấy người dùng này.");
        } else {
          // Lỗi logic giữ tiếng Việt
          setError("Không thể tải chi tiết người dùng. Vui lòng thử lại.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetail();
  }, [userId, user?.token]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not verified"; // ĐÃ SỬA (UI)
    // Sửa locale để hiển thị ngày tháng kiểu US
    return new Date(dateString).toLocaleString("en-US"); // ĐÃ SỬA (UI)
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 text-center">
        {/* Lỗi hiển thị cho người dùng (UI) -> Dịch sang tiếng Anh */}
        <h1 className="text-2xl font-bold text-red-600 mb-4">
          {error === "Không tìm thấy người dùng này."
            ? "User not found."
            : error === "Không thể tải chi tiết người dùng. Vui lòng thử lại."
            ? "Could not load user details. Please try again."
            : "An error occurred."}
        </h1>
        <Link
          to="/admin/users"
          className="flex items-center justify-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back to list
        </Link>
      </div>
    );
  }

  if (!userDetail) {
    return null;
  }

  return (
    <div className="container mx-auto p-4">
      <Link
        to="/admin/users"
        className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
      >
        <ArrowLeft size={18} className="mr-2" />
        Back to list
      </Link>

      <div className="bg-white p-6 rounded-lg shadow-md">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b pb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              {userDetail.firstName} {userDetail.lastName}
            </h1>
            <p className="text-gray-500 flex items-center mt-1">
              <Mail size={14} className="mr-2" />
              {userDetail.email}
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            {userDetail.enabled ? (
              <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                <Check size={16} className="mr-1" />
                Active
              </span>
            ) : (
              <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                <X size={16} className="mr-1" />
                Disabled
              </span>
            )}
          </div>
        </div>

        {/* Grid Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cột 1: Thông tin cơ bản   */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 flex items-center">
              <User size={18} className="mr-2" />
              Basic Information
            </h3>
            <div className="text-sm">
              <span className="text-gray-500 w-32 inline-block">User ID:</span>
              <span className="font-medium text-gray-800">{userDetail.id}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500 w-32 inline-block">
                Date Created:
              </span>
              <span className="font-medium text-gray-800">
                {formatDate(userDetail.createdAt)}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500 w-32 inline-block">
                Email Verified:
              </span>
              <span className="font-medium text-gray-800">
                {formatDate(userDetail.emailVerifiedAt)}
              </span>
            </div>
          </div>

          {/* Cột 2: Vai trò & Địa chỉ   */}
          <div className="space-y-6">
            {/* Vai trò   */}
            <div>
              <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 flex items-center mb-3">
                <Shield size={18} className="mr-2" />
                Assigned Roles
              </h3>
              <div className="flex flex-wrap gap-2">
                {userDetail.roles.map((role) => (
                  <span
                    key={role}
                    className={`px-3 py-1 text-sm font-semibold rounded-full ${
                      role === "ADMIN"
                        ? "bg-red-100 text-red-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>

            {/* Địa chỉ   */}
            <div>
              <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 flex items-center mb-3">
                <MapPin size={18} className="mr-2" />
                Address Book
              </h3>
              {userDetail.addresses.length > 0 ? (
                <div className="space-y-3">
                  {userDetail.addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className="p-3 border rounded-md bg-gray-50 text-sm"
                    >
                      <p className="font-semibold text-gray-800">
                        {addr.fullName}
                        {addr.isDefault && (
                          <span className="ml-2 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                            Default
                          </span>
                        )}
                      </p>
                      <p className="text-gray-600">{addr.phoneNumber}</p>
                      <p className="text-gray-600">{addr.addressLine1}</p>
                      <p className="text-gray-600">
                        {addr.city}, {addr.state} {addr.zipCode}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  User has no saved addresses.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetail;
