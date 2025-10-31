import React, { useState, useEffect, useRef } from "react";
import api from "../config/axios";
import { useAppProvider } from "../context/useContex";
import { Client, type Frame } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { Send, ArrowLeft, Paperclip, Loader2, Plus } from "lucide-react";
import { format } from "date-fns";
import StartConversationForm, {
  type SupportConversationSummary,
} from "./StartConversationForm";

// --- THÊM MỚI ---
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
// -----------------

const SOCKET_URL = "http://localhost:8080/ws";

// --- Types (Giữ nguyên) ---
interface Sender {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}
interface SupportMessage {
  id: string;
  conversationId: string;
  senderType: "CUSTOMER" | "STAFF";
  sender: Sender;
  body: string;
  attachmentUrls: string[];
  readAt: string | null;
  createdAt: string;
}
interface AppUser {
  token: string;
}
interface AppContextType {
  user: AppUser | null;
}
interface ConversationListProps {
  conversations: SupportConversationSummary[];
  onSelect: (conversation: SupportConversationSummary) => void;
  selectedId: string | null;
  onShowNewForm: () => void;
}
interface MessageViewProps {
  conversation: SupportConversationSummary;
  messages: SupportMessage[];
  loading: boolean;
  onSendMessage: (messageBody: string) => void;
  onBack: () => void;
}

// --- Component ConversationList (Giữ nguyên) ---
const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  onSelect,
  selectedId,
  onShowNewForm,
}) => (
  <div className="flex flex-col border-r border-gray-200 h-full bg-white">
    {/* Header */}
    <div className="p-4 border-b">
      <h2 className="text-xl font-semibold">Support</h2>
    </div>
    {/* Nút Tạo mới */}
    <div className="p-4 border-b">
      <button
        onClick={onShowNewForm}
        className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <Plus size={20} />
        <span>Create a new request</span>
      </button>
    </div>
    {/* Danh sách */}
    <div className="flex-1 overflow-y-auto">
      {conversations.length === 0 && (
        <p className="p-4 text-center text-gray-500 mt-4">
          There have been no conversations yet.
        </p>
      )}
      <div className="p-2 space-y-1">
        {" "}
        {conversations.map((convo) => (
          <div
            key={convo.id}
            className={`p-3 cursor-pointer rounded-lg ${
              selectedId === convo.id
                ? "bg-blue-600 text-white"
                : "text-gray-800 hover:bg-gray-100"
            }`}
            onClick={() => onSelect(convo)}
          >
            <div className="flex justify-between items-center">
              <h3
                className={`text-sm font-semibold truncate ${
                  selectedId === convo.id ? "text-white" : "text-gray-900"
                }`}
              >
                {convo.subject}
              </h3>
              {convo.unreadCount > 0 && (
                <span
                  className={`text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center ${
                    selectedId === convo.id
                      ? "bg-white text-blue-600"
                      : "bg-blue-600 text-white"
                  }`}
                >
                  {convo.unreadCount}
                </span>
              )}
            </div>
            <p
              className={`text-xs truncate mt-1 ${
                selectedId === convo.id ? "text-blue-100" : "text-gray-500"
              }`}
            >
              {convo.lastMessage.senderType === "CUSTOMER" ? "You: " : ""}
              {convo.lastMessage.body}
            </p>
            <p
              className={`text-xs text-right mt-1 ${
                selectedId === convo.id ? "text-blue-200" : "text-gray-400"
              }`}
            >
              {format(new Date(convo.lastMessageAt), "dd/MM/yyyy")}
            </p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const MessageView: React.FC<MessageViewProps> = ({
  conversation,
  messages,
  loading,
  onSendMessage,
  onBack,
}) => {
  const [newMessage, setNewMessage] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newMessage.trim() === "") return;
    onSendMessage(newMessage);
    setNewMessage("");
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="p-4 border-b flex items-center space-x-3 bg-white shadow-sm">
        <button
          onClick={onBack}
          className="md:hidden p-2 rounded-full hover:bg-gray-100 text-gray-600"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h3 className="font-semibold text-gray-900">
            {conversation.subject}
          </h3>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              conversation.status === "OPEN"
                ? "bg-green-100 text-green-800"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            {conversation.status}
          </span>
        </div>
      </div>

      {/* Message List - Chat Bubbles mới */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && (
          <div className="flex justify-center items-center h-full">
            <Loader2 size={32} className="animate-spin text-blue-600" />
          </div>
        )}
        {!loading &&
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.senderType === "CUSTOMER" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`p-3 max-w-[70%] shadow-sm ${
                  msg.senderType === "CUSTOMER"
                    ? "bg-blue-600 text-white rounded-t-2xl rounded-bl-2xl"
                    : "bg-white text-gray-800 border rounded-t-2xl rounded-br-2xl"
                }`}
              >
                <p className="text-sm">{msg.body}</p>
                <p className="text-xs opacity-70 mt-1 text-right">
                  {format(new Date(msg.createdAt), "HH:mm")}
                </p>
              </div>
            </div>
          ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Thiết kế lại */}
      <form
        onSubmit={handleSubmit}
        className="p-4 border-t bg-white shadow-inner"
      >
        <div className="flex items-center space-x-3">
          <button
            type="button"
            className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100"
          >
            <Paperclip size={20} />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setNewMessage(e.target.value)
            }
            placeholder="Nhập tin nhắn..."
            className="flex-1 px-4 py-2 border-transparent bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500" // Input bo tròn, nền xám
            disabled={conversation.status === "CLOSED"}
          />
          <button
            type="submit"
            className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2" // Nút gửi hình tròn
            disabled={conversation.status === "CLOSED"}
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
};

// --- Component SupportChat (Main) ---
const SupportChat: React.FC = () => {
  const { user } = useAppProvider() as AppContextType;

  // --- THÊM MỚI ---
  const navigate = useNavigate();
  const prevUserRef = useRef<AppUser | null>(user); // Lưu trạng thái user trước đó
  // -----------------

  const [conversations, setConversations] = useState<
    SupportConversationSummary[]
  >([]);
  const [selectedConvo, setSelectedConvo] =
    useState<SupportConversationSummary | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [showNewForm, setShowNewForm] = useState(false);

  const stompClientRef = useRef<Client | null>(null);
  const headers = { Authorization: `Bearer ${user?.token}` };

  // --- Xử lý khi người dùng ĐĂNG XUẤT ---
  useEffect(() => {
    if (prevUserRef.current && !user) {
      navigate("/");
    }

    prevUserRef.current = user;
  }, [user, navigate]);
  // ---------------------------------------------

  // Effect: Tải danh sách hội thoại
  useEffect(() => {
    if (!user) {
      setConversations([]);
      return;
    }
    const fetchConversations = async () => {
      try {
        const response = await api.get<{
          content: SupportConversationSummary[];
        }>("/api/support/conversations", { headers });
        setConversations(response.data.content || []);
      } catch (error) {
        console.error("Failed to fetch conversations:", error);
        setConversations([]);
      }
    };
    fetchConversations();
  }, [user]);

  // Effect: Tải tin nhắn và kết nối WebSocket

  useEffect(() => {
    if (!selectedConvo || !user) return;

    const fetchMessages = async () => {
      setLoadingMessages(true);
      setMessages([]);
      try {
        const response = await api.get<SupportMessage[]>(
          `/api/support/conversations/${selectedConvo.id}/messages`,
          { headers }
        );
        setMessages(response.data || []);
      } catch (error) {
        console.error("Failed to fetch messages:", error);
        setMessages([]);
      }
      setLoadingMessages(false);
    };
    fetchMessages();

    const client = new Client({
      webSocketFactory: () => new SockJS(SOCKET_URL),
      connectHeaders: headers,
      reconnectDelay: 5000,
      onConnect: () => {
        console.log("STOMP Connected!");
        client.subscribe(
          `/topic/support/conversations/${selectedConvo.id}`,
          (message: any) => {
            const receivedMessage = JSON.parse(message.body) as SupportMessage;
            setMessages((prevMessages) => [...prevMessages, receivedMessage]);
          }
        );
      },
      onStompError: (frame: Frame) => {
        console.error("STOMP Error:", frame.headers["message"], frame.body);
      },
      onWebSocketError: (event: Event) => {
        console.error("WebSocket Error:", event);
      },
    });
    client.activate();
    stompClientRef.current = client;

    return () => {
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
        console.log("STOMP Disconnected.");
      }
    };
  }, [selectedConvo, user]);

  // Handler: Gửi tin nhắn (Giữ nguyên)
  const handleSendMessage = (messageBody: string) => {
    if (
      !stompClientRef.current ||
      !stompClientRef.current.connected ||
      !selectedConvo
    ) {
      console.error("STOMP client not connected.");
      return;
    }
    const payload = { body: messageBody, attachmentUrls: [] };
    stompClientRef.current.publish({
      destination: `/app/support/${selectedConvo.id}/messages`,
      body: JSON.stringify(payload),
    });
  };

  // Handler: Tạo form thành công (Giữ nguyên)
  const handleNewConversationSuccess = (
    newConversation: SupportConversationSummary
  ) => {
    setConversations((prevConvos) => [newConversation, ...prevConvos]);
    setSelectedConvo(newConversation);
    setShowNewForm(false);
  };

  // Handler: Hủy tạo form (Giữ nguyên)
  const handleCancelNewForm = () => {
    setShowNewForm(false);
  };

  return (
    <div className="flex w-full h-[710px] pt-2 max-w-6xl mx-auto rounded-lg shadow-xl overflow-hidden bg-white">
      {/* Sidebar */}
      <div
        className={`w-full md:w-1/3 lg:w-1/4 flex-shrink-0
          ${selectedConvo || showNewForm ? "hidden md:flex" : "flex"}`}
      >
        <ConversationList
          conversations={conversations}
          onSelect={(convo) => {
            if (!user) {
              toast.error("You must be logged in to view the conversation.");
              return;
            }

            setSelectedConvo(convo);
            setShowNewForm(false);
          }}
          selectedId={selectedConvo?.id ?? null}
          onShowNewForm={() => {
            if (!user) {
              toast.error("You must be logged in to create a new request.");
              return;
            }

            setShowNewForm(true);
            setSelectedConvo(null);
          }}
        />
      </div>

      {/* Main Area (Khung bên phải) */}
      <div
        className={`w-full md:w-2/3 lg:w-3/4 flex flex-col
          ${selectedConvo || showNewForm ? "flex" : "hidden md:flex"}`}
      >
        {showNewForm ? (
          <StartConversationForm
            onSuccess={handleNewConversationSuccess}
            onCancel={handleCancelNewForm}
          />
        ) : selectedConvo ? (
          <MessageView
            conversation={selectedConvo}
            messages={messages}
            loading={loadingMessages}
            onSendMessage={handleSendMessage}
            onBack={() => {
              setSelectedConvo(null);
              setShowNewForm(false);
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 bg-gray-50 p-8">
            <svg
              className="w-24 h-24 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium">Welcome!</h3>
            <p className="mt-1 text-sm">
              Select a chat or create a new request to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportChat;
