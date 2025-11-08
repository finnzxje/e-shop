import { useEffect, useState } from "react";
import { useAppProvider } from "../context/useContex";
import api from "../config/axios";
import { Link, useNavigate } from "react-router-dom";
import { X } from "lucide-react";

// --- INTERFACES ---
interface Wishlists {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  basePrice: string;
  productActive: string;
  addedAt: string;
}
export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  images: ProductImage[];
  category: {
    id: number;
    name: string;
    slug: string;
  };
}
export interface ProductImage {
  id: string;
  imageUrl: string;
  altText: string;
  displayOrder: number;
  primary: boolean;
  color: Color;
  createdAt: string;
}
export interface Color {
  id: number;
  code: string;
  name: string;
  hex: string | null;
}

// --- COMPONENT CON: WishlistCard ---
interface WishlistCardProps {
  product: Product;
  onRemove: (productId: string) => void;
}

const WishlistCard = ({ product, onRemove }: WishlistCardProps) => {
  const [currentImage, setCurrentImage] = useState<string | null>(
    product.images?.[0]?.imageUrl || null
  );

  const uniqueColors = Array.from(
    new Map(product.images?.map((img) => [img.color.id, img])).values()
  );

  return (
    <div className="group bg-white rounded-xl relative shadow hover:shadow-lg transition-all flex flex-col h-full">
      {/* Nút Xóa */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove(product.id);
        }}
        className="absolute top-2 right-2 z-10 p-1.5 bg-white/70 hover:bg-white rounded-full text-gray-700 hover:text-black transition-all"
        aria-label="Remove from wishlist"
      >
        <X size={18} />
      </button>

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
};

// --- COMPONENT CHA: Wishlist ---
const Wishlist = () => {
  const { user, wishlist, removeFromWishlist } = useAppProvider();
  const navigate = useNavigate(); // Khởi tạo navigate
  const [dataWishlist, setDataWishlist] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Thêm state loading
  // Hàm fetch chi tiết sản phẩm
  const fetchImagesForProducts = async (productsData: Wishlists[]) => {
    return await Promise.all(
      productsData.map(async (p: Wishlists) => {
        try {
          const res = await api.get<Product>(
            `/api/catalog/products/${p.productSlug}`
          );
          return res.data;
        } catch (err) {
          console.error(`Failed to fetch images for ${p.productSlug}`, err);
          return null;
        }
      })
    );
  };

  // Hàm XÓA một item khỏi wishlist
  const handleRemoveItem = async (productId: string) => {
    // Chỉ cần gọi hàm toàn cục.
    // Context sẽ cập nhật 'wishlist'
    // 'useEffect' bên dưới sẽ tự động chạy lại và cập nhật 'dataWishlist'
    await removeFromWishlist(productId);
  };
  useEffect(() => {
    const fetchDetails = async () => {
      setIsLoading(true);
      if (user?.token && wishlist && wishlist.length > 0) {
        // Dùng 'wishlist' (từ context) để fetch chi tiết
        const productsWithImages = await fetchImagesForProducts(wishlist);
        const validProducts = productsWithImages.filter(
          (p): p is Product => p !== null
        );
        setDataWishlist(validProducts);
      } else {
        // Nếu không đăng nhập hoặc wishlist rỗng, xóa data chi tiết
        setDataWishlist([]);
      }
      setIsLoading(false);
    };

    fetchDetails();
  }, [user, wishlist]); // <-- *** Phụ thuộc vào 'wishlist' TOÀN CỤC ***
  if (isLoading) {
    return <div className="container mx-auto p-4">Loading...</div>; // Hoặc một spinner đẹp hơn
  }
  // --- PHẦN RENDER ---
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Your Wishlist</h1>

      {/* 1. Nếu không đăng nhập: Hiển thị thông báo nội tuyến */}
      {!user?.token && (
        <div className="flex flex-col items-center justify-center text-center p-12  rounded-lg">
          {/* Thêm icon Khóa cho trực quan */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-400 mb-4"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>

          <h2 className="text-2xl font-bold mb-4">Requires Login</h2>
          <p className="text-gray-600 mb-6">
            You need to be logged in to continue using this feature.
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => navigate("/login")}
              className="bg-black cursor-pointer hover:bg-black/80 text-white font-bold py-2 px-6 rounded-lg"
            >
              Login
            </button>
          </div>
        </div>
      )}

      {/* 2. Nếu đăng nhập VÀ wishlist có sản phẩm: Hiển thị grid */}
      {user?.token && dataWishlist.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {dataWishlist.map((product) => (
            <WishlistCard
              key={product.id}
              product={product}
              onRemove={handleRemoveItem} // Truyền hàm xóa vào
            />
          ))}
        </div>
      )}

      {/* 3. Nếu đăng nhập VÀ wishlist rỗng: Hiển thị thông báo */}
      {user?.token && dataWishlist.length === 0 && (
        <div className="flex h-[510px] flex-col items-center justify-center text-center px-12  rounded-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-400 mb-4"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>

          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Your Wishlist is Empty
          </h2>
          <p className="text-gray-500 mb-6">
            Looks like you haven't added anything to your wishlist yet.
          </p>
          <Link
            to="/all-products"
            className="bg-black hover:bg-black/80 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            Start Shopping
          </Link>
        </div>
      )}
    </div>
  );
};
export default Wishlist;
