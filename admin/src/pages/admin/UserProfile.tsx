import React, {
  useState,
  useEffect,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useAppProvider } from "../../context/useContext";
import api from "../../config/axios";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";

// --- Interfaces ---
interface ProfileResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}

interface ProfileFormState {
  firstName: string;
  lastName: string;
  phone: string;
}

interface PasswordFormState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  enabled: boolean;
  roles: string[];
  token?: string;
  createdAt: string;
}

interface FormInputProps {
  label: string;
  id: string;
  type?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  inputMode?:
    | "numeric"
    | "text"
    | "tel"
    | "email"
    | "search"
    | "url"
    | "decimal";
}

// --- Helper Components (Icons) ---
const IconEye: React.FC<{ className?: string }> = ({
  className = "w-5 h-5",
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
    />
  </svg>
);

const IconEyeOff: React.FC<{ className?: string }> = ({
  className = "w-5 h-5",
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.996 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.574M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.243 4.243L12 12"
    />
  </svg>
);

// --- Helper Component (FormInput) ---
const FormInput: React.FC<FormInputProps> = ({
  label,
  id,
  type = "text",
  value,
  onChange,
  disabled = false,
  inputMode,
}) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700">
      {label}
    </label>
    <input
      type={type}
      id={id}
      name={id}
      value={value}
      onChange={onChange}
      disabled={disabled}
      inputMode={inputMode}
      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5 px-4 ${
        disabled ? "bg-gray-100" : ""
      }`}
    />
  </div>
);

// --- Component chính (UserProfile) ---
const UserProfile: React.FC = () => {
  const { user, setUser, logout } = useAppProvider();

  const [profile, setProfile] = useState<ProfileFormState>({
    firstName: "",
    lastName: "",
    phone: "",
  });
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<PasswordFormState>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showCurrent, setShowCurrent] = useState<boolean>(false);
  const [showNew, setShowNew] = useState<boolean>(false);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${user?.token}` },
  });

  useEffect(() => {
    if (!user?.token) {
      navigate("/");
      return;
    }

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const response = await api.get<ProfileResponse>(
          "/api/account/profile",
          getAuthHeaders()
        );
        const { data } = response;
        setProfile({
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          phone: data.phone || "",
        });
        setEmail(data.email);
        setError(null);
      } catch (err: any) {
        setError(
          err.response?.data?.message || "Failed to load profile information."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user?.token, navigate]);

  // 2. Xử lý thay đổi input (với logic cho số điện thoại)
  const handleProfileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "phone") {
      const sanitizedValue = value.replace(/[^0-9]/g, "");
      setProfile((prev) => ({ ...prev, [name]: sanitizedValue }));
    } else {
      setProfile((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPassword((prev) => ({ ...prev, [name]: value }));
  };

  const clearAlerts = () => {
    setTimeout(() => {
      setError(null);
      setSuccess(null);
    }, 3000);
  };

  const handleUpdateProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await api.put("/api/account/profile", profile, getAuthHeaders());
      setSuccess("Profile updated successfully!");

      if (user) {
        const updatedUser = {
          ...user,
          firstName: profile.firstName,
          lastName: profile.lastName,
        };

        localStorage.setItem("user", JSON.stringify(updatedUser));

        setUser(updatedUser as User);
      }
      // --- KẾT THÚC SỬA LỖI ---
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update profile.");
    }
    setLoading(false);
    clearAlerts();
  };

  // 4. Submit Form Mật khẩu (Không thay đổi)
  const handleChangePassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.newPassword !== password.confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    setLoading(true);

    try {
      await api.patch(
        "/api/account/profile/password",
        {
          currentPassword: password.currentPassword,
          newPassword: password.newPassword,
          confirmPassword: password.confirmPassword,
        },
        getAuthHeaders()
      );

      setSuccess("Password changed successfully!");
      setPassword({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to change password.");
    }
    setLoading(false);
    clearAlerts();
  };

  // --- Render ---
  if (loading && !profile.firstName) {
    return (
      <div className="p-8 flex min-h-screen justify-center items-center">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="container mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Account Information
        </h1>

        {/* Thông báo */}
        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4 border border-red-200 text-sm font-medium text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 rounded-md bg-green-50 p-4 border border-green-200 text-sm font-medium text-green-700">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form 1: Thông tin cá nhân */}
          <form
            onSubmit={handleUpdateProfile}
            className="bg-white p-6 rounded-lg shadow-lg border border-gray-200 space-y-4"
          >
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Profile Information
            </h2>

            <FormInput
              label="Email"
              id="email"
              value={email}
              onChange={() => {}}
              disabled
            />

            <FormInput
              label="Last Name"
              id="lastName"
              value={profile.lastName}
              onChange={handleProfileChange}
            />

            <FormInput
              label="First Name"
              id="firstName"
              value={profile.firstName}
              onChange={handleProfileChange}
            />

            <FormInput
              label="Phone Number"
              id="phone"
              type="tel"
              inputMode="numeric"
              value={profile.phone}
              onChange={handleProfileChange}
            />

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>

          {/* Form 2: Đổi mật khẩu */}
          <form
            onSubmit={handleChangePassword}
            className="bg-white p-6 rounded-lg shadow-lg border border-gray-200 space-y-4"
          >
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Change Password
            </h2>

            {/* Mật khẩu hiện tại */}
            <div>
              <label
                htmlFor="currentPassword"
                className="block text-sm font-medium text-gray-700"
              >
                Current Password
              </label>
              <div className="relative mt-1">
                <input
                  type={showCurrent ? "text" : "password"}
                  id="currentPassword"
                  name="currentPassword"
                  value={password.currentPassword}
                  onChange={handlePasswordChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5 px-4 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  {showCurrent ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
            </div>

            {/* Mật khẩu mới */}
            <div>
              <label
                htmlFor="newPassword"
                className="block text-sm font-medium text-gray-700"
              >
                New Password
              </label>
              <div className="relative mt-1">
                <input
                  type={showNew ? "text" : "password"}
                  id="newPassword"
                  name="newPassword"
                  value={password.newPassword}
                  onChange={handlePasswordChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5 px-4 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  {showNew ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
            </div>

            {/* Xác nhận mật khẩu mới */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700"
              >
                Confirm New Password
              </label>
              <div className="relative mt-1">
                <input
                  type={showConfirm ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={password.confirmPassword}
                  onChange={handlePasswordChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5 px-4 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  {showConfirm ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full justify-center rounded-md border border-transparent bg-gray-700 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
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
