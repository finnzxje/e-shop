export const Enviroment = () => {
  return (
    <section
      className="relative h-[90vh] w-full bg-cover bg-center flex items-center justify-center"
      style={{
        backgroundImage:
          "url('https://www.patagonia.com/dw/image/v2/bdjb_PRD/on/demandware.static/-/Library-Sites-PatagoniaShared/default/dwe10324f8/category/hero/Homepage_Hero_Footprint-oberly_keri_00214_cc_WEB.jpg?q=70&sw=2000&')",
      }}
    >
      <div className="absolute inset-0 bg-black/40"></div>
      <div className="relative z-10 text-center text-white px-4">
        <h1 className="text-4xl md:text-6xl font-bold mb-4">
          Making clothes causes harm.
        </h1>
        <p className="text-lg md:text-xl mb-6 max-w-2xl mx-auto">
          We work relentlessly to reduce our impact by using recycled and
          organic materials, and Fair Trade Certified™ factories whenever
          possible.
        </p>
      </div>
    </section>
  );
};
