import hero from "../assets/heroimage.avif";
import { useNavigate } from "react-router-dom";

export const HeroSection = () => {
  const navigate = useNavigate();
  const params = new URLSearchParams();

  const handleOnclick = (gender: string) => {
    params.set("gender", gender);
    navigate(`/all-products?${params.toString()}`);
  };

  return (
    <section className="relative min-h-screen w-full flex items-center justify-center py-20">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${hero})`,
        }}
      />

      <div className="absolute inset-0 bg-black/60" />

      <div className="relative z-10 flex flex-col items-center text-center text-white px-6">
        <h1 className="font-playfair text-6xl md:text-8xl lg:text-9xl font-bold italic">
          The Nano Puff®
        </h1>

        <p className="font-playfair text-4xl md:text-5xl font-medium mt-2">
          Redesigned
        </p>

        <p className="font-lato text-lg md:text-xl mt-6 max-w-2xl font-light text-gray-200">
          With improved fit and performance, the new Nano Puff is your do-it-all
          jacket, made better.
        </p>

        <div className="flex flex-wrap justify-center gap-4 mt-10">
          <button
            onClick={() => handleOnclick("mens")}
            className="font-lato bg-transparent text-white border-2 border-white px-8 py-3 rounded-full text-base font-semibold transition-colors hover:bg-white hover:text-black"
          >
            Shop Men's
          </button>

          <button
            onClick={() => handleOnclick("womens")}
            className="font-lato bg-transparent text-white border-2 border-white px-8 py-3 rounded-full text-base font-semibold transition-colors hover:bg-white hover:text-black"
          >
            Shop Women's
          </button>
        </div>
      </div>
    </section>
  );
};
