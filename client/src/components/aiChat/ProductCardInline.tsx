import { Link } from "react-router-dom";
import type { AiProductCard } from "../../types/aiChat";

interface Props {
  product: AiProductCard;
  onNavigate?: () => void;
}

function formatPrice(price: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "VND",
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `${price.toLocaleString()} ${currency || "VND"}`;
  }
}

export default function ProductCardInline({ product, onNavigate }: Props) {
  const hasSlug = Boolean(product.slug);
  const href = hasSlug ? `/products/${product.slug}` : "#";
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!hasSlug) {
      event.preventDefault();
      return;
    }
    onNavigate?.();
  };
  return (
    <Link
      to={href}
      onClick={handleClick}
      aria-disabled={!hasSlug}
      className={`flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-2 transition hover:border-stone-300 hover:shadow-sm ${
        hasSlug ? "" : "cursor-not-allowed opacity-70"
      }`}
    >
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
          loading="lazy"
        />
      ) : (
        <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-stone-100" />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium text-stone-900">{product.name}</div>
        <div className="text-[11px] text-stone-500">
          {formatPrice(product.price, product.currency)}
          {product.inStock ? null : <span className="ml-1 text-red-500">• Out of stock</span>}
        </div>
        {product.recommendationReason && (
          <div className="truncate text-[10px] italic text-stone-400">{product.recommendationReason}</div>
        )}
      </div>
    </Link>
  );
}
