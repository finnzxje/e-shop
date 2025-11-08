import React, { useState, useEffect, type FormEvent } from "react";
import { Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
const ALL_AVAILABLE_ROLES = ["ADMIN", "CUSTOMER", "STAFF"];
const DEFAULT_ROLE = ALL_AVAILABLE_ROLES[1];

interface AdminUserSummary {
  id: string;
  email: string;
  roles: string[];
}

interface RoleEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userId: string, newRoles: string[]) => Promise<void>;
  user: AdminUserSummary | null;
}

const RoleEditModal: React.FC<RoleEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  user,
}) => {
  const [selectedRole, setSelectedRole] = useState<string>(DEFAULT_ROLE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setSelectedRole(user.roles[0] || DEFAULT_ROLE);
    } else {
      setSelectedRole(DEFAULT_ROLE);
    }
    setError(null);
    setIsSubmitting(false);
  }, [user]);

  if (!isOpen || !user) {
    return null;
  }

  const handleRoleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedRole(e.target.value);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await onSave(user.id, [selectedRole]);
      toast.success("Role updated successfully!");
    } catch (err: any) {
      console.error("Error updating roles:", err);
      setError(err.message || "Could not update roles. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 bg-opacity-50 transition-opacity">
      {/* Modal Content */}
      <div className="relative w-full max-w-lg p-6 bg-white rounded-lg shadow-xl m-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 disabled:opacity-50"
        >
          <X size={24} />
        </button>

        {/* Header */}
        <h2 className="text-xl font-bold text-gray-800 mb-2">Update Role</h2>
        <p className="text-sm text-gray-600 mb-6">
          For user: <strong className="font-medium">{user.email}</strong>
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <p className="font-medium text-gray-700">Select role:</p>
            {ALL_AVAILABLE_ROLES.map((role) => (
              <label
                key={role}
                className="flex items-center px-3 py-2 bg-gray-50 rounded-md border border-gray-200 hover:bg-gray-100 cursor-pointer"
              >
                <input
                  type="radio"
                  value={role}
                  checked={selectedRole === role}
                  onChange={handleRoleChange}
                  name="role-selection"
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-3 text-sm font-medium text-gray-700">
                  {role}
                </span>
              </label>
            ))}
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-blue-400"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoleEditModal;
