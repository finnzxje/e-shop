import { useState } from "react";
import { User, ShoppingBag, Menu, X, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { useAppProvider } from "../context/useContex";
import profile from "../assets/profile_icon.png";
import toast from "react-hot-toast";

export const Header = () => {
  const [open, setOpen] = useState(false);
  const { user, setUser } = useAppProvider();
  const { cart, setCart } = useAppProvider();

  const handleLogout = () => {
    setUser(null);
    setCart(null);
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    toast.success("Logout success!");
  };

  return (
    <header className="flex items-center justify-between px-6 md:px-16 lg:px-24 xl:px-32 py-4 border-b border-gray-200 bg-white shadow-sm relative">
      {/* Logo */}
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
      {/* Icons */}
      <div className="flex items-center gap-6">
        {!user ? (
          <Link to="/login">
            <User className="cursor-pointer hover:text-black text-2xl" />
          </Link>
        ) : (
          <div className="relative group">
            <img src={profile} alt="profile" className="w-10" />
            <ul className="hidden group-hover:block absolute top-10 right-0 bg-white border border-gray-200 shadow w-30 z-40 rounded-md py-2.5 text-sm">
              <li className="p-1.5 pl-3 hover:bg-primary/10 cursor-pointer">
                My Orders
              </li>
              <li
                onClick={handleLogout}
                className="p-1.5 pl-3 hover:bg-primary/10 cursor-pointer"
              >
                Logout
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
