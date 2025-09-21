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
    title: "We Are Not Political Pawns.",
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
  const styles = {
    sectionTitle: {
      fontFamily: '"Playfair Display", serif',
    },
    storyTitle: {
      fontFamily: '"Playfair Display", serif',
    },
    storyCard: {
      fontFamily: '"Inter", sans-serif',
    },
  };

  return (
    <>
      {/* Import Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <section className="max-w-full mx-auto px-6 md:px-12 lg:px-16 py-16 bg-gray-50">
        {/* Header */}
        <div className="text-center mb-12">
          <h2
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-4"
            style={styles.sectionTitle}
          >
            Latest Stories
          </h2>
          <div className="w-20 h-1 bg-gray-900 mx-auto mb-6"></div>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto mb-8">
            Discover inspiring tales and insights from our community of
            adventurers, innovators, and changemakers.
          </p>
        </div>

        {/* Carousel */}
        <div className="relative">
          <Swiper
            modules={[Navigation]}
            navigation={{
              prevEl: ".custom-prev",
              nextEl: ".custom-next",
            }}
            spaceBetween={24}
            slidesPerView={1}
            breakpoints={{
              640: { slidesPerView: 2, spaceBetween: 20 },
              1024: { slidesPerView: 3, spaceBetween: 24 },
              1280: { slidesPerView: 4, spaceBetween: 28 },
            }}
            className="pb-4"
          >
            {stories.map((story, idx) => (
              <SwiperSlide key={idx}>
                <div className="group cursor-pointer" style={styles.storyCard}>
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 flex flex-col h-full">
                    {/* Image */}
                    <div className="w-full h-48 md:h-56 lg:h-64 overflow-hidden bg-gray-100">
                      <img
                        src={story.image}
                        alt={story.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>

                    {/* Content */}
                    <div className="p-6 flex flex-col justify-between flex-1">
                      <div>
                        <h3
                          className="text-lg font-semibold text-gray-900 mb-3 leading-tight group-hover:text-black transition-colors duration-300"
                          style={styles.storyTitle}
                        >
                          {story.title}
                        </h3>
                        <p className="text-sm font-medium text-gray-600 mb-4">
                          By {story.author}
                        </p>
                      </div>

                      {/* Read Time */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <span className="text-sm text-gray-500 font-medium">
                          {story.time}
                        </span>
                        <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-900 hover:text-white transition-all duration-300 transform hover:scale-105">
                          Read More
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Navigation Buttons */}
          <div className="custom-prev absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white border border-gray-200 rounded-full shadow-sm flex items-center justify-center cursor-pointer z-10 hover:bg-gray-900 hover:text-white hover:shadow-lg hover:scale-110 transition-all duration-300 group">
            <ChevronLeft
              size={20}
              className="text-gray-700 group-hover:text-white transition-colors duration-300"
            />
          </div>
          <div className="custom-next absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white border border-gray-200 rounded-full shadow-sm flex items-center justify-center cursor-pointer z-10 hover:bg-gray-900 hover:text-white hover:shadow-lg hover:scale-110 transition-all duration-300 group">
            <ChevronRight
              size={20}
              className="text-gray-700 group-hover:text-white transition-colors duration-300"
            />
          </div>
        </div>
      </section>
    </>
  );
};
