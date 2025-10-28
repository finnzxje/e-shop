import { Navigate } from "react-router-dom";
import { useAppProvider } from "../context/useContex";
import type { JSX } from "react/jsx-runtime";

interface PrivateRouteProps {
  children: JSX.Element;
  requiredRole?: "ADMIN" | "STAFF";
}

const PrivateRoute = ({ children, requiredRole }: PrivateRouteProps) => {
  const { user, isLoading } = useAppProvider();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && user.roles[0] !== requiredRole) {
    return <Navigate to="/not-found" replace />;
  }

  return children;
};

export default PrivateRoute;
