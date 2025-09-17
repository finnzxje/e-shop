import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
export default function Register() {
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    resetEmail?: string;
    name?: string;
    confirmPassword?: string;
  }>({});

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: {
      email?: string;
      password?: string;
      resetEmail?: string;
      name?: string;
      confirmPassword?: string;
    } = {};

    if (!email.trim()) {
      newErrors.email = "Please enter your email";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Invalid email format";
    }
    if (!password.trim()) {
      newErrors.password = "Please enter your password";
    }
    if (!name.trim()) {
      newErrors.name = "Please enter your name";
    }
    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = "Please enter your conrirm password";
    }
    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      console.log("Login with:", { email, password, name });
      alert("Login successful!");
      setEmail("");
      setPassword("");
      setName("");
      setConfirmPassword("");
    }
  };

  return (
    <div className="flex items-center justify-center bg-white px-6 relative mt-20 mb-20">
      <div className="w-full max-w-md space-y-8">
        <h1 className="text-4xl font-bold">Create an Account.</h1>

        <form className="space-y-7" noValidate onSubmit={handleLogin}>
          {/* Name   */}
          <div>
            <label
              className={`block text-lg font-medium ${
                errors.name ? "text-red-500" : ""
              }`}
            >
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`mt-2 block w-full border-b focus:outline-none text-lg py-3 ${
                errors.name
                  ? "border-red-500 placeholder-red-400"
                  : "border-black"
              }`}
              placeholder="Enter your name"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>
          {/* Email */}
          <div>
            <label className="block text-lg font-medium">Email</label>
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
          {/* Confirm Password */}
          <div>
            <label
              className={`block text-lg font-medium ${
                errors.confirmPassword ? "text-red-500" : ""
              }`}
            >
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`mt-2 block w-full border-b focus:outline-none text-lg py-3 ${
                  errors.confirmPassword
                    ? "border-red-500 placeholder-red-400"
                    : "border-black"
                }`}
                placeholder="Enter your confirm password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-black"
              >
                {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">
                {errors.confirmPassword}
              </p>
            )}
            {!errors.confirmPassword && password != confirmPassword && (
              <p className="text-red-500 text-sm mt-1">
                Passwords do not match
              </p>
            )}
          </div>
          {/* Login Button */}
          <button
            type="submit"
            className="w-full rounded-full bg-black py-4 text-lg text-white font-semibold hover:bg-gray-900 transition cursor-pointer"
          >
            Create Account
          </button>
        </form>
      </div>
    </div>
  );
}
