import { useEffect, useState } from "react";
import type { Cart } from "../config/interface";
import api from "../config/axios";
import { useAppProvider } from "../context/useContex";
import LoginModal from "../components/loginModal";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

interface Address {
  id: string;
  label: string;
  recipientName: string;
  line1: string;
  city: string;
  countryCode: string;
  isDefault: boolean;
}

const Cart = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("vnpay");
  const { cart, setCart, user } = useAppProvider();
  const navigate = useNavigate();
  const handleEditaddress = () => {
    if (!user) {
      setIsModalOpen(true);
      return;
    } else navigate("/edit-address", { state: selectedAddress });
  };

  useEffect(() => {
    const fetchAddresses = async () => {
      if (!user?.token) {
        setAddresses([]);
        return;
      }
      try {
        const res = await api.get("/api/account/addresses", {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setAddresses(res.data);
        const defaultAddr = res.data.find((a: Address) => a.isDefault);
        if (defaultAddr) setSelectedAddress(defaultAddr.id);
      } catch (error) {
        console.error("Error fetching addresses:", error);
      }
    };
    fetchAddresses();
  }, [user]);

  const handleOpenModel = async () => {
    if (!user) {
      setIsModalOpen(true);
      return;
    }
    if (!selectedAddress) {
      toast.error("Please select a delivery address!");
      return;
    }
    if (cart.items.length === 0) {
      toast.error("Please add product to cart!");
      return;
    }
    setLoading(true);
    try {
      const dataOrder = await api.post(
        "/api/orders/checkout",
        {
          addressId: selectedAddress,
          saveAddress: false,
          shippingAmount: 2.5,
          discountAmount: 5.0,
          shippingMethod: "standard",
          // paymentMethod,
          notes: "Gift wrap if possible",
        },
        { headers: { Authorization: `Bearer ${user.token}` } },
      );

      const { paymentUrl } = dataOrder.data;
      if (paymentUrl) {
        window.location.href = paymentUrl;
      } else {
        alert("Đơn hàng đã được tạo thành công!");
      }
    } catch (error: any) {
      console.error("Checkout error:", error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModel = () => setIsModalOpen(false);

  return (
    <div className="flex flex-col md:flex-row py-16 max-w-6xl min-h-screen w-full px-6 mx-auto">
      {/* -------- DANH SÁCH SẢN PHẨM -------- */}
      <div className="flex-1 max-w-4xl">
        <h1 className="text-3xl font-medium mb-6">
          Shopping Cart{" "}
          <span className="text-sm text-black/50">
            {cart ? `${cart.totalItems} Item(s)` : "0 Items"}
          </span>
        </h1>

        <div className="grid grid-cols-[2fr_1fr_1fr] text-gray-500 text-base font-medium pb-3">
          <p className="text-left">Product Details</p>
          <p className="text-center">Subtotal</p>
          <p className="text-center">Action</p>
        </div>

        {cart?.items.map((item: any) => (
          <div
            key={item.id}
            className="grid grid-cols-[2fr_1fr_1fr] text-gray-500 items-center text-sm md:text-base font-medium pt-3"
          >
            <div className="flex items-center md:gap-6 gap-3">
              <div className="cursor-pointer w-24 h-24 flex items-center justify-center border border-gray-300 rounded overflow-hidden">
                <img
                  className="max-w-full h-full object-cover"
                  src={item.imageUrl}
                  alt={item.productName}
                />
              </div>
              <div>
                <p className="hidden md:flex items-center font-semibold gap-2">
                  {item.productName}
                  {item.color && (
                    <span
                      className="inline-block w-5 h-5 rounded-full border border-gray-300"
                      style={{
                        backgroundColor: item.color.hex || item.color.code,
                      }}
                      title={item.color.name}
                    ></span>
                  )}
                </p>
                <div className="font-normal text-gray-500/70">
                  <p>
                    Size: <span>{item.size || "N/A"}</span>
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <p>Qty:</p>
                    <select
                      className="outline-none"
                      value={item.quantity}
                      onChange={async (e) => {
                        const newQty = Number(e.target.value);
                        try {
                          const res = await api.put(
                            `/api/cart/items/${item.id}`,
                            { quantity: newQty },
                            {
                              headers: {
                                Authorization: `Bearer ${user?.token}`,
                              },
                            },
                          );
                          setCart(res.data);
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                    >
                      {Array.from(
                        { length: item.availableQuantity },
                        (_, i) => i + 1,
                      ).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-center">${item.lineTotal.toFixed(2)}</p>

            <button
              className="cursor-pointer mx-auto"
              onClick={async () => {
                try {
                  const res = await api.delete(`/api/cart/items/${item.id}`, {
                    headers: { Authorization: `Bearer ${user?.token}` },
                  });
                  setCart(res.data);
                } catch (err) {
                  console.error(err);
                }
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="m12.5 7.5-5 5m0-5 5 5m5.833-2.5a8.333 8.333 0 1 1-16.667 0 8.333 8.333 0 0 1 16.667 0"
                  stroke="#FF532E"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        ))}

        {!cart?.items.length && (
          <p className="text-gray-500 mt-6">Your cart is empty.</p>
        )}
      </div>

      {/* -------- TÓM TẮT ĐƠN HÀNG -------- */}
      <div className="max-w-[360px] w-full bg-gray-100/40 h-full rounded-lg p-5 max-md:mt-16 border border-gray-300/70">
        <h2 className="text-xl font-medium">Order Summary</h2>
        <hr className="border-gray-300 my-5" />

        {/* Địa chỉ giao hàng */}
        <div className="mb-5">
          <div className="flex justify-between">
            <label className="mb-2 text-gray-600 font-medium">
              Shipping Address
            </label>
            <div
              onClick={handleEditaddress}
              className="mb-2 cursor-pointer text-gray-600 font-medium hover:text-gray-800"
            >
              Add address
            </div>
          </div>
          <select
            className="w-full border rounded p-2 text-gray-600"
            value={selectedAddress}
            onChange={(e) => setSelectedAddress(e.target.value)}
          >
            <option value="">-- Select Address --</option>
            {addresses.map((addr) => (
              <option key={addr.id} value={addr.id}>
                {addr.label
                  ? `${addr.label} - ${addr.line1}, ${addr.city}`
                  : `${addr.line1}, ${addr.city}`}
              </option>
            ))}
          </select>
        </div>

        {/* Phương thức thanh toán */}
        <div className="mb-5">
          <label className="block mb-2 text-gray-600 font-medium">
            Payment Method
          </label>
          <select
            className="w-full border rounded p-2 text-gray-600"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            <option value="vnpay">VNPay</option>
            <option value="cod">Thanh toán khi nhận hàng (COD)</option>
            <option value="momo">Momo</option>
          </select>
        </div>

        {/* Tổng tiền */}
        <div className="text-gray-500 mt-4 space-y-2">
          <p className="flex justify-between">
            <span>Subtotal</span>
            <span>${cart?.subtotal ?? 0}</span>
          </p>
        </div>

        <button
          onClick={handleOpenModel}
          className="w-full py-3 mt-6 cursor-pointer bg-black text-white font-medium rounded-lg hover:bg-black/80 transition"
        >
          {loading ? "Creating order..." : "Place Order"}
        </button>
      </div>

      <LoginModal isOpen={isModalOpen} onClose={handleCloseModel} />
    </div>
  );
};

export default Cart;
