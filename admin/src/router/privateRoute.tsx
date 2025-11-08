import { Navigate } from "react-router-dom";
import { useAppProvider } from "../context/useContext";
import type { JSX } from "react/jsx-runtime";

// Định nghĩa rõ ràng các vai trò mà hệ thống của bạn sử dụng
type UserRole = "ADMIN" | "STAFF";

interface PrivateRouteProps {
  children: JSX.Element;
  requiredRoles?: UserRole[];
}

const PrivateRoute = ({ children, requiredRoles }: PrivateRouteProps) => {
  const { user, isLoading } = useAppProvider();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/" replace />;
  }

  const userRole = user.roles[0] as UserRole;

  if (requiredRoles && !requiredRoles.includes(userRole)) {
    return <Navigate to="/not-found" replace />;
  }
  return children;
};

export default PrivateRoute;
