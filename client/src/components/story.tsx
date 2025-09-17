import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import { ChevronLeft, ChevronRight } from "lucide-react";
import zina from "../assets/zina.jpg";
import yvon from "../assets/yvon.jpg";
import ryan from "../assets/ryan.jpg";
import microbeta from "../assets/microbeta.jpg";
import luke from "../assets/luke.jpg";
const stories = [
  {
    title: "A Letter from Yvon Chouinard",
    author: "Yvon Chouinard",
    time: "2 min Read",
    image: yvon,
  },
  {
    title: "“We Are Not Political Pawns.”",
    author: "Zina Rodriguez",
    time: "12 min Read",
    image: zina,
  },
  {
    title: "The Extinction of Dave Rastovich",
    author: "Derek Hynd",
    time: "9 min Read",
    image: ryan,
  },
  {
    title: "Microbeta",
    author: "Patagonia",
    time: "2 min Read",
    image: microbeta,
  },
  {
    title: "The Last Nomads",
    author: "Luke Griffin",
    time: "7 min Read",
    image: luke,
  },
];

export const LatestStories = () => {
  return (
    <section className="max-w-full mx-auto px-6 md:px-12 lg:px-16 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl md:text-3xl font-bold">Latest Stories</h2>
        <a
          href="#"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          View All
        </a>
      </div>

      {/* Carousel */}
      <div className="relative">
        <Swiper
          modules={[Navigation]}
          navigation={{
            prevEl: ".custom-prev",
            nextEl: ".custom-next",
          }}
          spaceBetween={20}
          slidesPerView={1}
          breakpoints={{
            640: { slidesPerView: 2 },
            1024: { slidesPerView: 3 },
            1280: { slidesPerView: 4 },
          }}
        >
          {stories.map((story, idx) => (
            <SwiperSlide key={idx}>
              <div className="bg-gray-50 rounded-xl overflow-hidden shadow hover:shadow-lg transition flex flex-col h-full">
                {/* Image */}
                <div className="w-full h-48 md:h-56 lg:h-64 overflow-hidden">
                  <img
                    src={story.image}
                    alt={story.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col justify-between flex-1">
                  <div className="h-[100px]">
                    <h3 className="text-xl font-medium text-gray-900 mb-2">
                      {story.title}
                    </h3>
                    <p className="text-sm font-semibold text-gray-700">
                      {story.author}
                    </p>
                  </div>
                  <button className="mt-6 self-start px-4 py-2 bg-gray-200 rounded-full text-sm font-medium hover:bg-gray-300 transition">
                    {story.time}
                  </button>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Custom Nav Buttons */}
        <div className="custom-prev absolute left-0 top-1/2 -translate-y-1/2 bg-white text-black w-12 h-12 rounded-full shadow flex items-center justify-center cursor-pointer z-10">
          <ChevronLeft size={28} strokeWidth={2.5} />
        </div>
        <div className="custom-next absolute right-0 top-1/2 -translate-y-1/2 bg-white text-black w-12 h-12 rounded-full shadow flex items-center justify-center cursor-pointer z-10">
          <ChevronRight size={28} strokeWidth={2.5} />
        </div>
      </div>
    </section>
  );
};
