import { useState } from "react";
import type { Product } from "../config/interface";
import { Link } from "react-router-dom";

function ProductCard({ product }: { product: Product }) {
  const [currentImage, setCurrentImage] = useState<string | null>(
    product.images?.[0]?.imageUrl || null
  );

  const uniqueColors = Array.from(
    new Map(product.images?.map((img) => [img.color.id, img])).values()
  );

  return (
    <div className="group bg-white rounded-xl shadow hover:shadow-lg transition-all cursor-pointer flex flex-col h-full">
      <div className="w-full h-full overflow-hidden rounded-t-xl">
        <img
          src={currentImage || "https://via.placeholder.com/300x200"}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="p-4 flex flex-col flex-1 space-y-2">
        <Link to={`/products/${product.slug}`}>
          <h3 className="text-gray-800 font-medium group-hover:underline text-[15px] line-clamp-2">
            {product.name}
          </h3>
        </Link>
        <p className="text-gray-900 font-semibold">${product.basePrice}</p>
        <p className="text-sm text-gray-500">{product.category?.name}</p>

        {/* Màu */}
        <div className="flex gap-2 mt-2">
          {uniqueColors.map((img) => {
            const isSelected = currentImage === img.imageUrl;
            return (
              <button
                key={img.id}
                style={{ backgroundColor: img.color.hex || img.color.code }}
                className="w-6 h-6 rounded-full border relative cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentImage(img.imageUrl);
                }}
              >
                {isSelected && (
                  <span className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { ProductCard };
