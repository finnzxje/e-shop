import { v4 as uuidv4 } from "uuid";

const SESSION_ID_KEY = "user_session_id";

/**
 * Lấy Session ID hiện tại từ localStorage.
 * Nếu chưa có, tạo một cái mới và lưu lại.
 */
export const getSessionId = (): string => {
  let sessionId = localStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = uuidv4();
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
};

/**
 * Xóa Session ID khi người dùng đăng xuất.
 * (Theo tài liệu: "Start a new session if the visitor explicitly signs out")
 */
export const clearSessionId = () => {
  localStorage.removeItem(SESSION_ID_KEY);
};
