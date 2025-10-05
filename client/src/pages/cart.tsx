import { useEffect, useState } from "react";
import type { Cart } from "../config/interface";
import api from "../config/axios";
import { useAppProvider } from "../context/useContex";

const Cart = () => {
  const { user } = useAppProvider();
  const [showAddress, setShowAddress] = useState(false);
  const { cart, setCart } = useAppProvider();
  return (
    <div className="flex flex-col md:flex-row py-16 max-w-6xl min-h-screen  w-full px-6 mx-auto">
      <div className="flex-1 max-w-4xl">
        <h1 className="text-3xl font-medium mb-6">
          Shopping Cart{" "}
          <span className="text-sm text-indigo-500">
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
                  src={`https://via.placeholder.com/150?text=${item.productName}`}
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
                            }
                          );
                          setCart(res.data);
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                    >
                      {Array.from(
                        { length: item.availableQuantity },
                        (_, i) => i + 1
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

      <div className="max-w-[360px] w-full bg-gray-100/40 h-full p-5 max-md:mt-16 border border-gray-300/70">
        <h2 className="text-xl md:text-xl font-medium">Order Summary</h2>
        <hr className="border-gray-300 my-5" />

        <div className="text-gray-500 mt-4 space-y-2">
          <p className="flex justify-between">
            <span>Subtotal</span>
            <span>${cart?.subtotal}</span>
          </p>
        </div>

        <button className="w-full py-3 mt-6 cursor-pointer bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition">
          Place Order
        </button>
      </div>
    </div>
  );
};

export default Cart;
