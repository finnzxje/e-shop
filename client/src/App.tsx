import { Footer } from "./components/footer";
import { Header } from "./components/header";
import Home from "./pages/home";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import Login from "./pages/login";
import Register from "./pages/register";
import ProductPage from "./pages/allProcusts";
import Detail from "./components/detail";
import Carts from "./pages/cart";
import { Toaster } from "react-hot-toast";
import EditAddress from "./pages/editAddress";
import PaymentResult from "./components/paymentResult";
import Wishlist from "./pages/wishlist";
import PurchasedItems from "./pages/purchasedItems";
import NotFound from "./pages/notFoundPages";
import ActivateAccount from "./pages/ActivateAccount";
import SupportChat from "./pages/SupportChat";
function AppContent() {
  const location = useLocation();
  const isContactPage = location.pathname === "/contact";
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/cart" element={<Carts />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/all-products" element={<ProductPage />} />
        <Route path="/products/:slug" element={<Detail />} />
        <Route path="/payment-result" element={<PaymentResult />} />
        <Route path="/edit-address" element={<EditAddress />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/purchase" element={<PurchasedItems />} />
        <Route path="/auth/activate" element={<ActivateAccount />} />
        <Route path="/contact" element={<SupportChat />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!isContactPage && <Footer />}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
