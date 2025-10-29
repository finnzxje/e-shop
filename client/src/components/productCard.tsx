import { useState } from "react";
import type { Product } from "../config/interface";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { useAppProvider } from "../context/useContex";
import toast from "react-hot-toast";

interface WishlistItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  basePrice: number;
  productActive: boolean;
  addedAt: string;
}

function ProductCard({ product }: { product: Product }) {
  const { user, wishlist, addToWishlist, removeFromWishlist } =
    useAppProvider();
  const isWishlisted =
    wishlist?.some((item: WishlistItem) => item.productId === product.id) ||
    false;

  const [currentImage, setCurrentImage] = useState<string | null>(
    product.images?.[0]?.imageUrl || null
  );

  const uniqueColors = Array.from(
    new Map(product.images?.map((img) => [img.color.id, img])).values()
  );

  const toggleWishlist = async (productId: string) => {
    if (!user?.token) {
      toast.error("Please log in to add items to your wishlist.");
      return;
    }

    try {
      if (isWishlisted) {
        await removeFromWishlist(productId);
      } else {
        await addToWishlist(productId);
      }
    } catch (err) {
      console.error("Failed to update wishlist:", err);
    }
  };

  return (
    <div className="group bg-white rounded-xl relative shadow hover:shadow-lg transition-all cursor-pointer flex flex-col h-full">
      <div className="w-full h-full overflow-hidden rounded-t-xl">
        <img
          src={currentImage || "https://via.placeholder.com/300x200"}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      <button
        onClick={(e) => {
          e.preventDefault();
          toggleWishlist(product.id);
        }}
        className={`p-2 absolute top-2 right-2 rounded-full transition-all duration-300 group z-10
          ${
            isWishlisted
              ? "bg-black hover:bg-gray-800 active:bg-gray-900 shadow-lg"
              : "bg-white hover:bg-black active:bg-gray-800 border border-gray-200 hover:border-black"
          }`}
      >
        {isWishlisted ? (
          <Heart
            className="text-white cursor-pointer transform transition-all duration-300 ease-out 
                       group-hover:scale-110 group-active:scale-90"
            fill="currentColor"
            strokeWidth={1.5}
            size={20}
          />
        ) : (
          <Heart
            className="text-gray-700 group-hover:text-white cursor-pointer transform transition-all duration-200 ease-out 
                       group-hover:scale-110
                       group-active:scale-125 group-active:rotate-12"
            strokeWidth={1.5}
            size={20}
          />
        )}
      </button>

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
                className={`w-6 h-6 rounded-full border relative cursor-pointer
                  ${
                    isSelected
                      ? "ring-2 ring-offset-1 ring-blue-500"
                      : "border-gray-200"
                  }
                `}
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentImage(img.imageUrl);
                }}
                title={img.color.name}
              ></button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { ProductCard };
