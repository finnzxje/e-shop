import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/useContex";
import Login from "./pages/login";
import AdminDashboard from "./pages/adminDashboard";
import StaffDashboard from "./pages/staffDashboard";
import NotFound from "./pages/notFound";
import PrivateRoute from "./router/privateRoute";

function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/admin/login" element={<Login />} />

          {/* Chỉ ADMIN được vào */}
          <Route
            path="/admin"
            element={
              <PrivateRoute requiredRole="ADMIN">
                <AdminDashboard />
              </PrivateRoute>
            }
          />

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
