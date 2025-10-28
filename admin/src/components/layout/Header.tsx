import React from "react";
import { Bell, Menu, Settings, LogOut, User } from "lucide-react";
import { useAppProvider } from "../../context/useContex";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

type HeaderProps = {
  onToggleSidebar: () => void;
};

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { logout } = useAppProvider();
  const navigate = useNavigate();
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

        <div className="flex items-center space-x-3">
          <button className="relative p-2.5 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              3
            </span>
          </button>

          <button className="p-2.5 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors">
            <Settings className="h-5 w-5" />
          </button>

          <div className="relative group border-l border-slate-200 pl-3">
            <div className="flex items-center space-x-3 cursor-pointer">
              <div className="w-8 h-8 rounded-full ring-2 ring-blue-500 bg-gray-100 flex items-center justify-center">
                <User className="h-5 w-5 text-blue-600" />
              </div>

              <div className="hidden md:block">
                <p className="text-sm font-semibold text-slate-700">Boss</p>
                <p className="text-xs text-slate-500">Administrator</p>
              </div>
            </div>

            <div
              className="absolute right-0 mt-2 w-full bg-white rounded-md shadow-lg py-1 ring-1 ring-gray-200 ring-opacity-5 z-10
                         opacity-0 invisible scale-95 group-hover:opacity-100 group-hover:visible group-hover:scale-100
                         transition-all duration-150"
            >
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
