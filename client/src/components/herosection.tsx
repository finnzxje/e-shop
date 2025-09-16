import hero from "../assets/heroimage.avif";

export const HeroSection = () => {
  return (
    <section
      className="relative h-[90vh] w-full bg-cover bg-center flex items-center justify-center"
      style={{
        backgroundImage: `url(${hero})`,
      }}
    >
      <div className="absolute inset-0 bg-black/40"></div>
      <div className="relative z-10 text-center text-white px-4">
        <h1 className="text-4xl md:text-6xl font-bold mb-4">
          The Nano Puff<sup>®</sup> Redesigned
        </h1>
        <p className="text-lg md:text-xl mb-6 max-w-2xl mx-auto">
          With improved fit and performance, the new Nano Puff is your do-it-all
          jacket made better.
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <button className="px-6 py-2 bg-white text-black font-medium rounded-full hover:bg-gray-200 transition">
            Men’s
          </button>
          <button className="px-6 py-2 bg-white text-black font-medium rounded-full hover:bg-gray-200 transition">
            Women’s
          </button>
          <button className="px-6 py-2 bg-white text-black font-medium rounded-full hover:bg-gray-200 transition">
            Explore
          </button>
        </div>
      </div>
    </section>
  );
};
