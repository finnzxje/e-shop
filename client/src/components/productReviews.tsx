import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import api from "../config/axios"; // Giả sử baseURL là /api/catalog/products/
import { Star } from "lucide-react";
import { useAppProvider } from "../context/useContex";
import toast from "react-hot-toast";

// --- INTERFACES (Đã khôi phục đầy đủ) ---
interface Review {
  id: string;
  productId: string;
  userId: string;
  reviewerName: string;
  rating: number;
  reviewText: string;
  verifiedPurchase: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedReviews {
  content: Review[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

interface CreateReviewDTO {
  rating: number;
  reviewText: string;
  orderItemId?: string;
}

// --- StarRating COMPONENT  ---
interface StarRatingProps {
  rating: number;
  onRatingChange?: (newRating: number) => void;
  maxRating?: number;
}

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  onRatingChange,
  maxRating = 5,
}) => {
  const [hoverRating, setHoverRating] = useState<number>(0);
  const isInteractive = !!onRatingChange;

  return (
    <div className={`flex ${isInteractive ? "cursor-pointer" : ""}`}>
      {[...Array(maxRating)].map((_, index) => {
        const starValue = index + 1;
        const displayRating = hoverRating || rating;
        return (
          <span
            key={starValue}
            className="select-none"
            onClick={() => onRatingChange?.(starValue)}
            onMouseEnter={() => isInteractive && setHoverRating(starValue)}
            onMouseLeave={() => isInteractive && setHoverRating(0)}
          >
            {starValue <= displayRating ? (
              <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
            ) : (
              <Star className="h-5 w-5 text-gray-300" />
            )}
          </span>
        );
      })}
    </div>
  );
};

// --- ReviewCard COMPONENT  ---
interface ReviewCardProps {
  review: Review;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ review }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <article className="py-5 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="font-semibold text-gray-900">
            {review.reviewerName}
          </span>
          <StarRating rating={review.rating} />
        </div>
        {review.verifiedPurchase && (
          <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
            Verified Purchase
          </span>
        )}
      </div>
      <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">
        {review.reviewText}
      </p>
      <time className="mt-2 block text-xs text-gray-500">
        {formatDate(review.createdAt)}
      </time>
    </article>
  );
};

// --- ReviewForm COMPONENT  ---
interface ReviewFormProps {
  productId: string;
  onReviewSubmitted: (newReview: Review) => void;
}

const ReviewForm: React.FC<ReviewFormProps> = ({
  productId,
  onReviewSubmitted,
}) => {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAppProvider();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError("Please select a star rating.");
      return;
    }
    setIsSubmitting(true);
    setError(null);

    const dto: CreateReviewDTO = { rating, reviewText: reviewText.trim() };

    try {
      const response = await api.post<Review>(
        `/api/catalog/products/${productId}/reviews`,
        dto,
        {
          headers: { Authorization: `Bearer ${user?.token}` },
        }
      );
      if (response.status === 201) {
        onReviewSubmitted(response.data);
        toast.success("Complete review.");
        setRating(0);
        setReviewText("");
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        if (err.response.status === 409) {
          setError("You have already reviewed this product.");
        } else if (err.response.status === 401) {
          setError("You must be logged in to post a review.");
          toast.error("You must be logged in to post a review.");
        } else {
          setError("Failed to submit review. Please try again.");
        }
      } else {
        setError("A network or unknown error occurred.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Write a Review</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Your Rating
          </label>
          <StarRating rating={rating} onRatingChange={setRating} />
        </div>
        <div>
          <label
            htmlFor="reviewText"
            className="block text-sm font-semibold text-gray-700"
          >
            Your Review
          </label>
          <textarea
            id="reviewText"
            rows={4}
            className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="What did you like or dislike about this product?"
          ></textarea>
        </div>
        {error && (
          <div className="bg-red-100 text-red-800 p-3 rounded-md text-sm">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex justify-center cursor-pointer items-center px-6 py-2.5 border border-transparent text-sm font-medium rounded-md text-white bg-gray-800 hover:bg-gray-900 disabled:bg-gray-200 disabled:text-gray-400"
        >
          {isSubmitting ? "Submitting..." : "Submit Review"}
        </button>
      </form>
    </div>
  );
};

// --- MAIN COMPONENT  ---
interface ProductReviewsProps {
  productId: string;
}

export const ProductReviews: React.FC<ProductReviewsProps> = ({
  productId,
}) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  // === THÊM STATE PHÂN TRANG ===
  const [page, setPage] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // === CẬP NHẬT HÀM FETCHREVIEWS ===
  const fetchReviews = useCallback(
    async (pageNum: number, clearExisting: boolean) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.get<PaginatedReviews>(
          `/api/catalog/products/${productId}/reviews`,
          {
            params: {
              page: pageNum,
              size: 5, // Tải 5 review mỗi lần
              sort: "createdAt,desc",
            },
          }
        );
        const data = response.data;
        // Nối vào danh sách cũ hoặc thay thế
        setReviews((prev) =>
          clearExisting ? data.content : [...prev, ...data.content]
        );
        setPage(data.page);
        setHasNextPage(data.hasNext);
      } catch (err) {
        setError("Could not load reviews. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [productId] // Phụ thuộc vào productId
  );

  // === CẬP NHẬT USEEFFECT ĐỂ TẢI TRANG ĐẦU TIÊN ===
  useEffect(() => {
    if (productId) {
      fetchReviews(0, true); // Tải trang 0 và xóa review cũ
    }
  }, [productId, fetchReviews]); // Thêm fetchReviews vào dependency array

  // === THÊM HÀM LOAD MORE ===
  const handleLoadMore = () => {
    if (!isLoading && hasNextPage) {
      fetchReviews(page + 1, false); // Tải trang tiếp theo, không xóa review cũ
    }
  };

  const addReviewToList = (newReview: Review) => {
    setReviews((prev) => [newReview, ...prev]);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden divide-y divide-gray-200">
      {/* Phần Form */}
      <ReviewForm productId={productId} onReviewSubmitted={addReviewToList} />

      {/* Phần Danh sách */}
      <div className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Customer Reviews
        </h2>

        {error && (
          <div className="bg-red-100 text-red-800 p-3 rounded-md text-sm my-4">
            {error}
          </div>
        )}

        {/* Chỉ hiển thị loading spinner cho LẦN TẢI ĐẦU TIÊN */}
        {isLoading && page === 0 && (
          <div className="text-center py-6 text-gray-500">
            Loading reviews...
          </div>
        )}

        {!isLoading && reviews.length === 0 && !error && (
          <div className="text-center py-6 text-gray-500">
            There are no reviews for this product yet.
          </div>
        )}

        <div className="space-y-5">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>

        {/* === THÊM NÚT LOAD MORE === */}
        {hasNextPage && (
          <div className="mt-6 text-center">
            <button
              onClick={handleLoadMore}
              disabled={isLoading}
              className="w-full max-w-xs bg-white text-gray-800 border border-gray-300 py-2.5 rounded-md font-semibold text-sm hover:bg-gray-50 transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:border-gray-200"
            >
              {isLoading ? "Loading..." : "Load More Reviews"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
