import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../config/axios";

interface Category {
  id: number;
  name: string;
  slug: string;
  displayOrder: number;
  active: boolean;
  parentCategoryId: number | null;
  createdAt: string;
  image?: string;
}

// Gradient colors cho từng category
const gradients = [
  "from-purple-500 via-pink-500 to-red-500",
  "from-blue-500 via-cyan-500 to-teal-500",
  "from-yellow-500 via-orange-500 to-red-500",
  "from-green-500 via-emerald-500 to-teal-500",
  "from-indigo-500 via-purple-500 to-pink-500",
  "from-red-500 via-rose-500 to-pink-500",
  "from-cyan-500 via-blue-500 to-indigo-500",
  "from-amber-500 via-orange-500 to-red-500",
];

export const CategoryCarousel = () => {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const data: any = await api.get("/api/catalog/categories/common");
        setCategories(data.data);
      } catch (error: any) {
        console.log(error.response?.data?.message || error.message);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="w-full px-0 md:px-4 lg:px-8 py-14 relative bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto mb-8">
        <h2 className="text-4xl font-bold text-center bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Shop by Category
        </h2>
        <p className="text-center text-gray-600 mt-2">
          Discover amazing products across all categories
        </p>
      </div>

      <Swiper
        modules={[Navigation]}
        navigation={{
          nextEl: ".custom-next",
          prevEl: ".custom-prev",
        }}
        spaceBetween={20}
        slidesPerView={1}
        breakpoints={{
          640: { slidesPerView: 2 },
          768: { slidesPerView: 3 },
          1024: { slidesPerView: 4 },
        }}
        className="!px-4 !py-4"
      >
        {categories.map((cat, index) => (
          <SwiperSlide key={cat.id}>
            <div className="group relative flex flex-col items-start bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 h-full transform hover:-translate-y-2">
              {/* Gradient Background */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${
                  gradients[index % gradients.length]
                } opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
              ></div>

              {/* Animated circles */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full opacity-20 group-hover:scale-150 transition-transform duration-700"></div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full opacity-20 group-hover:scale-150 transition-transform duration-700"></div>

              {/* Content */}
              <div className="relative z-10 p-6 flex flex-col gap-4 w-full h-full justify-between">
                {/* Icon placeholder with gradient */}
                <div
                  className={`w-16 h-16 rounded-xl bg-gradient-to-br ${
                    gradients[index % gradients.length]
                  } flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}
                >
                  <span className="text-3xl font-bold text-white">
                    {cat.name.charAt(0)}
                  </span>
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-gray-800 group-hover:text-white transition-colors duration-300 mb-1">
                    {cat.name}
                  </h3>
                  <p className="text-sm text-gray-500 group-hover:text-white/80 transition-colors duration-300">
                    Explore collection
                  </p>
                </div>

                <button className="relative overflow-hidden bg-black text-white px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 group-hover:bg-white group-hover:text-black shadow-lg group-hover:shadow-xl transform group-hover:scale-105">
                  <span className="relative z-10">Shop Now</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
              </div>

              {/* Shine effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shine"></div>
              </div>
            </div>
          </SwiperSlide>
        ))}

        {/* Navigation buttons */}
        <div className="custom-prev absolute left-2 top-1/2 -translate-y-1/2 bg-white text-black w-14 h-14 rounded-full shadow-xl flex items-center justify-center cursor-pointer z-20 hover:scale-110 hover:bg-gradient-to-br hover:from-purple-500 hover:to-pink-500 hover:text-white transition-all duration-300 border-2 border-gray-100">
          <ChevronLeft size={28} strokeWidth={2.5} />
        </div>
        <div className="custom-next absolute right-2 top-1/2 -translate-y-1/2 bg-white text-black w-14 h-14 rounded-full shadow-xl flex items-center justify-center cursor-pointer z-20 hover:scale-110 hover:bg-gradient-to-br hover:from-purple-500 hover:to-pink-500 hover:text-white transition-all duration-300 border-2 border-gray-100">
          <ChevronRight size={28} strokeWidth={2.5} />
        </div>
      </Swiper>

      <style>{`
        @keyframes shine {
          0% { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(200%) skewX(-12deg); }
        }
        .animate-shine {
          animation: shine 2s infinite;
        }
      `}</style>
    </div>
  );
};
