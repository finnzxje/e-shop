import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/useContext";
import Login from "./pages/login";
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
import UserProfile from "./pages/admin/UserProfile";

function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          {/* Trang login công khai */}
          <Route path="/" element={<Login />} />

          {/* === Khu vực ADMIN & STAFF === */}
          <Route
            path="/admin"
            element={
              <PrivateRoute requiredRoles={["ADMIN", "STAFF"]}>
                <AdminLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="/admin/products/new" element={<ProductCreate />} />
            <Route path="/admin/profile" element={<UserProfile />} />
            <Route
              path="/admin/products/:productId"
              element={<ProductEdit />}
            />
            {/* === RIÊNG BIỆT: Chỉ ADMIN === */}
            <Route
              path="users"
              element={
                <PrivateRoute requiredRoles={["ADMIN"]}>
                  <UserManagement />
                </PrivateRoute>
              }
            />
            <Route
              path="users/:userId"
              element={
                <PrivateRoute requiredRoles={["ADMIN"]}>
                  <UserDetail />
                </PrivateRoute>
              }
            />
            {/* === HẾT PHẦN CHỈ ADMIN === */}
            {/* Các trang chung cho ADMIN & STAFF */}
            <Route path="products" element={<ProductManagement />} />
            <Route path="orders" element={<ManagerOrder />} />
            <Route path="orders/:id" element={<TransactionDetail />} />
            <Route path="support-chat" element={<AdminSupportChat />} />
          </Route>
          <Route path="/not-found" element={<NotFound />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;
