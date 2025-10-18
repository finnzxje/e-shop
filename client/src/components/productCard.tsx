import { useState, useEffect } from "react";
import type { Product } from "../config/interface";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import api from "../config/axios";
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
  const { user, wishlist } = useAppProvider();

  const [isWishlisted, setIsWishlisted] = useState<boolean>(() => {
    if (!wishlist || !product) return false;
    return wishlist.some((item: WishlistItem) => item.productId === product.id);
  });

  const [currentImage, setCurrentImage] = useState<string | null>(
    product.images?.[0]?.imageUrl || null
  );

  const uniqueColors = Array.from(
    new Map(product.images?.map((img) => [img.color.id, img])).values()
  );

  useEffect(() => {
    const inList =
      wishlist?.some((item: WishlistItem) => item.productId === product.id) ||
      false;
    setIsWishlisted(inList);
  }, [wishlist, product.id]);

  const toggleWishlist = async (productId: string) => {
    if (!user?.token) {
      toast.error("Please log in to add items to your wishlist.");
      return;
    }

    try {
      if (isWishlisted) {
        await api.delete(`/api/account/wishlist/${productId}`, {
          headers: { Authorization: `Bearer ${user?.token}` },
        });
      } else {
        await api.post(
          `/api/account/wishlist`,
          { productId: productId },
          {
            headers: { Authorization: `Bearer ${user?.token}` },
          }
        );
      }
      setIsWishlisted(!isWishlisted);
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
      <div className="p-4 flex flex-col flex-1 space-y-2">
        <Link to={`/products/${product.slug}`}>
          <h3 className="text-gray-800 font-medium group-hover:underline text-[15px] line-clamp-2">
            {product.name}
          </h3>
        </Link>
        <p className="text-gray-900 font-semibold">${product.basePrice}</p>
        <p className="text-sm text-gray-500">{product.category?.name}</p>

        <button
          onClick={(e) => {
            e.preventDefault();
            toggleWishlist(product.id);
          }}
          className="p-2 absolute top-0 rounded-full hover:bg-gray-100 transition-colors"
        >
          {isWishlisted ? (
            <Heart
              className="text-black cursor-pointer"
              fill="currentColor"
              strokeWidth={1.5}
            />
          ) : (
            <Heart className="text-gray-600 cursor-pointer" strokeWidth={1.5} />
          )}
        </button>
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
