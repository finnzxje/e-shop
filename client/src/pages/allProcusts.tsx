// src/pages/ProductPage.tsx
import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../config/axios";
import type { Product, Category } from "../config/interface";
import FilterSidebar from "../components/filterSidebar";
import { Search } from "lucide-react";
import { ProductCard } from "../components/productCard";
export default function ProductPage() {
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get("category");
  const genderParam = searchParams.get("gender");

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedGender, setSelectedGender] = useState<string | null>(
    genderParam
  );
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    categoryParam
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

  const fetchImagesForProducts = async (productsData: Product[]) => {
    return await Promise.all(
      productsData.map(async (p: Product) => {
        try {
          const res = await api.get(`/api/catalog/products/${p.slug}`);
          console.log(res.data);
          const images = res.data.images || [];
          return { ...p, images };
        } catch (err) {
          console.error(`Failed to fetch images for ${p.slug}`, err);
          return { ...p, images: [] };
        }
      })
    );
  };

  const mapProductsWithFirstImage = (productsData: Product[]) =>
    productsData.map((p: Product) => ({
      ...p,
      image: p.images?.[0]?.imageUrl || null, // gắn ảnh đầu tiên
    }));

  // ======== Fetch products ========
  const fetchFilteredProducts = async () => {
    setLoading(true);
    try {
      let url = `/api/catalog/products/filter?page=${page}&size=${size}`;
      if (selectedGender) url += `&gender=${selectedGender}`;
      if (selectedCategory) url += `&category=${selectedCategory}`;
      if (selectedSize) url += `&sizes=${selectedSize}`;
      if (priceMin !== null) url += `&priceMin=${priceMin}`;
      if (priceMax !== null) url += `&priceMax=${priceMax}`;
      if (sort) url += `&sort=basePrice,${sort}`;

      const [res, resCategory] = await Promise.all([
        api.get(url),
        api.get("/api/catalog/categories"),
      ]);

      const productsData = res.data.content || res.data;
      const productsWithImages = await fetchImagesForProducts(productsData);
      setProducts(mapProductsWithFirstImage(productsWithImages));

      setCategories(resCategory.data || []);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.error("Error fetching filtered products:", err);
    } finally {
      setLoading(false);
    }
  };
  const fetchSearchedProducts = async () => {
    if (!searchProduct.trim()) return fetchFilteredProducts();
    setLoading(true);
    try {
      const data = await api.get(
        `/api/catalog/products/search?q=${encodeURIComponent(
          searchProduct
        )}&page=${page}&size=${size}`
      );
      const productsData = data.data.content || data.data;

      const productsWithImages = await fetchImagesForProducts(productsData);
      setProducts(mapProductsWithFirstImage(productsWithImages));
      setTotalPages(data.data.totalPages);
    } catch (err) {
      console.error("Error searching products:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(0);
    fetchSearchedProducts();
  };

  // ======== Auto fetch ========
  useEffect(() => {
    if (!searchProduct.trim()) fetchFilteredProducts();
  }, [
    selectedGender,
    selectedCategory,
    selectedSize,
    priceMin,
    priceMax,
    sort,
    page,
  ]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

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
        {/* Header + Search */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <h2 className="text-3xl font-semibold text-gray-800 tracking-tight">
            Product Listing
          </h2>

          <div className="flex items-center gap-3">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                placeholder="Search for products..."
                className="w-full pl-12 pr-4 py-2.5 text-sm border border-gray-300 rounded-full shadow-sm 
                 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 
                 transition duration-200 placeholder:text-gray-400"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-gray-800 text-white rounded-full hover:bg-gray-700 transition"
            >
              Search
            </button>
          </div>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : products.length === 0 ? (
          <p className="text-gray-500">No products found.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
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
