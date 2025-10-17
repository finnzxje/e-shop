import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import {
  ChevronLeft,
  ChevronRight,
  Star,
  TrendingUp,
  Sparkles,
} from "lucide-react";
// import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import type { Product } from "../config/interface";
import api from "../config/axios";
interface Products {
  id: string;
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  image: string;
  category: {
    id: number;
    name: string;
    slug: string;
  };
}
const BestSeller = () => {
  const [productBesSeller, setProductBesSeller] = useState<Products[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await api.get(
          "/api/catalog/products/filter?page=0&size=12"
        );
        const productsData = data.data.content || null;
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
        setProductBesSeller(productsWithImages);
      } catch (error: any) {
        console.log(error.response.data.message);
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
            <TrendingUp className="w-4 h-4 text-orange-500 absolute -bottom-1 -right-1" />
          </div>
          <div>
            <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent">
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

      {/* Swiper Carousel */}
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
        {productBesSeller.map((p, idx) => (
          <SwiperSlide key={idx}>
            <a href={`/products/${p.slug}`}>
              <div className="group bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-500 cursor-pointer flex flex-col h-full overflow-hidden border border-gray-100 hover:border-purple-200 relative">
                {/* Badge */}
                {idx < 3 && (
                  <div className="absolute top-3 left-3 z-10 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                    <Star className="w-3 h-3 fill-white" />#{idx + 1} Best
                  </div>
                )}

                {/* Image Container */}
                <div className="relative w-full aspect-square overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
                  <img
                    src={p.image || "https://via.placeholder.com/400x400"}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  {/* Quick View Button */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-4 group-hover:translate-y-0">
                    <button className="bg-white text-gray-900 px-6 py-2.5 rounded-full font-semibold text-sm shadow-lg hover:bg-gray-900 hover:text-white transition-colors">
                      Quick View
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col flex-1 space-y-3 bg-gradient-to-b from-white to-gray-50">
                  {/* Category Badge */}
                  <span className="inline-flex items-center text-xs font-medium text-purple-600 bg-purple-50 px-3 py-1 rounded-full w-fit">
                    {p.category.name}
                  </span>

                  {/* Product Name */}
                  <h3 className="text-gray-800 font-semibold group-hover:text-purple-600 text-base line-clamp-2 transition-colors min-h-[3rem]">
                    {p.name}
                  </h3>
                  {/* Price */}
                  <div className="flex items-center justify-between border-t border-gray-100">
                    <div className="flex flex-col">
                      <span className="text-2xl font-bold text-gray-900">
                        ${p.basePrice}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </a>
          </SwiperSlide>
        ))}

        {/* Custom Navigation Buttons */}
        <div className="custom-prev absolute left-0 top-1/2 -translate-y-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white w-12 h-12 rounded-full shadow-xl flex items-center justify-center cursor-pointer z-20 hover:scale-110 hover:shadow-2xl transition-all duration-300 hover:from-purple-700 hover:to-pink-700">
          <ChevronLeft size={24} strokeWidth={3} />
        </div>
        <div className="custom-next absolute right-0 top-1/2 -translate-y-1/2 bg-gradient-to-r from-pink-600 to-orange-500 text-white w-12 h-12 rounded-full shadow-xl flex items-center justify-center cursor-pointer z-20 hover:scale-110 hover:shadow-2xl transition-all duration-300 hover:from-pink-700 hover:to-orange-600">
          <ChevronRight size={24} strokeWidth={3} />
        </div>
      </Swiper>

      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200 rounded-full blur-3xl opacity-20 -z-10" />
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-pink-200 rounded-full blur-3xl opacity-20 -z-10" />
    </div>
  );
};

export default BestSeller;
