// src/pages/ProductPage.tsx
import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../config/axios";
import type { Product, Category } from "../config/interface";
import FilterSidebar from "../components/filterSidebar";

export default function ProductPage() {
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get("category");
  const genderParam = searchParams.get("gender");

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedGender, setSelectedGender] = useState<string | null>(
    genderParam || null
  );
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    categoryParam || null
  );
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [priceMin, setPriceMin] = useState<number | null>(null);
  const [priceMax, setPriceMax] = useState<number | null>(null);
  const [sort, setSort] = useState<string | null>(null);
  const [searchProduct, setSearchProduct] = useState<string>("");
  // pagination
  const [page, setPage] = useState(0);
  const [size] = useState(20);
  const [totalPages, setTotalPages] = useState(0);

  // fetch data
  const fetchProducts = async () => {
    setLoading(true);
    try {
      let url = `/api/catalog/products/filter?page=${page}&size=${size}`;
      if (searchProduct) {
        url = `/api/catalog/products/search?q=${searchProduct}&page=${page}&size=${size}`;
      }
      if (selectedGender) url += `&gender=${selectedGender}`;
      if (selectedCategory) url += `&category=${selectedCategory}`;
      if (selectedSize) url += `&sizes=${selectedSize}`;
      if (priceMin !== null) url += `&priceMin=${priceMin}`;
      if (priceMax !== null) url += `&priceMax=${priceMax}`;
      if (sort) url += `&sort=basePrice,${sort}`;
      const res = await api.get(url);
      const productsData = res.data.content || res.data;
      // fetch categories
      const resCategory = await api.get("/api/catalog/categories");
      setCategories(resCategory.data || []);

      // fetch images
      const productsWithImages = await Promise.all(
        productsData.map(async (p: Product) => {
          try {
            const imgRes = await api.get(`/api/catalog/products/${p.slug}`);
            const firstImg = imgRes.data.images[0]?.imageUrl || null;
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

  useEffect(() => {
    fetchProducts();
  }, [
    selectedGender,
    selectedCategory,
    selectedSize,
    priceMin,
    priceMax,
    sort,
    searchProduct,
    page,
  ]);

  useEffect(() => {
    setPage(0);
  }, [
    selectedGender,
    selectedCategory,
    priceMin,
    priceMax,
    selectedSize,
    sort,
  ]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page, selectedGender, selectedCategory, sort]);

  return (
    <div className="flex px-6 md:px-12 py-10 gap-10 bg-gray-50 min-h-screen">
      {/* Sidebar Filters */}
      <FilterSidebar
        categories={categories}
        selectedGender={selectedGender}
        selectedCategory={selectedCategory}
        selectedSize={selectedSize}
        priceMin={priceMin}
        priceMax={priceMax}
        sort={sort}
        setSort={setSort}
        setSelectedGender={setSelectedGender}
        setSelectedCategory={setSelectedCategory}
        setSelectedSize={setSelectedSize}
        setPriceMin={setPriceMin}
        setPriceMax={setPriceMax}
      />

      {/* Product Grid */}
      <main className="flex-1">
        <h1 className="text-2xl font-bold mb-8 text-gray-800">
          Product Listing
          <input
            type="text"
            value={searchProduct}
            onChange={(e) => setSearchProduct(e.target.value)}
            placeholder="Search products..."
            className="border px-3 py-2 rounded-md w-64"
          />
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

            {/* Pagination */}
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
