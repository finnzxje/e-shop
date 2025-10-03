import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../config/axios";
import { useSearchParams } from "react-router-dom";
import type { Product, Category } from "../config/interface";
export default function ProductPage() {
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get("category");
  const genderParam = searchParams.get("gender");
  const [openFilters, setFileters] = useState<boolean[]>([false, false]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  // ✅ filter state
  const [selectedGender, setSelectedGender] = useState<string | null>(
    genderParam || null
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    categoryParam || null
  );

  // ✅ pagination state
  const [page, setPage] = useState(0);
  const [size] = useState(20);
  const [totalPages, setTotalPages] = useState(0);

  const toggleFilter = (index: number) => {
    setFileters((pre) => {
      const updated = [...pre];
      updated[index] = !updated[index];
      return updated;
    });
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // ✅ Base URL với filter API mới
      let url = `/api/catalog/products/filter?page=${page}&size=${size}`;

      // ✅ Thêm query nếu có filter
      if (selectedGender) {
        url += `&gender=${selectedGender}`;
      }
      if (selectedCategory) {
        url += `&category=${selectedCategory}`;
      }

      const res = await api.get(url);
      const productsData = res.data.content || res.data;

      // ✅ Lấy categories 1 lần (có thể để useEffect riêng)
      const resCategory = await api.get("/api/catalog/categories");
      setCategories(resCategory.data || []);

      // ✅ Lấy ảnh cho từng sản phẩm
      const productsWithImages = await Promise.all(
        productsData.map(async (p: Product) => {
          try {
            const imgRes = await api.get(`/api/catalog/products/${p.slug}`);
            const firstImg = imgRes.data.images[0].imageUrl || null;
            return { ...p, image: firstImg };
          } catch {
            return { ...p, image: null };
          }
        })
      );

      setProducts(productsWithImages);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  };

  // fetch khi mount + khi filter thay đổi + khi phân trang thay đổi
  useEffect(() => {
    fetchProducts();
  }, [selectedGender, selectedCategory, page]);

  // reset page = 0 khi đổi filter
  useEffect(() => {
    setPage(0);
  }, [selectedGender, selectedCategory]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page, selectedGender, selectedCategory]);
  return (
    <div className="flex px-6 md:px-12 py-10 gap-10 bg-gray-50 min-h-screen">
      {/* Sidebar Filters */}
      <aside className="w-64 hidden md:block space-y-6 bg-white p-4 rounded-xl shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 border-b pb-3">
          Filters
        </h2>

        {/* Gender filter */}
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
              {["mens", "womens"].map((opt, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSelectedGender(selectedGender === opt ? null : opt);
                    // setSelectedCategory(null); // reset category
                  }}
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

        {/* Category filter */}
        <div className="border-b border-gray-200">
          <div
            className="flex items-center justify-between py-3 cursor-pointer hover:text-black"
            onClick={() => toggleFilter(1)}
          >
            <span className="font-medium text-gray-700">Category</span>
            <ChevronDown
              className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${
                openFilters[1] ? "rotate-180" : ""
              }`}
            />
          </div>
          {openFilters[1] && (
            <div className="pb-3 text-sm text-gray-600 grid grid-cols-2 gap-2">
              {categories.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setSelectedCategory(
                      selectedCategory === opt.slug ? null : opt.slug
                    );
                    // setSelectedGender(null); // reset gender
                  }}
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

      {/* Product Grid */}
      <main className="flex-1">
        <h1 className="text-2xl font-bold mb-8 text-gray-800">
          Product Listing
        </h1>

        {loading ? (
          <p>Loading...</p>
        ) : products.length === 0 ? (
          <p className="text-gray-500">No products found.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map((p) => (
                <Link to={`/products/${p.slug}`} key={p.id}>
                  <div className="group bg-white rounded-xl shadow hover:shadow-lg transition-all cursor-pointer flex flex-col h-full">
                    <div className="w-full h-full overflow-hidden rounded-t-xl">
                      <img
                        src={p.image || "https://via.placeholder.com/300x200"}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-4 flex flex-col flex-1 space-y-2">
                      <h3 className="text-gray-800 font-medium group-hover:underline text-[15px] line-clamp-2">
                        {p.name}
                      </h3>
                      <p className="text-gray-900 font-semibold">
                        ${p.basePrice}
                      </p>
                      <p className="text-sm text-gray-500">{p.category.name}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* ✅ Pagination */}
            <div className="flex justify-center mt-8 space-x-3">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(p - 1, 0))}
                className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
              >
                Prev
              </button>
              <span className="px-4 py-2">
                Page {page + 1} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
