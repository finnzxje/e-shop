import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
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
  {
    id: 4,
    name: "W's Nano-Air® Ultralight Pullover",
    price: 199,
    rating: 4,
    reviews: 3,
    image:
      "https://www.patagonia.com/dis/dw/image/v2/BGXV_PRD/on/demandware.static/-/Sites-patagonia-master/default/dw056bb8a8/images/hi-res/84155_FOX.jpg",
  },
  {
    id: 5,
    name: "W's Nano-Air® Ultralight Pullover",
    price: 199,
    rating: 4,
    reviews: 3,
    image:
      "https://www.patagonia.com/dis/dw/image/v2/BGXV_PRD/on/demandware.static/-/Sites-patagonia-master/default/dw056bb8a8/images/hi-res/84155_FOX.jpg",
  },
  {
    id: 6,
    name: "W's Nano-Air® Ultralight Pullover",
    price: 199,
    rating: 4,
    reviews: 3,
    image:
      "https://www.patagonia.com/dis/dw/image/v2/BGXV_PRD/on/demandware.static/-/Sites-patagonia-master/default/dw056bb8a8/images/hi-res/84155_FOX.jpg",
  },
];
const BestSeller = () => {
  return (
    <div className="w-full px-0 md:px-4 lg:px-8 pb-10 relative">
      <p className="text-2xl md:text-3xl px-4 font-medium">Best Sellers</p>
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
        {products.map((p, idx) => (
          <SwiperSlide key={idx}>
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
export default BestSeller;
