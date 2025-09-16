import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import { ChevronLeft, ChevronRight } from "lucide-react";
const categories = [
  {
    title: "Men’s",
    image:
      "https://www.patagonia.com/dw/image/v2/bdjb_PRD/on/demandware.static/-/Library-Sites-PatagoniaShared/default/dwe517fa67/routing-tile/mens-routing.jpg?q=85&sw=526&",
  },
  {
    title: "Women’s",
    image:
      "https://www.patagonia.com/dw/image/v2/bdjb_PRD/on/demandware.static/-/Library-Sites-PatagoniaShared/default/dw9235b778/routing-tile/womens-routing.jpg?q=85&sw=526&",
  },
  {
    title: "Kids’ & Baby",
    image:
      "https://www.patagonia.com/dw/image/v2/bdjb_PRD/on/demandware.static/-/Library-Sites-PatagoniaShared/default/dwee57712d/routing-tile/kids-routing.jpg?q=85&sw=526&",
  },
  {
    title: "Packs & Gear",
    image:
      "https://www.patagonia.com/dw/image/v2/bdjb_PRD/on/demandware.static/-/Library-Sites-PatagoniaShared/default/dw3ae28c23/routing-tile/packs-gear-routing.jpg?q=85&sw=526&",
  },
  {
    title: "Shoes",
    image:
      "https://www.patagonia.com/dw/image/v2/bdjb_PRD/on/demandware.static/-/Library-Sites-PatagoniaShared/default/dwfed6be73/routing-tile/books-routing.jpg?q=85&sw=526&",
  },
  {
    title: "Food",
    image:
      "https://www.patagonia.com/dw/image/v2/bdjb_PRD/on/demandware.static/-/Library-Sites-PatagoniaShared/default/dw8b032a58/routing-tile/provisions-routing.jpg?q=85&sw=526&",
  },
];

export const CategoryCarousel = () => {
  return (
    <div className="w-full px-0 md:px-4 lg:px-8 py-14 relative">
      {/* Nút prev */}
      <Swiper
        modules={[Navigation]}
        navigation={{
          nextEl: ".custom-next",
          prevEl: ".custom-prev",
        }}
        spaceBetween={15}
        slidesPerView={1}
        breakpoints={{
          640: { slidesPerView: 2 },
          768: { slidesPerView: 3 },
          1024: { slidesPerView: 4 },
        }}
        className="!px-4 !py-4"
      >
        {categories.map((cat, idx) => (
          <SwiperSlide key={idx}>
            <div className="flex flex-col items-start bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition h-full">
              {/* Ảnh */}
              <img
                src={cat.image}
                alt={cat.title}
                className="w-full h-full object-cover object-center transition-transform duration-500 hover:scale-105"
              />

              {/* Text + nút */}
              <div className="p-4 flex flex-col gap-4 ">
                <h3 className="text-lg font-semibold">{cat.title}</h3>
                <button className="bg-black text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-gray-800 transition">
                  Shop
                </button>
              </div>
            </div>
          </SwiperSlide>
        ))}
        <div className="custom-prev absolute left-2 top-1/2 -translate-y-1/2 bg-white text-black w-12 h-12 rounded-full shadow-lg flex items-center justify-center cursor-pointer z-20 hover:scale-110 transition">
          <ChevronLeft size={28} strokeWidth={2.5} />
        </div>
        <div className="custom-next absolute right-2 top-1/2 -translate-y-1/2 bg-white text-black w-12 h-12 rounded-full shadow flex items-center justify-center cursor-pointer z-20 hover:scale-110 transition">
          <ChevronRight size={28} strokeWidth={2.5} />
        </div>
      </Swiper>
    </div>
  );
};
