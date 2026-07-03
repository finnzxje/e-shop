import { useEffect, useRef } from "react";
import { X, Sparkles, RotateCcw } from "lucide-react";
import { useAiChat } from "../../hooks/useAiChat";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";

interface Props {
  onClose: () => void;
}

const QUICK_PROMPTS = [
  "Track my order",
  "What's your return policy?",
  "Find me a jacket",
  "Talk to a human",
] as const;

export default function AiChatPanel({ onClose }: Props) {
  const { messages, sending, error, send, reset } = useAiChat();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  return (
    <div
      role="dialog"
      aria-label="Shop assistant chat panel"
      className="flex h-[600px] w-[400px] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 shadow-2xl"
    >
      <header className="flex items-start justify-between gap-3 bg-gradient-to-br from-stone-900 to-stone-700 px-4 py-3 text-white">
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600/20 ring-1 ring-emerald-300/40">
            <Sparkles className="h-4 w-4 text-emerald-200" />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-wide">Shop Assistant</div>
            <div className="text-[11px] text-stone-300">Ready to help with your shopping</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={reset}
            className="rounded-md p-1.5 text-stone-200 transition hover:bg-white/10"
            aria-label="Start a new chat"
            title="Start a new chat"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-stone-200 transition hover:bg-white/10"
            aria-label="Close chat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} onNavigate={onClose} />
        ))}
        {messages.length === 1 && messages[0]?.role === "assistant" && !sending && (
          <div className="flex flex-wrap gap-2 pt-1">
            {QUICK_PROMPTS.map((text) => (
              <button
                key={text}
                type="button"
                onClick={() => void send(text)}
                className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-700 transition hover:border-stone-300 hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                {text}
              </button>
            ))}
          </div>
        )}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-stone-200 bg-white px-3.5 py-2.5 shadow-sm">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400 [animation-delay:120ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400 [animation-delay:240ms]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">{error}</div>
      )}

      <ChatInput disabled={sending} onSend={(text) => void send(text)} />
    </div>
  );
}
