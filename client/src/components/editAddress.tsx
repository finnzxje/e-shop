import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../config/axios";
import { useAppProvider } from "../context/useContex";

interface FormErrors {
  recipientName?: string;
  phone?: string;
  line1?: string;
  city?: string;
  label?: string;
  line2?: string;
  stateProvince?: string;
  postalCode?: string;
}

const EditAddress = () => {
  const { user } = useAppProvider();
  const navigate = useNavigate();
  const location = useLocation();
  const formRef = useRef<HTMLFormElement>(null);
  const addressId: string | undefined = location.state;

  const [form, setForm] = useState({
    label: "",
    recipientName: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    stateProvince: "",
    postalCode: "",
    countryCode: "VN",
    isDefault: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(!!addressId);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  useEffect(() => {
    const fetchAddress = async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/api/account/addresses/${addressId}`, {
          headers: { Authorization: `Bearer ${user?.token}` },
        });
        setForm(res.data);
      } catch (err) {
        console.error("Failed to fetch address:", err);
        toast.error("Could not load address data.");
      } finally {
        setIsLoading(false);
      }
    };

    if (addressId && user?.token) {
      fetchAddress();
    }
  }, [addressId, user?.token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm((prevForm) => ({
      ...prevForm,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prevErrors) => ({ ...prevErrors, [name]: undefined }));
    }
  };
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    const currentForm = formRef.current;
    if (!currentForm) return false;

    for (const field of Array.from(currentForm.elements)) {
      const input = field as HTMLInputElement;
      if (!input.name || !input.checkValidity) continue;

      if (!input.checkValidity()) {
        newErrors[input.name as keyof FormErrors] = input.validationMessage;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 🧩 Combined logic for adding and updating an address
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSaving(true);
    const apiCall = addressId
      ? api.put(`/api/account/addresses/${addressId}`, form, {
          headers: { Authorization: `Bearer ${user?.token}` },
        })
      : api.post(`/api/account/addresses`, form, {
          headers: { Authorization: `Bearer ${user?.token}` },
        });

    try {
      await apiCall;
      toast.success(`Address ${addressId ? "updated" : "added"} successfully!`);
      navigate(-1);
    } catch (err) {
      console.error("Failed to save address:", err);
      toast.error("Failed to save address. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // 🗑️ Delete address
  const handleDelete = async () => {
    if (!addressId) return;

    setIsDeleting(true);
    try {
      await api.delete(`/api/account/addresses/${addressId}`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      toast.success("Address deleted successfully!");
      navigate(-1);
    } catch (err) {
      console.error("Failed to delete address:", err);
      toast.error("Failed to delete address. Please try again.");
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const FormField = ({ name, label, error, ...props }: any) => (
    <div>
      <label
        htmlFor={name}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        {...props}
        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 ${
          error
            ? "border-red-500 focus:border-red-500 focus:ring-red-500"
            : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          {addressId ? "Edit Address" : "Add a New Address"}
        </h1>
        <p className="text-gray-600 mb-8">
          {addressId
            ? "Update the details of your address below."
            : "Please fill out the form to add a new address."}
        </p>

        <form
          ref={formRef} // ✨ THAY ĐỔI 3.1: Gắn ref vào form
          onSubmit={handleSubmit}
          noValidate // ✨ THAY ĐỔI 3.2: Tắt bong bóng lỗi mặc định
          className="bg-white p-8 rounded-lg shadow-md space-y-6"
        >
          {/* ... Các FormField của bạn vẫn giữ nguyên ... */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <FormField
                label="Label (e.g., Home, Work)"
                name="label"
                value={form.label}
                onChange={handleChange}
                placeholder="My Home Address"
              />
            </div>
            <FormField
              label="Recipient's Name"
              name="recipientName"
              value={form.recipientName}
              onChange={handleChange}
              placeholder="John Doe"
              required
              error={errors.recipientName}
            />
            <FormField
              label="Phone Number"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              placeholder="+84 123 456 789"
              required
              // Ví dụ thêm validation phức tạp hơn bằng HTML
              minLength={10}
              pattern="[0-9+ ]{10,}"
              error={errors.phone}
            />
            <div className="md:col-span-2">
              <FormField
                label="Address Line 1"
                name="line1"
                value={form.line1}
                onChange={handleChange}
                placeholder="123 Nguyen Hue Street"
                required
                error={errors.line1}
              />
            </div>
            <div className="md:col-span-2">
              <FormField
                label="Address Line 2 (Optional)"
                name="line2"
                value={form.line2}
                onChange={handleChange}
                placeholder="Apartment, suite, etc."
              />
            </div>
            <FormField
              label="City"
              name="city"
              value={form.city}
              onChange={handleChange}
              placeholder="Ho Chi Minh City"
              required
              error={errors.city}
            />
            <FormField
              label="State / Province"
              name="stateProvince"
              value={form.stateProvince}
              onChange={handleChange}
              placeholder="Ho Chi Minh"
            />
            <FormField
              label="Postal Code"
              name="postalCode"
              value={form.postalCode}
              onChange={handleChange}
              placeholder="700000"
            />
            <div className="md:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="isDefault"
                  checked={form.isDefault}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-gray-700">Set as default address</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            {addressId && (
              <button
                type="button"
                onClick={() => setDeleteModalOpen(true)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-100 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition"
              >
                Delete Address
              </button>
            )}

            <div className="flex gap-4 ml-auto">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed transition"
              >
                {isSaving
                  ? "Saving..."
                  : addressId
                  ? "Update Address"
                  : "Add Address"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-10 overflow-y-auto bg-gray-500 bg-opacity-75 transition-opacity">
          <div className="flex items-center justify-center min-h-screen">
            <div className="relative bg-white rounded-lg shadow-xl p-6 m-4 max-w-sm w-full">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Delete Address
              </h3>

              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete this address? This action
                  cannot be undone.
                </p>
              </div>

              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDelete}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:col-start-2 sm:text-sm disabled:bg-red-300"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>

                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditAddress;
