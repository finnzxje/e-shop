import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import api from "../config/axios";
import type { Cart } from "../config/interface";

interface User {
  email: string;
  firstName: string;
  lastName: string;
  token: string;
  refreshToken: string;
  roles: string[];
}
export const AppContext = createContext<any>(null);
export const AppContextProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<Cart | null>(null);

  //Fetch User Auth Status
  const fetchTestToken = async () => {
    const savedUser = localStorage.getItem("user");
    if (!savedUser) {
      return;
    }
    const parsedUser: any = JSON.parse(savedUser);
    try {
      const authUser: any = await api.get("/api/auth/test-token", {
        headers: { Authorization: `Bearer ${parsedUser.token}` },
      });
      if (authUser.data.authenticated) {
        setUser(parsedUser);
      } else {
        setUser(null);
        setCart(null);
      }
    } catch (error: any) {
      console.log(error.message);
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
  useEffect(() => {
    fetchTestToken();
  }, []);
  useEffect(() => {
    if (!user) return;
    fetchCart();
  }, [user]);

  const value = { user, setUser, cart, setCart };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
export const useAppProvider = () => {
  return useContext(AppContext);
};
