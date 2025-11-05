import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAppProvider } from "../context/useContex";
import toast from "react-hot-toast";
import api from "../config/axios";

export default function Login() {
  const navigate = useNavigate();
  const { setUser } = useAppProvider();

  // State cho form Login
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorsStatus, setErrorsStatus] = useState<number>();

  // State cho modal Reset
  const [openEmail, setOpenEmail] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [resetStep, setResetStep] = useState<"email" | "confirm">("email");
  const [resetEmail, setResetEmail] = useState<string>("");

  // State MỚI cho form "Confirm Reset"
  const [token, setToken] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showResetPassword, setShowResetPassword] = useState<boolean>(false);

  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    resetEmail?: string;
    token?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) newErrors.email = "Please enter your email";
    if (!password.trim()) newErrors.password = "Please enter your password";

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      try {
        const data: any = await api.post("/api/auth/login", {
          email,
          password,
        });
        localStorage.setItem("user", JSON.stringify(data.data));
        toast.success("Login successful!");
        setUser(data.data);
        localStorage.setItem("accessToken", data.data.token);
        setEmail("");
        setPassword("");
        navigate("/");
      } catch (error: any) {
        toast.error(error.response.data.message);
        setErrorsStatus(error.response.status);
      }
    }
  };

  // 1. Xử lý GỬI YÊU CẦU (Step 1)
  const handleSendEmail = async () => {
    const newErrors: { resetEmail?: string } = {};
    if (!resetEmail) {
      newErrors.resetEmail = "Please enter your email";
      setErrors(newErrors);
    } else {
      setErrors({});
      setIsResetting(true);
      try {
        await api.post("/api/auth/password/reset/request", {
          email: resetEmail,
        });

        toast.success("A token has been sent to your email.");
        setResetStep("confirm"); // Chuyển sang form "Confirm"
      } catch (error: any) {
        // <<< SỬA LỖI: Đã thêm dấu { ở đây
        console.error("Password reset request failed:", error);
        toast.error(
          error.response?.data?.message ||
            "An error occurred. Please try again."
        );
      } finally {
        setIsResetting(false);
      }
    }
  };

  // 2. Xử lý XÁC NHẬN MẬT KHẨU MỚI (Step 2)
  const handleConfirmReset = async () => {
    // Validation
    const newErrors: {
      token?: string;
      newPassword?: string;
      confirmPassword?: string;
    } = {};
    if (!token.trim() || token.length !== 4)
      newErrors.token = "Please enter the token.";
    if (!newPassword) newErrors.newPassword = "New password is required.";
    if (newPassword !== confirmPassword)
      newErrors.confirmPassword = "Passwords do not match.";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    // API Call
    setIsResetting(true);
    try {
      await api.post("/api/auth/password/reset/confirm", {
        email: resetEmail, // Dùng email từ Step 1
        token: token,
        newPassword: newPassword,
        confirmPassword: confirmPassword,
      });

      // Success
      toast.success("Password reset successfully! You can now log in.");
      closeResetModal(); // Đóng và reset modal
    } catch (error: any) {
      console.error("Password reset confirm failed:", error);
      toast.error(
        error.response?.data?.message ||
          "Invalid token or passwords. Please try again."
      );
    } finally {
      setIsResetting(false);
    }
  };

  // 3. Helper để ĐÓNG VÀ RESET Modal
  const closeResetModal = () => {
    setOpenEmail(false);
    setIsResetting(false);

    setTimeout(() => {
      setResetStep("email");
      setResetEmail("");
      setToken("");
      setNewPassword("");
      setConfirmPassword("");
      setErrors({});
    }, 300);
  };

  return (
    <div className="flex items-center justify-center bg-white px-6 relative mt-20 mb-20">
      <div className="w-full max-w-md space-y-8">
        <h1 className="text-4xl font-bold">Log in.</h1>

        <form className="space-y-7" onSubmit={handleLogin}>
          {/* Email */}
          <div>
            <label
              className={`block text-lg font-medium ${
                errors.email ? "text-red-500" : ""
              }`}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`mt-2 block w-full border-b focus:outline-none text-lg py-3 ${
                errors.email
                  ? "border-red-500 placeholder-red-400"
                  : "border-black"
              }`}
              placeholder="Enter your email"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label
              className={`block text-lg font-medium ${
                errors.password ? "text-red-500" : ""
              }`}
            >
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`mt-2 block w-full border-b focus:outline-none text-lg py-3 ${
                  errors.password
                    ? "border-red-500 placeholder-red-400"
                    : "border-black"
                }`}
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-black"
              >
                {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
          </div>

          {/* Password Help */}
          <div className="text-lg flex justify-between">
            <button
              type="button"
              onClick={() => setOpenEmail(true)} // Chỉ mở modal
              className="font-semibold hover:underline cursor-pointer"
            >
              Password Help?
            </button>
            {errorsStatus === 403 ? (
              <div
                onClick={() => navigate("/auth/activate")}
                className="font-semibold hover:underline cursor-pointer"
              >
                Confirm account from gmail?
              </div>
            ) : (
              ""
            )}
          </div>

          {/* Login Button */}
          <button
            type="submit"
            className="w-full rounded-full bg-black py-4 text-lg text-white font-semibold hover:bg-gray-900 transition cursor-pointer"
          >
            Log in
          </button>
        </form>

        {/* Signup Link */}
        <div className="text-lg text-center space-y-2">
          <p>Don’t have an account?</p>
          <Link to="/register" className="font-semibold hover:underline">
            Create One Now
          </Link>
        </div>
      </div>

      {/* Forget Password Modal  */}
      {openEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white w-full max-w-lg mx-4 p-8 rounded shadow-lg relative">
            {/* Close Button (Dùng helper) */}
            <button
              onClick={closeResetModal}
              className="absolute top-4 cursor-pointer right-4 text-2xl font-bold text-gray-600 hover:text-black"
            >
              ×
            </button>

            {/* Render có điều kiện dựa trên resetStep */}
            {resetStep === "email" ? (
              // --- STEP 1: YÊU CẦU EMAIL ---
              <>
                <h2 className="text-3xl font-bold mb-8 text-center text-gray-800">
                  Forget Password?
                </h2>
                <p className="text-center text-gray-600 mb-6 -mt-4">
                  Enter your email and we'll send you a token.
                </p>
                <label
                  htmlFor="reset-email"
                  className="text-lg font-medium block mb-2"
                >
                  Email
                </label>
                <input
                  id="reset-email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full border border-gray-400 focus:border-gray-600 outline-none rounded py-3.5 px-5 text-lg"
                  type="email"
                  placeholder="Enter your email"
                />
                {errors.resetEmail && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.resetEmail}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleSendEmail}
                  disabled={isResetting}
                  className="w-full mt-6 bg-gray-800 hover:bg-gray-900 cursor-pointer active:scale-95 transition py-4 rounded text-white font-semibold text-lg disabled:opacity-50"
                >
                  {isResetting ? "Sending..." : "Send Token"}
                </button>
              </>
            ) : (
              // --- STEP 2: XÁC NHẬN TOKEN VÀ MẬT KHẨU MỚI ---
              <>
                <h2 className="text-3xl font-bold mb-8 text-center text-gray-800">
                  Reset Your Password
                </h2>
                <p className="text-center text-gray-600 mb-6 -mt-4">
                  Enter the token sent to <strong>{resetEmail}</strong>.
                </p>

                {/* Token */}
                <div className="mb-4">
                  <label
                    htmlFor="token"
                    className="text-lg font-medium block mb-2"
                  >
                    Token
                  </label>
                  <input
                    id="token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="w-full border border-gray-400 focus:border-gray-600 outline-none rounded py-3.5 px-5 text-lg"
                    type="tel"
                    placeholder="1234"
                    maxLength={4}
                  />
                  {errors.token && (
                    <p className="text-red-500 text-sm mt-1">{errors.token}</p>
                  )}
                </div>

                {/* New Password */}
                <div className="mb-4">
                  <label
                    htmlFor="newPassword"
                    className="text-lg font-medium block mb-2"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="newPassword"
                      type={showResetPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full border border-gray-400 focus:border-gray-600 outline-none rounded py-3.5 px-5 text-lg pr-10"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      className="absolute right-3 top-1/2 cursor-pointer -translate-y-1/2 text-gray-600 hover:text-black"
                    >
                      {showResetPassword ? (
                        <EyeOff size={22} />
                      ) : (
                        <Eye size={22} />
                      )}
                    </button>
                  </div>
                  {errors.newPassword && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.newPassword}
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="mb-4">
                  <label
                    htmlFor="confirmPassword"
                    className="text-lg font-medium block mb-2"
                  >
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showResetPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full border border-gray-400 focus:border-gray-600 outline-none rounded py-3.5 px-5 text-lg pr-10"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      className="absolute right-3 top-1/2 cursor-pointer -translate-y-1/2 text-gray-600 hover:text-black"
                    >
                      {showResetPassword ? (
                        <EyeOff size={22} />
                      ) : (
                        <Eye size={22} />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleConfirmReset}
                  disabled={isResetting}
                  className="w-full mt-6 bg-gray-800 hover:bg-gray-900 cursor-pointer active:scale-95 transition py-4 rounded text-white font-semibold text-lg disabled:opacity-50"
                >
                  {isResetting ? "Resetting..." : "Confirm & Reset Password"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
