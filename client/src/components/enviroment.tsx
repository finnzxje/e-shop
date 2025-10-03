export const Environment = () => {
  return (
    <section
      className="relative h-[90vh] w-full bg-cover bg-center flex items-center justify-center"
      style={{
        backgroundImage:
          "url('https://www.patagonia.com/dw/image/v2/bdjb_PRD/on/demandware.static/-/Library-Sites-PatagoniaShared/default/dwe10324f8/category/hero/Homepage_Hero_Footprint-oberly_keri_00214_cc_WEB.jpg?q=70&sw=2000&')",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/30"></div>{" "}
      {/* Gradient overlay for richer dark theme */}
      <div className="relative z-10 text-center text-white px-4 max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-extrabold mb-4 drop-shadow-xl animate-fade-in">
          Making Clothes Causes Harm.
        </h1>
        <p className="text-lg md:text-2xl mb-8 drop-shadow-md animate-slide-up">
          We’re fighting back with sustainable practices—using recycled and
          organic materials, and partnering with Fair Trade Certified™ factories
          to protect our planet.
        </p>
        <div className="flex justify-center gap-4">
          <a
            href="/"
            className="px-8 py-3 bg-green-900 text-white font-semibold rounded-full hover:bg-green-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            Discover Our Impact
          </a>
          <a
            href="/"
            className="px-8 py-3 bg-transparent border-2 border-white text-white font-semibold rounded-full hover:bg-white hover:text-green-900 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            Join the Movement
          </a>
        </div>
      </div>
    </section>
  );
};
