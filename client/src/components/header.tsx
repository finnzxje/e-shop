import { User, Heart, ShoppingBag, Search } from "lucide-react";

export const Header = () => {
  return (
    <header className="flex items-center justify-between px-6 md:px-16 lg:px-24 xl:px-32 py-4 border-b border-gray-200 bg-white shadow-sm">
      {/* Menu */}
      <nav>
        <ul className="flex gap-6 text-sm font-montserrat text-gray-700">
          <li className="hover:text-black cursor-pointer">Home</li>
          <li className="hover:text-black cursor-pointer">Activism</li>
          <li className="hover:text-black cursor-pointer">Sports</li>
          <li className="hover:text-black cursor-pointer">Contact</li>
        </ul>
      </nav>

      {/* Logo */}
      <div className="text-xl font-bold font-poppins tracking-wide cursor-pointer">
        patagonia
      </div>

      {/* Search + Icons */}
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
          <User className="cursor-pointer hover:text-black" />
          <ShoppingBag className="cursor-pointer hover:text-black" />
        </div>
      </div>
    </header>
  );
};
