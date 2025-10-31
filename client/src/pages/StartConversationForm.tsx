import React, { useState } from "react";
import api from "../config/axios";
import { useAppProvider } from "../context/useContex";
import { Loader2, Send, X } from "lucide-react";

interface AppUser {
  token: string;
}
interface AppContextType {
  user: AppUser | null;
}
interface ConversationParticipant {
  id: string;
  email: string;
}
interface LastMessage {
  id: string;
  conversationId: string;
  senderType: "CUSTOMER" | "STAFF";
  body: string;
  attachmentUrls: string[];
  createdAt: string;
}
export interface SupportConversationSummary {
  id: string;
  status: "OPEN" | "WAITING_STAFF" | "WAITING_CUSTOMER" | "CLOSED";
  subject: string;
  lastMessageAt: string;
  customer: ConversationParticipant;
  assignedStaff: ConversationParticipant | null;
  lastMessage: LastMessage;
  unreadCount: number;
}

interface StartConversationFormProps {
  onSuccess: (newConversation: SupportConversationSummary) => void;
  onCancel: () => void;
}

const StartConversationForm: React.FC<StartConversationFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const { user } = useAppProvider() as AppContextType;
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = { Authorization: `Bearer ${user?.token}` };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setError("Subject and message cannot be empty.");
      return;
    }
    setLoading(true);
    setError(null);

    const body = {
      subject: subject,
      message: message,
      attachmentUrls: [],
    };

    try {
      const response = await api.post<SupportConversationSummary>(
        "/api/support/conversations",
        body,
        { headers }
      );
      onSuccess(response.data);
      setSubject("");
      setMessage("");
    } catch (err) {
      console.error("Failed to start conversation:", err);
      setError("Failed to start conversation. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="font-semibold text-lg">New Support Request</h3>
        {/* Translated */}
        <button
          onClick={onCancel}
          className="p-1 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800"
        >
          <X size={20} />
        </button>
      </div>

      {/* Form Content */}
      <form
        id="start-conversation-form"
        onSubmit={handleSubmit}
        className="flex-1 p-6 space-y-5 overflow-y-auto"
      >
        <div>
          <label
            htmlFor="subject"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Subject
            {/* Translated */}
          </label>
          <input
            type="text"
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" // Rounded, added padding
            placeholder="Example: Issue with order #12345" // Translated
            disabled={loading}
          />
        </div>
        <div>
          <label
            htmlFor="message"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Message
            {/* Translated */}
          </label>
          <textarea
            id="message"
            rows={8}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" // Rounded, added padding
            placeholder="Describe your issue in detail..." // Translated
            disabled={loading}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      {/* Footer (Submit button) */}
      <div className="p-4 border-t bg-gray-50">
        <button
          type="submit"
          form="start-conversation-form"
          disabled={loading}
          className="w-full flex justify-center items-center px-4 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400" // Large, rounded button
        >
          {loading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Send size={20} className="mr-2" />
          )}
          <span>{loading ? "Sending..." : "Send Request"}</span>
          {/* Translated */}
        </button>
      </div>
    </div>
  );
};

export default StartConversationForm;
