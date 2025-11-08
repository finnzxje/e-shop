import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  ClipboardList,
  LifeBuoy,
} from "lucide-react";
import { useAppProvider } from "../../context/useContext";

type SidebarProps = {
  isCollapsed: boolean;
};

type UserRole = "ADMIN" | "STAFF";

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed }) => {
  const location = useLocation();
  const pathname = location.pathname;
  const { user } = useAppProvider();
  const userRole = user?.roles[0] as UserRole;

  const navLinks = [
    { to: "/admin", icon: <LayoutDashboard size={20} />, text: "Dashboard" },
    {
      to: "/admin/users",
      icon: <Users size={20} />,
      text: "Manage Users",
      requiredRole: "ADMIN",
    },
    {
      to: "/admin/products",
      icon: <ShoppingCart size={20} />,
      text: "Product Management",
    },
    {
      to: "/admin/orders",
      icon: <ClipboardList size={20} />,
      text: "Manage Orders",
    },
    {
      to: "/admin/support-chat",
      icon: <LifeBuoy size={20} />,
      text: "Customer Support",
    },
  ];

  const filteredNavLinks = navLinks.filter((link) => {
    if (!link.requiredRole) {
      return true;
    }

    return userRole === link.requiredRole;
  });

  return (
    <aside
      className={`shrink-0 bg-black text-white transition-all duration-300 ease-in-out
      ${isCollapsed ? "w-20" : "w-64"}`}
    >
      <div
        className={`flex items-center h-16 border-b border-gray-800
        ${isCollapsed ? "px-4 justify-center" : "px-6"}`}
      >
        <h2
          className={`text-2xl font-semibold truncate ${
            isCollapsed ? "text-center" : ""
          }`}
        >
          {isCollapsed ? (
            "PA"
          ) : (
            <div className="group">
              <div className="relative inline-block">
                <span
                  className="text-2xl cursor-pointer font-bold text-white uppercase tracking-widest"
                  style={{
                    fontFamily: "Garamond, Georgia, serif",
                    letterSpacing: "0.2em",
                    textShadow: "2px 2px 0px rgba(0,0,0,0.1)",
                  }}
                >
                  PATAGONIA
                </span>
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                <div className="absolute -bottom-2 left-0 right-0 flex justify-center gap-1">
                  <div className="w-1 h-1 bg-white rounded-full"></div>
                  <div className="w-1 h-1 bg-white rounded-full"></div>
                  <div className="w-1 h-1 bg-white rounded-full"></div>
                </div>
              </div>
            </div>
          )}
        </h2>
      </div>

      <nav
        className={`flex flex-col h-[calc(100%-64px)] justify-between ${
          isCollapsed ? "p-4" : "p-6"
        }`}
      >
        <ul>
          {filteredNavLinks.map((link) => (
            <li key={link.to} className="mb-4 relative group">
              <Link
                to={link.to}
                className={`flex items-center p-3 rounded-lg transition-colors
                  ${isCollapsed ? "justify-center" : ""} 
                  ${
                    pathname === link.to
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
              >
                <span className={!isCollapsed ? "mr-3" : ""}>{link.icon}</span>

                {!isCollapsed && <span>{link.text}</span>}
              </Link>

              {isCollapsed && (
                <div
                  className="absolute left-full ml-3 px-2 py-1 bg-gray-800 text-white text-xs rounded-md
                                opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10
                                pointer-events-none"
                >
                  {link.text}
                </div>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
