import hero from "../assets/heroimage.avif";
export const HeroSection = () => {
  return (
    <section className="relative min-h-screen w-full overflow-hidden py-5">
      {/* Background Image with Parallax Effect */}
      <div
        className="absolute inset-0 bg-cover bg-center transform scale-105 transition-transform duration-1000 ease-out"
        style={{
          backgroundImage: `url(${hero})`,
        }}
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/70" />

      {/* Animated Background Elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse" />
      <div className="absolute bottom-40 right-20 w-24 h-24 bg-blue-400/20 rounded-full blur-lg animate-bounce delay-1000" />

      {/* Main Content */}
      <div className="relative h-full flex items-center justify-center text-center text-white px-6">
        <div
          className="max-w-4xl mx-auto space-y-8 opacity-0 translate-y-5 animate-pulse"
          style={{ animation: "fadeInUp 0.8s ease-out forwards" }}
        >
          {/* Main Heading */}
          <h1
            className="text-5xl md:text-7xl lg:text-8xl font-extrabold leading-tight opacity-0 translate-y-6 animate-pulse"
            style={{ animation: "slideUp 0.8s ease-out 0.1s forwards" }}
          >
            <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
              The Nano Puff
            </span>
            <sup className="text-2xl md:text-3xl text-blue-400">®</sup>
            <br />
            <span className="text-4xl md:text-5xl lg:text-6xl bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent font-bold">
              Redesigned
            </span>
          </h1>

          {/* Subtitle */}
          <p
            className="text-lg md:text-2xl lg:text-3xl mb-8 max-w-3xl mx-auto font-light leading-relaxed text-gray-200 opacity-0 translate-y-4 animate-pulse"
            style={{ animation: "fadeIn 0.8s ease-out 0.2s forwards" }}
          >
            With improved fit and performance, the new Nano Puff is your
            <span className="text-yellow-300 font-semibold">
              {" "}
              do-it-all jacket
            </span>{" "}
            made better.
          </p>

          {/* Enhanced Buttons */}
          <div
            className="flex flex-wrap justify-center gap-6 opacity-0 translate-y-6 animate-pulse"
            style={{ animation: "slideUp 0.8s ease-out 0.3s forwards" }}
          >
            <button className="group relative px-8 py-4 bg-white text-black font-bold rounded-full overflow-hidden transition-all duration-300 hover:scale-110 hover:shadow-2xl transform">
              <span className="relative z-10">Shop Men's</span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <span className="absolute inset-0 z-10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-bold">
                Shop Men's
              </span>
            </button>

            <button className="group relative px-8 py-4 bg-white text-black font-bold rounded-full overflow-hidden transition-all duration-300 hover:scale-110 hover:shadow-2xl transform">
              <span className="relative z-10">Shop Women's</span>
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <span className="absolute inset-0 z-10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-bold">
                Shop Women's
              </span>
            </button>

            <button className="group relative px-8 py-4 bg-transparent border-2 border-white text-white font-bold rounded-full overflow-hidden transition-all duration-300 hover:scale-110 backdrop-blur-sm">
              <span className="relative z-10 group-hover:text-black transition-colors duration-300">
                Explore Collection
              </span>
              <div className="absolute inset-0 bg-white transform -translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            </button>
          </div>
        </div>
      </div>

      {/* Add inline styles for custom animations */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `,
        }}
      />
    </section>
  );
};
