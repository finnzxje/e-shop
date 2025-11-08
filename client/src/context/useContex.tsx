import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import api from "../config/axios";
import type { Cart } from "../config/interface";
import { linkSessionToUser } from "../services/trackingService";
import { clearSessionId } from "../utils/sessionManager";
import toast from "react-hot-toast";

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

  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const clearUserData = () => {
    setUser(null);
    setCart(null);
    setWishlist([]);
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    clearSessionId();
  };

  const fetchTestToken = async () => {
    try {
      const savedUser = localStorage.getItem("user");
      if (!savedUser) {
        clearUserData();
        return;
      }
      const parsedUser: any = JSON.parse(savedUser);
      const authUser: any = await api.get("/api/auth/test-token", {
        headers: { Authorization: `Bearer ${parsedUser.token}` },
      });
      if (authUser.data.authenticated) {
        setUser(parsedUser);
        localStorage.setItem("accessToken", parsedUser.token);
      } else {
        clearUserData();
      }
    } catch (error: any) {
      console.log(error.message);
      clearUserData();
    } finally {
      setIsAuthLoading(false);
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
    if (!user?.token) return;
    try {
      const response = await api.get<WishlistItem[]>(`/api/account/wishlist`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      setWishlist(response.data);
    } catch (error) {
      console.log("Error fetching Wishlist:", error);
    }
  };

  const removeFromWishlist = async (productId: string) => {
    if (!user?.token) return;
    try {
      await api.delete(`/api/account/wishlist/${productId}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setWishlist((prev) =>
        prev.filter((item) => item.productId !== productId)
      );
      toast.success("Removed from wishlist");
    } catch (err) {
      console.error("Failed to remove from wishlist:", err);
      toast.error("Failed to remove item.");
    }
  };

  const addToWishlist = async (productId: string) => {
    if (!user?.token) {
      toast.error("Please log in.");
      return;
    }
    try {
      const response = await api.post<WishlistItem>(
        `/api/account/wishlist`,
        { productId: productId },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setWishlist((prev) => [...prev, response.data]);
      toast.success("Added to wishlist");
    } catch (err) {
      console.error("Failed to add to wishlist:", err);
      toast.error("Failed to add item.");
    }
  };
  useEffect(() => {
    fetchTestToken();
  }, []);

  useEffect(() => {
    if (user && user.token) {
      fetchCart();
      fetchWishlist();

      linkSessionToUser(user.token);
    } else {
      setCart(null);
      setWishlist([]);
    }
  }, [user]);

  const handleLogout = () => {
    clearUserData();
  };

  const value = {
    user,
    setUser,
    cart,
    setCart,
    wishlist,
    handleLogout,
    isAuthLoading,
    addToWishlist,
    removeFromWishlist,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppProvider = () => {
  return useContext(AppContext);
};
