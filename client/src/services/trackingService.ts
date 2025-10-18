import api from "../config/axios"; // Import instance axios của bạn
import { getSessionId } from "../utils/sessionManager";

/**
 * API 1: Gửi sự kiện xem sản phẩm
 * POST /api/catalog/products/{productId}/views
 */
export const trackProductView = async (
  productId: string,
  token: string | null | undefined,
  options: { variantId?: string; metadata?: object } = {}
) => {
  const sessionId = getSessionId(); // Lấy session từ localStorage
  const { variantId, metadata } = options;

  // Xây dựng header
  // Nếu có token (đã đăng nhập), backend sẽ tự lưu 'user_id'
  const headers: any = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    // Gửi body theo yêu cầu
    const body = {
      sessionId: sessionId,
      variantId: variantId, // Sẽ là undefined nếu không có
      metadata: metadata || {}, // Gửi object rỗng nếu không có
    };

    // Gọi API
    await api.post(`/api/catalog/products/${productId}/views`, body, {
      headers,
    });

    console.log(`Tracked view for product: ${productId}`);
  } catch (error) {
    console.error("Failed to track product view:", error);
    // Xử lý lỗi (không cần báo cho user, chỉ log)
  }
};

/**
 * API 2: Liên kết session ẩn danh với user sau khi đăng nhập
 * POST /api/catalog/products/views/link-session
 */
export const linkSessionToUser = async (token: string) => {
  const sessionId = getSessionId(); // Lấy session đã dùng khi ẩn danh
  if (!token) return; // Cần token để xác thực

  try {
    const body = {
      sessionId: sessionId,
    };

    await api.post("/api/catalog/products/views/link-session", body, {
      headers: { Authorization: `Bearer ${token}` }, // Bắt buộc
    });

    console.log(`Linked session ${sessionId} to user.`);
  } catch (error) {
    console.error("Failed to link session:", error);
  }
};
