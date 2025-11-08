import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../config/axios";
import toast from "react-hot-toast";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function ActivateAccount() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState<string>("");
  const [showResend, setShowResend] = useState<boolean>(false);
  const [emailForResend, setEmailForResend] = useState<string>("");
  const [isResending, setIsResending] = useState<boolean>(false);
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid activation link or missing token.");
      return;
    }

    const activateAccount = async () => {
      setStatus("loading");
      try {
        const response = await api.get(`/api/auth/activate?token=${token}`);
        setStatus("success");
        setMessage(response.data.message);
        toast.success(response.data.message);
      } catch (error: any) {
        setStatus("error");
        const errorMessage =
          error.response?.data?.message ||
          "Activation failed. The token may have expired or is invalid.";
        setMessage(errorMessage);
        toast.error(errorMessage);
      }
    };

    activateAccount();
  }, [token]);

  const handleResendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailForResend) {
      toast.error("Please enter your email.");
      return;
    }

    setIsResending(true);
    try {
      const response = await api.post("/api/auth/activate/resend", {
        email: emailForResend,
      });

      toast.success(response.data.message);
      setMessage(
        "A new activation email has been sent. Please check your inbox."
      );
      setShowResend(false);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || "Failed to resend activation email.";
      toast.error(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  const renderContent = () => {
    switch (status) {
      case "loading":
        return (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            <h2 className="text-2xl font-semibold">
              Activating your account...
            </h2>
            <p className="text-gray-600">Please wait a moment.</p>
          </div>
        );

      case "success":
        return (
          <div className="flex flex-col items-center gap-4 text-center">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <h2 className="text-2xl font-semibold">
              Account Activated Successfully!
            </h2>
            <p className="text-gray-600">{message}</p>
            <button
              onClick={() => navigate("/login")}
              className="mt-4 rounded-md bg-blue-600 px-6 py-2 text-white font-medium hover:bg-blue-700"
            >
              Go to Login Page
            </button>
          </div>
        );

      case "error":
        return (
          <div className="flex flex-col items-center gap-4 text-center">
            <XCircle className="h-12 w-12 text-red-500" />
            <h2 className="text-2xl font-semibold">Activation Failed</h2>
            <p className="text-gray-600">{message}</p>

            {!showResend && (
              <button
                onClick={() => setShowResend(true)}
                className="mt-4 rounded-md bg-gray-600 px-6 py-2 text-white font-medium hover:bg-gray-700"
              >
                Resend Activation Email
              </button>
            )}

            {showResend && (
              <form
                onSubmit={handleResendEmail}
                className="mt-6 w-full max-w-sm"
              >
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Enter your email to receive a new activation link:
                </label>
                <input
                  type="email"
                  id="email"
                  value={emailForResend}
                  onChange={(e) => setEmailForResend(e.target.value)}
                  placeholder="your.email@example.com"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
                <button
                  type="submit"
                  disabled={isResending}
                  className="mt-4 w-full rounded-md bg-blue-600 px-6 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {isResending ? "Sending..." : "Send"}
                </button>
              </form>
            )}
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        {renderContent()}
      </div>
    </div>
  );
}
