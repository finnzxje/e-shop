import React from "react";
import { Menu, LogOut, User } from "lucide-react";
import { useAppProvider } from "../../context/useContext";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";

type HeaderProps = {
  onToggleSidebar: () => void;
};

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { logout, user } = useAppProvider();
  const navigate = useNavigate();

  const userRole = user?.roles[0];

  const initials = `${user?.firstName?.[0] || ""}${
    user?.lastName?.[0] || ""
  }`.toUpperCase();

  const handleLogout = () => {
    logout();
    toast.success("Signed out successfully!");
    navigate("/");
  };

  return (
    <div className="flex items-center h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-6">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <div className="relative group">
          <div
            className="flex items-center space-x-3 cursor-pointer p-1 rounded-md 
                       hover:bg-gray-100"
          >
            <div
              className={`w-9 h-9 rounded-full ring-2 
                flex items-center justify-center text-white font-semibold text-sm
                ${
                  userRole === "ADMIN"
                    ? "ring-red-500 bg-red-600"
                    : userRole === "STAFF"
                    ? "ring-blue-500 bg-blue-600"
                    : "ring-gray-500 bg-gray-600"
                }
              `}
            >
              {initials || <User className="h-5 w-5" />}
            </div>

            <div className="hidden md:block text-left">
              <p className="text-sm font-semibold text-slate-800">
                {user?.firstName} {user?.lastName}
              </p>

              <p
                className={`text-xs font-medium ${
                  userRole === "ADMIN"
                    ? "text-red-600"
                    : userRole === "STAFF"
                    ? "text-blue-600"
                    : "text-gray-500"
                }`}
              >
                Role: {userRole}
              </p>
            </div>
          </div>

          <div
            className={`absolute right-0 mt-2 w-full bg-white rounded-md shadow-xl py-1
                        ring-1 ring-black/15 ring-opacity-5 z-10
                        transition-all duration-150 ease-out
                        opacity-0 invisible scale-95 
                        group-hover:opacity-100 group-hover:visible group-hover:scale-100`}
          >
            <Link
              to="/admin/profile"
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <User className="mr-2 h-4 w-4" />
              <span>My profile</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
