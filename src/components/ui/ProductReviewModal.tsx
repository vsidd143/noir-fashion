"use client";

import React, { useState, useEffect } from "react";
import { Star, X, CheckCircle2, MessageSquare, ShieldCheck, PenLine, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export interface ReviewItem {
  id: string;
  product_id?: string;
  user_id?: string | null;
  author_name: string;
  rating: number;
  title?: string | null;
  comment: string;
  is_verified_purchase?: boolean;
  created_at: string;
}

interface ProductReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  onReviewSubmitted?: (updatedRating: number, updatedCount: number) => void;
}

const RATING_LABELS: Record<number, string> = {
  1: "1 - Poor",
  2: "2 - Fair",
  3: "3 - Good",
  4: "4 - Very Good",
  5: "5 - Excellent",
};

export default function ProductReviewModal({
  isOpen,
  onClose,
  productId,
  productName,
  onReviewSubmitted,
}: ProductReviewModalProps) {
  const { user, profile } = useAuth();

  const [activeTab, setActiveTab] = useState<"list" | "write">("list");
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  // Form State
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const defaultAuthorName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    (user?.email ? user.email.split("@")[0] : "");
  const [authorName, setAuthorName] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [comment, setComment] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Load reviews on modal open or productId change
  useEffect(() => {
    if (!isOpen || !productId) return;

    let isMounted = true;

    (async () => {
      setIsLoadingReviews(true);
      setSubmitSuccess(false);
      setFormError(null);
      try {
        // Fetch from API
        const res = await fetch(`/api/reviews?productId=${encodeURIComponent(productId)}`);
        const json = await res.json();
        
        let fetchedReviews: ReviewItem[] = [];
        if (json.success && Array.isArray(json.reviews)) {
          fetchedReviews = json.reviews;
        }

        // Merge with local storage reviews
        try {
          const localSaved = localStorage.getItem(`noir_reviews_${productId}`);
          if (localSaved) {
            const localList: ReviewItem[] = JSON.parse(localSaved);
            const existingIds = new Set(fetchedReviews.map((r) => r.id));
            const newLocal = localList.filter((r) => !existingIds.has(r.id));
            fetchedReviews = [...newLocal, ...fetchedReviews];
          }
        } catch {
          // ignore localStorage error
        }

        if (isMounted) {
          setReviews(fetchedReviews);
          if (fetchedReviews.length === 0) {
            setActiveTab("write");
          } else {
            setActiveTab("list");
          }
        }
      } catch (err) {
        console.warn("Could not load reviews:", err);
      } finally {
        if (isMounted) setIsLoadingReviews(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isOpen, productId, profile, user]);

  if (!isOpen) return null;

  const count = reviews.length;
  const averageRating =
    count > 0
      ? Number((reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / count).toFixed(1))
      : 0;

  // Star breakdown calculation
  const starCounts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach((r) => {
    const star = Math.min(5, Math.max(1, Math.round(r.rating || 5)));
    starCounts[star] = (starCounts[star] || 0) + 1;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = (authorName || defaultAuthorName).trim();
    if (!trimmedName || trimmedName.length < 2) {
      setFormError("Please enter your name (at least 2 characters).");
      return;
    }

    const trimmedComment = comment.trim();
    if (!trimmedComment || trimmedComment.length < 3) {
      setFormError("Please write a few words about your experience (at least 3 characters).");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          authorName: trimmedName,
          rating,
          title: title.trim() || null,
          comment: trimmedComment,
          userId: user?.id || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to post review.");
      }

      const createdReview: ReviewItem = data.review || {
        id: `rev-${Date.now()}`,
        product_id: productId,
        user_id: user?.id || null,
        author_name: trimmedName,
        rating,
        title: title.trim() || null,
        comment: trimmedComment,
        is_verified_purchase: true,
        created_at: new Date().toISOString(),
      };

      // Save to local storage for instant persistence
      try {
        const stored = localStorage.getItem(`noir_reviews_${productId}`);
        const list: ReviewItem[] = stored ? JSON.parse(stored) : [];
        const updated = [createdReview, ...list.filter((r) => r.id !== createdReview.id)];
        localStorage.setItem(`noir_reviews_${productId}`, JSON.stringify(updated));
      } catch { }

      const nextReviews = [createdReview, ...reviews];
      setReviews(nextReviews);

      const nextCount = nextReviews.length;
      const nextAvg = Number(
        (nextReviews.reduce((acc, r) => acc + (r.rating || 5), 0) / nextCount).toFixed(1)
      );

      if (onReviewSubmitted) {
        onReviewSubmitted(nextAvg, nextCount);
      }

      setSubmitSuccess(true);
      setComment("");
      setTitle("");
      setTimeout(() => {
        setActiveTab("list");
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error submitting review";
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-[#FCFAF7] border border-[#E5E0D8] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 sm:p-6 border-b border-[#E5E0D8] bg-white">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#1A3B8B] font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified Customer Feedback</span>
            </div>
            <h2 id="review-modal-title" className="text-xl sm:text-2xl font-headline font-normal text-[#161616] mt-1">
              {productName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#6E6D68] hover:text-[#161616] transition-colors rounded-sm hover:bg-[#F3EFEA]"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#E5E0D8] bg-[#F7F4EE] px-5 sm:px-6">
          <button
            type="button"
            onClick={() => setActiveTab("list")}
            className={`py-3 px-4 text-xs font-mono uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
              activeTab === "list"
                ? "border-[#1A3B8B] text-[#1A3B8B] font-semibold bg-[#FCFAF7]"
                : "border-transparent text-[#6E6D68] hover:text-[#161616]"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Customer Reviews ({count})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("write")}
            className={`py-3 px-4 text-xs font-mono uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
              activeTab === "write"
                ? "border-[#1A3B8B] text-[#1A3B8B] font-semibold bg-[#FCFAF7]"
                : "border-transparent text-[#6E6D68] hover:text-[#161616]"
            }`}
          >
            <PenLine className="w-3.5 h-3.5" />
            <span>Write a Review</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === "list" ? (
            <div className="space-y-6">
              {/* Aggregate Rating Banner */}
              {count > 0 ? (
                <div className="p-4 bg-white border border-[#E5E0D8] grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  <div className="sm:col-span-4 text-center sm:text-left sm:border-r sm:border-[#E5E0D8] sm:pr-4">
                    <div className="text-4xl font-headline font-bold text-[#161616]">
                      {averageRating.toFixed(1)}
                    </div>
                    <div className="flex items-center justify-center sm:justify-start gap-1 my-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= Math.round(averageRating)
                              ? "fill-[#1A3B8B] text-[#1A3B8B]"
                              : "text-[#D1CBC1]"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs font-mono text-[#6E6D68]">
                      Based on {count} {count === 1 ? "review" : "reviews"}
                    </p>
                  </div>

                  {/* Rating Distribution Bars */}
                  <div className="sm:col-span-8 space-y-1 text-xs font-mono">
                    {[5, 4, 3, 2, 1].map((s) => {
                      const starVal = starCounts[s] || 0;
                      const percentage = count > 0 ? Math.round((starVal / count) * 100) : 0;
                      return (
                        <div key={s} className="flex items-center gap-2">
                          <span className="w-6 text-right text-[#6E6D68]">{s}★</span>
                          <div className="flex-1 h-2 bg-[#EFECE6] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#1A3B8B] rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-[#6E6D68] text-[11px]">
                            {starVal}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* Reviews List */}
              {isLoadingReviews ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <Loader2 className="w-6 h-6 text-[#1A3B8B] animate-spin mb-2" />
                  <p className="text-xs font-mono text-[#6E6D68]">Loading customer feedback...</p>
                </div>
              ) : reviews.length === 0 ? (
                <div className="py-10 text-center space-y-3 bg-white p-6 border border-[#E5E0D8]">
                  <div className="w-10 h-10 rounded-full bg-[#F3EFEA] text-[#1A3B8B] flex items-center justify-center mx-auto">
                    <Star className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-headline font-medium text-[#161616]">
                    No Customer Reviews Yet
                  </h3>
                  <p className="text-xs font-body text-[#6E6D68] max-w-sm mx-auto">
                    Be the first to share your thoughts on the fit, quality, and craftsmanship of this product.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("write")}
                    className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-[#1A3B8B] text-white text-xs font-mono uppercase tracking-wider hover:bg-[#132A66] transition-colors"
                  >
                    <PenLine className="w-3.5 h-3.5" />
                    <span>Write First Review</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-4 bg-white border border-[#E5E0D8] space-y-2 hover:border-[#1A3B8B]/40 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold font-body text-[#161616]">
                            {rev.author_name}
                          </span>
                          {rev.is_verified_purchase && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Verified Buyer</span>
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-[#8C887E]">
                          {rev.created_at
                            ? new Date(rev.created_at).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "Recent"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= rev.rating
                                ? "fill-[#1A3B8B] text-[#1A3B8B]"
                                : "text-[#E5E0D8]"
                            }`}
                          />
                        ))}
                      </div>

                      {rev.title && (
                        <h4 className="text-sm font-semibold font-body text-[#161616]">
                          {rev.title}
                        </h4>
                      )}

                      <p className="text-xs font-body text-[#4A4944] leading-relaxed">
                        {rev.comment}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Write Review Tab */
            <form onSubmit={handleSubmit} className="space-y-4">
              {submitSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-body rounded flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Your review has been submitted successfully! Thank you for your feedback.</span>
                </div>
              )}

              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-body rounded">
                  {formError}
                </div>
              )}

              {/* Interactive Star Rating */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono uppercase tracking-wider text-[#161616] font-medium">
                  Overall Rating *
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1" onMouseLeave={() => setHoverRating(0)}>
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isActive = (hoverRating || rating) >= star;
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          className="p-1 hover:scale-110 transition-transform cursor-pointer"
                          aria-label={`Rate ${star} star`}
                        >
                          <Star
                            className={`w-6 h-6 transition-colors ${
                              isActive
                                ? "fill-[#1A3B8B] text-[#1A3B8B]"
                                : "text-[#D1CBC1] hover:text-[#1A3B8B]"
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-xs font-mono text-[#6E6D68]">
                    {RATING_LABELS[hoverRating || rating]}
                  </span>
                </div>
              </div>

              {/* Author Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono uppercase tracking-wider text-[#161616] font-medium">
                  Your Name *
                </label>
                <input
                  type="text"
                  required
                  value={authorName !== "" ? authorName : defaultAuthorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-2 text-xs font-body bg-white border border-[#D1CBC1] focus:border-[#1A3B8B] focus:outline-hidden transition-colors"
                />
              </div>

              {/* Review Title */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono uppercase tracking-wider text-[#161616] font-medium">
                  Review Headline (Optional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Exceptional fit, soft fabric, and sharp look"
                  className="w-full px-3 py-2 text-xs font-body bg-white border border-[#D1CBC1] focus:border-[#1A3B8B] focus:outline-hidden transition-colors"
                />
              </div>

              {/* Review Comment */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono uppercase tracking-wider text-[#161616] font-medium">
                  Detailed Review *
                </label>
                <textarea
                  required
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell us what you liked about the material, comfort, sizing, and drape..."
                  className="w-full px-3 py-2 text-xs font-body bg-white border border-[#D1CBC1] focus:border-[#1A3B8B] focus:outline-hidden transition-colors resize-none"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("list")}
                  className="px-4 py-2.5 text-xs font-mono uppercase tracking-wider text-[#6E6D68] hover:text-[#161616] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#1A3B8B] hover:bg-[#132A66] text-white text-xs font-mono uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Submit Review</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

