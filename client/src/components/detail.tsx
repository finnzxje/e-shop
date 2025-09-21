import { useState, useEffect } from "react";
import { X } from "lucide-react";

const product = {
  name: "Men's Better Sweater® Fleece Jacket",
  price: 159,
  reviews: 1085,
  rating: 4.5,
  description:
    "This classic fleece jacket combines warmth, comfort, and style. Made with soft, durable fabric, it’s perfect for both outdoor adventures and casual everyday wear.",
  sizes: ["XS", "S", "M", "L", "XL", "XXL", "3XL"],
  images: [
    "https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg",
    "https://images.pexels.com/photos/2850487/pexels-photo-2850487.jpeg",
    "https://images.pexels.com/photos/2060241/pexels-photo-2060241.jpeg",
  ],
};

export default function Detail() {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  // 👇 Khóa scroll khi mở modal
  useEffect(() => {
    if (zoomImage) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [zoomImage]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 px-6 py-12 bg-gray-50 min-h-screen">
      {/* Left: Product Images */}
      <div className="grid grid-cols-2 gap-4">
        {product.images.map((img, i) => (
          <div
            key={i}
            className="relative bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer hover:scale-105 transition-transform"
            onClick={() => setZoomImage(img)}
          >
            <img
              src={img}
              alt={`Product ${i}`}
              className="w-full h-[300px] object-cover"
            />
          </div>
        ))}
      </div>

      {/* Right: Product Info */}
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{product.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-yellow-500">
              {"★".repeat(Math.floor(product.rating))}
              {"☆".repeat(5 - Math.floor(product.rating))}
            </span>
            <span className="text-gray-600 text-sm">
              {product.reviews} Reviews
            </span>
          </div>
          <p className="text-2xl font-semibold mt-3 text-gray-900">
            ${product.price}
          </p>
        </div>

        {/* Description */}
        <p className="text-gray-700 leading-relaxed">{product.description}</p>

        {/* Size */}
        <div>
          <p className="font-medium text-gray-700 mb-2">Size</p>
          <div className="grid grid-cols-4 gap-2">
            {product.sizes.map((s) => (
              <button
                key={s}
                onClick={() => setSelectedSize(s)}
                className={`py-2 rounded-lg border text-sm font-medium transition-all ${
                  selectedSize === s
                    ? "border-black bg-gray-100 shadow-md"
                    : "border-gray-300 hover:border-black"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-4">
          <button className="px-10  bg-black text-white py-3 rounded-full font-semibold hover:bg-gray-800 transition-colors shadow-md">
            Add to Bag
          </button>
          <button className="px-10 bg-black text-white py-3 rounded-full font-semibold hover:bg-gray-800 transition-colors shadow-md">
            Pay
          </button>
        </div>
      </div>

      {/* Zoom Image Modal */}
      {zoomImage && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="relative bg-white rounded-xl p-4 max-w-2xl w-full">
            <button
              className="absolute top-3 right-3 p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition"
              onClick={() => setZoomImage(null)}
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
            <img
              src={zoomImage}
              alt="Zoomed"
              className="w-full h-[500px] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
