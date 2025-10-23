import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../config/axios";
import { useNavigate } from "react-router-dom";

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

// Gradient colors cho fallback icon
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
  const navigate = useNavigate();
  const params = new URLSearchParams();

  const handlOnclick = (slug: string) => {
    params.set("category", slug);
    navigate(`/all-products?${params.toString()}`);
  };

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
    <div className="w-full px-0 md:px-4 lg:px-8 py-14 relative bg-gray-50">
      <div className="max-w-7xl mx-auto mb-8">
        <h2 className="text-3xl lg:text-4xl font-bold text-center text-gray-900">
          Shop by Category
        </h2>
        <p className="text-center text-gray-600 mt-2">
          Discover amazing products across all categories
        </p>
      </div>

      <Swiper
        modules={[Navigation]}
        navigation={{
          nextEl: ".custom-next-cat",
          prevEl: ".custom-prev-cat",
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
            {/* Hiệu ứng hover chính nằm ở đây */}
            <div
              className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 h-full transform hover:-translate-y-1 cursor-pointer"
              onClick={() => handlOnclick(cat.slug)}
            >
              {cat.image ? (
                <div className="w-full h-48 overflow-hidden">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ) : (
                <div className="p-6 pb-0">
                  {/* === ĐÃ THÊM group-hover:scale-110 VÀO ĐÂY === */}
                  <div
                    className={`w-16 h-16 rounded-xl bg-gradient-to-br ${
                      gradients[index % gradients.length]
                    } flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}
                  >
                    <span className="text-3xl font-bold text-white">
                      {cat.name.charAt(0)}
                    </span>
                  </div>
                </div>
              )}

              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  {cat.name}
                </h3>
                <span className="text-sm font-semibold text-blue-600 group-hover:text-blue-700 transition-colors duration-200">
                  Shop Now &rarr;
                </span>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Nút điều hướng */}
      <div className="custom-prev-cat absolute left-2 top-1/2 -translate-y-1/2 bg-white text-gray-700 w-10 h-10 rounded-full shadow-md flex items-center justify-center cursor-pointer z-20 hover:bg-gray-100 transition-all border border-gray-200">
        <ChevronLeft size={24} strokeWidth={2.5} />
      </div>
      <div className="custom-next-cat absolute right-2 top-1/2 -translate-y-1/2 bg-white text-gray-700 w-10 h-10 rounded-full shadow-md flex items-center justify-center cursor-pointer z-20 hover:bg-gray-100 transition-all border border-gray-200">
        <ChevronRight size={24} strokeWidth={2.5} />
      </div>
    </div>
  );
};
