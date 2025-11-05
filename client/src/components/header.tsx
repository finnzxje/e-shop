import { useState, useEffect, useMemo } from "react"; // MỚI: Thêm useMemo
import { User, ShoppingBag, Menu, X, Heart, ChevronDown } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAppProvider } from "../context/useContex";
import profile from "../assets/profile_icon.png";
import toast from "react-hot-toast";
import api from "../config/axios";
import { useNavigate } from "react-router-dom";
interface Category {
  id: number;
  name: string;
  slug: string;
  active: boolean;
  parentCategoryId: number | null;
}

export const Header = () => {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [mobileSportsOpen, setMobileSportsOpen] = useState(false);
  const [activeParent, setActiveParent] = useState<Category | null>(null);
  const { user, cart, handleLogout } = useAppProvider();
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams();

  const handleOnclick = (categorySlug: string) => {
    params.set("categorySlug", categorySlug);
    navigate(`/all-products?${params.toString()}`);
  };
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get<Category[]>("/api/catalog/categories");
        setCategories(res.data.filter((cat) => cat.active));
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      }
    };

    fetchCategories();
  }, []);

  const parentCategories = useMemo(() => {
    return categories
      .filter(
        (cat) => cat.parentCategoryId === 2 || cat.parentCategoryId === null
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  const childCategories = useMemo(() => {
    if (!activeParent) return [];
    return categories
      .filter((cat) => cat.parentCategoryId === activeParent.id)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, activeParent]);

  const handleLogouts = () => {
    handleLogout();
    navigate("/");
    toast.success("Logout success!");
  };

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `relative py-2 transition-colors duration-200 ${
      isActive ? "font-semibold text-black" : "text-gray-700 hover:text-black"
    } after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-black after:transform after:scale-x-0 after:transition-transform after:duration-300 ${
      isActive ? "after:scale-x-100" : "hover:after:scale-x-100"
    }`;

  const isSportsActive = location.pathname.startsWith("/category");

  const sportsLinkClasses = `relative py-2 transition-colors duration-200 flex items-center gap-1 cursor-pointer ${
    isSportsActive
      ? "font-semibold text-black"
      : "text-gray-700 hover:text-black"
  } after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-black after:transform after:scale-x-0 after:transition-transform after:duration-300 ${
    isSportsActive ? "after:scale-x-100" : "hover:after:scale-x-100"
  }`;

  return (
    <header className="flex items-center justify-between px-6 md:px-16 lg:px-24 xl:px-32 py-4 border-b border-gray-200 bg-white shadow-sm relative z-60">
      {/* Logo  */}
      <Link to={"/"}>
        <div className="group">
          <div className="relative inline-block">
            <span
              className="text-2xl cursor-pointer font-bold text-black uppercase tracking-widest"
              style={{
                fontFamily: "Garamond, Georgia, serif",
                letterSpacing: "0.2em",
                textShadow: "2px 2px 0px rgba(0,0,0,0.1)",
              }}
            >
              PATAGONIA
            </span>
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-black transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
            <div className="absolute -bottom-2 left-0 right-0 flex justify-center gap-1">
              <div className="w-1 h-1 bg-black rounded-full"></div>
              <div className="w-1 h-1 bg-black rounded-full"></div>
              <div className="w-1 h-1 bg-black rounded-full"></div>
            </div>
          </div>
        </div>
      </Link>

      {/* Desktop Menu  */}
      <nav className="hidden md:block">
        <ul className="flex gap-8 text-sm font-montserrat font-medium">
          <NavLink to="/" className={navLinkClasses}>
            Home
          </NavLink>
          <NavLink to="/all-products" className={navLinkClasses}>
            All Products
          </NavLink>

          <li
            className="relative group"
            onMouseLeave={() => setActiveParent(null)}
          >
            <span className={sportsLinkClasses}>
              Category
              <ChevronDown
                size={16}
                className="transition-transform group-hover:rotate-180"
              />
            </span>

            <div className="absolute  -left-72 top-full mt-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-50">
              <div className="w-[40rem] flex bg-white border border-gray-200 shadow-lg rounded-md p-4">
                {/* CỘT 1: DANH MỤC CHA */}
                <ul className="w-1/2 border-r border-gray-200 pr-4 space-y-1">
                  {parentCategories.length > 0 ? (
                    parentCategories.map((category) => (
                      <li
                        key={category.id}
                        onMouseEnter={() => setActiveParent(category)}
                        onClick={() => handleOnclick(category.slug)}
                        className={`block w-full text-left px-3 py-1.5 text-sm rounded-md cursor-pointer ${
                          activeParent?.id === category.id
                            ? "bg-gray-100 text-black font-semibold"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {category.name}
                      </li>
                    ))
                  ) : (
                    <li className="px-3 py-1.5 text-sm text-gray-500">
                      Loading...
                    </li>
                  )}
                </ul>

                {/* CỘT 2: DANH MỤC CON */}
                <ul className="w-1/2 pl-4 space-y-1">
                  {childCategories.length > 0 ? (
                    childCategories.map((category) => (
                      <li key={category.id}>
                        <div
                          onClick={() => handleOnclick(category.slug)}
                          className="block cursor-pointer w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 hover:text-black rounded-md"
                        >
                          {category.name}
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="px-3 py-1.5 text-sm text-gray-400">
                      {activeParent
                        ? "No sub-categories"
                        : "Hover a category to see more"}
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </li>
          {/* === KẾT THÚC THAY ĐỔI === */}

          <NavLink to="/contact" className={navLinkClasses}>
            Contact
          </NavLink>
        </ul>
      </nav>

      <button
        className="md:hidden text-gray-700 text-2xl"
        onClick={() => setOpen(!open)}
      >
        {open ? <X /> : <Menu />}
      </button>

      {/* Icons  */}
      <div className="flex items-center gap-6">
        {!user ? (
          <Link to="/login">
            <User className="cursor-pointer hover:text-black text-2xl" />
          </Link>
        ) : (
          <div className="relative group">
            <img src={profile} alt="profile" className="w-10 cursor-pointer" />

            <ul
              className="hidden group-hover:block absolute top-10 -right-7 bg-white 
               border border-gray-200 shadow-lg w-max-content z-40 
               rounded-md py-1.5 text-sm"
            >
              <li>
                <Link
                  to="/my-profile"
                  className="block w-full py-1.5 px-4 hover:bg-primary/10 whitespace-nowrap"
                >
                  My Profile
                </Link>
              </li>
              <li>
                <Link
                  to="/purchase"
                  className="block w-full py-1.5 px-4 hover:bg-primary/10 whitespace-nowrap"
                >
                  My Orders
                </Link>
              </li>
              <li>
                <span
                  onClick={handleLogouts}
                  className="block w-full py-1.5 px-4 hover:bg-primary/10 cursor-pointer whitespace-nowrap"
                >
                  Logout
                </span>
              </li>
            </ul>
          </div>
        )}

        <Link to={"/wishlist"} className="relative">
          <Heart className="cursor-pointer hover:text-black text-2xl" />
        </Link>
        <Link to={"/cart"} className="relative">
          <ShoppingBag className="cursor-pointer hover:text-black text-2xl" />
          {cart?.totalQuantity > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
              {cart.totalQuantity}
            </span>
          )}
        </Link>
      </div>

      {open && (
        <div className="absolute top-full left-0 w-full h-screen z-40 bg-white border-t border-gray-200 shadow-md md:hidden">
          <ul className="flex flex-col p-4 space-y-4 text-sm font-montserrat text-gray-700">
            <NavLink
              to="/"
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `hover:text-black ${isActive ? "font-bold text-black" : ""}`
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/all-products"
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `hover:text-black ${isActive ? "font-bold text-black" : ""}`
              }
            >
              All Products
            </NavLink>

            <li>
              <button
                onClick={() => setMobileSportsOpen(!mobileSportsOpen)}
                className={`flex justify-between items-center w-full hover:text-black ${
                  isSportsActive ? "font-bold text-black" : ""
                }`}
              >
                <span>Category</span>
                <ChevronDown
                  size={16}
                  className={`transition-transform ${
                    mobileSportsOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {mobileSportsOpen && (
                <ul className="pl-4 mt-2 space-y-2">
                  {parentCategories.map((category) => (
                    <li key={category.id}>
                      <NavLink
                        to={`/category/${category.slug}`}
                        onClick={() => setOpen(false)}
                        className={({ isActive }) =>
                          `block hover:text-black ${
                            isActive ? "font-semibold text-black" : ""
                          }`
                        }
                      >
                        {category.name}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </li>

            <NavLink
              to="/contact"
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `hover:text-black ${isActive ? "font-bold text-black" : ""}`
              }
            >
              Contact
            </NavLink>
          </ul>
        </div>
      )}
    </header>
  );
};
