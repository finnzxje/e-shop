import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/useContex";
import Login from "./pages/login";
import StaffDashboard from "./pages/staffDashboard";
import NotFound from "./pages/notFound";
import PrivateRoute from "./router/privateRoute";
import AdminLayout from "./pages/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import UserManagement from "./pages/admin/UserManagement";
import ProductManagement from "./pages/admin/ProductManagement";
function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/admin/login" element={<Login />} />

          <Route
            path="/admin"
            element={
              <PrivateRoute requiredRole="ADMIN">
                <AdminLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />

            <Route path="users" element={<UserManagement />} />
            <Route path="products" element={<ProductManagement />} />
          </Route>

          {/* Chỉ STAFF được vào */}
          <Route
            path="/staff"
            element={
              <PrivateRoute requiredRole="STAFF">
                <StaffDashboard />
              </PrivateRoute>
            }
          />

          {/* Trang lỗi nếu truy cập sai quyền */}
          <Route path="/not-found" element={<NotFound />} />

          {/* Mặc định */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;
