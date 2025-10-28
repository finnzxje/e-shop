import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAppProvider } from "../context/useContex";
import toast from "react-hot-toast";
import api from "../config/axios";
export default function Login() {
  const navigate = useNavigate();
  const { setUser } = useAppProvider();
  const [openEmail, setOpenEmail] = useState<boolean>(false);
  const [resetEmail, setResetEmail] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    resetEmail?: string;
  }>({});

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = "Please enter your email";
    }
    if (!password.trim()) {
      newErrors.password = "Please enter your password";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      try {
        const data: any = await api.post("/api/auth/login", {
          email: email,
          password: password,
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
      }
    }
  };

  const handleSendEmail = () => {
    const newErrors: { resetEmail?: string } = {};
    if (!resetEmail) {
      newErrors.resetEmail = "Please enter your email";
      setErrors(newErrors);
    } else {
      console.log("Send reset password email to:", resetEmail);
      alert("We have sent a reset password link to your email.");
      setOpenEmail(false);
      setResetEmail("");
    }
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
          <div className="text-lg">
            <button
              type="button"
              onClick={() => setOpenEmail(true)}
              className="font-semibold hover:underline cursor-pointer"
            >
              Password Help?
            </button>
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

      {/* Forget Password Modal */}
      {openEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white w-full max-w-lg mx-4 p-8 rounded shadow-lg relative">
            {/* Close Button */}
            <button
              onClick={() => setOpenEmail(false)}
              className="absolute top-4 right-4 text-2xl font-bold text-gray-600 hover:text-black"
            >
              ×
            </button>

            <h2 className="text-3xl font-bold mb-8 text-center text-gray-800">
              Forget Password?
            </h2>

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
              <p className="text-red-500 text-sm mt-1">{errors.resetEmail}</p>
            )}
            <button
              type="button"
              onClick={handleSendEmail}
              className="w-full mt-6 bg-gray-800 hover:bg-gray-900 active:scale-95 transition py-4 rounded text-white font-semibold text-lg"
            >
              Send Email
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
