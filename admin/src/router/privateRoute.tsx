import { Navigate } from "react-router-dom";
import { useAppProvider } from "../context/useContex";
import type { JSX } from "react/jsx-runtime";

interface PrivateRouteProps {
  children: JSX.Element;
  requiredRole?: "ADMIN" | "STAFF";
}

const PrivateRoute = ({ children, requiredRole }: PrivateRouteProps) => {
  const { user } = useAppProvider();

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }
  if (requiredRole && !user.roles[0].includes(requiredRole)) {
    return <Navigate to="/not-found" replace />;
  }

  return children;
};

export default PrivateRoute;
