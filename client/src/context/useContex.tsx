import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import api from "../config/axios";
import type { Cart } from "../config/interface";
// --- TÍCH HỢP (1): IMPORT CÁC HÀM SESSION ---
import { linkSessionToUser } from "../services/trackingService";
import { clearSessionId } from "../utils/sessionManager";

interface User {
  email: string;
  firstName: string;
  lastName: string;
  token: string;
  refreshToken: string;
  roles: string[];
}
interface WishlistItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  basePrice: number;
  productActive: boolean;
  addedAt: string;
}

export const AppContext = createContext<any>(null);
export const AppContextProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<Cart | null>(null);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);

  // --- TÍCH HỢP (2): TẠO HÀM DỌN DẸP DỮ LIỆU ---
  // Hàm nội bộ để dọn dẹp state và localStorage, bao gồm cả session ID
  const clearUserData = () => {
    setUser(null);
    setCart(null);
    setWishlist([]);
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    clearSessionId(); // <-- Đảm bảo session ID được xóa khi đăng xuất
  };

  //Fetch User Auth Status
  const fetchTestToken = async () => {
    const savedUser = localStorage.getItem("user");
    if (!savedUser) {
      clearUserData(); // Dùng hàm dọn dẹp
      return;
    }
    const parsedUser: any = JSON.parse(savedUser);
    try {
      const authUser: any = await api.get("/api/auth/test-token", {
        headers: { Authorization: `Bearer ${parsedUser.token}` },
      });
      if (authUser.data.authenticated) {
        setUser(parsedUser); // <-- Sẽ kích hoạt useEffect bên dưới
        localStorage.setItem("accessToken", parsedUser.token);
      } else {
        clearUserData(); // Dùng hàm dọn dẹp nếu token không hợp lệ
      }
    } catch (error: any) {
      console.log(error.message);
      clearUserData(); // Dùng hàm dọn dẹp nếu API lỗi
    }
  };

  const fetchCart = async () => {
    try {
      const response = await api.get("/api/cart", {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      setCart(response.data);
    } catch (error) {
      console.error("Error fetching cart:", error);
    }
  };

  const fetchWishlist = async () => {
    try {
      const response = await api.get<WishlistItem[]>(`/api/account/wishlist`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      setWishlist(response.data);
    } catch (error) {
      console.log("Error fetching Wishlist:", error);
    }
  };

  useEffect(() => {
    fetchTestToken();
  }, []);

  // --- TÍCH HỢP (3): GỌI linkSessionToUser ---
  useEffect(() => {
    // Chỉ chạy khi 'user' có giá trị (đã đăng nhập)
    if (user && user.token) {
      // Tải giỏ hàng và wishlist
      fetchCart();
      fetchWishlist();

      // (QUAN TRỌNG) Gọi API để liên kết session ẩn danh với user
      linkSessionToUser(user.token);
    } else {
      // Đảm bảo dữ liệu được xóa nếu user là null
      setCart(null);
      setWishlist([]);
    }
  }, [user]); // Chạy mỗi khi user thay đổi (đăng nhập/đăng xuất)

  // Hàm đăng xuất để cung cấp cho context
  const handleLogout = () => {
    clearUserData();
  };

  const value = {
    user,
    setUser,
    cart,
    setCart,
    wishlist,
    setWishlist,
    handleLogout, // <-- Cung cấp hàm đăng xuất
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppProvider = () => {
  return useContext(AppContext);
};
