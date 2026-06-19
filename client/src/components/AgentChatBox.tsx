import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Bot,
  ChevronDown,
  Loader2,
  MessageCircle,
  Send,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";
import axios from "axios";
import api from "../config/axios";
import { useAppProvider } from "../context/useContex";

interface AppUser {
  email: string;
  firstName: string;
  lastName: string;
  token: string;
}

interface AppContextType {
  user: AppUser | null;
  isAuthLoading: boolean;
}

interface AgentProductCard {
  productId: string;
  name: string;
  slug: string;
  category: string | null;
  gender: string | null;
  price: number | null;
  currency: string | null;
  imageUrl: string | null;
  colors: string[] | null;
  sizes: string[] | null;
  inStock: boolean | null;
  stock: number | null;
  reason: string | null;
}

interface AgentDraftAction {
  draftActionId: string;
  actionType: string;
  status: string;
  needsConfirmation: boolean | null;
}

interface AgentChatResponse {
  sessionId: string;
  intent: string | null;
  responseType: string | null;
  answer: string | null;
  productCards: AgentProductCard[] | null;
  draftAction: AgentDraftAction | null;
  needsConfirmation: boolean | null;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  body: string;
  productCards?: AgentProductCard[];
  draftAction?: AgentDraftAction | null;
  createdAt: Date;
}

const quickPrompts = [
  "Black jacket",
  "Outfits under $80",
  "Running essentials",
];

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const formatPrice = (price: number | null, currency: string | null) => {
  if (price === null) return "";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `${price} ${currency || "USD"}`;
  }
};

const AgentChatBox = () => {
  const { user, isAuthLoading } = useAppProvider() as AppContextType;
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      body: "Hi, I can help you find products, compare options, or build a quick cart idea.",
      createdAt: new Date(),
    },
  ]);
  const sessionIdRef = useRef(`web-chat-${createId()}`);
  const endRef = useRef<HTMLDivElement | null>(null);

  const headers = useMemo(
    () =>
      user?.token
        ? {
            Authorization: `Bearer ${user.token}`,
          }
        : undefined,
    [user?.token]
  );

  useEffect(() => {
    if (open) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const submitMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    if (!user?.token) {
      setOpen(true);
      setError("Please log in to chat with the shopping assistant.");
      return;
    }

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      body: trimmed,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessage("");
    setSending(true);
    setError(null);

    try {
      const response = await api.post<AgentChatResponse>(
        "/api/agent/chat",
        {
          message: trimmed,
          sessionId: sessionIdRef.current,
          authenticated: true,
          pageContext: {
            path: location.pathname,
            search: location.search,
            locale: navigator.language,
            currency: "USD",
          },
        },
        { headers }
      );

      const agent = response.data;
      const fallbackAnswer =
        "I found a few options. Could you share more details about style, size, or budget?";

      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          role: "assistant",
          body: agent.answer || fallbackAnswer,
          productCards: agent.productCards || [],
          draftAction: agent.draftAction,
          createdAt: new Date(),
        },
      ]);
    } catch (err: unknown) {
      console.error("Failed to send agent chat message:", err);
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      setError(
        status === 503
          ? "The shopping assistant is currently unavailable."
          : "I could not send that message. Please try again."
      );
    } finally {
      setSending(false);
    }
  };

  if (location.pathname === "/contact") return null;

  return (
    <div className="fixed bottom-5 right-4 z-50 font-outfit sm:right-6">
      {open && (
        <section className="mb-4 flex h-[min(700px,calc(100vh-112px))] w-[calc(100vw-28px)] max-w-[410px] flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.26)] ring-1 ring-slate-900/5">
          <header className="relative overflow-hidden bg-slate-950 px-4 pb-4 pt-4 text-white">
            <div className="absolute -right-12 -top-16 h-36 w-36 rounded-full bg-blue-500/30 blur-2xl" />
            <div className="absolute -bottom-14 left-12 h-28 w-28 rounded-full bg-emerald-400/20 blur-2xl" />
            <div className="relative flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-lg shadow-blue-950/20">
                  <Bot size={23} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[15px] font-semibold tracking-wide">
                      Style Assistant
                    </h2>
                    <span className="flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-medium text-blue-100">
                      <Sparkles size={11} />
                      AI
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-300">
                    Find products, sizes, and outfit ideas
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
                aria-label="Close chat"
              >
                <X size={18} />
              </button>
            </div>
            <div className="relative mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-xs text-slate-200 backdrop-blur">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.16)]" />
                Online shopping help
              </span>
              <span>
                {user?.firstName ? "Hi, " + user.firstName : "Welcome"}
              </span>
            </div>
          </header>

          <div className="flex-1 space-y-5 overflow-y-auto bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_48%,#f8fafc_100%)] px-4 py-5">
            {messages.map((item) => (
              <div
                key={item.id}
                className={`flex ${
                  item.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[88%] px-4 py-3 text-sm shadow-sm ${
                    item.role === "user"
                      ? "rounded-[22px] rounded-br-md bg-slate-950 text-white shadow-slate-900/20"
                      : "rounded-[22px] rounded-bl-md border border-white bg-white/95 text-slate-800 shadow-blue-950/5"
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {item.body}
                  </p>

                  {item.productCards && item.productCards.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {item.productCards.slice(0, 4).map((product) => (
                        <Link
                          key={product.productId || product.slug}
                          to={`/products/${product.slug}`}
                          onClick={() => setOpen(false)}
                          className="group flex gap-3 rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
                        >
                          <div className="flex h-[72px] w-[72px] flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <ShoppingBag
                                size={24}
                                className="text-slate-400"
                              />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-semibold leading-snug">
                              {product.name}
                            </p>
                            <p className="mt-1 truncate text-xs text-slate-500">
                              {[
                                product.category,
                                product.gender,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <span className="text-sm font-bold text-slate-950">
                                {formatPrice(product.price, product.currency)}
                              </span>
                              <span
                                className={
                                  product.inStock === false
                                    ? "rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600"
                                    : "rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"
                                }
                              >
                                {product.inStock === false
                                  ? "Sold out"
                                  : "In stock"}
                              </span>
                            </div>
                            {product.reason && (
                              <p className="mt-1 truncate text-xs text-slate-500">
                                {product.reason}
                              </p>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {item.draftAction?.needsConfirmation && (
                    <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      Confirmation needed before I take the next step.
                    </div>
                  )}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-[22px] rounded-bl-md border border-white bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                  <Loader2 size={16} className="animate-spin" />
                  Thinking...
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-slate-200 bg-white p-3">
            {!user?.token && !isAuthLoading && (
              <div className="mb-3 rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Please log in to use the shopping assistant.
              </div>
            )}

            {messages.length === 1 && user?.token && (
              <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => submitMessage(prompt)}
                    className="whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {error && (
              <p className="mb-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600">
                {error}
              </p>
            )}

            <form
              onSubmit={(event) => {
                event.preventDefault();
                submitMessage(message);
              }}
              className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 focus-within:border-blue-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100"
            >
              <input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                disabled={sending || !user?.token}
                placeholder="Ask for products, sizes, or ideas..."
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:text-slate-400"
              />
              <button
                type="submit"
                disabled={sending || !message.trim() || !user?.token}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-md shadow-slate-950/20 transition hover:bg-blue-700 disabled:bg-slate-300 disabled:shadow-none"
                aria-label="Send message"
              >
                {sending ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </form>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="group relative ml-auto flex h-14 items-center gap-3 rounded-2xl bg-slate-950 px-4 text-white shadow-[0_18px_45px_rgba(15,23,42,0.28)] transition hover:-translate-y-0.5 hover:bg-blue-700"
        aria-label={open ? "Minimize chat" : "Open chat"}
      >
        {!open && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-4 w-4 rounded-full border-2 border-white bg-emerald-500" />
          </span>
        )}
        {open ? <ChevronDown size={22} /> : <MessageCircle size={22} />}
        <span className="hidden text-sm font-semibold sm:inline">
          {open ? "Minimize" : "Ask stylist"}
        </span>
      </button>
    </div>
  );
};

export default AgentChatBox;
