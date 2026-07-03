import { Leaf } from "lucide-react";
import type { AiChatMessage } from "../../types/aiChat";
import CitationCard from "./CitationCard";
import ProductCardInline from "./ProductCardInline";

interface Props {
  message: AiChatMessage;
  onNavigate?: () => void;
}

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function MessageBubble({ message, onNavigate }: Props) {
  const isUser = message.role === "user";
  const isError = message.responseType === "tool_error";
  const hasProducts = (message.productCards?.length ?? 0) > 0;
  const hasCitations = (message.citations?.length ?? 0) > 0;
  const timestamp = formatTime(message.createdAt);

  const bubbleClasses = isUser
    ? "bg-stone-900 text-white rounded-2xl rounded-br-md"
    : isError
      ? "bg-red-50 text-red-800 border border-red-200 rounded-2xl rounded-bl-md"
      : "bg-white text-stone-800 border border-stone-200 shadow-sm rounded-2xl rounded-bl-md";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} gap-2`}>
      {!isUser && (
        <span className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-stone-100 ring-1 ring-stone-200">
          <Leaf className="h-3.5 w-3.5 text-emerald-700" />
        </span>
      )}
      <div className={`flex max-w-[85%] flex-col ${isUser ? "items-end" : "items-start"}`}>
        <div className={`px-3.5 py-2 text-sm leading-relaxed ${bubbleClasses}`}>
          <div className="whitespace-pre-wrap break-words">{message.body}</div>

          {hasProducts && (
            <div className="mt-3 flex flex-col gap-1.5">
              {message.productCards!.map((p) => (
                <ProductCardInline
                  key={`${p.productId}-${p.variantId ?? "v"}`}
                  product={p}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          )}

          {hasCitations && !isUser && (
            <div className="mt-3 flex flex-col gap-1">
              <div className="text-[10px] font-medium uppercase tracking-wide text-stone-500">Sources</div>
              {message.citations!.map((c) => (
                <CitationCard key={c.sourceId} citation={c} />
              ))}
            </div>
          )}
        </div>
        {timestamp && (
          <div className="mt-1 px-1 text-[11px] text-stone-400">{timestamp}</div>
        )}
      </div>
    </div>
  );
}
