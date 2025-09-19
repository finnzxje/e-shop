import { useState } from "react";
import { User, ShoppingBag, Search, Menu, X, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { useAppProvider } from "../context/useContex";
import profile from "../assets/profile_icon.png";
export const Header = () => {
  const [open, setOpen] = useState(false);
  const { user, setUser } = useAppProvider();
  const handlLogout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };
  return (
    <header className="flex items-center justify-between px-6 md:px-16 lg:px-24 xl:px-32 py-4 border-b border-gray-200 bg-white shadow-sm relative">
      {/* Desktop Menu */}
      <nav className="hidden md:block">
        <ul className="flex gap-6 text-sm font-montserrat text-gray-700">
          <Link to="/" className="hover:text-black cursor-pointer">
            Home
          </Link>
          <Link to="/all-products" className="hover:text-black cursor-pointer">
            All Products
          </Link>
          <li className="hover:text-black cursor-pointer">Sports</li>
          <li className="hover:text-black cursor-pointer">Contact</li>
        </ul>
      </nav>
      <button
        className="md:hidden text-gray-700 text-2xl"
        onClick={() => setOpen(!open)}
      >
        {open ? <X /> : <Menu />}
      </button>
      {/* Logo */}
      <div className="text-xl font-bold font-poppins tracking-wide cursor-pointer">
        patagonia
      </div>
      {/* Search + Icons (luôn hiện, không responsive) */}
      <div className="flex items-center gap-6">
        <div className="relative hidden md:block">
          <input
            type="text"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        </div>

        <div className="flex gap-6 text-2xl text-gray-700">
          {!user ? (
            <Link to="/login">
              <User className="cursor-pointer hover:text-black" />
            </Link>
          ) : (
            <div className="relative group">
              <img src={profile} alt="profile" className="w-10" />
              <ul className="hidden group-hover:block absolute top-10 right-0 bg-white border border-gray-200 shadow w-30 z-40 rounded-md py-2.5 text-sm">
                <li className="p-1.5 pl-3 hover:bg-primary/10 cursor-pointer">
                  My Orders
                </li>
                <li
                  onClick={handlLogout}
                  className="p-1.5 pl-3 hover:bg-primary/10 cursor-pointer"
                >
                  Logout
                </li>
              </ul>
            </div>
          )}
          <ShoppingBag className="cursor-pointer hover:text-black" />
        </div>

        {/* Hamburger chỉ cho menu */}
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="absolute top-full left-0 w-48 min-h-screen z-10 bg-white border border-gray-200 shadow-md md:hidden">
          <ul className="flex flex-col p-4 space-y-4 text-sm font-montserrat text-gray-700">
            <Link
              to="/"
              onClick={() => setOpen(false)}
              className="hover:text-black"
            >
              Home
            </Link>
            <li className="hover:text-black cursor-pointer">Activism</li>
            <li className="hover:text-black cursor-pointer">Sports</li>
            <li className="hover:text-black cursor-pointer">Contact</li>
          </ul>
        </div>
      )}
    </header>
  );
};
