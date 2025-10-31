import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/useContex";
import Login from "./pages/login";
import StaffDashboard from "./pages/staffDashboard";
import NotFound from "./pages/notFound";
import PrivateRoute from "./router/privateRoute";
import AdminLayout from "./pages/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import UserManagement from "./pages/admin/userManagement/UserManagement";
import ProductManagement from "./pages/admin/productsMannagement/ProductManagement";
import ProductCreate from "./pages/admin/productsMannagement/ProductCreate";
import ProductEdit from "./pages/admin/productsMannagement/ProductEdit";
import UserDetail from "./pages/admin/userManagement/UserDetail";
import ManagerOrder from "./pages/admin/managerOrder/ManagerOrder";
import TransactionDetail from "./pages/admin/managerOrder/TransactionDetail";
import AdminSupportChat from "./pages/admin/AdminSupportChat";
function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />

          <Route
            path="/admin"
            element={
              <PrivateRoute requiredRole="ADMIN">
                <AdminLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            {/* Route cho TẠO MỚI */}
            <Route
              path="/admin/products/new"
              element={
                <PrivateRoute requiredRole="ADMIN">
                  <ProductCreate />
                </PrivateRoute>
              }
            />

            {/* Route cho CHỈNH SỬA */}
            <Route
              path="/admin/products/:productId"
              element={
                <PrivateRoute requiredRole="ADMIN">
                  <ProductEdit />
                </PrivateRoute>
              }
            />
            <Route path="users" element={<UserManagement />} />
            <Route path="users/:userId" element={<UserDetail />} />
            <Route path="products" element={<ProductManagement />} />
            <Route path="orders" element={<ManagerOrder />} />
            <Route path="orders/:id" element={<TransactionDetail />} />
            <Route path="support-chat" element={<AdminSupportChat />} />
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
