import axios from "axios";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface User {
  email: string;
  firstName: string;
  lastName: string;
  token: string;
  refreshToken: string;
  roles: string[];
}
export const AppContext = createContext<any>(undefined);
export const AppContextProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  //Fetch User Auth Status
  const fetchTestToken = async () => {
    const savedUser = localStorage.getItem("user");
    if (!savedUser) return;
    const parsedUser: any = JSON.parse(savedUser);
    try {
      const authUser: any = await axios.get(
        "http://localhost:8080/api/auth/test-token",
        { headers: { Authorization: `Bearer ${parsedUser.token}` } }
      );

      if (authUser.data.authenticated) {
        setUser(parsedUser);
        console.log(parsedUser);
      } else {
        setUser(null);
      }
    } catch (error: any) {
      console.log(error.message);
    }
  };
  useEffect(() => {
    fetchTestToken();
  }, []);
  const value = { user, setUser };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
export const useAppProvider = () => {
  return useContext(AppContext);
};
