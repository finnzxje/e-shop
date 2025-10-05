// src/components/FilterSidebar.tsx
import { ChevronDown, ArrowUp, ArrowDown } from "lucide-react";
import { useState } from "react";
import type { Category } from "../config/interface";

interface FilterSidebarProps {
  categories: Category[];
  selectedGender: string | null;
  selectedCategory: string | null;
  selectedSize: string | null;
  priceMin: number | null;
  priceMax: number | null;
  sort: string | null;
  setSelectedGender: (value: string | null) => void;
  setSelectedCategory: (value: string | null) => void;
  setSelectedSize: (value: string | null) => void;
  setPriceMin: (value: number | null) => void;
  setPriceMax: (value: number | null) => void;
  setSort: (value: string | null) => void;
}
const sizes = ["XS", "S", "M", "L", "XL", "XXL"];
export default function FilterSidebar({
  categories,
  selectedGender,
  selectedCategory,
  selectedSize,
  priceMin,
  priceMax,
  sort,
  setSelectedGender,
  setSelectedCategory,
  setSelectedSize,
  setPriceMin,
  setPriceMax,
  setSort,
}: FilterSidebarProps) {
  const [openFilters, setFilters] = useState<boolean[]>([
    false,
    false,
    false,
    false,
    false,
  ]);

  const toggleFilter = (index: number) => {
    setFilters((pre) => {
      const updated = [...pre];
      updated[index] = !updated[index];
      return updated;
    });
  };

  return (
    <aside className="w-64 hidden md:block space-y-6 bg-white p-4 rounded-xl shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800 border-b pb-3">
        Filters
      </h2>

      {/* Gender Filter */}
      <div className="border-b border-gray-200">
        <div
          className="flex items-center justify-between py-3 cursor-pointer hover:text-black"
          onClick={() => toggleFilter(0)}
        >
          <span className="font-medium text-gray-700">Gender</span>
          <ChevronDown
            className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${
              openFilters[0] ? "rotate-180" : ""
            }`}
          />
        </div>
        {openFilters[0] && (
          <div className="pb-3 text-sm text-gray-600 grid grid-cols-2 gap-2">
            {["mens", "womens"].map((opt) => (
              <button
                key={opt}
                onClick={() =>
                  setSelectedGender(selectedGender === opt ? null : opt)
                }
                className={`cursor-pointer py-2 rounded-full text-gray-700 transition ${
                  selectedGender === opt
                    ? "bg-black text-white"
                    : "bg-gray-100 hover:text-black hover:bg-gray-200"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
      {/* {Sort Filter } */}
      <div className="border-b border-gray-200">
        <div
          className="flex items-center justify-between py-3 cursor-pointer hover:text-black"
          onClick={() => toggleFilter(4)}
        >
          <span className="font-medium text-gray-700">Sort price</span>
          <ChevronDown
            className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${
              openFilters[4] ? "rotate-180" : ""
            }`}
          />
        </div>
        {openFilters[4] && (
          <div className="pb-3 text-sm text-gray-600 grid grid-cols-2 gap-2">
            <button
              onClick={() => setSort(sort === "asc" ? null : "asc")}
              className={`cursor-pointer py-2 rounded-full text-gray-700 transition ${
                sort === "asc"
                  ? "bg-black text-white"
                  : "bg-gray-100 hover:text-black hover:bg-gray-200"
              }`}
            >
              <ArrowUp className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={() => setSort(sort === "desc" ? null : "desc")}
              className={`cursor-pointer py-2 rounded-full text-gray-700 transition ${
                sort === "desc"
                  ? "bg-black text-white"
                  : "bg-gray-100 hover:text-black hover:bg-gray-200"
              }`}
            >
              <ArrowDown className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        )}
      </div>
      {/* Size Filter */}
      <div className="border-b border-gray-200">
        <div
          className="flex items-center justify-between py-3 cursor-pointer hover:text-black"
          onClick={() => toggleFilter(1)}
        >
          <span className="font-medium text-gray-700">Size</span>
          <ChevronDown
            className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${
              openFilters[1] ? "rotate-180" : ""
            }`}
          />
        </div>
        {openFilters[1] && (
          <div className="pb-3 text-sm text-gray-600 grid grid-cols-2 gap-2">
            {sizes.map((opt) => (
              <button
                key={opt}
                onClick={() =>
                  setSelectedSize(selectedSize === opt ? null : opt)
                }
                className={`cursor-pointer py-2 rounded-full text-gray-700 transition ${
                  selectedSize === opt
                    ? "bg-black text-white"
                    : "bg-gray-100 hover:text-black hover:bg-gray-200"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
      {/* Price Filter */}
      <div className="border-b border-gray-200">
        <div
          className="flex items-center justify-between py-3 cursor-pointer hover:text-black"
          onClick={() => toggleFilter(2)}
        >
          <span className="font-medium text-gray-700">Price</span>
          <ChevronDown
            className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${
              openFilters[2] ? "rotate-180" : ""
            }`}
          />
        </div>
        {openFilters[2] && (
          <div className="pb-3 text-sm text-gray-600 space-y-3">
            <div className="flex items-center gap-2">
              <label className="text-sm w-20">Min</label>
              <input
                type="number"
                value={priceMin ?? ""}
                onChange={(e) =>
                  setPriceMin(e.target.value ? Number(e.target.value) : null)
                }
                className="border rounded-md px-2 py-1 w-24"
                placeholder="0"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm w-20">Max</label>
              <input
                type="number"
                value={priceMax ?? ""}
                onChange={(e) =>
                  setPriceMax(e.target.value ? Number(e.target.value) : null)
                }
                className="border rounded-md px-2 py-1 w-24"
                placeholder="1000"
              />
            </div>
          </div>
        )}
      </div>
      {/* Category Filter */}
      <div className="border-b border-gray-200">
        <div
          className="flex items-center justify-between py-3 cursor-pointer hover:text-black"
          onClick={() => toggleFilter(3)}
        >
          <span className="font-medium text-gray-700">Category</span>
          <ChevronDown
            className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${
              openFilters[3] ? "rotate-180" : ""
            }`}
          />
        </div>
        {openFilters[3] && (
          <div className="pb-3 text-sm text-gray-600 grid grid-cols-2 gap-2">
            {categories.map((opt) => (
              <button
                key={opt.id}
                onClick={() =>
                  setSelectedCategory(
                    selectedCategory === opt.slug ? null : opt.slug
                  )
                }
                className={`cursor-pointer py-2 rounded-full text-gray-700 transition ${
                  selectedCategory === opt.slug
                    ? "bg-black text-white"
                    : "bg-gray-100 hover:text-black hover:bg-gray-200"
                }`}
              >
                {opt.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
