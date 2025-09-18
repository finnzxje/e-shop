import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";

const filters = [
  { title: "Category", options: ["Men", "Women"] },
  { title: "Size", options: ["S", "M", "L", "XL"] },
  { title: "Color", options: ["Red", "Blue", "Black"] },
];

const products = [
  {
    id: 1,
    name: "W's Hampi Rock Pants - Regular",
    price: 99,
    rating: 4.5,
    reviews: 32,
    image:
      "https://www.patagonia.com/dw/image/v2/BDJB_PRD/on/demandware.static/-/Sites-patagonia-master/default/dw37db6eff/images/hi-res/25528_RVGN_STH1.jpg?sw=768&sh=768&sfrm=png&q=95&bgcolor=f3f4ef",
  },
  {
    id: 2,
    name: "W's Capilene® Cool Daily Graphic Shirt - Lands",
    price: 55,
    rating: 5,
    reviews: 23,
    image:
      "https://www.patagonia.com/dw/image/v2/BDJB_PRD/on/demandware.static/-/Sites-patagonia-master/default/dw4ab40198/images/hi-res/85241_SMDB.jpg?sw=256&sh=256&sfrm=png&q=95&bgcolor=f3f4ef",
  },
  {
    id: 3,
    name: "W's Nano-Air® Ultralight Pullover",
    price: 199,
    rating: 4,
    reviews: 3,
    image:
      "https://www.patagonia.com/dis/dw/image/v2/BGXV_PRD/on/demandware.static/-/Sites-patagonia-master/default/dw056bb8a8/images/hi-res/84155_FOX.jpg",
  },
];

export default function ProductPage() {
  const [openFilters, setFileters] = useState<boolean[]>(
    Array(filters.length).fill(false)
  );

  const toggleFilter = (index: number) => {
    setFileters((pre) => {
      const updated = [...pre];
      updated[index] = !updated[index];
      return updated;
    });
  };

  return (
    <div className="flex px-6 md:px-12 py-10 gap-10 bg-gray-50 min-h-screen">
      {/* Sidebar Filters */}
      <aside className="w-64 hidden md:block space-y-6 bg-white p-4 rounded-xl shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 border-b pb-3">
          Filters
        </h2>
        {filters.map((filter, index) => (
          <div key={index} className="border-b border-gray-200 last:border-0">
            {/* Header */}
            <div
              className="flex items-center justify-between py-3 cursor-pointer hover:text-black"
              onClick={() => toggleFilter(index)}
            >
              <span className="font-medium text-gray-700">{filter.title}</span>
              <ChevronDown
                className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${
                  openFilters[index] ? "rotate-180" : ""
                }`}
              />
            </div>
            {/* Dropdown content */}
            {openFilters[index] && (
              <div className="pb-3 text-sm text-gray-600 grid grid-cols-2 gap-2">
                {filter.options.map((opt, i) => (
                  <button
                    key={i}
                    className="cursor-pointer bg-gray-100 py-2 rounded-full text-gray-700 hover:text-black hover:bg-gray-200 transition"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </aside>

      {/* Product Grid */}
      <main className="flex-1">
        <h1 className="text-2xl font-bold mb-8 text-gray-800">
          Women&apos;s Climbing Clothing
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((p) => (
            <Link to={`/products/${p.id}`} key={p.id}>
              <div className="group bg-white p-4 rounded-xl shadow hover:shadow-lg transition-all cursor-pointer space-y-3">
                {/* Image */}
                <div className="relative w-full bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-full h-[300px] object-contain group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* Name + Price */}
                <h3 className="text-gray-800 font-medium group-hover:underline text-[15px]">
                  {p.name}
                </h3>
                <p className="text-gray-900 font-semibold">${p.price}</p>

                {/* Rating */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-yellow-500">
                    {"★".repeat(Math.floor(p.rating))}
                    {"☆".repeat(5 - Math.floor(p.rating))}
                  </span>
                  <span className="text-gray-500">({p.reviews})</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
