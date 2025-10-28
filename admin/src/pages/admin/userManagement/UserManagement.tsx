import React, {
  useState,
  useEffect,
  useCallback,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Link } from "react-router-dom";
import {
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit2,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import api from "../../../config/axios";
import { useAppProvider } from "../../../context/useContex";
import RoleEditModal from "./RoleEditModal";
import toast from "react-hot-toast";

interface AdminUserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  roles: string[];
}

interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

interface QueryParams {
  page: number;
  size: number;
  search: string;
  role: string;
  enabled: string;
}

const UserManagement: React.FC = () => {
  const { user } = useAppProvider();

  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [pagination, setPagination] = useState<Omit<
    PageResponse<any>,
    "content"
  > | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>(
    {}
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserSummary | null>(
    null
  );
  // ============================

  const [queryParams, setQueryParams] = useState<Omit<QueryParams, "size">>({
    page: 0,
    search: "",
    role: "",
    enabled: "",
  });
  const [draftFilters, setDraftFilters] = useState({
    search: "",
    role: "",
    enabled: "",
  });

  const PAGE_SIZE = 10;

  const fetchUsers = useCallback(async () => {
    if (!user?.token) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: queryParams.page.toString(),
        size: PAGE_SIZE.toString(),
      });
      if (queryParams.search) params.append("search", queryParams.search);
      if (queryParams.role) params.append("role", queryParams.role);
      if (queryParams.enabled) params.append("enabled", queryParams.enabled);

      const response = await api.get<PageResponse<AdminUserSummary>>(
        `/api/admin/users`,
        {
          headers: { Authorization: `Bearer ${user.token}` },
          params: params,
        }
      );

      const { content, ...pageInfo } = response.data;
      setUsers(content);
      setPagination(pageInfo);
    } catch (err: any) {
      console.error("Error fetching user list:", err);
      setError("Unable to load user list. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [queryParams, user?.token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleFilterChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setDraftFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFilterSubmit = (e: FormEvent) => {
    e.preventDefault();
    setQueryParams((prev) => ({
      ...prev,
      ...draftFilters,
      page: 0,
    }));
  };

  const handlePageChange = (newPage: number) => {
    setQueryParams((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  const handleToggleStatus = async (targetUser: AdminUserSummary) => {
    setActionLoading((prev) => ({ ...prev, [targetUser.id]: true }));
    try {
      const newStatus = !targetUser.enabled;
      await api.patch(
        `/api/admin/users/${targetUser.id}/status`,
        { enabled: newStatus },
        { headers: { Authorization: `Bearer ${user?.token}` } }
      );
      toast.success("Status change successful!");
      fetchUsers();
    } catch (err) {
      console.error("Error updating status:", err);
      setError("Status update failed.");
    } finally {
      setActionLoading((prev) => ({ ...prev, [targetUser.id]: false }));
    }
  };

  const handleOpenModal = (targetUser: AdminUserSummary) => {
    setSelectedUser(targetUser);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedUser(null);
    setIsModalOpen(false);
  };

  const handleSaveRoles = async (userId: string, newRoles: string[]) => {
    try {
      await api.put(
        `/api/admin/users/${userId}/roles`,
        { roles: newRoles },
        { headers: { Authorization: `Bearer ${user?.token}` } }
      );

      handleCloseModal();
      fetchUsers();
    } catch (err: any) {
      console.error("Error saving roles:", err);

      if (err.response?.status === 404) {
        throw new Error("One or more roles do not exist.");
      }
      throw new Error("Could not save roles. Please try again.");
    }
  };
  // ===============================

  // --- Render ---
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">User Management</h1>
      <form
        onSubmit={handleFilterSubmit}
        className="bg-white p-4 rounded-lg shadow-md mb-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label
              htmlFor="search"
              className="block text-sm font-medium text-gray-700"
            >
              Search (Email, Name)
            </label>
            <div className="mt-1 relative">
              <input
                type="text"
                name="search"
                id="search"
                value={draftFilters.search}
                onChange={handleFilterChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter email, name..."
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>
          <div>
            <label
              htmlFor="role"
              className="block text-sm font-medium text-gray-700"
            >
              Role
            </label>
            <select
              id="role"
              name="role"
              value={draftFilters.role}
              onChange={handleFilterChange}
              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All roles</option>
              <option value="ADMIN">ADMIN</option>
              <option value="CUSTOMER">CUSTOMER</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="enabled"
              className="block text-sm font-medium text-gray-700"
            >
              Status
            </label>
            <select
              id="enabled"
              name="enabled"
              value={draftFilters.enabled}
              onChange={handleFilterChange}
              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All status</option>
              <option value="true">Active</option>
              <option value="false">Disabled</option>
            </select>
          </div>
        </div>
        <div className="text-right mt-4">
          <button
            type="submit"
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Filter
          </button>
        </div>
      </form>
      {error && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4"
          role="alert"
        >
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      {/* Data Table */}
      <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-2" />
            No matching users were found.
          </div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Email
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Full Name
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Role
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Date Created
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {u.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((role) => (
                          <span
                            key={role}
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              role === "ADMIN"
                                ? "bg-red-100 text-red-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {u.enabled ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Disabled
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(u.createdAt).toLocaleDateString("en-US")}
                    </td>

                    {/* === Actions === */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end items-center gap-2">
                        {/* Toggle Status Button */}
                        <button
                          onClick={() => handleToggleStatus(u)}
                          disabled={actionLoading[u.id]}
                          className={`p-2 rounded-full text-white ${
                            u.enabled
                              ? "bg-red-500 hover:bg-red-600"
                              : "bg-green-500 hover:bg-green-600"
                          } disabled:opacity-50`}
                          title={u.enabled ? "Disable" : "Activate"}
                        >
                          {actionLoading[u.id] ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : u.enabled ? (
                            <XCircle className="w-4 h-4" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          onClick={() => handleOpenModal(u)}
                          className="p-2 rounded-full text-blue-600 hover:bg-blue-100"
                          title="Edit roles"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <Link
                          to={`/admin/users/${u.id}`}
                          className="p-2 rounded-full text-gray-600 hover:bg-gray-100"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6 mt-4">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.hasPrevious}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.hasNext}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing
                      <span className="font-medium">
                        {pagination.page * PAGE_SIZE + 1}
                      </span>
                      to
                      <span className="font-medium">
                        {Math.min(
                          (pagination.page + 1) * PAGE_SIZE,
                          pagination.totalElements
                        )}
                      </span>
                      of
                      <span className="font-medium">
                        {pagination.totalElements}
                      </span>
                      results
                    </p>
                  </div>
                  <div>
                    <nav
                      className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                      aria-label="Pagination"
                    >
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={!pagination.hasPrevious}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <span className="sr-only">Previous</span>
                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                      </button>
                      <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                        Page {pagination.page + 1} / {pagination.totalPages}
                      </span>
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={!pagination.hasNext}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <span className="sr-only">Next</span>
                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {/* === ADD MODAL COMPONENT === */}
      <RoleEditModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveRoles}
        user={selectedUser}
      />
    </div>
  );
};

export default UserManagement;
