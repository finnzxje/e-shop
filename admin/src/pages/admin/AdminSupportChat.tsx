import React, { useState, useEffect, useRef } from "react";
import api from "../../config/axios";
import { useAppProvider } from "../../context/useContex";
import { Client, type Frame } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import {
  Send,
  Paperclip,
  Loader2,
  Inbox,
  User,
  Lock,
  Unlock,
  MessagesSquare,
} from "lucide-react";
import { format } from "date-fns";

const SOCKET_URL = "http://localhost:8080/ws";

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

interface LastMessage {
  id: string;
  conversationId: string;
  senderType: "CUSTOMER" | "STAFF";
  body: string;
  attachmentUrls: string[];
  createdAt: string;
}

interface ConversationParticipant {
  id: string;
  email: string;
}

type ConversationStatus =
  | "OPEN"
  | "WAITING_STAFF"
  | "WAITING_CUSTOMER"
  | "CLOSED";

interface SupportConversationSummary {
  id: string;
  status: ConversationStatus;
  subject: string;
  lastMessageAt: string;
  customer: ConversationParticipant;
  assignedStaff: ConversationParticipant | null;
  lastMessage: LastMessage;
  unreadCount: number;
}

interface AdminConversationListProps {
  conversations: SupportConversationSummary[];
  onSelect: (conversation: SupportConversationSummary) => void;
  selectedId: string | null;
  activeList: "inbox" | "assigned";
  setActiveList: (list: "inbox" | "assigned") => void;
  loading: boolean;
}

interface AdminMessageViewProps {
  conversation: SupportConversationSummary;
  messages: SupportMessage[];
  loading: boolean;
  onSendMessage: (messageBody: string) => void;
  onUpdateStatus: (status: ConversationStatus) => Promise<void>;
}

// --- Component AdminConversationList (Sidebar) ---

const AdminConversationList: React.FC<AdminConversationListProps> = ({
  conversations,
  onSelect,
  selectedId,
  activeList,
  setActiveList,
  loading,
}) => (
  <div className="flex flex-col h-full border-r border-gray-200 bg-white">
    {/* Header */}
    <div className="p-4 border-b">
      <div className="flex items-center space-x-2">
        <MessagesSquare size={22} className="text-blue-600" />
        <h2 className="text-xl font-semibold">Support Center</h2>
      </div>
    </div>

    <div className="p-2 flex space-x-2 border-b bg-gray-50">
      <button
        onClick={() => setActiveList("inbox")}
        className={`flex-1 p-2 rounded-lg flex items-center justify-center space-x-2 text-sm font-medium ${
          activeList === "inbox"
            ? "bg-blue-100 text-blue-700"
            : "text-gray-500 hover:bg-gray-200 hover:text-gray-700"
        }`}
      >
        <Inbox size={16} />
        <span>Inbox</span>
      </button>
      <button
        onClick={() => setActiveList("assigned")}
        className={`flex-1 p-2 rounded-lg flex items-center justify-center space-x-2 text-sm font-medium ${
          activeList === "assigned"
            ? "bg-blue-100 text-blue-700"
            : "text-gray-500 hover:bg-gray-200 hover:text-gray-700"
        }`}
      >
        <User size={16} />
        <span>Mine</span>
      </button>
    </div>

    {/* List  */}
    <div className="flex-1 overflow-y-auto p-2 space-y-1">
      {loading && (
        <div className="flex justify-center items-center h-full pt-10">
          <Loader2 size={24} className="animate-spin text-blue-600" />
        </div>
      )}
      {!loading && conversations.length === 0 && (
        <p className="p-4 text-gray-500 text-center mt-4">
          No conversations found.
        </p>
      )}
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
              className={`font-semibold text-sm truncate ${
                selectedId === convo.id ? "text-white" : "text-gray-900"
              }`}
            >
              {convo.customer.email}
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
            className={`text-sm truncate mt-1 ${
              selectedId === convo.id ? "text-blue-100" : "text-gray-600"
            }`}
          >
            {convo.subject}
          </p>
          <div className="flex justify-between items-center mt-2">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                selectedId === convo.id
                  ? "bg-blue-400 text-white"
                  : convo.status === "OPEN"
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              {convo.status}
            </span>
            <p
              className={`text-xs ${
                selectedId === convo.id ? "text-blue-200" : "text-gray-400"
              }`}
            >
              {format(new Date(convo.lastMessageAt), "dd/MM/yyyy")}
            </p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// --- Component AdminMessageView (Chat Area) ---

const AdminMessageView: React.FC<AdminMessageViewProps> = ({
  conversation,
  messages,
  loading,
  onSendMessage,
  onUpdateStatus,
}) => {
  const [newMessage, setNewMessage] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newMessage.trim() === "") return;
    onSendMessage(newMessage);
    setNewMessage("");
  };

  const handleStatusToggle = async () => {
    setIsUpdating(true);
    const newStatus = conversation.status === "CLOSED" ? "OPEN" : "CLOSED";
    await onUpdateStatus(newStatus);
    setIsUpdating(false);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header  */}
      <div className="p-4 border-b flex justify-between items-center shadow-sm z-10">
        <div>
          <h3 className="font-semibold">{conversation.subject}</h3>
          <p className="text-sm text-gray-600">
            Customer: {conversation.customer.email}
          </p>
        </div>

        <button
          onClick={handleStatusToggle}
          disabled={isUpdating}
          className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-white ${
            conversation.status === "CLOSED"
              ? "bg-green-600 hover:bg-green-700"
              : "bg-red-600 hover:bg-red-700"
          } disabled:bg-gray-400`}
        >
          {isUpdating ? (
            <Loader2 size={16} className="animate-spin" />
          ) : conversation.status === "CLOSED" ? (
            <Unlock size={16} />
          ) : (
            <Lock size={16} />
          )}
          <span>
            {isUpdating
              ? "Updating..."
              : conversation.status === "CLOSED"
              ? "Re-open"
              : "Close Ticket"}
          </span>
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
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
                msg.senderType === "STAFF" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`p-3 max-w-[70%] shadow-sm ${
                  msg.senderType === "STAFF"
                    ? "bg-blue-600 text-white rounded-t-2xl rounded-bl-2xl"
                    : "bg-white text-gray-800 border rounded-t-2xl rounded-br-2xl"
                }`}
              >
                {msg.senderType === "STAFF" && (
                  <p className="text-xs font-semibold opacity-80 mb-1">
                    {msg.sender.firstName} {msg.sender.lastName}
                  </p>
                )}
                <p className="text-sm">{msg.body}</p>

                <p className="text-xs opacity-70 mt-1 text-right">
                  {format(new Date(msg.createdAt), "HH:mm")}
                </p>
              </div>
            </div>
          ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area  */}
      <form
        onSubmit={handleSubmit}
        className="p-4 border-t bg-white shadow-inner"
      >
        <div className="flex items-center space-x-3">
          <button
            type="button"
            className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100 disabled:opacity-50"
            disabled={conversation.status === "CLOSED"}
          >
            <Paperclip size={20} />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setNewMessage(e.target.value)
            }
            placeholder="Enter message..."
            className="flex-1 px-4 py-2 border-transparent bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={conversation.status === "CLOSED"}
          />
          <button
            type="submit"
            className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-400"
            disabled={conversation.status === "CLOSED"}
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
};

// --- Component AdminSupportChat (Main) ---

const AdminSupportChat: React.FC = () => {
  const { user } = useAppProvider();
  const [conversations, setConversations] = useState<
    SupportConversationSummary[]
  >([]);
  const [selectedConvo, setSelectedConvo] =
    useState<SupportConversationSummary | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loadingConversations, setLoadingConversations] =
    useState<boolean>(false);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);

  const [activeList, setActiveList] = useState<"inbox" | "assigned">("inbox");

  const stompClientRef = useRef<Client | null>(null);
  const headers = { Authorization: `Bearer ${user?.token}` };

  // Effect: Tải danh sách conversations (Giữ nguyên)
  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      setLoadingConversations(true);
      setConversations([]);

      // setSelectedConvo(null);

      const endpoint =
        activeList === "inbox"
          ? "/api/admin/support/conversations"
          : "/api/admin/support/conversations/assigned";

      try {
        const response = await api.get<{
          content: SupportConversationSummary[];
        }>(endpoint, { headers });

        setConversations(response.data.content || []);
      } catch (error) {
        console.error("Failed to fetch admin conversations:", error);
        setConversations([]);
      }
      setLoadingConversations(false);
    };
    fetchConversations();
  }, [user, activeList]);

  // Effect: Tải tin nhắn và kết nối WebSocket (Giữ nguyên)
  useEffect(() => {
    if (!selectedConvo || !user) {
      setMessages([]);
      return;
    }

    // 1. Tải lịch sử tin nhắn
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

    // 2. Kết nối WebSocket/STOMP
    const client = new Client({
      webSocketFactory: () => new SockJS(SOCKET_URL),
      connectHeaders: headers,
      reconnectDelay: 5000,
      onConnect: () => {
        console.log("STOMP Connected! (Admin)");
        client.subscribe(
          `/topic/support/conversations/${selectedConvo.id}`,
          (message) => {
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
        console.log("STOMP Disconnected. (Admin)");
      }
    };
  }, [selectedConvo, user]);

  // Handler: Gửi tin nhắn
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

  // Handler: Cập nhật Status
  const handleUpdateStatus = async (status: ConversationStatus) => {
    if (!selectedConvo) return;
    try {
      await api.patch(
        `/api/admin/support/conversations/${selectedConvo.id}/status`,
        { status: status },
        { headers }
      );
      setSelectedConvo((prev) => (prev ? { ...prev, status: status } : null));
      setConversations((prevList) =>
        prevList.map((convo) =>
          convo.id === selectedConvo.id ? { ...convo, status: status } : convo
        )
      );
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Failed to update status.");
    }
  };

  return (
    <div className="flex h-[85vh] w-full max-w-7xl mx-auto border rounded-lg shadow-xl overflow-hidden bg-white">
      {/* Sidebar */}
      <div className="w-full md:w-1/3 lg:w-1/4 shrink-0 flex flex-col">
        <AdminConversationList
          conversations={conversations}
          onSelect={setSelectedConvo}
          selectedId={selectedConvo?.id ?? null}
          activeList={activeList}
          setActiveList={setActiveList}
          loading={loadingConversations}
        />
      </div>

      {/* Message View */}
      <div className="w-full md:w-2/3 lg:w-3/4 flex flex-col">
        {selectedConvo ? (
          <AdminMessageView
            conversation={selectedConvo}
            messages={messages}
            loading={loadingMessages}
            onSendMessage={handleSendMessage}
            onUpdateStatus={handleUpdateStatus}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 bg-gray-50 p-8 text-center">
            <Inbox size={48} className="text-gray-300" />
            <h3 className="mt-4 text-lg font-medium">Welcome</h3>
            <p className="mt-1 text-sm">
              Please select a conversation from the{" "}
              {activeList === "inbox" ? "Inbox" : "Mine"} tab to begin.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSupportChat;
