import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import {
  ChevronLeft,
  ChevronRight,
  Star,
  TrendingUp,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Product } from "../config/interface";
import api from "../config/axios";
import { ProductCard } from "./productCard";

const BestSeller = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const data = await api.get(
          "/api/catalog/products/filter?page=2&size=12"
        );
        const productsData = data.data.content || [];

        const detailedProducts = await Promise.all(
          productsData.map(async (p: any) => {
            try {
              const res = await api.get<Product>(
                `/api/catalog/products/${p.slug}`
              );
              return res.data;
            } catch (err) {
              console.error(`Failed to fetch details for ${p.slug}`, err);
              return null;
            }
          })
        );

        const validProducts = detailedProducts.filter(
          (p): p is Product => p !== null
        );
        setProducts(validProducts);
      } catch (error: any) {
        console.error("Failed to fetch best sellers:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="w-full px-0 md:px-4 lg:px-8 pb-16 relative">
      {/* Enhanced Header */}
      <div className="px-4 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Sparkles className="w-8 h-8 text-yellow-500 animate-pulse" />
            <TrendingUp className="w-4 h-4 text-yellow-500 absolute -bottom-1 -right-1" />
          </div>
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-black/60 bg-clip-text">
              Best Sellers
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Top picks loved by customers
            </p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
          <span className="text-sm font-medium text-gray-700">
            Trending Now
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        </div>
      ) : (
        <Swiper
          modules={[Navigation, Autoplay]}
          navigation={{
            nextEl: ".custom-next",
            prevEl: ".custom-prev",
          }}
          autoplay={{
            delay: 3500,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          spaceBetween={20}
          slidesPerView={1}
          breakpoints={{
            640: { slidesPerView: 2 },
            768: { slidesPerView: 3 },
            1024: { slidesPerView: 4 },
          }}
          className="!px-4 !py-6"
        >
          {products.map((product) => (
            <SwiperSlide key={product.id} className="h-full">
              <ProductCard product={product} />
            </SwiperSlide>
          ))}

          {/* Custom Navigation Buttons */}
          <div className="custom-prev absolute left-0 top-1/2 -translate-y-1/2 bg-black  text-white w-12 h-12 rounded-full shadow-xl flex items-center justify-center cursor-pointer z-20 hover:scale-110 hover:shadow-2xl transition-all duration-300 hover:from-purple-700 hover:to-pink-700">
            <ChevronLeft size={24} strokeWidth={3} />
          </div>
          <div className="custom-next absolute right-0 top-1/2 -translate-y-1/2 bg-black text-white w-12 h-12 rounded-full shadow-xl flex items-center justify-center cursor-pointer z-20 hover:scale-110 hover:shadow-2xl transition-all duration-300 hover:from-pink-700 hover:to-orange-600">
            <ChevronRight size={24} strokeWidth={3} />
          </div>
        </Swiper>
      )}

      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200 rounded-full blur-3xl opacity-20 -z-10" />
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-pink-200 rounded-full blur-3xl opacity-20 -z-10" />
    </div>
  );
};

export default BestSeller;
