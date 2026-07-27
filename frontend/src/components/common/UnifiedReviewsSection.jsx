import React, { useState } from "react";
import { Star, ShieldCheck, Terminal, Pen, Trash2, MessageSquareQuote } from "lucide-react";
import VerifiedBadge from "../VerifiedBadge";
import { toast } from "react-hot-toast";
import { recruiterAPI, API_HOST } from "../../lib/api";

export default function UnifiedReviewsSection({
  reviews = [],
  targetId,
  ownerType = "developer",
  onEditReview,
  onDeleteReview,
  onReplySuccess,
  isCompanyOwner = false,
}) {
  const [selectedRating, setSelectedRating] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [replyingReviewId, setReplyingReviewId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [deletingReviewId, setDeletingReviewId] = useState(null);

  const filteredReviews = reviews.filter((r) => {
    if (selectedRating === "all") return true;
    return String(r.rating) === String(selectedRating);
  });

  // Sort: own reviews first, then by user preference
  const sortedReviews = [...filteredReviews].sort((a, b) => {
    // Own reviews always first
    const ownA = a.is_own ? 1 : 0;
    const ownB = b.is_own ? 1 : 0;
    if (ownA !== ownB) return ownB - ownA;

    if (sortBy === "highest") return (b.rating || 5) - (a.rating || 5);
    if (sortBy === "lowest") return (a.rating || 5) - (b.rating || 5);
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });

  const handleReplySubmit = async (reviewId) => {
    if (!replyText.trim()) return toast.error("Reply text is required");
    setSubmittingReply(true);
    try {
      await recruiterAPI.replyToCompanyReview(reviewId, replyText.trim());
      toast.success("Official response published!");
      setReplyingReviewId(null);
      setReplyText("");
      if (onReplySuccess) onReplySuccess();
    } catch (err) {
      toast.error(err.message || "Failed to submit reply");
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleCompanyDelete = async (rev) => {
    if (!window.confirm("Are you sure you want to remove this review from your company page?")) return;
    setDeletingReviewId(rev.id);
    try {
      await recruiterAPI.deleteCompanyReview(rev.id);
      toast.success("Review removed");
      if (onReplySuccess) onReplySuccess(); // refresh
    } catch (err) {
      toast.error(err.message || "Failed to remove review");
    } finally {
      setDeletingReviewId(null);
    }
  };

  const handleDeleteReply = async (reviewId) => {
    if (!window.confirm("Are you sure you want to remove your official response?")) return;
    setSubmittingReply(true);
    try {
      await recruiterAPI.deleteCompanyReply(reviewId);
      toast.success("Official response removed");
      if (onReplySuccess) onReplySuccess();
    } catch (err) {
      toast.error(err.message || "Failed to remove reply");
    } finally {
      setSubmittingReply(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* FILTER & SORT BAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        {/* Star Rating Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setSelectedRating("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedRating === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            }`}
          >
            All ({reviews.length})
          </button>
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = reviews.filter((r) => r.rating === stars).length;
            return (
              <button
                key={stars}
                type="button"
                onClick={() => setSelectedRating(String(stars))}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-all ${
                  selectedRating === String(stars)
                    ? "bg-amber-500 text-white shadow-sm"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                }`}
              >
                <span>{stars}</span>
                <Star className="h-3 w-3 fill-current" />
                <span className="opacity-75">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs text-muted-foreground font-semibold">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-card border border-border rounded-xl px-3 py-1.5 text-xs font-bold text-foreground focus:outline-none"
          >
            <option value="recent">Most Recent</option>
            <option value="highest">Highest Rated</option>
            <option value="lowest">Lowest Rated</option>
          </select>
        </div>
      </div>

      {/* REVIEWS LIST */}
      {sortedReviews.length > 0 ? (
        <div className="space-y-4">
          {sortedReviews.map((rev) => (
            <div key={rev.id} className={`rounded-2xl border p-5 space-y-3 ${rev.is_own ? 'border-primary/30 bg-primary/5' : 'border-border/60 bg-muted/30'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {rev.author?.avatar_url || rev.author?.avatar_path ? (
                    <img
                      src={(rev.author.avatar_url || rev.author.avatar_path).startsWith('http') || (rev.author.avatar_url || rev.author.avatar_path).startsWith('data:') ? (rev.author.avatar_url || rev.author.avatar_path) : `${API_HOST}${rev.author.avatar_url || rev.author.avatar_path}`}
                      alt={rev.author.full_name}
                      className="h-8 w-8 rounded-full object-cover border border-border shrink-0"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-black text-amber-600 text-xs shrink-0">
                      {rev.author?.full_name?.charAt(0) || "U"}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-foreground">{rev.author?.full_name || "Verified Member"}</span>
                      {rev.author?.is_verified && <VerifiedBadge size={14} />}
                      {rev.is_own && !isCompanyOwner && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">You</span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{rev.author?.role_badge || "Member"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Author's own edit/delete buttons */}
                  {rev.is_own && (
                    <div className="flex items-center gap-1">
                      {onEditReview && (
                        <button
                          type="button"
                          onClick={() => onEditReview(rev)}
                          className="p-1 rounded bg-muted hover:bg-muted-foreground/10 text-muted-foreground transition-colors"
                          title="Edit review"
                        >
                          <Pen className="h-3 w-3" />
                        </button>
                      )}
                      {onDeleteReview && (
                        <button
                          type="button"
                          onClick={() => onDeleteReview(rev)}
                          className="p-1 rounded bg-muted hover:bg-red-100 text-red-500 transition-colors"
                          title="Delete review"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Company owner: delete reviews about their company */}
                  {isCompanyOwner && rev.is_company_owner && (
                    <button
                      type="button"
                      onClick={() => handleCompanyDelete(rev)}
                      disabled={deletingReviewId === rev.id}
                      className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-colors text-[10px] font-bold inline-flex items-center gap-1"
                      title="Remove this review (company owner)"
                    >
                      <Trash2 className="h-3 w-3" />
                      {deletingReviewId === rev.id ? "..." : "Remove"}
                    </button>
                  )}

                  <div className="flex items-center gap-0.5 text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${i < (rev.rating || 5) ? "fill-amber-500" : "text-muted-foreground/30"}`}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {rev.created_at ? new Date(rev.created_at).toLocaleDateString() : ""}
                  </span>
                </div>
              </div>

              <p className="text-sm text-foreground italic pl-1 font-medium">"{rev.text}"</p>

              {/* Official Response Section */}
              {rev.official_reply && replyingReviewId !== rev.id ? (
                <div className="mt-3 p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/30 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-blue-600 dark:text-blue-400">
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" /> Official Response
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] opacity-75">
                        {rev.official_reply_at ? new Date(rev.official_reply_at).toLocaleDateString() : ""}
                      </span>
                      {isCompanyOwner && rev.is_company_owner && (
                        <div className="flex items-center gap-1 ml-1">
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingReviewId(rev.id);
                              setReplyText(rev.official_reply);
                            }}
                            className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 transition-colors"
                            title="Edit official response"
                          >
                            <Pen className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteReply(rev.id)}
                            disabled={submittingReply}
                            className="p-1 rounded hover:bg-red-100 text-red-500 transition-colors"
                            title="Delete official response"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-muted-foreground">{rev.official_reply}</p>
                </div>
              ) : null}

              {/* Reply Form / Button when no official reply or currently editing */}
              {(!rev.official_reply || replyingReviewId === rev.id) && (
                <div className="pt-1">
                  {/* Company owner can reply to reviews about their company */}
                  {isCompanyOwner && rev.is_company_owner ? (
                    replyingReviewId === rev.id ? (
                      <div className="mt-2 p-3 rounded-xl bg-card border border-border space-y-2">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write your official response..."
                          rows={2}
                          maxLength={1000}
                          className="w-full p-2 bg-muted/40 border border-border rounded-lg text-xs font-medium focus:outline-none"
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">{replyText.length}/1000</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setReplyingReviewId(null)}
                              className="px-3 py-1 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReplySubmit(rev.id)}
                              disabled={submittingReply}
                              className="px-3 py-1 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                              {submittingReply ? "Publishing..." : rev.official_reply ? "Update Response" : "Publish Reply"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingReviewId(rev.id);
                          setReplyText(rev.official_reply || "");
                        }}
                        className="text-[11px] font-bold text-primary hover:underline inline-flex items-center gap-1"
                      >
                        <MessageSquareQuote className="h-3 w-3" /> {rev.official_reply ? "Edit Official Response" : "Reply as Company Owner"}
                      </button>
                    )
                  ) : ownerType === "developer" && !rev.is_own ? (
                    replyingReviewId === rev.id ? (
                      <div className="mt-2 p-3 rounded-xl bg-card border border-border space-y-2">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write your official response..."
                          rows={2}
                          className="w-full p-2 bg-muted/40 border border-border rounded-lg text-xs font-medium focus:outline-none"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setReplyingReviewId(null)}
                            className="px-3 py-1 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReplySubmit(rev.id)}
                            disabled={submittingReply}
                            className="px-3 py-1 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            {submittingReply ? "Publishing..." : "Publish Reply"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingReviewId(rev.id);
                          setReplyText("");
                        }}
                        className="text-[11px] font-bold text-primary hover:underline inline-flex items-center gap-1"
                      >
                        <Terminal className="h-3 w-3" /> Reply as Owner
                      </button>
                    )
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground py-4 text-center">No reviews match the selected rating filter.</p>
      )}
    </div>
  );
}
